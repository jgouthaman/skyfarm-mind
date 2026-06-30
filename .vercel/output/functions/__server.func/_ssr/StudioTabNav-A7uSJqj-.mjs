import { j as jsxRuntimeExports } from "../_libs/react.mjs";
import { e as useRouterState, L as Link } from "../_libs/tanstack__react-router.mjs";
const tabs = [
  { label: "Design Result", href: "/mission-hub/torqwings-design-studio/design" },
  { label: "Component List", href: "/mission-hub/torqwings-design-studio/components" },
  { label: "Simulation Lab", href: "/mission-hub/torqwings-design-studio/simulation" },
  { label: "AI Advisor", href: "/mission-hub/torqwings-design-studio/advisor" },
  { label: "Reports", href: "/mission-hub/torqwings-design-studio/report" },
  { label: "Project History", href: "/mission-hub/torqwings-design-studio/history" }
];
function StudioTabNav() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center gap-1 border-b border-border/40 mb-6 overflow-x-auto", children: tabs.map((t) => {
    const active = pathname === t.href || pathname.startsWith(t.href);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      Link,
      {
        to: t.href,
        className: active ? "px-4 py-2 text-sm font-medium text-foreground border-b-2 border-primary -mb-px whitespace-nowrap" : "px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded-t-lg transition-colors whitespace-nowrap",
        children: t.label
      },
      t.href
    );
  }) });
}
export {
  StudioTabNav as S
};
