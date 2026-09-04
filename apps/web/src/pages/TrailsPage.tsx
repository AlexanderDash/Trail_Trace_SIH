import { useEffect, useState } from "react";
import {
  GitBranch,
  Building2,
  ChevronLeft,
  Clock,
  MapPin,
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
        eyebrow="Money trail investigations"
        title="Trails"
        description="Cross-bank transaction trails traced from matched complaints. Each trail follows funds through accounts across bank boundaries."
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
