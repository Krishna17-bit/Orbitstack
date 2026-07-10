"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { 
  Terminal, 
  Cpu, 
  Activity, 
  RefreshCw, 
  Play, 
  ShieldAlert,
  ArrowRight
} from "lucide-react";

export default function KernelsPage() {
  const [kernels, setKernels] = useState<any[]>([]);
  const [selectedKernelId, setSelectedKernelId] = useState<number | null>(null);
  const [selectedKernel, setSelectedKernel] = useState<any>(null);
  
  const [bitFlips, setBitFlips] = useState("10");
  const [regCorrupts, setRegCorrupts] = useState("2");
  
  const [activeResult, setActiveResult] = useState<any>(null);
  const [simulating, setSimulating] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  const fetchKernels = async () => {
    try {
      const data = await api.getKernels();
      setKernels(data || []);
      if (data.length > 0 && selectedKernelId === null) {
        setSelectedKernelId(data[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchKernels();
  }, []);

  useEffect(() => {
    if (selectedKernelId !== null) {
      const kernel = kernels.find(k => k.id === selectedKernelId);
      setSelectedKernel(kernel);
      fetchKernelRuns(selectedKernelId);
    }
  }, [selectedKernelId, kernels]);

  const fetchKernelRuns = async (id: number) => {
    try {
      const data = await api.getKernelRuns(id);
      setHistory(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedKernelId === null) return;
    setSimulating(true);
    try {
      const result = await api.simulateKernel({
        profile_id: selectedKernelId,
        bit_flips: parseInt(bitFlips) || 0,
        register_corruptions: parseInt(regCorrupts) || 0
      });
      setActiveResult(result);
      fetchKernelRuns(selectedKernelId);
    } catch (err: any) {
      alert("Simulation failed: " + err.message);
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="p-8 bg-zinc-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-200 pb-6 mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-zinc-950 font-mono">CUDA KERNEL SANDBOX</h2>
          <p className="text-zinc-500 text-sm mt-1 uppercase font-mono tracking-wider">Register bit-flip injection & thread serialization modeling</p>
        </div>
        <div className="flex items-center gap-4">
          <label className="font-mono text-xs text-zinc-500 uppercase">Target Kernel:</label>
          <select 
            value={selectedKernelId || ""}
            onChange={(e) => {
              setSelectedKernelId(Number(e.target.value));
              setActiveResult(null);
            }}
            className="bg-black text-white px-3 py-2 text-xs font-mono font-bold focus:outline-none rounded border border-zinc-800"
          >
            {kernels.map((k) => (
              <option key={k.id} value={k.id}>{k.name}</option>
            ))}
          </select>
        </div>
      </div>

      {selectedKernel ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form and configs */}
          <div className="space-y-6">
            {/* Properties Card */}
            <div className="bg-black text-white p-6 rounded shadow-xl border border-zinc-800 font-mono text-xs">
              <h3 className="text-sm font-extrabold border-b border-zinc-800 pb-3 mb-4 text-zinc-300 uppercase">
                KERNEL PROPERTIES
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-zinc-500">MEMORY FOOTPRINT</span>
                  <span className="font-bold text-white">{selectedKernel.memory_footprint_mb} MB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">TOTAL SCALAR REGISTERS</span>
                  <span className="font-bold text-white">{selectedKernel.register_footprint.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">SHARED MEMORY CAPACITY</span>
                  <span className="font-bold text-white">{selectedKernel.shared_memory_kb} KB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">GRID THREAD BLOCKS</span>
                  <span className="font-bold text-white">{selectedKernel.thread_blocks}</span>
                </div>
              </div>
            </div>

            {/* Injection trigger card */}
            <div className="bg-black text-white p-6 rounded shadow-xl border border-zinc-800 font-mono text-xs">
              <h3 className="text-sm font-extrabold border-b border-zinc-800 pb-3 mb-4 text-zinc-300 uppercase">
                INJECT FAULTS
              </h3>
              <form onSubmit={handleSimulate} className="space-y-4">
                <div className="flex flex-col gap-1">
                  <label className="text-zinc-500">SIMULATED VRAM BIT FLIPS</label>
                  <input 
                    type="number" 
                    value={bitFlips}
                    onChange={(e) => setBitFlips(e.target.value)}
                    className="bg-zinc-900 border border-zinc-800 p-2 rounded text-white focus:outline-none focus:border-zinc-500"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-zinc-500">REGISTER CORRUPTIONS</label>
                  <input 
                    type="number" 
                    value={regCorrupts}
                    onChange={(e) => setRegCorrupts(e.target.value)}
                    className="bg-zinc-900 border border-zinc-800 p-2 rounded text-white focus:outline-none"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={simulating}
                  className="w-full flex items-center justify-center gap-2 bg-white text-black p-3 text-xs font-bold hover:bg-zinc-200 transition-all rounded shadow"
                >
                  {simulating ? <RefreshCw className="animate-spin" size={14} /> : <Play size={14} fill="black" />}
                  EXECUTE FAULT EXPOSURE RUN
                </button>
              </form>
            </div>
          </div>

          {/* Results Details Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Simulation outputs */}
            <div className="bg-black text-white p-6 rounded shadow-xl border border-zinc-800">
              <h3 className="text-sm font-extrabold tracking-widest font-mono border-b border-zinc-800 pb-3 mb-4 text-zinc-300 uppercase flex items-center gap-2">
                <Terminal size={14} className="text-zinc-500" />
                GPU FAULT ANALYSIS TERMINAL
              </h3>

              {activeResult ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono text-xs text-zinc-300">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">WARP DIVERGENCE MULTIPLIER</span>
                      <span className="font-bold text-amber-400 text-sm">{activeResult.warp_divergence_multiplier}x</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">FAULT IMPACT SCORE</span>
                      <span className="font-bold text-white text-sm">{activeResult.fault_impact_score}/100</span>
                    </div>
                    <div className="flex flex-col gap-1 border-t border-zinc-800 pt-3">
                      <span className="font-bold text-zinc-400 uppercase">AFFECTED MEMORY ADDRESSES</span>
                      {JSON.parse(activeResult.critical_memory_zones || "[]").map((zone: string, idx: number) => (
                        <div key={idx} className="flex gap-1.5 text-zinc-400">
                          <ArrowRight size={10} className="shrink-0 mt-0.5" />
                          <span className="text-red-300">{zone}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex flex-col gap-1">
                      <span className="font-bold text-zinc-400 uppercase">CONTAINMENT PLAN SUGGESTIONS</span>
                      {JSON.parse(activeResult.recovery_recommendations || "[]").map((rec: string, idx: number) => (
                        <div key={idx} className="flex gap-1.5 text-zinc-400">
                          <ArrowRight size={10} className="shrink-0 mt-0.5" />
                          <span>{rec}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-16 text-zinc-600 font-mono text-xs uppercase">
                  Run exposure simulation to compile GPU warp diagnostics.
                </div>
              )}
            </div>

            {/* Run logs table */}
            <div className="bg-black text-white p-6 rounded shadow-xl border border-zinc-800">
              <h3 className="text-sm font-extrabold tracking-widest font-mono border-b border-zinc-800 pb-3 mb-4 text-zinc-300 uppercase">
                EXPOSURE RUN LOG TIMELINES
              </h3>
              
              <div className="overflow-x-auto max-h-[180px] no-scrollbar">
                <table className="w-full text-left font-mono text-[10px] text-zinc-400">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-500 font-bold uppercase tracking-wider">
                      <th className="py-2">TIMESTAMP</th>
                      <th className="py-2">FLIPS</th>
                      <th className="py-2">REG CORRUPTIONS</th>
                      <th className="py-2">WARP SLOWDOWN</th>
                      <th className="py-2 text-right">IMPACT SCORE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900">
                    {history.map((run) => (
                      <tr key={run.id} className="hover:bg-zinc-950 transition-colors">
                        <td className="py-2 text-zinc-500">{new Date(run.timestamp).toLocaleString()}</td>
                        <td className="py-2 font-bold text-white">{run.simulated_bit_flips}</td>
                        <td className="py-2 text-zinc-300">{run.simulated_register_corruptions}</td>
                        <td className="py-2 text-amber-400">{run.warp_divergence_multiplier}x</td>
                        <td className="py-2 text-right font-bold text-white">{run.fault_impact_score}%</td>
                      </tr>
                    ))}
                    {history.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-zinc-600 uppercase">No active kernel exposure runs recorded.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-10 text-zinc-500 font-mono text-xs uppercase border border-zinc-200 bg-white rounded shadow-sm">
          Awaiting kernel profile index loading...
        </div>
      )}
    </div>
  );
}
