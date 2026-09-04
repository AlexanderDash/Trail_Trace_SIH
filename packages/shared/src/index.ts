export const APP_NAME = "TrailTrace";
export const APP_TAGLINE = "Cybercrime Financial Intelligence";
export const PROBLEM_STATEMENT = "SIH 26184";

export type ModuleKey =
  | "ingestion"
  | "transactions"
  | "complaints"
  | "investigation"
  | "trails"
  | "risk"
  | "watchlist"
  | "alerts"
  | "geo"
  | "ml"
  | "reports";

export type ModuleStatus = {
  key: ModuleKey;
  implemented: boolean;
  summary: string;
};

export type DashboardTotals = {
  transactions: number;
  banks: number;
  activeComplaints: number;
  trackedTrails: number;
  watchedAccounts: number;
  highRiskAccounts: number;
  activeAlerts: number;
  predictedHotspots: number;
};

export type DashboardSummary = {
  synthetic: true;
  generatedAt: string;
  databaseConnected: boolean;
  investigationsOpen: number;
  totals: DashboardTotals;
  modules: ModuleStatus[];
};

export type BankRecord = {
  id: string;
  code: string;
  name: string;
  createdAt: string;
};

export type ApiListResponse<T> = {
  module: string;
  implemented: boolean;
  items: T[];
  message: string;
};

export type HealthResponse = {
  status: "ok" | "degraded";
  service: string;
  version: string;
  synthetic: true;
  database: "connected" | "disconnected";
  timestamp: string;
};

export type SystemInfo = {
  name: string;
  problemStatement: string;
  synthetic: true;
  atmControlEnabled: false;
  transactionBlockingEnabled: false;
  architecture: {
    frontend: string;
    backend: string;
    database: string;
    orm: string;
  };
  modules: ModuleStatus[];
};
