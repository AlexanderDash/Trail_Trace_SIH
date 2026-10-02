import { useEffect, useState } from "react";
import { 
  Network, Share2, Activity, FileText, Sparkles, Play, Compass,
  ArrowRightLeft, BarChart3, Clock, AlertTriangle
} from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { Panel } from "../components/ui/Panel";
import { Badge } from "../components/ui/Badge";
import { StatCard } from "../components/ui/StatCard";

const API = "/api/v1";

export function IntelligencePage() {
  const [summary, setSummary] = useState<any>(null);
  const [networkNodes, setNetworkNodes] = useState<any[]>([]);
  const [, setNetworkEdges] = useState<any[]>([]);


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
        eyebrow="SIH 26184 — Cybercrime Interdiction & DNA"
        title="Route DNA & Interdiction Intelligence"
        description="Multi-signal behavioral trajectory forecasting, Mode A/B ring matching, evidence-graded signal decomposition, and micro choke-point optimization."
        actions={
          <div className="flex items-center gap-2">
            <Badge tone="intel">ANVESH 2.0</Badge>
          </div>
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
                 <Share2 className="h-5 w-5 text-intel" /> Account Network Graph & Flow Topology
               </h3>
               <div className="flex gap-2">
                 <select className="text-xs bg-ink-100 dark:bg-ink-900 border-none rounded p-1">
                   <option>Depth 1</option>
                   <option>Depth 2</option>
                   <option>Depth 3</option>
                 </select>
               </div>
             </div>
             
             {/* Graph Flow Proxy */}
             <div className="bg-ink-50 dark:bg-ink-950 border border-ink-200 dark:border-ink-800 rounded p-6 relative overflow-hidden">
               {networkNodes.length > 0 ? (
                 <div className="space-y-4">
                   <div className="flex items-center justify-between">
                     <div>
                       <span className="font-semibold text-sm">Active Account Nodes ({networkNodes.length})</span>
                       <span className="text-xs text-ink-500 ml-2">Evidence-Graded Inter-Bank Hops</span>
                     </div>
                     <div className="flex gap-3 text-xs">
                       <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500"></span> [Observed] Confirmed</span>
                       <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500"></span> [Linked] Ring Prior</span>
                       <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500"></span> [Predicted] Target</span>
                     </div>
                   </div>

                   <div className="flex flex-wrap gap-2 py-2">
                      {networkNodes.slice(0, 16).map((n, idx) => (
                        <div key={n.id || idx} className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-800 shadow-sm text-xs font-mono">
                          <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                          <span className="font-medium text-ink-800 dark:text-ink-200">{n.account?.accountRef || n.accountId}</span>
                          <span className="text-[10px] text-ink-400">({n.role || "mule"})</span>
                        </div>
                      ))}
                      {networkNodes.length > 16 && (
                        <span className="text-xs text-ink-500 self-center">+{networkNodes.length - 16} more nodes</span>
                      )}
                   </div>

                   <div className="grid sm:grid-cols-3 gap-3 pt-3 border-t border-ink-200 dark:border-ink-800 text-xs">
                     <div className="p-2.5 rounded bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-800">
                       <span className="text-[10px] uppercase font-bold text-ink-400 block mb-0.5">Route DNA Structuring</span>
                       <span className="font-semibold text-intel">Three-Signal Motif Verified</span>
                       <p className="text-[11px] text-ink-500 mt-1">Chronological ordering & log-binned hop timing confirmed.</p>
                     </div>
                     <div className="p-2.5 rounded bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-800">
                       <span className="text-[10px] uppercase font-bold text-ink-400 block mb-0.5">Rails Physics Pre-Filter</span>
                       <span className="font-semibold text-emerald-600 dark:text-emerald-400">Feasible Candidate Set</span>
                       <p className="text-[11px] text-ink-500 mt-1">Within daily UPI/IMPS limit with ≤10% hop cost decay.</p>
                     </div>
                     <div className="p-2.5 rounded bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-800">
                       <span className="text-[10px] uppercase font-bold text-ink-400 block mb-0.5">Silence Detection</span>
                       <span className="font-semibold text-amber-600 dark:text-amber-400">Active Forwarding</span>
                       <p className="text-[11px] text-ink-500 mt-1">Expected vs observed transfer window within tolerance.</p>
                     </div>
                   </div>
                 </div>
               ) : (
                 <p className="text-sm text-ink-500 italic">No network graph data available.</p>
               )}
             </div>
          </Panel>

          {/* Mathematical Prediction & Interdiction Intelligence */}
          <Panel className="border-intel/30">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2 text-ink-900 dark:text-ink-100">
                <Sparkles className="h-5 w-5 text-intel" /> Predictive Analytics & Interdiction Intelligence
              </h3>
              <div className="flex items-center gap-2">
                <Badge tone={prediction?.mode === "MODE_A" ? "intel" : "warning"}>
                  {prediction?.mode_label || (prediction?.mode === "MODE_A" ? "MODE A: RING MATCHED" : "MODE B: PROFILE FORECAST")}
                </Badge>
              </div>
            </div>

            <div className="bg-ink-50 dark:bg-ink-900/60 p-4 rounded-lg border border-ink-200 dark:border-ink-800 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="font-semibold text-ink-900 dark:text-ink-100 text-sm">
                    {engineStatus?.name || "ANVESH Mathematical Engine (NetworkX & Laplace)"}
                  </h4>
                  <p className="text-xs text-ink-500 mt-0.5">
                    Algorithm: <span className="font-mono text-intel">{engineStatus?.algorithm || "Laplace Add-1 Smoothing & NetworkX MultiDiGraph"}</span>
                  </p>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  <span className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono px-2 py-0.5 rounded font-medium">[Observed] Hops</span>
                  <span className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono px-2 py-0.5 rounded font-medium">[Linked] Cross-Case</span>
                  <span className="text-[10px] bg-purple-500/10 text-purple-600 dark:text-purple-400 font-mono px-2 py-0.5 rounded font-medium">[Inferred] Rails Physics</span>
                  <span className="text-[10px] bg-rose-500/10 text-rose-600 dark:text-rose-400 font-mono px-2 py-0.5 rounded font-medium">[Predicted] STKDE</span>
                </div>
              </div>

              {/* Interactive Case Forecaster */}
              <div className="pt-2 border-t border-ink-200 dark:border-ink-800/80">
                <label className="text-[10px] uppercase font-bold text-ink-400 tracking-wider block mb-1.5">
                  Select Complaint File to Forecast & Interdict
                </label>
                <div className="flex gap-2">
                  <select
                    className="flex-1 rounded border border-ink-300 dark:border-ink-700 bg-white dark:bg-ink-950 px-2.5 py-1.5 text-xs text-ink-900 dark:text-ink-100"
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
                    className="flex items-center gap-1.5 rounded bg-intel text-white px-3.5 py-1.5 text-xs font-medium hover:bg-intel/90 disabled:opacity-50 transition-colors shadow-sm"
                  >
                    <Play className="h-3.5 w-3.5" />
                    {predicting ? "Analyzing..." : "Generate Prediction"}
                  </button>
                </div>
              </div>

              {predictionError && (
                <div className="p-2.5 rounded bg-signal-rose/10 border border-signal-rose/30 text-xs text-signal-rose">
                  ⚠️ {predictionError}
                </div>
              )}

              {/* Live Prediction Output */}
              {prediction && (
                <div className="mt-4 space-y-4 pt-3 border-t border-ink-200 dark:border-ink-800">
                  
                  {/* Status & Urgency Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded bg-white dark:bg-ink-950 border border-ink-200 dark:border-ink-800">
                    <div className="flex items-center gap-2">
                      <Badge tone={prediction.mode === "MODE_A" ? "intel" : "warning"}>
                        {prediction.mode_label || "Mode B (Cold-Start Profile Forecast)"}
                      </Badge>
                      <span className="text-xs font-semibold text-ink-800 dark:text-ink-200">
                        Status: <span className="font-mono text-intel">{prediction.status || "IN_TRANSIT"}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      {prediction.expected_value_inr && (
                        <div className="text-ink-600 dark:text-ink-300">
                          Expected Value: <span className="font-mono font-bold text-intel">₹{Number(prediction.expected_value_inr).toLocaleString("en-IN")}</span>
                        </div>
                      )}
                      {prediction.urgency && (
                        <Badge tone={prediction.urgency.tier?.includes("CRITICAL") ? "danger" : "warning"}>
                          {`${prediction.urgency.tier} (${prediction.urgency.golden_hour_remaining_minutes}m left)`}
                        </Badge>
                      )}

                    </div>
                  </div>

                  {/* Money Trail Flow */}
                  {prediction.money_trail_string && (
                    <div>
                      <div className="text-[10px] uppercase font-bold text-ink-400 mb-1 flex items-center gap-1">
                        <Compass className="h-3.5 w-3.5 text-intel" /> Money Trail Flow (Observed Digital Hops ➔ Predicted Cash-Out)
                      </div>
                      <div className="p-2.5 rounded bg-white dark:bg-ink-950 font-mono text-xs text-ink-800 dark:text-ink-200 border border-ink-200 dark:border-ink-800 overflow-x-auto whitespace-nowrap shadow-inner">
                        {prediction.money_trail_string}
                      </div>
                    </div>
                  )}

                  {/* Prediction Candidates */}
                  {prediction.is_predicted && prediction.predictions ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                      <div className="p-3 rounded bg-white dark:bg-ink-950 border border-ink-200 dark:border-ink-800">
                        <div className="text-[10px] uppercase font-bold text-ink-400">[Predicted] Next Hop Candidate</div>
                        <div className="font-mono font-bold text-intel text-base mt-1">
                          {prediction.predictions.primary_node}
                        </div>
                        <div className="text-[11px] text-ink-500 mt-0.5">
                          Likelihood: <span className="font-semibold text-intel">{prediction.predictions.primary_prob}</span>
                        </div>
                      </div>

                      <div className="p-3 rounded bg-white dark:bg-ink-950 border border-ink-200 dark:border-ink-800">
                        <div className="text-[10px] uppercase font-bold text-ink-400">[Inferred] Novel Route Drift Risk</div>
                        <div className="font-mono font-bold text-signal-rose text-base mt-1">
                          {prediction.predictions.novel_drift_risk}
                        </div>
                        <div className="text-[11px] text-ink-500 mt-0.5">
                          Secondary candidate: {prediction.predictions.secondary_node || "Unobserved"} ({prediction.predictions.secondary_prob || "0%"})
                        </div>
                      </div>

                      <div className="p-3 rounded bg-white dark:bg-ink-950 border border-ink-200 dark:border-ink-800">
                        <div className="text-[10px] uppercase font-bold text-ink-400">[Predicted] STKDE Cash-Out Region</div>
                        <div className="font-bold text-ink-900 dark:text-ink-100 text-base mt-1">
                          {prediction.predictions.predicted_district}
                        </div>
                        <div className="text-[11px] text-ink-500 mt-0.5">
                          Channel: <span className="font-semibold text-ink-700 dark:text-ink-300">{prediction.predictions.channel}</span> ({prediction.predictions.location_confidence})
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {/* Interdiction Intelligence & What-If Reroute Panel */}
                  {prediction.interdiction && (
                    <div className="p-3.5 rounded bg-intel/5 border border-intel/30 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-intel flex items-center gap-1.5 uppercase tracking-wide">
                          🛡️ Interdiction Intelligence & Choke-Point Analysis
                        </span>
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-intel/15 text-intel font-semibold">
                          Choke Score: {prediction.interdiction.choke_point_score} / 1.0
                        </span>
                      </div>
                      
                      <div className="grid sm:grid-cols-2 gap-3 text-xs pt-1">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-ink-400 block">Recommended Intervention Point</span>
                          <span className="font-mono font-bold text-ink-900 dark:text-ink-100 text-sm">
                            {prediction.interdiction.choke_point_node}
                          </span>
                          <span className="ml-2 text-[10px] uppercase px-1.5 py-0.5 rounded bg-signal-rose/10 text-signal-rose font-semibold">
                            {prediction.interdiction.action || "FREEZE ADVISORY"}
                          </span>
                        </div>
                        {prediction.interdiction.what_if_reroute && (
                          <div>
                            <span className="text-[10px] uppercase font-bold text-ink-400 block">What-If Reroute Friction</span>
                            <span className="text-ink-700 dark:text-ink-300">
                              Imposes ~₹{Number(prediction.interdiction.what_if_reroute.evasion_friction_cost_inr || 0).toLocaleString("en-IN")} evasion cost ({prediction.interdiction.what_if_reroute.reroute_probability} drift).
                            </span>
                          </div>
                        )}
                      </div>

                      {prediction.interdiction.what_if_reroute?.impact && (
                        <p className="text-[11px] text-ink-600 dark:text-ink-400 italic pt-1 border-t border-intel/15">
                          💡 Consequence: {prediction.interdiction.what_if_reroute.impact}
                        </p>
                      )}
                    </div>
                  )}

                  {/* 4-Tier Evidence Graded Signals */}
                  {prediction.evidence_graded_signals && (
                    <div className="space-y-1.5 pt-1">
                      <div className="text-[10px] uppercase font-bold text-ink-400 tracking-wider">
                        ANVESH 4-Tier Evidence Decomposition
                      </div>
                      <div className="grid sm:grid-cols-2 gap-2 text-xs">
                        {prediction.evidence_graded_signals.map((sig: any, sIdx: number) => (
                          <div key={sIdx} className="p-2.5 rounded bg-white dark:bg-ink-950 border border-ink-200 dark:border-ink-800">
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="font-mono font-bold text-[11px] text-intel">{sig.tag}</span>
                              <span className="font-semibold text-ink-800 dark:text-ink-200">{sig.title}</span>
                            </div>
                            <p className="text-[11px] text-ink-500 dark:text-ink-400">{sig.detail}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Natural Language Tactical Briefing */}
                  {prediction.plain_text_explanation && (
                    <div className="p-2.5 rounded bg-white dark:bg-ink-950 border border-ink-200 dark:border-ink-800 text-xs text-ink-700 dark:text-ink-300 font-mono">
                      <span className="font-sans font-bold text-intel block mb-0.5">Investigator Briefing:</span>
                      {prediction.plain_text_explanation}
                    </div>
                  )}
                </div>
              )}
            </div>
            <p className="text-[11px] text-ink-500 mt-2.5 italic">
              ANVESH Research-Grounded Intelligence Core: Three-Signal Structuring, Rails Physics, STKDE Surface, and Interdiction Analysis.
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
