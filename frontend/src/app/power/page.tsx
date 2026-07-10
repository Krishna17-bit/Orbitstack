"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { 
  BatteryCharging, 
  Sun, 
  Moon, 
  Cpu, 
  Activity, 
  Thermometer, 
  Zap, 
  RefreshCw,
  Gauge,
  Info
} from "lucide-react";

export default function PowerPage() {
  const [eclipseInfo, setEclipseInfo] = useState<any>(null);
  const [powerStates, setPowerStates] = useState<any[]>([]);
  const [schedulerEnabled, setSchedulerEnabled] = useState(true);
  
  const [loading, setLoading] = useState(true);
  const [actingNodeId, setActingNodeId] = useState<number | null>(null);

  const fetchPowerData = async () => {
    try {
      const [eclipseData, statesData, schedulerData] = await Promise.all([
        api.getEclipseStatus(),
        api.getPowerStatus(),
        api.getPowerScheduler()
      ]);
      setEclipseInfo(eclipseData);
      setPowerStates(statesData);
      setSchedulerEnabled(schedulerData.enabled);
    } catch (err) {
      console.error("Failed to load power data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPowerData();
    const interval = setInterval(fetchPowerData, 2000); // 2s polling for power telemetry
    return () => clearInterval(interval);
  }, []);

  const handleToggleScheduler = async () => {
    try {
      const nextVal = !schedulerEnabled;
      const res = await api.togglePowerScheduler(nextVal);
      setSchedulerEnabled(res.enabled);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRejuvenate = async (nodeId: number) => {
    setActingNodeId(nodeId);
    try {
      await api.rejuvenateNodePower(nodeId);
      fetchPowerData();
    } catch (err: any) {
      alert("Rejuvenation failed: " + err.message);
    } finally {
      setActingNodeId(null);
    }
  };

  if (loading && powerStates.length === 0) {
    return (
      <div className="p-8 font-mono min-h-screen flex flex-col items-center justify-center bg-white text-black">
        <RefreshCw className="animate-spin mb-4" size={32} />
        <p className="text-sm text-zinc-500 uppercase tracking-widest animate-pulse">Initializing battery grid telemetry...</p>
      </div>
    );
  }

  const isEclipse = eclipseInfo?.is_eclipse;

  return (
    <div className="p-8 bg-zinc-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-200 pb-6 mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-zinc-950 font-mono">SOLAR-BATTERY POWER GRID</h2>
          <p className="text-zinc-500 text-sm mt-1 uppercase font-mono tracking-wider">State of Charge (SOC), State of Health (SOH), & Orbital Solar Cycles</p>
        </div>
      </div>

      {/* Overview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        
        {/* Orbital sunlight card */}
        <div className="bg-black text-white p-6 rounded shadow-xl border border-zinc-800 font-mono text-xs flex items-center justify-between min-h-[140px] relative overflow-hidden">
          <div>
            <div className="text-[10px] text-zinc-400 font-extrabold uppercase tracking-wider mb-2">ORBITAL SOLAR STATUS</div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className={`text-2xl font-black ${isEclipse ? "text-blue-400" : "text-amber-400"}`}>
                {eclipseInfo?.phase_name}
              </span>
            </div>
            <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">
              TIME UNTIL NEXT TRANSITION: <span className="text-white font-bold">{eclipseInfo?.seconds_remaining}s</span>
            </p>
          </div>
          <div className="shrink-0 p-4 rounded bg-zinc-900 border border-zinc-800">
            {isEclipse ? (
              <Moon size={36} className="text-blue-400 animate-pulse" />
            ) : (
              <Sun size={36} className="text-amber-400 animate-spin" style={{ animationDuration: "12s" }} />
            )}
          </div>
        </div>

        {/* Solar constant card */}
        <div className="bg-black text-white p-6 rounded shadow-xl border border-zinc-800 font-mono text-xs flex flex-col justify-between h-[140px]">
          <div>
            <div className="text-[10px] text-zinc-400 font-extrabold uppercase tracking-wider mb-3">SOLAR DISSIPATION FACTOR</div>
            <div className="flex items-baseline gap-1 mb-2">
              <span className="text-4xl font-black">{eclipseInfo?.solar_constant_w_m2}</span>
              <span className="text-zinc-500 font-bold">W / m²</span>
            </div>
          </div>
          <span className="text-[10px] text-zinc-500 uppercase">Geostationary solar irradiance flux constant</span>
        </div>

        {/* Scheduler control panel */}
        <div className="bg-black text-white p-6 rounded shadow-xl border border-zinc-800 font-mono text-xs flex flex-col justify-between h-[140px]">
          <div>
            <div className="flex justify-between items-center border-b border-zinc-800 pb-2 mb-2">
              <span className="text-[10px] text-zinc-400 font-extrabold uppercase tracking-wider">POWER-AWARE SCHEDULER</span>
              <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${schedulerEnabled ? "bg-emerald-950 text-emerald-400 border border-emerald-800" : "bg-zinc-900 text-zinc-500 border border-zinc-800"}`}>
                {schedulerEnabled ? "ACTIVE" : "STANDBY"}
              </span>
            </div>
            <p className="text-[10px] text-zinc-500 leading-relaxed font-sans mt-2">
              Automatically throttles compute nodes to 10% load when battery drops below 25% State of Charge (SOC) to prevent power exhaustion.
            </p>
          </div>
          <button
            onClick={handleToggleScheduler}
            className={`w-full p-2 mt-2 text-[10px] font-bold font-mono transition-all rounded ${
              schedulerEnabled 
                ? "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white" 
                : "bg-white text-black hover:bg-zinc-200"
            }`}
          >
            {schedulerEnabled ? "DISABLE AUTOTHROTTLE" : "ENABLE AUTOTHROTTLE"}
          </button>
        </div>
      </div>

      {/* Main Grid: Battery Telemetry details for all nodes */}
      <div className="bg-black text-white p-6 rounded shadow-xl border border-zinc-800 font-mono text-xs">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-6">
          <h3 className="text-sm font-extrabold tracking-widest uppercase">BATTERY & SOLAR POWER STORAGE CELL GRID</h3>
          <span className="text-zinc-500 text-[10px]">POLLING GRID STATUS OVER ACTIVE ISL</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {powerStates.map((state) => {
            const isCharging = state.solar_generation > 0;
            
            // Charge color logic
            let socColor = "text-emerald-400";
            let socBg = "bg-emerald-500/20";
            if (state.battery_soc < 30.0) {
              socColor = "text-red-400";
              socBg = "bg-red-500/20";
            } else if (state.battery_soc < 60.0) {
              socColor = "text-amber-400";
              socBg = "bg-amber-500/20";
            }

            return (
              <div key={state.id} className="border border-zinc-900 bg-zinc-950 p-5 rounded space-y-4 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center border-b border-zinc-900 pb-2 mb-3">
                    <span className="font-extrabold text-sm text-white uppercase flex items-center gap-1.5">
                      <Cpu size={14} className="text-zinc-500" />
                      {state.node_id ? `NODE-0x0${state.node_id}` : "NODE_CORE"}
                    </span>
                    {isCharging ? (
                      <span className="flex items-center gap-1 text-[8px] font-bold text-amber-400 bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-800">
                        <Zap size={8} className="animate-bounce" /> CHARGING
                      </span>
                    ) : (
                      <span className="text-[8px] font-bold text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
                        DISCHARGING
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* SOC Gauge */}
                    <div className="flex flex-col items-center justify-center p-3 rounded bg-zinc-900/40 border border-zinc-900">
                      <span className="text-[9px] text-zinc-500 uppercase">BATTERY SOC</span>
                      <div className={`text-2xl font-black mt-1 ${socColor}`}>
                        {Math.round(state.battery_soc)}%
                      </div>
                      <div className="w-16 h-2 bg-zinc-800 rounded-full mt-2 overflow-hidden relative">
                        <div 
                          className={`h-full ${socBg.replace("/20", "")}`}
                          style={{ width: `${state.battery_soc}%` }}
                        />
                      </div>
                    </div>

                    {/* SOH Gauge */}
                    <div className="flex flex-col items-center justify-center p-3 rounded bg-zinc-900/40 border border-zinc-900">
                      <span className="text-[9px] text-zinc-500 uppercase">BATTERY SOH</span>
                      <div className="text-2xl font-black mt-1 text-white">
                        {Math.round(state.battery_soh)}%
                      </div>
                      <span className="text-[8px] text-zinc-500 mt-2">CAPACITY HEALTH</span>
                    </div>
                  </div>

                  <div className="space-y-2 mt-4 text-[10px]">
                    <div className="flex justify-between border-b border-zinc-900/50 pb-1">
                      <span className="text-zinc-500 uppercase">SOLAR GENERATION</span>
                      <span className="text-white font-bold">{state.solar_generation} W</span>
                    </div>
                    <div className="flex justify-between border-b border-zinc-900/50 pb-1">
                      <span className="text-zinc-500 uppercase">BATTERY TEMP</span>
                      <span className="text-white font-bold flex items-center gap-0.5">
                        <Thermometer size={10} className="text-zinc-500" />
                        {state.battery_temperature} °C
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-zinc-900/50 pb-1">
                      <span className="text-zinc-500 uppercase">INTERNAL RESISTANCE</span>
                      <span className="text-white font-bold">{state.internal_resistance} Ω</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleRejuvenate(state.node_id)}
                  disabled={actingNodeId === state.node_id}
                  className="w-full flex items-center justify-center gap-1.5 bg-zinc-900 text-zinc-300 hover:text-white p-2.5 text-[10px] font-bold border border-zinc-800 hover:bg-zinc-850 hover:border-zinc-700 transition-all rounded"
                >
                  {actingNodeId === state.node_id ? (
                    <RefreshCw className="animate-spin" size={12} />
                  ) : (
                    <BatteryCharging size={12} />
                  )}
                  THERMAL ANNEAL & REGEN
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
