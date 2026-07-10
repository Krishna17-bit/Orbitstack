"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { 
  Database, 
  Cpu, 
  Activity, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Play, 
  Heart
} from "lucide-react";

export default function TwinsPage() {
  const [twins, setTwins] = useState<any[]>([]);
  const [selectedTwinId, setSelectedTwinId] = useState<number | null>(null);
  const [selectedTwin, setSelectedTwin] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [replaying, setReplaying] = useState(false);
  const [replayEvents, setReplayEvents] = useState<any[]>([]);

  const fetchTwins = async () => {
    try {
      const data = await api.getTwins();
      setTwins(data || []);
      if (data.length > 0 && selectedTwinId === null) {
        setSelectedTwinId(data[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTwins();
  }, []);

  useEffect(() => {
    if (selectedTwinId !== null) {
      const twin = twins.find(t => t.id === selectedTwinId);
      setSelectedTwin(twin);
      fetchTwinTimeline(selectedTwinId);
    }
  }, [selectedTwinId, twins]);

  const fetchTwinTimeline = async (id: number) => {
    try {
      const data = await api.getTwinTimeline(id);
      setTimeline(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateSnapshot = async () => {
    if (selectedTwinId === null) return;
    try {
      await api.planRecovery(selectedTwin.node_id); // Runs mock-trigger update to create logs
      await api.getMLPrediction(selectedTwin.node_id); // Updates twin telemetry & inserts snapshot
      fetchTwins();
      alert("State snapshot registered in database.");
    } catch (err: any) {
      alert("Snapshot failed: " + err.message);
    }
  };

  const handleReplay = async () => {
    if (selectedTwinId === null) return;
    setReplaying(true);
    try {
      const res = await api.replayTwin(selectedTwinId);
      setReplayEvents(res.failure_events || []);
    } catch (err) {
      console.error(err);
    } finally {
      setReplaying(false);
    }
  };

  const getHealthBadge = (state: string) => {
    switch (state) {
      case "online":
        return <span className="text-emerald-400 bg-emerald-950/40 border border-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold">NOMINAL</span>;
      case "degraded":
        return <span className="text-amber-400 bg-amber-950/40 border border-amber-800 px-2 py-0.5 rounded text-[10px] font-bold animate-pulse">DEGRADED</span>;
      default:
        return <span className="text-red-400 bg-red-950/40 border border-red-800 px-2 py-0.5 rounded text-[10px] font-bold">OFFLINE</span>;
    }
  };

  return (
    <div className="p-8 bg-zinc-50 min-h-screen">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-200 pb-6 mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-zinc-950 font-mono">DIGITAL TWIN ENGINE</h2>
          <p className="text-zinc-500 text-sm mt-1 uppercase font-mono tracking-wider">Persistent hardware replication & aging analytics</p>
        </div>
        <div className="flex items-center gap-4">
          <label className="font-mono text-xs text-zinc-500 uppercase">Selected Twin:</label>
          <select 
            value={selectedTwinId || ""}
            onChange={(e) => {
              setSelectedTwinId(Number(e.target.value));
              setReplayEvents([]);
            }}
            className="bg-black text-white px-3 py-2 text-xs font-mono font-bold focus:outline-none rounded border border-zinc-800"
          >
            {twins.map((t) => (
              <option key={t.id} value={t.id}>Twin #{t.id} (Node: {t.node_id})</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-80 font-mono text-xs text-zinc-500">
          UPLINKING DIGITAL TWINS...
        </div>
      ) : selectedTwin ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Twin Metrics Overview Card */}
          <div className="space-y-6">
            <div className="bg-black text-white p-6 rounded shadow-xl border border-zinc-800 font-mono text-xs">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-3 mb-4">
                <h3 className="text-sm font-extrabold text-zinc-300 uppercase flex items-center gap-2">
                  <Database size={14} className="text-zinc-500" />
                  Twin Profiles
                </h3>
                {getHealthBadge(selectedTwin.health_state)}
              </div>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-zinc-500">DEPLOYMENT ZONE</span>
                  <span className="font-bold text-white uppercase">{selectedTwin.deployment_region}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">SILICON CORE ARCH</span>
                  <span className="font-bold text-white uppercase">{selectedTwin.node_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">TOTAL EXPOSURE DOSE</span>
                  <span className="font-bold text-white">{selectedTwin.radiation_dose.toFixed(2)} Rads</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">TOTAL ACCUMULATED SEUs</span>
                  <span className="font-bold text-white">{selectedTwin.seu_count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">TOTAL RUNTIME UPTIME</span>
                  <span className="font-bold text-white">{selectedTwin.total_uptime.toFixed(1)} hrs</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">CALCULATED MTBF</span>
                  <span className="font-bold text-amber-400">{selectedTwin.mtbf} hrs</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">PROJECTED LIFETIME</span>
                  <span className="font-bold text-white">{selectedTwin.projected_lifetime_hours.toFixed(0)} hrs remaining</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">RELIABILITY INDEX</span>
                  <span className="font-bold text-emerald-400">{selectedTwin.reliability_score}%</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-6 pt-4 border-t border-zinc-800">
                <button
                  onClick={handleCreateSnapshot}
                  className="bg-zinc-900 border border-zinc-800 text-zinc-300 p-2.5 hover:bg-zinc-800 transition-all rounded font-bold text-[10px]"
                >
                  CAPTURE STATE SNAPSHOT
                </button>
                <button
                  onClick={handleReplay}
                  className="bg-white text-black p-2.5 hover:bg-zinc-200 transition-all rounded font-bold text-[10px] flex items-center justify-center gap-1.5"
                >
                  <Play size={10} fill="black" />
                  REPLAY HISTORICAL SEUs
                </button>
              </div>
            </div>

            {/* Microstructural Degradation Card */}
            <div className="bg-black text-white p-6 rounded shadow-xl border border-zinc-800 font-mono text-xs">
              <h3 className="text-sm font-extrabold border-b border-zinc-800 pb-3 mb-4 text-zinc-300 uppercase">
                AGING & DEGRADATION COEFFICIENTS
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-zinc-500">SILICON FATIGUE INDEX</span>
                    <span className="text-white font-extrabold">{selectedTwin.degradation_score.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-zinc-900 h-2 rounded overflow-hidden">
                    <div 
                      className="bg-red-500 h-2 transition-all duration-500" 
                      style={{ width: `${selectedTwin.degradation_score}%` }}
                    ></div>
                  </div>
                </div>
                <div className="text-[10px] text-zinc-500 leading-relaxed font-sans">
                  The twin calculates microstructural silicon aging velocity based on cumulative thermal cycle delta-T stress combined with heavy particle dose absorption levels.
                </div>
              </div>
            </div>
          </div>

          {/* Time Series History Plot Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Timeline Snapshot Replays */}
            <div className="bg-black text-white p-6 rounded shadow-xl border border-zinc-800">
              <h3 className="text-sm font-extrabold tracking-widest font-mono border-b border-zinc-800 pb-3 mb-4 text-zinc-300 uppercase">
                STATE REPLAY FEED (HISTORICAL ANOMALY TIMELINE)
              </h3>
              
              <div className="bg-zinc-950 p-4 rounded border border-zinc-900 font-mono text-xs min-h-[140px] max-h-[220px] overflow-y-auto space-y-2 text-zinc-400">
                {replayEvents.length > 0 ? (
                  replayEvents.map((evt, idx) => (
                    <div key={idx} className="flex gap-4 border-b border-zinc-900 pb-1.5">
                      <span className="text-zinc-600 select-none">[{new Date(evt.timestamp).toLocaleTimeString()}]</span>
                      <span className="text-red-400 font-bold">SEU DETECTED</span>
                      <span className="text-zinc-300">Radiation Dose: {evt.radiation.toFixed(2)} Rads</span>
                      <span className="text-zinc-500 ml-auto">Temp: {evt.temp}°C</span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 text-zinc-600 uppercase">
                    No active failures to replay in history. Core is nominal.
                  </div>
                )}
              </div>
            </div>

            {/* Historical Telemetry logs table */}
            <div className="bg-black text-white p-6 rounded shadow-xl border border-zinc-800">
              <h3 className="text-sm font-extrabold tracking-widest font-mono border-b border-zinc-800 pb-3 mb-4 text-zinc-300 uppercase">
                CHRONOLOGICAL REPLICATE SNAPSHOTS
              </h3>
              
              <div className="overflow-x-auto max-h-[200px] no-scrollbar">
                <table className="w-full text-left font-mono text-[10px] text-zinc-400">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-500 font-bold uppercase tracking-wider">
                      <th className="py-2">TIMESTAMP</th>
                      <th className="py-2">RELIABILITY INDEX</th>
                      <th className="py-2">ABSORBED DOSE</th>
                      <th className="py-2 text-right">OPERATING HEALTH</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900">
                    {timeline.map((snap, idx) => (
                      <tr key={idx} className="hover:bg-zinc-950 transition-colors">
                        <td className="py-2 text-zinc-500">{new Date(snap.timestamp).toLocaleString()}</td>
                        <td className="py-2 font-bold text-white">{snap.reliability_score}%</td>
                        <td className="py-2 text-zinc-300">{snap.radiation.toFixed(2)} Rads</td>
                        <td className="py-2 text-right">
                          <span className={`px-2 py-0.5 rounded text-[8px] border font-bold uppercase ${
                            snap.health_state === "online" 
                              ? "bg-emerald-950 text-emerald-400 border-emerald-800" 
                              : snap.health_state === "degraded"
                              ? "bg-amber-950 text-amber-400 border-amber-800 animate-pulse"
                              : "bg-red-950 text-red-400 border-red-800"
                          }`}>
                            {snap.health_state}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {timeline.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-zinc-600 uppercase">No replicate snapshots registered.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center text-zinc-500 font-mono text-sm border border-zinc-200 bg-white rounded shadow-sm">
          Please add a node to seed digital twins.
        </div>
      )}
    </div>
  );
}
