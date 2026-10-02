import type { DashboardSummary } from "@anvesh/shared";
import { prisma } from "../../lib/prisma.js";
import { MODULE_CATALOG } from "../../lib/modules.js";
import { analyzeGeospatialHotspots } from "../geospatial/service.js";
import { analyzeAllAccounts } from "../risk/scorer.js";

export async function getDashboardSummary(databaseConnected: boolean): Promise<DashboardSummary> {
  let [
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
        prisma.bank.count({
          where: {
            uploads: { some: {} },
          },
        }),
        prisma.complaint.count({
          where: { investigationStatus: { not: "closed" } },
        }),
        prisma.trail.count(),
        prisma.watchlistAccount.count({ where: { status: { not: "CLEARED" } } }),
        prisma.account.count({
          where: { riskStatus: { in: ["high", "critical"] } },
        }),
        prisma.alert.count({ where: { acknowledged: false } }),
        analyzeGeospatialHotspots().catch((e) => {
          console.warn("[Dashboard] Geospatial analysis failed (non-fatal):", e?.message ?? e);
          return [] as any[];
        }),
        prisma.investigation.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } })
      ])
    : [0, 0, 0, 0, 0, 0, 0, [], 0];

  // If there are transactions/trails but accounts haven't been evaluated yet, run auto-analysis
  if (databaseConnected && trackedTrails > 0 && (highRiskAccounts === 0 || watchedAccounts === 0 || activeAlerts === 0)) {
    try {
      await analyzeAllAccounts();
      [watchedAccounts, highRiskAccounts, activeAlerts] = await Promise.all([
        prisma.watchlistAccount.count({ where: { status: { not: "CLEARED" } } }),
        prisma.account.count({
          where: { riskStatus: { in: ["high", "critical"] } },
        }),
        prisma.alert.count({ where: { acknowledged: false } }),
      ]);
    } catch (e) {
      console.warn("[Dashboard] Auto-analysis failed (non-fatal):", (e as any)?.message ?? e);
    }
  }


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
