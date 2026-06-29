import { j as jsxRuntimeExports } from "./_libs/react.mjs";
import { S as SectionWrapper } from "./_ssr/SectionWrapper-CRvOCB89.mjs";
import { C as Card } from "./_ssr/Card-Diw2V0Z0.mjs";
import { I as IconBubble } from "./_ssr/IconBubble-CjOnHlj0.mjs";
import { a as PROBLEM_CARDS, S as SOLUTION_CARDS } from "./_ssr/solutions.constants-R9xg_ad2.mjs";
import "./_libs/lucide-react.mjs";
function SolutionsPage() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(SectionWrapper, { id: "problem", eyebrow: "The problem", title: "Industries need smarter aerial visibility", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-muted-foreground max-w-3xl", children: "Many industries still depend on manual inspection, delayed field reporting, fragmented data collection, and expensive monitoring workflows. From farms to infrastructure sites, decision-makers need faster, safer, and more intelligent aerial insights." }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-5", children: PROBLEM_CARDS.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(IconBubble, { children: c.icon }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-4 font-medium", children: c.text })
      ] }, c.text)) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(SectionWrapper, { id: "solutions", eyebrow: "The solution", title: "Drones, data, and intelligence in one platform", muted: true, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-muted-foreground max-w-3xl", children: "TorqWings combines aerospace engineering, custom UAV systems, aerial imaging, AI analytics, and domain-specific workflows to convert drone missions into actionable business intelligence." }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-5", children: SOLUTION_CARDS.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(IconBubble, { children: c.icon }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "mt-4 text-lg font-semibold", children: c.text }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1.5 text-sm text-muted-foreground", children: c.desc })
      ] }, c.text)) })
    ] })
  ] });
}
export {
  SolutionsPage as component
};
