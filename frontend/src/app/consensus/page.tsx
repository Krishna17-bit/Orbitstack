"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { 
  Shield, 
  Cpu, 
  Activity, 
  Database, 
  AlertTriangle, 
  CheckCircle,
  RefreshCw,
  Zap,
  Info
} from "lucide-react";

export default function ConsensusPage() {
  const [replicas, setReplicas] = useState<any[]>([]);
  const [proposalData, setProposalData] = useState("SET ORBIT_VECTOR = [245.3, 120.4, 88.1]");
  const [result, setResult] = useState<any>(null);
  
  const [loading, setLoading] = useState(true);
  const [proposing, setProposing] = useState(false);

  const fetchReplicas = async () => {
    try {
      const data = await api.getReplicas();
      setReplicas(data);
    } catch (err) {
      console.error("Failed to load replicas:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReplicas();
  }, []);

  const handleToggleByzantine = async (nodeId: number, currentStatus: boolean) => {
    try {
      await api.toggleByzantine(nodeId, !currentStatus);
      fetchReplicas();
    } catch (err: any) {
      alert("Toggle failed: " + err.message);
    }
  };

  const handlePropose = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proposalData.trim()) return;
    setProposing(true);
    try {
      const res = await api.proposeBlock(proposalData);
      setResult(res);
    } catch (err: any) {
      alert("Block proposal failed: " + err.message);
    } finally {
      setProposing(false);
    }
  };

  if (loading && replicas.length === 0) {
    return (
      <div className="p-8 font-mono min-h-screen flex flex-col items-center justify-center bg-white text-black">
        <RefreshCw className="animate-spin mb-4" size={32} />
        <p className="text-sm text-zinc-500 uppercase tracking-widest animate-pulse">Synchronizing cluster consensus states...</p>
      </div>
    );
  }

  return (
    <div className="p-8 bg-zinc-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-200 pb-6 mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-zinc-950 font-mono">BFT CONSENSUS VALIDATOR</h2>
          <p className="text-zinc-500 text-sm mt-1 uppercase font-mono tracking-wider">Side-by-Side CFT (Raft) and BFT (PBFT) Replication Simulator</p>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Replicas & Proposer */}
        <div className="space-y-6">
          {/* Replica Byzantine Toggle Panel */}
          <div className="bg-black text-white p-6 rounded shadow-xl border border-zinc-800 font-mono text-xs">
            <h3 className="text-sm font-extrabold border-b border-zinc-800 pb-3 mb-4 text-zinc-300 uppercase">CLUSTER REPLICAS</h3>
            
            <div className="space-y-3.5">
              {replicas.map((rep) => {
                const isOffline = rep.node_status === "offline";
                return (
                  <div key={rep.id} className="flex justify-between items-center bg-zinc-950 border border-zinc-900 p-2.5 rounded">
                    <div>
                      <span className="font-extrabold text-white uppercase">{rep.name}</span>
                      <div className="text-[10px] text-zinc-500 mt-0.5">
                        STATUS: <span className="uppercase text-zinc-400 font-semibold">{rep.node_status}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isOffline ? (
                        <span className="text-[9px] font-bold text-red-500 bg-red-950/20 px-2 py-0.5 rounded border border-red-800">
                          CRASHED
                        </span>
                      ) : (
                        <button
                          onClick={() => handleToggleByzantine(rep.id, rep.is_byzantine)}
                          className={`px-2 py-1 text-[9px] font-extrabold rounded border transition-all ${
                            rep.is_byzantine 
                              ? "bg-amber-950 text-amber-400 border-amber-800 hover:bg-amber-900" 
                              : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white"
                          }`}
                        >
                          {rep.is_byzantine ? "BYZANTINE" : "HONEST"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Block Proposer Form */}
          <div className="bg-black text-white p-6 rounded shadow-xl border border-zinc-800 font-mono text-xs">
            <h3 className="text-sm font-extrabold border-b border-zinc-800 pb-3 mb-4 text-zinc-300 uppercase">PROPOSE STATE BLOCK</h3>
            
            <form onSubmit={handlePropose} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-zinc-500">TRANSACTION PAYLOAD</label>
                <input 
                  type="text" 
                  value={proposalData}
                  onChange={(e) => setProposalData(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 p-2.5 rounded text-white focus:outline-none focus:border-zinc-500"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={proposing}
                className="w-full flex items-center justify-center gap-2 bg-white text-black p-3 text-xs font-bold hover:bg-zinc-200 transition-all rounded shadow-md"
              >
                {proposing ? <RefreshCw className="animate-spin" size={14} /> : <Zap size={14} />}
                PROPOSE STATE TRANSACTION
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Comparative Consensus results & logs */}
        <div className="lg:col-span-2 space-y-6">
          {result ? (
            <>
              {/* Comparative Consensus Results */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Raft CFT Box */}
                <div className="bg-black text-white p-6 rounded shadow-xl border border-zinc-800 font-mono text-xs flex flex-col justify-between min-h-[220px]">
                  <div>
                    <div className="flex justify-between items-center border-b border-zinc-800 pb-3 mb-4">
                      <span className="text-[10px] text-zinc-400 font-extrabold uppercase tracking-wider">RAFT CONSENSUS (CFT)</span>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${
                        result.raft.success 
                          ? "bg-emerald-950 text-emerald-400 border border-emerald-800" 
                          : "bg-red-950 text-red-400 border border-red-800 animate-pulse"
                      }`}>
                        {result.raft.status}
                      </span>
                    </div>

                    <div className="text-xl font-black text-white mb-2 flex items-baseline gap-1">
                      {result.raft.success ? "REPLICATED" : "COMPROMISED"}
                    </div>
                    <p className="text-[10px] text-zinc-400 leading-relaxed font-sans mt-2">
                      {result.raft.detail}
                    </p>
                  </div>
                  
                  <div className="mt-4 pt-3 border-t border-zinc-900/60 text-[9px] text-zinc-500 uppercase">
                    Crashes tolerated, Byzantine fails
                  </div>
                </div>

                {/* PBFT BFT Box */}
                <div className="bg-black text-white p-6 rounded shadow-xl border border-zinc-800 font-mono text-xs flex flex-col justify-between min-h-[220px]">
                  <div>
                    <div className="flex justify-between items-center border-b border-zinc-800 pb-3 mb-4">
                      <span className="text-[10px] text-zinc-400 font-extrabold uppercase tracking-wider">PBFT CONSENSUS (BFT)</span>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${
                        result.pbft.success 
                          ? "bg-emerald-950 text-emerald-400 border border-emerald-800" 
                          : "bg-red-950 text-red-400 border border-red-800 animate-pulse"
                      }`}>
                        {result.pbft.status}
                      </span>
                    </div>

                    <div className="text-xl font-black text-white mb-2 flex items-baseline gap-1">
                      {result.pbft.success ? "SECURED" : "QUORUM FAILED"}
                    </div>
                    <p className="text-[10px] text-zinc-400 leading-relaxed font-sans mt-2">
                      {result.pbft.detail}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-zinc-900/60 text-[9px] text-zinc-500 uppercase">
                    Tolerates up to f Byzantine where 3f+1 &le; N
                  </div>
                </div>

              </div>

              {/* Voting Matrix Table */}
              <div className="bg-black text-white p-6 rounded shadow-xl border border-zinc-800 font-mono text-xs">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
                  <h3 className="text-sm font-extrabold tracking-widest uppercase">CONSENSUS VOTING MATRIX</h3>
                  <span className="text-zinc-500 text-[10px]">BLOCK HEIGHT: {result.block_height} (ROUND {result.round})</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-zinc-400">
                    <thead>
                      <tr className="border-b border-zinc-900 text-zinc-500 text-[9px] uppercase tracking-wider">
                        <th className="py-2">NODE REPLICA</th>
                        <th className="py-2">BEHAVIOR</th>
                        <th className="py-2">PREPARE VOTE</th>
                        <th className="py-2 text-right">COMMIT VOTE</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-950">
                      {result.votes.map((vote: any, idx: number) => {
                        let colorClass = "text-emerald-400";
                        if (vote.status === "Byzantine") colorClass = "text-amber-400";
                        if (vote.status.includes("Offline")) colorClass = "text-red-500";

                        return (
                          <tr key={idx} className="hover:bg-zinc-950 transition-colors">
                            <td className="py-2.5 font-bold text-white uppercase">{vote.node_name}</td>
                            <td className={`py-2.5 font-semibold ${colorClass}`}>{vote.status}</td>
                            <td className="py-2.5 font-mono">{vote.prepare_vote}</td>
                            <td className="py-2.5 font-mono text-right">{vote.commit_vote}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-zinc-500 font-mono text-xs uppercase border border-zinc-200 bg-white rounded shadow-sm flex flex-col items-center justify-center min-h-[300px]">
              <Database className="text-zinc-300 mb-3 animate-pulse" size={32} />
              <span>Propose a state transaction block in the left panel to execute consensus replication.</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
