import * as fs from "node:fs";
import * as path from "node:path";
import cors from "cors";
import express from "express";
import morgan from "morgan";
import { config } from "./config.js";
import { notImplementedRouter } from "./lib/placeholder.js";
import { banksRouter } from "./modules/banks/routes.js";
import { complaintsRouter } from "./modules/complaints/routes.js";
import { dashboardRouter } from "./modules/dashboard/routes.js";
import { healthRouter } from "./modules/health/routes.js";
import { ingestionRouter } from "./modules/ingestion/routes.js";
import { trailsRouter } from "./modules/trails/routes.js";

import { accountsRouter } from "./modules/accounts/routes.js";
import { watchlistRouter } from "./modules/watchlist/routes.js";
import { alertsRouter } from "./modules/alerts/routes.js";
import { geospatialRouter } from "./modules/geospatial/routes.js";
import { mlRouter } from "./modules/ml/routes.js";
import { investigationsRouter } from "./modules/investigations/routes.js";
import { intelligenceRouter } from "./modules/intelligence/routes.js";

import { transactionsRouter } from "./modules/transactions/routes.js";
import { reportsRouter } from "./modules/reports/routes.js";
import { riskRouter } from "./modules/risk/routes.js";

export function createApp() {
  const app = express();

  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json({ limit: "2mb" }));
  app.use(morgan(config.nodeEnv === "production" ? "combined" : "dev"));

  app.get("/", (_req, res) => {
    res.json({
      name: "ANVESH API",
      synthetic: true,
      docs: "/api/v1/health",
    });
  });

  app.use("/api/v1", healthRouter);
  app.use("/api/v1/dashboard", dashboardRouter);
  app.use("/api/v1/banks", banksRouter);
  app.use("/api/v1/data-sources", banksRouter);
  app.use("/api/v1/ingestion", ingestionRouter);
  app.use("/api/v1/transactions", transactionsRouter);
  app.use("/api/v1/complaints", complaintsRouter);
  app.use("/api/v1/trails", trailsRouter);
  app.use("/api/v1/accounts", accountsRouter);
  app.use("/api/v1/watchlist", watchlistRouter);
  app.use("/api/v1/alerts", alertsRouter);
  app.use("/api/v1/geospatial", geospatialRouter);
  app.use("/api/v1/geo", geospatialRouter);
  app.use("/api/v1/ml", mlRouter);
  app.use("/api/v1/investigations", investigationsRouter);
  app.use("/api/v1/intelligence", intelligenceRouter);
  app.use("/api/v1/risk", riskRouter);
  app.use("/api/v1/reports", reportsRouter);

  // In production, serve the built Vite web client directly
  const webDistPath = path.resolve(process.cwd(), "apps/web/dist");
  if (fs.existsSync(webDistPath)) {
    app.use(express.static(webDistPath));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api/")) return next();
      res.sendFile(path.join(webDistPath, "index.html"));
    });
  }

  app.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  return app;
}
