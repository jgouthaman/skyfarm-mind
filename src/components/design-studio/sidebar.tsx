import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, FilePlus, ClipboardList, Cpu, ListChecks, FlaskConical, Sparkles, FileText, History, ArrowLeft, Plane } from "lucide-react";
import { cn } from "@/lib/utils";

type Item = { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean };
const items: Item[] = [
  { to: "/control-center/aerospawn-design-studio", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/control-center/aerospawn-design-studio/new", label: "New Design", icon: FilePlus },
  { to: "/control-center/aerospawn-design-studio/requirements", label: "Requirement Intake", icon: ClipboardList },
  { to: "/control-center/aerospawn-design-studio/design", label: "Design Results", icon: Cpu },
  { to: "/control-center/aerospawn-design-studio/components", label: "Component List", icon: ListChecks },
  { to: "/control-center/aerospawn-design-studio/simulation", label: "Simulation Lab", icon: FlaskConical },
  { to: "/control-center/aerospawn-design-studio/advisor", label: "AI Advisor", icon: Sparkles },
  { to: "/control-center/aerospawn-design-studio/report", label: "Reports", icon: FileText },
  { to: "/control-center/aerospawn-design-studio/history", label: "Project History", icon: History },
];

export function StudioSidebar() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  return (
    <aside className="w-60 shrink-0 border-r border-border/60 bg-card/50 backdrop-blur p-3 flex flex-col gap-1 min-h-screen">
      <Link to="/control-center/aerospawn-design-studio" className="flex items-center gap-2 px-2 py-3 mb-2">
        <span className="grid place-items-center h-8 w-8 rounded-lg bg-gradient-to-br from-sky-500 to-indigo-600 shadow-lg">
          <Plane className="h-4 w-4 text-white" />
        </span>
        <div className="leading-tight">
          <div className="text-sm font-semibold">AeroSpawn</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Design Studio</div>
        </div>
      </Link>
      {items.map(({ to, label, icon: Icon, exact }) => {
        const active = exact ? path === to : path.startsWith(to);
        return (
          <Link key={to} to={to}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
              active ? "bg-primary/15 text-primary border border-primary/30" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
            )}>
            <Icon className="h-4 w-4" /> {label}
          </Link>
        );
      })}
      <div className="mt-auto pt-3 border-t border-border/60">
        <Link to="/control-center" className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Control Center
        </Link>
      </div>
    </aside>
  );
}

export function Disclaimer() {
  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-xs text-amber-200/90">
      This portal provides design assistance and simulation estimates only. It does not certify that a drone is safe, legal, or flight-ready. Final design must be reviewed by qualified drone engineers and tested under safe and compliant conditions.
    </div>
  );
}
