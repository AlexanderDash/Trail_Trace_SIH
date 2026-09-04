import { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { Badge } from "../components/ui/Badge";
import { PageHeader } from "../components/ui/PageHeader";
import { Panel } from "../components/ui/Panel";

const API = "/api/v1";

interface WatchlistItem {
  id: string;
  account: {
    id: string;
    accountRef: string;
    bank?: { code: string; name: string };
    riskScore: number;
    riskStatus: string;
  };
  status: string;
  reason: string;
  addedAt: string;
}

const statusTone = (s: string) => {
  const l = s.toLowerCase();
  if (l === "monitored" || l === "escalated") return "danger";
  if (l === "under_review") return "warning";
  if (l === "cleared") return "intel";
  return "neutral";
};

export function WatchlistPage() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchWatchlist();
  }, []);

  const fetchWatchlist = async () => {
    setLoading(true);
    const res = await fetch(`${API}/watchlist`);
    const data = await res.json();
    setItems(data);
    setLoading(false);
  };

  const updateStatus = async (accountId: string, status: string) => {
    if (status === "none") {
      await fetch(`${API}/watchlist/${accountId}`, { method: "DELETE" });
    } else {
      await fetch(`${API}/watchlist/${accountId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
    }
    fetchWatchlist();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Monitoring"
        title="Watchlist"
        description="Accounts actively monitored by the system. New transactions involving these accounts will generate alerts."
      />

      <Panel>
        {loading ? (
          <p className="text-sm text-ink-500">Loading...</p>
        ) : items.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-ink-200 dark:border-ink-800 rounded">
            <ShieldAlert className="h-10 w-10 mx-auto text-ink-300 dark:text-ink-600 mb-3" />
            <p className="text-sm text-ink-500">Watchlist is empty.</p>
            <p className="text-xs text-ink-400 mt-1">Add accounts from their risk profile page.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-ink-200 dark:border-ink-800 font-mono text-[11px] uppercase tracking-wider text-ink-400">
                <tr>
                  <th className="pb-2 pr-4">Account</th>
                  <th className="pb-2 pr-4">Bank</th>
                  <th className="pb-2 pr-4">Risk</th>
                  <th className="pb-2 pr-4">Added On</th>
                  <th className="pb-2 pr-4">Reason</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2">Manage</th>
                </tr>
              </thead>
              <tbody>
                {items.map(i => (
                  <tr key={i.id} className="border-b border-ink-100 dark:border-ink-800/80">
                    <td className="py-3 pr-4 font-mono font-medium text-ink-900 dark:text-ink-100">{i.account.accountRef}</td>
                    <td className="py-3 pr-4"><Badge tone="intel">{i.account.bank?.code || "UNK"}</Badge></td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{i.account.riskScore}</span>
                        <Badge tone={i.account.riskStatus === 'critical' ? 'danger' : 'warning'}>{i.account.riskStatus}</Badge>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-xs text-ink-500">{new Date(i.addedAt).toLocaleDateString()}</td>
                    <td className="py-3 pr-4 text-xs max-w-[200px] truncate" title={i.reason}>{i.reason}</td>
                    <td className="py-3 pr-4"><Badge tone={statusTone(i.status)}>{i.status}</Badge></td>
                    <td className="py-3">
                      <select 
                        className="rounded border border-ink-300 dark:border-ink-700 bg-white dark:bg-ink-900 px-2 py-1 text-xs text-ink-900 dark:text-ink-100"
                        value={i.status}
                        onChange={(e) => updateStatus(i.account.id, e.target.value)}
                      >
                        <option value="MONITORED">Monitored</option>
                        <option value="UNDER_REVIEW">Under Review</option>
                        <option value="ESCALATED">Escalated</option>
                        <option value="CLEARED">Cleared</option>
                        <option value="none">Remove</option>
                      </select>
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
