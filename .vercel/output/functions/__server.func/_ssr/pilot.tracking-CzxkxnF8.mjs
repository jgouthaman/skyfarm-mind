import { r as reactExports, j as jsxRuntimeExports } from "../_libs/react.mjs";
import { t as toast } from "../_libs/sonner.mjs";
import { u as usePilotStore, p as pilotStore } from "./pilot-store-Br2zyCNy.mjs";
import { B as Button } from "./button-DjOZMqFS.mjs";
import { R as Radar, W as Wifi, a as WifiOff, M as MapPin, n as ArrowUp, G as Gauge, B as Battery, o as Send } from "../_libs/lucide-react.mjs";
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
function Tracking() {
  const missions = usePilotStore((s) => s.missions);
  const online = usePilotStore((s) => s.online);
  const lastTele = usePilotStore((s) => s.telemetry[s.telemetry.length - 1]);
  const active = missions.find((m) => m.status === "IN_PROGRESS") ?? missions[0];
  const [tele, setTele] = reactExports.useState({
    latitude: 10.78712,
    longitude: 79.13784,
    altitude: 24,
    speed: 6.2,
    battery: 78,
    progress: active?.progress ?? 0
  });
  reactExports.useEffect(() => {
    const t = setInterval(() => {
      setTele((p) => ({
        latitude: +(p.latitude + (Math.random() - 0.5) * 5e-4).toFixed(5),
        longitude: +(p.longitude + (Math.random() - 0.5) * 5e-4).toFixed(5),
        altitude: Math.max(10, +(p.altitude + (Math.random() - 0.5)).toFixed(1)),
        speed: Math.max(0, +(p.speed + (Math.random() - 0.5)).toFixed(1)),
        battery: Math.max(0, +(p.battery - Math.random() * 0.1).toFixed(1)),
        progress: Math.min(100, +(p.progress + 0.4).toFixed(1))
      }));
    }, 1800);
    return () => clearInterval(t);
  }, []);
  const send = () => {
    if (!active) return;
    pilotStore.sendTelemetry({
      missionId: active.id,
      droneId: active.assignedDrone,
      latitude: tele.latitude,
      longitude: tele.longitude,
      altitude: tele.altitude,
      speed: tele.speed,
      battery: tele.battery,
      gpsSignal: "Strong"
    });
    toast.success(online ? "Live update sent to Control Center" : "Queued — will sync when online");
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 space-y-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-xl font-semibold", children: "Live mission tracking" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground", children: active ? `${active.farmName} · ${active.missionCode}` : "No active mission" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative rounded-2xl border border-border/60 bg-card/40 h-56 overflow-hidden grid-bg", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 bg-gradient-hero opacity-40" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute", style: {
        left: `${30 + tele.longitude % 0.01 * 5e3}%`,
        top: `${40 + tele.latitude % 0.01 * 5e3}%`,
        transform: "translate(-50%, -50%)"
      }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-3 w-3 rounded-full bg-primary shadow-glow ring-4 ring-primary/30 animate-pulse" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "absolute bottom-3 left-3 text-[11px] text-muted-foreground flex items-center gap-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Radar, { className: "h-3 w-3 text-primary" }),
        " Drone telemetry stream"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "absolute top-3 right-3 text-[11px] flex items-center gap-1 px-2 py-1 rounded-full bg-background/60 border border-border/60", children: [
        online ? /* @__PURE__ */ jsxRuntimeExports.jsx(Wifi, { className: "h-3 w-3 text-accent" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(WifiOff, { className: "h-3 w-3 text-destructive" }),
        online ? "Connected" : "Offline"
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Tile, { icon: MapPin, label: "Latitude", value: tele.latitude.toString() }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Tile, { icon: MapPin, label: "Longitude", value: tele.longitude.toString() }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Tile, { icon: ArrowUp, label: "Altitude", value: `${tele.altitude} m` }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Tile, { icon: Gauge, label: "Speed", value: `${tele.speed} m/s` }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Tile, { icon: Battery, label: "Battery", value: `${tele.battery}%` }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Tile, { icon: Radar, label: "Progress", value: `${tele.progress}%` })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-2xl border border-border/60 bg-gradient-card p-4 shadow-card", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between text-xs text-muted-foreground", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Last synced" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: lastTele?.timestamp ?? "—" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { onClick: send, className: "w-full mt-3 h-11 bg-gradient-primary text-primary-foreground", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Send, { className: "h-4 w-4" }),
        "Send live update"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-3 text-[11px] text-muted-foreground", children: "For MVP, the mobile app simulates drone location. Later this can be replaced by real drone telemetry." })
    ] })
  ] });
}
function Tile({
  icon: Icon,
  label,
  value
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-2xl border border-border/60 bg-gradient-card p-3 shadow-card", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] uppercase text-muted-foreground tracking-wider", children: label }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: "h-3.5 w-3.5 text-primary" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1 text-base font-semibold tabular-nums", children: value })
  ] });
}
export {
  Tracking as component
};
