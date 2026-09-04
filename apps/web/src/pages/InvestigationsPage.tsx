import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Briefcase, Search, Plus, Filter } from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { Panel } from "../components/ui/Panel";
import { Badge } from "../components/ui/Badge";

const API = "/api/v1";

interface Investigation {
  id: string;
  caseNumber: string;
  title: string;
  status: string;
  priority: string;
  createdAt: string;
  complaints: any[];
}

const statusTone = (s: string) => {
  if (s === "OPEN" || s === "IN_PROGRESS") return "intel";
  if (s === "ON_HOLD") return "warning";
  if (s === "CLOSED") return "neutral";
  return "neutral";
};

const priorityTone = (p: string) => {
  if (p === "CRITICAL") return "danger";
  if (p === "HIGH") return "warning";
  if (p === "MEDIUM") return "intel";
  return "neutral";
};

export function InvestigationsPage() {
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchInvestigations();
  }, []);

  const fetchInvestigations = async () => {
    try {
      const res = await fetch(`${API}/investigations`);
      const data = await res.json();
      setInvestigations(data);
    } catch (e) {
      console.error(e);
    }
  };

  const filtered = investigations.filter(inv => 
    inv.caseNumber.toLowerCase().includes(search.toLowerCase()) || 
    inv.title.toLowerCase().includes(search.toLowerCase()) ||
    inv.complaints.some(c => c.complaintRef.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Case Management"
        title="Investigations"
        description="Unified workspace for analyzing cybercrime complaints, following money trails, and generating intelligence reports."
        actions={
          <button onClick={() => navigate('/complaints')} className="flex items-center gap-2 rounded bg-intel px-4 py-2 text-sm text-white hover:bg-intel/90">
            <Plus className="h-4 w-4" /> New Investigation
          </button>
        }
      />

      <Panel className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
          <input
            type="text"
            placeholder="Search by case number, title, or complaint ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-ink-300 dark:border-ink-700 bg-white dark:bg-ink-900 pl-10 pr-4 py-2 text-sm text-ink-900 dark:text-ink-100"
          />
        </div>
        <button className="flex items-center gap-2 text-sm text-ink-600 dark:text-ink-300 hover:text-ink-900 dark:hover:text-white">
          <Filter className="h-4 w-4" /> Filters
        </button>
      </Panel>

      <Panel>
        {filtered.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-ink-200 dark:border-ink-800 rounded">
            <Briefcase className="h-10 w-10 mx-auto text-ink-300 dark:text-ink-600 mb-3" />
            <p className="text-sm text-ink-500">No investigations found.</p>
            <p className="text-xs text-ink-400 mt-1">Start by matching a transaction in a complaint.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-ink-200 dark:border-ink-800 font-mono text-[11px] uppercase tracking-wider text-ink-400">
                <tr>
                  <th className="pb-2 pr-4">Case Number</th>
                  <th className="pb-2 pr-4">Title</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2 pr-4">Priority</th>
                  <th className="pb-2 pr-4">Complaint</th>
                  <th className="pb-2 pr-4">Created</th>
                  <th className="pb-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(inv => (
                  <tr key={inv.id} className="border-b border-ink-100 dark:border-ink-800/80">
                    <td className="py-3 pr-4 font-mono font-bold text-intel">
                      <Link to={`/investigations/${inv.id}`}>{inv.caseNumber}</Link>
                    </td>
                    <td className="py-3 pr-4 text-ink-900 dark:text-ink-100">{inv.title}</td>
                    <td className="py-3 pr-4"><Badge tone={statusTone(inv.status)}>{inv.status.replace("_", " ")}</Badge></td>
                    <td className="py-3 pr-4"><Badge tone={priorityTone(inv.priority) as any}>{inv.priority}</Badge></td>
                    <td className="py-3 pr-4 font-mono text-xs">
                      {inv.complaints.map(c => <span key={c.id} className="block">{c.complaintRef}</span>)}
                    </td>
                    <td className="py-3 pr-4 text-xs text-ink-500">{new Date(inv.createdAt).toLocaleDateString()}</td>
                    <td className="py-3 text-right">
                      <Link to={`/investigations/${inv.id}`} className="rounded bg-intel/10 text-intel px-3 py-1 text-xs font-medium hover:bg-intel/20">
                        Open Workspace
                      </Link>
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
