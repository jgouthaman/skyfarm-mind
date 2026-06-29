import { r as reactExports, j as jsxRuntimeExports } from "../_libs/react.mjs";
import { g as useParams, L as Link } from "../_libs/tanstack__react-router.mjs";
import { t as toast } from "../_libs/sonner.mjs";
import { u as usePilotStore, p as pilotStore } from "./pilot-store-Br2zyCNy.mjs";
import { B as Button } from "./button-DjOZMqFS.mjs";
import { A as ArrowLeft, M as MapPin, v as Clock, ao as Play, ap as Pause, g as CircleCheck, C as Camera, f as Upload, I as Image, c as RefreshCw, B as Battery, al as Droplets, j as Satellite, l as Activity } from "../_libs/lucide-react.mjs";
import "../_libs/tanstack__router-core.mjs";
import "../_libs/tanstack__history.mjs";
import "../_libs/cookie-es.mjs";
import "../_libs/seroval.mjs";
import "../_libs/seroval-plugins.mjs";
import "node:stream/web";
import "node:stream";
import "../_libs/react-dom.mjs";
import "util";
import "crypto";
import "async_hooks";
import "stream";
import "../_libs/isbot.mjs";
import "../_libs/radix-ui__react-slot.mjs";
import "../_libs/radix-ui__react-compose-refs.mjs";
import "../_libs/class-variance-authority.mjs";
import "../_libs/clsx.mjs";
import "../_libs/tailwind-merge.mjs";
function statusBadge(s) {
  const map = {
    ASSIGNED: "bg-primary/15 text-primary border-primary/30",
    IN_PROGRESS: "bg-amber-400/15 text-amber-700 border-amber-400/30",
    COMPLETED: "bg-accent/15 text-accent border-accent/30",
    SYNC_PENDING: "bg-destructive/15 text-destructive border-destructive/30"
  };
  return map[s] || "bg-muted text-muted-foreground";
}
function MissionDetail() {
  const {
    id
  } = useParams({
    from: "/pilot/missions/$id"
  });
  const mission = usePilotStore((s) => s.missions.find((m) => m.id === id));
  const activity = usePilotStore((s) => s.activity.filter((a) => a.missionId === id));
  const media = usePilotStore((s) => s.media.filter((m) => m.missionId === id));
  const sprayLog = usePilotStore((s) => s.sprayLogs.find((l) => l.missionId === id));
  const [tab, setTab] = reactExports.useState("overview");
  if (!mission) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-6 text-center text-sm text-muted-foreground", children: [
      "Mission not found. ",
      /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/pilot/missions", className: "text-primary", children: "Back to list" })
    ] });
  }
  const handleStart = () => {
    pilotStore.startMission(mission.id);
    toast.success("Mission started");
  };
  const handlePause = () => {
    pilotStore.pauseMission(mission.id);
    toast("Mission paused");
  };
  const handleComplete = () => {
    pilotStore.completeMission(mission.id);
    toast.success("Mission completed");
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 space-y-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { to: "/pilot/missions", className: "text-xs text-muted-foreground inline-flex items-center gap-1", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowLeft, { className: "h-3 w-3" }),
      " Back to missions"
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-2xl border border-border/60 bg-gradient-card p-4 shadow-card", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[11px] text-muted-foreground", children: mission.missionCode }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-lg font-semibold", children: mission.farmName }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-xs text-muted-foreground flex items-center gap-3 mt-1 flex-wrap", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(MapPin, { className: "h-3 w-3" }),
              mission.farmLocation
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Clock, { className: "h-3 w-3" }),
              mission.scheduledTime
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `text-[10px] px-2 py-1 rounded-full border ${statusBadge(mission.status)}`, children: mission.status.replace("_", " ") })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 grid grid-cols-2 gap-2 text-[11px]", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(KV, { label: "Type", value: mission.missionType === "SURVEY" ? "Farm Survey" : "Spraying" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(KV, { label: "Drone", value: mission.assignedDrone }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(KV, { label: "Pilot", value: mission.pilotName }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(KV, { label: "Started", value: mission.startTime || "—" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 grid grid-cols-3 gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { onClick: handleStart, disabled: mission.status === "IN_PROGRESS" || mission.status === "COMPLETED", className: "h-11 bg-gradient-primary text-primary-foreground", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Play, { className: "h-4 w-4" }),
          "Start"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { onClick: handlePause, variant: "outline", disabled: mission.status !== "IN_PROGRESS", className: "h-11", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Pause, { className: "h-4 w-4" }),
          "Pause"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { onClick: handleComplete, disabled: mission.status === "COMPLETED" || mission.status === "ASSIGNED", className: "h-11 bg-gradient-agri text-primary-foreground", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "h-4 w-4" }),
          "Complete"
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex gap-1 p-1 rounded-xl bg-secondary/40 border border-border/60", children: ["overview", "work", "activity"].map((t) => /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setTab(t), className: `flex-1 text-xs py-2 rounded-lg capitalize ${tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`, children: t === "work" ? mission.missionType === "SURVEY" ? "Survey" : "Spraying" : t }, t)) }),
    tab === "overview" && /* @__PURE__ */ jsxRuntimeExports.jsx(Overview, { mission, media }),
    tab === "work" && (mission.missionType === "SURVEY" ? /* @__PURE__ */ jsxRuntimeExports.jsx(SurveyPanel, { missionId: mission.id, media }) : /* @__PURE__ */ jsxRuntimeExports.jsx(SprayPanel, { missionId: mission.id, mission, existing: sprayLog })),
    tab === "activity" && /* @__PURE__ */ jsxRuntimeExports.jsx(ActivityPanel, { activity })
  ] });
}
function KV({
  label,
  value
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg bg-secondary/30 border border-border/60 p-2", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10px] uppercase tracking-wider text-muted-foreground", children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-medium mt-0.5", children: value })
  ] });
}
function Overview({
  mission,
  media
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-2xl border border-border/60 bg-gradient-card p-4 shadow-card", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between text-xs", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: "Mission progress" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-medium", children: [
          mission.progress,
          "%"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-2 h-2 rounded-full bg-secondary/60 overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-full bg-gradient-primary", style: {
        width: `${mission.progress}%`
      } }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 grid grid-cols-3 gap-2 text-[11px]", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(KV, { label: "Battery", value: "86%" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(KV, { label: "Tank", value: `${mission.tankLevel}%` }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(KV, { label: "Media", value: `${media.length}` })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rounded-2xl border border-border/60 bg-card/40 h-40 grid place-items-center text-xs text-muted-foreground grid-bg", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(MapPin, { className: "h-4 w-4" }),
      "Farm boundary map"
    ] }) })
  ] });
}
function SurveyPanel({
  missionId,
  media
}) {
  const [uploading, setUploading] = reactExports.useState(false);
  const allMedia = media;
  const handlePick = () => {
    const samples = [{
      name: `IMG_${Date.now().toString().slice(-4)}.JPG`,
      sizeKb: 2500 + Math.floor(Math.random() * 1500)
    }, {
      name: `IMG_${(Date.now() + 1).toString().slice(-4)}.JPG`,
      sizeKb: 2500 + Math.floor(Math.random() * 1500)
    }];
    pilotStore.addMedia(missionId, samples);
    toast.success(`${samples.length} images added to upload queue`);
  };
  const handleSync = () => {
    setUploading(true);
    allMedia.filter((m) => m.uploadStatus === "PENDING" || m.uploadStatus === "FAILED").forEach((m) => pilotStore.uploadMedia(m.id));
    setTimeout(() => {
      setUploading(false);
      toast.success("Synced to Control Center");
    }, 1100);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rounded-2xl border border-border/60 bg-card/40 h-40 grid place-items-center text-xs text-muted-foreground grid-bg", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(MapPin, { className: "h-4 w-4" }),
      " 10.78712°N, 79.13784°E"
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { onClick: handlePick, className: "h-11 bg-gradient-primary text-primary-foreground", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Camera, { className: "h-4 w-4" }),
        "Capture"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { onClick: handlePick, variant: "outline", className: "h-11", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Upload, { className: "h-4 w-4" }),
        "Upload images"
      ] })
    ] }),
    uploading && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-border/60 bg-secondary/40 p-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[11px] text-muted-foreground mb-2", children: "Syncing to Control Center…" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-1.5 rounded-full bg-background overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-full bg-gradient-agri animate-pulse w-2/3" }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
      allMedia.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "col-span-2 rounded-2xl border border-dashed border-border/60 p-6 text-center text-xs text-muted-foreground", children: "No images captured yet. Use Capture or Upload to add aerial photos." }),
      allMedia.map((m) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-border/60 bg-gradient-card p-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-20 rounded-lg bg-secondary/60 grid place-items-center text-muted-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Image, { className: "h-5 w-5" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-2 text-[11px] truncate font-medium", children: m.fileName }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-[10px] text-muted-foreground", children: [
          m.gpsLat,
          ", ",
          m.gpsLng
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-[10px] flex items-center justify-between mt-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: m.capturedAt }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: m.uploadStatus === "UPLOADED" ? "text-accent" : m.uploadStatus === "FAILED" ? "text-destructive" : "text-amber-700", children: m.uploadStatus })
        ] })
      ] }, m.id))
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { onClick: handleSync, className: "w-full h-11 bg-gradient-agri text-primary-foreground", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: "h-4 w-4" }),
      "Sync to Control Center"
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] text-muted-foreground text-center", children: "Images will appear in Control Center after sync." })
  ] });
}
function SprayPanel({
  missionId,
  mission,
  existing
}) {
  const [form, setForm] = reactExports.useState({
    fertilizerType: existing?.fertilizerType ?? "Urea 46-0-0",
    quantityLoadedLiters: existing?.quantityLoadedLiters ?? 10,
    quantityUsedLiters: existing?.quantityUsedLiters ?? 6,
    areaCoveredAcres: existing?.areaCoveredAcres ?? 2.5,
    sprayStartTime: existing?.sprayStartTime ?? "11:10 AM",
    sprayEndTime: existing?.sprayEndTime ?? "",
    remarks: existing?.remarks ?? ""
  });
  const update = (k, v) => setForm((f) => ({
    ...f,
    [k]: v
  }));
  const submit = () => {
    pilotStore.submitSprayLog({
      missionId,
      ...form
    });
    toast.success("Spray log submitted");
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rounded-2xl border border-border/60 bg-card/40 h-40 grid place-items-center text-xs text-muted-foreground grid-bg", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(MapPin, { className: "h-4 w-4" }),
      "Farm boundary · spray polygon"
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Metric, { icon: Battery, label: "Battery", value: "78%" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Metric, { icon: Droplets, label: "Tank", value: `${mission.tankLevel}%` }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Metric, { icon: Satellite, label: "GPS", value: "Strong" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Metric, { icon: Activity, label: "Spray progress", value: `${mission.progress}%` })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-2xl border border-border/60 bg-gradient-card p-4 shadow-card space-y-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-semibold", children: "Fertilizer / Spray details" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Fertilizer type", children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: form.fertilizerType, onChange: (e) => update("fertilizerType", e.target.value), className: inputCls }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Loaded (L)", children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "number", value: form.quantityLoadedLiters, onChange: (e) => update("quantityLoadedLiters", +e.target.value), className: inputCls }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Used (L)", children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "number", value: form.quantityUsedLiters, onChange: (e) => update("quantityUsedLiters", +e.target.value), className: inputCls }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Area (acres)", children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "number", value: form.areaCoveredAcres, onChange: (e) => update("areaCoveredAcres", +e.target.value), className: inputCls }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Start", children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: form.sprayStartTime, onChange: (e) => update("sprayStartTime", e.target.value), className: inputCls }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "End", children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: form.sprayEndTime, onChange: (e) => update("sprayEndTime", e.target.value), className: inputCls }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Remarks", children: /* @__PURE__ */ jsxRuntimeExports.jsx("textarea", { value: form.remarks, onChange: (e) => update("remarks", e.target.value), rows: 2, className: inputCls }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => toast("Spraying started"), className: "h-11 bg-gradient-primary text-primary-foreground", children: "Start spraying" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => toast("Spraying stopped"), variant: "outline", className: "h-11", children: "Stop spraying" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { onClick: submit, className: "w-full h-11 bg-gradient-agri text-primary-foreground", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Upload, { className: "h-4 w-4" }),
        "Submit spray log"
      ] })
    ] })
  ] });
}
const inputCls = "w-full h-10 rounded-lg bg-input/40 border border-border/60 px-3 text-sm outline-none focus:ring-2 focus:ring-ring";
function Field({
  label,
  children
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "block", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[11px] text-muted-foreground", children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1", children })
  ] });
}
function Metric({
  icon: Icon,
  label,
  value
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-border/60 bg-gradient-card p-3 shadow-card", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] uppercase text-muted-foreground tracking-wider", children: label }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: "h-3.5 w-3.5 text-primary" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1.5 text-base font-semibold", children: value })
  ] });
}
function ActivityPanel({
  activity
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-2xl border border-border/60 bg-gradient-card p-4 shadow-card", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-semibold mb-3", children: "Activity timeline" }),
    activity.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: "No activity yet." }) : /* @__PURE__ */ jsxRuntimeExports.jsx("ol", { className: "relative border-l border-border/60 pl-4 space-y-3", children: activity.map((a) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "relative", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-primary shadow-glow" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-medium", children: a.action }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-[11px] text-muted-foreground", children: [
        a.timestamp,
        " · ",
        a.createdBy
      ] })
    ] }, a.id)) })
  ] });
}
export {
  MissionDetail as component
};
