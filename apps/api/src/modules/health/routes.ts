import * as fs from "fs";
import * as path from "path";
import { Router } from "express";
import { APP_NAME } from "@anvesh/shared";
import { config } from "../../config.js";
import { MODULE_CATALOG } from "../../lib/modules.js";
import { checkDatabase, prisma } from "../../lib/prisma.js";

export const healthRouter = Router();

healthRouter.get("/health", async (_req, res) => {
  const databaseConnected = await checkDatabase();
  res.json({
    status: databaseConnected ? "ok" : "degraded",
    service: APP_NAME,
    version: config.version,
    synthetic: true,
    database: databaseConnected ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
  });
});

healthRouter.get("/system", (_req, res) => {
  res.json({
    name: APP_NAME,
    problemStatement: "SIH 26184",
    synthetic: true,
    atmControlEnabled: false,
    transactionBlockingEnabled: false,
    architecture: {
      frontend: "React + TypeScript + Vite + Tailwind CSS",
      backend: "Node.js + TypeScript + Express",
      database: "SQLite (local foundation) with PostgreSQL as the intended production target",
      orm: "Prisma",
    },
    modules: MODULE_CATALOG,
  });
});

healthRouter.post("/system/clear-memory", async (_req, res) => {
  try {
    // Delete all transactional, investigation, complaint, and account data in order
    await prisma.investigationActivity.deleteMany();
    await prisma.investigationFinding.deleteMany();
    await prisma.investigationNote.deleteMany();
    await prisma.investigation.deleteMany();
    await prisma.trailConnection.deleteMany();
    await prisma.trailNode.deleteMany();
    await prisma.trail.deleteMany();
    await prisma.evidence.deleteMany();
    await prisma.locationEvent.deleteMany();
    await prisma.complaint.deleteMany();
    await prisma.complaintUpload.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.riskHistory.deleteMany();
    await prisma.riskSignal.deleteMany();
    await prisma.riskProfile.deleteMany();
    await prisma.watchlistAccount.deleteMany();
    await prisma.alert.deleteMany();
    await prisma.account.deleteMany();
    await prisma.dataUpload.deleteMany();
    await prisma.bank.deleteMany();
    await prisma.modelVersion.deleteMany();

    // Re-seed standard banks
    const standardBanks = [
      { code: "SBI", name: "State Bank of India" },
      { code: "BOB", name: "Bank of Baroda" },
      { code: "ICICI", name: "ICICI Bank" },
    ];
    for (const bank of standardBanks) {
      await prisma.bank.create({ data: bank });
    }

    // Clean up temporary uploads folder
    const uploadDir = path.join(process.cwd(), "uploads");
    if (fs.existsSync(uploadDir)) {
      const files = fs.readdirSync(uploadDir);
      for (const file of files) {
        try {
          fs.unlinkSync(path.join(uploadDir, file));
        } catch {}
      }
    }

    res.json({
      success: true,
      message: "Memory cleared completely. All complaints, bank uploads, accounts, and trails have been wiped.",
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
