import { prisma } from "../../lib/prisma.js";

export async function getIntelligenceSummary() {
  const [
    complaintsTotal,
    complaintsMatched,
    complaintsUnmatched,
    investigations,
    highRiskAccounts,
    watchlistAccounts,
    hotspots
  ] = await Promise.all([
    prisma.complaint.count(),
    prisma.complaint.count({ where: { investigationStatus: "MATCHED" } }),
    prisma.complaint.count({ where: { investigationStatus: "NEW" } }),
    prisma.investigation.count(),
    prisma.account.count({ where: { riskStatus: { in: ["high", "critical"] } } }),
    prisma.watchlistAccount.count({ where: { status: { not: "CLEARED" } } }),
    prisma.locationEvent.groupBy({ by: ["city"], _count: true, having: { city: { not: null } } })
  ]);

  // Network metrics (simulated detection via queries)
  // Accounts present in > 1 complaint trails
  const sharedAccounts = await prisma.$queryRaw<any[]>`
    SELECT accountId, COUNT(DISTINCT trailId) as trailCount
    FROM TrailNode
    GROUP BY accountId
    HAVING trailCount > 1
  `;

  // Suspicious Networks (approximated by trails that intersect)
  const networksOfInterest = Math.max(0, sharedAccounts.length - 2); 

  return {
    totalComplaints: complaintsTotal,
    matched: complaintsMatched,
    unmatched: complaintsUnmatched,
    possibleMatch: 0, // Mock for now, would require a confidence threshold query
    relatedHighRiskAccounts: highRiskAccounts,
    sharedAccountsAcrossCases: sharedAccounts.length,
    networksOfInterest,
    crossBankLinks: await prisma.trailConnection.count({ 
       where: { fromNode: { account: { bankId: { not: null } } } } // Approximation
    }),
    watchlistAccounts,
    activeInvestigations: investigations,
    highRiskHotspots: hotspots.length
  };
}

export async function getNetworkGraph(depth = 1, filters = {}) {
  // Fetch up to N nodes and their connections, prioritizing trails.
  const nodes = await prisma.trailNode.findMany({
    take: 100,
    include: {
      account: { include: { bank: true, riskProfile: true, watchlist: true } },
      trail: true
    }
  });

  const edges = await prisma.trailConnection.findMany({
    take: 200,
    include: {
      transaction: { include: { bank: true } }
    }
  });

  return { nodes, edges };
}

export async function getCrossComplaintCorrelations() {
  const sharedAccounts = await prisma.$queryRaw<any[]>`
    SELECT a.accountRef, 
           COUNT(DISTINCT tn.trailId) as trails, 
           COUNT(DISTINCT c.id) as complaints
    FROM Account a
    JOIN TrailNode tn ON a.id = tn.accountId
    JOIN Trail t ON tn.trailId = t.id
    JOIN Complaint c ON t.complaintId = c.id
    GROUP BY a.id
    HAVING COUNT(DISTINCT tn.trailId) > 1
  `;
  
  return sharedAccounts.map(row => ({
    accountRef: row.accountRef,
    trails: Number(row.trails),
    complaints: Number(row.complaints)
  }));
}

export async function getTransactionAnalytics() {
  // Basic analytics for dashboard
  const modeData = await prisma.transaction.groupBy({
    by: ['transactionMode'],
    _count: true,
    where: { transactionMode: { not: null } }
  });

  return {
    modes: modeData,
    // Would expand to temporal, amounts
  };
}
