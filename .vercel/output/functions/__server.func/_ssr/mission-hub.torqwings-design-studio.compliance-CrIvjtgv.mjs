import { r as reactExports, j as jsxRuntimeExports } from "../_libs/react.mjs";
import { S as StudioStepNav } from "./step-nav-4ASvtYHx.mjs";
import { u as useCurrentProject } from "./store-D8Xv1K_U.mjs";
import { B as Button } from "./button-DjOZMqFS.mjs";
import { D as Disclaimer } from "./sidebar-CQ8yt5pY.mjs";
import { b as buildComplianceReport, g as getStateRule, I as INDIAN_STATES } from "./compliance-OMKYpGkM.mjs";
import { t as toast } from "../_libs/sonner.mjs";
import { ar as ShieldAlert, P as Plane, au as FileCheckCorner, g as CircleCheck, M as MapPin, q as CircleX } from "../_libs/lucide-react.mjs";
import "../_libs/tanstack__react-router.mjs";
import "../_libs/tanstack__router-core.mjs";
import "../_libs/tanstack__history.mjs";
import "../_libs/cookie-es.mjs";
import "../_libs/seroval.mjs";
import "../_libs/seroval-plugins.mjs";
import "node:stream/web";
import "node:stream";
import "../_libs/react-dom.mjs";
import "util";
import "crypto";
import "async_hooks";
import "stream";
import "../_libs/isbot.mjs";
import "./client-DYtC4Igq.mjs";
import "../_libs/supabase__supabase-js.mjs";
import "../_libs/supabase__postgrest-js.mjs";
import "../_libs/supabase__realtime-js.mjs";
import "../_libs/supabase__phoenix.mjs";
import "../_libs/supabase__storage-js.mjs";
import "../_libs/iceberg-js.mjs";
import "../_libs/supabase__auth-js.mjs";
import "tslib";
import "../_libs/supabase__functions-js.mjs";
import "../_libs/radix-ui__react-slot.mjs";
import "../_libs/radix-ui__react-compose-refs.mjs";
import "../_libs/class-variance-authority.mjs";
import "../_libs/clsx.mjs";
import "../_libs/tailwind-merge.mjs";
function Compliance() {
  const project = useCurrentProject();
  const [state, setState] = reactExports.useState("Telangana");
  const report = reactExports.useMemo(() => project ? buildComplianceReport(project) : null, [project]);
  const rule = reactExports.useMemo(() => getStateRule(state), [state]);
  if (!project || !report) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm text-muted-foreground", children: "No active project. Create or open a drone project first." });
  }
  const passCount = report.checks.filter((c) => c.ok).length;
  function exportJSON() {
    const blob = new Blob([JSON.stringify({
      project: project.projectName,
      report,
      state,
      stateRule: rule
    }, null, 2)], {
      type: "application/json"
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${project.projectName}-compliance.json`;
    a.click();
    toast.success("Compliance report exported");
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-5 max-w-5xl", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "flex justify-between items-end flex-wrap gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("h1", { className: "text-2xl font-semibold flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(ShieldAlert, { className: "h-6 w-6 text-sky-700" }),
          " Compliance & Regulation"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm text-muted-foreground mt-1", children: [
          "DGCA + NPNT readiness check and state-wise fly-permission guidance for ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-foreground font-medium", children: project.projectName }),
          "."
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", onClick: () => window.print(), children: "Print" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", onClick: exportJSON, children: "Export JSON" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-border/60 bg-card/60 p-5 grid sm:grid-cols-4 gap-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Stat, { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Plane, { className: "h-4 w-4" }), label: "DGCA category", value: report.category, sub: report.weightBand }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Stat, { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(FileCheckCorner, { className: "h-4 w-4" }), label: "All-up weight", value: `${report.allUpWeightKg.toFixed(2)} kg`, sub: "Estimated" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Stat, { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "h-4 w-4" }), label: "Checks passed", value: `${passCount} / ${report.checks.length}`, sub: "DGCA + NPNT" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Stat, { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(MapPin, { className: "h-4 w-4" }), label: "Altitude ceiling", value: `${report.maxAltitudeFtAgl} ft AGL`, sub: "Green zone" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "rounded-xl border border-border/60 bg-card/60 p-5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3", children: "DGCA & NPNT Readiness" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "divide-y divide-border/40", children: report.checks.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "py-2.5 flex items-start gap-3", children: [
        c.ok ? /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "h-5 w-5 text-emerald-700 mt-0.5 shrink-0" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(CircleX, { className: "h-5 w-5 text-muted-foreground mt-0.5 shrink-0" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-medium", children: c.label }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground", children: c.detail })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `text-[10px] uppercase tracking-wider px-2 py-1 rounded-full border ${c.ok ? "border-emerald-500/40 text-emerald-700 bg-emerald-500/10" : "border-border text-muted-foreground"}`, children: c.ok ? "Required" : "N/A" })
      ] }, c.id)) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "mt-4 list-disc list-inside text-xs text-muted-foreground space-y-1", children: report.notes.map((n, i) => /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: n }, i)) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "rounded-xl border border-border/60 bg-card/60 p-5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between flex-wrap gap-3 mb-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-sm font-semibold uppercase tracking-wider text-muted-foreground", children: "State-wise Fly Permission" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("select", { value: state, onChange: (e) => setState(e.target.value), className: "bg-background border border-border/60 rounded-md px-3 py-1.5 text-sm", children: INDIAN_STATES.map((s) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: s.state, children: s.state }, s.state)) })
      ] }),
      rule && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid sm:grid-cols-2 gap-3 text-sm", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(KV, { k: "Airspace zone", v: rule.zoneNote }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(KV, { k: "Permitting authority", v: rule.authority }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(KV, { k: "Typical lead time", v: `${rule.permissionWindowDays} day(s)` }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(KV, { k: "Known red zones", v: rule.knownRedZones.join(", ") || "—" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg border border-sky-500/30 bg-sky-500/5 p-3 text-sm", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-xs uppercase tracking-wider text-sky-700 mb-1", children: [
            "Recommendation for ",
            rule.state
          ] }),
          rule.recommendation
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-[11px] text-muted-foreground italic", children: [
      "This screen provides indicative regulatory guidance only. Always confirm with the DGCA DigitalSky portal (",
      /* @__PURE__ */ jsxRuntimeExports.jsx("a", { className: "underline", href: "https://digitalsky.dgca.gov.in", target: "_blank", rel: "noreferrer", children: "digitalsky.dgca.gov.in" }),
      ") and the relevant state authority before any flight."
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Disclaimer, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsx(StudioStepNav, {})
  ] });
}
function Stat({
  icon,
  label,
  value,
  sub
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5", children: [
      icon,
      label
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xl font-semibold mt-1", children: value }),
    sub && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground", children: sub })
  ] });
}
function KV({
  k,
  v
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between gap-3 border-b border-border/40 py-1.5", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: k }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-right font-medium", children: v })
  ] });
}
export {
  Compliance as component
};
