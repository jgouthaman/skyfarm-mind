import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { LayoutDashboard, ListChecks, Radar, RefreshCw, User2, Plane, Wifi, WifiOff } from "lucide-react";
import { pilotStore, usePilotStore } from "@/lib/pilot-store";

export const Route = createFileRoute("/pilot")({
  head: () => ({ meta: [{ title: "AgriSky Pilot" }] }),
  component: PilotLayout,
});

const nav: { to: "/pilot" | "/pilot/missions" | "/pilot/tracking" | "/pilot/sync" | "/pilot/profile"; label: string; icon: typeof LayoutDashboard; exact?: boolean }[] = [
  { to: "/pilot", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/pilot/missions", label: "Missions", icon: ListChecks },
  { to: "/pilot/tracking", label: "Tracking", icon: Radar },
  { to: "/pilot/sync", label: "Sync", icon: RefreshCw },
  { to: "/pilot/profile", label: "Profile", icon: User2 },
];

function PilotLayout() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const pilot = usePilotStore((s) => s.pilot);
  const online = usePilotStore((s) => s.online);

  const isLogin = pathname === "/pilot/login";

  useEffect(() => {
    if (!pilot && !isLogin) navigate({ to: "/pilot/login" });
  }, [pilot, isLogin, navigate]);

  if (isLogin) return <Outlet />;
  if (!pilot) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Toaster richColors position="top-center" theme="dark" />
      <div className="mx-auto max-w-md min-h-screen flex flex-col bg-gradient-hero">
        <header className="sticky top-0 z-30 backdrop-blur bg-background/60 border-b border-border/60">
          <div className="px-4 h-14 flex items-center justify-between">
            <Link to="/pilot" className="flex items-center gap-2">
              <span className="grid place-items-center h-8 w-8 rounded-lg bg-gradient-primary shadow-glow">
                <Plane className="h-4 w-4 text-primary-foreground" />
              </span>
              <div className="leading-none">
                <div className="text-sm font-display font-semibold">AgriSky Pilot</div>
                <div className="text-[10px] text-muted-foreground">AtomSky field gateway</div>
              </div>
            </Link>
            <button
              onClick={() => pilotStore.setOnline(!online)}
              className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-full border ${online ? "bg-accent/15 text-accent border-accent/30" : "bg-destructive/15 text-destructive border-destructive/30"}`}
              title="Toggle connectivity (demo)"
            >
              {online ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {online ? "Online" : "Offline"}
            </button>
          </div>
        </header>

        <main className="flex-1 pb-24">
          <Outlet />
        </main>

        <nav className="fixed bottom-0 inset-x-0 z-40">
          <div className="mx-auto max-w-md px-3 pb-3">
            <div className="rounded-2xl border border-border/60 bg-card/90 backdrop-blur shadow-card grid grid-cols-5">
              {nav.map((n) => {
                const Icon = n.icon;
                const active = n.exact ? pathname === n.to : pathname.startsWith(n.to);
                return (
                  <Link
                    key={n.to}
                    to={n.to}
                    className={`flex flex-col items-center gap-1 py-2.5 text-[10px] ${active ? "text-primary" : "text-muted-foreground"}`}
                  >
                    <Icon className={`h-5 w-5 ${active ? "text-primary" : ""}`} />
                    <span>{n.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>
      </div>
    </div>
  );
}
