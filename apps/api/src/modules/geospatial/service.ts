import { prisma } from "../../lib/prisma.js";
import { LocationResolver } from "./resolver.js";

export interface GeoActivity {
  latitude: number;
  longitude: number;
  city: string;
  transactionCount: number;
  totalAmount: number;
  uniqueAccounts: Set<string>;
  uniqueTrails: Set<string>;
  historicalWithdrawalCount: number;
  highRiskAccountCount: number;
  recentActivityBonus: number;
}

export interface GeoHotspot {
  id: string;
  latitude: number;
  longitude: number;
  city: string;
  score: number;
  riskLevel: string;
  transactionCount: number;
  accountCount: number;
  trailCount: number;
  historicalWithdrawalCount: number;
  reasons: string[];
}

// Distance formula (Haversine) - although we will just cluster by city string for simplicity in the demo
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);  
  const dLon = (lon2 - lon1) * (Math.PI / 180); 
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c; 
}

export async function analyzeGeospatialHotspots(): Promise<GeoHotspot[]> {
  // 1. Gather Activity
  const activityMap = new Map<string, GeoActivity>();

  const getOrCreate = (city: string, lat: number, lon: number) => {
    const key = city.toLowerCase();
    if (!activityMap.has(key)) {
      activityMap.set(key, {
        latitude: lat,
        longitude: lon,
        city,
        transactionCount: 0,
        totalAmount: 0,
        uniqueAccounts: new Set(),
        uniqueTrails: new Set(),
        historicalWithdrawalCount: 0,
        highRiskAccountCount: 0,
        recentActivityBonus: 0
      });
    }
    return activityMap.get(key)!;
  };

  // Find all transactions associated with high-risk or watchlisted accounts
  const riskyAccounts = await prisma.account.findMany({
    where: { OR: [ { riskScore: { gte: 25 } }, { watchlistStatus: { not: "none" } } ] }
  });
  const riskyAccountIds = new Set(riskyAccounts.map(a => a.id));

  const transactions = await prisma.transaction.findMany({
    where: {
      OR: [
        { senderAccountId: { in: Array.from(riskyAccountIds) } },
        { receiverAccountId: { in: Array.from(riskyAccountIds) } }
      ]
    },
    include: {
      senderAccount: true,
      receiverAccount: true,
    }
  });

  const now = Date.now();

  for (const t of transactions) {
    if (!t.locationCity) continue;
    const coords = LocationResolver.resolve(t.locationCity);
    if (!coords) continue;

    const cluster = getOrCreate(coords.city, coords.latitude, coords.longitude);
    
    cluster.transactionCount++;
    cluster.totalAmount += Number(t.amount);
    
    if (riskyAccountIds.has(t.senderAccountId)) cluster.uniqueAccounts.add(t.senderAccountId);
    if (riskyAccountIds.has(t.receiverAccountId)) cluster.uniqueAccounts.add(t.receiverAccountId);

    // Temporal recency bonus: within last 72 hours
    if (now - t.timestamp.getTime() < 72 * 60 * 60 * 1000) {
      cluster.recentActivityBonus += 1;
    }
  }

  // Find all trail nodes to associate locations with complaint trails
  const trailNodes = await prisma.trailNode.findMany({
    include: {
      account: {
        include: {
          sentTransactions: true,
          receivedTransactions: true
        }
      }
    }
  });

  for (const node of trailNodes) {
    const txns = [...node.account.sentTransactions, ...node.account.receivedTransactions];
    for (const t of txns) {
      if (!t.locationCity) continue;
      const coords = LocationResolver.resolve(t.locationCity);
      if (!coords) continue;
      
      const cluster = getOrCreate(coords.city, coords.latitude, coords.longitude);
      cluster.uniqueTrails.add(node.trailId);
    }
  }

  // Count high risk accounts per cluster
  for (const [key, cluster] of activityMap.entries()) {
    for (const accId of cluster.uniqueAccounts) {
      const isHighRisk = riskyAccounts.find(a => a.id === accId && a.riskScore >= 50);
      if (isHighRisk) cluster.highRiskAccountCount++;
    }
  }

  // Historical Withdrawals (LocationEvents)
  const withdrawals = await prisma.locationEvent.findMany({
    where: { category: "withdrawal" }
  });

  for (const w of withdrawals) {
    if (!w.city) continue;
    const coords = LocationResolver.resolve(w.city);
    if (!coords) continue;

    const cluster = getOrCreate(coords.city, coords.latitude, coords.longitude);
    cluster.historicalWithdrawalCount++;
  }

  // 2. Score the Hotspots
  const hotspots: GeoHotspot[] = [];

  for (const [cityKey, data] of activityMap.entries()) {
    let score = 0;
    const reasons: string[] = [];

    // Filter out completely normal cities with tiny activity
    if (data.transactionCount < 3 && data.uniqueTrails.size === 0 && data.historicalWithdrawalCount === 0) {
      continue;
    }

    // Historical Withdrawal Pattern (up to 30)
    if (data.historicalWithdrawalCount > 0) {
      const pts = Math.min(data.historicalWithdrawalCount * 10, 30);
      score += pts;
      reasons.push(`Historical withdrawals frequently occurred in this area (${data.historicalWithdrawalCount} recorded).`);
    }

    // Geographic Concentration / Recent Suspicious Activity (up to 25)
    if (data.transactionCount > 0) {
      const pts = Math.min(data.transactionCount * 2, 25);
      score += pts;
      reasons.push(`${data.transactionCount} suspicious/monitored transactions occurred in this area.`);
    }

    // Trail Concentration (up to 25)
    if (data.uniqueTrails.size > 0) {
      const pts = Math.min(data.uniqueTrails.size * 8, 25);
      score += pts;
      reasons.push(`${data.uniqueTrails.size} active complaint trails pass through this area.`);
    }

    // Mule-account activity (up to 15)
    if (data.highRiskAccountCount > 0) {
      const pts = Math.min(data.highRiskAccountCount * 5, 15);
      score += pts;
      reasons.push(`${data.highRiskAccountCount} high-risk accounts are actively transacting here.`);
    }

    // Temporal proximity (up to 15)
    if (data.recentActivityBonus > 0) {
      const pts = Math.min(data.recentActivityBonus * 3, 15);
      score += pts;
      reasons.push(`Recent suspicious activity occurred in the last 72 hours.`);
    }

    const finalScore = Math.min(Math.max(score, 0), 100);
    
    let riskLevel = "LOW";
    if (finalScore >= 75) riskLevel = "CRITICAL";
    else if (finalScore >= 50) riskLevel = "HIGH";
    else if (finalScore >= 25) riskLevel = "MEDIUM";

    // Only emit interesting hotspots
    if (finalScore >= 25) {
      hotspots.push({
        id: `HS_${cityKey.replace(/\s+/g, "_").toUpperCase()}`,
        latitude: data.latitude,
        longitude: data.longitude,
        city: data.city,
        score: finalScore,
        riskLevel,
        transactionCount: data.transactionCount,
        accountCount: data.uniqueAccounts.size,
        trailCount: data.uniqueTrails.size,
        historicalWithdrawalCount: data.historicalWithdrawalCount,
        reasons
      });
    }
  }

  return hotspots.sort((a, b) => b.score - a.score);
}
