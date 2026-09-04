import { Router } from "express";
import { checkDatabase } from "../../lib/prisma.js";
import { getDashboardSummary } from "./service.js";

export const dashboardRouter = Router();

dashboardRouter.get("/summary", async (_req, res) => {
  const databaseConnected = await checkDatabase();
  const summary = await getDashboardSummary(databaseConnected);
  res.json(summary);
});
