"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Radio, 
  Thermometer, 
  Activity, 
  Network, 
  RefreshCw,
  Cpu,
  ShieldAlert,
  Database,
  BrainCircuit,
  Rocket,
  BookOpen,
  Terminal,
  Sun,
  BatteryCharging,
  Share2,
  Shield
} from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();

  const links = [
    { name: "Overview", href: "/", icon: LayoutDashboard },
    { name: "Solar Weather", href: "/solar", icon: Sun },
    { name: "Constellation ISL", href: "/network", icon: Share2 },
    { name: "Solar-Battery Power", href: "/power", icon: BatteryCharging },
    { name: "BFT Consensus", href: "/consensus", icon: Shield },
    { name: "Digital Twins", href: "/twins", icon: Database },
    { name: "Predictive ML", href: "/predictive", icon: BrainCircuit },
    { name: "Mission Planner", href: "/mission", icon: Rocket },
    { name: "Radiation Library", href: "/radiation-library", icon: BookOpen },
    { name: "Kernel Sandbox", href: "/kernels", icon: Terminal },
    { name: "Radiation Console", href: "/radiation", icon: Radio },
    { name: "Thermal Console", href: "/thermal", icon: Thermometer },
    { name: "ECC Health Monitor", href: "/ecc", icon: Activity },
    { name: "Failure Graph", href: "/graph", icon: Network },
    { name: "Recovery Planner", href: "/recovery", icon: RefreshCw },
  ];

  return (
    <aside className="w-64 bg-black text-white flex flex-col border-r border-zinc-800 h-screen sticky top-0 font-mono text-sm selection:bg-zinc-800 select-none">
      {/* Brand Header */}
      <div className="p-6 border-b border-zinc-800 flex items-center gap-3">
        <div className="w-8 h-8 rounded bg-white flex items-center justify-center text-black font-black tracking-tighter text-lg">
          OΩ
        </div>
        <div>
          <h1 className="font-extrabold text-base tracking-widest text-white leading-none">ORBITSTACK</h1>
          <span className="text-[10px] text-zinc-500 tracking-wider font-bold">RELIABILITY LAYER v1.0</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        <div className="px-3 mb-2 text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
          Telemetry & Control
        </div>
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded transition-all duration-200 ${
                isActive 
                  ? "bg-zinc-900 text-white border-l-2 border-white pl-4 font-semibold" 
                  : "text-zinc-400 hover:text-white hover:bg-zinc-900/50"
              }`}
            >
              <Icon size={16} className={isActive ? "text-white" : "text-zinc-400"} />
              <span>{link.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Connection Indicator Status */}
      <div className="p-4 border-t border-zinc-800 bg-zinc-950 text-xs">
        <div className="flex items-center justify-between mb-2">
          <span className="text-zinc-500">ENGINE STATUS</span>
          <span className="flex items-center gap-1.5 font-bold text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            ACTIVE
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-zinc-500">ENVIRONMENT</span>
          <span className="font-bold text-zinc-300">MULTI-ZONAL</span>
        </div>
      </div>
    </aside>
  );
}
