"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  RefreshCw,
  Sliders,
  Play
} from "lucide-react";

export default function EccPage() {
  const [nodes, setNodes] = useState<any[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [selectedNode, setSelectedNode] = useState<any>(null);

  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Custom Trigger inputs
  const [correctableInput, setCorrectableInput] = useState("10");
  const [uncorrectableInput, setUncorrectableInput] = useState("0");

  const fetchNodes = async () => {
    try {
      const nodesData = await api.getNodes();
      setNodes(nodesData);
      if (nodesData.length > 0 && selectedNodeId === null) {
        setSelectedNodeId(nodesData[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchNodes();
  }, []);

  useEffect(() => {
    if (selectedNodeId !== null) {
      const node = nodes.find(n => n.id === selectedNodeId);
      setSelectedNode(node);
      fetchNodeEccStats(selectedNodeId);
    }
  }, [selectedNodeId, nodes]);

  const fetchNodeEccStats = async (id: number) => {
    try {
      setLoading(true);
      const data = await api.getEccHistory(id);
      setHistory(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerBurst = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedNodeId === null) return;
    try {
      const corr = parseInt(correctableInput) || 0;
      const uncorr = parseInt(uncorrectableInput) || 0;

      await api.triggerEccBurst(selectedNodeId, corr, uncorr);
      
      // Reset input fields
      setCorrectableInput("0");
      setUncorrectableInput("0");
      
      // Reload stats
      fetchNodes();
      fetchNodeEccStats(selectedNodeId);
    } catch (err: any) {
      alert("Trigger failed: " + err.message);
    }
  };

  const totalCorrectable = history.reduce((sum, d) => sum + d.correctable_errors, 0);
  const totalUncorrectable = history.reduce((sum, d) => sum + d.uncorrectable_errors, 0);

  // Compute status icon
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "online":
        return (
          <span className="flex items-center gap-1.5 text-emerald-400 font-extrabold bg-emerald-950/40 border border-emerald-800 px-2 py-0.5 rounded text-[10px] tracking-wider uppercase">
            <CheckCircle2 size={12} />
            NOMINAL
          </span>
        );
      case "degraded":
        return (
          <span className="flex items-center gap-1.5 text-amber-400 font-extrabold bg-amber-950/40 border border-amber-800 px-2 py-0.5 rounded text-[10px] tracking-wider uppercase animate-pulse">
            <AlertTriangle size={12} />
            DEGRADED
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 text-red-400 font-extrabold bg-red-950/40 border border-red-800 px-2 py-0.5 rounded text-[10px] tracking-wider uppercase">
            <XCircle size={12} />
            CRITICAL
          </span>
        );
    }
  };

  return (
    <div className="p-8 bg-zinc-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-200 pb-6 mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-zinc-950 font-mono">ECC HEALTH MONITOR</h2>
          <p className="text-zinc-500 text-sm mt-1 uppercase font-mono tracking-wider">Error Correcting Code Anomaly Logs & Health Thresholds</p>
        </div>
        <div className="flex items-center gap-4">
          <label className="font-mono text-xs text-zinc-500 uppercase">Target Core:</label>
          <select 
            value={selectedNodeId || ""}
            onChange={(e) => setSelectedNodeId(Number(e.target.value))}
            className="bg-black text-white px-3 py-2 text-xs font-mono font-bold focus:outline-none rounded border border-zinc-800"
          >
            {nodes.map((n) => (
              <option key={n.id} value={n.id}>{n.name} ({n.region})</option>
            ))}
          </select>
        </div>
      </div>

      {selectedNode ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Controls Column */}
          <div className="space-y-6">
            {/* Status overview */}
            <div className="bg-black text-white p-6 rounded shadow-xl border border-zinc-800 font-mono text-xs">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-3 mb-4">
                <h3 className="text-sm font-extrabold text-zinc-300 uppercase">CORE HARDWARE HEALTH</h3>
                {getStatusBadge(selectedNode.status)}
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-zinc-500">CUMULATIVE SOFT SEUs</span>
                  <span className="font-bold text-white">{totalCorrectable}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">CUMULATIVE HARD SEUs</span>
                  <span className="font-bold text-white">{totalUncorrectable}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">ECC STATUS REGISTER</span>
                  <span className="font-bold text-white">0x00F3A412</span>
                </div>
              </div>
            </div>

            {/* Manual Anomaly Injection Form */}
            <div className="bg-black text-white p-6 rounded shadow-xl border border-zinc-800 font-mono text-xs">
              <h3 className="text-sm font-extrabold border-b border-zinc-800 pb-3 mb-4 text-zinc-300 uppercase">
                ECC FAULT INJECTOR
              </h3>
              <form onSubmit={handleTriggerBurst} className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-zinc-500">SINGLE-BIT CORRECTABLE FAULTS</label>
                  <input 
                    type="number" 
                    value={correctableInput}
                    onChange={(e) => setCorrectableInput(e.target.value)}
                    className="bg-zinc-900 border border-zinc-800 p-2.5 rounded text-white focus:outline-none focus:border-zinc-500"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-zinc-500">MULTI-BIT UNCORRECTABLE FAULTS</label>
                  <input 
                    type="number" 
                    value={uncorrectableInput}
                    onChange={(e) => setUncorrectableInput(e.target.value)}
                    className="bg-zinc-900 border border-zinc-800 p-2.5 rounded text-white focus:outline-none focus:border-zinc-500"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 bg-white text-black p-3 text-xs font-bold hover:bg-zinc-200 transition-all rounded shadow-md font-mono"
                >
                  <Play size={12} fill="black" />
                  INJECT ERROR PULSE
                </button>
              </form>
            </div>
          </div>

          {/* Anomaly Log List Column */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-black text-white p-6 rounded shadow-xl border border-zinc-800">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-3 mb-4">
                <h3 className="text-sm font-extrabold tracking-widest font-mono text-zinc-300 uppercase">
                  ECC TELEMETRY TIMELINE LOGS
                </h3>
                <button 
                  onClick={() => fetchNodeEccStats(selectedNode.id)}
                  className="p-1 border border-zinc-800 rounded hover:bg-zinc-900"
                  title="Reload Logs"
                >
                  <RefreshCw size={12} />
                </button>
              </div>

              <div className="overflow-x-auto max-h-[420px] no-scrollbar">
                <table className="w-full text-left font-mono text-xs text-zinc-400">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-500 text-[10px] tracking-wider">
                      <th className="py-2">TIMESTAMP</th>
                      <th className="py-2">CORRECTABLE (SINGLE-BIT)</th>
                      <th className="py-2">UNCORRECTABLE (MULTI-BIT)</th>
                      <th className="py-2 text-right">POST-LOG STATE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900">
                    {history.map((log) => (
                      <tr key={log.id} className="hover:bg-zinc-950 transition-colors">
                        <td className="py-3 text-zinc-500">{new Date(log.timestamp).toLocaleString()}</td>
                        <td className="py-3 text-white font-semibold">{log.correctable_errors}</td>
                        <td className="py-3 text-white font-semibold">{log.uncorrectable_errors}</td>
                        <td className="py-3 text-right">
                          <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                            log.status === "online" 
                              ? "bg-emerald-950 text-emerald-400 border-emerald-800" 
                              : log.status === "degraded"
                              ? "bg-amber-950 text-amber-400 border-amber-800 animate-pulse"
                              : "bg-red-950 text-red-400 border-red-800"
                          }`}>
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {history.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-zinc-600 uppercase">No active registers matching telemetry logs.</td>
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
          Please add a node from the Overview console to begin ECC monitoring.
        </div>
      )}
    </div>
  );
}
