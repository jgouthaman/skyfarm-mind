import { j as jsxRuntimeExports } from "./_libs/react.mjs";
import { L as Link } from "./_libs/tanstack__react-router.mjs";
import { B as Button } from "./_ssr/button-DjOZMqFS.mjs";
import { C as Card } from "./_ssr/Card-Diw2V0Z0.mjs";
import { I as IconBubble } from "./_ssr/IconBubble-CjOnHlj0.mjs";
import { af as Flame, l as ArrowRight, _ as Eye, t as Bell, a6 as Zap, a1 as Package, R as Radar, E as Building2, ag as Sun, J as Sprout, z as GraduationCap, D as Map, ah as Earth } from "./_libs/lucide-react.mjs";
import "./_libs/tanstack__router-core.mjs";
import "./_libs/tanstack__history.mjs";
import "./_libs/cookie-es.mjs";
import "./_libs/seroval.mjs";
import "./_libs/seroval-plugins.mjs";
import "node:stream/web";
import "node:stream";
import "./_libs/react-dom.mjs";
import "util";
import "crypto";
import "async_hooks";
import "stream";
import "./_libs/isbot.mjs";
import "./_libs/radix-ui__react-slot.mjs";
import "./_libs/radix-ui__react-compose-refs.mjs";
import "./_libs/class-variance-authority.mjs";
import "./_libs/clsx.mjs";
import "./_libs/tailwind-merge.mjs";
const GUARDSKY_FEATURES = [{
  icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, { "aria-hidden": "true" }),
  text: "Real-time aerial surveillance"
}, {
  icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Flame, { "aria-hidden": "true" }),
  text: "Smoke and fire detection support"
}, {
  icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Bell, { "aria-hidden": "true" }),
  text: "Live monitoring and alerting"
}, {
  icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Zap, { "aria-hidden": "true" }),
  text: "Rapid first-response support"
}, {
  icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Package, { "aria-hidden": "true" }),
  text: "Payload deployment prototype"
}, {
  icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Radar, { "aria-hidden": "true" }),
  text: "Remote area and asset monitoring"
}];
const GUARDSKY_USE_CASES = [{
  icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Building2, { "aria-hidden": "true" }),
  text: "Industrial sites"
}, {
  icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Building2, { "aria-hidden": "true" }),
  text: "Warehouses"
}, {
  icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Sun, { "aria-hidden": "true" }),
  text: "Solar farms"
}, {
  icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Sprout, { "aria-hidden": "true" }),
  text: "Farms and rural land"
}, {
  icon: /* @__PURE__ */ jsxRuntimeExports.jsx(GraduationCap, { "aria-hidden": "true" }),
  text: "Campuses and institutions"
}, {
  icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Map, { "aria-hidden": "true" }),
  text: "Remote infrastructure"
}, {
  icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Earth, { "aria-hidden": "true" }),
  text: "Resorts and retreat properties"
}];
function GuardSkyPage() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { id: "guardsky", className: "relative py-20 sm:py-28 overflow-hidden", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 bg-gradient-primary opacity-[0.06] pointer-events-none" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mx-auto max-w-7xl px-5 lg:px-8 relative", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid lg:grid-cols-12 gap-10 items-start", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "lg:col-span-5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground bg-primary border border-primary px-3 py-1.5 rounded-full shadow-glow", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Flame, { className: "h-3.5 w-3.5", "aria-hidden": "true" }),
            " Prototype vertical"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "mt-5 text-3xl sm:text-4xl font-semibold", children: "GuardSky" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-lg text-muted-foreground", children: "Aerial surveillance and early fire response by TorqWings" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-5 text-muted-foreground", children: "GuardSky is a prototype drone-based surveillance and emergency-support solution designed to monitor critical areas, detect possible fire or smoke incidents, provide real-time aerial visibility, alert operators, and support rapid intervention through targeted deployment of fire suppression payloads near the incident zone." }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { asChild: true, size: "lg", className: "mt-7 bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { to: "/contact", children: [
            "Explore GuardSky ",
            /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { className: "ml-1 h-4 w-4", "aria-hidden": "true" })
          ] }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "lg:col-span-7 grid sm:grid-cols-2 gap-4", children: GUARDSKY_FEATURES.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(IconBubble, { children: c.icon }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-4 font-medium", children: c.text })
        ] }, c.text)) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-16", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-xl font-semibold mb-6", children: "Use cases" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid sm:grid-cols-2 lg:grid-cols-4 gap-4", children: GUARDSKY_USE_CASES.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "text-center items-center flex flex-col", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(IconBubble, { children: c.icon }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-3 text-sm font-medium", children: c.text })
        ] }, c.text)) })
      ] })
    ] })
  ] });
}
export {
  GuardSkyPage as component
};
