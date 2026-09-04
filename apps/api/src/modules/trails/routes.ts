import { Router } from "express";
import { createTrail, getTrail, listTrails, updateTrailStatus } from "./service.js";

export const trailsRouter = Router();

// List all trails
trailsRouter.get("/", async (_req, res) => {
  try {
    const trails = await listTrails();
    res.json(trails);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get trail detail
trailsRouter.get("/:id", async (req, res) => {
  try {
    const trail = await getTrail(req.params.id);
    if (!trail) return res.status(404).json({ error: "Trail not found" });
    res.json(trail);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create and trace a trail from a matched complaint
trailsRouter.post("/", async (req, res) => {
  try {
    const { complaintId } = req.body;
    if (!complaintId) return res.status(400).json({ error: "complaintId required" });
    const trail = await createTrail(complaintId);
    res.status(201).json(trail);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Trace (re-run traversal from an existing trail's complaint)
trailsRouter.post("/:id/trace", async (req, res) => {
  try {
    // Re-trace is the same as creating a new trail from the complaint.
    // For now, just return the existing trail detail.
    const trail = await getTrail(req.params.id);
    if (!trail) return res.status(404).json({ error: "Trail not found" });
    res.json(trail);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update trail status
trailsRouter.patch("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    const valid = ["ACTIVE", "UNDER_REVIEW", "ESCALATED", "RESOLVED", "FALSE_POSITIVE"];
    if (!status || !valid.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${valid.join(", ")}` });
    }
    const trail = await updateTrailStatus(req.params.id, status);
    res.json(trail);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
