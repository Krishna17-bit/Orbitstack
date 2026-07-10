"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { 
  Rocket, 
  Shield, 
  Sliders, 
  Activity, 
  HelpCircle, 
  RefreshCw, 
  ArrowRight,
  TrendingUp
} from "lucide-react";

export default function MissionPage() {
  const [runs, setRuns] = useState<any[]>([]);
  const [loadingRuns, setLoadingRuns] = useState(true);

  // Wizard State
  const [name, setName] = useState("Hermes-9-Compute");
  const [nodeCount, setNodeCount] = useState("10");
  const [orbit, setOrbit] = useState("LEO");
  const [duration, setDuration] = useState("180");
  const [shielding, setShielding] = useState("2.5");
  const [workload, setWorkload] = useState("0.5");
  const [redundancy, setRedundancy] = useState("TMR");
  
  const [activeResult, setActiveResult] = useState<any>(null);
  const [simulating, setSimulating] = useState(false);

  const fetchRuns = async () => {
    try {
      const data = await api.getMissionRuns();
      setRuns(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRuns(false);
    }
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSimulating(true);
    try {
      const result = await api.simulateMission({
        name,
        node_count: parseInt(nodeCount) || 8,
        orbit_type: orbit,
        duration_days: parseInt(duration) || 180,
        shielding_thickness: parseFloat(shielding) || 2.0,
        workload_intensity: parseFloat(workload) || 0.5,
        redundancy_strategy: redundancy
      });
      setActiveResult(result);
      fetchRuns();
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
          <h2 className="text-3xl font-extrabold tracking-tight text-zinc-950 font-mono">PRE-LAUNCH MISSION PLANNER</h2>
          <p className="text-zinc-500 text-sm mt-1 uppercase font-mono tracking-wider">Orbit-trajectory modeling & Weibull survival predictions</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Mission Wizard Input Form */}
        <div className="space-y-6">
          <form onSubmit={handleSimulate} className="bg-black text-white p-6 rounded shadow-xl border border-zinc-800 font-mono text-xs space-y-4">
            <h3 className="text-sm font-extrabold border-b border-zinc-800 pb-3 mb-4 text-zinc-300 uppercase flex items-center gap-2">
              <Rocket size={14} className="text-zinc-500" />
              DEPLOYMENT WIZARD
            </h3>

            <div className="flex flex-col gap-1">
              <label className="text-zinc-500">MISSION IDENTIFIER</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 p-2 rounded text-white focus:outline-none focus:border-zinc-500"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-zinc-500">NODE COUNT</label>
                <input 
                  type="number" 
                  value={nodeCount}
                  onChange={(e) => setNodeCount(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 p-2 rounded text-white focus:outline-none"
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-zinc-500">TRAJECTORY ZONE</label>
                <select 
                  value={orbit}
                  onChange={(e) => setOrbit(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 p-2 rounded text-white focus:outline-none"
                >
                  <option value="LEO">LEO (Low Orbit)</option>
                  <option value="GEO">GEO (High Orbit)</option>
                  <option value="SAA">South Atlantic Anomaly</option>
                  <option value="Lunar">Lunar Surface</option>
                  <option value="Deep Space">Deep Space Probe</option>
                  <option value="Ocean Floor">Deep Sea Mariana</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-zinc-500">DURATION (DAYS)</label>
                <input 
                  type="number" 
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 p-2 rounded text-white focus:outline-none"
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-zinc-500">REDUNDANCY PLAN</label>
                <select 
                  value={redundancy}
                  onChange={(e) => setRedundancy(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 p-2 rounded text-white focus:outline-none"
                >
                  <option value="Simplex">Simplex (No Replicas)</option>
                  <option value="Dual">Dual Active-Passive</option>
                  <option value="TMR">TMR (Triple Modular)</option>
                </select>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-zinc-500">AL SHIELDING BARRIER</span>
                <span className="text-white font-bold">{shielding} mm</span>
              </div>
              <input 
                type="range" 
                min="0.5" 
                max="10.0" 
                step="0.5" 
                value={shielding}
                onChange={(e) => setShielding(e.target.value)}
                className="w-full h-1 bg-zinc-800 rounded appearance-none cursor-pointer accent-white"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-zinc-500">WORKLOAD PROCESS INTENSITY</span>
                <span className="text-white font-bold">{Math.round(parseFloat(workload) * 100)}%</span>
              </div>
              <input 
                type="range" 
                min="0.1" 
                max="1.0" 
                step="0.1" 
                value={workload}
                onChange={(e) => setWorkload(e.target.value)}
                className="w-full h-1 bg-zinc-800 rounded appearance-none cursor-pointer accent-white"
              />
            </div>

            <button
              type="submit"
              disabled={simulating}
              className="w-full flex items-center justify-center gap-2 bg-white text-black p-3 text-xs font-bold hover:bg-zinc-200 transition-all rounded shadow"
            >
              {simulating ? <RefreshCw className="animate-spin" size={14} /> : <TrendingUp size={14} />}
              SIMULATE TRAJECTORY RELIABILITY
            </button>
          </form>
        </div>

        {/* Outputs Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Run Output details */}
          <div className="bg-black text-white p-6 rounded shadow-xl border border-zinc-800">
            <h3 className="text-sm font-extrabold tracking-widest font-mono border-b border-zinc-800 pb-3 mb-4 text-zinc-300 uppercase">
              RELIABILITY SIMULATION SUMMARY
            </h3>
            
            {activeResult ? (
              <div className="space-y-6 font-mono text-xs text-zinc-300">
                {/* Visual Survival Rate Comparison */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-zinc-950 p-4 border border-zinc-800 rounded">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Static Workload Survival</span>
                    <span className="text-3xl font-extrabold text-rose-500 font-mono mt-1">{activeResult.estimated_survival_rate}%</span>
                    <span className="text-[9px] text-zinc-500 mt-1.5 leading-relaxed">
                      Continuous peak computing load. High risk during high-flux solar particle events.
                    </span>
                  </div>
                  <div className="flex flex-col border-t md:border-t-0 md:border-l border-zinc-800 pt-4 md:pt-0 md:pl-4 relative">
                    <div className="absolute right-0 top-0 text-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">
                      PROPOSED ARCHITECTURE
                    </div>
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Adaptive Workload Survival</span>
                    <span className="text-3xl font-extrabold text-emerald-400 font-mono mt-1">{activeResult.adaptive_survival_rate}%</span>
                    <span className="text-[9px] text-zinc-400 mt-1.5 leading-relaxed">
                      {activeResult.adaptive_survival_rate > activeResult.estimated_survival_rate ? (
                        <span>
                          Throttled compute workload down to 15% during peak flux passes to drop junction temperatures, yielding a <span className="text-emerald-400 font-bold">+{ (activeResult.adaptive_survival_rate - activeResult.estimated_survival_rate).toFixed(1) }% reliability gain</span>.
                        </span>
                      ) : (
                        <span>Workload scheduled dynamically around high-flux SAA/SPE passes.</span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Simulation Calculations Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-zinc-900/40 p-3 border border-zinc-800/80 rounded">
                    <span className="text-zinc-500 block text-[9px] uppercase tracking-wider">Total Ionizing Dose</span>
                    <span className={`text-base font-bold block mt-1 ${activeResult.accumulated_tid_krad > 50 ? 'text-rose-500' : activeResult.accumulated_tid_krad > 15 ? 'text-amber-500' : 'text-emerald-400'}`}>
                      {activeResult.accumulated_tid_krad.toFixed(2)} krad
                    </span>
                    <span className="text-[8px] text-zinc-600 block mt-0.5">COTS Limit: 50.0 krad</span>
                  </div>

                  <div className="bg-zinc-900/40 p-3 border border-zinc-800/80 rounded">
                    <span className="text-zinc-500 block text-[9px] uppercase tracking-wider">Thermal-SEL Synergy</span>
                    <span className={`text-base font-bold block mt-1 ${activeResult.sel_risk_multiplier > 4.0 ? 'text-rose-500' : activeResult.sel_risk_multiplier > 1.5 ? 'text-amber-500' : 'text-zinc-200'}`}>
                      {activeResult.sel_risk_multiplier.toFixed(2)}x risk
                    </span>
                    <span className="text-[8px] text-zinc-600 block mt-0.5">Heat-induced latch-ups</span>
                  </div>

                  <div className="bg-zinc-900/40 p-3 border border-zinc-800/80 rounded">
                    <span className="text-zinc-500 block text-[9px] uppercase tracking-wider">Expected SEUs</span>
                    <span className="text-base font-bold text-zinc-100 block mt-1">
                      {activeResult.expected_seus}
                    </span>
                    <span className="text-[8px] text-zinc-600 block mt-0.5">Correctable soft flips</span>
                  </div>

                  <div className="bg-zinc-900/40 p-3 border border-zinc-800/80 rounded">
                    <span className="text-zinc-500 block text-[9px] uppercase tracking-wider">Hard Failures</span>
                    <span className="text-base font-bold text-zinc-100 block mt-1">
                      {activeResult.expected_hard_failures}
                    </span>
                    <span className="text-[8px] text-zinc-600 block mt-0.5">Lethal hardware events</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-zinc-900">
                  <div className="space-y-2">
                    <div className="flex justify-between border-b border-zinc-900 pb-2">
                      <span className="text-zinc-500">MISSION IDENTIFIER</span>
                      <span className="font-bold text-white uppercase">{activeResult.name}</span>
                    </div>
                    <div className="flex justify-between border-b border-zinc-900 pb-2">
                      <span className="text-zinc-500">THERMAL STRESS SCORE</span>
                      <span className="font-bold text-white">{(activeResult.thermal_risk * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">CHECKPOINT COST</span>
                      <span className="font-bold text-white">{activeResult.checkpoint_costs.toFixed(1)} CPU-hrs</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 text-[10px] text-zinc-500 bg-zinc-950 p-3 border border-zinc-850 rounded">
                    <span className="font-bold text-zinc-400 uppercase tracking-wider">ENGINEERING RECOMMENDATIONS</span>
                    {JSON.parse(activeResult.redundancy_requirements || "[]").map((req: string, idx: number) => (
                      <div key={idx} className="flex gap-2 text-zinc-350 leading-relaxed">
                        <ArrowRight size={10} className="shrink-0 mt-1 text-zinc-500" />
                        <span>{req}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-16 text-zinc-600 font-mono text-xs uppercase">
                Compile deployment wizard to generate survival curves.
              </div>
            )}
          </div>

          {/* Historical Runs */}
          <div className="bg-black text-white p-6 rounded shadow-xl border border-zinc-800">
            <h3 className="text-sm font-extrabold tracking-widest font-mono border-b border-zinc-800 pb-3 mb-4 text-zinc-300 uppercase">
              TRAJECTORY RUNS REGISTRY
            </h3>
            
            <div className="overflow-x-auto max-h-[220px] no-scrollbar">
              <table className="w-full text-left font-mono text-[10px] text-zinc-400">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500 font-bold uppercase tracking-wider">
                    <th className="py-2">MISSION IDENTIFIER</th>
                    <th className="py-2">ZONE</th>
                    <th className="py-2">SHIELD</th>
                    <th className="py-2">TID DOSE</th>
                    <th className="py-2">THERMAL-SEL</th>
                    <th className="py-2 text-right">STATIC SR</th>
                    <th className="py-2 text-right">ADAPTIVE SR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900">
                  {runs.map((run) => (
                    <tr key={run.id} className="hover:bg-zinc-950 transition-colors">
                      <td className="py-2.5 font-bold text-white uppercase">{run.name}</td>
                      <td className="py-2.5 uppercase">{run.orbit_type}</td>
                      <td className="py-2.5">{run.shielding_thickness} mm</td>
                      <td className="py-2.5 text-zinc-300">
                        {run.accumulated_tid_krad !== undefined ? `${run.accumulated_tid_krad.toFixed(2)} krad` : "N/A"}
                      </td>
                      <td className="py-2.5 text-zinc-350">
                        {run.sel_risk_multiplier !== undefined ? `${run.sel_risk_multiplier.toFixed(2)}x` : "N/A"}
                      </td>
                      <td className="py-2.5 text-right font-bold text-rose-400">{run.estimated_survival_rate}%</td>
                      <td className="py-2.5 text-right font-bold text-emerald-400">
                        {run.adaptive_survival_rate !== undefined ? `${run.adaptive_survival_rate}%` : "N/A"}
                      </td>
                    </tr>
                  ))}
                  {runs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-zinc-600 uppercase">No active trajectory simulation registry runs.</td>
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
