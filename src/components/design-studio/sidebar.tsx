import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, FilePlus, Home, Plane, Brain } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMissionHubAuth } from "@/lib/mission-hub/context";

type Item = { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean };
const items: Item[] = [
  { to: "/mission-hub/torqwings-design-studio", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/mission-hub/torqwings-design-studio/new", label: "New Design", icon: FilePlus },
];

export function StudioSidebar() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { profile } = useMissionHubAuth();
  const isAdmin = profile?.role === "admin" || profile?.role === "super_admin";
  return (
    <aside className="w-60 shrink-0 border-r border-border/60 bg-card/50 backdrop-blur p-3 flex flex-col gap-1 min-h-screen">
      <Link to="/mission-hub/torqwings-design-studio" className="flex items-center gap-2 px-2 py-3 mb-2">
        <span className="grid place-items-center h-8 w-8 rounded-lg bg-gradient-to-br from-sky-500 to-indigo-600 shadow-lg">
          <Plane className="h-4 w-4 text-white" />
        </span>
        <div className="leading-tight">
          <div className="text-sm font-semibold">TorqWings</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Design Studio</div>
        </div>
      </Link>
      {items.map(({ to, label, icon: Icon, exact }) => {
        const active = exact ? path === to : path.startsWith(to);
        return (
          <Link key={to} to={to as never}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
              active ? "bg-primary/15 text-primary border border-primary/30" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
            )}>
            <Icon className="h-4 w-4" /> {label}
          </Link>
        );
      })}
      {isAdmin && (
        <Link
          to="/mission-hub/torqwings-design-studio/sme-brain"
          className={cn(
            "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
            path.startsWith("/mission-hub/torqwings-design-studio/sme-brain")
              ? "bg-primary/15 text-primary border border-primary/30"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
          )}
        >
          <Brain className="h-4 w-4" /> SME Brain
        </Link>
      )}
      <div className="mt-auto pt-3 border-t border-border/60">
        <Link to="/mission-hub/design-studio" className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground">
          <Home className="h-4 w-4" /> Mission Hub
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
