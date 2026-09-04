import type { DashboardSummary } from "@trailtrace/shared";
import { prisma } from "../../lib/prisma.js";
import { MODULE_CATALOG } from "../../lib/modules.js";
import { analyzeGeospatialHotspots } from "../geospatial/service.js";

export async function getDashboardSummary(databaseConnected: boolean): Promise<DashboardSummary> {
  const [
    transactions,
    banks,
    activeComplaints,
    trackedTrails,
    watchedAccounts,
    highRiskAccounts,
    activeAlerts,
    hotspots,
    investigationsOpen
  ] = databaseConnected
    ? await Promise.all([
        prisma.transaction.count(),
        prisma.bank.count(),
        prisma.complaint.count({
          where: { investigationStatus: { not: "closed" } },
        }),
        prisma.trail.count(),
        prisma.watchlistAccount.count({ where: { status: { not: "CLEARED" } } }),
        prisma.account.count({
          where: { riskStatus: { in: ["high", "critical"] } },
        }),
        prisma.alert.count({ where: { acknowledged: false } }),
        analyzeGeospatialHotspots(),
        prisma.investigation.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } })
      ])
    : [0, 0, 0, 0, 0, 0, 0, [], 0];

  return {
    synthetic: true,
    generatedAt: new Date().toISOString(),
    databaseConnected,
    investigationsOpen,
    totals: {
      transactions,
      banks,
      activeComplaints,
      trackedTrails,
      watchedAccounts,
      highRiskAccounts,
      activeAlerts,
      predictedHotspots: hotspots.length,
    },
    modules: MODULE_CATALOG,
  };
}
