"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { 
  Network, 
  Share2, 
  Activity, 
  MapPin, 
  Clock, 
  AlertOctagon, 
  CheckCircle,
  RefreshCw,
  Zap
} from "lucide-react";

export default function NetworkPage() {
  const [topology, setTopology] = useState<any>(null);
  const [selectedTargetId, setSelectedTargetId] = useState<number | null>(null);
  const [routeInfo, setRouteInfo] = useState<any>(null);
  
  const [loading, setLoading] = useState(true);
  const [tracing, setTracing] = useState(false);

  const fetchTopology = async () => {
    try {
      const data = await api.getNetworkTopology();
      setTopology(data);
      if (data.nodes.length > 0 && selectedTargetId === null) {
        // Find first node that isn't the Ground Station (id: 0)
        const sat = data.nodes.find((n: any) => n.id !== 0);
        if (sat) setSelectedTargetId(sat.id);
      }
    } catch (err) {
      console.error("Failed to load topology:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTopology();
    const interval = setInterval(fetchTopology, 1000); // 1s refresh for fluid orbital coordinates
    return () => clearInterval(interval);
  }, []);

  const handleTraceRoute = async () => {
    if (selectedTargetId === null) return;
    setTracing(true);
    try {
      const data = await api.traceRoute(selectedTargetId);
      setRouteInfo(data);
    } catch (err: any) {
      alert("Trace failed: " + err.message);
    } finally {
      setTracing(false);
    }
  };

  // Run route trace automatically when topology changes if target selected
  useEffect(() => {
    if (selectedTargetId !== null) {
      api.traceRoute(selectedTargetId)
        .then(setRouteInfo)
        .catch(console.error);
    }
  }, [selectedTargetId, topology?.nodes?.map((n: any) => n.status).join(",")]);

  if (loading && !topology) {
    return (
      <div className="p-8 font-mono min-h-screen flex flex-col items-center justify-center bg-white text-black">
        <RefreshCw className="animate-spin mb-4" size={32} />
        <p className="text-sm text-zinc-500 uppercase tracking-widest animate-pulse">Mapping constellation links...</p>
      </div>
    );
  }

  // Draw links & nodes onto SVG
  const renderConstellation = () => {
    if (!topology) return null;
    const { nodes, links } = topology;

    return (
      <svg viewBox="0 0 500 480" className="w-full h-[400px] bg-zinc-950 p-4 border border-zinc-900 rounded relative overflow-hidden select-none">
        <defs>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Earth Horizon Arc */}
        <path 
          d="M -50 480 Q 250 430 550 480" 
          fill="none" 
          stroke="#27272a" 
          strokeWidth="3" 
          strokeDasharray="4 4" 
        />
        <text x="250" y="470" fill="#52525b" textAnchor="middle" className="font-mono text-[9px] uppercase tracking-wider font-bold">Earth Horizon</text>

        {/* Laser links */}
        {links.map((link: any, idx: number) => {
          const sNode = nodes.find((n: any) => n.id === link.source);
          const tNode = nodes.find((n: any) => n.id === link.target);
          if (!sNode || !tNode) return null;

          let strokeColor = "#10b981"; // online (emerald)
          let dashArray = "none";
          let opacity = "0.7";

          if (link.status === "degraded") {
            strokeColor = "#f59e0b"; // degraded (amber)
            dashArray = "3 3";
            opacity = "0.8";
          } else if (link.status === "down") {
            strokeColor = "#ef4444"; // down (red)
            dashArray = "4 4";
            opacity = "0.3";
          }

          // Highlight link if it is in the traced route path
          const isInRoute = routeInfo?.success && 
                            routeInfo.path.includes(sNode.name) && 
                            routeInfo.path.includes(tNode.name);

          return (
            <line
              key={idx}
              x1={sNode.x}
              y1={sNode.y}
              x2={tNode.x}
              y2={tNode.y}
              stroke={isInRoute ? "#60a5fa" : strokeColor} // light-blue highlight for trace
              strokeWidth={isInRoute ? "3.5" : (link.status === "down" ? "1" : "1.5")}
              strokeDasharray={isInRoute ? "none" : dashArray}
              opacity={isInRoute ? "1" : opacity}
              filter={isInRoute ? "url(#glow)" : "none"}
              className="transition-all duration-300"
            />
          );
        })}

        {/* Nodes */}
        {nodes.map((node: any) => {
          const isGS = node.id === 0;
          let color = "#ffffff";
          if (node.status === "degraded") color = "#f59e0b";
          if (node.status === "offline") color = "#ef4444";
          if (isGS) color = "#60a5fa";

          const isSelected = node.id === selectedTargetId;

          return (
            <g 
              key={node.id} 
              className="cursor-pointer group"
              onClick={() => {
                if (!isGS) setSelectedTargetId(node.id);
              }}
            >
              {isSelected && (
                <circle 
                  cx={node.x} 
                  cy={node.y} 
                  r="12" 
                  fill="none" 
                  stroke="#3b82f6" 
                  strokeWidth="1.5" 
                  className="animate-ping opacity-60" 
                />
              )}
              <circle
                cx={node.x}
                cy={node.y}
                r={isGS ? "7" : "5"}
                fill={color}
                stroke={isSelected ? "#2563eb" : "#09090b"}
                strokeWidth="2"
                className="transition-all duration-300"
              />
              <text
                x={node.x}
                y={node.y - 12}
                fill={isSelected ? "#60a5fa" : (isGS ? "#a1a1aa" : "#e4e4e7")}
                textAnchor="middle"
                className="font-mono text-[9px] font-bold select-none transition-colors duration-300"
              >
                {node.name.replace("node-", "")}
              </text>
            </g>
          );
        })}
      </svg>
    );
  };

  return (
    <div className="p-8 bg-zinc-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-200 pb-6 mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-zinc-950 font-mono">CONSTELLATION ROUTING OS</h2>
          <p className="text-zinc-500 text-sm mt-1 uppercase font-mono tracking-wider">Laser Inter-Satellite Link (ISL) mesh router & tracer</p>
        </div>
        <div className="flex items-center gap-4">
          <label className="font-mono text-xs text-zinc-500 uppercase">Target Node:</label>
          <select 
            value={selectedTargetId || ""}
            onChange={(e) => setSelectedTargetId(Number(e.target.value))}
            className="bg-black text-white px-3 py-2 text-xs font-mono font-bold focus:outline-none rounded border border-zinc-800"
          >
            {topology?.nodes.filter((n: any) => n.id !== 0).map((n: any) => (
              <option key={n.id} value={n.id}>{n.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        
        {/* Interactive SVG Diagram */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-black text-white p-6 rounded shadow-xl border border-zinc-800">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
              <h3 className="text-sm font-extrabold tracking-widest font-mono text-zinc-300 uppercase">LIVE CONSTELLATION ORBITS</h3>
              <span className="text-[10px] text-zinc-500 font-mono">ORBIT TIME RATE: 0.04 rad/s</span>
            </div>
            {renderConstellation()}
            <div className="flex justify-between items-center text-[10px] text-zinc-500 font-mono mt-4">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></span> LINK ONLINE</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-amber-500 rounded-full"></span> LINK DEGRADED</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-red-500 rounded-full"></span> LINK OFFLINE</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-blue-400 rounded-full"></span> ROUTE PATH</span>
            </div>
          </div>
        </div>

        {/* Route Tracing Logs */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Dijkstra Route Stats */}
          <div className="bg-black text-white p-6 rounded shadow-xl border border-zinc-800 font-mono text-xs flex flex-col justify-between min-h-[220px]">
            <div>
              <div className="flex justify-between items-center border-b border-zinc-800 pb-3 mb-4">
                <span className="text-[10px] text-zinc-400 font-extrabold uppercase tracking-wider">DIJKSTRA ROUTING PATH</span>
                {routeInfo?.success ? (
                  <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded text-[8px] font-bold uppercase">CONNECTED</span>
                ) : (
                  <span className="bg-red-950 text-red-400 border border-red-800 px-2 py-0.5 rounded text-[8px] font-bold uppercase">DISCONNECTED</span>
                )}
              </div>

              {routeInfo?.success ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-zinc-300">
                    <Activity size={14} className="text-zinc-500" />
                    <span className="text-zinc-500">PATH PATH:</span>
                    <span className="text-blue-400 font-bold">{routeInfo.path.join(" → ")}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="border border-zinc-800 bg-zinc-950 p-3 rounded">
                      <div className="text-zinc-500 uppercase text-[9px]">PATH LATENCY</div>
                      <div className="text-xl font-bold text-white mt-1 flex items-baseline gap-1">
                        {routeInfo.latency_ms} <span className="text-xs text-zinc-400 font-normal">ms</span>
                      </div>
                    </div>
                    <div className="border border-zinc-800 bg-zinc-950 p-3 rounded">
                      <div className="text-zinc-500 uppercase text-[9px]">EXPECTED LOSS</div>
                      <div className="text-xl font-bold text-white mt-1 flex items-baseline gap-1">
                        {routeInfo.packet_loss_pct}%
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center text-red-400 border border-red-900/40 bg-red-950/20 p-4 rounded flex items-center gap-3">
                  <AlertOctagon size={18} className="shrink-0" />
                  <div>
                    <span className="font-bold">ROUTING BLOCKED:</span> Destination unreachable. Cosmic radiation or thermal dropouts broke all forwarding laser links.
                  </div>
                </div>
              )}
            </div>

            <button 
              onClick={handleTraceRoute}
              disabled={tracing}
              className="mt-6 w-full flex items-center justify-center gap-2 bg-white text-black p-3 text-xs font-bold hover:bg-zinc-200 transition-all rounded shadow-md font-mono"
            >
              {tracing ? <RefreshCw className="animate-spin" size={14} /> : <Zap size={14} />}
              MANUAL PATH TRACE
            </button>
          </div>

          {/* ISL Quality Metrics */}
          <div className="bg-black text-white p-6 rounded shadow-xl border border-zinc-800 font-mono text-xs">
            <h3 className="text-sm font-extrabold border-b border-zinc-800 pb-3 mb-4 text-zinc-300 uppercase">ISL CONNECTION STATUS</h3>
            
            <div className="overflow-y-auto max-h-48 divide-y divide-zinc-900">
              {topology?.links.map((link: any, idx: number) => {
                const sName = topology.nodes.find((n: any) => n.id === link.source)?.name.replace("node-", "");
                const tName = topology.nodes.find((n: any) => n.id === link.target)?.name.replace("node-", "");
                
                return (
                  <div key={idx} className="py-2.5 flex justify-between items-center hover:bg-zinc-950 px-1 rounded">
                    <div>
                      <span className="font-bold text-white uppercase">{sName || "GS"} ↔ {tName}</span>
                      <span className="text-[10px] text-zinc-500 ml-2">{link.latency_ms}ms</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                      link.status === "online" 
                        ? "bg-emerald-950 text-emerald-400" 
                        : link.status === "degraded"
                        ? "bg-amber-950 text-amber-400"
                        : "bg-red-950 text-red-400"
                    }`}>
                      {link.status.toUpperCase()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
