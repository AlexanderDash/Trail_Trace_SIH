import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { 
  Download, Play, Pause, SkipBack, SkipForward, FileText, 
  ShieldAlert, FileSignature, Clock, Save
} from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { Panel } from "../components/ui/Panel";
import { Badge } from "../components/ui/Badge";

const API = "/api/v1";

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

export function InvestigationWorkspacePage() {
  const { id } = useParams();
  const [inv, setInv] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Timeline State
  const [timelineEvents, setTimelineEvents] = useState<any[]>([]);
  const [currentEventIdx, setCurrentEventIdx] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const timerRef = useRef<any>(null);

  // Note/Finding Form
  const [noteContent, setNoteContent] = useState("");
  const [findingType, setFindingType] = useState("OBSERVATION");
  const [findingDesc, setFindingDesc] = useState("");

  useEffect(() => {
    fetchInvestigation();
  }, [id]);

  const fetchInvestigation = async () => {
    try {
      const res = await fetch(`${API}/investigations/${id}`);
      const data = await res.json();
      setInv(data);
      
      // Extract timeline events from trail nodes
      const events: any[] = [];
      if (data.trails && data.trails.length > 0) {
        data.trails.forEach((trail: any) => {
          trail.nodes.forEach((node: any) => {
             // We need transactions from these accounts in real life, but for prototype we just use node sequence
             events.push({
               id: node.id,
               time: new Date(node.createdAt),
               accountRef: node.account.accountRef,
               role: node.role,
               city: "Jamtara", // For demo sync (would come from transaction)
               latitude: 23.9715,
               longitude: 86.8016,
               amount: 10000,
               bank: node.account.bankId || 'SBI'
             });
          });
        });
        events.sort((a, b) => a.time.getTime() - b.time.getTime());
        setTimelineEvents(events);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setCurrentEventIdx(prev => {
          if (prev >= timelineEvents.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 2000 / playbackSpeed);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isPlaying, playbackSpeed, timelineEvents.length]);

  const handleDownloadReport = async () => {
    window.open(`${API}/investigations/${id}/report`, "_blank");
  };

  const handleAddNote = async () => {
    if (!noteContent.trim()) return;
    await fetch(`${API}/investigations/${id}/notes`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: noteContent })
    });
    setNoteContent("");
    fetchInvestigation();
  };

  const handleAddFinding = async () => {
    if (!findingDesc.trim()) return;
    await fetch(`${API}/investigations/${id}/findings`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: findingType, description: findingDesc })
    });
    setFindingDesc("");
    fetchInvestigation();
  };

  if (loading) return <div>Loading workspace...</div>;
  if (!inv) return <div>Investigation not found.</div>;

  const currentEvent = currentEventIdx >= 0 ? timelineEvents[currentEventIdx] : null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Investigation Workspace"
        title={inv.caseNumber}
        description={inv.title}
        actions={
          <div className="flex gap-2">
            <button onClick={handleDownloadReport} className="flex items-center gap-2 rounded bg-ink-900 text-white px-4 py-2 text-sm hover:bg-ink-800 dark:bg-ink-100 dark:text-ink-900 dark:hover:bg-white">
              <Download className="h-4 w-4" /> Export Report
            </button>
          </div>
        }
      />

      {/* Overview Bar */}
      <div className="grid gap-4 md:grid-cols-4">
        <Panel>
          <div className="text-[10px] uppercase text-ink-400 mb-1">Status</div>
          <Badge tone={statusTone(inv.status)}>{inv.status.replace("_", " ")}</Badge>
        </Panel>
        <Panel>
          <div className="text-[10px] uppercase text-ink-400 mb-1">Priority</div>
          <Badge tone={priorityTone(inv.priority) as any}>{inv.priority}</Badge>
        </Panel>
        <Panel className="md:col-span-2">
          <div className="text-[10px] uppercase text-ink-400 mb-1">Complaint Reference</div>
          <div className="font-mono text-sm">{inv.complaints[0]?.complaintRef || "N/A"}</div>
        </Panel>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        
        {/* Left Column: Timeline & Trail */}
        <div className="lg:col-span-2 space-y-6">
          <Panel>
            <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
              <Clock className="h-5 w-5 text-intel" /> Money Trail Timeline
            </h3>

            {/* Playback Controls */}
            <div className="flex items-center gap-4 bg-ink-50 dark:bg-ink-900 p-3 rounded mb-6">
              <button onClick={() => setCurrentEventIdx(-1)} className="p-2 hover:bg-ink-200 dark:hover:bg-ink-800 rounded"><SkipBack className="h-4 w-4" /></button>
              <button onClick={() => setIsPlaying(!isPlaying)} className="p-2 bg-intel text-white rounded hover:bg-intel/90">
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>
              <button onClick={() => setCurrentEventIdx(timelineEvents.length - 1)} className="p-2 hover:bg-ink-200 dark:hover:bg-ink-800 rounded"><SkipForward className="h-4 w-4" /></button>
              
              <div className="h-6 w-px bg-ink-300 dark:bg-ink-700 mx-2"></div>
              
              <select value={playbackSpeed} onChange={e => setPlaybackSpeed(Number(e.target.value))} className="bg-transparent text-sm outline-none">
                <option value={0.5}>0.5x</option>
                <option value={1}>1.0x</option>
                <option value={2}>2.0x</option>
              </select>

              <div className="flex-1 px-4">
                <input 
                  type="range" min="-1" max={timelineEvents.length - 1} 
                  value={currentEventIdx} 
                  onChange={e => setCurrentEventIdx(Number(e.target.value))}
                  className="w-full accent-intel"
                />
              </div>
            </div>

            {/* Synchronized Map & Event Card */}
            <div className="grid md:grid-cols-2 gap-4 h-64 mb-6">
              <div className="rounded border border-ink-200 dark:border-ink-800 bg-ink-100 overflow-hidden relative">
                 <MapContainer center={[23.9715, 86.8016]} zoom={6} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    {currentEvent && currentEvent.latitude && (
                      <CircleMarker center={[currentEvent.latitude, currentEvent.longitude]} radius={8} pathOptions={{ color: '#fff', fillColor: '#ef4444', fillOpacity: 1 }}>
                        <Popup>{currentEvent.city}</Popup>
                      </CircleMarker>
                    )}
                 </MapContainer>
              </div>

              {currentEvent ? (
                <div className="rounded border border-intel bg-intel/5 p-4 flex flex-col justify-center">
                  <div className="text-xs font-bold text-intel mb-2">{currentEvent.time.toLocaleTimeString()}</div>
                  <div className="text-xl font-mono mb-2">{currentEvent.accountRef}</div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-ink-500 text-xs block">Amount</span> ₹{currentEvent.amount}</div>
                    <div><span className="text-ink-500 text-xs block">Bank</span> {currentEvent.bank}</div>
                    <div><span className="text-ink-500 text-xs block">Location</span> {currentEvent.city}</div>
                    <div><span className="text-ink-500 text-xs block">Role</span> {currentEvent.role}</div>
                  </div>
                </div>
              ) : (
                <div className="rounded border border-ink-200 dark:border-ink-800 bg-ink-50 dark:bg-ink-900/50 flex items-center justify-center text-ink-400 text-sm italic">
                  Press play to trace funds
                </div>
              )}
            </div>

          </Panel>

          {/* Accounts & Risk Summary */}
          <Panel>
            <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
              <ShieldAlert className="h-5 w-5 text-intel" /> High-Risk Accounts Involved
            </h3>
            <div className="space-y-2">
              {inv.accountsContext.filter((a:any) => a.riskProfile?.score >= 50).map((a:any) => (
                <div key={a.id} className="flex justify-between items-center p-3 rounded border border-ink-200 dark:border-ink-800 bg-ink-50 dark:bg-ink-900/30">
                   <div>
                     <div className="font-mono font-bold text-ink-900 dark:text-ink-100">{a.accountRef}</div>
                     <div className="text-xs text-ink-500">Risk Score: {a.riskProfile?.score}</div>
                   </div>
                   <Badge tone={a.watchlistEntry?.status === 'active' ? 'danger' : 'warning'}>
                     {`Watchlist: ${a.watchlistEntry?.status || 'None'}`}
                   </Badge>
                </div>
              ))}
              {inv.accountsContext.filter((a:any) => a.riskProfile?.score >= 50).length === 0 && (
                <p className="text-sm text-ink-500 italic">No high-risk accounts identified in this trail.</p>
              )}
            </div>
          </Panel>
        </div>

        {/* Right Column: Findings, Notes, Activity */}
        <div className="space-y-6">
          <Panel>
            <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
              <FileSignature className="h-5 w-5 text-intel" /> Investigator Findings
            </h3>
            <div className="mb-4">
              <select value={findingType} onChange={e => setFindingType(e.target.value)} className="w-full text-sm p-2 mb-2 rounded border border-ink-300 dark:border-ink-700 bg-white dark:bg-ink-900">
                <option value="OBSERVATION">Observation</option>
                <option value="CORRELATION">Correlation</option>
                <option value="RISK_ASSESSMENT">Risk Assessment</option>
                <option value="LOCATION_ASSESSMENT">Location Assessment</option>
                <option value="CONCLUSION">Conclusion</option>
              </select>
              <textarea 
                placeholder="Log a formal finding..." 
                value={findingDesc} onChange={e => setFindingDesc(e.target.value)}
                className="w-full text-sm p-2 rounded border border-ink-300 dark:border-ink-700 bg-white dark:bg-ink-900" rows={3}
              />
              <button onClick={handleAddFinding} className="mt-2 w-full bg-intel text-white text-sm py-2 rounded font-medium flex justify-center items-center gap-1">
                <Save className="h-4 w-4"/> Save Finding
              </button>
            </div>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {inv.findings.map((f:any) => (
                <div key={f.id} className="p-3 rounded border border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-950 text-sm">
                  <div className="flex justify-between items-center mb-1">
                    <Badge tone="intel">{f.type}</Badge>
                    <span className="text-[10px] text-ink-400">{new Date(f.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-ink-700 dark:text-ink-300">{f.description}</p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-intel" /> Notes
            </h3>
            <div className="mb-4 flex gap-2">
              <input type="text" value={noteContent} onChange={e => setNoteContent(e.target.value)} placeholder="Quick observation..." className="flex-1 text-sm p-2 rounded border border-ink-300 dark:border-ink-700 bg-white dark:bg-ink-900" onKeyDown={e => e.key === 'Enter' && handleAddNote()} />
              <button onClick={handleAddNote} className="bg-ink-900 dark:bg-ink-100 text-white dark:text-ink-900 px-3 rounded font-medium text-sm">Add</button>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
               {inv.investigationNotes.map((n:any) => (
                 <div key={n.id} className="text-sm p-2 bg-ink-50 dark:bg-ink-900/50 rounded">
                   <span className="font-semibold">{n.author}:</span> {n.content}
                 </div>
               ))}
            </div>
          </Panel>

        </div>
      </div>
    </div>
  );
}
