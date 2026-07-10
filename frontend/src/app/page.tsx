"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { 
  ShieldAlert, 
  Cpu, 
  Activity, 
  Thermometer, 
  Radio, 
  Plus, 
  RefreshCw,
  AlertTriangle,
  Heart,
  Zap,
  Shield,
  Clock
} from "lucide-react";

export default function OverviewPage() {
  const [stats, setStats] = useState<any>(null);
  const [nodes, setNodes] = useState<any[]>([]);
  const [globalRisk, setGlobalRisk] = useState<any>(null);
  const [riskHistory, setRiskHistory] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New Node Form State
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEnv, setNewEnv] = useState("space");
  const [newRegion, setNewRegion] = useState("LEO");
  const [newShielding, setNewShielding] = useState("2.0");
  const [newDevice, setNewDevice] = useState("VRAM");

  const fetchData = async () => {
    try {
      setError(null);
      const [overviewData, nodesData, globalRiskData, riskHistoryData] = await Promise.all([
        api.getOverview(),
        api.getNodes(),
        api.getCurrentGlobalRisk(),
        api.getGlobalRiskHistory()
      ]);
      setStats(overviewData);
      setNodes(nodesData);
      setGlobalRisk(globalRiskData);
      setRiskHistory(riskHistoryData || []);
    } catch (err: any) {
      setError(err.message || "Failed to establish connection with OrbitStack core engine API.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleAddNode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      const newNode = await api.createNode({
        name: newName,
        environment: newEnv,
        region: newRegion,
        shielding: parseFloat(newShielding),
        device_type: newDevice,
        status: "online",
        load: 0.2
      });
      // Provision digital twin automatically
      await api.getTwins(); // Auto-seeds twins on get if not exist
      
      setNewName("");
      setIsAdding(false);
      fetchData();
    } catch (err: any) {
      alert("Error adding node: " + err.message);
    }
  };

  const renderRiskHistoryGraph = () => {
    if (riskHistory.length < 2) {
      return (
        <div className="h-32 flex items-center justify-center text-zinc-600 font-mono text-[10px]">
          INITIALIZING GLOBAL RISK TIMELINE...
        </div>
      );
    }

    const data = [...riskHistory].reverse();
    const width = 450;
    const height = 120;
    const padding = 15;

    const scores = data.map(d => d.cluster_risk_score);
    const minS = Math.min(...scores, 10);
    const maxS = Math.max(...scores, 80);
    const range = maxS - minS || 1;

    const points = data.map((d, idx) => {
      const x = padding + (idx / (data.length - 1)) * (width - padding * 2);
      const y = height - padding - ((d.cluster_risk_score - minS) / range) * (height - padding * 2);
      return `${x},${y}`;
    }).join(" ");

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-32 bg-zinc-950 p-2 border border-zinc-900 rounded">
        <line x1={padding} y1={height/2} x2={width-padding} y2={height/2} stroke="#18181b" strokeDasharray="3 3" />
        <polyline
          fill="none"
          stroke="#10b981"
          strokeWidth="1.5"
          points={points}
        />
        {data.map((d, idx) => {
          const x = padding + (idx / (data.length - 1)) * (width - padding * 2);
          const y = height - padding - ((d.cluster_risk_score - minS) / range) * (height - padding * 2);
          return (
            <circle
              key={idx}
              cx={x}
              cy={y}
              r="2.5"
              fill="#10b981"
            >
              <title>{`Risk Score: ${d.cluster_risk_score}%`}</title>
            </circle>
          );
        })}
      </svg>
    );
  };

  if (loading && !stats) {
    return (
      <div className="p-8 font-mono min-h-screen flex flex-col items-center justify-center bg-white text-black">
        <RefreshCw className="animate-spin mb-4" size={32} />
        <p className="text-sm text-zinc-500 uppercase tracking-widest animate-pulse">Establishing interface uplink...</p>
      </div>
    );
  }

  return (
    <div className="p-8 bg-zinc-50 min-h-screen select-none">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-200 pb-6 mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-zinc-950 font-mono">GLOBAL COMMAND CENTER</h2>
          <p className="text-zinc-500 text-sm mt-1 uppercase font-mono tracking-wider">Multi-zonal reliability OS & risk consolidator</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchData}
            className="flex items-center gap-2 border border-zinc-200 px-4 py-2 text-xs font-mono font-bold bg-white text-zinc-800 hover:bg-zinc-100 transition-all rounded shadow-sm"
          >
            <RefreshCw size={14} />
            REFRESH TELEMETRY
          </button>
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center gap-2 bg-black text-white px-4 py-2 text-xs font-mono font-bold hover:bg-zinc-900 transition-all rounded shadow-md"
          >
            <Plus size={14} />
            PROVISION NODE
          </button>
        </div>
      </div>

      {error && (
        <div className="border border-red-200 bg-red-50 text-red-900 px-4 py-3 rounded text-sm mb-6 font-mono flex items-center gap-3">
          <AlertTriangle size={18} className="shrink-0" />
          <div>
            <span className="font-bold">ENGINE OFFLINE:</span> {error}. Ensure FastAPI backend is active.
          </div>
        </div>
      )}

      {/* Grid of aggregate status boxes */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-black text-white p-5 rounded shadow-xl border border-zinc-800 flex flex-col justify-between h-32 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-zinc-400 font-mono tracking-widest font-bold">RELIABILITY INDEX</span>
              <ShieldAlert size={16} className="text-red-400" />
            </div>
            <div className="font-mono mt-2">
              <span className="text-4xl font-extrabold">{100 - stats.risk_score}%</span>
            </div>
            <div className="w-full bg-zinc-800 h-1 rounded overflow-hidden mt-1">
              <div 
                className="bg-emerald-400 h-1 transition-all duration-500" 
                style={{ width: `${100 - stats.risk_score}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-black text-white p-5 rounded shadow-xl border border-zinc-800 flex flex-col justify-between h-32">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-zinc-400 font-mono tracking-widest font-bold">ACTIVE CORES</span>
              <Cpu size={16} className="text-zinc-400" />
            </div>
            <div className="font-mono mt-2">
              <span className="text-4xl font-extrabold">{stats.active_nodes}</span>
              <span className="text-zinc-500 text-sm ml-1">/ {stats.total_nodes}</span>
            </div>
            <span className="text-[10px] text-zinc-500 font-mono">COMPUTE GRID ONLINE</span>
          </div>

          <div className="bg-black text-white p-5 rounded shadow-xl border border-zinc-800 flex flex-col justify-between h-32">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-zinc-400 font-mono tracking-widest font-bold">MEAN TEMP</span>
              <Thermometer size={16} className="text-amber-400" />
            </div>
            <div className="font-mono mt-2">
              <span className="text-4xl font-extrabold">{stats.average_temp}°C</span>
            </div>
            <span className="text-[10px] text-zinc-500 font-mono">RACK CONDUCTION AVERAGE</span>
          </div>

          <div className="bg-black text-white p-5 rounded shadow-xl border border-zinc-800 flex flex-col justify-between h-32">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-zinc-400 font-mono tracking-widest font-bold">RADIATION EXP</span>
              <Radio size={16} className="text-blue-400" />
            </div>
            <div className="font-mono mt-2">
              <span className="text-4xl font-extrabold">{stats.radiation_exposure}</span>
              <span className="text-zinc-500 text-xs ml-1">FLUX</span>
            </div>
            <span className="text-[10px] text-zinc-500 font-mono">AGGREGATE PARTICLE DOSE</span>
          </div>

          <div className="bg-black text-white p-5 rounded shadow-xl border border-zinc-800 flex flex-col justify-between h-32">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-zinc-400 font-mono tracking-widest font-bold">CUMULATIVE SEUs</span>
              <Activity size={16} className="text-emerald-400" />
            </div>
            <div className="font-mono mt-2">
              <span className="text-4xl font-extrabold">{stats.cumulative_faults}</span>
            </div>
            <span className="text-[10px] text-zinc-500 font-mono">SOFT ERROR INCIDENCES</span>
          </div>
        </div>
      )}

      {/* Provision Node Modal Form */}
      {isAdding && (
        <form onSubmit={handleAddNode} className="bg-black text-white border border-zinc-800 p-6 rounded mb-8 font-mono animate-in fade-in slide-in-from-top-4 max-w-xl">
          <h3 className="text-sm font-extrabold tracking-wider border-b border-zinc-800 pb-3 mb-4">PROVISION NEW ORBITSTACK COMPUTING NODE</h3>
          <div className="grid grid-cols-2 gap-4 text-xs mb-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-zinc-500">HOSTNAME</label>
              <input 
                type="text" 
                placeholder="e.g. node-zeta-deep" 
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 p-2 rounded text-white focus:outline-none focus:border-zinc-500"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-zinc-500">ENVIRONMENT TYPE</label>
              <select 
                value={newEnv}
                onChange={(e) => setNewEnv(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 p-2 rounded text-white focus:outline-none"
              >
                <option value="space">Space (Vacuum)</option>
                <option value="underwater">Underwater</option>
                <option value="desert">Desert Edge</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-zinc-500">ORBITAL PRESET / REGION</label>
              <select 
                value={newRegion}
                onChange={(e) => setNewRegion(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 p-2 rounded text-white focus:outline-none"
              >
                <option value="LEO">Low Earth Orbit (LEO)</option>
                <option value="GEO">Geostationary Orbit (GEO)</option>
                <option value="SAA">South Atlantic Anomaly (SAA)</option>
                <option value="Lunar">Lunar Surface</option>
                <option value="Deep Space">Deep Space Compute Node</option>
                <option value="Mariana Trench">Mariana Trench DeepSea</option>
                <option value="Sahara">Sahara Edge Lab</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-zinc-500">SHIELDING THICKNESS (mm Al eq.)</label>
              <input 
                type="number" 
                step="0.1" 
                value={newShielding}
                onChange={(e) => setNewShielding(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 p-2 rounded text-white focus:outline-none focus:border-zinc-500"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-zinc-500">DEVICE TYPE</label>
              <select 
                value={newDevice}
                onChange={(e) => setNewDevice(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 p-2 rounded text-white focus:outline-none"
              >
                <option value="DRAM">Standard DRAM</option>
                <option value="SRAM">Standard SRAM</option>
                <option value="VRAM">NVIDIA VRAM</option>
                <option value="Rad-Hard">Rad-Hard Static SRAM</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 text-xs">
            <button 
              type="button" 
              onClick={() => setIsAdding(false)}
              className="border border-zinc-800 px-4 py-2 hover:bg-zinc-900 transition-all rounded"
            >
              CANCEL
            </button>
            <button 
              type="submit" 
              className="bg-white text-black px-4 py-2 font-bold hover:bg-zinc-200 transition-all rounded"
            >
              PROVISION AND START
            </button>
          </div>
        </form>
      )}

      {/* Global Command Center Risk Matrix */}
      {globalRisk && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Composite risk overview */}
          <div className="bg-black text-white p-6 rounded shadow-xl border border-zinc-800 font-mono text-xs flex flex-col justify-between min-h-[160px]">
            <div>
              <div className="flex justify-between items-center border-b border-zinc-800 pb-2 mb-4">
                <span className="text-[10px] text-zinc-400 font-extrabold uppercase tracking-wider">COMPOSITE RISK SCORING</span>
                <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${globalRisk.cluster_risk_score > 50 ? "bg-red-950 text-red-400 border border-red-800" : "bg-emerald-950 text-emerald-400 border border-emerald-800"}`}>
                  {globalRisk.cluster_risk_score > 50 ? "HAZARDOUS" : "NOMINAL"}
                </span>
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-5xl font-black">{globalRisk.cluster_risk_score}%</span>
                <span className="text-zinc-500">CLUSTER INDEX</span>
              </div>
            </div>
            <p className="text-[10px] text-zinc-500 leading-relaxed font-sans">
              Weighted composite value mapping thermal fatigue swing, heavy-ion flux indices, uncorrectable ECC counts, topological isolation reachability, and digital twin aging drifts.
            </p>
          </div>

          {/* Individual breakdowns */}
          <div className="bg-black text-white p-6 rounded shadow-xl border border-zinc-800 font-mono text-xs">
            <h3 className="text-sm font-extrabold border-b border-zinc-800 pb-2 mb-4 text-zinc-300 uppercase">
              HAZARD CONSOLIDATIONS
            </h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              <div className="flex justify-between border-b border-zinc-900 pb-1">
                <span className="text-zinc-500">THERMAL INDEX</span>
                <span className="font-bold text-white">{globalRisk.thermal_risk}%</span>
              </div>
              <div className="flex justify-between border-b border-zinc-900 pb-1">
                <span className="text-zinc-500">RADIATION EX</span>
                <span className="font-bold text-white">{globalRisk.radiation_risk}%</span>
              </div>
              <div className="flex justify-between border-b border-zinc-900 pb-1">
                <span className="text-zinc-500">ECC FAULTS</span>
                <span className="font-bold text-white">{globalRisk.ecc_risk}%</span>
              </div>
              <div className="flex justify-between border-b border-zinc-900 pb-1">
                <span className="text-zinc-500">TOPOLOGY RETAIN</span>
                <span className="font-bold text-white">{globalRisk.topology_risk}%</span>
              </div>
              <div className="flex justify-between border-b border-zinc-900 pb-1">
                <span className="text-zinc-500">TRAJECTORY DATA</span>
                <span className="font-bold text-white">{globalRisk.mission_risk}%</span>
              </div>
              <div className="flex justify-between border-b border-zinc-900 pb-1">
                <span className="text-zinc-500">SILICON AGING</span>
                <span className="font-bold text-white">{globalRisk.aging_risk}%</span>
              </div>
            </div>
          </div>

          {/* SVG Risk history chart */}
          <div className="bg-black text-white p-6 rounded shadow-xl border border-zinc-800">
            <h3 className="text-sm font-extrabold border-b border-zinc-800 pb-2 mb-4 text-zinc-300 uppercase font-mono tracking-wider">
              RISK HISTORY TRENDLINE
            </h3>
            {renderRiskHistoryGraph()}
          </div>
        </div>
      )}

      {/* Main Grid: Active Compute Nodes & Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Nodes List Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-black text-white p-6 rounded shadow-xl border border-zinc-800">
            <h3 className="text-sm font-extrabold tracking-widest font-mono mb-4 text-zinc-300 uppercase">ACTIVE COMPUTE CLUSTER NODES</h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs text-zinc-400">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500 text-[10px] tracking-wider">
                    <th className="py-2">NODE ID</th>
                    <th className="py-2">ENVIRONMENT</th>
                    <th className="py-2">REGION</th>
                    <th className="py-2">SHIELDING</th>
                    <th className="py-2">HARDWARE</th>
                    <th className="py-2">COMPUTE LOAD</th>
                    <th className="py-2 text-right">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900">
                  {nodes.map((node) => (
                    <tr key={node.id} className="hover:bg-zinc-950 transition-colors">
                      <td className="py-3 font-semibold text-white">{node.name}</td>
                      <td className="py-3 text-zinc-300">{node.environment}</td>
                      <td className="py-3 font-semibold text-zinc-300">{node.region}</td>
                      <td className="py-3">{node.shielding} mm</td>
                      <td className="py-3">{node.device_type}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <span className="w-8">{Math.round(node.load * 100)}%</span>
                          <div className="w-12 bg-zinc-800 h-1.5 rounded overflow-hidden">
                            <div 
                              className="bg-white h-1.5" 
                              style={{ width: `${node.load * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 text-right">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-extrabold tracking-wider uppercase border ${
                          node.status === "online" 
                            ? "bg-emerald-950/50 text-emerald-400 border-emerald-800/80" 
                            : node.status === "degraded"
                            ? "bg-amber-950/50 text-amber-400 border-amber-800/80"
                            : "bg-red-950/50 text-red-400 border-red-800/80"
                        }`}>
                          {node.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {nodes.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-zinc-600">No active nodes registered in the cluster.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Real-time Ticker Warnings Column */}
        <div className="space-y-6">
          <div className="bg-black text-white p-6 rounded shadow-xl border border-zinc-800 h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
                <h3 className="text-sm font-extrabold tracking-widest font-mono text-zinc-300 uppercase">SYSTEM ANOMALIES & ALERTS</h3>
                <span className="w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
              </div>
              <div className="space-y-4 no-scrollbar overflow-y-auto max-h-[360px]">
                {stats?.critical_alerts && stats.critical_alerts.length > 0 ? (
                  (stats.critical_alerts as any[]).map((alert: any, idx: number) => (
                    <div 
                      key={idx} 
                      className={`p-3 rounded border text-xs font-mono flex gap-3 ${
                        alert.severity === "critical" 
                          ? "bg-red-950/40 text-red-300 border-red-900/60" 
                          : "bg-amber-950/40 text-amber-300 border-amber-900/60"
                      }`}
                    >
                      <AlertTriangle className="shrink-0 mt-0.5" size={14} />
                      <div>
                        <div className="font-extrabold uppercase tracking-wide flex justify-between">
                          <span>{alert.node_name}</span>
                          <span className="text-[9px] text-zinc-500">{new Date(alert.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <p className="mt-1 text-zinc-400 font-sans">{alert.message}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-zinc-600 font-mono text-xs uppercase">
                    No active anomaly cascades detected. Shielding normal.
                  </div>
                )}
              </div>
            </div>
            
            <div className="mt-6 pt-4 border-t border-zinc-800 text-[10px] text-zinc-500 font-mono flex items-center justify-between">
              <span>REFRESH INTERVAL: 8000ms</span>
              <span className="uppercase tracking-wider">orbitstack cluster coordinator</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
