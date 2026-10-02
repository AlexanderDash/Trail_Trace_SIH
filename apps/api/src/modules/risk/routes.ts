import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { analyzeAccountRisk, analyzeAllAccounts } from "./scorer.js";

export const riskRouter = Router();

// POST /api/v1/risk/analyze-all - Trigger system-wide risk evaluation
riskRouter.post("/analyze-all", async (_req, res) => {
  try {
    const results = await analyzeAllAccounts();
    res.json({ success: true, count: results.length, accounts: results });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// GET /api/v1/risk/summary - System-wide behavioural risk metrics
riskRouter.get("/summary", async (_req, res) => {
  try {
    const [totalScored, highRisk, criticalRisk, recentSignals] = await Promise.all([
      prisma.riskProfile.count(),
      prisma.riskProfile.count({ where: { level: "HIGH" } }),
      prisma.riskProfile.count({ where: { level: "CRITICAL" } }),
      prisma.riskSignal.count(),
    ]);

    const signalTypes = await prisma.riskSignal.groupBy({
      by: ["signalType"],
      _count: { id: true },
    });

    res.json({
      totalScoredAccounts: totalScored,
      highRiskAccounts: highRisk,
      criticalRiskAccounts: criticalRisk,
      totalSignalsDetected: recentSignals,
      signalDistribution: signalTypes.map((s) => ({
        type: s.signalType,
        count: s._count.id,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/risk/signals - Recent risk signals
riskRouter.get("/signals", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 50, 100);
    const signals = await prisma.riskSignal.findMany({
      take: limit,
      orderBy: { detectedAt: "desc" },
      include: {
        account: {
          select: { id: true, accountRef: true, bankId: true },
        },
      },
    });
    res.json(signals);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/risk/analyze/:accountId - Trigger risk evaluation for an account
riskRouter.post("/analyze/:accountId", async (req, res) => {
  try {
    const result = await analyzeAccountRisk(req.params.accountId);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
