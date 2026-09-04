import { prisma } from "../../lib/prisma.js";
import { LocationResolver } from "../geospatial/resolver.js";

export interface MLFeatureVector {
  locationCity: string;
  transactionsInArea24h: number;
  transactionsInArea72h: number;
  distinctTrailsInArea: number;
  suspiciousAccountsInArea: number;
  historicalWithdrawals: number;
  hourOfDay: number;
  isWeekend: number;
  crossBankTransfersInArea: number;
}

export async function extractGeospatialFeatures(
  city: string,
  predictionTime: Date
): Promise<MLFeatureVector> {
  const normalizedCity = LocationResolver.resolve(city)?.city || city;
  
  const timeMinus24h = new Date(predictionTime.getTime() - 24 * 60 * 60 * 1000);
  const timeMinus72h = new Date(predictionTime.getTime() - 72 * 60 * 60 * 1000);

  // Note: CRITICAL! All queries MUST use `timestamp: { lt: predictionTime }` to prevent data leakage.

  // 1. Transaction Volume Features
  const txns72h = await prisma.transaction.findMany({
    where: {
      locationCity: normalizedCity,
      timestamp: {
        gte: timeMinus72h,
        lt: predictionTime, // strictly before prediction time
      }
    },
    include: {
      senderAccount: true,
      receiverAccount: true
    }
  });

  const txns24hCount = txns72h.filter(t => t.timestamp >= timeMinus24h).length;
  
  let crossBankCount = 0;
  const suspiciousAccounts = new Set<string>();

  for (const t of txns72h) {
    if (t.senderAccount.bankId !== t.receiverAccount.bankId) {
      crossBankCount++;
    }
    // We check historical risk (for demo we just assume if they hit watchlists)
    // To perfectly avoid leakage, we'd need temporal risk profiles.
    if (t.senderAccount.riskScore >= 25 || t.senderAccount.watchlistStatus !== "none") {
      suspiciousAccounts.add(t.senderAccountId);
    }
    if (t.receiverAccount.riskScore >= 25 || t.receiverAccount.watchlistStatus !== "none") {
      suspiciousAccounts.add(t.receiverAccountId);
    }
  }

  // 2. Trail Features (Trails created before prediction time)
  const trailConnections = await prisma.trailConnection.findMany({
    where: {
      transaction: {
        locationCity: normalizedCity,
        timestamp: { lt: predictionTime }
      },
      createdAt: { lt: predictionTime }
    },
    select: { trailId: true }
  });
  const distinctTrails = new Set(trailConnections.map(tc => tc.trailId)).size;

  // 3. Historical Withdrawals (only those observed strictly before prediction time)
  const historicalWithdrawalsCount = await prisma.locationEvent.count({
    where: {
      category: "withdrawal",
      city: normalizedCity,
      observedAt: { lt: predictionTime }
    }
  });

  // 4. Temporal Features
  const hourOfDay = predictionTime.getHours();
  const dayOfWeek = predictionTime.getDay();
  const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6) ? 1 : 0;

  return {
    locationCity: normalizedCity,
    transactionsInArea24h: txns24hCount,
    transactionsInArea72h: txns72h.length,
    distinctTrailsInArea: distinctTrails,
    suspiciousAccountsInArea: suspiciousAccounts.size,
    historicalWithdrawals: historicalWithdrawalsCount,
    hourOfDay,
    isWeekend,
    crossBankTransfersInArea: crossBankCount,
  };
}
