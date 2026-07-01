import { r as reactExports, j as jsxRuntimeExports } from "../_libs/react.mjs";
import { X } from "../_libs/lucide-react.mjs";
function SlidePanel({
  open,
  onClose,
  title,
  children
}) {
  reactExports.useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        onClick: onClose,
        className: `fixed inset-0 z-[90] bg-black/40 transition-opacity ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "aside",
      {
        className: [
          "fixed top-0 right-0 z-[100] h-full w-full sm:w-[380px] bg-[#141928] border-l border-white/[0.08]",
          "transition-transform duration-[250ms] overflow-y-auto",
          open ? "translate-x-0" : "translate-x-full"
        ].join(" "),
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between p-5 border-b border-white/[0.06]", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 min-w-0", children: title }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: onClose, "aria-label": "Close", className: "text-white/50 hover:text-white", children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "h-5 w-5" }) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-5", children })
        ]
      }
    )
  ] });
}
function Field({ label, value }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "py-2.5 border-b border-white/[0.05] last:border-b-0", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10px] uppercase tracking-wider text-white/40", children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1 text-sm text-white/90 break-words", children: value || /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-white/30", children: "—" }) })
  ] });
}
export {
  Field as F,
  SlidePanel as S
};
