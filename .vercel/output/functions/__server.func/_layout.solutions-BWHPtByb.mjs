import { j as jsxRuntimeExports } from "./_libs/react.mjs";
import { S as SectionWrapper } from "./_ssr/SectionWrapper-CRvOCB89.mjs";
import { C as Card } from "./_ssr/Card-Diw2V0Z0.mjs";
import { I as IconBubble } from "./_ssr/IconBubble-CjOnHlj0.mjs";
import { a as PROBLEM_CARDS, S as SOLUTION_CARDS } from "./_ssr/solutions.constants-CGxE0cVl.mjs";
import "./_libs/lucide-react.mjs";
function SolutionsPage() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(SectionWrapper, { id: "problem", eyebrow: "The problem", title: "Industries Need Smarter Aerial Visibility", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-muted-foreground max-w-3xl", children: "Many industries still depend on manual inspection, delayed field reporting, fragmented data collection, and expensive monitoring workflows. From farms to infrastructure sites, decision-makers need faster, safer, and more intelligent aerial insights — built on platforms designed for the mission, not adapted from consumer hardware." }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-5", children: PROBLEM_CARDS.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(IconBubble, { children: c.icon }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-4 font-medium", children: c.text })
      ] }, c.text)) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(SectionWrapper, { id: "solutions", eyebrow: "The solution", title: "Design. Simulate. Deploy. Intelligent.", muted: true, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-muted-foreground max-w-3xl", children: "TorqWings combines autonomous aerial platform design, AI-powered flight intelligence, and domain-specific engineering to convert mission requirements into deployable aerial systems — validated by simulation before a single component is ordered." }),
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
