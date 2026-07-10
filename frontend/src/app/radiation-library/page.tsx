"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { 
  BookOpen, 
  Shield, 
  Activity, 
  RefreshCw, 
  TrendingUp, 
  Sliders,
  AlertTriangle
} from "lucide-react";

export default function RadiationLibraryPage() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<any>(null);

  // Attenuation state
  const [material, setMaterial] = useState("aluminum");
  const [thickness, setThickness] = useState("3.0");
  const [device, setDevice] = useState("VRAM");
  const [duration, setDuration] = useState("24.0");

  const [activeResult, setActiveResult] = useState<any>(null);
  const [calculating, setCalculating] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchProfiles = async () => {
    try {
      const data = await api.getRadiationProfiles();
      setProfiles(data || []);
      if (data.length > 0 && selectedProfileId === null) {
        setSelectedProfileId(data[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  useEffect(() => {
    if (selectedProfileId !== null) {
      const profile = profiles.find(p => p.id === selectedProfileId);
      setSelectedProfile(profile);
      handleCalculate(selectedProfileId);
    }
  }, [selectedProfileId, profiles]);

  const handleCalculate = async (profileId: number) => {
    setCalculating(true);
    try {
      const res = await api.calculateRadiationAttenuation({
        profile_id: profileId,
        material,
        thickness: parseFloat(thickness) || 2.0,
        device_type: device,
        duration_hours: parseFloat(duration) || 24.0
      });
      setActiveResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setCalculating(false);
    }
  };

  const runCalculation = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedProfileId !== null) {
      handleCalculate(selectedProfileId);
    }
  };

  return (
    <div className="p-8 bg-zinc-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-200 pb-6 mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-zinc-950 font-mono">SPACE RADIATION DATA LIBRARY</h2>
          <p className="text-zinc-500 text-sm mt-1 uppercase font-mono tracking-wider">OLTARIS/SPENVIS compatible heavy ion spectra models</p>
        </div>
        <div className="flex items-center gap-4">
          <label className="font-mono text-xs text-zinc-500 uppercase">Radiation Profile:</label>
          <select 
            value={selectedProfileId || ""}
            onChange={(e) => setSelectedProfileId(Number(e.target.value))}
            className="bg-black text-white px-3 py-2 text-xs font-mono font-bold focus:outline-none rounded border border-zinc-800"
          >
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-80 font-mono text-xs text-zinc-500">
          UPLINKING SPACE RADIATION PROFILES...
        </div>
      ) : selectedProfile ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Controls Column */}
          <div className="space-y-6">
            {/* Profile specifications card */}
            <div className="bg-black text-white p-6 rounded shadow-xl border border-zinc-800 font-mono text-xs">
              <h3 className="text-sm font-extrabold border-b border-zinc-800 pb-3 mb-4 text-zinc-300 uppercase flex items-center gap-2">
                <BookOpen size={14} className="text-zinc-500" />
                PROFILE SPECTRA
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-zinc-500">SOLAR CYCLE PHASE</span>
                  <span className="font-bold text-white uppercase">{selectedProfile.solar_cycle}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">GEOMAGNETIC STATE</span>
                  <span className="font-bold text-white uppercase">{selectedProfile.geomagnetic_storm}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">GCR HEAVY ION SPECTRUM</span>
                  <span className="font-bold text-white">{selectedProfile.gcr_flux} particles/cm²/s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">SPE PROTON FLUX</span>
                  <span className="font-bold text-white">{selectedProfile.spe_flux} particles/cm²/s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">TRAPPED PROTON FLUX</span>
                  <span className="font-bold text-white">{selectedProfile.trapped_protons} particles/cm²/s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">TRAPPED ELECTRON FLUX</span>
                  <span className="font-bold text-white">{selectedProfile.trapped_electrons} particles/cm²/s</span>
                </div>
              </div>
            </div>

            {/* Shielding Calculator Form */}
            <div className="bg-black text-white p-6 rounded shadow-xl border border-zinc-800 font-mono text-xs">
              <h3 className="text-sm font-extrabold border-b border-zinc-800 pb-3 mb-4 text-zinc-300 uppercase">
                SHIELDING ATTENUATION CALCULATOR
              </h3>
              
              <form onSubmit={runCalculation} className="space-y-4">
                <div className="flex flex-col gap-1">
                  <label className="text-zinc-500">SHIELDING MATERIAL</label>
                  <select 
                    value={material}
                    onChange={(e) => setMaterial(e.target.value)}
                    className="bg-zinc-900 border border-zinc-800 p-2 rounded text-white focus:outline-none"
                  >
                    <option value="aluminum">Aluminum (Al baseline)</option>
                    <option value="polyethylene">Polyethylene (Hydrogen rich GCR block)</option>
                    <option value="lead">Lead (High SPE/storm capture)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-zinc-500">THICKNESS (mm)</label>
                    <input 
                      type="number" 
                      step="0.1"
                      value={thickness}
                      onChange={(e) => setThickness(e.target.value)}
                      className="bg-zinc-900 border border-zinc-800 p-2 rounded text-white focus:outline-none"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-zinc-500">DEVICE CORE</label>
                    <select 
                      value={device}
                      onChange={(e) => setDevice(e.target.value)}
                      className="bg-zinc-900 border border-zinc-800 p-2 rounded text-white focus:outline-none"
                    >
                      <option value="DRAM">DRAM</option>
                      <option value="SRAM">SRAM</option>
                      <option value="VRAM">VRAM</option>
                      <option value="Rad-Hard">Rad-Hard</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-zinc-500">EXPOSURE WINDOW (HOURS)</label>
                  <input 
                    type="number" 
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="bg-zinc-900 border border-zinc-800 p-2 rounded text-white focus:outline-none"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={calculating}
                  className="w-full flex items-center justify-center gap-2 bg-white text-black p-3 text-xs font-bold hover:bg-zinc-200 transition-all rounded shadow"
                >
                  {calculating ? <RefreshCw className="animate-spin" size={14} /> : <TrendingUp size={14} />}
                  CALCULATE ATTENUATION
                </button>
              </form>
            </div>
          </div>

          {/* Attenuation Details Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Calculation Output details */}
            <div className="bg-black text-white p-6 rounded shadow-xl border border-zinc-800 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-extrabold tracking-widest font-mono border-b border-zinc-800 pb-3 mb-4 text-zinc-300 uppercase">
                  ATTENUATED TELEMETRY FLUX & DOSE FORECASTS
                </h3>
                
                {activeResult ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 font-mono text-xs text-zinc-300">
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-zinc-500">ATTENUATED GCR FLUX</span>
                        <span className="font-bold text-white">{activeResult.attenuated_gcr_flux} particles/cm²/s</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">ATTENUATED SPE FLUX</span>
                        <span className="font-bold text-white">{activeResult.attenuated_spe_flux} particles/cm²/s</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">ABSORBED TOTAL DOSE</span>
                        <span className="font-bold text-amber-400 text-sm">{activeResult.absorbed_dose_rads.toFixed(4)} Rads</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">PREDICTED SEU RATE</span>
                        <span className="font-bold text-white">{activeResult.predicted_seu_rate_per_hour.toFixed(4)} errors/hr</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex flex-col gap-1.5 p-3.5 bg-zinc-950 rounded border border-zinc-900 text-[10px] text-zinc-500 leading-relaxed font-sans">
                        <span className="font-extrabold text-zinc-400 font-mono text-xs uppercase flex items-center gap-1.5">
                          <Shield size={12} className="text-emerald-400 animate-pulse" />
                          SHIELD BARRIER REDUCTION
                        </span>
                        Attenuated GCR and SPE values represent heavy-ion energy spectrum depletion derived from absorption coefficients. Hydrogenous molecules (Polyethylene) yield superior absorption curves for galactic radiation.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-16 text-zinc-600 font-mono text-xs uppercase">
                    Compute shielding attenuation to generate OLTARIS spectra mappings.
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-zinc-800 text-[10px] text-zinc-500 font-mono flex items-center justify-between">
                <span>COMPATIBLE WITH SPENVIS CORE SPECTRA MAPPINGS</span>
                <span className="uppercase">HEAVY ION SHIELD ATTENUATION LOGS</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-10 text-zinc-500 font-mono text-xs uppercase border border-zinc-200 bg-white rounded shadow-sm">
          Awaiting radiation profiles initialization...
        </div>
      )}
    </div>
  );
}
