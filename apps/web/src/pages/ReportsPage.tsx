import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { 
  FileText, 
  Download, 
  Briefcase, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  RefreshCw,
  Search,
  Layers,
  X
} from "lucide-react";
import { Badge } from "../components/ui/Badge";
import { PageHeader } from "../components/ui/PageHeader";
import { Panel } from "../components/ui/Panel";
import { StatCard } from "../components/ui/StatCard";

const API = "/api/v1";

interface CaseReportItem {
  id: string;
  caseNumber: string;
  title: string;
  status: string;
  priority: string;
  description?: string;
  createdAt: string;
  primaryComplaintRef: string;
  totalDisputedAmount: number;
  victimAccount: string;
  matchedTransactionId?: string;
  findingsCount: number;
  notesCount: number;
  evidenceCount: number;
  trailsCount: number;
  pdfUrl: string;
}

interface ReportSummary {
  totalCases: number;
  openCases: number;
  closedCases: number;
  findingsCount: number;
  totalDisputedAmount: number;
}

export function ReportsPage() {
  const [reports, setReports] = useState<CaseReportItem[]>([]);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [previewCase, setPreviewCase] = useState<CaseReportItem | null>(null);

  const fetchReportsData = async () => {
    setLoading(true);
    try {
      const [reportsRes, summaryRes] = await Promise.all([
        fetch(`${API}/reports`),
        fetch(`${API}/reports/summary`),
      ]);

      if (reportsRes.ok) {
        const data = await reportsRes.json();
        setReports(data);
      }

      if (summaryRes.ok) {
        const sumData = await summaryRes.json();
        setSummary(sumData);
      }
    } catch (err) {
      console.error("Failed to load reports data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportsData();
  }, []);

  const downloadPdf = async (report: CaseReportItem) => {
    setDownloadingId(report.id);
    try {
      const res = await fetch(`${API}/reports/${report.id}/pdf`);
      if (!res.ok) throw new Error("Failed to generate PDF");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ANVESH_Investigation_${report.caseNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert(`Could not download report: ${err.message}`);
    } finally {
      setDownloadingId(null);
    }
  };

  const filteredReports = reports.filter((r) => {
    const matchesSearch =
      r.caseNumber.toLowerCase().includes(search.toLowerCase()) ||
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.primaryComplaintRef.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === "ALL" || r.status.toUpperCase() === statusFilter.toUpperCase();

    return matchesSearch && matchesStatus;
  });

  const priorityTone = (p: string) => {
    switch (p.toUpperCase()) {
      case "CRITICAL": return "danger";
      case "HIGH": return "warning";
      case "MEDIUM": return "intel";
      default: return "neutral";
    }
  };

  const statusTone = (s: string) => {
    switch (s.toUpperCase()) {
      case "CLOSED": return "neutral";
      case "IN_PROGRESS": return "warning";
      default: return "intel";
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="SIH 26184 — Forensic Evidence Reports"
        title="ANVESH Investigation & Interdiction Dossiers"
        description="Audit-ready forensic case summaries compiling multi-hop financial trails, behavioral risk profiles, STKDE cash-out surfaces, and choke-point interdiction advisories into exportable PDF reports."
        actions={<Badge tone="intel">ANVESH Forensic PDF Engine</Badge>}
      />


      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Case Files"
          value={summary ? summary.totalCases : reports.length}
          hint="Investigative dossiers registered"
          icon={Briefcase}
          tone="default"
        />
        <StatCard
          label="Total Loss Tracked"
          value={summary ? `₹${(summary.totalDisputedAmount / 100000).toFixed(1)}L` : "₹0"}
          hint="Disputed financial cybercrime value"
          icon={Layers}
          tone="intel"
        />
        <StatCard
          label="Active Inquiries"
          value={summary ? summary.openCases : 0}
          hint="Cases pending resolution"
          icon={AlertCircle}
          tone="warning"
        />
        <StatCard
          label="Formal Findings Logged"
          value={summary ? summary.findingsCount : 0}
          hint="Forensic observations and evidence"
          icon={CheckCircle2}
          tone="default"
        />
      </div>

      {/* Filters and Search Bar */}
      <Panel className="p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" size={18} />
            <input
              type="text"
              placeholder="Search by case number, title, or complaint reference..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-ink-200 bg-white py-2 pl-10 pr-4 text-sm text-ink-800 placeholder-ink-400 focus:border-intel focus:outline-none focus:ring-1 focus:ring-intel dark:border-ink-700 dark:bg-ink-900 dark:text-ink-100"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-800 focus:border-intel focus:outline-none dark:border-ink-700 dark:bg-ink-900 dark:text-ink-100"
            >
              <option value="ALL">All Case Statuses</option>
              <option value="OPEN">Open Only</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="CLOSED">Closed Only</option>
            </select>

            <button
              onClick={fetchReportsData}
              className="flex items-center gap-1.5 rounded-lg border border-ink-200 bg-ink-50 px-3 py-2 text-xs font-medium text-ink-600 hover:bg-ink-100 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-300"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>
      </Panel>

      {/* Reports Listing */}
      <Panel className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-ink-200 bg-ink-50/50 text-xs font-semibold uppercase tracking-wider text-ink-500 dark:border-ink-800 dark:bg-ink-900/50 dark:text-ink-400">
              <tr>
                <th className="px-4 py-3">Case ID</th>
                <th className="px-4 py-3">Investigation Title</th>
                <th className="px-4 py-3">Complaint Reference</th>
                <th className="px-4 py-3 text-right">Disputed Value</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-center">Intelligence Elements</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-200 dark:divide-ink-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-ink-400">
                    <RefreshCw className="mx-auto mb-2 animate-spin" size={24} />
                    Compiling available intelligence dossiers...
                  </td>
                </tr>
              ) : filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-ink-400">
                    <FileText className="mx-auto mb-2 opacity-50" size={32} />
                    <p className="font-medium text-ink-700 dark:text-ink-300">No Investigation Reports Available</p>
                    <p className="mt-1 text-xs">
                      Create an investigation from the Complaints page to generate structured forensic dossiers.
                    </p>
                    <Link
                      to="/complaints"
                      className="mt-3 inline-block rounded-lg bg-intel px-3 py-1.5 text-xs font-medium text-white hover:bg-intel/90"
                    >
                      View Complaints
                    </Link>
                  </td>
                </tr>
              ) : (
                filteredReports.map((r) => (
                  <tr key={r.id} className="hover:bg-ink-50/50 dark:hover:bg-ink-800/30">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-ink-900 dark:text-ink-100">
                      {r.caseNumber}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-ink-900 dark:text-ink-100">{r.title}</div>
                      <div className="text-xs text-ink-400">Opened {new Date(r.createdAt).toLocaleDateString()}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-ink-700 dark:text-ink-300">
                      {r.primaryComplaintRef}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-ink-900 dark:text-ink-100">
                      ₹{r.totalDisputedAmount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={priorityTone(r.priority)}>{r.priority}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={statusTone(r.status)}>{r.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2 text-xs text-ink-500">
                        <span title="Findings">{r.findingsCount} findings</span>
                        <span>•</span>
                        <span title="Notes">{r.notesCount} notes</span>
                        <span>•</span>
                        <span title="Evidence">{r.evidenceCount} evidence</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setPreviewCase(r)}
                          className="rounded border border-ink-200 bg-white px-2 py-1 text-xs font-medium text-ink-700 hover:bg-ink-100 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-200"
                        >
                          Summary
                        </button>
                        <button
                          onClick={() => downloadPdf(r)}
                          disabled={downloadingId === r.id}
                          className="flex items-center gap-1 rounded bg-intel px-2.5 py-1 text-xs font-medium text-white hover:bg-intel/90 disabled:opacity-50"
                        >
                          {downloadingId === r.id ? (
                            <>
                              <RefreshCw className="animate-spin" size={12} />
                              Generating...
                            </>
                          ) : (
                            <>
                              <Download size={12} />
                              PDF Report
                            </>
                          )}
                        </button>
                        <Link
                          to={`/investigations/${r.id}`}
                          className="rounded p-1 text-ink-400 hover:text-ink-700 dark:hover:text-ink-200"
                          title="Open in Investigation Workspace"
                        >
                          <ExternalLink size={14} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Case Executive Summary Modal */}
      {previewCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl border border-ink-200 bg-white p-6 shadow-2xl dark:border-ink-700 dark:bg-ink-900">
            <div className="flex items-start justify-between border-b border-ink-200 pb-4 dark:border-ink-700">
              <div>
                <div className="flex items-center gap-2">
                  <Badge tone={priorityTone(previewCase.priority)}>{previewCase.priority}</Badge>
                  <span className="font-mono text-xs text-ink-400">{previewCase.caseNumber}</span>
                </div>
                <h3 className="mt-1 text-lg font-bold text-ink-900 dark:text-ink-50">
                  {previewCase.title}
                </h3>
              </div>
              <button
                onClick={() => setPreviewCase(null)}
                className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700 dark:hover:bg-ink-800"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-sm">
              <div className="rounded-lg bg-ink-50 p-4 dark:bg-ink-800/40">
                <p className="text-xs text-ink-400">Case Description</p>
                <p className="mt-1 text-ink-800 dark:text-ink-200">
                  {previewCase.description || "No formal summary description provided."}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-ink-400">Victim Account</span>
                  <p className="font-mono font-medium text-ink-800 dark:text-ink-200">{previewCase.victimAccount}</p>
                </div>
                <div>
                  <span className="text-xs text-ink-400">Total Disputed Value</span>
                  <p className="font-mono font-bold text-ink-900 dark:text-ink-50">
                    ₹{previewCase.totalDisputedAmount.toLocaleString()}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-ink-400">Recorded Observations</span>
                  <p className="font-semibold text-ink-800 dark:text-ink-200">
                    {previewCase.findingsCount} Formal Finding(s)
                  </p>
                </div>
                <div>
                  <span className="text-xs text-ink-400">Audit Trail Hops</span>
                  <p className="font-semibold text-ink-800 dark:text-ink-200">
                    {previewCase.trailsCount} Active Trail(s)
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-intel/30 bg-intel/5 p-3 text-xs text-intel dark:text-intel/90">
                <p className="font-semibold">Formal Intelligence Dossier Available</p>
                <p className="mt-0.5">
                  The generated PDF incorporates BFS cross-bank money trail graphs, behavioural risk indices, and hot-spot geospatial density clustering.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setPreviewCase(null)}
                className="rounded-lg border border-ink-200 px-4 py-2 text-xs font-medium text-ink-700 hover:bg-ink-50 dark:border-ink-700 dark:text-ink-200"
              >
                Close
              </button>
              <button
                onClick={() => {
                  downloadPdf(previewCase);
                  setPreviewCase(null);
                }}
                className="flex items-center gap-1.5 rounded-lg bg-intel px-4 py-2 text-xs font-medium text-white hover:bg-intel/90"
              >
                <Download size={14} />
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
