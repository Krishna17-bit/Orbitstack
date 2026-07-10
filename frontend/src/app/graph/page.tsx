"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { 
  Network, 
  Zap, 
  Cpu, 
  Server, 
  RefreshCw,
  AlertOctagon,
  Activity,
  UserCheck
} from "lucide-react";

export default function GraphPage() {
  const [nodes, setNodes] = useState<any[]>([]);
  const [edges, setEdges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [hoveredNode, setHoveredNode] = useState<any>(null);
  const [offlineRoots, setOfflineRoots] = useState<string[]>([]);
  const [cascadedOffline, setCascadedOffline] = useState<string[]>([]);
  const [simulating, setSimulating] = useState(false);

  const fetchGraph = async () => {
    try {
      setLoading(true);
      const data = await api.getTopology();
      setNodes(data.nodes || []);
      setEdges(data.edges || []);
    } catch (err) {
      console.error("Error loading topology graph:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGraph();
  }, []);

  const handleToggleFailure = async (nodeId: string) => {
    let nextOffline = [...offlineRoots];
    if (nextOffline.includes(nodeId)) {
      nextOffline = nextOffline.filter(id => id !== nodeId);
    } else {
      nextOffline.push(nodeId);
    }
    setOfflineRoots(nextOffline);

    if (nextOffline.length > 0) {
      setSimulating(true);
      try {
        const cascadeResult = await api.simulateCascade(nextOffline);
        setCascadedOffline(cascadeResult.cascaded_offline_nodes || []);
      } catch (err) {
        console.error(err);
      } finally {
        setSimulating(false);
      }
    } else {
      setCascadedOffline([]);
    }
  };

  const handleResetGraph = () => {
    setOfflineRoots([]);
    setCascadedOffline([]);
  };

  // Helper to determine active status in simulation
  const getNodeStatus = (node: any) => {
    if (offlineRoots.includes(node.id)) return "failed-root";
    if (cascadedOffline.includes(node.id)) return "cascaded-failed";
    return node.status;
  };

  // Define layout locations for SVG nodes
  // Power: Left
  // Switches: Middle
  // Compute: Right
  const getNodePosition = (node: any) => {
    if (node.type === "power") {
      if (node.id === "power-1") return { x: 50, y: 80 };
      return { x: 50, y: 220 };
    }
    if (node.type === "network") {
      if (node.id === "switch-1") return { x: 220, y: 80 };
      return { x: 220, y: 220 };
    }
    // Compute nodes (stack them vertically on the right)
    const computeNodes = nodes.filter(n => n.type === "compute");
    const idx = computeNodes.findIndex(n => n.id === node.id);
    if (idx === -1) return { x: 400, y: 150 };
    
    // Spread them dynamically based on count
    const spacing = 280 / (computeNodes.length || 1);
    return { x: 400, y: 30 + idx * spacing + spacing / 2 };
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case "power": return Zap;
      case "network": return Server;
      default: return Cpu;
    }
  };

  return (
    <div className="p-8 bg-zinc-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-200 pb-6 mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-zinc-950 font-mono">FAILURE PROPAGATION GRAPH</h2>
          <p className="text-zinc-500 text-sm mt-1 uppercase font-mono tracking-wider">NetworkX blast radius modeling & cascade simulation</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleResetGraph}
            className="flex items-center gap-2 border border-zinc-200 px-4 py-2 text-xs font-mono font-bold bg-white text-zinc-800 hover:bg-zinc-100 transition-all rounded"
          >
            RESET SIMULATION
          </button>
          <button 
            onClick={fetchGraph}
            className="flex items-center gap-2 bg-black text-white px-4 py-2 text-xs font-mono font-bold hover:bg-zinc-900 transition-all rounded shadow-md"
          >
            <RefreshCw size={12} />
            SYNC TOPOLOGY
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Info Column */}
        <div className="space-y-6">
          {/* Diagnostic Sidebar */}
          <div className="bg-black text-white p-6 rounded shadow-xl border border-zinc-800 font-mono text-xs">
            <h3 className="text-sm font-extrabold border-b border-zinc-800 pb-3 mb-4 text-zinc-300 uppercase">PROPAGATION SIMULATOR</h3>
            <p className="text-zinc-500 mb-4 leading-relaxed font-sans">
              Click any element on the dependency map (Power cells, router nodes, or compute cards) to toggle simulated failures. OrbitStack models downstream topological impacts using directed graph algorithms.
            </p>
            <div className="border border-zinc-800 bg-zinc-950 p-4 rounded space-y-3">
              <div className="flex justify-between">
                <span className="text-zinc-500">PRIMARY SOURCE FAILURE</span>
                <span className="text-red-400 font-bold">{offlineRoots.length} NODES</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">CASCADED UNREACHABLE</span>
                <span className="text-orange-400 font-bold">{cascadedOffline.length} NODES</span>
              </div>
            </div>
          </div>

          {/* Hovered Element Details Card */}
          <div className="bg-black text-white p-6 rounded shadow-xl border border-zinc-800 font-mono text-xs">
            <h3 className="text-sm font-extrabold border-b border-zinc-800 pb-3 mb-4 text-zinc-300 uppercase">NODE DIAGNOSTIC LINK</h3>
            {hoveredNode ? (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-zinc-500">ID</span>
                  <span className="font-bold text-white uppercase">{hoveredNode.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">LABEL</span>
                  <span className="font-bold text-white uppercase">{hoveredNode.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">TYPE</span>
                  <span className="font-bold text-white uppercase">{hoveredNode.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">BLAST RADIUS</span>
                  <span className="font-bold text-amber-400">{(hoveredNode.blast_radius * 100).toFixed(0)}% Cluster Affected</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-zinc-600 font-mono">
                Hover over a node to read its blast radius index.
              </div>
            )}
          </div>
        </div>

        {/* SVG Drawing Canvas Column */}
        <div className="lg:col-span-3">
          <div className="bg-black text-white p-6 rounded shadow-xl border border-zinc-800 relative overflow-hidden flex flex-col justify-between min-h-[460px]">
            <div>
              <div className="flex justify-between items-center border-b border-zinc-800 pb-3 mb-6">
                <h3 className="text-sm font-extrabold tracking-widest font-mono text-zinc-300 uppercase">TOPOLOGY MAP (LIVE INTERACTIVE SVG CONTEXT)</h3>
                <span className="flex items-center gap-4 text-[9px] font-mono font-bold text-zinc-500">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 bg-emerald-500 rounded-full"></span> NOMINAL</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-500 rounded-full"></span> ROOT FAULT</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 bg-orange-500 rounded-full"></span> CASCADE SEVERED</span>
                </span>
              </div>

              {loading ? (
                <div className="flex items-center justify-center h-80 font-mono text-xs uppercase text-zinc-500">
                  Tracing network routes...
                </div>
              ) : (
                <svg className="w-full h-80 bg-zinc-950/40 rounded border border-zinc-900" viewBox="0 0 460 300">
                  {/* Edges / Wires */}
                  {edges.map((edge, idx) => {
                    const u = nodes.find(n => n.id === edge.source);
                    const v = nodes.find(n => n.id === edge.target);
                    if (!u || !v) return null;
                    
                    const p1 = getNodePosition(u);
                    const p2 = getNodePosition(v);

                    const uStatus = getNodeStatus(u);
                    const vStatus = getNodeStatus(v);
                    
                    // Style connection based on whether it is severed/offline
                    const isSevered = uStatus === "failed-root" || uStatus === "cascaded-failed" || vStatus === "failed-root" || vStatus === "cascaded-failed";
                    const strokeColor = isSevered ? "#ea580c" : "#27272a";
                    const strokeDash = isSevered ? "4 4" : "none";

                    return (
                      <line
                        key={idx}
                        x1={p1.x}
                        y1={p1.y}
                        x2={p2.x}
                        y2={p2.y}
                        stroke={strokeColor}
                        strokeWidth="1.5"
                        strokeDasharray={strokeDash}
                      />
                    );
                  })}

                  {/* Nodes */}
                  {nodes.map((node) => {
                    const pos = getNodePosition(node);
                    const nodeStatus = getNodeStatus(node);
                    const Icon = getNodeIcon(node.type);
                    
                    let strokeColor = "#3f3f46";
                    let fillColor = "#09090b";
                    let iconColor = "#a1a1aa";
                    let glow = "";
                    
                    if (nodeStatus === "online") {
                      strokeColor = "#10b981";
                      iconColor = "#10b981";
                    } else if (nodeStatus === "failed-root") {
                      strokeColor = "#ef4444";
                      iconColor = "#ef4444";
                      fillColor = "#7f1d1d";
                      glow = "animate-pulse";
                    } else if (nodeStatus === "cascaded-failed" || nodeStatus === "offline" || nodeStatus === "degraded") {
                      strokeColor = "#f97316";
                      iconColor = "#f97316";
                      fillColor = "#431407";
                    }

                    return (
                      <g 
                        key={node.id}
                        transform={`translate(${pos.x}, ${pos.y})`}
                        onClick={() => handleToggleFailure(node.id)}
                        onMouseEnter={() => setHoveredNode(node)}
                        onMouseLeave={() => setHoveredNode(null)}
                        className="cursor-pointer select-none"
                      >
                        <circle
                          r="18"
                          fill={fillColor}
                          stroke={strokeColor}
                          strokeWidth="2"
                          className={`${glow} transition-colors duration-200`}
                        />
                        <foreignObject x="-9" y="-9" width="18" height="18" className="pointer-events-none">
                          <div className="w-full h-full flex items-center justify-center">
                            <Icon size={11} style={{ color: iconColor }} />
                          </div>
                        </foreignObject>
                        {/* Node Label Text */}
                        <text
                          y="28"
                          textAnchor="middle"
                          fill="#71717a"
                          className="font-mono text-[6px] tracking-wide uppercase font-bold"
                        >
                          {node.label}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-zinc-800 text-[10px] text-zinc-500 font-mono flex items-center justify-between">
              <span>TRACED VIA NETWORKX INTERFACE</span>
              <span className="uppercase">CASCADE DEPENDECY SIMULATOR</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
