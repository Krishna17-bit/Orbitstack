"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { 
  BrainCircuit, 
  Cpu, 
  Activity, 
  TrendingUp, 
  Thermometer, 
  ShieldAlert, 
  RefreshCw,
  Database,
  Award,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";

export default function PredictivePage() {
  const [nodes, setNodes] = useState<any[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [prediction, setPrediction] = useState<any>(null);
  const [rankings, setRankings] = useState<any[]>([]);
  const [mlStatus, setMlStatus] = useState<any>(null);
  
  const [training, setTraining] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchRankings = async () => {
    try {
      const data = await api.getMLRankings();
      setRankings(data || []);
      
      const nodesData = await api.getNodes();
      setNodes(nodesData);
      if (nodesData.length > 0 && selectedNodeId === null) {
        setSelectedNodeId(nodesData[0].id);
      }
      
      const statusData = await api.getMLStatus();
      setMlStatus(statusData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRankings();
  }, []);

  useEffect(() => {
    if (selectedNodeId !== null) {
      fetchNodePrediction(selectedNodeId);
    }
  }, [selectedNodeId]);

  const fetchNodePrediction = async (id: number) => {
    try {
      const pred = await api.getMLPrediction(id);
      setPrediction(pred);
    } catch (err) {
      console.error(err);
    }
  };

  const handleTrainModels = async () => {
    setTraining(true);
    try {
      const res = await api.trainML();
      alert(`Model retraining complete. Retrained on ${res.report.dataset_size} historical telemetry records.`);
      fetchRankings();
      if (selectedNodeId !== null) {
        fetchNodePrediction(selectedNodeId);
      }
    } catch (err: any) {
      alert("Training failed: " + err.message);
    } finally {
      setTraining(false);
    }
  };

  const getStatusBadge = () => {
    if (!mlStatus) return null;
    if (mlStatus.loaded) {
      return (
        <span className="flex items-center gap-1.5 text-emerald-400 bg-emerald-950/50 border border-emerald-800 px-3 py-1 rounded text-xs font-mono font-bold tracking-wider select-none animate-pulse">
          <CheckCircle2 size={12} />
          REAL MODEL LOADED
        </span>
      );
    } else {
      return (
        <span className="flex items-center gap-1.5 text-amber-400 bg-amber-950/50 border border-amber-800 px-3 py-1 rounded text-xs font-mono font-bold tracking-wider select-none">
          <AlertTriangle size={12} />
          RULE-BASED FALLBACK
        </span>
      );
    }
  };

  return (
    <div className="p-8 bg-zinc-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-200 pb-6 mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-zinc-950 font-mono">PREDICTIVE FAILURE ML ENGINE</h2>
          <p className="text-zinc-500 text-sm mt-1 uppercase font-mono tracking-wider">Telemetry-driven failure classification & SHAP explanations</p>
        </div>
        <div className="flex items-center gap-3">
          {getStatusBadge()}
          <button 
            onClick={handleTrainModels}
            disabled={training}
            className="flex items-center gap-2 bg-black text-white px-4 py-2 text-xs font-mono font-bold hover:bg-zinc-900 transition-all rounded shadow-md"
          >
            {training ? <RefreshCw className="animate-spin" size={12} /> : <BrainCircuit size={12} />}
            RETRAIN RANDOM FOREST MODELS
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-80 font-mono text-xs text-zinc-500">
          UPLINKING ML PREDICTION ENGINES...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Node Risk Leaderboard */}
          <div className="space-y-6">
            <div className="bg-black text-white p-6 rounded shadow-xl border border-zinc-800 font-mono text-xs">
              <h3 className="text-sm font-extrabold border-b border-zinc-800 pb-3 mb-4 text-zinc-300 uppercase">
                NODE RISK LEADERBOARD
              </h3>
              <div className="space-y-3">
                {rankings.map((node, idx) => (
                  <div 
                    key={node.node_id} 
                    onClick={() => setSelectedNodeId(node.node_id)}
                    className={`p-3 rounded border transition-all duration-150 cursor-pointer flex justify-between items-center ${
                      selectedNodeId === node.node_id 
                        ? "bg-zinc-900 border-white" 
                        : "bg-zinc-950 border-zinc-900 hover:border-zinc-800"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-zinc-500">0{idx + 1}</span>
                      <span className="font-bold uppercase">{node.name}</span>
                    </div>
                    <div className="text-right">
                      <span className={`font-bold ${node.risk_score > 50 ? "text-red-400" : "text-emerald-400"}`}>
                        {node.risk_score.toFixed(1)}% RISK
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Model Metadata Status Card */}
            {mlStatus && (
              <div className="bg-black text-white p-6 rounded shadow-xl border border-zinc-800 font-mono text-xs">
                <h3 className="text-sm font-extrabold border-b border-zinc-800 pb-3 mb-4 text-zinc-300 uppercase flex items-center gap-2">
                  <Database size={14} className="text-zinc-500" />
                  REGISTRY METRICS
                </h3>
                <div className="space-y-3 text-zinc-300">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">CLASSIFIER FAMILY</span>
                    <span className="font-bold text-white uppercase">{mlStatus.model_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">DATASET SIZE</span>
                    <span className="font-bold text-white">{mlStatus.dataset_size} rows</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">RE-TRAINED DATE</span>
                    <span className="font-bold text-white text-[10px]">
                      {mlStatus.training_timestamp ? new Date(mlStatus.training_timestamp).toLocaleDateString() : "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-zinc-900 pt-2.5">
                    <span className="text-zinc-500">AVERAGE F1 SCORE</span>
                    <span className="font-bold text-emerald-400">{(mlStatus.f1_score * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">AVERAGE ROC-AUC</span>
                    <span className="font-bold text-emerald-400">{(mlStatus.auc * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Predictions & Target Probs Column */}
          {prediction && (
            <div className="lg:col-span-2 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Predictions Card */}
                <div className="bg-black text-white p-6 rounded shadow-xl border border-zinc-800 font-mono text-xs">
                  <div className="flex justify-between items-center border-b border-zinc-800 pb-3 mb-4">
                    <h3 className="text-sm font-extrabold text-zinc-300 uppercase">
                      FAILURE PROBABILITY INDEX
                    </h3>
                    <select
                      value={selectedNodeId || ""}
                      onChange={(e) => setSelectedNodeId(Number(e.target.value))}
                      className="bg-zinc-900 text-white text-[10px] px-2 py-1 focus:outline-none border border-zinc-800 rounded font-bold"
                    >
                      {nodes.map(n => (
                        <option key={n.id} value={n.id}>{n.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span>NEXT FAIL PROBABILITY</span>
                        <span className="font-bold text-white">{(prediction.failure_probability * 100).toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-zinc-900 h-1.5 rounded overflow-hidden">
                        <div 
                          className="bg-white h-1.5" 
                          style={{ width: `${prediction.failure_probability * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span>THERMAL RUNAWAY RISK</span>
                        <span className="font-bold text-white">{(prediction.thermal_probability * 100).toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-zinc-900 h-1.5 rounded overflow-hidden">
                        <div 
                          className="bg-white h-1.5" 
                          style={{ width: `${prediction.thermal_probability * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span>ECC ERROR BURST PROBABILITY</span>
                        <span className="font-bold text-white">{(prediction.ecc_probability * 100).toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-zinc-900 h-1.5 rounded overflow-hidden">
                        <div 
                          className="bg-white h-1.5" 
                          style={{ width: `${prediction.ecc_probability * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span>SEU SPIKE PROBABILITY</span>
                        <span className="font-bold text-white">{(prediction.seu_probability * 100).toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-zinc-900 h-1.5 rounded overflow-hidden">
                        <div 
                          className="bg-white h-1.5" 
                          style={{ width: `${prediction.seu_probability * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="border-t border-zinc-800 pt-3 flex justify-between items-center text-[10px] text-zinc-500">
                      <span>CONFIDENCE MODEL COEFFICIENT:</span>
                      <span className="text-emerald-400 font-bold">{(prediction.confidence_score * 100).toFixed(0)}% MATCH</span>
                    </div>
                  </div>
                </div>

                {/* Explanations (SHAP Feature Importance) Card */}
                <div className="bg-black text-white p-6 rounded shadow-xl border border-zinc-800 font-mono text-xs">
                  <h3 className="text-sm font-extrabold border-b border-zinc-800 pb-3 mb-4 text-zinc-300 uppercase">
                    SHAP FEATURE CONTRIBUTIONS
                  </h3>
                  
                  <div className="space-y-4">
                    {Object.entries(prediction.shap_explanations || {}).map(([feature, val]: any) => (
                      <div key={feature}>
                        <div className="flex justify-between mb-1 uppercase text-[10px]">
                          <span className="text-zinc-400">{feature.replace(/_/g, " ")}</span>
                          <span className="text-white font-bold">{val.toFixed(1)}% impact</span>
                        </div>
                        <div className="w-full bg-zinc-900 h-1.5 rounded overflow-hidden">
                          <div 
                            className="bg-amber-400 h-1.5" 
                            style={{ width: `${val}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Warnings List */}
              <div className="bg-black text-white p-6 rounded shadow-xl border border-zinc-800 font-mono text-xs">
                <h3 className="text-sm font-extrabold border-b border-zinc-800 pb-3 mb-4 text-zinc-300 uppercase">
                  CLASSIFIER DIAGNOSTIC THREAT LOGS
                </h3>
                <div className="space-y-2">
                  {prediction.top_risk_factors.map((factor: string, idx: number) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-zinc-950 border border-zinc-900 text-zinc-300 rounded">
                      <ShieldAlert size={14} className="text-red-400 shrink-0" />
                      <span>{factor}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
