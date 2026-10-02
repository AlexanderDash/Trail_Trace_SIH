import { useEffect, useState } from "react";
import {
  GitBranch,
  Building2,
  ChevronLeft,
  Clock,
  MapPin,
  Sparkles,
  Target,
} from "lucide-react";


import { Badge } from "../components/ui/Badge";
import { PageHeader } from "../components/ui/PageHeader";
import { Panel } from "../components/ui/Panel";

const API = "/api/v1";

interface TrailListItem {
  id: string;
  complaintRef: string;
  victimAccount: string;
  startingAmount: number;
  lastKnownAccount: string;
  hops: number;
  status: string;
  createdAt: string;
}

interface TrailNode {
  accountRef: string;
  accountId: string;
  bankName: string;
  bankCode: string;
  hop: number;
  role: string;
  transactionId?: string;
  sourceTransactionId?: string;
  amount?: number;
  timestamp?: string;
  transactionMode?: string;
  city?: string;
}

interface TrailDetail {
  trailId: string;
  complaintId: string;
  startingTransactionId: string;
  status: string;
  nodes: TrailNode[];
  banksCrossed: string[];
  lastKnownAccount: string;
  summary: string;
}

const STATUS_OPTIONS = ["ACTIVE", "UNDER_REVIEW", "ESCALATED", "RESOLVED", "FALSE_POSITIVE"];

const statusTone = (s: string): "neutral" | "intel" | "warning" | "danger" => {
  if (s === "ACTIVE") return "intel";
  if (s === "UNDER_REVIEW" || s === "ESCALATED") return "warning";
  if (s === "RESOLVED") return "neutral";
  if (s === "FALSE_POSITIVE") return "danger";
  return "neutral";
};

const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export function TrailsPage() {
  const [trails, setTrails] = useState<TrailListItem[]>([]);
  const [detail, setDetail] = useState<TrailDetail | null>(null);
  const [prediction, setPrediction] = useState<any>(null);
  const [loadingPrediction, setLoadingPrediction] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTrails();
  }, []);

  const fetchTrails = async () => {
    try {
      const res = await fetch(`${API}/trails`);
      const data = await res.json();
      setTrails(data);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const openDetail = async (id: string) => {
    try {
      const res = await fetch(`${API}/trails/${id}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setDetail(data);

      setPrediction(null);
      setLoadingPrediction(true);
      fetch(`${API}/trails/${id}/prediction`)
        .then((r) => r.json())
        .then((pred) => {
          if (!pred.error) setPrediction(pred);
        })
        .catch(() => {})
        .finally(() => setLoadingPrediction(false));
    } catch (e: any) {
      setError(e.message);
    }
  };

  const updateStatus = async (trailId: string, status: string) => {
    try {
      await fetch(`${API}/trails/${trailId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (detail) setDetail({ ...detail, status });
      fetchTrails();
    } catch (e: any) {
      setError(e.message);
    }
  };

  // ── Detail View ────────────────────────────────────────────────
  if (detail) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Trail investigation"
          title={`Trail — ${detail.trailId.slice(0, 8)}…`}
          description={detail.summary}
          actions={
            <div className="flex gap-2">
              <a href={`/geospatial?trail=${detail.trailId}`} className="flex items-center gap-2 rounded bg-ink-900 text-white px-4 py-2 text-sm hover:bg-ink-800 dark:bg-ink-100 dark:text-ink-900 dark:hover:bg-white">
                View Trail on Map
              </a>
              <button
                onClick={async () => {
                  try {
                    const res = await fetch(`${API}/investigations`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ complaintId: detail.complaintId }),
                    });
                    const data = await res.json();
                    if (data.error) throw new Error(data.error);
                    window.location.href = `/investigations/${data.id}`;
                  } catch (e: any) {
                    setError(e.message);
                  }
                }}
                className="flex items-center gap-2 rounded bg-intel text-white px-4 py-2 text-sm hover:bg-intel/90"
              >
                Open Investigation
              </button>
              <button
                onClick={() => setDetail(null)}
                className="flex items-center gap-2 rounded border border-ink-300 dark:border-ink-700 px-4 py-2 text-sm text-ink-600 dark:text-ink-300 hover:bg-ink-100 dark:hover:bg-ink-800"
              >
                <ChevronLeft className="h-4 w-4" /> Back to Trails
              </button>
            </div>
          }
        />

        {error && <Panel className="border-signal-rose/40"><p className="text-sm text-signal-rose">{error}</p></Panel>}

        {/* Trail meta */}
        <div className="grid gap-4 md:grid-cols-4">
          <Panel>
            <div className="text-[10px] uppercase text-ink-400 mb-1">Status</div>
            <select
              className="w-full rounded border border-ink-300 dark:border-ink-700 bg-white dark:bg-ink-900 px-2 py-1 text-sm text-ink-900 dark:text-ink-100"
              value={detail.status}
              onChange={e => updateStatus(detail.trailId, e.target.value)}
            >
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Panel>
          <Panel>
            <div className="text-[10px] uppercase text-ink-400 mb-1">Banks Crossed</div>
            <div className="flex gap-1 flex-wrap">
              {detail.banksCrossed.map(b => <Badge key={b} tone="intel">{b}</Badge>)}
            </div>
          </Panel>
          <Panel>
            <div className="text-[10px] uppercase text-ink-400 mb-1">Hops</div>
            <div className="text-2xl font-bold text-ink-900 dark:text-ink-100">{detail.nodes.length}</div>
          </Panel>
          <Panel>
            <div className="text-[10px] uppercase text-ink-400 mb-1">Latest Known Recipient</div>
            <div className="font-mono text-lg text-intel">{detail.lastKnownAccount}</div>
          </Panel>
        </div>

        {/* Interdiction Choke-Point Advisory */}
        {prediction?.interdiction && (
          <Panel className="border-intel/30 bg-intel/5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-intel" />
                <h3 className="font-bold text-sm text-intel uppercase tracking-wide">
                  Choke-Point Interdiction Advisory
                </h3>
              </div>
              <Badge tone="danger">RECOMMENDED INTERCEPTION POINT</Badge>
            </div>
            <div className="grid sm:grid-cols-3 gap-3 text-xs pt-1">
              <div>
                <span className="text-[10px] uppercase font-bold text-ink-400 block">Critical Node</span>
                <span className="font-mono font-bold text-ink-900 dark:text-ink-100 text-base">
                  {prediction.interdiction.choke_point_node}
                </span>
                <span className="text-[10px] text-ink-500 block">Centrality Choke Score: {prediction.interdiction.choke_point_score} / 1.0</span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-[10px] uppercase font-bold text-ink-400 block">What-If Reroute Friction & Impact</span>
                <p className="text-ink-700 dark:text-ink-300">
                  {prediction.interdiction.what_if_reroute?.impact || "Freezing this account imposes significant friction and disrupts downstream liquidation."}
                </p>
              </div>
            </div>
          </Panel>
        )}

        {/* Trail Visualization */}
        <Panel>
          <h3 className="mb-6 text-lg font-semibold text-ink-900 dark:text-ink-100 flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-intel" /> Observed Transaction Trail
          </h3>

          <div className="relative ml-6">
            {detail.nodes.map((node, i) => {
              const isLast = i === detail.nodes.length - 1;
              const isVictim = node.role === "victim";
              return (
                <div key={i} className="relative pb-8 last:pb-0">
                  {/* Vertical line */}
                  {!isLast && (
                    <div className="absolute left-4 top-10 h-full w-0.5 bg-ink-200 dark:bg-ink-700" />
                  )}

                  <div className="flex items-start gap-4">
                    {/* Node marker */}
                    <div className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold ${
                      isVictim
                        ? "border-signal-rose bg-signal-rose/10 text-signal-rose"
                        : isLast
                        ? "border-signal-amber bg-signal-amber/10 text-signal-amber"
                        : "border-intel bg-intel/10 text-intel"
                    }`}>
                      {node.hop}
                    </div>

                    {/* Node content */}
                    <div className="flex-1 rounded-lg border border-ink-200 dark:border-ink-800 bg-ink-50 dark:bg-ink-900/30 p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-mono text-lg font-semibold text-ink-900 dark:text-ink-100">{node.accountRef}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold">[Observed]</span>
                        <Badge tone={isVictim ? "danger" : "intel"}>{node.bankCode}</Badge>
                        <span className="text-[10px] uppercase tracking-wider text-ink-400">{node.role.replace("_", " ")}</span>
                      </div>


                      {!isVictim && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          {node.sourceTransactionId && (
                            <div>
                              <div className="text-[10px] uppercase text-ink-400">Transaction</div>
                              <div className="font-mono text-ink-900 dark:text-ink-100">{node.sourceTransactionId}</div>
                            </div>
                          )}
                          {node.amount !== undefined && (
                            <div>
                              <div className="text-[10px] uppercase text-ink-400">Amount</div>
                              <div className="text-ink-900 dark:text-ink-100">{fmt(node.amount)}</div>
                            </div>
                          )}
                          {node.transactionMode && (
                            <div>
                              <div className="text-[10px] uppercase text-ink-400">Mode</div>
                              <div className="text-ink-900 dark:text-ink-100">{node.transactionMode}</div>
                            </div>
                          )}
                          {node.city && (
                            <div>
                              <div className="text-[10px] uppercase text-ink-400 flex items-center gap-1"><MapPin className="h-3 w-3" /> City</div>
                              <div className="text-ink-900 dark:text-ink-100">{node.city}</div>
                            </div>
                          )}
                          {node.timestamp && (
                            <div>
                              <div className="text-[10px] uppercase text-ink-400 flex items-center gap-1"><Clock className="h-3 w-3" /> Time</div>
                              <div className="text-ink-900 dark:text-ink-100">{new Date(node.timestamp).toLocaleTimeString()}</div>
                            </div>
                          )}
                          <div>
                            <div className="text-[10px] uppercase text-ink-400 flex items-center gap-1"><Building2 className="h-3 w-3" /> Bank</div>
                            <div className="text-ink-900 dark:text-ink-100">{node.bankName}</div>
                          </div>
                        </div>
                      )}

                      {isVictim && (
                        <p className="text-xs text-signal-rose">Origin — victim account from complaint</p>
                      )}
                      {isLast && !isVictim && (
                        <p className="mt-2 text-xs text-signal-amber font-medium">⚑ Latest Known Recipient — no further observed transactions</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        {/* 🔮 Mathematical Prediction Engine Forecast */}
        {loadingPrediction && (
          <Panel className="border-intel/30 bg-intel/5">
            <div className="flex items-center gap-2 text-sm text-intel">
              <Sparkles className="h-4 w-4 animate-spin" />
              <span>Querying Python Mathematical Engine for next-hop & cash-out prediction...</span>
            </div>
          </Panel>
        )}

        {prediction && !loadingPrediction && (
          <Panel className="border-intel/30 bg-intel/5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2 text-ink-900 dark:text-ink-100">
                <Sparkles className="h-5 w-5 text-intel" /> 🔮 Probabilistic Next-Hop Forecast (Python Engine)
              </h3>
              <Badge tone={prediction.is_predicted ? "intel" : "neutral"}>
                {prediction.status || (prediction.is_predicted ? "IN_TRANSIT (PREDICTED)" : "CONFIRMED COMPLETED")}
              </Badge>
            </div>

            {prediction.is_predicted && prediction.predictions ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-3 bg-white dark:bg-ink-900 rounded border border-ink-200 dark:border-ink-800">
                    <div className="text-[10px] uppercase font-bold text-ink-400">Primary Predicted Next Hop</div>
                    <div className="font-mono text-lg font-bold text-intel mt-1">
                      {prediction.predictions.primary_node}
                    </div>
                    <div className="text-xs text-ink-500 mt-1">
                      Likelihood: <span className="font-semibold text-intel">{prediction.predictions.primary_prob}</span>
                    </div>
                  </div>

                  <div className="p-3 bg-white dark:bg-ink-900 rounded border border-ink-200 dark:border-ink-800">
                    <div className="text-[10px] uppercase font-bold text-ink-400">Secondary Route / Drift Risk</div>
                    <div className="font-mono text-sm font-semibold text-signal-amber mt-1">
                      {prediction.predictions.secondary_node || "None"} ({prediction.predictions.secondary_prob || "0%"})
                    </div>
                    <div className="text-xs text-ink-500 mt-1">
                      Unseen Mule Drift: <span className="font-semibold text-signal-rose">{prediction.predictions.novel_drift_risk}</span>
                    </div>
                  </div>

                  <div className="p-3 bg-white dark:bg-ink-900 rounded border border-ink-200 dark:border-ink-800">
                    <div className="text-[10px] uppercase font-bold text-ink-400">Predicted Cash-Out Endpoint</div>
                    <div className="font-bold text-ink-900 dark:text-ink-100 text-base mt-1">
                      {prediction.predictions.predicted_district}
                    </div>
                    <div className="text-xs text-ink-500 mt-1">
                      {prediction.predictions.channel} • Conf: <span className="font-semibold text-intel">{prediction.predictions.location_confidence}</span>
                    </div>
                  </div>
                </div>

                {prediction.plain_text_explanation && (
                  <div className="p-3 rounded bg-white dark:bg-ink-950 text-xs font-mono text-ink-700 dark:text-ink-300 border border-ink-200 dark:border-ink-800">
                    <span className="font-sans font-bold text-intel block mb-1">Tactical Briefing & Guidance:</span>
                    {prediction.plain_text_explanation}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-ink-600 dark:text-ink-300">
                Transaction path is complete. Funds terminated in confirmed withdrawal or destination.
              </p>
            )}
          </Panel>
        )}

        {/* Summary */}
        <Panel>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-ink-400">Trail Summary</h3>
          <p className="text-sm leading-6 text-ink-600 dark:text-ink-300">{detail.summary}</p>
        </Panel>
      </div>
    );
  }

  // ── List View ──────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="SIH 26184 — Multi-Hop Reconstruction"
        title="Money Trail Trajectories & Interdiction"
        description="Cross-bank transaction trails reconstructed from matched complaints, featuring evidence-graded hops, predictive cash-out trajectories, and interdiction choke points."
        actions={<Badge tone="intel">ANVESH Traversal Engine</Badge>}
      />


      {error && <Panel className="border-signal-rose/40"><p className="text-sm text-signal-rose">{error}</p></Panel>}

      <Panel>
        {trails.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-ink-200 dark:border-ink-800 rounded">
            <GitBranch className="h-10 w-10 mx-auto text-ink-300 dark:text-ink-600 mb-3" />
            <p className="text-sm text-ink-500">No trails created yet.</p>
            <p className="text-xs text-ink-400 mt-1">File a complaint, match a transaction, then click "Trace Money".</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-ink-200 dark:border-ink-800 font-mono text-[11px] uppercase tracking-wider text-ink-400">
                <tr>
                  <th className="pb-2 pr-4">Trail</th>
                  <th className="pb-2 pr-4">Complaint</th>
                  <th className="pb-2 pr-4">Victim</th>
                  <th className="pb-2 pr-4">Amount</th>
                  <th className="pb-2 pr-4">Last Known</th>
                  <th className="pb-2 pr-4">Hops</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {trails.map(t => (
                  <tr key={t.id} className="border-b border-ink-100 dark:border-ink-800/80">
                    <td className="py-3 pr-4 font-mono text-xs text-intel">{t.id.slice(0, 8)}…</td>
                    <td className="py-3 pr-4 font-mono">{t.complaintRef}</td>
                    <td className="py-3 pr-4 font-mono">{t.victimAccount}</td>
                    <td className="py-3 pr-4">{fmt(t.startingAmount)}</td>
                    <td className="py-3 pr-4 font-mono text-signal-amber">{t.lastKnownAccount}</td>
                    <td className="py-3 pr-4 text-center">{t.hops}</td>
                    <td className="py-3 pr-4"><Badge tone={statusTone(t.status)}>{t.status}</Badge></td>
                    <td className="py-3">
                      <button onClick={() => openDetail(t.id)} className="rounded bg-intel/10 text-intel px-3 py-1 text-xs font-medium hover:bg-intel/20">
                        View Trail
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
