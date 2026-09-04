import { Router } from "express";
import {
  createComplaint,
  listComplaints,
  getComplaint,
  findCandidates,
  confirmMatch,
} from "./service.js";

import multer from "multer";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { prisma } from "../../lib/prisma.js";
import { processComplaintUpload } from "./import.js";

const upload = multer({ dest: "uploads/" });

export const complaintsRouter = Router();

// Upload complaints file
complaintsRouter.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const uploadRecord = await prisma.complaintUpload.create({
      data: {
        fileName: req.file.originalname,
        status: "PROCESSING",
      },
    });

    // Fire and forget processing
    processComplaintUpload(uploadRecord.id, req.file.path).catch(console.error);

    res.status(202).json({
      message: "Complaint import started",
      uploadId: uploadRecord.id,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get uploads status
complaintsRouter.get("/imports", async (_req, res) => {
  try {
    const imports = await prisma.complaintUpload.findMany({
      orderBy: { createdAt: "desc" },
      take: 20
    });
    res.json(imports);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// List all complaints
complaintsRouter.get("/", async (_req, res) => {
  try {
    const complaints = await listComplaints();
    res.json(complaints);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get a single complaint with relations
complaintsRouter.get("/:id", async (req, res) => {
  try {
    const complaint = await getComplaint(req.params.id);
    if (!complaint) return res.status(404).json({ error: "Not found" });
    res.json(complaint);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create a complaint
complaintsRouter.post("/", async (req, res) => {
  try {
    const { complaintRef, victimAccountRef, amount, timestamp, transactionMode, description } = req.body;
    if (!complaintRef || !victimAccountRef || !amount || !timestamp || !transactionMode) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const complaint = await createComplaint({
      complaintRef,
      victimAccountRef,
      amount,
      timestamp,
      transactionMode,
      description,
    });
    res.status(201).json(complaint);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Find matching transaction candidates
complaintsRouter.get("/:id/candidates", async (req, res) => {
  try {
    const candidates = await findCandidates(req.params.id);
    res.json(candidates);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Confirm a transaction match
complaintsRouter.post("/:id/match", async (req, res) => {
  try {
    const { transactionId, confidence } = req.body;
    if (!transactionId) return res.status(400).json({ error: "transactionId required" });
    const updated = await confirmMatch(req.params.id, transactionId, confidence ?? 0);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
