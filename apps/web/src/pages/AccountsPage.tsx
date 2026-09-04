import { useEffect, useState } from "react";
import { Search, ChevronLeft, Activity, GitBranch, ArrowRight, TrendingUp } from "lucide-react";
import { Badge } from "../components/ui/Badge";
import { PageHeader } from "../components/ui/PageHeader";
import { Panel } from "../components/ui/Panel";

const API = "/api/v1";

interface AccountListItem {
  id: string;
  accountRef: string;
  bank?: { code: string; name: string };
  riskScore: number;
  riskStatus: string;
  watchlistStatus: string;
  _count?: { trailNodes: number };
}

interface RiskSignal {
  signalType: string;
  severity: string;
  description: string;
  value: number;
}

interface AccountDetail extends AccountListItem {
  riskProfile?: {
    features: any;
  };
  riskSignals: RiskSignal[];
  recentTransactions: any[];
  trailNodes: any[];
}

const riskTone = (level: string) => {
  const l = level.toLowerCase();
  if (l === "critical") return "danger";
  if (l === "high") return "warning";
  if (l === "medium") return "intel";
  return "neutral";
};

const wlTone = (status: string) => {
  const s = status.toLowerCase();
  if (s === "monitored" || s === "escalated") return "danger";
  if (s === "under_review") return "warning";
  if (s === "cleared") return "intel";
  return "neutral";
};

export function AccountsPage() {
  const [accounts, setAccounts] = useState<AccountListItem[]>([]);
  const [detail, setDetail] = useState<AccountDetail | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async (query = "") => {
    setLoading(true);
    const res = await fetch(`${API}/accounts?search=${query}`);
    const data = await res.json();
    setAccounts(data);
    setLoading(false);
  };

  const loadDetail = async (id: string) => {
    const res = await fetch(`${API}/accounts/${id}`);
    const data = await res.json();
    setDetail(data);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAccounts(search);
  };

  const handleWatchlist = async (status: string) => {
    if (!detail) return;
    if (status === "none") {
      await fetch(`${API}/watchlist/${detail.id}`, { method: "DELETE" });
    } else {
      await fetch(`${API}/watchlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: detail.id, status })
      });
    }
    loadDetail(detail.id);
    fetchAccounts(search); // refresh list
  };

  const reanalyze = async () => {
    if (!detail) return;
    await fetch(`${API}/accounts/${detail.id}/analyze`, { method: "POST" });
    loadDetail(detail.id);
    fetchAccounts(search);
  };

  const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;

  if (detail) {
    const f = detail.riskProfile?.features || {};
    
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Account risk profile"
          title={detail.accountRef}
          description="Behavioural risk signals, watchlist status, and investigation history."
          actions={
            <div className="flex gap-2">
              <a href={`/geospatial?account=${detail.id}`} className="flex items-center gap-2 rounded bg-ink-900 text-white px-4 py-2 text-sm hover:bg-ink-800 dark:bg-ink-100 dark:text-ink-900 dark:hover:bg-white">
                View on Map
              </a>
              <button
                onClick={() => setDetail(null)}
                className="flex items-center gap-2 rounded border border-ink-300 dark:border-ink-700 px-4 py-2 text-sm text-ink-600 dark:text-ink-300 hover:bg-ink-100 dark:hover:bg-ink-800"
              >
                <ChevronLeft className="h-4 w-4" /> Back to Accounts
              </button>
            </div>
          }
        />

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column: Risk & Watchlist */}
          <div className="space-y-6">
            <Panel className="border-t-4 border-t-intel">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-ink-400 mb-1">Risk Score</div>
                  <div className="text-4xl font-bold text-ink-900 dark:text-ink-100">{detail.riskScore}</div>
                  <div className="mt-2"><Badge tone={riskTone(detail.riskStatus)}>{detail.riskStatus}</Badge></div>
                </div>
                <button onClick={reanalyze} className="text-xs text-intel hover:underline flex items-center gap-1">
                  <Activity className="h-3 w-3" /> Re-analyze
                </button>
              </div>

              <div className="pt-4 border-t border-ink-200 dark:border-ink-800">
                <div className="text-[10px] uppercase tracking-wider text-ink-400 mb-2">Watchlist Status</div>
                <div className="flex items-center gap-2 mb-4">
                  <Badge tone={wlTone(detail.watchlistStatus)}>{detail.watchlistStatus || 'NONE'}</Badge>
                </div>
                
                <div className="flex gap-2">
                  {detail.watchlistStatus === "none" ? (
                    <button onClick={() => handleWatchlist("MONITORED")} className="flex-1 bg-signal-rose/10 text-signal-rose border border-signal-rose/20 rounded py-1.5 text-xs font-medium hover:bg-signal-rose/20">
                      Add to Watchlist
                    </button>
                  ) : (
                    <>
                      <select 
                        className="flex-1 rounded border border-ink-300 dark:border-ink-700 bg-white dark:bg-ink-900 px-2 py-1.5 text-xs text-ink-900 dark:text-ink-100"
                        value={detail.watchlistStatus.toUpperCase()}
                        onChange={(e) => handleWatchlist(e.target.value)}
                      >
                        <option value="MONITORED">Monitored</option>
                        <option value="UNDER_REVIEW">Under Review</option>
                        <option value="ESCALATED">Escalated</option>
                        <option value="CLEARED">Cleared</option>
                        <option value="none">Remove</option>
                      </select>
                    </>
                  )}
                </div>
              </div>
            </Panel>

            <Panel>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-ink-400 mb-4">Transaction Summary</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-ink-500">Incoming</span>
                  <span className="font-medium text-ink-900 dark:text-ink-100">{f.incomingCount} ( {fmt(f.incomingAmount || 0)} )</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-500">Outgoing</span>
                  <span className="font-medium text-ink-900 dark:text-ink-100">{f.outgoingCount} ( {fmt(f.outgoingAmount || 0)} )</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-500">Velocity</span>
                  <span className="font-medium text-ink-900 dark:text-ink-100">{(f.transactionVelocity || 0).toFixed(1)} / day</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-500">Counterparties</span>
                  <span className="font-medium text-ink-900 dark:text-ink-100">{f.distinctCounterparties}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-500">Banks Involved</span>
                  <span className="font-medium text-ink-900 dark:text-ink-100">{f.distinctBanks}</span>
                </div>
              </div>
            </Panel>
          </div>

          {/* Right Column: Signals & Activity */}
          <div className="lg:col-span-2 space-y-6">
            <Panel>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-ink-400 mb-4 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> Risk Factors
              </h3>
              
              {detail.riskSignals.length === 0 ? (
                <p className="text-sm text-ink-500 italic">No significant risk factors detected.</p>
              ) : (
                <div className="space-y-4">
                  {detail.riskSignals.map((sig, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-ink-50 dark:bg-ink-800/50">
                      <div className="mt-0.5">
                        <Badge tone={sig.severity === 'CRITICAL' ? 'danger' : sig.severity === 'HIGH' ? 'warning' : 'intel'}>
                          {sig.severity}
                        </Badge>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-ink-900 dark:text-ink-100">{sig.signalType.replace(/_/g, " ")}</div>
                        <div className="text-sm text-ink-600 dark:text-ink-300 mt-1">{sig.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            <Panel>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-ink-400 mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2"><GitBranch className="h-4 w-4" /> Connected Complaint Trails</div>
              </h3>
              {detail.trailNodes.length === 0 ? (
                <p className="text-sm text-ink-500 italic">Account does not appear in any tracked complaint trails.</p>
              ) : (
                <div className="space-y-2">
                  {detail.trailNodes.map((n, i) => (
                    <div key={i} className="flex items-center justify-between text-sm p-2 rounded hover:bg-ink-50 dark:hover:bg-ink-800">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-intel">{n.trail.complaint?.complaintRef || "Unknown"}</span>
                        <span className="text-ink-500 text-xs">Role: {n.role.replace("_", " ")}</span>
                      </div>
                      <a href={`/geospatial?trail=${n.trailId}`} className="text-xs text-intel hover:underline">View Map</a>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            <Panel>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-ink-400 mb-4">Recent Transactions</h3>
              {detail.recentTransactions.length === 0 ? (
                <p className="text-sm text-ink-500 italic">No transactions found.</p>
              ) : (
                <div className="space-y-3">
                  {detail.recentTransactions.map((t, i) => {
                    const isSender = t.senderAccountId === detail.id;
                    return (
                      <div key={i} className="flex items-center justify-between text-sm border-b border-ink-100 dark:border-ink-800 pb-2 last:border-0 last:pb-0">
                        <div className="flex items-center gap-3">
                          <div className={`flex items-center justify-center h-6 w-6 rounded-full ${isSender ? 'bg-signal-rose/10 text-signal-rose' : 'bg-emerald-500/10 text-emerald-600'}`}>
                            {isSender ? <ArrowRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
                          </div>
                          <div>
                            <div className="font-mono text-ink-900 dark:text-ink-100">
                              {isSender ? t.receiverAccount?.accountRef : t.senderAccount?.accountRef}
                            </div>
                            <div className="text-xs text-ink-500">{new Date(t.timestamp).toLocaleString()} • {t.bank?.code}</div>
                          </div>
                        </div>
                        <div className={`font-medium ${isSender ? 'text-ink-900 dark:text-ink-100' : 'text-emerald-600 dark:text-emerald-500'}`}>
                          {isSender ? '-' : '+'}{fmt(Number(t.amount))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Panel>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Intelligence database"
        title="Accounts & Risk"
        description="Search accounts across all bank datasets and view their behavioural risk scores."
      />

      <Panel>
        <form onSubmit={handleSearch} className="flex gap-2 mb-6">
          <input 
            type="text" 
            placeholder="Search account identifier..." 
            className="flex-1 rounded border border-ink-300 dark:border-ink-700 bg-white dark:bg-ink-900 px-3 py-2 text-sm text-ink-900 dark:text-ink-100"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="flex items-center gap-2 rounded bg-intel px-4 py-2 text-sm font-medium text-white hover:bg-intel/90">
            <Search className="h-4 w-4" /> Search
          </button>
        </form>

        {loading ? (
          <p className="text-sm text-ink-500">Loading...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-ink-200 dark:border-ink-800 font-mono text-[11px] uppercase tracking-wider text-ink-400">
                <tr>
                  <th className="pb-2 pr-4">Account</th>
                  <th className="pb-2 pr-4">Bank</th>
                  <th className="pb-2 pr-4">Risk Score</th>
                  <th className="pb-2 pr-4">Level</th>
                  <th className="pb-2 pr-4">Complaint Trails</th>
                  <th className="pb-2 pr-4">Watchlist</th>
                  <th className="pb-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map(a => (
                  <tr key={a.id} className="border-b border-ink-100 dark:border-ink-800/80">
                    <td className="py-3 pr-4 font-mono font-medium text-ink-900 dark:text-ink-100">{a.accountRef}</td>
                    <td className="py-3 pr-4"><Badge tone="intel">{a.bank?.code || "UNK"}</Badge></td>
                    <td className="py-3 pr-4">
                      <div className={`font-bold ${a.riskScore >= 75 ? 'text-signal-rose' : a.riskScore >= 50 ? 'text-signal-amber' : 'text-ink-900 dark:text-ink-100'}`}>
                        {a.riskScore}
                      </div>
                    </td>
                    <td className="py-3 pr-4"><Badge tone={riskTone(a.riskStatus)}>{a.riskStatus}</Badge></td>
                    <td className="py-3 pr-4">{a._count?.trailNodes || 0}</td>
                    <td className="py-3 pr-4">
                      {a.watchlistStatus !== "none" ? <Badge tone={wlTone(a.watchlistStatus)}>{a.watchlistStatus}</Badge> : <span className="text-ink-300">—</span>}
                    </td>
                    <td className="py-3">
                      <button onClick={() => loadDetail(a.id)} className="text-intel hover:underline font-medium text-xs">
                        View Profile
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
