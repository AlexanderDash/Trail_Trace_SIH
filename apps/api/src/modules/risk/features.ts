import { prisma } from "../../lib/prisma.js";

export interface AccountFeatures {
  incomingCount: number;
  outgoingCount: number;
  incomingAmount: number;
  outgoingAmount: number;
  rapidForwardingCount: number;
  averageHoldingTimeMinutes: number;
  averageForwardingRatio: number;
  distinctCounterparties: number;
  distinctBanks: number;
  crossBankTransferCount: number;
  fanInCount: number;
  fanOutCount: number;
  distinctComplaintTrailCount: number;
  trailParticipationCount: number;
  suspiciousNeighbourCount: number;
  transactionVelocity: number;
  averageTransactionAmount: number;
}

export const RAPID_FORWARDING_WINDOW_MS = 15 * 60 * 1000; // 15 mins

export async function extractFeatures(accountId: string): Promise<AccountFeatures> {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    include: {
      receivedTransactions: { include: { bank: true, senderAccount: true } },
      sentTransactions: { include: { bank: true, receiverAccount: true } },
      trailNodes: { include: { trail: { include: { complaint: true } } } },
    }
  });

  if (!account) throw new Error("Account not found");

  const incoming = account.receivedTransactions;
  const outgoing = account.sentTransactions;

  let incomingAmount = 0;
  for (const t of incoming) incomingAmount += Number(t.amount);

  let outgoingAmount = 0;
  for (const t of outgoing) outgoingAmount += Number(t.amount);

  const incomingCount = incoming.length;
  const outgoingCount = outgoing.length;

  const totalAmount = incomingAmount + outgoingAmount;
  const totalCount = incomingCount + outgoingCount;
  const averageTransactionAmount = totalCount > 0 ? totalAmount / totalCount : 0;

  let transactionVelocity = 0;
  if (totalCount > 1) {
    const allTxns = [...incoming, ...outgoing].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const firstTxn = allTxns[0].timestamp.getTime();
    const lastTxn = allTxns[allTxns.length - 1].timestamp.getTime();
    const daysActive = (lastTxn - firstTxn) / (1000 * 60 * 60 * 24);
    transactionVelocity = daysActive > 0 ? totalCount / Math.max(1, daysActive) : totalCount; 
  } else if (totalCount === 1) {
    transactionVelocity = 1;
  }

  const counterparties = new Set<string>();
  const banks = new Set<string>();
  
  for (const t of incoming) {
    counterparties.add(t.senderAccountId);
    banks.add(t.bank.code);
  }
  for (const t of outgoing) {
    counterparties.add(t.receiverAccountId);
    banks.add(t.bank.code);
  }

  let crossBankTransferCount = 0;
  for (const inc of incoming) {
    for (const out of outgoing) {
      if (out.timestamp >= inc.timestamp && out.bankId !== inc.bankId) {
        crossBankTransferCount++;
      }
    }
  }

  let rapidForwardingCount = 0;
  let totalHoldingTimeMs = 0;
  let rapidEvents = 0;
  let forwardingRatioSum = 0;
  let forwardingEvents = 0;

  for (const inc of incoming) {
    const matchedOuts = outgoing.filter(out => 
      out.timestamp.getTime() >= inc.timestamp.getTime() &&
      out.timestamp.getTime() <= inc.timestamp.getTime() + RAPID_FORWARDING_WINDOW_MS
    );
    
    if (matchedOuts.length > 0) {
      rapidForwardingCount++;
      const firstOut = matchedOuts.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())[0];
      totalHoldingTimeMs += (firstOut.timestamp.getTime() - inc.timestamp.getTime());
      rapidEvents++;

      let forwardedSum = 0;
      for (const out of matchedOuts) forwardedSum += Number(out.amount);
      const ratio = Math.min(forwardedSum / Number(inc.amount), 1.0);
      forwardingRatioSum += ratio;
      forwardingEvents++;
    }
  }

  const averageHoldingTimeMinutes = rapidEvents > 0 ? (totalHoldingTimeMs / rapidEvents) / 60000 : 0;
  const averageForwardingRatio = forwardingEvents > 0 ? forwardingRatioSum / forwardingEvents : 0;

  const fanInCount = new Set(incoming.map(t => t.senderAccountId)).size;
  const fanOutCount = new Set(outgoing.map(t => t.receiverAccountId)).size;

  const trailParticipationCount = account.trailNodes.length;
  const distinctComplaints = new Set(account.trailNodes.map(n => n.trail.complaintId)).size;

  const neighbourIds = Array.from(counterparties);
  let suspiciousNeighbourCount = 0;
  if (neighbourIds.length > 0) {
    const neighbours = await prisma.account.findMany({
      where: { id: { in: neighbourIds }, riskStatus: { in: ["high", "critical"] } }
    });
    suspiciousNeighbourCount = neighbours.length;
  }

  return {
    incomingCount,
    outgoingCount,
    incomingAmount,
    outgoingAmount,
    rapidForwardingCount,
    averageHoldingTimeMinutes,
    averageForwardingRatio,
    distinctCounterparties: counterparties.size,
    distinctBanks: banks.size,
    crossBankTransferCount,
    fanInCount,
    fanOutCount,
    distinctComplaintTrailCount: distinctComplaints,
    trailParticipationCount,
    suspiciousNeighbourCount,
    transactionVelocity,
    averageTransactionAmount
  };
}
