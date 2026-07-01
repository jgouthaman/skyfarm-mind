import { j as jsxRuntimeExports } from "./_libs/react.mjs";
import { L as Link } from "./_libs/tanstack__react-router.mjs";
import { B as Button } from "./_ssr/button-DjOZMqFS.mjs";
import { S as SectionBadge } from "./_ssr/SectionBadge-Bokc1YJ-.mjs";
import { h as heroImg } from "./_ssr/router-DRZUT5O3.mjs";
import { l as ArrowRight, m as Activity, n as ShieldCheck } from "./_libs/lucide-react.mjs";
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
import "./_libs/tanstack__query-core.mjs";
import "./_libs/tanstack__react-query.mjs";
function FloatingCard({ icon, title, value, className = "", tone = "primary" }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `rounded-xl bg-card/90 backdrop-blur border border-border shadow-card px-4 py-3 ${className}`, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-xs text-muted-foreground", children: [
      icon,
      title
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `mt-1 text-sm font-semibold ${tone === "agri" ? "text-accent" : "text-primary"}`, children: value })
  ] });
}
const gradientTextStyle = {
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  WebkitTextFillColor: "transparent",
  color: "transparent"
};
const HERO_STATS = [{
  k: "6",
  v: "Industries"
}, {
  k: "AI",
  v: "Analytics core"
}, {
  k: "R&D",
  v: "Custom platforms"
}];
function HeroPage() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { id: "home", className: "relative pt-28 lg:pt-36 pb-20 overflow-hidden bg-gradient-hero", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 grid-bg opacity-40 pointer-events-none" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mx-auto max-w-7xl px-5 lg:px-8 grid lg:grid-cols-12 gap-10 items-center relative", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "lg:col-span-6", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(SectionBadge, { label: "Aerospace · Autonomous Aerial Platforms · AI" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("h1", { className: "text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.05]", children: [
          "Engineering the future of",
          " ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "bg-gradient-primary", style: gradientTextStyle, children: "aerial intelligence" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-6 text-lg text-muted-foreground max-w-xl", children: "AI-powered autonomous aerial platforms, custom engineering, and aerial intelligence solutions for agriculture, infrastructure, mapping, surveillance, and industrial applications." }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-8", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { asChild: true, size: "lg", className: "bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { to: "/solutions", children: [
          "Explore Solutions ",
          /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { className: "ml-1 h-4 w-4", "aria-hidden": "true" })
        ] }) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-10 flex gap-8", children: HERO_STATS.map((s) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[22px] font-display font-bold text-foreground", children: s.k }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[11px] text-muted-foreground mt-0.5", children: s.v })
        ] }, s.v)) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "lg:col-span-6 relative", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative rounded-3xl overflow-hidden shadow-soft border border-border/60", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("img", { src: heroImg, alt: "TorqWings drone with AI overlays across agriculture, infrastructure and solar terrain", width: 1920, height: 1080, fetchPriority: "high", decoding: "async", className: "w-full h-auto" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 bg-gradient-to-tr from-background/60 via-transparent to-transparent" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(FloatingCard, { className: "absolute -left-4 top-8 hidden sm:block", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Activity, { className: "h-4 w-4 text-accent", "aria-hidden": "true" }), title: "Crop Health", value: "NDVI 0.78", tone: "agri" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(FloatingCard, { className: "absolute -right-4 bottom-10 hidden sm:block", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(ShieldCheck, { className: "h-4 w-4 text-primary", "aria-hidden": "true" }), title: "Inspection", value: "2 alerts" })
      ] })
    ] })
  ] });
}
export {
  HeroPage as component
};
