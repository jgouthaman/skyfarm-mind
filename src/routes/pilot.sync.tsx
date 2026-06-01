import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { pilotStore, usePilotStore } from "@/lib/pilot-store";
import { Button } from "@/components/ui/button";
import { RefreshCw, Image as ImageIcon, Activity, FlaskConical, Radar, CheckCircle2, Wifi, WifiOff } from "lucide-react";

export const Route = createFileRoute("/pilot/sync")({
  head: () => ({ meta: [{ title: "AgriSky Pilot — Sync Center" }] }),
  component: SyncCenter,
});

function SyncCenter() {
  const online = usePilotStore((s) => s.online);
  const lastSync = usePilotStore((s) => s.lastSync);
  const media = usePilotStore((s) => s.media);
  const sprayLogs = usePilotStore((s) => s.sprayLogs);
  const telemetry = usePilotStore((s) => s.telemetry);
  const missions = usePilotStore((s) => s.missions);

  const pendingMedia = media.filter((m) => m.uploadStatus !== "UPLOADED");
  const pendingSpray = sprayLogs.filter((l) => !l.synced);
  const pendingTele = telemetry.filter((t) => !t.synced);
  const pendingMissions = missions.filter((m) => m.status === "SYNC_PENDING");
  const totalPending = pendingMedia.length + pendingSpray.length + pendingTele.length + pendingMissions.length;

  const syncAll = () => {
    if (!online) return toast.error("Offline — connect to sync");
    pilotStore.syncAll();
    toast.success("All pending data synced to Control Center");
  };

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Sync center</h1>
        <p className="text-sm text-muted-foreground">Data is stored locally until internet is available.</p>
      </div>

      <div className="rounded-2xl border border-border/60 bg-gradient-card p-4 shadow-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {online ? <Wifi className="h-4 w-4 text-accent" /> : <WifiOff className="h-4 w-4 text-destructive" />}
            <span className="text-sm font-medium">{online ? "Online" : "Offline"}</span>
          </div>
          <span className="text-[11px] text-muted-foreground">Last sync: {lastSync ?? "Never"}</span>
        </div>
        <Button onClick={syncAll} disabled={totalPending === 0}
          className="w-full mt-3 h-11 bg-gradient-primary text-primary-foreground">
          <RefreshCw className="h-4 w-4" />Sync all ({totalPending})
        </Button>
      </div>

      {totalPending === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
          <CheckCircle2 className="h-6 w-6 mx-auto text-accent mb-2" />
          Everything is up to date.
        </div>
      ) : (
        <div className="space-y-3">
          <Bucket icon={ImageIcon} label="Pending images" count={pendingMedia.length}
            items={pendingMedia.map((m) => ({ id: m.id, primary: m.fileName, secondary: `${(m.sizeKb / 1024).toFixed(1)} MB · ${m.uploadStatus}` }))}
            onRetry={(id) => { pilotStore.retryMedia(id); toast.success("Retrying upload"); }} />
          <Bucket icon={Radar} label="Pending telemetry" count={pendingTele.length}
            items={pendingTele.map((t, i) => ({ id: `t-${i}`, primary: `${t.droneId} @ ${t.timestamp}`, secondary: `${t.latitude}, ${t.longitude}` }))} />
          <Bucket icon={FlaskConical} label="Pending spray logs" count={pendingSpray.length}
            items={pendingSpray.map((l, i) => ({ id: `s-${i}`, primary: `${l.fertilizerType} · ${l.areaCoveredAcres} ac`, secondary: `Mission ${l.missionId}` }))} />
          <Bucket icon={Activity} label="Pending mission updates" count={pendingMissions.length}
            items={pendingMissions.map((m) => ({ id: m.id, primary: m.farmName, secondary: `${m.missionCode} · ${m.status.replace("_", " ")}` }))} />
        </div>
      )}
    </div>
  );
}

function Bucket({ icon: Icon, label, count, items, onRetry }: {
  icon: typeof RefreshCw; label: string; count: number;
  items: { id: string; primary: string; secondary: string }[];
  onRetry?: (id: string) => void;
}) {
  if (count === 0) return null;
  return (
    <div className="rounded-2xl border border-border/60 bg-gradient-card p-4 shadow-card">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">{label}</span>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30">{count}</span>
      </div>
      <ul className="space-y-2">
        {items.map((i) => (
          <li key={i.id} className="flex items-center justify-between gap-2 text-xs rounded-lg bg-secondary/40 border border-border/60 px-3 py-2">
            <div className="min-w-0">
              <div className="font-medium truncate">{i.primary}</div>
              <div className="text-[10px] text-muted-foreground truncate">{i.secondary}</div>
            </div>
            {onRetry && (
              <button onClick={() => onRetry(i.id)} className="text-[11px] text-primary shrink-0">Retry</button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
