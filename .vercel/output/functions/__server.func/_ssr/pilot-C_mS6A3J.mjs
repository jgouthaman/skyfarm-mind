import { r as reactExports, j as jsxRuntimeExports } from "../_libs/react.mjs";
import { d as useNavigate, e as useRouterState, O as Outlet, L as Link } from "../_libs/tanstack__react-router.mjs";
import { T as Toaster } from "./sonner-DeNSN9-c.mjs";
import { u as usePilotStore, p as pilotStore } from "./pilot-store-Br2zyCNy.mjs";
import "../_libs/sonner.mjs";
import { P as Plane, W as Wifi, a as WifiOff, L as LayoutDashboard, b as ListChecks, R as Radar, c as RefreshCw, U as UserRound } from "../_libs/lucide-react.mjs";
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
const nav = [{
  to: "/pilot",
  label: "Dashboard",
  icon: LayoutDashboard,
  exact: true
}, {
  to: "/pilot/missions",
  label: "Missions",
  icon: ListChecks
}, {
  to: "/pilot/tracking",
  label: "Tracking",
  icon: Radar
}, {
  to: "/pilot/sync",
  label: "Sync",
  icon: RefreshCw
}, {
  to: "/pilot/profile",
  label: "Profile",
  icon: UserRound
}];
function PilotLayout() {
  const navigate = useNavigate();
  const pathname = useRouterState({
    select: (s) => s.location.pathname
  });
  const pilot = usePilotStore((s) => s.pilot);
  const online = usePilotStore((s) => s.online);
  const isLogin = pathname === "/pilot/login";
  reactExports.useEffect(() => {
    if (!pilot && !isLogin) navigate({
      to: "/pilot/login"
    });
  }, [pilot, isLogin, navigate]);
  if (isLogin) return /* @__PURE__ */ jsxRuntimeExports.jsx(Outlet, {});
  if (!pilot) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-h-screen bg-background text-foreground", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Toaster, { richColors: true, position: "top-center", theme: "dark" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mx-auto max-w-md min-h-screen flex flex-col bg-gradient-hero", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("header", { className: "sticky top-0 z-30 backdrop-blur bg-background/60 border-b border-border/60", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-4 h-14 flex items-center justify-between", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { to: "/pilot", className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "grid place-items-center h-8 w-8 rounded-lg bg-gradient-primary shadow-glow", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Plane, { className: "h-4 w-4 text-primary-foreground" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "leading-none", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-display font-semibold", children: "AgriSky Pilot" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10px] text-muted-foreground", children: "TorqWings field gateway" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => pilotStore.setOnline(!online), className: `flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-full border ${online ? "bg-accent/15 text-accent border-accent/30" : "bg-destructive/15 text-destructive border-destructive/30"}`, title: "Toggle connectivity (demo)", children: [
          online ? /* @__PURE__ */ jsxRuntimeExports.jsx(Wifi, { className: "h-3 w-3" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(WifiOff, { className: "h-3 w-3" }),
          online ? "Online" : "Offline"
        ] })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("main", { className: "flex-1 pb-24", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Outlet, {}) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("nav", { className: "fixed bottom-0 inset-x-0 z-40", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mx-auto max-w-md px-3 pb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rounded-2xl border border-border/60 bg-card/90 backdrop-blur shadow-card grid grid-cols-5", children: nav.map((n) => {
        const Icon = n.icon;
        const active = n.exact ? pathname === n.to : pathname.startsWith(n.to);
        return /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { to: n.to, className: `flex flex-col items-center gap-1 py-2.5 text-[10px] ${active ? "text-primary" : "text-muted-foreground"}`, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: `h-5 w-5 ${active ? "text-primary" : ""}` }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: n.label })
        ] }, n.to);
      }) }) }) })
    ] })
  ] });
}
export {
  PilotLayout as component
};
