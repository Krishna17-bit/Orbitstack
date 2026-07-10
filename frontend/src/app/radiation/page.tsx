"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { 
  Radio, 
  Layers, 
  Cpu, 
  Activity, 
  Shield, 
  HelpCircle,
  RefreshCw,
  Zap
} from "lucide-react";

export default function RadiationPage() {
  const [nodes, setNodes] = useState<any[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  
  const [intensity, setIntensity] = useState<number>(1.0);
  const [memoryMap, setMemoryMap] = useState<Record<string, string>>({});
  const [predictedRate, setPredictedRate] = useState<number>(0.0);
  const [history, setHistory] = useState<any[]>([]);
  const [simulating, setSimulating] = useState(false);

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
      fetchNodeRadiationStats(selectedNodeId);
    }
  }, [selectedNodeId, nodes]);

  const fetchNodeRadiationStats = async (id: number) => {
    try {
      const historyData = await api.getSimulationHistory(id);
      setHistory(historyData);
      if (historyData.length > 0) {
        setPredictedRate(historyData[0].predicted_fault_rate);
        if (historyData[0].memory_map) {
          setMemoryMap(JSON.parse(historyData[0].memory_map));
        } else {
          setMemoryMap({});
        }
      } else {
        setMemoryMap({});
        setPredictedRate(0.0);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSimulate = async () => {
    if (selectedNodeId === null) return;
    setSimulating(true);
    try {
      const result = await api.runSimulation(selectedNodeId, intensity);
      setPredictedRate(result.predicted_fault_rate);
      if (result.memory_map) {
        setMemoryMap(JSON.parse(result.memory_map));
      } else {
        setMemoryMap({});
      }
      
      // Refresh nodes to show status change
      fetchNodes();
    } catch (err: any) {
      alert("Simulation failed: " + err.message);
    } finally {
      setSimulating(false);
    }
  };

  // Helper to count memory state distribution
  const countState = (state: string) => {
    return Object.values(memoryMap).filter(s => s === state).length;
  };

  const correctedCount = countState("ECC_CORRECTED");
  const corruptCount = countState("CRITICAL_CORRUPT");
  const okCount = 1024 - correctedCount - corruptCount;

  return (
    <div className="p-8 bg-zinc-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-200 pb-6 mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-zinc-950 font-mono">RADIATION FAULT CONSOLE</h2>
          <p className="text-zinc-500 text-sm mt-1 uppercase font-mono tracking-wider">Physics-based Single Event Upset (SEU) injection cockpit</p>
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
            {/* Environment Overview Card */}
            <div className="bg-black text-white p-6 rounded shadow-xl border border-zinc-800 font-mono text-xs">
              <h3 className="text-sm font-extrabold border-b border-zinc-800 pb-3 mb-4 text-zinc-300 uppercase">NODE CONFIGURATION</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-zinc-500">ENVIRONMENT TYPE</span>
                  <span className="font-bold text-white uppercase">{selectedNode.environment}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">ORBIT/PHYSICAL LOCATION</span>
                  <span className="font-bold text-white uppercase">{selectedNode.region}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">HARDWARE TYPE</span>
                  <span className="font-bold text-white uppercase">{selectedNode.device_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">AL SHIELDING THICKNESS</span>
                  <span className="font-bold text-white">{selectedNode.shielding} mm</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500">CURRENT HEALTH</span>
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                    selectedNode.status === "online" 
                      ? "bg-emerald-950 text-emerald-400 border-emerald-800" 
                      : selectedNode.status === "degraded"
                      ? "bg-amber-950 text-amber-400 border-amber-800"
                      : "bg-red-950 text-red-400 border-red-800"
                  }`}>
                    {selectedNode.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Radiation Tweak Controls Card */}
            <div className="bg-black text-white p-6 rounded shadow-xl border border-zinc-800 font-mono text-xs">
              <h3 className="text-sm font-extrabold border-b border-zinc-800 pb-3 mb-4 text-zinc-300 uppercase">SIMULATE ENERGETIC FLUX</h3>
              
              <div className="space-y-5">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-zinc-500">SIMULATION INTENSITY (FLUX)</span>
                    <span className="text-white font-extrabold">{intensity}x</span>
                  </div>
                  <input 
                    type="range" 
                    min="0.1" 
                    max="10.0" 
                    step="0.1" 
                    value={intensity}
                    onChange={(e) => setIntensity(parseFloat(e.target.value))}
                    className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white"
                  />
                  <div className="flex justify-between text-[10px] text-zinc-600 mt-1">
                    <span>MIN (0.1x)</span>
                    <span>MAX (10x)</span>
                  </div>
                </div>

                <div className="border border-zinc-800 bg-zinc-950 p-4 rounded space-y-2">
                  <div className="flex justify-between">
                    <span className="text-zinc-500 uppercase">PREDICTED SEU RATE</span>
                    <span className="text-amber-400 font-bold">{(predictedRate * intensity).toFixed(3)}/hr</span>
                  </div>
                  <div className="text-[10px] text-zinc-500 mt-1">
                    Calculated using device physical geometry, orbital location base flux, and shielding barrier absorption coefs.
                  </div>
                </div>

                <button 
                  onClick={handleSimulate}
                  disabled={simulating}
                  className="w-full flex items-center justify-center gap-2 bg-white text-black p-3 text-xs font-bold hover:bg-zinc-200 transition-all rounded shadow-md font-mono"
                >
                  {simulating ? <RefreshCw className="animate-spin" size={14} /> : <Zap size={14} />}
                  TRIGGER PARTICLE IMMERSION
                </button>
              </div>
            </div>
          </div>

          {/* Grid memory map Column */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-black text-white p-6 rounded shadow-xl border border-zinc-800 flex flex-col justify-between">
              <div>
                <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-800 pb-3 mb-4 gap-2">
                  <h3 className="text-sm font-extrabold tracking-widest font-mono text-zinc-300 uppercase">VRAM MEMORY BIT MAP (1024 PAGE BLOCK REGISTERS)</h3>
                  <div className="flex items-center gap-4 text-[10px] font-mono font-bold text-zinc-400">
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-emerald-500 rounded-sm"></span> OK ({okCount})</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-amber-500 rounded-sm"></span> SOFT SEU ({correctedCount})</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-red-500 rounded-sm animate-pulse"></span> HARD FAILURE ({corruptCount})</span>
                  </div>
                </div>

                {/* 32x32 Grid Layout */}
                <div className="grid gap-px bg-zinc-950 p-2 rounded max-w-full overflow-hidden border border-zinc-900 aspect-square" style={{ gridTemplateColumns: "repeat(32, minmax(0, 1fr))" }}>
                  {Array.from({ length: 1024 }).map((_, idx) => {
                    const cellState = memoryMap[idx.toString()] || "ECC_OK";
                    let bgClass = "bg-emerald-500/20 border-emerald-950 hover:bg-emerald-400/40";
                    if (cellState === "ECC_CORRECTED") {
                      bgClass = "bg-amber-500 border-amber-600 hover:bg-amber-400";
                    } else if (cellState === "CRITICAL_CORRUPT") {
                      bgClass = "bg-red-500 border-red-600 animate-pulse hover:bg-red-400";
                    }

                    return (
                      <div 
                        key={idx}
                        className={`w-full aspect-square border transition-all duration-150 cursor-crosshair ${bgClass}`}
                        title={`Block 0x${idx.toString(16).toUpperCase()} state: ${cellState}`}
                      />
                    );
                  })}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-zinc-800 text-[10px] text-zinc-500 font-mono flex items-center justify-between">
                <span>SEU: Single Event Upset</span>
                <span className="uppercase">VIRTUAL ADDRESS CORRUPTION MATRIX</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center text-zinc-500 font-mono text-sm border border-zinc-200 bg-white rounded shadow-sm">
          Please add a node from the Overview console before starting simulations.
        </div>
      )}
    </div>
  );
}
