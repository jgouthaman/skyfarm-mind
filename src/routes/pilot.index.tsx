import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/pilot/")({
  beforeLoad: () => { throw redirect({ to: "/field" }); },
  component: () => null,
});


function statusBadge(s: string) {
  const map: Record<string, string> = {
    ASSIGNED: "bg-primary/15 text-primary border-primary/30",
    IN_PROGRESS: "bg-amber-400/15 text-amber-300 border-amber-400/30",
    COMPLETED: "bg-accent/15 text-accent border-accent/30",
    SYNC_PENDING: "bg-destructive/15 text-destructive border-destructive/30",
  };
  return map[s] || "bg-muted text-muted-foreground";
}

function Dashboard() {
  const pilot = usePilotStore((s) => s.pilot);
  const missions = usePilotStore((s) => s.missions);
  const online = usePilotStore((s) => s.online);

  const today = missions.length;
  const inProgress = missions.filter((m) => m.status === "IN_PROGRESS").length;
  const completed = missions.filter((m) => m.status === "COMPLETED").length;
  const pendingSync = missions.filter((m) => m.status === "SYNC_PENDING").length;

  return (
    <div className="p-4 space-y-5">
      <div>
        <p className="text-xs text-muted-foreground">Welcome back</p>
        <h1 className="text-2xl font-semibold">Hi, {pilot?.name} 👋</h1>
        <p className="text-sm text-muted-foreground mt-1">Here's your operations overview for today.</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Assigned" value={today} icon={Leaf} tone="text-primary" />
        <Stat label="In progress" value={inProgress} icon={Loader2} tone="text-amber-300" />
        <Stat label="Completed" value={completed} icon={CheckCircle2} tone="text-accent" />
      </div>

      <div className="rounded-2xl border border-border/60 bg-gradient-card p-4 shadow-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {online ? <Wifi className="h-4 w-4 text-accent" /> : <WifiOff className="h-4 w-4 text-destructive" />}
            <span className="text-sm font-medium">{online ? "Online — syncing live" : "Offline — data stored locally"}</span>
          </div>
          <Link to="/pilot/sync" className="text-xs text-primary">Sync center →</Link>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
          <Perm label="GPS" value="Granted" icon={MapPin} />
          <Perm label="Camera" value="Granted" icon={Camera} />
          <Perm label="Battery" value="86%" icon={Battery} />
        </div>
        {pendingSync > 0 && (
          <p className="mt-3 text-[11px] text-destructive">{pendingSync} mission(s) awaiting sync.</p>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold">Assigned missions</h2>
          <Link to="/pilot/missions" className="text-xs text-primary">View all →</Link>
        </div>
        <div className="space-y-3">
          {missions.slice(0, 3).map((m) => (
            <Link key={m.id} to="/pilot/missions/$id" params={{ id: m.id }}
              className="block rounded-2xl border border-border/60 bg-gradient-card p-4 shadow-card">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-muted-foreground">{m.missionCode}</div>
                  <div className="font-semibold">{m.farmName}</div>
                </div>
                <span className={`text-[10px] px-2 py-1 rounded-full border ${statusBadge(m.status)}`}>{m.status.replace("_", " ")}</span>
              </div>
              <div className="mt-2 text-xs text-muted-foreground flex items-center gap-3">
                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{m.farmLocation}</span>
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{m.scheduledTime}</span>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-md bg-secondary/60 border border-border/60">
                  {m.missionType === "SURVEY" ? "Farm Survey" : "Spraying"}
                </span>
                <span className="text-xs text-primary flex items-center gap-1">Open mission <ArrowRight className="h-3 w-3" /></span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, icon: Icon, tone }: { label: string; value: number; icon: typeof Battery; tone: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-gradient-card p-3 shadow-card">
      <Icon className={`h-4 w-4 ${tone}`} />
      <div className="mt-2 text-2xl font-semibold">{value}</div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>
    </div>
  );
}
function Perm({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Battery }) {
  return (
    <div className="rounded-lg bg-secondary/40 border border-border/60 p-2">
      <div className="flex items-center gap-1 text-muted-foreground"><Icon className="h-3 w-3" />{label}</div>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  );
}
