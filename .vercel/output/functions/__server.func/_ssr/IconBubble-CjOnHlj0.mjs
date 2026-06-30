import { j as jsxRuntimeExports } from "../_libs/react.mjs";
function IconBubble({ children, tone = "primary" }) {
  const cls = tone === "agri" ? "bg-accent text-accent-foreground border-accent" : "bg-primary text-primary-foreground border-primary";
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      "aria-hidden": "true",
      className: `inline-grid place-items-center h-10 w-10 rounded-xl border shadow-glow ${cls} [&>svg]:h-5 [&>svg]:w-5`,
      children
    }
  );
}
export {
  IconBubble as I
};
