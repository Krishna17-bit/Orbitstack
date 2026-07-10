"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { 
  Thermometer, 
  Flame, 
  Wind, 
  Droplet, 
  Sun, 
  RefreshCw,
  Zap,
  Activity
} from "lucide-react";

export default function ThermalPage() {
  const [nodes, setNodes] = useState<any[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [selectedNode, setSelectedNode] = useState<any>(null);

  const [load, setLoad] = useState<number>(0.5);
  const [temperature, setTemperature] = useState<number>(25.0);
  const [fatigue, setFatigue] = useState<number>(0.0);
  const [efficiency, setEfficiency] = useState<number>(1.0);
  
  const [heatmap, setHeatmap] = useState<number[][]>([]);
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
      fetchNodeThermalStats(selectedNodeId);
    }
  }, [selectedNodeId, nodes]);

  const fetchNodeThermalStats = async (id: number) => {
    try {
      const [historyData, heatmapData] = await Promise.all([
        api.getThermalHistory(id),
        api.getThermalHeatmap(id)
      ]);
      setHistory(historyData);
      setHeatmap(heatmapData.heatmap || []);
      
      if (historyData.length > 0) {
        setTemperature(historyData[0].temperature);
        setFatigue(historyData[0].fatigue_factor);
        setEfficiency(historyData[0].cooling_efficiency);
      } else {
        setTemperature(25.0);
        setFatigue(0.0);
        setEfficiency(1.0);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateEnvironment = async (env: string) => {
    if (!selectedNode) return;
    try {
      let region = selectedNode.region;
      if (env === "underwater") region = "Mariana Trench";
      else if (env === "desert") region = "Sahara";
      else if (env === "space") region = "LEO";

      const updated = await api.updateNode(selectedNode.id, {
        environment: env,
        region: region
      });
      
      // Update local state
      setNodes(prev => prev.map(n => n.id === updated.id ? updated : n));
    } catch (err: any) {
      alert("Error changing environment: " + err.message);
    }
  };

  const handleRunThermalCycle = async () => {
    if (selectedNodeId === null) return;
    setSimulating(true);
    try {
      const res = await api.runThermalStep(selectedNodeId, load);
      setTemperature(res.temperature);
      setFatigue(res.fatigue_factor);
      setEfficiency(res.cooling_efficiency);

      // Refresh graph and heatmap
      const [historyData, heatmapData] = await Promise.all([
        api.getThermalHistory(selectedNodeId),
        api.getThermalHeatmap(selectedNodeId)
      ]);
      setHistory(historyData);
      setHeatmap(heatmapData.heatmap || []);

      // Refresh nodes list load status
      fetchNodes();
    } catch (err: any) {
      alert("Cycle run failed: " + err.message);
    } finally {
      setSimulating(false);
    }
  };

  // Helper to color thermal grid cells based on temperature value
  const getCellColor = (temp: number) => {
    // Range expected: 10 to 90 degrees
    if (temp < 20) return "bg-blue-900/60 border-blue-800 text-blue-200";
    if (temp < 35) return "bg-emerald-950 text-emerald-400 border-emerald-800";
    if (temp < 50) return "bg-amber-950 text-amber-400 border-amber-800";
    if (temp < 70) return "bg-orange-950 text-orange-400 border-orange-800";
    return "bg-red-950 text-red-400 border-red-800 animate-pulse";
  };

  // Create simple custom SVG line path for telemetry history
  const renderHistoryGraph = () => {
    if (history.length < 2) {
      return (
        <div className="h-40 flex items-center justify-center text-zinc-600 font-mono text-xs">
          INITIALIZING TELEMETRY PLOT...
        </div>
      );
    }

    const data = [...history].reverse(); // oldest first
    const width = 500;
    const height = 150;
    const padding = 20;

    const temps = data.map(d => d.temperature);
    const minTemp = Math.min(...temps, 15);
    const maxTemp = Math.max(...temps, 60);
    const tempRange = maxTemp - minTemp || 1;

    const points = data.map((d, idx) => {
      const x = padding + (idx / (data.length - 1)) * (width - padding * 2);
      const y = height - padding - ((d.temperature - minTemp) / tempRange) * (height - padding * 2);
      return `${x},${y}`;
    }).join(" ");

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-40 bg-zinc-950 p-2 border border-zinc-900 rounded">
        {/* Grid lines */}
        <line x1={padding} y1={height/2} x2={width-padding} y2={height/2} stroke="#1f1f23" strokeDasharray="4 4" />
        {/* Temperature Line */}
        <polyline
          fill="none"
          stroke="#f97316"
          strokeWidth="2"
          points={points}
        />
        {/* Data points */}
        {data.map((d, idx) => {
          const x = padding + (idx / (data.length - 1)) * (width - padding * 2);
          const y = height - padding - ((d.temperature - minTemp) / tempRange) * (height - padding * 2);
          return (
            <circle
              key={idx}
              cx={x}
              cy={y}
              r="3"
              fill="#f97316"
              className="hover:r-5 cursor-pointer"
            >
              <title>{d.temperature.toFixed(1)}°C at {new Date(d.timestamp).toLocaleTimeString()}</title>
            </circle>
          );
        })}
        <text x={padding} y={height - 4} fill="#52525b" className="font-mono text-[8px]">OLD</text>
        <text x={width - padding - 20} y={height - 4} fill="#52525b" className="font-mono text-[8px]">RECENT</text>
        <text x={width - 60} y={padding} fill="#f97316" className="font-mono text-[8px] font-bold">TEMP CYCLE</text>
      </svg>
    );
  };

  return (
    <div className="p-8 bg-zinc-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-200 pb-6 mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-zinc-950 font-mono">THERMAL CYCLE ENGINE</h2>
          <p className="text-zinc-500 text-sm mt-1 uppercase font-mono tracking-wider">Coffin-Manson fatigue logs & rack hotspots</p>
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
            {/* Heat Cycle Controllers */}
            <div className="bg-black text-white p-6 rounded shadow-xl border border-zinc-800 font-mono text-xs">
              <h3 className="text-sm font-extrabold border-b border-zinc-800 pb-3 mb-4 text-zinc-300 uppercase">ENVIRONMENT CONTROL</h3>
              
              <div className="space-y-4">
                <div>
                  <span className="text-zinc-500 block mb-2">OPERATING ENVIRONMENT</span>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => handleUpdateEnvironment("space")}
                      className={`flex flex-col items-center justify-center py-2.5 rounded border text-[10px] gap-1 font-bold ${
                        selectedNode.environment === "space"
                          ? "bg-white text-black border-white"
                          : "bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-zinc-400"
                      }`}
                    >
                      <Wind size={14} />
                      VACUUM
                    </button>
                    <button
                      onClick={() => handleUpdateEnvironment("underwater")}
                      className={`flex flex-col items-center justify-center py-2.5 rounded border text-[10px] gap-1 font-bold ${
                        selectedNode.environment === "underwater"
                          ? "bg-white text-black border-white"
                          : "bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-zinc-400"
                      }`}
                    >
                      <Droplet size={14} />
                      OCEAN
                    </button>
                    <button
                      onClick={() => handleUpdateEnvironment("desert")}
                      className={`flex flex-col items-center justify-center py-2.5 rounded border text-[10px] gap-1 font-bold ${
                        selectedNode.environment === "desert"
                          ? "bg-white text-black border-white"
                          : "bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-zinc-400"
                      }`}
                    >
                      <Sun size={14} />
                      DESERT
                    </button>
                  </div>
                </div>

                <div className="border-t border-zinc-800 pt-4">
                  <div className="flex justify-between mb-2">
                    <span className="text-zinc-500">GPU COMPUTE LOAD</span>
                    <span className="text-white font-extrabold">{Math.round(load * 100)}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0.0" 
                    max="1.0" 
                    step="0.05" 
                    value={load}
                    onChange={(e) => setLoad(parseFloat(e.target.value))}
                    className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white"
                  />
                </div>

                <button
                  onClick={handleRunThermalCycle}
                  disabled={simulating}
                  className="w-full flex items-center justify-center gap-2 bg-white text-black p-3 text-xs font-bold hover:bg-zinc-200 transition-all rounded shadow-md font-mono mt-2"
                >
                  {simulating ? <RefreshCw className="animate-spin" size={14} /> : <Flame size={14} />}
                  EXECUTE COMPUTE DUTY CYCLE
                </button>
              </div>
            </div>

            {/* Thermal Fatigue Diagnostic Card */}
            <div className="bg-black text-white p-6 rounded shadow-xl border border-zinc-800 font-mono text-xs">
              <h3 className="text-sm font-extrabold border-b border-zinc-800 pb-3 mb-4 text-zinc-300 uppercase">COFFIN-MANSON STRESS ANALYTICS</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-zinc-500">CURRENT CORE TEMP</span>
                  <span className={`font-bold ${temperature > 70 ? "text-red-400" : "text-white"}`}>
                    {temperature.toFixed(1)}°C
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">HEAT DISSIPATION EFFICIENCY</span>
                  <span className="font-bold text-white">{(efficiency * 100).toFixed(0)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">CUMULATIVE FATIGUE FACTOR</span>
                  <span className="font-bold text-white">{fatigue.toFixed(2)} NF</span>
                </div>
                <div className="border-t border-zinc-800 pt-3 mt-1 text-[10px] text-zinc-500">
                  Thermal Expansion Coefficient measures cumulative microstructural stress. Higher fatigue increases risks of solder cracking.
                </div>
              </div>
            </div>
          </div>

          {/* Heatmap Grid & Plot Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Heatmap */}
            <div className="bg-black text-white p-6 rounded shadow-xl border border-zinc-800">
              <h3 className="text-sm font-extrabold tracking-widest font-mono border-b border-zinc-800 pb-3 mb-4 text-zinc-300 uppercase">
                PHYSICAL RACK INFRARED HEATMAP (10x10 GRADIENT ARRAY)
              </h3>
              
              <div className="grid grid-cols-10 gap-1 bg-zinc-950 p-3 rounded border border-zinc-900">
                {heatmap.map((row, rIdx) => 
                  row.map((val, cIdx) => (
                    <div
                      key={`${rIdx}-${cIdx}`}
                      className={`aspect-square flex items-center justify-center text-[8px] font-mono border font-bold ${getCellColor(val)}`}
                      title={`Position (${rIdx},${cIdx}) Temperature: ${val}°C`}
                    >
                      {Math.round(val)}
                    </div>
                  ))
                )}
                {heatmap.length === 0 && (
                  <div className="col-span-10 text-center py-20 text-zinc-600 font-mono text-xs uppercase">
                    Generating thermal mapping...
                  </div>
                )}
              </div>
            </div>

            {/* Custom SVG Line Chart */}
            <div className="bg-black text-white p-6 rounded shadow-xl border border-zinc-800">
              <h3 className="text-sm font-extrabold tracking-widest font-mono border-b border-zinc-800 pb-3 mb-4 text-zinc-300 uppercase">
                THERMOGRAPHY DATA CYCLE FEED
              </h3>
              {renderHistoryGraph()}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center text-zinc-500 font-mono text-sm border border-zinc-200 bg-white rounded shadow-sm">
          Please add a node from the Overview console to begin thermal modeling.
        </div>
      )}
    </div>
  );
}
