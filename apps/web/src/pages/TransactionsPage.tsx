import { useEffect, useState } from "react";
import { 
  Search, 
  Wallet, 
  ArrowRight, 
  Building2, 
  Layers, 
  ShieldAlert, 
  X, 
  RefreshCw,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { Badge } from "../components/ui/Badge";
import { PageHeader } from "../components/ui/PageHeader";
import { Panel } from "../components/ui/Panel";
import { StatCard } from "../components/ui/StatCard";

const API = "/api/v1";

interface TransactionItem {
  id: string;
  sourceTransactionId: string;
  bank: { id: string; code: string; name: string };
  senderAccount: { id: string; accountRef: string; riskScore: number; riskStatus: string };
  receiverAccount: { id: string; accountRef: string; riskScore: number; riskStatus: string };
  amount: number | string;
  transactionMode?: string;
  locationCity?: string;
  timestamp: string;
  _count?: {
    matchedComplaints: number;
    trailConnections: number;
  };
}

interface TransactionStats {
  totalCount: number;
  totalVolume: number;
  modes: { mode: string; count: number }[];
  banks: { bankCode: string; count: number }[];
}

export function TransactionsPage() {
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [stats, setStats] = useState<TransactionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedMode, setSelectedMode] = useState("");
  const [selectedBank, setSelectedBank] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedTxn, setSelectedTxn] = useState<any | null>(null);

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API}/transactions/stats`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Failed to load stats", err);
    }
  };

  const fetchTransactions = async (pageNumber = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("limit", "20");
      params.append("offset", String((pageNumber - 1) * 20));
      if (search.trim()) params.append("search", search.trim());
      if (selectedMode) params.append("mode", selectedMode);
      if (selectedBank) params.append("bankId", selectedBank);

      const res = await fetch(`${API}/transactions?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.items || []);
        setTotalPages(data.totalPages || 1);
        setTotalCount(data.total || 0);
        setPage(data.page || 1);
      }
    } catch (err) {
      console.error("Failed to load transactions", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTransactions(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [search, selectedMode, selectedBank]);

  const viewDetails = async (id: string) => {
    try {
      const res = await fetch(`${API}/transactions/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedTxn(data);
      }
    } catch (err) {
      console.error("Failed to load details", err);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transaction Ledger"
        description="Unified multi-bank transaction registry normalized from uploaded institutional bank files. Cross-correlates account flows across banking boundaries."
      />

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Ledger Records"
          value={stats ? stats.totalCount.toLocaleString() : totalCount.toLocaleString()}
          hint="Normalized transactions ingested"
          icon={Wallet}
          tone="default"
        />
        <StatCard
          label="Cumulative Volume"
          value={stats ? `₹${(stats.totalVolume / 100000).toFixed(1)}L` : "₹0"}
          hint="Total transactional liquidity mapped"
          icon={Layers}
          tone="intel"
        />
        <StatCard
          label="Reporting Banks"
          value={stats ? stats.banks.length : 0}
          hint="Heterogeneous financial institutions"
          icon={Building2}
          tone="default"
        />
        <StatCard
          label="Payment Channels"
          value={stats ? stats.modes.length : 0}
          hint="UPI, NEFT, IMPS, RTGS, Cash"
          icon={ShieldAlert}
          tone="warning"
        />
      </div>

      {/* Filter and Search Bar */}
      <Panel className="p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" size={18} />
            <input
              type="text"
              placeholder="Search by transaction ID, account number, or city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-ink-200 bg-white py-2 pl-10 pr-4 text-sm text-ink-800 placeholder-ink-400 focus:border-intel focus:outline-none focus:ring-1 focus:ring-intel dark:border-ink-700 dark:bg-ink-900 dark:text-ink-100"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedMode}
              onChange={(e) => setSelectedMode(e.target.value)}
              className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-800 focus:border-intel focus:outline-none dark:border-ink-700 dark:bg-ink-900 dark:text-ink-100"
            >
              <option value="">All Channels / Modes</option>
              {stats?.modes.map((m) => (
                <option key={m.mode} value={m.mode}>
                  {m.mode} ({m.count})
                </option>
              ))}
            </select>

            <button
              onClick={() => {
                setSearch("");
                setSelectedMode("");
                setSelectedBank("");
                fetchTransactions(1);
              }}
              className="flex items-center gap-1.5 rounded-lg border border-ink-200 bg-ink-50 px-3 py-2 text-xs font-medium text-ink-600 hover:bg-ink-100 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-300"
            >
              <RefreshCw size={14} />
              Reset Filters
            </button>
          </div>
        </div>
      </Panel>

      {/* Transactions Table */}
      <Panel className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-ink-200 bg-ink-50/50 text-xs font-semibold uppercase tracking-wider text-ink-500 dark:border-ink-800 dark:bg-ink-900/50 dark:text-ink-400">
              <tr>
                <th className="px-4 py-3">Txn Reference</th>
                <th className="px-4 py-3">Bank</th>
                <th className="px-4 py-3">Fund Transfer Flow</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Channel</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Intelligence</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-200 dark:divide-ink-800">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-ink-400">
                    <RefreshCw className="mx-auto mb-2 animate-spin" size={24} />
                    Querying normalized ledger...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-ink-400">
                    No transactions found matching the specified filters.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-ink-50/50 dark:hover:bg-ink-800/30">
                    <td className="px-4 py-3 font-mono text-xs font-medium text-ink-900 dark:text-ink-100">
                      {tx.sourceTransactionId}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone="neutral">{tx.bank?.code || "BANK"}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 font-mono text-xs">
                        <span className="truncate max-w-[130px]" title={tx.senderAccount?.accountRef}>
                          {tx.senderAccount?.accountRef || "UNKNOWN"}
                        </span>
                        <ArrowRight size={12} className="text-ink-400 shrink-0" />
                        <span className="truncate max-w-[130px] font-semibold text-ink-900 dark:text-ink-100" title={tx.receiverAccount?.accountRef}>
                          {tx.receiverAccount?.accountRef || "UNKNOWN"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-ink-900 dark:text-ink-100">
                      ₹{Number(tx.amount).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone="intel">{tx.transactionMode || "UPI"}</Badge>
                    </td>
                    <td className="px-4 py-3 text-ink-600 dark:text-ink-300">
                      {tx.locationCity || "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-ink-500 dark:text-ink-400">
                      {new Date(tx.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {(tx._count?.matchedComplaints || 0) > 0 && (
                          <Badge tone="danger">Complaint Matched</Badge>
                        )}
                        {(tx._count?.trailConnections || 0) > 0 && (
                          <Badge tone="warning">In Trail Graph</Badge>
                        )}
                        {!(tx._count?.matchedComplaints || 0) && !(tx._count?.trailConnections || 0) && (
                          <span className="text-xs text-ink-400">Normal</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => viewDetails(tx.id)}
                        className="rounded border border-ink-200 bg-white px-2.5 py-1 text-xs font-medium text-ink-700 hover:bg-ink-100 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-200"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex items-center justify-between border-t border-ink-200 bg-ink-50/50 px-4 py-3 text-xs text-ink-500 dark:border-ink-800 dark:bg-ink-900/50 dark:text-ink-400">
          <div>
            Showing <span className="font-semibold text-ink-800 dark:text-ink-200">{transactions.length}</span> of{" "}
            <span className="font-semibold text-ink-800 dark:text-ink-200">{totalCount}</span> entries
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => fetchTransactions(page - 1)}
              className="flex items-center gap-1 rounded border border-ink-200 px-2.5 py-1 font-medium disabled:opacity-40 dark:border-ink-700"
            >
              <ChevronLeft size={14} /> Prev
            </button>
            <span>
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => fetchTransactions(page + 1)}
              className="flex items-center gap-1 rounded border border-ink-200 px-2.5 py-1 font-medium disabled:opacity-40 dark:border-ink-700"
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </Panel>

      {/* Transaction Detail Modal */}
      {selectedTxn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-ink-200 bg-white p-6 shadow-2xl dark:border-ink-700 dark:bg-ink-900">
            <div className="flex items-start justify-between border-b border-ink-200 pb-4 dark:border-ink-700">
              <div>
                <h3 className="text-lg font-bold text-ink-900 dark:text-ink-50">
                  Transaction #{selectedTxn.sourceTransactionId}
                </h3>
                <p className="text-xs text-ink-500">
                  Recorded from {selectedTxn.bank?.name} ({selectedTxn.bank?.code})
                </p>
              </div>
              <button
                onClick={() => setSelectedTxn(null)}
                className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700 dark:hover:bg-ink-800"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-5 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4 rounded-lg bg-ink-50 p-4 dark:bg-ink-800/40">
                <div>
                  <span className="text-xs text-ink-400">Transfer Amount</span>
                  <p className="font-mono text-xl font-bold text-ink-900 dark:text-ink-50">
                    ₹{Number(selectedTxn.amount).toLocaleString()}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-ink-400">Payment Mode</span>
                  <p className="font-semibold text-ink-800 dark:text-ink-200">
                    {selectedTxn.transactionMode || "UPI"}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-ink-400">Sender Account</span>
                  <p className="font-mono font-medium text-ink-800 dark:text-ink-200">
                    {selectedTxn.senderAccount?.accountRef}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-ink-400">Receiver Account</span>
                  <p className="font-mono font-medium text-ink-800 dark:text-ink-200">
                    {selectedTxn.receiverAccount?.accountRef}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-ink-400">Execution City</span>
                  <p className="font-medium text-ink-800 dark:text-ink-200">
                    {selectedTxn.locationCity || "Not Provided"}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-ink-400">Ledger Timestamp</span>
                  <p className="font-mono text-xs text-ink-800 dark:text-ink-200">
                    {new Date(selectedTxn.timestamp).toISOString()}
                  </p>
                </div>
              </div>

              {/* Matched Complaints */}
              {selectedTxn.matchedComplaints?.length > 0 && (
                <div className="rounded-lg border border-signal-rose/30 bg-signal-rose/5 p-3">
                  <h4 className="text-xs font-semibold text-signal-rose uppercase tracking-wider">
                    Linked Cybercrime Complaint
                  </h4>
                  {selectedTxn.matchedComplaints.map((c: any) => (
                    <div key={c.id} className="mt-1 flex items-center justify-between text-xs">
                      <span>Complaint Ref: <span className="font-mono font-bold">{c.complaintRef}</span></span>
                      <span>Disputed: ₹{Number(c.amount).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Raw Payload Preview if available */}
              {selectedTxn.rawPayload && (
                <div>
                  <span className="text-xs font-semibold text-ink-400 uppercase tracking-wider">
                    Raw Bank Ingestion Payload
                  </span>
                  <pre className="mt-1 max-h-40 overflow-x-auto rounded-lg bg-ink-950 p-3 font-mono text-xs text-ink-200">
                    {JSON.stringify(selectedTxn.rawPayload, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedTxn(null)}
                className="rounded-lg bg-ink-800 px-4 py-2 text-xs font-medium text-white hover:bg-ink-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
