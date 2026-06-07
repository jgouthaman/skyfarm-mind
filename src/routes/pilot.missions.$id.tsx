import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { pilotStore, usePilotStore } from "@/lib/pilot-store";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, MapPin, Clock, Play, Pause, CheckCircle2, Camera, Upload, RefreshCw,
  Battery, Droplets, Satellite, Image as ImageIcon, Activity,
} from "lucide-react";

export const Route = createFileRoute("/pilot/missions/$id")({
  head: () => ({ meta: [{ title: "AgriSky Pilot — Mission" }] }),
  component: MissionDetail,
});

function statusBadge(s: string) {
  const map: Record<string, string> = {
    ASSIGNED: "bg-primary/15 text-primary border-primary/30",
    IN_PROGRESS: "bg-amber-400/15 text-amber-700 border-amber-400/30",
    COMPLETED: "bg-accent/15 text-accent border-accent/30",
    SYNC_PENDING: "bg-destructive/15 text-destructive border-destructive/30",
  };
  return map[s] || "bg-muted text-muted-foreground";
}

function MissionDetail() {
  const { id } = useParams({ from: "/pilot/missions/$id" });
  const mission = usePilotStore((s) => s.missions.find((m) => m.id === id));
  const activity = usePilotStore((s) => s.activity.filter((a) => a.missionId === id));
  const media = usePilotStore((s) => s.media.filter((m) => m.missionId === id));
  const sprayLog = usePilotStore((s) => s.sprayLogs.find((l) => l.missionId === id));
  const [tab, setTab] = useState<"overview" | "work" | "activity">("overview");

  if (!mission) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        Mission not found. <Link to="/pilot/missions" className="text-primary">Back to list</Link>
      </div>
    );
  }

  const handleStart = () => { pilotStore.startMission(mission.id); toast.success("Mission started"); };
  const handlePause = () => { pilotStore.pauseMission(mission.id); toast("Mission paused"); };
  const handleComplete = () => { pilotStore.completeMission(mission.id); toast.success("Mission completed"); };

  return (
    <div className="p-4 space-y-4">
      <Link to="/pilot/missions" className="text-xs text-muted-foreground inline-flex items-center gap-1">
        <ArrowLeft className="h-3 w-3" /> Back to missions
      </Link>

      <div className="rounded-2xl border border-border/60 bg-gradient-card p-4 shadow-card">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[11px] text-muted-foreground">{mission.missionCode}</div>
            <h1 className="text-lg font-semibold">{mission.farmName}</h1>
            <div className="text-xs text-muted-foreground flex items-center gap-3 mt-1 flex-wrap">
              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{mission.farmLocation}</span>
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{mission.scheduledTime}</span>
            </div>
          </div>
          <span className={`text-[10px] px-2 py-1 rounded-full border ${statusBadge(mission.status)}`}>{mission.status.replace("_", " ")}</span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
          <KV label="Type" value={mission.missionType === "SURVEY" ? "Farm Survey" : "Spraying"} />
          <KV label="Drone" value={mission.assignedDrone} />
          <KV label="Pilot" value={mission.pilotName} />
          <KV label="Started" value={mission.startTime || "—"} />
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <Button onClick={handleStart} disabled={mission.status === "IN_PROGRESS" || mission.status === "COMPLETED"}
            className="h-11 bg-gradient-primary text-primary-foreground"><Play className="h-4 w-4" />Start</Button>
          <Button onClick={handlePause} variant="outline" disabled={mission.status !== "IN_PROGRESS"} className="h-11"><Pause className="h-4 w-4" />Pause</Button>
          <Button onClick={handleComplete} disabled={mission.status === "COMPLETED" || mission.status === "ASSIGNED"}
            className="h-11 bg-gradient-agri text-primary-foreground"><CheckCircle2 className="h-4 w-4" />Complete</Button>
        </div>
      </div>

      <div className="flex gap-1 p-1 rounded-xl bg-secondary/40 border border-border/60">
        {(["overview", "work", "activity"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 text-xs py-2 rounded-lg capitalize ${tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
            {t === "work" ? (mission.missionType === "SURVEY" ? "Survey" : "Spraying") : t}
          </button>
        ))}
      </div>

      {tab === "overview" && <Overview mission={mission} media={media} />}
      {tab === "work" && (mission.missionType === "SURVEY"
        ? <SurveyPanel missionId={mission.id} media={media} />
        : <SprayPanel missionId={mission.id} mission={mission} existing={sprayLog} />)}
      {tab === "activity" && <ActivityPanel activity={activity} />}
    </div>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-secondary/30 border border-border/60 p-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm font-medium mt-0.5">{value}</div>
    </div>
  );
}

function Overview({ mission, media }: { mission: { progress: number; tankLevel: number }; media: { id: string }[] }) {
  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-border/60 bg-gradient-card p-4 shadow-card">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Mission progress</span>
          <span className="font-medium">{mission.progress}%</span>
        </div>
        <div className="mt-2 h-2 rounded-full bg-secondary/60 overflow-hidden">
          <div className="h-full bg-gradient-primary" style={{ width: `${mission.progress}%` }} />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-[11px]">
          <KV label="Battery" value="86%" />
          <KV label="Tank" value={`${mission.tankLevel}%`} />
          <KV label="Media" value={`${media.length}`} />
        </div>
      </div>
      <div className="rounded-2xl border border-border/60 bg-card/40 h-40 grid place-items-center text-xs text-muted-foreground grid-bg">
        <span className="flex items-center gap-2"><MapPin className="h-4 w-4" />Farm boundary map</span>
      </div>
    </div>
  );
}

function SurveyPanel({ missionId, media }: { missionId: string; media: ReturnType<typeof usePilotStore<any>> extends infer T ? any : never }) {
  const [uploading, setUploading] = useState(false);
  const allMedia = media as { id: string; fileName: string; uploadStatus: string; gpsLat: number; gpsLng: number; capturedAt: string }[];

  const handlePick = () => {
    const samples = [
      { name: `IMG_${Date.now().toString().slice(-4)}.JPG`, sizeKb: 2500 + Math.floor(Math.random() * 1500) },
      { name: `IMG_${(Date.now() + 1).toString().slice(-4)}.JPG`, sizeKb: 2500 + Math.floor(Math.random() * 1500) },
    ];
    pilotStore.addMedia(missionId, samples);
    toast.success(`${samples.length} images added to upload queue`);
  };
  const handleSync = () => {
    setUploading(true);
    allMedia.filter((m) => m.uploadStatus === "PENDING" || m.uploadStatus === "FAILED").forEach((m) => pilotStore.uploadMedia(m.id));
    setTimeout(() => { setUploading(false); toast.success("Synced to Control Center"); }, 1100);
  };

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-border/60 bg-card/40 h-40 grid place-items-center text-xs text-muted-foreground grid-bg">
        <span className="flex items-center gap-2"><MapPin className="h-4 w-4" /> 10.78712°N, 79.13784°E</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button onClick={handlePick} className="h-11 bg-gradient-primary text-primary-foreground"><Camera className="h-4 w-4" />Capture</Button>
        <Button onClick={handlePick} variant="outline" className="h-11"><Upload className="h-4 w-4" />Upload images</Button>
      </div>
      {uploading && (
        <div className="rounded-xl border border-border/60 bg-secondary/40 p-3">
          <div className="text-[11px] text-muted-foreground mb-2">Syncing to Control Center…</div>
          <div className="h-1.5 rounded-full bg-background overflow-hidden">
            <div className="h-full bg-gradient-agri animate-pulse w-2/3" />
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        {allMedia.length === 0 && (
          <div className="col-span-2 rounded-2xl border border-dashed border-border/60 p-6 text-center text-xs text-muted-foreground">
            No images captured yet. Use Capture or Upload to add aerial photos.
          </div>
        )}
        {allMedia.map((m) => (
          <div key={m.id} className="rounded-xl border border-border/60 bg-gradient-card p-2">
            <div className="h-20 rounded-lg bg-secondary/60 grid place-items-center text-muted-foreground"><ImageIcon className="h-5 w-5" /></div>
            <div className="mt-2 text-[11px] truncate font-medium">{m.fileName}</div>
            <div className="text-[10px] text-muted-foreground">{m.gpsLat}, {m.gpsLng}</div>
            <div className="text-[10px] flex items-center justify-between mt-1">
              <span>{m.capturedAt}</span>
              <span className={m.uploadStatus === "UPLOADED" ? "text-accent" : m.uploadStatus === "FAILED" ? "text-destructive" : "text-amber-700"}>{m.uploadStatus}</span>
            </div>
          </div>
        ))}
      </div>
      <Button onClick={handleSync} className="w-full h-11 bg-gradient-agri text-primary-foreground"><RefreshCw className="h-4 w-4" />Sync to Control Center</Button>
      <p className="text-[11px] text-muted-foreground text-center">Images will appear in Control Center after sync.</p>
    </div>
  );
}

function SprayPanel({ missionId, mission, existing }: { missionId: string; mission: { tankLevel: number; progress: number }; existing: any }) {
  const [form, setForm] = useState({
    fertilizerType: existing?.fertilizerType ?? "Urea 46-0-0",
    quantityLoadedLiters: existing?.quantityLoadedLiters ?? 10,
    quantityUsedLiters: existing?.quantityUsedLiters ?? 6,
    areaCoveredAcres: existing?.areaCoveredAcres ?? 2.5,
    sprayStartTime: existing?.sprayStartTime ?? "11:10 AM",
    sprayEndTime: existing?.sprayEndTime ?? "",
    remarks: existing?.remarks ?? "",
  });
  const update = (k: keyof typeof form, v: string | number) => setForm((f) => ({ ...f, [k]: v }));

  const submit = () => {
    pilotStore.submitSprayLog({ missionId, ...form });
    toast.success("Spray log submitted");
  };

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-border/60 bg-card/40 h-40 grid place-items-center text-xs text-muted-foreground grid-bg">
        <span className="flex items-center gap-2"><MapPin className="h-4 w-4" />Farm boundary · spray polygon</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Metric icon={Battery} label="Battery" value="78%" />
        <Metric icon={Droplets} label="Tank" value={`${mission.tankLevel}%`} />
        <Metric icon={Satellite} label="GPS" value="Strong" />
        <Metric icon={Activity} label="Spray progress" value={`${mission.progress}%`} />
      </div>

      <div className="rounded-2xl border border-border/60 bg-gradient-card p-4 shadow-card space-y-3">
        <h3 className="text-sm font-semibold">Fertilizer / Spray details</h3>
        <Field label="Fertilizer type">
          <input value={form.fertilizerType} onChange={(e) => update("fertilizerType", e.target.value)} className={inputCls} />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Loaded (L)"><input type="number" value={form.quantityLoadedLiters} onChange={(e) => update("quantityLoadedLiters", +e.target.value)} className={inputCls} /></Field>
          <Field label="Used (L)"><input type="number" value={form.quantityUsedLiters} onChange={(e) => update("quantityUsedLiters", +e.target.value)} className={inputCls} /></Field>
          <Field label="Area (acres)"><input type="number" value={form.areaCoveredAcres} onChange={(e) => update("areaCoveredAcres", +e.target.value)} className={inputCls} /></Field>
          <Field label="Start"><input value={form.sprayStartTime} onChange={(e) => update("sprayStartTime", e.target.value)} className={inputCls} /></Field>
          <Field label="End"><input value={form.sprayEndTime} onChange={(e) => update("sprayEndTime", e.target.value)} className={inputCls} /></Field>
        </div>
        <Field label="Remarks">
          <textarea value={form.remarks} onChange={(e) => update("remarks", e.target.value)} rows={2} className={inputCls} />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={() => toast("Spraying started")} className="h-11 bg-gradient-primary text-primary-foreground">Start spraying</Button>
          <Button onClick={() => toast("Spraying stopped")} variant="outline" className="h-11">Stop spraying</Button>
        </div>
        <Button onClick={submit} className="w-full h-11 bg-gradient-agri text-primary-foreground"><Upload className="h-4 w-4" />Submit spray log</Button>
      </div>
    </div>
  );
}

const inputCls = "w-full h-10 rounded-lg bg-input/40 border border-border/60 px-3 text-sm outline-none focus:ring-2 focus:ring-ring";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Battery; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-gradient-card p-3 shadow-card">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase text-muted-foreground tracking-wider">{label}</span>
        <Icon className="h-3.5 w-3.5 text-primary" />
      </div>
      <div className="mt-1.5 text-base font-semibold">{value}</div>
    </div>
  );
}

function ActivityPanel({ activity }: { activity: { id: string; action: string; timestamp: string; createdBy: string }[] }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-gradient-card p-4 shadow-card">
      <h3 className="text-sm font-semibold mb-3">Activity timeline</h3>
      {activity.length === 0 ? (
        <p className="text-xs text-muted-foreground">No activity yet.</p>
      ) : (
        <ol className="relative border-l border-border/60 pl-4 space-y-3">
          {activity.map((a) => (
            <li key={a.id} className="relative">
              <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-primary shadow-glow" />
              <div className="text-sm font-medium">{a.action}</div>
              <div className="text-[11px] text-muted-foreground">{a.timestamp} · {a.createdBy}</div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
