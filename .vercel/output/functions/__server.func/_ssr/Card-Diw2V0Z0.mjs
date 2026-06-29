import { j as jsxRuntimeExports } from "../_libs/react.mjs";
function Card({ children, className = "" }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      className: `rounded-2xl p-6 bg-gradient-card border border-border/60 shadow-card hover:border-primary/40 hover:shadow-soft transition-all ${className}`,
      children
    }
  );
}
export {
  Card as C
};
