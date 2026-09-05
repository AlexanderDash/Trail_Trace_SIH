import { useEffect, useState, useRef } from "react";
import { Upload, FileText, CheckCircle, XCircle, Settings, Play, RotateCcw } from "lucide-react";
import type { BankRecord } from "@trailtrace/shared";
import { Badge } from "../components/ui/Badge";
import { PageHeader } from "../components/ui/PageHeader";
import { Panel } from "../components/ui/Panel";

interface DataUpload {
  id: string;
  bankId: string;
  bank?: BankRecord;
  fileName: string;
  originalFormat: string;
  status: string;
  rowCount: number;
  ingestedCount: number;
  createdAt: string;
  columnMapping?: Record<string, string>;
}

export function DataSourcesPage() {
  const [sources, setSources] = useState<DataUpload[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [activeFile, setActiveFile] = useState<File | null>(null);

  const [wizardState, setWizardState] = useState<{
    uploadId: string | null;
    columns: string[];
    preview: any[];
    mapping: Record<string, string>;
    validation: any | null;
  }>({
    uploadId: null,
    columns: [],
    preview: [],
    mapping: {},
    validation: null
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSources();
  }, []);

  const fetchSources = async () => {
    try {
      const res = await fetch("/api/v1/ingestion/sources");
      const data = await res.json();
      setSources(data);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setActiveFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!activeFile) return;
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", activeFile);
      
      const res = await fetch("/api/v1/ingestion/upload", {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const autoMapping: Record<string, string> = {};
      for (const col of data.columns) {
        const c = col.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (c === "txnid" || c === "transactionid" || c === "txid") autoMapping[col] = "transactionId";
        else if (c === "time" || c === "timestamp" || c === "txntime" || c === "date") autoMapping[col] = "timestamp";
        else if (c === "fromacc" || c === "sender" || c === "fromaccount" || c === "senderaccount") autoMapping[col] = "senderAccount";
        else if (c === "toacc" || c === "receiver" || c === "toaccount" || c === "receiveraccount" || c === "beneficiary") autoMapping[col] = "receiverAccount";
        else if (c.includes("amount") || c === "amt") autoMapping[col] = "amount";
        else if (c === "txnmode" || c === "mode" || c === "channel") autoMapping[col] = "transactionMode";
        else if (c === "transfertype") autoMapping[col] = "transferType";
        else if (c === "sendertype" || c === "senderaccounttype") autoMapping[col] = "senderAccountType";
        else if (c === "receivertype" || c === "receiveraccounttype") autoMapping[col] = "receiverAccountType";
        else if (c === "city" || c === "location") autoMapping[col] = "city";
      }

      setWizardState({
        uploadId: data.upload.id,
        columns: data.columns,
        preview: data.preview,
        mapping: autoMapping,
        validation: null
      });
      fetchSources();
      setActiveFile(null);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleValidate = async (uploadId: string) => {
    try {
      const res = await fetch(`/api/v1/ingestion/validate/${uploadId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mapping: wizardState.mapping })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      setWizardState(prev => ({ ...prev, validation: data.validation }));
      fetchSources();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleImport = async (uploadId: string) => {
    try {
      const res = await fetch(`/api/v1/ingestion/import/${uploadId}`, {
        method: "POST"
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      setWizardState({ uploadId: null, columns: [], preview: [], mapping: {}, validation: null });
      fetchSources();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this dataset?")) return;
    await fetch(`/api/v1/ingestion/sources/${id}`, { method: "DELETE" });
    fetchSources();
  };

  const handleClearMemory = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to clear all memory?\n\nThis will remove all uploaded datasets, complaints, trails, accounts, and investigations so you can start 100% fresh."
    );
    if (!confirmed) return;

    try {
      const res = await fetch("/api/v1/system/clear-memory", { method: "POST" });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      fetchSources();
      setWizardState({ uploadId: null, columns: [], preview: [], mapping: {}, validation: null });
      setActiveFile(null);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const TARGET_FIELDS = [
    { value: "transactionId", label: "Transaction ID (Req)" },
    { value: "timestamp", label: "Transaction Time (Req)" },
    { value: "senderAccount", label: "Sender Account (Req)" },
    { value: "receiverAccount", label: "Receiver Account (Req)" },
    { value: "amount", label: "Amount (Req)" },
    { value: "transactionMode", label: "Transaction Mode (Req)" },
    { value: "transferType", label: "Transfer Type" },
    { value: "senderAccountType", label: "Sender Account Type" },
    { value: "receiverAccountType", label: "Receiver Account Type" },
    { value: "city", label: "City" }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Data Ingestion"
        title="Data Sources"
        description="Upload and normalize multi-bank transaction data for analysis."
        actions={
          <button
            type="button"
            onClick={handleClearMemory}
            className="flex items-center gap-2 rounded-lg border border-signal-rose/40 bg-signal-rose/10 px-4 py-2 text-sm font-medium text-signal-rose hover:bg-signal-rose/20 transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Clear Memory (Start Fresh)</span>
          </button>
        }
      />
      {error && (
        <Panel className="border-signal-rose">
          <div className="flex items-center justify-between">
            <p className="text-signal-rose text-sm">{error}</p>
            <button onClick={() => setError(null)} className="text-xs text-ink-500 hover:text-ink-700">Dismiss</button>
          </div>
        </Panel>
      )}

      {/* Upload Wizard */}
      <Panel>
        <h3 className="mb-4 text-lg font-semibold flex items-center gap-2 text-ink-900 dark:text-ink-100">
          <Upload className="w-5 h-5 text-intel" /> Add Transaction Files
        </h3>
        
        <div className="flex gap-4 items-center">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileSelect} 
            className="hidden" 
            accept=".csv, .xlsx, .xls"
          />
          <button 
            onClick={() => fileInputRef.current?.click()} 
            className="px-4 py-2 bg-ink-200 dark:bg-ink-800 rounded hover:bg-ink-300 transition-colors text-sm font-medium text-ink-900 dark:text-ink-100"
          >
            Select File
          </button>
          {activeFile && (
            <span className="text-sm font-mono text-ink-600 dark:text-ink-300">
              {activeFile.name} ({(activeFile.size / 1024).toFixed(1)} KB)
            </span>
          )}

          <button 
            onClick={handleUpload}
            disabled={!activeFile}
            className="ml-auto px-4 py-2 bg-intel hover:bg-intel/90 text-white rounded font-medium text-sm transition-colors disabled:opacity-50"
          >
            Upload
          </button>
        </div>

        {/* Column Mapping Section */}
        {wizardState.uploadId && !wizardState.validation && (
          <div className="mt-8 border-t border-ink-200 dark:border-ink-800 pt-6">
            <h4 className="text-md font-semibold mb-4 flex items-center gap-2 text-ink-900 dark:text-ink-100">
              <Settings className="w-4 h-4 text-intel" /> Map Columns
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
              {wizardState.columns.map(col => (
                <div key={col} className="bg-ink-50 dark:bg-ink-800/30 p-3 rounded border border-ink-200 dark:border-ink-800">
                  <div className="text-xs font-mono text-ink-500 mb-2 truncate" title={col}>{col}</div>
                  <select
                    className="w-full px-2 py-1 bg-white dark:bg-ink-900 border border-ink-300 dark:border-ink-700 rounded text-sm text-ink-900 dark:text-ink-100"
                    onChange={e => setWizardState(prev => ({
                      ...prev,
                      mapping: { ...prev.mapping, [col]: e.target.value }
                    }))}
                    value={wizardState.mapping[col] || ""}
                  >
                    <option value="">-- Ignore --</option>
                    {TARGET_FIELDS.map(f => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="mb-6">
              <h5 className="text-sm font-semibold mb-2 text-ink-900 dark:text-ink-100">Data Preview</h5>
              <div className="overflow-x-auto border border-ink-200 dark:border-ink-800 rounded">
                <table className="w-full text-left text-xs">
                  <thead className="bg-ink-100 dark:bg-ink-800">
                    <tr>
                      {wizardState.columns.slice(0, 10).map(col => <th key={col} className="p-2 whitespace-nowrap text-ink-600 dark:text-ink-300">{col}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {wizardState.preview.map((row, i) => (
                      <tr key={i} className="border-t border-ink-100 dark:border-ink-800/50">
                        {wizardState.columns.slice(0, 10).map(col => <td key={col} className="p-2 whitespace-nowrap text-ink-900 dark:text-ink-100">{String(row[col])}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <button onClick={() => handleValidate(wizardState.uploadId!)} className="px-4 py-2 bg-intel text-white rounded text-sm font-medium">
              Validate Mapping
            </button>
          </div>
        )}

        {/* Validation Section */}
        {wizardState.validation && (
          <div className="mt-8 border-t border-ink-200 dark:border-ink-800 pt-6">
            <h4 className="text-md font-semibold mb-4 flex items-center gap-2 text-ink-900 dark:text-ink-100">
              <CheckCircle className="w-4 h-4 text-emerald-500" /> Data Validation
            </h4>
            <div className="flex gap-6 mb-4">
              <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 p-4 rounded-lg flex-1 border border-emerald-200 dark:border-emerald-800/30">
                <div className="text-2xl font-bold">{wizardState.validation.valid}</div>
                <div className="text-sm">Valid Transactions</div>
              </div>
              <div className="bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 p-4 rounded-lg flex-1 border border-rose-200 dark:border-rose-800/30">
                <div className="text-2xl font-bold">{wizardState.validation.invalid}</div>
                <div className="text-sm">Errors</div>
              </div>
            </div>
            
            {wizardState.validation.errors.length > 0 && (
              <div className="mb-6 p-4 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded max-h-64 overflow-y-auto">
                <h5 className="text-sm font-bold text-rose-700 dark:text-rose-400 mb-2">Error Log</h5>
                <ul className="text-xs text-rose-600 dark:text-rose-300 space-y-1 font-mono">
                  {wizardState.validation.errors.map((e: any, i: number) => (
                    <li key={i}>Row {e.row}: {e.error}</li>
                  ))}
                </ul>
              </div>
            )}

            <button 
              onClick={() => handleImport(wizardState.uploadId!)} 
              disabled={wizardState.validation.valid === 0}
              className="px-4 py-2 bg-emerald-600 text-white rounded text-sm font-medium disabled:opacity-50 flex items-center gap-2"
            >
              <Play className="w-4 h-4" /> Import Valid Transactions
            </button>
          </div>
        )}
      </Panel>

      {/* Data Sources List */}
      <Panel>
        <h3 className="mb-4 text-lg font-semibold flex items-center gap-2 text-ink-900 dark:text-ink-100">
          <FileText className="w-5 h-5 text-intel" /> Uploaded Datasets
        </h3>
        {sources.length === 0 ? (
          <p className="text-sm text-ink-500 italic p-4 text-center border border-dashed border-ink-200 dark:border-ink-800 rounded">
            No datasets uploaded yet.
          </p>
        ) : (
          <div className="space-y-4">
            {sources.map(source => (
              <div key={source.id} className="p-4 border border-ink-200 dark:border-ink-800 rounded-lg flex items-center justify-between bg-ink-50 dark:bg-ink-900/30">
                <div>
                  <div className="font-semibold text-ink-900 dark:text-ink-100">{source.fileName}</div>
                  <div className="text-xs text-ink-500 dark:text-ink-400 flex items-center gap-3 mt-1">
                    <span className="font-mono text-intel">{source.bank?.name}</span>
                    <span>•</span>
                    <span>{new Date(source.createdAt).toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-sm font-medium text-ink-900 dark:text-ink-100">{source.ingestedCount} / {source.rowCount} imported</div>
                    <Badge tone={source.status === 'Imported' ? 'neutral' : source.status === 'Validated' ? 'warning' : 'intel'}>
                      {source.status}
                    </Badge>
                  </div>
                  <button 
                    onClick={() => handleDelete(source.id)}
                    className="p-2 text-ink-400 hover:text-rose-500 transition-colors"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
