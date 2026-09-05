import { useEffect, useState } from "react";
import { 
  Network, Share2, Activity, FileText, Sparkles, Play, Compass,
  ArrowRightLeft, BarChart3, Clock, AlertTriangle, ShieldAlert
} from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { Panel } from "../components/ui/Panel";
import { Badge } from "../components/ui/Badge";
import { StatCard } from "../components/ui/StatCard";

const API = "/api/v1";

export function IntelligencePage() {
  const [summary, setSummary] = useState<any>(null);
  const [networkNodes, setNetworkNodes] = useState<any[]>([]);
  const [networkEdges, setNetworkEdges] = useState<any[]>([]);
  const [correlations, setCorrelations] = useState<any[]>([]);
  const [engineStatus, setEngineStatus] = useState<any>(null);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [selectedComplaintId, setSelectedComplaintId] = useState<string>("");
  const [prediction, setPrediction] = useState<any>(null);
  const [predicting, setPredicting] = useState(false);
  const [predictionError, setPredictionError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/intelligence/summary`).then(res => res.json()),
      fetch(`${API}/intelligence/network`).then(res => res.json()),
      fetch(`${API}/intelligence/correlations`).then(res => res.json()),
      fetch(`${API}/ml/models/active`).then(res => res.json()).catch(() => null),
      fetch(`${API}/complaints`).then(res => res.json()).catch(() => [])
    ]).then(([sumData, netData, corrData, modelData, compData]) => {
      setSummary(sumData);
      setNetworkNodes(netData.nodes || []);
      setNetworkEdges(netData.edges || []);
      setCorrelations(corrData || []);
      setEngineStatus(modelData);
      const matched = (compData || []).filter((c: any) => c.matchedTransactionId || c.matchedTransaction);
      setComplaints(matched.length > 0 ? matched : compData || []);
      if (matched.length > 0) setSelectedComplaintId(matched[0].id);
      else if (compData && compData.length > 0) setSelectedComplaintId(compData[0].id);
      setLoading(false);
    }).catch(console.error);
  }, []);

  const handleRunForecast = async () => {
    if (!selectedComplaintId) return;
    setPredicting(true);
    setPredictionError(null);
    try {
      const res = await fetch(`${API}/trails/${selectedComplaintId}/prediction`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setPrediction(data);
    } catch (e: any) {
      setPredictionError(e.message || "Failed to contact prediction engine");
    } finally {
      setPredicting(false);
    }
  };

  if (loading) return <div className="p-8">Loading intelligence correlations...</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Advanced Financial Intelligence"
        title="Intelligence & Network Analysis"
        description="Correlate all imported complaints, identify high-risk networks spanning multiple cases, and analyze financial behavior patterns."
        actions={
          <button className="flex items-center gap-2 rounded bg-ink-900 px-4 py-2 text-sm text-white hover:bg-ink-800 dark:bg-ink-100 dark:text-ink-900 dark:hover:bg-white">
            <FileText className="h-4 w-4" /> Export Intelligence Summary
          </button>
        }
      />

      {/* Scorecard */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Total Complaints" value={summary?.totalComplaints} hint="Imported cases" icon={FileText} />
        <StatCard label="High-Risk Accounts" value={summary?.relatedHighRiskAccounts} hint="Above threshold" icon={AlertTriangle} tone="danger" />
        <StatCard label="Networks of Interest" value={summary?.networksOfInterest} hint="Correlated clusters" icon={Network} tone="warning" />
        <StatCard label="Cross-Bank Links" value={summary?.crossBankLinks} hint="Bank boundaries crossed" icon={ArrowRightLeft} tone="intel" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Network Area */}
        <div className="lg:col-span-2 space-y-6">
          <Panel>
             <div className="flex justify-between items-center mb-4">
               <h3 className="text-lg font-bold flex items-center gap-2">
                 <Share2 className="h-5 w-5 text-intel" /> Account Network Graph
               </h3>
               <div className="flex gap-2">
                 <select className="text-xs bg-ink-100 dark:bg-ink-900 border-none rounded p-1">
                   <option>Depth 1</option>
                   <option>Depth 2</option>
                   <option>Depth 3</option>
                 </select>
               </div>
             </div>
             
             {/* Simulated Graph Canvas */}
             <div className="bg-ink-50 dark:bg-ink-950 border border-ink-200 dark:border-ink-800 rounded h-[400px] flex items-center justify-center relative overflow-hidden">
               {/* Visual proxy for graph since we don't have a robust canvas lib */}
               {networkNodes.length > 0 ? (
                 <div className="text-center p-4">
                   <Network className="h-16 w-16 mx-auto text-ink-300 dark:text-ink-700 mb-4 opacity-50" />
                   <p className="text-sm font-medium">Network Data Loaded</p>
                   <p className="text-xs text-ink-500 mb-4">{networkNodes.length} Nodes • {networkEdges.length} Edges</p>
                   <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                      {networkNodes.slice(0, 15).map(n => (
                        <span key={n.id} className="text-[10px] font-mono bg-ink-200 dark:bg-ink-800 px-2 py-1 rounded border border-ink-300 dark:border-ink-700">
                          {n.account?.accountRef || n.accountId}
                        </span>
                      ))}
                      {networkNodes.length > 15 && <span className="text-[10px] text-ink-500 py-1">+{networkNodes.length - 15} more</span>}
                   </div>
                   <div className="absolute bottom-4 left-4 text-left text-xs bg-white dark:bg-ink-900 p-2 border border-ink-200 dark:border-ink-800 rounded shadow-sm opacity-90">
                     <div className="font-bold mb-1">Detected Patterns:</div>
                     <div className="text-warning flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Fan-out behaviour</div>
                     <div className="text-intel flex items-center gap-1"><ArrowRightLeft className="h-3 w-3" /> Cross-bank movement</div>
                     <div className="text-danger flex items-center gap-1"><ShieldAlert className="h-3 w-3" /> Suspicious convergence</div>
                   </div>
                   <div className="absolute top-4 right-4 text-left text-xs bg-white dark:bg-ink-900 p-2 border border-ink-200 dark:border-ink-800 rounded shadow-sm opacity-90">
                     <div className="font-bold mb-1">Network Risk Score: <span className="text-danger">78</span></div>
                     <div className="text-ink-500">+25 High-risk accounts</div>
                     <div className="text-ink-500">+20 Shared complaint trails</div>
                     <div className="text-ink-500">+15 Cross-bank movement</div>
                   </div>
                 </div>
               ) : (
                 <p className="text-sm text-ink-500 italic">No network graph data available.</p>
               )}
             </div>
          </Panel>

          {/* Mathematical Prediction & NetworkX Forecast Engine */}
          <Panel className="border-intel/30">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2 text-ink-900 dark:text-ink-100">
                <Sparkles className="h-5 w-5 text-intel" /> Mathematical Trajectory & Cash-Out Forecaster
              </h3>
              <Badge tone={engineStatus?.status === "ACTIVE" ? "intel" : "warning"}>
                {engineStatus?.status === "ACTIVE" ? "PYTHON ENGINE: ACTIVE" : "PYTHON ENGINE: STANDBY (PORT 8000)"}
              </Badge>
            </div>

            <div className="bg-ink-50 dark:bg-ink-900/60 p-4 rounded-lg border border-ink-200 dark:border-ink-800 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="font-semibold text-ink-900 dark:text-ink-100 text-sm">
                    {engineStatus?.name || "NetworkX_Laplace_v1"}
                  </h4>
                  <p className="text-xs text-ink-500 mt-0.5">
                    Algorithm: <span className="font-mono text-intel">{engineStatus?.algorithm || "Laplace Add-1 Smoothing & NetworkX MultiDiGraph"}</span>
                  </p>
                </div>
                <div className="flex gap-1 flex-wrap">
                  <span className="text-[10px] bg-intel/10 text-intel font-mono px-2 py-0.5 rounded">Laplace Add-1</span>
                  <span className="text-[10px] bg-signal-amber/10 text-signal-amber font-mono px-2 py-0.5 rounded">Drift Risk %</span>
                  <span className="text-[10px] bg-ink-200 dark:bg-ink-800 text-ink-600 dark:text-ink-400 font-mono px-2 py-0.5 rounded">Golden Hour 60m</span>
                </div>
              </div>

              {/* Interactive Case Forecaster */}
              <div className="pt-2 border-t border-ink-200 dark:border-ink-800/80">
                <label className="text-[10px] uppercase font-bold text-ink-400 tracking-wider block mb-1.5">
                  Select Case / Complaint to Forecast
                </label>
                <div className="flex gap-2">
                  <select
                    className="flex-1 rounded border border-ink-300 dark:border-ink-700 bg-white dark:bg-ink-950 px-2 py-1.5 text-xs text-ink-900 dark:text-ink-100"
                    value={selectedComplaintId}
                    onChange={(e) => {
                      setSelectedComplaintId(e.target.value);
                      setPrediction(null);
                      setPredictionError(null);
                    }}
                  >
                    {complaints.length === 0 && <option value="">No active complaints in database</option>}
                    {complaints.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.complaintRef} — ₹{Number(c.amount).toLocaleString("en-IN")} ({c.victimAccount?.accountRef || "Victim"})
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleRunForecast}
                    disabled={predicting || !selectedComplaintId}
                    className="flex items-center gap-1.5 rounded bg-intel text-white px-3 py-1.5 text-xs font-medium hover:bg-intel/90 disabled:opacity-50"
                  >
                    <Play className="h-3.5 w-3.5" />
                    {predicting ? "Running..." : "Run Forecast"}
                  </button>
                </div>
              </div>

              {predictionError && (
                <div className="p-2.5 rounded bg-signal-rose/10 border border-signal-rose/30 text-xs text-signal-rose">
                  ⚠️ {predictionError}
                  <div className="mt-1 text-[11px] opacity-80">
                    Make sure the Python engine is running: <code>cd apps/python-engine && python main.py</code>
                  </div>
                </div>
              )}

              {/* Live Prediction Output */}
              {prediction && (
                <div className="mt-3 space-y-3 pt-2 border-t border-ink-200 dark:border-ink-800">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-ink-900 dark:text-ink-100 flex items-center gap-1">
                      <Compass className="h-3.5 w-3.5 text-intel" /> Money Trail Trajectory
                    </span>
                    <Badge tone={prediction.is_predicted ? "intel" : "neutral"}>
                      {prediction.status || (prediction.is_predicted ? "IN_TRANSIT" : "COMPLETED")}
                    </Badge>
                  </div>

                  {prediction.money_trail_string && (
                    <div className="p-2 rounded bg-white dark:bg-ink-950 font-mono text-xs text-ink-800 dark:text-ink-200 border border-ink-200 dark:border-ink-800 overflow-x-auto">
                      {prediction.money_trail_string}
                    </div>
                  )}

                  {prediction.is_predicted && prediction.predictions ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                      <div className="p-2.5 rounded bg-white dark:bg-ink-950 border border-ink-200 dark:border-ink-800">
                        <div className="text-[10px] uppercase text-ink-400">Primary Next Hop</div>
                        <div className="font-mono font-bold text-intel text-sm mt-0.5">
                          {prediction.predictions.primary_node}
                        </div>
                        <div className="text-[11px] text-ink-500 mt-0.5">
                          Likelihood: <span className="font-semibold text-intel">{prediction.predictions.primary_prob}</span>
                        </div>
                      </div>

                      <div className="p-2.5 rounded bg-white dark:bg-ink-950 border border-ink-200 dark:border-ink-800">
                        <div className="text-[10px] uppercase text-ink-400">Drift Risk (New Mule)</div>
                        <div className="font-mono font-bold text-signal-rose text-sm mt-0.5">
                          {prediction.predictions.novel_drift_risk}
                        </div>
                        <div className="text-[11px] text-ink-500 mt-0.5">
                          Secondary: {prediction.predictions.secondary_node || "None"} ({prediction.predictions.secondary_prob || "0%"})
                        </div>
                      </div>

                      <div className="p-2.5 rounded bg-white dark:bg-ink-950 border border-ink-200 dark:border-ink-800">
                        <div className="text-[10px] uppercase text-ink-400">Predicted Cash-Out</div>
                        <div className="font-bold text-ink-900 dark:text-ink-100 text-sm mt-0.5">
                          {prediction.predictions.predicted_district}
                        </div>
                        <div className="text-[11px] text-ink-500 mt-0.5">
                          Confidence: <span className="font-semibold text-intel">{prediction.predictions.location_confidence}</span>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {prediction.plain_text_explanation && (
                    <div className="p-2.5 rounded bg-intel/5 border border-intel/20 text-xs text-ink-700 dark:text-ink-300 font-mono">
                      <span className="font-sans font-bold text-intel block mb-0.5">Investigator Briefing:</span>
                      {prediction.plain_text_explanation}
                    </div>
                  )}
                </div>
              )}
            </div>
            <p className="text-[11px] text-ink-500 mt-2.5 italic">
              Powered by NetworkX MultiDiGraph & Laplace Add-1 Smoothing. Computes candidate route probabilities with novel account drift assessment.
            </p>
          </Panel>
        </div>

        {/* Right Column: Correlations & Analytics */}
        <div className="space-y-6">
          <Panel>
            <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
              <Activity className="h-5 w-5 text-intel" /> Shared Accounts (Cross-Complaint)
            </h3>
            {correlations.length === 0 ? (
              <p className="text-sm text-ink-500 italic">No shared accounts detected across multiple complaints.</p>
            ) : (
              <div className="space-y-3">
                {correlations.map((c, i) => (
                  <div key={i} className="flex justify-between items-center p-3 rounded border border-ink-200 dark:border-ink-800 bg-ink-50 dark:bg-ink-900/30">
                     <div>
                       <div className="font-mono font-bold text-sm text-ink-900 dark:text-ink-100">{c.accountRef}</div>
                       <div className="text-xs text-ink-500 mt-1">Appears in {c.complaints} complaints</div>
                     </div>
                     <Badge tone="danger">High Risk</Badge>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel>
            <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
              <BarChart3 className="h-5 w-5 text-intel" /> Cross-Bank Flows
            </h3>
            <div className="text-sm text-ink-600 dark:text-ink-300">
               <p className="mb-2">Observed aggregate transfers between institutions.</p>
               <table className="w-full text-left border-collapse mt-4">
                 <thead>
                   <tr className="border-b border-ink-200 dark:border-ink-800 font-mono text-[10px] uppercase text-ink-500">
                     <th className="py-2">From \ To</th>
                     <th className="py-2">SBI</th>
                     <th className="py-2">BOB</th>
                     <th className="py-2">ICICI</th>
                   </tr>
                 </thead>
                 <tbody className="text-xs">
                   <tr className="border-b border-ink-100 dark:border-ink-800/50">
                     <td className="py-2 font-mono font-medium">SBI</td>
                     <td className="py-2 text-ink-400">—</td>
                     <td className="py-2">8</td>
                     <td className="py-2">4</td>
                   </tr>
                   <tr className="border-b border-ink-100 dark:border-ink-800/50">
                     <td className="py-2 font-mono font-medium">BOB</td>
                     <td className="py-2">5</td>
                     <td className="py-2 text-ink-400">—</td>
                     <td className="py-2">7</td>
                   </tr>
                   <tr>
                     <td className="py-2 font-mono font-medium">ICICI</td>
                     <td className="py-2">3</td>
                     <td className="py-2">6</td>
                     <td className="py-2 text-ink-400">—</td>
                   </tr>
                 </tbody>
               </table>
            </div>
          </Panel>
          
          <Panel>
            <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
              <Clock className="h-5 w-5 text-intel" /> Temporal Analytics
            </h3>
            <div className="text-sm space-y-2">
               <div className="flex justify-between"><span>Rapid Forwarding Events</span> <span className="font-mono">14</span></div>
               <div className="flex justify-between"><span>Suspicious Activity Bursts</span> <span className="font-mono">3</span></div>
               <div className="flex justify-between"><span>Peak Transfer Window</span> <span className="font-mono text-ink-500">02:00 - 04:00 AM</span></div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
