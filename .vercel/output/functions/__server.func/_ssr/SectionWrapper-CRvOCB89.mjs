import { j as jsxRuntimeExports } from "../_libs/react.mjs";
function SectionWrapper({ id, eyebrow, title, children, muted = false }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("section", { id, className: `py-20 sm:py-28 ${muted ? "bg-muted/30" : ""}`, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mx-auto max-w-7xl px-5 lg:px-8", children: [
    eyebrow && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "inline-block text-xs font-bold uppercase tracking-[0.2em] text-primary-foreground bg-primary px-3 py-1 rounded-md shadow-glow", children: eyebrow }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "mt-3 text-3xl sm:text-4xl font-semibold max-w-3xl", children: title }),
    children
  ] }) });
}
export {
  SectionWrapper as S
};
