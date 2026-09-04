import { Router } from "express";
import { listAlerts, acknowledgeAlert } from "./service.js";

export const alertsRouter = Router();

alertsRouter.get("/", async (_req, res) => {
  try {
    const alerts = await listAlerts();
    res.json(alerts);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

alertsRouter.patch("/:id", async (req, res) => {
  try {
    const { acknowledged } = req.body;
    if (acknowledged) {
      const alert = await acknowledgeAlert(req.params.id);
      return res.json(alert);
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
