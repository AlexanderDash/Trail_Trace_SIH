import type { ModuleStatus } from "@trailtrace/shared";

export const MODULE_CATALOG: ModuleStatus[] = [
  {
    key: "ingestion",
    implemented: true,
    summary: "Multi-bank file upload, column mapping, and normalization adapters.",
  },
  {
    key: "transactions",
    implemented: true,
    summary: "Normalized cross-bank ledger with preserved source-bank metadata.",
  },
  {
    key: "complaints",
    implemented: true,
    summary: "Complaint intake and weighted matching against the normalized transaction graph.",
  },
  {
    key: "investigation",
    implemented: false,
    summary: "Case files, evidence linkage, and investigator workflow.",
  },
  {
    key: "trails",
    implemented: true,
    summary: "Cross-bank money-trail construction via BFS from a matched origin transaction.",
  },
  {
    key: "risk",
    implemented: false,
    summary: "Behavioural mule-risk scoring. Appearance in a trail is not sufficient.",
  },
  {
    key: "watchlist",
    implemented: false,
    summary: "Monitoring of accounts that cross a risk threshold.",
  },
  {
    key: "alerts",
    implemented: false,
    summary: "Activity alerts for watched accounts and trail updates.",
  },
  {
    key: "geo",
    implemented: false,
    summary: "Location events, clusters, and later hotspot prediction. No ATM control.",
  },
  {
    key: "reports",
    implemented: false,
    summary: "Investigator-facing summaries and exportable intelligence notes.",
  },
];
