import { useEffect, useState } from "react";
import {
  FileText,
  Plus,
  Search,
  CheckCircle,
  XCircle,
  GitBranch,
} from "lucide-react";
import { Badge } from "../components/ui/Badge";
import { PageHeader } from "../components/ui/PageHeader";
import { Panel } from "../components/ui/Panel";

const API = "/api/v1";

interface Complaint {
  id: string;
  complaintRef: string;
  victimAccount?: { accountRef: string };
  amount: number;
  timestamp: string;
  transactionMode: string | null;
  description: string | null;
  investigationStatus: string;
  matchedTransaction?: {
    id: string;
    sourceTransactionId: string;
    bank: { name: string; code: string };
  } | null;
  trails?: { id: string }[];
  createdAt: string;
}

interface Candidate {
  transactionId: string;
  sourceTransactionId: string;
  bankName: string;
  senderAccountRef: string;
  receiverAccountRef: string;
  amount: number;
  timestamp: string;
  transactionMode: string | null;
  city: string | null;
  confidence: number;
  reasons: string[];
}


const statusTone = (s: string): "neutral" | "intel" | "warning" | "danger" => {
  if (s === "MATCHED") return "intel";
  if (s === "NEW") return "warning";
  if (s === "NO_MATCH") return "danger";
  return "neutral";
};

export function ComplaintsPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [imports, setImports] = useState<any[]>([]);
  const [showImports, setShowImports] = useState(false);

  useEffect(() => {
    fetchComplaints();
    fetchImports();
  }, []);

  const fetchComplaints = async () => {
    try {
      const res = await fetch(`${API}/complaints`);
      if (!res.ok) throw new Error("Failed to load complaints");
      const data = await res.json();
      setComplaints(data);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const fetchImports = async () => {
    try {
      const res = await fetch(`${API}/complaints/imports`);
      if (res.ok) {
        const data = await res.json();
        setImports(data);
      }
    } catch (e) {
      // Non-blocking
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API}/complaints/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Upload failed");
      
      // We start polling for new complaints to show up
      setFile(null);
      setShowImports(true);
      fetchImports();
      // Poll a few times
      let attempts = 0;
      const interval = setInterval(() => {
        fetchComplaints();
        fetchImports();
        attempts++;
        if (attempts > 5) clearInterval(interval);
      }, 2000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleFindCandidates = async (id: string) => {
    setSelectedId(id);
    setCandidates([]);
    setLoading(true);
    try {
      const res = await fetch(`${API}/complaints/${id}/candidates`);
      const data = await res.json();
      setCandidates(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmMatch = async (complaintId: string, transactionId: string, confidence: number) => {
    try {
      const res = await fetch(`${API}/complaints/${complaintId}/match`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId, confidence }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSelectedId(null);
      setCandidates([]);
      fetchComplaints();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleStartTrail = async (complaintId: string) => {
    try {
      const res = await fetch(`${API}/trails`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ complaintId }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      window.location.href = "/trails";
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleCreateInvestigation = async (complaintId: string) => {
    try {
      const res = await fetch(`${API}/investigations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ complaintId }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      window.location.href = `/investigations/${data.id}`;
    } catch (e: any) {
      setError(e.message);
    }
  };

  const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Cybercrime intake"
        title="Complaints"
        description="Create complaints, match them to transactions in the normalized ledger, then start tracing the money."
        actions={
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 rounded-lg bg-intel px-4 py-2 text-sm font-medium text-white hover:bg-intel/90 transition-colors"
          >
            <Plus className="h-4 w-4" /> Create Complaint
          </button>
        }
      />

      {error && (
        <Panel className="border-signal-rose/40">
          <p className="text-sm text-signal-rose">{error}</p>
        </Panel>
      )}

      {/* ── Import Complaints Form ─────────────────────────────────── */}
      {showForm && (
        <Panel>
          <h3 className="mb-4 text-lg font-semibold text-ink-900 dark:text-ink-100 flex items-center gap-2">
            <FileText className="h-5 w-5 text-intel" /> Cybercrime Complaint Data
          </h3>
          <p className="text-sm text-ink-600 dark:text-ink-300 mb-4">
            Upload complaint records supplied by the investigation authority. Supported fields: Complaint ID, Complaint Date, Victim Account, Complaint Description, Amount Lost, Transaction Mode, City, Suspected Transaction ID, Status.
          </p>
          <div className="flex flex-col gap-4 max-w-md">
            <div>
              <input
                type="file"
                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-intel file:text-white hover:file:bg-intel/90"
              />
            </div>
            <div className="flex gap-3 mt-2">
              <button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="rounded bg-intel px-4 py-2 text-sm font-medium text-white hover:bg-intel/90 disabled:opacity-50"
              >
                {uploading ? "Importing..." : "Import Complaints"}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="rounded border border-ink-300 dark:border-ink-700 px-4 py-2 text-sm text-ink-600 dark:text-ink-300 hover:bg-ink-100 dark:hover:bg-ink-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </Panel>
      )}

      {/* ── Import Status ─────────────────────────────────────────── */}
      {showImports && imports.length > 0 && (
        <Panel>
          <h3 className="mb-4 text-sm font-semibold text-ink-900 dark:text-ink-100 flex items-center gap-2">
            Recent Imports
          </h3>
          <div className="space-y-2">
             {imports.map((imp) => (
               <div key={imp.id} className="flex items-center justify-between p-3 border border-ink-200 dark:border-ink-800 rounded text-sm bg-ink-50 dark:bg-ink-900/30">
                 <div>
                   <div className="font-mono">{imp.fileName}</div>
                   <div className="text-xs text-ink-500 mt-1">Processed: {new Date(imp.createdAt).toLocaleString()}</div>
                 </div>
                 <div className="text-right">
                   <Badge tone={imp.status === "COMPLETED" ? "intel" : imp.status === "FAILED" ? "danger" : "warning"}>{imp.status}</Badge>
                   {imp.status === "COMPLETED" && (
                     <div className="text-xs text-ink-500 mt-1">Imported: {imp.importedCount} / {imp.rowCount}</div>
                   )}
                 </div>
               </div>
             ))}
          </div>
          <button onClick={() => setShowImports(false)} className="mt-4 text-xs text-ink-500 hover:text-ink-700">Hide</button>
        </Panel>
      )}

      {/* ── Complaints List ───────────────────────────────────────── */}
      <Panel>
        <h3 className="mb-4 text-lg font-semibold text-ink-900 dark:text-ink-100 flex items-center gap-2">
          <FileText className="h-5 w-5 text-intel" /> Filed Complaints
        </h3>
        {complaints.length === 0 ? (
          <p className="text-sm text-ink-500 italic text-center py-8 border border-dashed border-ink-200 dark:border-ink-800 rounded">
            No complaints filed yet. Click "Create Complaint" above.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-ink-200 dark:border-ink-800 font-mono text-[11px] uppercase tracking-wider text-ink-400">
                <tr>
                  <th className="pb-2 pr-4">ID</th>
                  <th className="pb-2 pr-4">Victim</th>
                  <th className="pb-2 pr-4">Amount</th>
                  <th className="pb-2 pr-4">Mode</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2 pr-4">Match</th>
                  <th className="pb-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {complaints.map(c => (
                  <tr key={c.id} className="border-b border-ink-100 dark:border-ink-800/80">
                    <td className="py-3 pr-4 font-mono text-intel">{c.complaintRef}</td>
                    <td className="py-3 pr-4 font-mono">{c.victimAccount?.accountRef}</td>
                    <td className="py-3 pr-4">{fmt(Number(c.amount))}</td>
                    <td className="py-3 pr-4">{c.transactionMode}</td>
                    <td className="py-3 pr-4"><Badge tone={statusTone(c.investigationStatus)}>{c.investigationStatus}</Badge></td>
                    <td className="py-3 pr-4 text-xs">
                      {c.matchedTransaction ? (
                        <span className="text-emerald-600 dark:text-emerald-400">{c.matchedTransaction.sourceTransactionId} ({c.matchedTransaction.bank.code})</span>
                      ) : (
                        <span className="text-ink-400">—</span>
                      )}
                    </td>
                    <td className="py-3 flex gap-2">
                      {c.investigationStatus === "NEW" && (
                        <button onClick={() => handleFindCandidates(c.id)} className="flex items-center gap-1 rounded bg-ink-200 dark:bg-ink-800 px-3 py-1 text-xs font-medium hover:bg-ink-300 dark:hover:bg-ink-700 text-ink-900 dark:text-ink-100">
                          <Search className="h-3 w-3" /> Find Match
                        </button>
                      )}
                      {c.investigationStatus === "MATCHED" && (
                        <>
                          <button 
                            onClick={() => {
                              if (c.trails && c.trails.length > 0) {
                                window.location.href = `/trails?trailId=${c.trails[0].id}`;
                              } else {
                                handleStartTrail(c.id);
                              }
                            }} 
                            className="flex items-center gap-1 rounded bg-ink-200 dark:bg-ink-800 px-3 py-1 text-xs font-medium hover:bg-ink-300 dark:hover:bg-ink-700 text-ink-900 dark:text-ink-100"
                          >
                            <GitBranch className="h-3 w-3" /> {c.trails && c.trails.length > 0 ? "View Trail" : "Trace Money"}
                          </button>
                          <button onClick={() => handleCreateInvestigation(c.id)} className="flex items-center gap-1 rounded bg-intel/10 text-intel px-3 py-1 text-xs font-medium hover:bg-intel/20">
                            <Plus className="h-3 w-3" /> Create Investigation
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* ── Candidate Matches ─────────────────────────────────────── */}
      {selectedId && (
        <Panel>
          <h3 className="mb-4 text-lg font-semibold text-ink-900 dark:text-ink-100 flex items-center gap-2">
            <Search className="h-5 w-5 text-intel" /> Candidate Matches
          </h3>
          {loading ? (
            <p className="text-sm text-ink-500">Searching transactions…</p>
          ) : candidates.length === 0 ? (
            <div className="text-center py-6 border border-dashed border-ink-200 dark:border-ink-800 rounded">
              <XCircle className="h-8 w-8 mx-auto text-signal-rose mb-2" />
              <p className="text-sm text-ink-500">No matching transactions found in the imported datasets.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {candidates.map((c, idx) => (
                <div key={c.transactionId} className="rounded-lg border border-ink-200 dark:border-ink-800 p-4 bg-ink-50 dark:bg-ink-900/30">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className="text-xs font-mono text-ink-400">#{idx + 1}</span>
                      <span className="ml-2 font-semibold text-ink-900 dark:text-ink-100">{c.sourceTransactionId}</span>
                      <Badge tone="intel">{c.bankName}</Badge>
                    </div>
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${c.confidence >= 80 ? "text-emerald-600 dark:text-emerald-400" : c.confidence >= 50 ? "text-signal-amber" : "text-signal-rose"}`}>
                        {c.confidence}%
                      </div>
                      <div className="text-[10px] uppercase tracking-wider text-ink-400">confidence</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
                    <div>
                      <div className="text-[10px] uppercase text-ink-400">From</div>
                      <div className="font-mono text-ink-900 dark:text-ink-100">{c.senderAccountRef}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase text-ink-400">To</div>
                      <div className="font-mono text-ink-900 dark:text-ink-100">{c.receiverAccountRef}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase text-ink-400">Amount</div>
                      <div className="text-ink-900 dark:text-ink-100">{fmt(c.amount)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase text-ink-400">Mode</div>
                      <div className="text-ink-900 dark:text-ink-100">{c.transactionMode ?? "—"}</div>
                    </div>
                  </div>

                  <div className="mb-3 space-y-1">
                    {c.reasons.map((r, i) => (
                      <div key={i} className={`text-xs ${r.startsWith("✓") ? "text-emerald-600 dark:text-emerald-400" : r.startsWith("⚠") ? "text-signal-amber" : "text-signal-rose"}`}>
                        {r}
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => handleConfirmMatch(selectedId, c.transactionId, c.confidence)}
                    className="flex items-center gap-2 rounded bg-emerald-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                  >
                    <CheckCircle className="h-3 w-3" /> Confirm This Match
                  </button>
                </div>
              ))}
            </div>
          )}
          <button onClick={() => { setSelectedId(null); setCandidates([]); }} className="mt-4 text-xs text-ink-500 hover:text-ink-700 dark:hover:text-ink-300">Close</button>
        </Panel>
      )}
    </div>
  );
}
