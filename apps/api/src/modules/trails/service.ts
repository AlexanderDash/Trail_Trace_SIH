import { prisma } from "../../lib/prisma.js";

// ── Configurable trail parameters ───────────────────────────────────
export const TRAIL_CONFIG = {
  /** Maximum number of hops to traverse */
  maxHops: 10,
  /** Maximum time window in hours from the origin transaction */
  maxTimeWindowHours: 72,
  /** Minimum amount ratio to follow a forward transaction (anti-noise) */
  minAmountRatio: 0.01,
};

// ── Types ───────────────────────────────────────────────────────────
export interface TrailNodeData {
  accountRef: string;
  accountId: string;
  bankName: string;
  bankCode: string;
  hop: number;
  role: string;
  transactionId?: string;
  sourceTransactionId?: string;
  amount?: number;
  timestamp?: string;
  transactionMode?: string;
  city?: string;
}

export interface TrailResult {
  trailId: string;
  complaintId: string;
  startingTransactionId: string;
  status: string;
  nodes: TrailNodeData[];
  banksCrossed: string[];
  lastKnownAccount: string;
  summary: string;
}

// ── Create a trail from a matched complaint ─────────────────────────
export async function createTrail(complaintId: string): Promise<TrailResult> {
  const complaint = await prisma.complaint.findUnique({
    where: { id: complaintId },
    include: {
      victimAccount: true,
      matchedTransaction: {
        include: {
          bank: true,
          senderAccount: true,
          receiverAccount: true,
        },
      },
    },
  });

  if (!complaint) throw new Error("Complaint not found");
  if (!complaint.matchedTransaction) throw new Error("No matched transaction. Match a transaction first.");

  const originTxn = complaint.matchedTransaction;

  // Remove any pre-existing trails for this complaint to prevent duplicates
  const existingTrails = await prisma.trail.findMany({ where: { complaintId: complaint.id } });
  for (const old of existingTrails) {
    await prisma.trailConnection.deleteMany({ where: { trailId: old.id } });
    await prisma.trailNode.deleteMany({ where: { trailId: old.id } });
    await prisma.trail.delete({ where: { id: old.id } });
  }

  // Create the Trail record
  const trail = await prisma.trail.create({
    data: {
      complaintId: complaint.id,
      originTransactionId: originTxn.id,
      status: "ACTIVE",
    },
  });

  // ── BFS / forward traversal ─────────────────────────────────────
  const visited = new Set<string>(); // accountRef set to prevent cycles
  const trailNodes: TrailNodeData[] = [];
  const bankSet = new Set<string>();

  // Node 0: Victim
  const victimRef = complaint.victimAccount.accountRef;
  visited.add(victimRef);

  const victimNode = await prisma.trailNode.create({
    data: {
      trailId: trail.id,
      accountId: complaint.victimAccount.id,
      sequence: 0,
      role: "victim",
    },
  });

  trailNodes.push({
    accountRef: victimRef,
    accountId: complaint.victimAccount.id,
    bankName: originTxn.bank.name,
    bankCode: originTxn.bank.code,
    hop: 0,
    role: "victim",
  });
  bankSet.add(originTxn.bank.code);

  // Start BFS from receiver of origin transaction
  const originTime = originTxn.timestamp;
  const maxTime = new Date(originTime.getTime() + TRAIL_CONFIG.maxTimeWindowHours * 3600000);

  interface QueueItem {
    accountId: string;
    accountRef: string;
    previousNodeId: string;
    sourceTransactionDbId: string;
    hop: number;
    arrivalTime: Date;
    arrivalAmount: number;
  }

  const queue: QueueItem[] = [{
    accountId: originTxn.receiverAccount.id,
    accountRef: originTxn.receiverAccount.accountRef,
    previousNodeId: victimNode.id,
    sourceTransactionDbId: originTxn.id,
    hop: 1,
    arrivalTime: originTxn.timestamp,
    arrivalAmount: Number(originTxn.amount),
  }];

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (current.hop > TRAIL_CONFIG.maxHops) continue;
    if (visited.has(current.accountRef)) continue; // cycle detection
    visited.add(current.accountRef);

    // Find which bank this transaction came from to display it
    const sourceTxn = await prisma.transaction.findUnique({
      where: { id: current.sourceTransactionDbId },
      include: { bank: true },
    });

    const currentNode = await prisma.trailNode.create({
      data: {
        trailId: trail.id,
        accountId: current.accountId,
        sequence: current.hop,
        role: current.hop === 1 ? "first_recipient" : "intermediate",
      },
    });

    // Create connection from previous node
    await prisma.trailConnection.create({
      data: {
        trailId: trail.id,
        fromNodeId: current.previousNodeId,
        toNodeId: currentNode.id,
        transactionId: current.sourceTransactionDbId,
      },
    });

    const bankName = sourceTxn?.bank.name ?? "Unknown";
    const bankCode = sourceTxn?.bank.code ?? "UNK";
    bankSet.add(bankCode);

    trailNodes.push({
      accountRef: current.accountRef,
      accountId: current.accountId,
      bankName,
      bankCode,
      hop: current.hop,
      role: currentNode.role,
      transactionId: current.sourceTransactionDbId,
      sourceTransactionId: sourceTxn?.sourceTransactionId,
      amount: current.arrivalAmount,
      timestamp: current.arrivalTime.toISOString(),
      transactionMode: sourceTxn?.transactionMode ?? undefined,
      city: sourceTxn?.locationCity ?? undefined,
    });

    // Find forward transactions: where this account is the sender,
    // AND the transaction occurs after the arrival time,
    // AND within the max time window.
    // Search across ALL banks (cross-bank support).
    const forwardTxns = await prisma.transaction.findMany({
      where: {
        senderAccount: { accountRef: current.accountRef },
        timestamp: {
          gte: current.arrivalTime,
          lte: maxTime,
        },
      },
      include: {
        bank: true,
        receiverAccount: true,
      },
      orderBy: { timestamp: "asc" },
    });

    for (const fwd of forwardTxns) {
      const fwdAmount = Number(fwd.amount);
      // Skip if the forwarded amount is trivially small relative to arrival
      if (fwdAmount < current.arrivalAmount * TRAIL_CONFIG.minAmountRatio) continue;

      if (!visited.has(fwd.receiverAccount.accountRef)) {
        queue.push({
          accountId: fwd.receiverAccount.id,
          accountRef: fwd.receiverAccount.accountRef,
          previousNodeId: currentNode.id,
          sourceTransactionDbId: fwd.id,
          hop: current.hop + 1,
          arrivalTime: fwd.timestamp,
          arrivalAmount: fwdAmount,
        });
      }
    }
  }

  // Determine last known account
  const lastNode = trailNodes[trailNodes.length - 1];
  const banksCrossed = Array.from(bankSet);

  // Generate summary
  const summary = generateSummary(complaint, originTxn, trailNodes, banksCrossed);

  // Update trail status
  await prisma.trail.update({
    where: { id: trail.id },
    data: { status: "ACTIVE" },
  });

  return {
    trailId: trail.id,
    complaintId: complaint.id,
    startingTransactionId: originTxn.id,
    status: "ACTIVE",
    nodes: trailNodes,
    banksCrossed,
    lastKnownAccount: lastNode.accountRef,
    summary,
  };
}

// ── Get trail detail ────────────────────────────────────────────────
export async function getTrail(trailId: string): Promise<TrailResult | null> {
  const trail = await prisma.trail.findUnique({
    where: { id: trailId },
    include: {
      complaint: {
        include: {
          victimAccount: true,
          matchedTransaction: {
            include: {
              bank: true,
              senderAccount: true,
              receiverAccount: true,
            },
          },
        },
      },
      nodes: {
        include: { account: true },
        orderBy: { sequence: "asc" },
      },
      connections: {
        include: {
          transaction: {
            include: {
              bank: true,
              senderAccount: true,
              receiverAccount: true,
            },
          },
        },
      },
    },
  });

  if (!trail) return null;

  const bankSet = new Set<string>();
  const trailNodes: TrailNodeData[] = [];

  for (const node of trail.nodes) {
    // For each node find associated connection (incoming)
    const incomingConn = trail.connections.find((c) => c.toNodeId === node.id);
    const txn = incomingConn?.transaction;
    const bankName = txn?.bank?.name ?? "Unknown";
    const bankCode = txn?.bank?.code ?? "UNK";

    // For the victim node (hop 0), use the origin transaction's bank
    if (node.sequence === 0 && trail.complaint.matchedTransaction) {
      const originBank = trail.complaint.matchedTransaction.bank;
      bankSet.add(originBank.code);
      trailNodes.push({
        accountRef: node.account.accountRef,
        accountId: node.accountId,
        bankName: originBank.name,
        bankCode: originBank.code,
        hop: node.sequence,
        role: node.role,
      });
    } else {
      bankSet.add(bankCode);
      trailNodes.push({
        accountRef: node.account.accountRef,
        accountId: node.accountId,
        bankName,
        bankCode,
        hop: node.sequence,
        role: node.role,
        transactionId: txn?.id,
        sourceTransactionId: txn?.sourceTransactionId,
        amount: txn ? Number(txn.amount) : undefined,
        timestamp: txn?.timestamp?.toISOString(),
        transactionMode: txn?.transactionMode ?? undefined,
        city: txn?.locationCity ?? undefined,
      });
    }
  }

  const banksCrossed = Array.from(bankSet);
  const lastNode = trailNodes[trailNodes.length - 1];
  const summary = generateSummary(
    trail.complaint,
    trail.complaint.matchedTransaction!,
    trailNodes,
    banksCrossed,
  );

  return {
    trailId: trail.id,
    complaintId: trail.complaintId,
    startingTransactionId: trail.originTransactionId ?? "",
    status: trail.status,
    nodes: trailNodes,
    banksCrossed,
    lastKnownAccount: lastNode?.accountRef ?? "Unknown",
    summary,
  };
}

// ── List trails ─────────────────────────────────────────────────────
export async function listTrails() {
  const trails = await prisma.trail.findMany({
    include: {
      complaint: {
        include: {
          victimAccount: true,
          matchedTransaction: { include: { bank: true } },
        },
      },
      nodes: {
        include: { account: true },
        orderBy: { sequence: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return trails.map((trail) => {
    const bankSet = new Set<string>();
    if (trail.complaint.matchedTransaction) {
      bankSet.add(trail.complaint.matchedTransaction.bank.code);
    }
    // Collect banks from nodes (via separate queries would be needed for full accuracy,
    // but for the list view we use what we have)
    const lastNode = trail.nodes[trail.nodes.length - 1];

    return {
      id: trail.id,
      complaintRef: trail.complaint.complaintRef,
      victimAccount: trail.complaint.victimAccount.accountRef,
      startingAmount: Number(trail.complaint.amount),
      lastKnownAccount: lastNode?.account?.accountRef ?? "Unknown",
      hops: trail.nodes.length,
      status: trail.status,
      createdAt: trail.createdAt,
    };
  });
}

// ── Update trail status ─────────────────────────────────────────────
export async function updateTrailStatus(trailId: string, status: string) {
  return prisma.trail.update({
    where: { id: trailId },
    data: { status },
  });
}

// ── Summary generator ───────────────────────────────────────────────
function generateSummary(
  complaint: any,
  originTxn: any,
  nodes: TrailNodeData[],
  banksCrossed: string[],
): string {
  const victimRef = complaint.victimAccount?.accountRef ?? complaint.victimAccountId;
  const amount = Number(complaint.amount).toLocaleString("en-IN");
  const firstRecipient = nodes.length > 1 ? nodes[1].accountRef : "unknown";
  const lastAccount = nodes[nodes.length - 1]?.accountRef ?? "unknown";
  const intermediates = nodes
    .slice(2, -1)
    .map((n) => n.accountRef)
    .join(", ");

  let text = `Complaint ${complaint.complaintRef} was matched to transaction ${originTxn.sourceTransactionId}. `;
  text += `₹${amount} was transferred from ${victimRef} to ${firstRecipient}. `;

  if (intermediates) {
    text += `The funds were subsequently observed moving through ${intermediates}. `;
  }

  if (banksCrossed.length > 1) {
    text += `The trail crossed bank boundaries: ${banksCrossed.join(" → ")}. `;
  }

  text += `The latest known recipient is ${lastAccount}.`;

  return text;
}
