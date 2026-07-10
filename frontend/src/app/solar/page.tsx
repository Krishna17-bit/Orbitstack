"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { 
  Sun, 
  Zap, 
  ShieldAlert, 
  Compass, 
  Activity, 
  AlertTriangle, 
  CheckCircle,
  RefreshCw,
  Wind
} from "lucide-react";

export default function SolarStormPage() {
  const [solarStatus, setSolarStatus] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [resolving, setResolving] = useState(false);

  // Form State
  const [flareClass, setFlareClass] = useState("X");
  const [intensity, setIntensity] = useState(3.0);

  const fetchSolarData = async () => {
    try {
      const [statusData, eventsData] = await Promise.all([
        api.getSolarStatus(),
        api.getSolarEvents()
      ]);
      setSolarStatus(statusData);
      setEvents(eventsData);
    } catch (err) {
      console.error("Failed to load solar data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSolarData();
    const interval = setInterval(fetchSolarData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleTrigger = async (e: React.FormEvent) => {
    e.preventDefault();
    setTriggering(true);
    try {
      await api.triggerSolarStorm({ flare_class: flareClass, intensity: Number(intensity) });
      fetchSolarData();
    } catch (err: any) {
      alert("Trigger failed: " + err.message);
    } finally {
      setTriggering(false);
    }
  };

  const handleResolve = async () => {
    setResolving(true);
    try {
      await api.resolveSolarStorm();
      fetchSolarData();
    } catch (err: any) {
      alert("Resolution failed: " + err.message);
    } finally {
      setResolving(false);
    }
  };

  if (loading && !solarStatus) {
    return (
      <div className="p-8 font-mono min-h-screen flex flex-col items-center justify-center bg-white text-black">
        <RefreshCw className="animate-spin mb-4" size={32} />
        <p className="text-sm text-zinc-500 uppercase tracking-widest animate-pulse">Establishing space-weather link...</p>
      </div>
    );
  }

  const isStormActive = solarStatus.status === "active";

  return (
    <div className="p-8 bg-zinc-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-200 pb-6 mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-zinc-950 font-mono">SOLAR COMMAND CENTER</h2>
          <p className="text-zinc-500 text-sm mt-1 uppercase font-mono tracking-wider">Magnetosphere & Cosmic Radiation Weather Console</p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Controls Column */}
        <div className="space-y-6">
          <div className="bg-black text-white p-6 rounded shadow-xl border border-zinc-800 font-mono text-xs">
            <h3 className="text-sm font-extrabold border-b border-zinc-800 pb-3 mb-4 text-zinc-300 uppercase">INJECT GEOMAGNETIC FLARE</h3>
            
            <form onSubmit={handleTrigger} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-zinc-500">FLARE CLASSIFICATION</label>
                <select 
                  value={flareClass} 
                  onChange={(e) => setFlareClass(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 p-2 rounded text-white focus:outline-none"
                >
                  <option value="C">C-Class (Minor solar flare)</option>
                  <option value="M">M-Class (Moderate geomagnetic disturbance)</option>
                  <option value="X">X-Class (Extreme radiation burst events)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between">
                  <label className="text-zinc-500">GEOMAGNETIC INDEX (G-SCALE)</label>
                  <span className="text-white font-extrabold">G{Math.floor(intensity)} / {intensity.toFixed(1)}</span>
                </div>
                <input 
                  type="range" 
                  min="1.0" 
                  max="5.0" 
                  step="0.5"
                  value={intensity}
                  onChange={(e) => setIntensity(parseFloat(e.target.value))}
                  className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white"
                />
                <div className="flex justify-between text-[10px] text-zinc-600 mt-1">
                  <span>G1 (Minor)</span>
                  <span>G5 (Extreme)</span>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="submit"
                  disabled={triggering}
                  className="w-full flex items-center justify-center gap-2 bg-white text-black p-3 text-xs font-bold hover:bg-zinc-200 transition-all rounded shadow-md"
                >
                  {triggering ? <RefreshCw className="animate-spin" size={14} /> : <Zap size={14} />}
                  TRIGGER GEOMAGNETIC FLARE
                </button>

                {isStormActive && (
                  <button
                    type="button"
                    onClick={handleResolve}
                    disabled={resolving}
                    className="w-full flex items-center justify-center gap-2 border border-red-800 bg-red-950/40 text-red-300 p-3 text-xs font-bold hover:bg-red-950/60 transition-all rounded"
                  >
                    {resolving ? <RefreshCw className="animate-spin" size={14} /> : <CheckCircle size={14} />}
                    RESOLVE SOLAR STORM (RESTORE)
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Physics Parameters Panel */}
          <div className="bg-black text-white p-6 rounded shadow-xl border border-zinc-800 font-mono text-xs">
            <h3 className="text-sm font-extrabold border-b border-zinc-800 pb-3 mb-4 text-zinc-300 uppercase">HELIOPHYSICS TELEMETRY</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-zinc-500">MAGNETOSPHERE STATUS</span>
                <span className={`font-bold ${isStormActive ? "text-red-400 animate-pulse" : "text-emerald-400"}`}>
                  {isStormActive ? "COMPROMISED" : "STABLE"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">SOLAR WIND VELOCITY</span>
                <span className="font-bold text-white flex items-center gap-1">
                  <Wind size={12} className="text-zinc-400" />
                  {solarStatus.solar_wind_speed} km/s
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">PARTICLE EXPOSURE MULTIPLIER</span>
                <span className="font-bold text-white">{solarStatus.base_flux.toFixed(1)}x</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">FLARE INDEX</span>
                <span className="font-bold text-white">{solarStatus.flare_class}{solarStatus.intensity.toFixed(1)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Console & Mitigation Cascade */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Active Mitigation Runbook Progress */}
          <div className="bg-black text-white p-6 rounded shadow-xl border border-zinc-800 flex flex-col justify-between min-h-[220px]">
            <div>
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
                <h3 className="text-sm font-extrabold tracking-widest font-mono text-zinc-300 uppercase">ACTIVE EMERGENCY MITIGATION RUNBOOKS</h3>
                {isStormActive && <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping"></span>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
                <div className={`p-4 border rounded ${solarStatus.active_mitigations.includes("Cryo-Cooling Loops") ? "bg-cyan-950/40 border-cyan-800 text-cyan-200" : "bg-zinc-950 border-zinc-900 text-zinc-500"}`}>
                  <Compass className="mb-2" size={16} />
                  <div className="font-bold">CRYO-COOLER LOOP</div>
                  <p className="text-[10px] text-zinc-400 mt-1 leading-relaxed">
                    Maximizes cooling pump rates. Limits thermal rise on CPU arrays by defusing SEL-Thermal latchup synergy loops.
                  </p>
                  <div className="text-[9px] mt-2 font-semibold">
                    {solarStatus.active_mitigations.includes("Cryo-Cooling Loops") ? "STATUS: ACTIVE" : "STATUS: STANDBY"}
                  </div>
                </div>

                <div className={`p-4 border rounded ${solarStatus.active_mitigations.includes("Active Magnetic Shielding") ? "bg-blue-950/40 border-blue-800 text-blue-200" : "bg-zinc-950 border-zinc-900 text-zinc-500"}`}>
                  <ShieldAlert className="mb-2" size={16} />
                  <div className="font-bold">ACTIVE SHIELDING</div>
                  <p className="text-[10px] text-zinc-400 mt-1 leading-relaxed">
                    Charges electromagnet deflection coils. Deflects 90% of protons. Draws 15W battery draw from nodes.
                  </p>
                  <div className="text-[9px] mt-2 font-semibold">
                    {solarStatus.active_mitigations.includes("Active Magnetic Shielding") ? "STATUS: ACTIVE" : "STATUS: STANDBY"}
                  </div>
                </div>

                <div className={`p-4 border rounded ${solarStatus.active_mitigations.includes("Standby Safe Mode") ? "bg-red-950/40 border-red-800 text-red-200" : "bg-zinc-950 border-zinc-900 text-zinc-500"}`}>
                  <Activity className="mb-2" size={16} />
                  <div className="font-bold">STANDBY SAFE MODE</div>
                  <p className="text-[10px] text-zinc-400 mt-1 leading-relaxed">
                    Throttles computer load to 2%. Dumps transient registers to non-volatile memory to prevent SEU corruptions.
                  </p>
                  <div className="text-[9px] mt-2 font-semibold">
                    {solarStatus.active_mitigations.includes("Standby Safe Mode") ? "STATUS: ACTIVE" : "STATUS: STANDBY"}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-4 text-[9px] text-zinc-500 font-mono uppercase tracking-wider">
              Automatic mitigation runbooks triggered based on geomagnetic class indices
            </div>
          </div>

          {/* Historical Storm Logs */}
          <div className="bg-black text-white p-6 rounded shadow-xl border border-zinc-800">
            <h3 className="text-sm font-extrabold border-b border-zinc-800 pb-3 mb-4 text-zinc-300 uppercase font-mono tracking-wider">
              GEOMAGNETIC EVENT LOGS
            </h3>
            
            <div className="overflow-y-auto max-h-48 font-mono text-xs text-zinc-400 divide-y divide-zinc-900">
              {events.map((evt) => (
                <div key={evt.id} className="py-3 flex justify-between items-center hover:bg-zinc-950 px-2 rounded">
                  <div className="flex items-center gap-3">
                    <AlertTriangle size={14} className={evt.status === "active" ? "text-red-500 animate-pulse" : "text-zinc-600"} />
                    <div>
                      <span className="font-bold text-white">Solar Flare {evt.flare_class}{evt.intensity.toFixed(1)}</span>
                      <span className="text-zinc-500 text-[10px] ml-2">{new Date(evt.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {JSON.parse(evt.mitigations_active).map((m: string, idx: number) => (
                      <span key={idx} className="bg-zinc-900 border border-zinc-800 text-zinc-300 px-2 py-0.5 rounded text-[9px]">
                        {m}
                      </span>
                    ))}
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${evt.status === "active" ? "bg-red-950 text-red-400 border border-red-800" : "bg-zinc-900 text-zinc-500 border border-zinc-800"}`}>
                      {evt.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
              {events.length === 0 && (
                <div className="text-center py-8 text-zinc-600">No geomagnetic events logged in this orbit cycle.</div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
