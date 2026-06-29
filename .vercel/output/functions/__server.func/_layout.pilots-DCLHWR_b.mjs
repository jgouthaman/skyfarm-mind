import { j as jsxRuntimeExports } from "./_libs/react.mjs";
import { L as Link } from "./_libs/tanstack__react-router.mjs";
import { S as SectionWrapper } from "./_ssr/SectionWrapper-CRvOCB89.mjs";
import { C as Card } from "./_ssr/Card-Diw2V0Z0.mjs";
import { I as IconBubble } from "./_ssr/IconBubble-CjOnHlj0.mjs";
import { b as PILOT_PROGRAMS, c as TEAM_CAPABILITIES } from "./_ssr/solutions.constants-R9xg_ad2.mjs";
import { k as ArrowRight } from "./_libs/lucide-react.mjs";
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
function PilotsPage() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(SectionWrapper, { id: "pilots", eyebrow: "Work with us", title: "Pilot programs and partnerships", muted: true, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-muted-foreground max-w-3xl", children: "TorqWings is building pilot programs with agriculture farms, infrastructure owners, drone operators, academic institutions, FPOs, and industry partners." }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-10 grid md:grid-cols-3 gap-5", children: PILOT_PROGRAMS.map((p) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(IconBubble, { tone: p.tone, children: p.icon }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] uppercase tracking-widest text-muted-foreground", children: p.tag })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "mt-4 text-lg font-semibold", children: p.title }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1.5 text-sm text-muted-foreground", children: p.desc }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { to: "/contact", className: "mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:gap-2.5 transition-all", children: [
          "Apply for pilot ",
          /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { className: "h-4 w-4", "aria-hidden": "true" })
        ] })
      ] }, p.title)) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(SectionWrapper, { id: "team", eyebrow: "Team", title: "Built by aerospace and software engineering minds", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-muted-foreground max-w-3xl", children: "TorqWings brings together aerospace engineers, software engineering, AI, drone systems, and field-domain expertise to build practical aerial intelligence solutions for real-world industries." }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4", children: TEAM_CAPABILITIES.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "flex-row items-center gap-4 flex", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(IconBubble, { children: c.icon }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-medium", children: c.text })
      ] }, c.text)) })
    ] })
  ] });
}
export {
  PilotsPage as component
};
