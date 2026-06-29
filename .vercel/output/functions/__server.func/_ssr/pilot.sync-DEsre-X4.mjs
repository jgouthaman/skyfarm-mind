import { j as jsxRuntimeExports } from "../_libs/react.mjs";
import { t as toast } from "../_libs/sonner.mjs";
import { u as usePilotStore, p as pilotStore } from "./pilot-store-Br2zyCNy.mjs";
import { B as Button } from "./button-DjOZMqFS.mjs";
import { W as Wifi, a as WifiOff, c as RefreshCw, g as CircleCheck, I as Image, R as Radar, F as FlaskConical, l as Activity } from "../_libs/lucide-react.mjs";
import "../_libs/react-dom.mjs";
import "util";
import "crypto";
import "async_hooks";
import "stream";
import "../_libs/radix-ui__react-slot.mjs";
import "../_libs/radix-ui__react-compose-refs.mjs";
import "../_libs/class-variance-authority.mjs";
import "../_libs/clsx.mjs";
import "../_libs/tailwind-merge.mjs";
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
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 space-y-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-xl font-semibold", children: "Sync center" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground", children: "Data is stored locally until internet is available." })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-2xl border border-border/60 bg-gradient-card p-4 shadow-card", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
          online ? /* @__PURE__ */ jsxRuntimeExports.jsx(Wifi, { className: "h-4 w-4 text-accent" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(WifiOff, { className: "h-4 w-4 text-destructive" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-medium", children: online ? "Online" : "Offline" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[11px] text-muted-foreground", children: [
          "Last sync: ",
          lastSync ?? "Never"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { onClick: syncAll, disabled: totalPending === 0, className: "w-full mt-3 h-11 bg-gradient-primary text-primary-foreground", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: "h-4 w-4" }),
        "Sync all (",
        totalPending,
        ")"
      ] })
    ] }),
    totalPending === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-2xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "h-6 w-6 mx-auto text-accent mb-2" }),
      "Everything is up to date."
    ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Bucket, { icon: Image, label: "Pending images", count: pendingMedia.length, items: pendingMedia.map((m) => ({
        id: m.id,
        primary: m.fileName,
        secondary: `${(m.sizeKb / 1024).toFixed(1)} MB · ${m.uploadStatus}`
      })), onRetry: (id) => {
        pilotStore.retryMedia(id);
        toast.success("Retrying upload");
      } }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Bucket, { icon: Radar, label: "Pending telemetry", count: pendingTele.length, items: pendingTele.map((t, i) => ({
        id: `t-${i}`,
        primary: `${t.droneId} @ ${t.timestamp}`,
        secondary: `${t.latitude}, ${t.longitude}`
      })) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Bucket, { icon: FlaskConical, label: "Pending spray logs", count: pendingSpray.length, items: pendingSpray.map((l, i) => ({
        id: `s-${i}`,
        primary: `${l.fertilizerType} · ${l.areaCoveredAcres} ac`,
        secondary: `Mission ${l.missionId}`
      })) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Bucket, { icon: Activity, label: "Pending mission updates", count: pendingMissions.length, items: pendingMissions.map((m) => ({
        id: m.id,
        primary: m.farmName,
        secondary: `${m.missionCode} · ${m.status.replace("_", " ")}`
      })) })
    ] })
  ] });
}
function Bucket({
  icon: Icon,
  label,
  count,
  items,
  onRetry
}) {
  if (count === 0) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-2xl border border-border/60 bg-gradient-card p-4 shadow-card", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: "h-4 w-4 text-primary" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-medium", children: label })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30", children: count })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "space-y-2", children: items.map((i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex items-center justify-between gap-2 text-xs rounded-lg bg-secondary/40 border border-border/60 px-3 py-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-medium truncate", children: i.primary }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10px] text-muted-foreground truncate", children: i.secondary })
      ] }),
      onRetry && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => onRetry(i.id), className: "text-[11px] text-primary shrink-0", children: "Retry" })
    ] }, i.id)) })
  ] });
}
export {
  SyncCenter as component
};
