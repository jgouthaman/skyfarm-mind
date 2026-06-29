import { j as jsxRuntimeExports } from "./_libs/react.mjs";
import { L as Link } from "./_libs/tanstack__react-router.mjs";
import { B as Button } from "./_ssr/button-DjOZMqFS.mjs";
import { C as Card } from "./_ssr/Card-Diw2V0Z0.mjs";
import { I as IconBubble } from "./_ssr/IconBubble-CjOnHlj0.mjs";
import { d as Leaf, k as ArrowRight, C as Camera, l as Activity, z as Map, al as Droplets, a4 as FileText, am as Sparkles } from "./_libs/lucide-react.mjs";
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
const AGRISKY_FEATURES = [{
  icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Camera, { "aria-hidden": "true" }),
  text: "Drone-based farm monitoring"
}, {
  icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Activity, { "aria-hidden": "true" }),
  text: "Crop health & stress detection"
}, {
  icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Map, { "aria-hidden": "true" }),
  text: "Farm zone mapping"
}, {
  icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Droplets, { "aria-hidden": "true" }),
  text: "Irrigation & organic input advisory"
}, {
  icon: /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { "aria-hidden": "true" }),
  text: "Farmer-friendly reports"
}, {
  icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { "aria-hidden": "true" }),
  text: "Future precision spraying support"
}];
function AgriSkyPage() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { id: "agrisky", className: "relative py-20 sm:py-28 overflow-hidden", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 bg-gradient-agri opacity-[0.08] pointer-events-none" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mx-auto max-w-7xl px-5 lg:px-8 relative", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid lg:grid-cols-12 gap-10 items-start", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "lg:col-span-5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-accent-foreground bg-accent border border-accent px-3 py-1.5 rounded-full shadow-glow", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Leaf, { className: "h-3.5 w-3.5", "aria-hidden": "true" }),
          " Flagship vertical"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("h2", { className: "mt-5 text-3xl sm:text-4xl font-semibold", children: [
          "Flagship vertical:",
          " ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "bg-gradient-agri bg-clip-text text-transparent", children: "AgriSky" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-lg text-muted-foreground", children: "Agriculture drone intelligence by TorqWings" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-5 text-muted-foreground", children: "AgriSky helps farmers and agri-organizations monitor crop health, detect stress early, plan irrigation, and enable precision farming using drone imagery and AI-based farm advisory." }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { asChild: true, size: "lg", className: "mt-7 bg-gradient-agri text-primary-foreground hover:opacity-90 shadow-soft", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { to: "/contact", children: [
          "Explore AgriSky ",
          /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { className: "ml-1 h-4 w-4", "aria-hidden": "true" })
        ] }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "lg:col-span-7 grid sm:grid-cols-2 gap-4", children: AGRISKY_FEATURES.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(IconBubble, { tone: "agri", children: c.icon }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-4 font-medium", children: c.text })
      ] }, c.text)) })
    ] }) })
  ] });
}
export {
  AgriSkyPage as component
};
