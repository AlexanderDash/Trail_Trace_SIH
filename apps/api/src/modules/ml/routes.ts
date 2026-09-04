import { Router } from "express";
import { trainModel, getActiveModel, predictHotspotsHybrid, checkDataQualityReport } from "./service.js";

export const mlRouter = Router();

mlRouter.get("/data-quality", async (req, res) => {
  try {
    const report = await checkDataQualityReport();
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

mlRouter.post("/train", async (req, res) => {
  try {
    const result = await trainModel();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

mlRouter.get("/models/active", async (req, res) => {
  try {
    const model = await getActiveModel();
    res.json(model);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

mlRouter.get("/predict", async (req, res) => {
  try {
    const hotspots = await predictHotspotsHybrid();
    res.json(hotspots);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
