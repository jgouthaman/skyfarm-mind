import { j as jsxRuntimeExports } from "./_libs/react.mjs";
import { S as SectionWrapper } from "./_ssr/SectionWrapper-CRvOCB89.mjs";
import { C as Card } from "./_ssr/Card-Diw2V0Z0.mjs";
import { I as IconBubble } from "./_ssr/IconBubble-CjOnHlj0.mjs";
import { T as TECH_PIPELINE, P as PRODUCT_CAPABILITIES } from "./_ssr/solutions.constants-R9xg_ad2.mjs";
import { k as ArrowRight } from "./_libs/lucide-react.mjs";
function TechnologyPage() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(SectionWrapper, { id: "technology", eyebrow: "Technology", title: "A modular aerial intelligence stack", muted: true, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-muted-foreground max-w-3xl", children: "TorqWings's technology is built as a reusable platform that powers multiple industries — from a single mission to enterprise-grade aerial operations." }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-12 grid md:grid-cols-2 lg:grid-cols-5 gap-4", children: TECH_PIPELINE.map((s, idx) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "h-full", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(IconBubble, { children: s.icon }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-mono text-muted-foreground", children: s.num })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "mt-4 text-base font-semibold", children: s.text }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1.5 text-sm text-muted-foreground", children: s.desc })
        ] }),
        idx < TECH_PIPELINE.length - 1 && /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { "aria-hidden": "true", className: "hidden lg:block absolute top-1/2 -right-3 -translate-y-1/2 h-4 w-4 text-primary/60" })
      ] }, s.num)) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(SectionWrapper, { id: "products", eyebrow: "Products & capabilities", title: "What TorqWings builds", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-10 grid sm:grid-cols-2 lg:grid-cols-5 gap-4", children: PRODUCT_CAPABILITIES.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "text-center items-center flex flex-col", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(IconBubble, { children: c.icon }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-3 text-sm font-medium", children: c.text })
    ] }, c.text)) }) })
  ] });
}
export {
  TechnologyPage as component
};
