import { useEffect, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, Circle } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Map as MapIcon, Filter, Layers } from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { Panel } from "../components/ui/Panel";
import { Badge } from "../components/ui/Badge";

const API = "/api/v1";

interface Hotspot {
  id: string;
  latitude: number;
  longitude: number;
  city: string;
  score: number;
  riskLevel: string;
  transactionCount: number;
  accountCount: number;
  trailCount: number;
  historicalWithdrawalCount: number;
  predictionFactors: string[];
  mlScore?: number | null;
  ruleScore?: number;
  finalScore?: number;
}

export function GeospatialPage() {
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Hotspot | null>(null);
  const [mlStatus, setMlStatus] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [hotspotsRes, mlRes] = await Promise.all([
        fetch(`${API}/ml/predict`),
        fetch(`${API}/ml/models/active`)
      ]);
      const data = await hotspotsRes.json();
      const model = await mlRes.json();
      
      setHotspots(data);
      setMlStatus(model);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const getRiskColor = (level: string) => {
    if (level === "CRITICAL") return "#e11d48"; // rose-600
    if (level === "HIGH") return "#f59e0b"; // amber-500
    return "#3b82f6"; // blue-500
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="SIH 26184 — Spatial Prediction & Cash-Out Forecasting"
        title="STKDE Risk Surface & Predicted Channel Map"
        description="Spatio-temporal risk density surface mapping elevated likelihood of terminal cash withdrawals, distinguishing Mode A (ring-specific priors) from Mode B (population base-rate surfaces)."
        actions={<Badge tone="intel">STKDE Epanechnikov Surface</Badge>}
      />

      {mlStatus?.status === "INSUFFICIENT_DATA" && (
        <Panel className="border-signal-amber/40 bg-signal-amber/5">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-signal-amber mb-1">STKDE Calibration: Population Base-Rate Active (Mode B)</h3>
              <p className="text-xs text-ink-600 dark:text-ink-300">
                Operating under Mode B cold-start base rate. Surface evaluates spatial density across active complaint trails and known withdrawal endpoints.
              </p>
            </div>
            <div className="text-right">
              <Badge tone="warning">Mode B Surface</Badge>
            </div>
          </div>
        </Panel>
      )}

      <div className="grid lg:grid-cols-4 gap-6 h-[700px]">
        
        {/* Sidebar / Filters / Detail Panel */}
        <div className="space-y-4 flex flex-col h-full">
          <Panel className="flex-none">
            <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100 flex items-center gap-2 mb-4">
              <Filter className="h-4 w-4" /> Surface Filters & Layers
            </h3>
            <div className="space-y-2 text-sm">
              <label className="flex items-center gap-2 text-ink-700 dark:text-ink-300">
                <input type="checkbox" defaultChecked className="rounded border-ink-300" />
                STKDE High-Density Zones
              </label>
              <label className="flex items-center gap-2 text-ink-700 dark:text-ink-300">
                <input type="checkbox" defaultChecked className="rounded border-ink-300" />
                Terminal Cash-Out Nodes
              </label>
              <label className="flex items-center gap-2 text-ink-700 dark:text-ink-300">
                <input type="checkbox" defaultChecked className="rounded border-ink-300" />
                Active Multi-Hop Trails
              </label>
            </div>
          </Panel>


          <Panel className="flex-1 overflow-y-auto">
            {selected ? (
              <div className="space-y-4">
                <button 
                  onClick={() => setSelected(null)}
                  className="text-xs text-ink-500 hover:text-intel mb-2 inline-block"
                >
                  ← Back to list
                </button>
                <div>
                  <h3 className="text-lg font-bold text-ink-900 dark:text-ink-100 mb-1">
                    {selected.city}
                  </h3>
                  <div className="flex items-center gap-2 mb-4">
                    <Badge tone={selected.riskLevel === 'CRITICAL' ? 'danger' : 'warning'}>{selected.riskLevel}</Badge>
                    <span className="text-sm font-mono font-bold text-ink-900 dark:text-ink-100">Final Score: {selected.score}</span>
                  </div>
                  {(selected.mlScore != null || selected.ruleScore != null) && (
                    <div className="flex gap-4 text-xs font-mono text-ink-500 mb-4 bg-ink-100 dark:bg-ink-800 p-2 rounded">
                      {selected.mlScore != null && <div>ML: {selected.mlScore}</div>}
                      {selected.ruleScore != null && <div>Rule: {selected.ruleScore}</div>}
                    </div>
                  )}
                </div>

                <div className="space-y-2 text-sm text-ink-700 dark:text-ink-300 border-t border-ink-200 dark:border-ink-800 pt-4">
                  <div className="flex justify-between">
                    <span>Recent Suspicious Txns:</span>
                    <span className="font-medium">{selected.transactionCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Associated Accounts:</span>
                    <span className="font-medium">{selected.accountCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Active Complaint Trails:</span>
                    <span className="font-medium">{selected.trailCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Historical Withdrawals:</span>
                    <span className="font-medium">{selected.historicalWithdrawalCount}</span>
                  </div>
                </div>

                <div className="mt-6 border-t border-ink-200 dark:border-ink-800 pt-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-500 mb-2">Prediction Factors</h4>
                  <ul className="space-y-2 text-sm text-ink-700 dark:text-ink-300 list-disc pl-4">
                    {selected.predictionFactors.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              </div>
            ) : (
              <div>
                <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100 flex items-center gap-2 mb-4">
                  <Layers className="h-4 w-4" /> Top Hotspots
                </h3>
                {loading ? (
                  <p className="text-sm text-ink-500">Loading map data...</p>
                ) : hotspots.length === 0 ? (
                  <p className="text-sm text-ink-500 italic">No significant hotspots detected.</p>
                ) : (
                  <div className="space-y-2">
                    {hotspots.map(h => (
                      <div 
                        key={h.id} 
                        onClick={() => setSelected(h)}
                        className="p-3 rounded border border-ink-200 dark:border-ink-800 hover:border-intel hover:bg-intel/5 cursor-pointer transition-colors"
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-medium text-ink-900 dark:text-ink-100">{h.city}</span>
                          <span className="text-xs font-mono font-bold" style={{ color: getRiskColor(h.riskLevel) }}>{h.score}</span>
                        </div>
                        <div className="text-xs text-ink-500">{h.transactionCount} txns • {h.trailCount} trails</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Panel>
        </div>

        {/* Map View */}
        <div className="lg:col-span-3 rounded-lg border border-ink-200 dark:border-ink-800 overflow-hidden bg-ink-100 dark:bg-ink-900 z-0 relative">
          <MapContainer 
            center={[22.5937, 78.9629]} // Center of India
            zoom={5} 
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%', zIndex: 1 }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              className="map-tiles"
            />
            
            {hotspots.map(h => (
              <div key={h.id}>
                {/* Heatmap-like circle to denote area of effect */}
                <Circle
                  center={[h.latitude, h.longitude]}
                  radius={h.score * 500} // Scale radius by risk score
                  pathOptions={{ 
                    color: getRiskColor(h.riskLevel),
                    fillColor: getRiskColor(h.riskLevel),
                    fillOpacity: 0.2,
                    weight: 1
                  }}
                  eventHandlers={{ click: () => setSelected(h) }}
                />
                
                {/* Pinpoint marker */}
                <CircleMarker
                  center={[h.latitude, h.longitude]}
                  radius={8}
                  pathOptions={{
                    color: '#fff',
                    weight: 2,
                    fillColor: getRiskColor(h.riskLevel),
                    fillOpacity: 0.9
                  }}
                  eventHandlers={{ click: () => setSelected(h) }}
                >
                  <Popup>
                    <div className="text-sm p-1">
                      <strong className="block mb-1">{h.city}</strong>
                      Likelihood: {h.riskLevel} ({h.score}/100)<br />
                      Trails: {h.trailCount}<br />
                      Txns: {h.transactionCount}
                    </div>
                  </Popup>
                </CircleMarker>
              </div>
            ))}
          </MapContainer>

          {/* Map Overlay info */}
          <div className="absolute bottom-4 left-4 z-[400] bg-white/90 dark:bg-ink-950/90 backdrop-blur p-3 rounded shadow border border-ink-200 dark:border-ink-800 text-xs">
            <h4 className="font-semibold mb-2 flex items-center gap-1"><MapIcon className="h-3 w-3"/> Map Legend</h4>
            <div className="space-y-1">
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-rose-600 border border-white"></div> Critical Hotspot</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500 border border-white"></div> High Risk Area</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500 border border-white"></div> Medium Risk Area</div>
            </div>
            <p className="mt-2 text-ink-500 italic max-w-[200px] leading-tight">
              Circles represent geospatial likelihood, not exact GPS coordinates of physical ATMs.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
