import { Router } from "express";
import { checkDatabase } from "../../lib/prisma.js";
import { getDashboardSummary } from "./service.js";

export const dashboardRouter = Router();

dashboardRouter.get("/summary", async (_req, res) => {
  try {
    const databaseConnected = await checkDatabase();
    const summary = await getDashboardSummary(databaseConnected);
    res.json(summary);
  } catch (err: any) {
    console.error("[Dashboard] /summary error:", err?.message ?? err);
    res.status(500).json({
      error: "Dashboard summary failed",
      detail: err?.message ?? String(err),
    });
  }
});
