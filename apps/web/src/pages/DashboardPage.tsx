import { useEffect, useState } from "react";
import type { DashboardSummary } from "@trailtrace/shared";
import {
  Bell,
  Building2,
  FileWarning,
  GitBranch,
  ShieldAlert,
  TriangleAlert,
  Wallet,
  Map,
  Briefcase,
} from "lucide-react";
import { api } from "../lib/api";
import { PageHeader } from "../components/ui/PageHeader";
import { Panel } from "../components/ui/Panel";
import { StatCard } from "../components/ui/StatCard";
import { Badge } from "../components/ui/Badge";

export function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .dashboard()
      .then(setSummary)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Unable to load dashboard");
      });
  }, []);

  const totals = summary?.totals;

  return (
    <div>
      <PageHeader
        eyebrow="Operations overview"
        title="Intelligence dashboard"
        description="Live counts from the TrailTrace database. Empty values mean those modules have no records yet — this is a foundation build, not a simulated finished product."
        actions={<Badge tone="intel">Synthetic environment</Badge>}
      />

      {error ? (
        <Panel className="mb-6 border-signal-rose/40">
          <p className="text-sm text-signal-rose">{error}</p>
          <p className="mt-1 text-sm text-ink-500">Start the API with npm run dev from the repository root.</p>
        </Panel>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total transactions"
          value={totals?.transactions ?? "—"}
          hint="Normalized ledger rows across all uploaded banks."
          icon={Wallet}
          tone="intel"
        />
        <StatCard
          label="Uploaded banks"
          value={totals?.banks ?? "—"}
          hint="Registered source banks. Ingestion of files is not live yet."
          icon={Building2}
        />
        <StatCard
          label="Active complaints"
          value={totals?.activeComplaints ?? "—"}
          hint="Complaints not marked closed."
          icon={FileWarning}
          tone="warning"
        />
        <StatCard
          label="Tracked trails"
          value={totals?.trackedTrails ?? "—"}
          hint="Cross-bank money trails linked to complaints."
          icon={GitBranch}
        />
        <StatCard
          label="Active Investigations"
          value={summary?.investigationsOpen ?? "—"}
          hint="Open case files."
          icon={Briefcase}
        />
        <StatCard
          label="Watched accounts"
          value={totals?.watchedAccounts ?? "—"}
          hint="Accounts placed on the watchlist after risk evidence."
          icon={ShieldAlert}
        />
        <StatCard
          label="High risk accounts"
          value={totals?.highRiskAccounts ?? "—"}
          hint="Accounts scored high or critical. Scoring engine not implemented."
          icon={TriangleAlert}
          tone="danger"
        />
        <StatCard
          label="Active alerts"
          value={totals?.activeAlerts ?? "—"}
          hint="Unacknowledged investigator alerts."
          icon={Bell}
          tone="warning"
        />
        <StatCard
          label="Predicted hotspots"
          value={totals?.predictedHotspots ?? "—"}
          hint="Geospatial areas with high predicted withdrawal likelihood."
          icon={Map}
          tone="danger"
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Panel>
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-ink-400">Module status</h2>
          <ul className="mt-4 space-y-2">
            {(summary?.modules ?? []).map((module) => (
              <li
                key={module.key}
                className="flex items-start justify-between gap-4 rounded-lg bg-ink-50 px-3 py-2 dark:bg-ink-800/50"
              >
                <div>
                  <p className="font-mono text-xs uppercase text-ink-700 dark:text-ink-200">{module.key}</p>
                  <p className="text-xs text-ink-500 dark:text-ink-400">{module.summary}</p>
                </div>
                <Badge tone={module.implemented ? "intel" : "neutral"}>
                  {module.implemented ? "Live" : "Scaffold"}
                </Badge>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel>
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-ink-400">Operating constraints</h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-ink-600 dark:text-ink-300">
            <li>Account identifiers are graph nodes. Transactions are edges, including across banks.</li>
            <li>Mule detection will use a risk score. Presence on a trail is not automatic guilt.</li>
            <li>Geographic layers may later include ATMs as map features only.</li>
            <li>No ATM blocking, rejection, or police dispatch is in this product.</li>
          </ul>
          
          <div className="mt-8 pt-6 border-t border-ink-200 dark:border-ink-800">
             <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-ink-400 mb-4">Predictive Intelligence</h2>
             <div className="bg-ink-50 dark:bg-ink-900 rounded p-4 text-sm space-y-2 text-ink-700 dark:text-ink-300">
                <div className="flex justify-between">
                  <span>Active ML Model:</span>
                  <span className="font-mono text-ink-900 dark:text-ink-100">LogisticRegression_v1</span>
                </div>
                <div className="flex justify-between">
                  <span>Status:</span>
                  <Badge tone="warning">INSUFFICIENT DATA</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Training Samples:</span>
                  <span className="font-mono text-ink-900 dark:text-ink-100">{'<'} 50</span>
                </div>
                <div className="mt-2 text-xs text-ink-500 italic">
                   Note: Model requires more historical withdrawal records. Using deterministic Stage 5 rules engine fallback for production predictions.
                </div>
             </div>
          </div>

          <p className="mt-6 font-mono text-[11px] text-ink-400">
            Generated {summary ? new Date(summary.generatedAt).toLocaleString() : "—"} · DB{" "}
            {summary?.databaseConnected ? "connected" : "unknown"}
          </p>
        </Panel>
      </div>
    </div>
  );
}
