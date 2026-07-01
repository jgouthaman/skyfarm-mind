import { j as jsxRuntimeExports } from "../_libs/react.mjs";
import { d as useNavigate } from "../_libs/tanstack__react-router.mjs";
import { t as toast } from "../_libs/sonner.mjs";
import { u as usePilotStore, p as pilotStore } from "./pilot-store-Br2zyCNy.mjs";
import { B as Button } from "./button-DjOZMqFS.mjs";
import { M as MapPin, C as Camera, H as HardDrive, q as LogOut, g as CircleCheck, r as CircleX } from "../_libs/lucide-react.mjs";
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
function Profile() {
  const navigate = useNavigate();
  const pilot = usePilotStore((s) => s.pilot);
  const online = usePilotStore((s) => s.online);
  const logout = () => {
    pilotStore.logout();
    toast.success("Signed out");
    navigate({
      to: "/pilot/login"
    });
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 space-y-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-2xl border border-border/60 bg-gradient-card p-5 shadow-card flex items-center gap-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-14 w-14 rounded-full bg-gradient-primary grid place-items-center text-lg font-semibold text-primary-foreground shadow-glow", children: pilot?.name.slice(0, 1) ?? "P" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-semibold", children: pilot?.name }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-xs text-muted-foreground", children: [
          "+91 ",
          pilot?.mobile
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1 text-[10px] inline-block px-2 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/30", children: "PILOT" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { title: "Operations", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { label: "Assigned drone", value: "AS-DRN-014" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { label: "Squadron", value: "South India · Cluster 3" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { label: "App version", value: "v0.9.0 (MVP)" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { title: "Device permissions", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(PermRow, { icon: MapPin, label: "Location", granted: true }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(PermRow, { icon: Camera, label: "Camera", granted: true }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(PermRow, { icon: HardDrive, label: "Storage", granted: true })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { title: "Backend API status", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { label: "Auth service", value: online ? "Connected" : "Unreachable", tone: online ? "ok" : "bad" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { label: "Mission API", value: online ? "Connected" : "Queued", tone: online ? "ok" : "bad" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { label: "Media upload", value: online ? "Connected" : "Offline", tone: online ? "ok" : "bad" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { label: "Telemetry stream", value: online ? "Live" : "Buffered", tone: online ? "ok" : "bad" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { onClick: logout, variant: "outline", className: "w-full h-11", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(LogOut, { className: "h-4 w-4" }),
      "Log out"
    ] })
  ] });
}
function Card({
  title,
  children
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-2xl border border-border/60 bg-gradient-card p-4 shadow-card", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-semibold mb-3", children: title }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-2", children })
  ] });
}
function Row({
  label,
  value,
  tone
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between text-xs", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: tone === "ok" ? "text-accent" : tone === "bad" ? "text-destructive" : "", children: value })
  ] });
}
function PermRow({
  icon: Icon,
  label,
  granted
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between text-xs", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-2 text-muted-foreground", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: "h-3.5 w-3.5" }),
      label
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: `flex items-center gap-1 ${granted ? "text-accent" : "text-destructive"}`, children: [
      granted ? /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "h-3.5 w-3.5" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(CircleX, { className: "h-3.5 w-3.5" }),
      granted ? "Granted" : "Denied"
    ] })
  ] });
}
export {
  Profile as component
};
