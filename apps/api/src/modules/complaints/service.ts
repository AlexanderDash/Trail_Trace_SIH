import { prisma } from "../../lib/prisma.js";
import { parseAmount, parseTimestamp } from "../ingestion/services/normalizer.js";

// ── Configurable matching parameters ────────────────────────────────
export const MATCH_CONFIG = {
  /** Time tolerance in minutes for timestamp comparison */
  timeToleranceMinutes: 5,
  /** Weights for scoring (sum to 1.0 for clean percentages) */
  weights: {
    account: 0.40,
    amount: 0.30,
    mode: 0.15,
    time: 0.15,
  },
};

// ── Types ───────────────────────────────────────────────────────────
export interface MatchCandidate {
  transactionId: string;
  sourceTransactionId: string;
  bankId: string;
  bankName: string;
  senderAccountRef: string;
  receiverAccountRef: string;
  amount: number;
  timestamp: string;
  transactionMode: string | null;
  city: string | null;
  confidence: number;
  reasons: string[];
}

export interface CreateComplaintInput {
  complaintRef: string;
  victimAccountRef: string;
  amount: string | number;
  timestamp: string;
  transactionMode: string;
  description?: string;
}

// ── Complaint creation ──────────────────────────────────────────────
export async function createComplaint(input: CreateComplaintInput) {
  const parsedAmount = parseAmount(input.amount);
  if (parsedAmount === null) throw new Error("Invalid amount");

  const parsedTime = parseTimestamp(input.timestamp);
  if (!parsedTime) throw new Error("Invalid timestamp");

  // Upsert the victim account so we have a relation target
  let victimAccount = await prisma.account.findUnique({
    where: { accountRef: input.victimAccountRef },
  });
  if (!victimAccount) {
    victimAccount = await prisma.account.create({
      data: {
        accountRef: input.victimAccountRef,
        riskScore: 0,
        riskStatus: "unscored",
        watchlistStatus: "none",
      },
    });
  }

  const complaint = await prisma.complaint.create({
    data: {
      complaintRef: input.complaintRef,
      victimAccountId: victimAccount.id,
      amount: parsedAmount,
      timestamp: parsedTime,
      transactionMode: input.transactionMode,
      description: input.description ?? null,
      investigationStatus: "NEW",
    },
  });

  return complaint;
}

// ── List complaints ─────────────────────────────────────────────────
export async function listComplaints() {
  return prisma.complaint.findMany({
    include: {
      victimAccount: true,
      matchedTransaction: {
        include: { bank: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

// ── Get single complaint ────────────────────────────────────────────
export async function getComplaint(id: string) {
  return prisma.complaint.findUnique({
    where: { id },
    include: {
      victimAccount: true,
      matchedTransaction: {
        include: { bank: true, senderAccount: true, receiverAccount: true },
      },
      trails: {
        include: {
          nodes: { include: { account: true }, orderBy: { sequence: "asc" } },
        },
      },
    },
  });
}

// ── Find matching candidates ────────────────────────────────────────
export async function findCandidates(complaintId: string): Promise<MatchCandidate[]> {
  const complaint = await prisma.complaint.findUnique({
    where: { id: complaintId },
    include: { victimAccount: true },
  });
  if (!complaint) throw new Error("Complaint not found");

  const victimRef = complaint.victimAccount.accountRef;
  const targetAmount = Number(complaint.amount);
  const targetTime = complaint.timestamp;
  const targetMode = complaint.transactionMode;

  // Search transactions where the sender matches the victim account
  const candidates = await prisma.transaction.findMany({
    where: {
      senderAccount: { accountRef: victimRef },
    },
    include: {
      bank: true,
      senderAccount: true,
      receiverAccount: true,
    },
    orderBy: { timestamp: "asc" },
  });

  // Score each candidate
  const scored: MatchCandidate[] = candidates.map((txn) => {
    const reasons: string[] = [];
    let score = 0;

    // 1. Account match (always matches because we filtered by sender)
    score += MATCH_CONFIG.weights.account;
    reasons.push("✓ Victim account matched");

    // 2. Amount match
    const txnAmount = Number(txn.amount);
    if (txnAmount === targetAmount) {
      score += MATCH_CONFIG.weights.amount;
      reasons.push("✓ Amount matched exactly");
    } else {
      const ratio = Math.min(txnAmount, targetAmount) / Math.max(txnAmount, targetAmount);
      const partialScore = ratio * MATCH_CONFIG.weights.amount;
      score += partialScore;
      if (ratio > 0.9) {
        reasons.push(`⚠ Amount close (₹${txnAmount.toLocaleString("en-IN")} vs ₹${targetAmount.toLocaleString("en-IN")})`);
      } else {
        reasons.push(`✗ Amount mismatch (₹${txnAmount.toLocaleString("en-IN")} vs ₹${targetAmount.toLocaleString("en-IN")})`);
      }
    }

    // 3. Mode match
    if (targetMode && txn.transactionMode) {
      if (txn.transactionMode.toUpperCase() === targetMode.toUpperCase()) {
        score += MATCH_CONFIG.weights.mode;
        reasons.push("✓ Transaction mode matched");
      } else {
        reasons.push(`✗ Mode mismatch (${txn.transactionMode} vs ${targetMode})`);
      }
    }

    // 4. Time proximity
    const txnTime = txn.timestamp.getTime();
    const complaintTime = targetTime.getTime();
    const diffMs = Math.abs(txnTime - complaintTime);
    const diffMinutes = diffMs / 60000;

    if (diffMinutes <= MATCH_CONFIG.timeToleranceMinutes) {
      // Within tolerance – full or near-full score
      const timeFactor = 1 - (diffMinutes / MATCH_CONFIG.timeToleranceMinutes) * 0.3;
      score += MATCH_CONFIG.weights.time * timeFactor;
      if (diffMinutes < 1) {
        reasons.push("✓ Transaction time matched");
      } else {
        reasons.push(`✓ Transaction within ${Math.round(diffMinutes)} min`);
      }
    } else if (diffMinutes <= 30) {
      const timeFactor = 0.3 * (1 - (diffMinutes - MATCH_CONFIG.timeToleranceMinutes) / 25);
      score += MATCH_CONFIG.weights.time * Math.max(0, timeFactor);
      reasons.push(`⚠ Time difference: ${Math.round(diffMinutes)} min`);
    } else {
      reasons.push(`✗ Time far apart (${Math.round(diffMinutes)} min)`);
    }

    const confidence = Math.round(score * 100);

    return {
      transactionId: txn.id,
      sourceTransactionId: txn.sourceTransactionId,
      bankId: txn.bankId,
      bankName: txn.bank.name,
      senderAccountRef: txn.senderAccount.accountRef,
      receiverAccountRef: txn.receiverAccount.accountRef,
      amount: txnAmount,
      timestamp: txn.timestamp.toISOString(),
      transactionMode: txn.transactionMode,
      city: txn.locationCity,
      confidence,
      reasons,
    };
  });

  // Sort by confidence descending
  scored.sort((a, b) => b.confidence - a.confidence);

  return scored;
}

// ── Confirm a match ─────────────────────────────────────────────────
export async function confirmMatch(complaintId: string, transactionId: string, confidence: number) {
  const updated = await prisma.complaint.update({
    where: { id: complaintId },
    data: {
      matchedTransactionId: transactionId,
      investigationStatus: "MATCHED",
    },
  });
  return updated;
}
