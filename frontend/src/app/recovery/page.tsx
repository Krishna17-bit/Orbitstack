"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { 
  RefreshCw, 
  Activity, 
  Layers, 
  CheckCircle2, 
  ServerCrash, 
  ArrowRight, 
  Terminal,
  Play
} from "lucide-react";

export default function RecoveryPage() {
  const [nodes, setNodes] = useState<any[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  
  const [tmrNodes, setTmrNodes] = useState<string[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [activePlan, setActivePlan] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);

  const fetchNodesAndHistory = async () => {
    try {
      const [nodesData, historyData, tmrData] = await Promise.all([
        api.getNodes(),
        api.getRecoveryHistory(),
        api.getTmrRecommendations()
      ]);
      setNodes(nodesData);
      setHistory(historyData);
      setTmrNodes(tmrData.triple_modular_redundancy_placement || []);

      // Autoselect first degraded/offline node if available
      const brokenNodes = (nodesData as any[]).filter((n: any) => n.status !== "online");
      if (brokenNodes.length > 0 && selectedNodeId === null) {
        setSelectedNodeId(brokenNodes[0].id);
      } else if (nodesData.length > 0 && selectedNodeId === null) {
        setSelectedNodeId(nodesData[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchNodesAndHistory();
    const interval = setInterval(fetchNodesAndHistory, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleGeneratePlan = async () => {
    if (selectedNodeId === null) return;
    setLoading(true);
    try {
      const plan = await api.planRecovery(selectedNodeId);
      setActivePlan(plan);
      fetchNodesAndHistory();
    } catch (err: any) {
      alert("Error planning recovery: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteRecovery = async () => {
    if (!activePlan) return;
    setExecuting(true);
    try {
      await api.executeRecovery(activePlan.id);
      setActivePlan(null);
      
      // Refresh telemetry
      fetchNodesAndHistory();
    } catch (err: any) {
      alert("Execution failed: " + err.message);
    } finally {
      setExecuting(false);
    }
  };

  const activeNode = nodes.find(n => n.id === selectedNodeId);

  return (
    <div className="p-8 bg-zinc-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-200 pb-6 mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-zinc-950 font-mono">RECOVERY CONSOLE</h2>
          <p className="text-zinc-500 text-sm mt-1 uppercase font-mono tracking-wider">TMR replica layout & container routing automation</p>
        </div>
        <div className="flex items-center gap-4">
          <label className="font-mono text-xs text-zinc-500 uppercase">Core under review:</label>
          <select 
            value={selectedNodeId || ""}
            onChange={(e) => {
              setSelectedNodeId(Number(e.target.value));
              setActivePlan(null);
            }}
            className="bg-black text-white px-3 py-2 text-xs font-mono font-bold focus:outline-none rounded border border-zinc-800"
          >
            {nodes.map((n) => (
              <option key={n.id} value={n.id}>{n.name} ({n.status.toUpperCase()})</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left TMR Card and Plan trigger */}
        <div className="space-y-6">
          {/* TMR Placement recommendation card */}
          <div className="bg-black text-white p-6 rounded shadow-xl border border-zinc-800 font-mono text-xs">
            <h3 className="text-sm font-extrabold border-b border-zinc-800 pb-3 mb-4 text-zinc-300 uppercase">
              TMR PLACEMENT RECOMMENDATION
            </h3>
            <p className="text-zinc-500 mb-4 leading-relaxed font-sans text-[11px]">
              Triple Modular Redundancy (TMR) deploys 3 parallel compute processes across distinct nodes. Recommended active TMR placements:
            </p>
            <div className="space-y-2">
              {tmrNodes.map((nodeName, idx) => (
                <div key={idx} className="flex items-center gap-3 bg-zinc-950 p-2.5 rounded border border-zinc-900">
                  <span className="w-5 h-5 rounded-full bg-white text-black font-extrabold flex items-center justify-center text-[10px]">
                    {idx + 1}
                  </span>
                  <span className="font-bold text-white uppercase">{nodeName}</span>
                </div>
              ))}
              {tmrNodes.length === 0 && (
                <div className="text-center py-4 text-zinc-600 uppercase">Searching active zones...</div>
              )}
            </div>
          </div>

          {/* Trigger Plan Button Card */}
          <div className="bg-black text-white p-6 rounded shadow-xl border border-zinc-800 font-mono text-xs">
            <h3 className="text-sm font-extrabold border-b border-zinc-800 pb-3 mb-4 text-zinc-300 uppercase">
              RECONSTRUCT PIPELINE
            </h3>
            {activeNode ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-zinc-500 font-bold">CORE HOST</span>
                    <span className="text-white uppercase">{activeNode.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500 font-bold">OPERATING STATE</span>
                    <span className={`font-bold uppercase ${activeNode.status === "online" ? "text-emerald-400" : "text-amber-400"}`}>
                      {activeNode.status}
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleGeneratePlan}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-white text-black p-3 text-xs font-bold hover:bg-zinc-200 transition-all rounded shadow-md font-mono"
                >
                  {loading ? <RefreshCw className="animate-spin" size={14} /> : <Activity size={14} />}
                  FORMULATE DISASTER RECOVERY RECIPE
                </button>
              </div>
            ) : (
              <div className="text-center text-zinc-600">Select a core to plan recovery.</div>
            )}
          </div>
        </div>

        {/* Center Plan execution output column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Plan Recipe Terminal output */}
          <div className="bg-black text-white p-6 rounded shadow-xl border border-zinc-800">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3 mb-4">
              <h3 className="text-sm font-extrabold tracking-widest font-mono text-zinc-300 uppercase flex items-center gap-2">
                <Terminal size={14} className="text-zinc-500" />
                FAILOVER PIPELINE TERMINAL
              </h3>
              {activePlan && (
                <button
                  onClick={handleExecuteRecovery}
                  disabled={executing}
                  className="flex items-center gap-1.5 bg-emerald-500 text-black px-3 py-1.5 rounded text-[10px] font-extrabold font-mono hover:bg-emerald-400 transition-all shadow"
                >
                  {executing ? <RefreshCw className="animate-spin" size={12} /> : <Play size={12} fill="black" />}
                  EXECUTE PIPELINE
                </button>
              )}
            </div>

            <div className="bg-zinc-950 p-4 rounded border border-zinc-900 font-mono text-xs min-h-[160px] overflow-y-auto max-h-[280px] space-y-2 text-emerald-400">
              {activePlan ? (
                <>
                  <div className="text-zinc-500 uppercase tracking-widest border-b border-zinc-900 pb-1 mb-2 text-[10px]">
                    GENERATED RECIPE #00{activePlan.id} {"//"} STATUS: PENDING
                  </div>
                  {JSON.parse(activePlan.steps).map((step: string, idx: number) => (
                    <div key={idx} className="flex gap-2">
                      <span className="text-zinc-600 select-none">[{idx + 1}]</span>
                      <span className="text-zinc-200">{step}</span>
                    </div>
                  ))}
                </>
              ) : (
                <div className="text-center py-12 text-zinc-600 uppercase">
                  Uplink ready. Formulate recipe to compile recovery instructions.
                </div>
              )}
            </div>
          </div>

          {/* Recovery Log Timeline list */}
          <div className="bg-black text-white p-6 rounded shadow-xl border border-zinc-800">
            <h3 className="text-sm font-extrabold tracking-widest font-mono border-b border-zinc-800 pb-3 mb-4 text-zinc-300 uppercase">
              HISTORICAL RECOVERY EVENTS
            </h3>
            <div className="overflow-x-auto max-h-[160px] no-scrollbar">
              <table className="w-full text-left font-mono text-[10px] text-zinc-400">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500 uppercase font-bold tracking-wider">
                    <th className="py-2">TIMESTAMP</th>
                    <th className="py-2">AFFECTED CORE</th>
                    <th className="py-2">FAILOVER DESTINATION</th>
                    <th className="py-2 text-right">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900">
                  {history.map((hLog) => {
                    const src = nodes.find(n => n.id === hLog.node_id);
                    const tgt = nodes.find(n => n.id === hLog.failover_target_id);
                    return (
                      <tr key={hLog.id} className="hover:bg-zinc-950 transition-colors">
                        <td className="py-2.5 text-zinc-500">{new Date(hLog.timestamp).toLocaleString()}</td>
                        <td className="py-2.5 font-bold text-white uppercase">{src ? src.name : `Core #${hLog.node_id}`}</td>
                        <td className="py-2.5 font-bold text-white uppercase">
                          {tgt ? (
                            <span className="flex items-center gap-1">
                              <ArrowRight size={10} className="text-zinc-600" />
                              {tgt.name}
                            </span>
                          ) : (
                            <span className="text-zinc-600">NONE</span>
                          )}
                        </td>
                        <td className="py-2.5 text-right font-bold uppercase">
                          <span className={`px-2 py-0.5 rounded text-[8px] border ${
                            hLog.status === "completed" 
                              ? "bg-emerald-950 text-emerald-400 border-emerald-800" 
                              : "bg-amber-950 text-amber-400 border-amber-800 animate-pulse"
                          }`}>
                            {hLog.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {history.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-zinc-600 uppercase">No historical recovery pipelines executed.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
