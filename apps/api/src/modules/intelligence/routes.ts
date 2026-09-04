import { Router } from "express";
import { 
  getIntelligenceSummary, 
  getNetworkGraph, 
  getCrossComplaintCorrelations, 
  getTransactionAnalytics 
} from "./service.js";

export const intelligenceRouter = Router();

intelligenceRouter.get("/summary", async (_req, res) => {
  try {
    const summary = await getIntelligenceSummary();
    res.json(summary);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

intelligenceRouter.get("/network", async (req, res) => {
  try {
    const depth = parseInt(req.query.depth as string) || 1;
    const graph = await getNetworkGraph(depth);
    res.json(graph);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

intelligenceRouter.get("/correlations", async (_req, res) => {
  try {
    const correlations = await getCrossComplaintCorrelations();
    res.json(correlations);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

intelligenceRouter.get("/analytics/transactions", async (_req, res) => {
  try {
    const analytics = await getTransactionAnalytics();
    res.json(analytics);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
