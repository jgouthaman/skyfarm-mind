import { j as jsxRuntimeExports } from "../_libs/react.mjs";
import { e as useRouterState, L as Link } from "../_libs/tanstack__react-router.mjs";
import { c as cn } from "./button-DjOZMqFS.mjs";
import { x as Cpu, b as ListChecks, F as FlaskConical, am as Sparkles, ar as ShieldAlert, a4 as FileText } from "../_libs/lucide-react.mjs";
const steps = [
  { to: "/mission-hub/torqwings-design-studio/design", label: "Design", icon: Cpu },
  { to: "/mission-hub/torqwings-design-studio/components", label: "Components", icon: ListChecks },
  { to: "/mission-hub/torqwings-design-studio/simulation", label: "Simulation", icon: FlaskConical },
  { to: "/mission-hub/torqwings-design-studio/advisor", label: "Advisor", icon: Sparkles },
  { to: "/mission-hub/torqwings-design-studio/compliance", label: "Compliance", icon: ShieldAlert },
  { to: "/mission-hub/torqwings-design-studio/report", label: "Report", icon: FileText }
];
function StudioStepNav() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("nav", { className: "mt-6 flex flex-wrap gap-2 border-t border-border/60 pt-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs uppercase tracking-wider text-muted-foreground self-center mr-2", children: "Jump to:" }),
    steps.map(({ to, label, icon: Icon }) => {
      const active = path === to;
      return /* @__PURE__ */ jsxRuntimeExports.jsxs(
        Link,
        {
          to,
          className: cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors",
            active ? "bg-primary/15 text-primary border-primary/40" : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/40"
          ),
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: "h-3.5 w-3.5" }),
            " ",
            label
          ]
        },
        to
      );
    })
  ] });
}
export {
  StudioStepNav as S
};
