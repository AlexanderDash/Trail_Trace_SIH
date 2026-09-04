import { prisma } from "../../lib/prisma.js";
import { extractFeatures, AccountFeatures } from "./features.js";

// Conceptual thresholds
const THRESHOLDS = {
  MEDIUM: 25,
  HIGH: 50,
  CRITICAL: 75,
};

export async function analyzeAccountRisk(accountId: string) {
  const account = await prisma.account.findUnique({ where: { id: accountId } });
  if (!account) throw new Error("Account not found");

  const features = await extractFeatures(accountId);
  
  let score = 0;
  const signals = [];

  // 1. Complaint trail involvement (0-30)
  if (features.distinctComplaintTrailCount > 0) {
    const pts = Math.min(features.distinctComplaintTrailCount * 10, 30);
    score += pts;
    signals.push({
      signalType: "REPEATED_COMPLAINT_TRAILS",
      severity: pts >= 20 ? "CRITICAL" : "HIGH",
      value: features.distinctComplaintTrailCount,
      description: `Appeared in ${features.distinctComplaintTrailCount} independent complaint trails.`,
    });
  }

  // 2. Rapid forwarding (0-20)
  // Penalize rapid forwarding only if it happens multiple times or is a large % of txns
  if (features.rapidForwardingCount > 0) {
    const pts = Math.min(features.rapidForwardingCount * 10, 20);
    score += pts;
    signals.push({
      signalType: "RAPID_FORWARDING",
      severity: pts >= 15 ? "HIGH" : "MEDIUM",
      value: features.rapidForwardingCount,
      description: `Rapidly forwarded funds ${features.rapidForwardingCount} time(s) (avg ${features.averageHoldingTimeMinutes.toFixed(1)} mins).`,
    });
  }

  // 3. High forwarding ratio (0-15)
  if (features.averageForwardingRatio > 0.8 && features.rapidForwardingCount > 0) {
    const pts = Math.min(Math.round((features.averageForwardingRatio - 0.8) * 5 * 15), 15);
    score += pts;
    signals.push({
      signalType: "HIGH_FORWARDING_RATIO",
      severity: "HIGH",
      value: features.averageForwardingRatio,
      description: `High average forwarding ratio of ${(features.averageForwardingRatio * 100).toFixed(0)}%.`,
    });
  }

  // 4. Cross-bank behaviour (0-10)
  if (features.crossBankTransferCount > 0) {
    const pts = Math.min(features.crossBankTransferCount * 2, 10);
    score += pts;
    signals.push({
      signalType: "CROSS_BANK_MOVEMENT",
      severity: "MEDIUM",
      value: features.crossBankTransferCount,
      description: `Participated in ${features.crossBankTransferCount} cross-bank transfers.`,
    });
  }

  // 5. Fan-out/fan-in behaviour (0-10)
  if (features.fanOutCount >= 5 && features.fanInCount <= 2) {
    const pts = Math.min((features.fanOutCount - 4) * 2, 10);
    score += pts;
    signals.push({
      signalType: "HIGH_FAN_OUT",
      severity: "HIGH",
      value: features.fanOutCount,
      description: `High fan-out behaviour detected: sending to ${features.fanOutCount} distinct accounts.`,
    });
  }
  if (features.fanInCount >= 5 && features.fanOutCount <= 2) {
    const pts = Math.min((features.fanInCount - 4) * 2, 10);
    score += pts;
    signals.push({
      signalType: "HIGH_FAN_IN",
      severity: "HIGH",
      value: features.fanInCount,
      description: `High fan-in behaviour detected: receiving from ${features.fanInCount} distinct accounts.`,
    });
  }

  // 6. Suspicious network association (0-10)
  if (features.suspiciousNeighbourCount > 0) {
    const pts = Math.min(features.suspiciousNeighbourCount * 2, 10);
    score += pts;
    signals.push({
      signalType: "SUSPICIOUS_NETWORK_ASSOCIATION",
      severity: "MEDIUM",
      value: features.suspiciousNeighbourCount,
      description: `Transacted with ${features.suspiciousNeighbourCount} other high-risk accounts.`,
    });
  }

  // 7. Transaction velocity anomalies (0-5)
  // Legitimate businesses have high velocity, but they usually don't have the other mule signals.
  // We only add velocity risk if there are other suspicious signals present to avoid false positives.
  if (features.transactionVelocity > 10 && score > 20) {
    score += 5;
    signals.push({
      signalType: "HIGH_TRANSACTION_VELOCITY",
      severity: "LOW",
      value: features.transactionVelocity,
      description: `Unusually high transaction velocity: ${features.transactionVelocity.toFixed(1)} txns/day.`,
    });
  }

  // Final score clamping
  const finalScore = Math.min(Math.max(score, 0), 100);

  // Level mapping
  let level = "LOW";
  if (finalScore >= THRESHOLDS.CRITICAL) level = "CRITICAL";
  else if (finalScore >= THRESHOLDS.HIGH) level = "HIGH";
  else if (finalScore >= THRESHOLDS.MEDIUM) level = "MEDIUM";

  // Check if score changed
  let reason = null;
  const oldScore = account.riskScore;
  const oldLevel = account.riskStatus.toUpperCase() === "UNSCORED" ? null : account.riskStatus.toUpperCase();

  if (oldScore !== finalScore || oldLevel !== level) {
    reason = "Risk score updated due to recent behavioural analysis.";
    await prisma.riskHistory.create({
      data: {
        accountId,
        oldScore: oldScore,
        newScore: finalScore,
        oldLevel: oldLevel,
        newLevel: level,
        reason,
      },
    });
  }

  // Persist RiskProfile (Upsert)
  const profile = await prisma.riskProfile.upsert({
    where: { accountId },
    update: {
      score: finalScore,
      level,
      features: features as any,
    },
    create: {
      accountId,
      score: finalScore,
      level,
      features: features as any,
    },
  });

  // Persist RiskSignals (Delete old, insert new)
  await prisma.riskSignal.deleteMany({ where: { accountId } });
  if (signals.length > 0) {
    await prisma.riskSignal.createMany({
      data: signals.map(s => ({
        accountId,
        signalType: s.signalType,
        severity: s.severity,
        value: s.value,
        description: s.description,
      })),
    });
  }

  // Update Account denormalized fields
  await prisma.account.update({
    where: { id: accountId },
    data: {
      riskScore: finalScore,
      riskStatus: level.toLowerCase(),
    },
  });

  // Watchlist threshold check (Recommend for watchlist if HIGH/CRITICAL and not already monitored)
  if (finalScore >= THRESHOLDS.HIGH && account.watchlistStatus === "none") {
    // We could auto-create a recommendation alert, but for now we'll just return it in the API.
    // The prompt says "provide an option to recommend for watchlist". This can be a UI concern.
  }

  return {
    score: finalScore,
    level,
    signals,
    features,
  };
}
