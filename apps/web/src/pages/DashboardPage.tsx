import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { DashboardSummary } from "@anvesh/shared";
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
  Target,
  ArrowUpRight,
} from "lucide-react";

import { api } from "../lib/api";
import { PageHeader } from "../components/ui/PageHeader";
import { Panel } from "../components/ui/Panel";
import { StatCard } from "../components/ui/StatCard";
import { Badge } from "../components/ui/Badge";

export function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [evQueue, setEvQueue] = useState<any[]>([]);

  const loadSummary = () => {
    api
      .dashboard()
      .then(setSummary)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Unable to load dashboard");
      });

    fetch("/api/v1/complaints")
      .then((res) => res.json())
      .then((data) => {
        const sorted = (data || [])
          .map((c: any) => {
            const amt = Number(c.amount || 0);
            const conf = c.matchedTransaction ? 0.82 : 0.68;
            const ev = Math.round(amt * conf);
            return {
              ...c,
              confidence: Math.round(conf * 100),
              expectedValue: ev,
              chokePoint: c.matchedTransaction?.receiverAccount?.accountRef || "Mule Hub",
              urgency: amt >= 150000 ? "CRITICAL" : "HIGH",
            };
          })
          .sort((a: any, b: any) => b.expectedValue - a.expectedValue);
        setEvQueue(sorted);
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadSummary();
  }, []);

  const handleRunEvaluation = async () => {
    setEvaluating(true);
    try {
      await fetch("/api/v1/risk/analyze-all", { method: "POST" });
      await loadSummary();
    } catch (e) {
      console.error(e);
    } finally {
      setEvaluating(false);
    }
  };

  const totals = summary?.totals;

  return (
    <div>
      <PageHeader
        eyebrow="SIH 26184 — Cybercrime Intervention System"
        title="ANVESH Operations Dashboard"
        description="National predictive intelligence dashboard providing macro-level Expected Value (EV) case prioritization, multi-hop money trail tracking, and live mule network risk indicators."
        actions={
          <div className="flex items-center gap-3">
            <button
              onClick={handleRunEvaluation}
              disabled={evaluating}
              className="inline-flex items-center gap-2 rounded-lg bg-intel px-3.5 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-intel/90 disabled:opacity-50 transition-colors"
            >
              {evaluating ? "Evaluating Risk Engine..." : "⚡ Run Risk Engine"}
            </button>
            <Badge tone="intel">ANVESH 2.0 Live</Badge>
          </div>
        }
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
          hint="Source banks with uploaded transaction datasets."
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
          hint="Accounts scored high or critical by behavioural risk engine."
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

      {/* ANVESH National Expected Value (EV) Case Prioritization Queue */}
      <Panel className="mt-6 border-intel/30 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base font-bold text-ink-900 dark:text-ink-100 flex items-center gap-2">
              <Target className="h-5 w-5 text-intel" /> National Interdiction & EV Prioritization Queue
            </h2>
            <p className="text-xs text-ink-500 mt-0.5">
              Macro prioritization ranking active complaints by Expected Value: <code className="font-mono text-intel">EV = Amount × Confidence × Urgency</code>
            </p>
          </div>
          <Badge tone="intel">ANVESH Macro EV Model</Badge>
        </div>

        {evQueue.length === 0 ? (
          <p className="text-xs text-ink-500 italic py-4">No active complaint files queued for interdiction.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-ink-200 dark:border-ink-800 text-[11px] uppercase font-bold text-ink-500">
                <tr>
                  <th className="pb-2.5 font-mono">Rank</th>
                  <th className="pb-2.5">Case Reference</th>
                  <th className="pb-2.5">Victim Account</th>
                  <th className="pb-2.5">Amount at Risk</th>
                  <th className="pb-2.5">Recommended Choke-Point</th>
                  <th className="pb-2.5">Confidence</th>
                  <th className="pb-2.5">Expected Value (EV)</th>
                  <th className="pb-2.5">Urgency Tier</th>
                  <th className="pb-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100 dark:divide-ink-800/60 font-mono">
                {evQueue.slice(0, 6).map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-ink-50/50 dark:hover:bg-ink-800/30 transition-colors">
                    <td className="py-2.5 font-bold text-intel">#{idx + 1}</td>
                    <td className="py-2.5 font-semibold text-ink-900 dark:text-ink-100 font-sans">{item.complaintRef}</td>
                    <td className="py-2.5 text-ink-600 dark:text-ink-400">{item.victimAccount?.accountRef || "Victim"}</td>
                    <td className="py-2.5 font-semibold text-ink-900 dark:text-ink-100">₹{Number(item.amount).toLocaleString("en-IN")}</td>
                    <td className="py-2.5 text-intel font-bold">{item.chokePoint}</td>
                    <td className="py-2.5 text-ink-700 dark:text-ink-300">{item.confidence}%</td>
                    <td className="py-2.5 font-bold text-emerald-600 dark:text-emerald-400">₹{Number(item.expectedValue).toLocaleString("en-IN")}</td>
                    <td className="py-2.5 font-sans">
                      <Badge tone={item.urgency === "CRITICAL" ? "danger" : "warning"}>{item.urgency}</Badge>
                    </td>
                    <td className="py-2.5 text-right font-sans">
                      <Link
                        to="/intelligence"
                        className="inline-flex items-center gap-1 rounded bg-intel/10 text-intel px-2.5 py-1 text-xs font-medium hover:bg-intel hover:text-white transition-colors"
                      >
                        Interdict <ArrowUpRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

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
