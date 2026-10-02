import type { ModuleStatus } from "@anvesh/shared";

export const MODULE_CATALOG: ModuleStatus[] = [
  {
    key: "ingestion",
    implemented: true,
    summary: "Multi-bank file upload, column mapping, and normalization adapters.",
  },
  {
    key: "transactions",
    implemented: true,
    summary: "Normalized cross-bank ledger with search, filtering, and source metadata.",
  },
  {
    key: "complaints",
    implemented: true,
    summary: "Complaint intake and weighted matching against the normalized transaction graph.",
  },
  {
    key: "investigation",
    implemented: true,
    summary: "Case workspace, activity timeline, evidence linkage, and findings recorder.",
  },
  {
    key: "trails",
    implemented: true,
    summary: "Cross-bank money-trail construction via BFS and mathematical trajectory prediction.",
  },
  {
    key: "risk",
    implemented: true,
    summary: "Behavioural mule-risk scoring with rapid-forwarding and fan-out detection.",
  },
  {
    key: "watchlist",
    implemented: true,
    summary: "Continuous monitoring and triage of flagged high-risk accounts.",
  },
  {
    key: "alerts",
    implemented: true,
    summary: "Real-time behavioural and trail risk alert dispatching.",
  },
  {
    key: "geo",
    implemented: true,
    summary: "Geospatial visualization, location events, and DBSCAN hotspot clustering.",
  },
  {
    key: "ml",
    implemented: true,
    summary: "Hybrid machine learning and heuristic withdrawal hotspot predictive analytics.",
  },
  {
    key: "reports",
    implemented: true,
    summary: "One-click PDF intelligence dossier generation and investigative export digests.",
  },
];
