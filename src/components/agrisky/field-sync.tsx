import { useEffect, useState } from "react";
import {
  Smartphone, RadioTower, Image as ImageIcon, Droplets, Activity, RefreshCw,
  CheckCircle2, AlertTriangle, Clock, Eye, MapPin, Wifi, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  getIncomingMissionUpdates, getMissionMedia, getSprayLog, getTelemetry,
  getSyncHistory, getActivityLogs, formatRelative,
  type IncomingMissionUpdate, type SurveyMedia, type SprayLog as SprayLogT,
  type Telemetry as TelemetryT, type SyncHistoryItem, type ActivityEvent, type SyncStatus,
} from "@/lib/mobile-sync-api";

export const ACTIVE_MISSION_ID = "MSN-1042";

function syncBadge(status: SyncStatus | "success" | "retrying" | "failed") {
  const map: Record<string, string> = {
    synced: "bg-accent/15 text-accent border-accent/30",
    success: "bg-accent/15 text-accent border-accent/30",
    syncing: "bg-primary/15 text-primary border-primary/30",
    pending: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    retrying: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    failed: "bg-red-500/15 text-red-700 border-red-500/30",
  };
  return map[status] ?? "bg-muted text-muted-foreground border-border";
}

export function FieldSyncMonitor({ onOpenMission }: { onOpenMission: (id: string) => void }) {
  const [updates, setUpdates] = useState<IncomingMissionUpdate[]>([]);
  const [media, setMedia] = useState<SurveyMedia[]>([]);
  const [spray, setSpray] = useState<SprayLogT | null>(null);
  const [tel, setTel] = useState<TelemetryT | null>(null);
  const [history, setHistory] = useState<SyncHistoryItem[]>([]);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [pulse, setPulse] = useState(0);

  async function load() {
    setLoading(true);
    const [u, m, s, t, h, a] = await Promise.all([
      getIncomingMissionUpdates(),
      getMissionMedia(ACTIVE_MISSION_ID),
      getSprayLog(ACTIVE_MISSION_ID),
      getTelemetry(ACTIVE_MISSION_ID),
      getSyncHistory(ACTIVE_MISSION_ID),
      getActivityLogs(ACTIVE_MISSION_ID),
    ]);
    setUpdates(u); setMedia(m); setSpray(s); setTel(t); setHistory(h); setActivity(a);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);
  useEffect(() => {
    const i = setInterval(() => setPulse((p) => p + 1), 3000);
    return () => clearInterval(i);
  }, []);

  const synced = history.filter(h => h.status === "success").length;
  const pending = history.filter(h => h.status === "retrying" || h.status === "failed").length;

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-accent uppercase tracking-wider">
            <Smartphone className="h-3.5 w-3.5" />
            <span>AgriSky Pilot Mobile App → Control Center</span>
          </div>
          <h1 className="mt-1.5 text-2xl sm:text-3xl font-semibold">Field Sync Monitor</h1>
          <p className="mt-1.5 text-sm text-muted-foreground max-w-2xl">
            Live incoming mission data, survey media, spray logs, and telemetry streamed from pilots in the field.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-accent" /></span>
            Live feed
          </span>
          <Button variant="outline" size="sm" onClick={() => { load(); toast.success("Sync refreshed"); }}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SyncStat label="Active pilots" value="3" icon={RadioTower} hint="Streaming now" />
        <SyncStat label="Items synced today" value={String(synced + 142 + media.length)} icon={CheckCircle2} hint="From mobile app" tone="agri" />
        <SyncStat label="Pending sync" value={String(pending)} icon={Clock} hint={pending ? "Retrying" : "All caught up"} />
        <SyncStat label="Last sync" value={tel ? formatRelative(tel.lastUpdate) : "—"} icon={Wifi} hint={`Pulse #${pulse}`} tone="agri" />
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Live incoming missions */}
        <div className="lg:col-span-2 rounded-2xl border border-border/60 bg-gradient-card p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2"><RadioTower className="h-4 w-4 text-accent" /> Live incoming mission updates</h3>
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>{["Mission","Farm","Pilot","Status","Progress","Sync","Updated",""].map(h => <th key={h} className="text-left font-medium px-3 py-2.5">{h}</th>)}</tr>
              </thead>
              <tbody>
                {updates.map(u => (
                  <tr key={u.missionId} className="border-t border-border/60 hover:bg-muted/20">
                    <td className="px-3 py-2.5">
                      <p className="font-medium">{u.missionName}</p>
                      <p className="text-xs text-muted-foreground">{u.missionId}</p>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">{u.farm}</td>
                    <td className="px-3 py-2.5">
                      <span className="inline-flex items-center gap-1.5"><Smartphone className="h-3 w-3 text-accent" />{u.pilot}</span>
                    </td>
                    <td className="px-3 py-2.5">{u.status}</td>
                    <td className="px-3 py-2.5 w-32">
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full bg-gradient-agri" style={{ width: `${u.progress}%` }} /></div>
                      <div className="text-xs text-muted-foreground mt-1">{u.progress}%</div>
                    </td>
                    <td className="px-3 py-2.5"><span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${syncBadge(u.syncStatus)}`}>{u.syncStatus}</span></td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{formatRelative(u.lastUpdate)}</td>
                    <td className="px-3 py-2.5">
                      <Button size="sm" variant="ghost" onClick={() => onOpenMission(u.missionId)}><Eye className="h-3.5 w-3.5" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Activity timeline */}
        <div className="rounded-2xl border border-border/60 bg-gradient-card p-5 shadow-card">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><Activity className="h-4 w-4 text-accent" /> Activity timeline</h3>
          <ol className="relative border-l border-border/60 ml-2 space-y-4 max-h-[420px] overflow-y-auto pr-2">
            {activity.slice().reverse().map(a => (
              <li key={a.id} className="pl-5 relative">
                <span className={`absolute -left-[7px] top-1.5 h-3 w-3 rounded-full border-2 border-background ${a.source === "Mobile App" ? "bg-accent" : "bg-primary"}`} />
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-xs text-muted-foreground">{formatRelative(a.timestamp)}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${a.source === "Mobile App" ? "bg-accent/10 text-accent border-accent/30" : "bg-primary/10 text-primary border-primary/30"}`}>{a.source}</span>
                </div>
                <p className="text-sm mt-1">{a.description}</p>
                <p className="text-xs text-muted-foreground">by {a.actor}</p>
              </li>
            ))}
          </ol>
        </div>

        {/* Uploaded images */}
        <div className="lg:col-span-2 rounded-2xl border border-border/60 bg-gradient-card p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2"><ImageIcon className="h-4 w-4 text-accent" /> Uploaded survey images</h3>
            <span className="text-xs text-muted-foreground">{media.length} from field</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {media.map(img => (
              <div key={img.id} className="rounded-lg overflow-hidden border border-border/60 bg-card group">
                <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                  <img src={img.thumbnail} alt={img.tag} className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
                  <span className="absolute top-1.5 left-1.5 text-[10px] px-1.5 py-0.5 rounded bg-background/80 backdrop-blur border border-border/60">{img.tag}</span>
                </div>
                <div className="p-2 text-xs">
                  <p className="flex items-center gap-1 text-muted-foreground truncate"><MapPin className="h-3 w-3 shrink-0" />{img.lat.toFixed(4)}, {img.lng.toFixed(4)}</p>
                  <p className="text-muted-foreground">{formatRelative(img.uploadedAt)} · {img.pilotName}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Telemetry panel */}
        <div className="rounded-2xl border border-border/60 bg-gradient-card p-5 shadow-card">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><Wifi className="h-4 w-4 text-accent" /> Live telemetry · {ACTIVE_MISSION_ID}</h3>
          {tel ? (
            <div className="space-y-3 text-sm">
              <TelRow label="Battery" value={`${tel.battery}%`} />
              <TelRow label="Altitude" value={`${tel.altitudeM} m`} />
              <TelRow label="Speed" value={`${tel.speedMs} m/s`} />
              <TelRow label="GPS" value={tel.gpsSignal} />
              <TelRow label="Progress" value={`${tel.progress}%`} />
              <TelRow label="Location" value={`${tel.lat.toFixed(4)}, ${tel.lng.toFixed(4)}`} />
              <p className="text-xs text-muted-foreground pt-2 border-t border-border/40">Last update {formatRelative(tel.lastUpdate)}</p>
            </div>
          ) : <p className="text-sm text-muted-foreground">Waiting for telemetry…</p>}
        </div>

        {/* Spray log */}
        <div className="rounded-2xl border border-border/60 bg-gradient-card p-5 shadow-card lg:col-span-2">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><Droplets className="h-4 w-4 text-accent" /> Latest spray log from field</h3>
          {spray ? (
            <div className="grid sm:grid-cols-3 gap-4 text-sm">
              <KV label="Fertilizer" value={spray.fertilizerType} />
              <KV label="Loaded" value={spray.quantityLoaded} />
              <KV label="Used" value={spray.quantityUsed} />
              <KV label="Area" value={spray.areaCovered} />
              <KV label="Submitted by" value={spray.pilotName} />
              <KV label="Status" value={spray.completionStatus.replace("_", " ")} />
              <div className="sm:col-span-3 text-xs text-muted-foreground border-t border-border/40 pt-3">
                <span className="text-accent">From mobile app · </span>{spray.pilotRemarks}
              </div>
            </div>
          ) : <p className="text-sm text-muted-foreground">No spray log yet.</p>}
        </div>

        {/* Sync status */}
        <div className="rounded-2xl border border-border/60 bg-gradient-card p-5 shadow-card">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><RefreshCw className="h-4 w-4 text-accent" /> Sync status</h3>
          <div className="space-y-2 text-sm">
            {history.slice(0, 6).map(s => (
              <div key={s.id} className="flex items-center justify-between gap-3 border-b border-border/40 pb-2 last:border-0">
                <div className="min-w-0">
                  <p className="font-medium truncate">{s.dataType} <span className="text-xs text-muted-foreground">×{s.count}</span></p>
                  <p className="text-xs text-muted-foreground">{formatRelative(s.timestamp)}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${syncBadge(s.status)}`}>{s.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function SyncStat({ label, value, hint, icon: Icon, tone = "primary" }: { label: string; value: string; hint?: string; icon: React.ComponentType<{ className?: string }>; tone?: "primary" | "agri" }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-gradient-card p-5 shadow-card">
      <span className={`grid place-items-center h-9 w-9 rounded-lg border ${tone === "agri" ? "bg-accent/10 border-accent/30 text-accent" : "bg-primary/10 border-primary/20 text-primary"}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="mt-4 text-2xl font-display font-semibold">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
      {hint && <div className="mt-2 text-xs text-accent">{hint}</div>}
    </div>
  );
}

function TelRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-border/40 pb-2">
      <span className="text-muted-foreground">{label}</span><span className="font-medium">{value}</span>
    </div>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium mt-0.5">{value}</p>
    </div>
  );
}

/* ---------- MISSION DETAIL with 7 tabs ---------- */

type MTab = "overview" | "images" | "boundary" | "spray" | "telemetry" | "activity" | "sync";
const mTabs: { id: MTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "overview", label: "Overview", icon: Eye },
  { id: "images", label: "Survey Images", icon: ImageIcon },
  { id: "boundary", label: "Boundary", icon: MapPin },
  { id: "spray", label: "Spray Log", icon: Droplets },
  { id: "telemetry", label: "Telemetry", icon: Wifi },
  { id: "activity", label: "Activity Log", icon: Activity },
  { id: "sync", label: "Sync History", icon: RefreshCw },
];

export function MissionDetail({ missionId, onBack }: { missionId: string; onBack: () => void }) {
  const [tab, setTab] = useState<MTab>("overview");
  const [media, setMedia] = useState<SurveyMedia[]>([]);
  const [spray, setSpray] = useState<SprayLogT | null>(null);
  const [tel, setTel] = useState<TelemetryT | null>(null);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [history, setHistory] = useState<SyncHistoryItem[]>([]);

  useEffect(() => {
    Promise.all([
      getMissionMedia(missionId),
      getSprayLog(missionId),
      getTelemetry(missionId),
      getActivityLogs(missionId),
      getSyncHistory(missionId),
    ]).then(([m, s, t, a, h]) => { setMedia(m); setSpray(s); setTel(t); setActivity(a); setHistory(h); });
  }, [missionId]);

  const lastSync = history.find(h => h.status === "success");
  const pilot = activity.find(a => a.source === "Mobile App")?.actor ?? "Karthik R.";

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div>
          <button onClick={onBack} className="text-xs text-muted-foreground hover:text-foreground mb-2">← Back to Spraying Missions</button>
          <h1 className="text-2xl sm:text-3xl font-semibold">Mission {missionId}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Arunamangala Farm · Zone B · Leafy Greens · Spraying</p>
        </div>
        <div className="rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 text-sm">
          <div className="flex items-center gap-2 text-xs text-accent uppercase tracking-wider">
            <Smartphone className="h-3.5 w-3.5" /> Mobile App Sync
          </div>
          <p className="mt-1 font-medium flex items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded-full border ${syncBadge("synced")}`}>Synced</span>
            <span className="text-muted-foreground text-xs">Last synced by {pilot} · {lastSync ? formatRelative(lastSync.timestamp) : "—"}</span>
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-border/60 mb-5 overflow-x-auto">
        {mTabs.map(t => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 -mb-px transition-colors whitespace-nowrap ${active ? "border-accent text-accent" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              <Icon className="h-3.5 w-3.5" /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === "overview" && <OverviewTab spray={spray} tel={tel} media={media} pilot={pilot} lastSync={lastSync?.timestamp} />}
      {tab === "images" && <ImagesTab media={media} />}
      {tab === "boundary" && <BoundaryTab />}
      {tab === "spray" && <SprayTab spray={spray} />}
      {tab === "telemetry" && <TelemetryTab tel={tel} />}
      {tab === "activity" && <ActivityTab activity={activity} />}
      {tab === "sync" && <SyncTab history={history} />}
    </>
  );
}

function OverviewTab({ spray, tel, media, pilot, lastSync }: { spray: SprayLogT | null; tel: TelemetryT | null; media: SurveyMedia[]; pilot: string; lastSync?: string }) {
  return (
    <div className="grid lg:grid-cols-3 gap-5">
      <div className="rounded-2xl border border-border/60 bg-gradient-card p-5 shadow-card lg:col-span-2 space-y-4">
        <h3 className="font-semibold">Mission summary</h3>
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <KV label="Pilot (mobile app)" value={pilot} />
          <KV label="Last synced" value={lastSync ? formatRelative(lastSync) : "—"} />
          <KV label="Images uploaded" value={`${media.length}`} />
          <KV label="Spray status" value={spray?.completionStatus ?? "—"} />
          <KV label="Area covered" value={spray?.areaCovered ?? "—"} />
          <KV label="Telemetry" value={tel ? `${tel.battery}% · ${tel.progress}%` : "—"} />
        </div>
      </div>
      <div className="rounded-2xl border border-accent/30 bg-accent/5 p-5 shadow-card">
        <div className="flex items-center gap-2 text-xs text-accent uppercase tracking-wider">
          <Smartphone className="h-3.5 w-3.5" /> Field data source
        </div>
        <p className="mt-2 text-sm">All survey images, spray logs, and telemetry on this page were captured and synced by the AgriSky Pilot Mobile App.</p>
      </div>
    </div>
  );
}

function ImagesTab({ media }: { media: SurveyMedia[] }) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {media.map(img => (
        <div key={img.id} className="rounded-2xl border border-border/60 bg-gradient-card overflow-hidden shadow-card">
          <div className="aspect-[4/3] bg-muted overflow-hidden">
            <img src={img.url} alt={img.tag} className="w-full h-full object-cover" loading="lazy" />
          </div>
          <div className="p-4 space-y-1.5 text-sm">
            <p className="font-medium flex items-center gap-2"><span className="text-xs px-2 py-0.5 rounded-full border bg-accent/10 text-accent border-accent/30">{img.tag}</span></p>
            <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> {img.lat.toFixed(5)}, {img.lng.toFixed(5)}</p>
            <p className="text-xs text-muted-foreground">Uploaded {formatRelative(img.uploadedAt)} · {img.pilotName}</p>
            <Button size="sm" variant="outline" className="w-full mt-2" onClick={() => toast(`Opening ${img.lat.toFixed(4)}, ${img.lng.toFixed(4)} on map`)}>
              <MapPin className="h-3.5 w-3.5 mr-1" /> View on Map
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function BoundaryTab() {
  return (
    <div className="rounded-2xl border border-border/60 bg-gradient-card p-5 shadow-card">
      <div className="aspect-[16/9] rounded-xl border border-border/60 bg-muted/40 relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-40" />
        <svg viewBox="0 0 800 450" className="absolute inset-0 w-full h-full">
          <polygon points="100,80 700,70 720,380 110,400" fill="oklch(0.7 0.13 165 / 0.12)" stroke="oklch(0.7 0.13 165)" strokeWidth="2" strokeDasharray="6 4" />
          <text x="400" y="240" textAnchor="middle" fill="white" fontSize="14" opacity="0.8">Zone B · 0.5 acre · synced from mobile app</text>
        </svg>
      </div>
    </div>
  );
}

function SprayTab({ spray }: { spray: SprayLogT | null }) {
  if (!spray) return <p className="text-sm text-muted-foreground">No spray log submitted yet.</p>;
  return (
    <div className="rounded-2xl border border-border/60 bg-gradient-card p-5 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2"><Droplets className="h-4 w-4 text-accent" /> Spray log from field</h3>
        <span className="text-xs text-accent flex items-center gap-1"><Smartphone className="h-3 w-3" /> Submitted from mobile app</span>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
        <KV label="Fertilizer type" value={spray.fertilizerType} />
        <KV label="Quantity loaded" value={spray.quantityLoaded} />
        <KV label="Quantity used" value={spray.quantityUsed} />
        <KV label="Area covered" value={spray.areaCovered} />
        <KV label="Spray start" value={new Date(spray.startTime).toLocaleString()} />
        <KV label="Spray end" value={new Date(spray.endTime).toLocaleString()} />
        <KV label="Pilot" value={spray.pilotName} />
        <KV label="Status" value={spray.completionStatus} />
        <KV label="Submitted" value={formatRelative(spray.submittedAt)} />
      </div>
      <div className="mt-4 rounded-lg border border-border/60 bg-card p-3 text-sm">
        <p className="text-xs text-muted-foreground mb-1">Pilot remarks</p>
        <p>{spray.pilotRemarks}</p>
      </div>
    </div>
  );
}

function TelemetryTab({ tel }: { tel: TelemetryT | null }) {
  if (!tel) return <p className="text-sm text-muted-foreground">Waiting for telemetry…</p>;
  return (
    <div className="grid lg:grid-cols-3 gap-5">
      <div className="lg:col-span-2 rounded-2xl border border-border/60 bg-gradient-card p-5 shadow-card">
        <div className="aspect-[16/9] rounded-xl border border-border/60 bg-muted/40 relative overflow-hidden">
          <div className="absolute inset-0 grid-bg opacity-40" />
          <div className="absolute" style={{ left: "62%", top: "44%" }}>
            <span className="relative flex h-4 w-4"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" /><span className="relative inline-flex rounded-full h-4 w-4 bg-accent" /></span>
          </div>
          <div className="absolute bottom-3 left-3 text-xs bg-background/80 backdrop-blur px-2 py-1 rounded border border-border/60">
            Drone live · {tel.lat.toFixed(4)}, {tel.lng.toFixed(4)}
          </div>
        </div>
      </div>
      <div className="rounded-2xl border border-border/60 bg-gradient-card p-5 shadow-card space-y-3 text-sm">
        <TelRow label="Battery" value={`${tel.battery}%`} />
        <TelRow label="Altitude" value={`${tel.altitudeM} m`} />
        <TelRow label="Speed" value={`${tel.speedMs} m/s`} />
        <TelRow label="GPS signal" value={tel.gpsSignal} />
        <TelRow label="Mission progress" value={`${tel.progress}%`} />
        <TelRow label="Last update" value={formatRelative(tel.lastUpdate)} />
      </div>
    </div>
  );
}

function ActivityTab({ activity }: { activity: ActivityEvent[] }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-gradient-card p-5 shadow-card">
      <ol className="relative border-l border-border/60 ml-2 space-y-4">
        {activity.map(a => (
          <li key={a.id} className="pl-5 relative">
            <span className={`absolute -left-[7px] top-1.5 h-3 w-3 rounded-full border-2 border-background ${a.source === "Mobile App" ? "bg-accent" : "bg-primary"}`} />
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="text-xs text-muted-foreground">{new Date(a.timestamp).toLocaleString()}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${a.source === "Mobile App" ? "bg-accent/10 text-accent border-accent/30" : "bg-primary/10 text-primary border-primary/30"}`}>{a.source}</span>
            </div>
            <p className="text-sm mt-1">{a.description}</p>
            <p className="text-xs text-muted-foreground">by {a.actor}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

function SyncTab({ history }: { history: SyncHistoryItem[] }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-gradient-card shadow-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>{["Data type","Synced from","Items","Status","Timestamp","Retry"].map(h => <th key={h} className="text-left font-medium px-4 py-3">{h}</th>)}</tr>
          </thead>
          <tbody>
            {history.map(h => (
              <tr key={h.id} className="border-t border-border/60">
                <td className="px-4 py-3 font-medium">{h.dataType}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Smartphone className="h-3 w-3 text-accent" /> {h.source}</span>
                </td>
                <td className="px-4 py-3">{h.count}</td>
                <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${syncBadge(h.status)}`}>{h.status}</span></td>
                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{new Date(h.timestamp).toLocaleString()}</td>
                <td className="px-4 py-3 text-xs">
                  {h.status === "retrying" ? <span className="text-yellow-400 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> retry {h.retryCount} · {h.errorMessage}</span> : <span className="text-muted-foreground">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
