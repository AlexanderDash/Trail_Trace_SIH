import { Router } from "express";
import { APP_NAME } from "@trailtrace/shared";
import { config } from "../../config.js";
import { MODULE_CATALOG } from "../../lib/modules.js";
import { checkDatabase } from "../../lib/prisma.js";

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
