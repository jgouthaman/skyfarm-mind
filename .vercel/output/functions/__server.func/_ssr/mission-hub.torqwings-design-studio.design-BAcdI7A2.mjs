import { j as jsxRuntimeExports, r as reactExports } from "../_libs/react.mjs";
import { L as Link } from "../_libs/tanstack__react-router.mjs";
import { u as useCurrentProject } from "./store-D8Xv1K_U.mjs";
import { B as Button } from "./button-DjOZMqFS.mjs";
import { I as Input } from "./input-D_U8fI25.mjs";
import { L as Label } from "./label-C8WJLhmR.mjs";
import { D as Disclaimer } from "./sidebar-CQ8yt5pY.mjs";
import { a as riskColor } from "./engine-DuoJgisk.mjs";
import { b as buildComplianceReport } from "./compliance-OMKYpGkM.mjs";
import { S as StudioStepNav } from "./step-nav-4ASvtYHx.mjs";
import { S as StudioTabNav } from "./StudioTabNav-A7uSJqj-.mjs";
import { av as TriangleAlert, at as ShieldAlert, g as CircleCheck, r as CircleX } from "../_libs/lucide-react.mjs";
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
import "../_libs/radix-ui__react-label.mjs";
import "../_libs/radix-ui__react-primitive.mjs";
const COMP_KEYS = ["frame", "motors", "esc", "battery", "flight_controller", "gps", "payload", "propellers"];
const CONF_STYLE = {
  high: {
    bg: "rgba(16,185,129,0.12)",
    border: "rgba(16,185,129,0.3)",
    color: "#34d399",
    label: "High confidence"
  },
  medium: {
    bg: "rgba(245,158,11,0.12)",
    border: "rgba(245,158,11,0.3)",
    color: "#fbbf24",
    label: "Medium confidence"
  },
  low: {
    bg: "rgba(239,68,68,0.12)",
    border: "rgba(239,68,68,0.3)",
    color: "#f87171",
    label: "Low confidence"
  }
};
function twrColor(twr) {
  if (twr === null) return "text-white/50";
  if (twr >= 2) return "text-emerald-400";
  if (twr >= 1.5) return "text-amber-400";
  return "text-red-400";
}
const STUDIO_DARK_VARS = {
  "--foreground": "oklch(0.95 0.01 250)",
  "--muted-foreground": "oklch(0.58 0.04 250)",
  "--border": "oklch(0.95 0.01 250 / 15%)",
  "--primary": "oklch(0.65 0.15 235)",
  "--card": "oklch(0.14 0.04 250)",
  "--muted": "oklch(0.18 0.03 250)"
};
function DesignResult() {
  const project = useCurrentProject();
  const rec = project?.design_recommendation ?? null;
  const hasNewRec = rec !== null;
  const hasOldRec = !!project?.recommendedDesign;
  if (!hasNewRec && !hasOldRec) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Empty, { msg: "No design generated yet. Capture mission requirements first.", cta: "/mission-hub/torqwings-design-studio/requirements", ctaLabel: "Open requirements" });
  }
  if (hasNewRec) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-6", style: STUDIO_DARK_VARS, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(StudioTabNav, {}),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-2xl font-semibold", children: "Drone Design Result" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm text-muted-foreground mt-1", children: [
          project.projectName,
          " · ",
          project.vertical
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(NewDesignView, { rec }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(StudioStepNav, {}),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Disclaimer, {})
    ] });
  }
  const d = project.recommendedDesign;
  const cards = [["Recommended Drone Type", d.droneType], ["Frame Size", d.frameSize], ["Motor Class", d.motorClass], ["ESC Rating", d.escRating], ["Propeller Size", d.propellerSize], ["Battery", d.battery], ["Flight Controller", d.flightController], ["GPS & Navigation", d.gps], ["Payload System", d.payloadSystem], ["Estimated Flight Time", `${d.estimatedFlightTime} min`], ["Estimated Cost Range", `₹${d.estimatedCost.min.toLocaleString("en-IN")} – ₹${d.estimatedCost.max.toLocaleString("en-IN")}`], ["Risk Level", d.riskLevel]];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-6", style: STUDIO_DARK_VARS, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(StudioTabNav, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-2xl font-semibold", children: "Drone Design Result" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm text-muted-foreground mt-1", children: [
        project.projectName,
        " · ",
        project.vertical
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid sm:grid-cols-2 lg:grid-cols-3 gap-3", children: cards.map(([k, v]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-border/60 bg-card/60 p-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs uppercase tracking-wide text-muted-foreground", children: k }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `mt-1.5 text-base font-medium ${k === "Risk Level" ? riskColor(d.riskLevel).split(" ")[0] : ""}`, children: v })
    ] }, k)) }),
    d.notes.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-border/60 bg-card/60 p-5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-semibold mb-2", children: "Engineering Notes" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "list-disc list-inside text-sm text-muted-foreground space-y-1", children: d.notes.map((n, i) => /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: n }, i)) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(ComplianceCard, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsx(StudioStepNav, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Disclaimer, {})
  ] });
}
function NewDesignView({
  rec
}) {
  const rule = rec.matched_rule;
  const ref = rec.matched_reference;
  const conf = CONF_STYLE[rec.confidence];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-border/60 bg-card/60 p-6 space-y-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between gap-4 flex-wrap", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs uppercase tracking-widest text-muted-foreground mb-1", children: "Recommended Drone" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-2xl font-semibold", children: rule?.drone_type ?? "—" }),
          rule?.rule_name && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground mt-0.5", children: rule.rule_name })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [
          rule?.risk_level && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `text-xs px-2.5 py-1 rounded-full border font-medium ${rule.risk_level === "low" ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400" : rule.risk_level === "medium" ? "bg-amber-500/15 border-amber-500/30 text-amber-400" : "bg-red-500/15 border-red-500/30 text-red-400"}`, children: rule.risk_level }),
          ref && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/50", children: [
            "Based on: ",
            ref.name
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3", children: [["Frame size", rule?.frame_size], ["Motor class", rule?.motor_class], ["Motor count", rule?.motor_count != null ? String(rule.motor_count) : null], ["Battery config", rule?.battery_config], ["ESC rating", rule?.esc_rating], ["Propeller spec", rule?.propeller_spec], ["Flight controller", rule?.flight_controller], ["Min TWR", rule?.twr_min != null ? String(rule.twr_min) : null]].filter(([, v]) => v).map(([k, v]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg border border-border/40 bg-black/20 p-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10px] uppercase tracking-wide text-muted-foreground", children: k }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1 text-sm font-medium", children: v })
      ] }, k)) }),
      (rule?.cost_min_inr != null || rule?.cost_max_inr != null) && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm text-muted-foreground", children: [
        "Estimated cost:",
        " ",
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-medium text-white", children: [
          "₹",
          (rule.cost_min_inr ?? 0).toLocaleString("en-IN"),
          " – ₹",
          (rule.cost_max_inr ?? 0).toLocaleString("en-IN")
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-border/60 bg-card/60 p-6 space-y-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-semibold", children: "Bill of Materials" }),
      ref?.component_list ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3", children: COMP_KEYS.filter((k) => ref.component_list?.[k]).map((k) => {
        const val = ref.component_list[k];
        const secondary = Object.entries(val).filter(([key]) => key !== "model").map(([key, v]) => `${key.replace(/_/g, " ")}: ${v}`).join(" · ");
        return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg border border-border/40 bg-black/20 p-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10px] uppercase tracking-wide text-muted-foreground mb-1", children: k.replace(/_/g, " ") }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-medium", children: val.model ?? "—" }),
          secondary && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[11px] text-muted-foreground mt-1", children: secondary })
        ] }, k);
      }) }) : /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground", children: "Component list will be available once a proven design is matched." })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-border/60 bg-card/60 p-6 space-y-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-semibold", children: "Performance Estimates" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg border border-border/40 bg-black/20 p-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10px] uppercase tracking-wide text-muted-foreground", children: "Flight time" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1 text-sm font-medium", children: rule?.flight_time_min != null ? rule.flight_time_max != null ? `${rule.flight_time_min} – ${rule.flight_time_max} min` : `${rule.flight_time_min} min` : "—" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg border border-border/40 bg-black/20 p-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10px] uppercase tracking-wide text-muted-foreground", children: "Min TWR" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `mt-1 text-sm font-medium ${twrColor(rule?.twr_min ?? null)}`, children: rule?.twr_min != null ? `${rule.twr_min}×` : "—" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg border border-border/40 bg-black/20 p-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10px] uppercase tracking-wide text-muted-foreground", children: "Cost range" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1 text-sm font-medium", children: rule?.cost_min_inr != null ? `₹${rule.cost_min_inr.toLocaleString("en-IN")} – ₹${(rule.cost_max_inr ?? 0).toLocaleString("en-IN")}` : "—" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg border border-border/40 bg-black/20 p-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10px] uppercase tracking-wide text-muted-foreground", children: "Risk level" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `mt-1 text-sm font-medium ${rule?.risk_level === "low" ? "text-emerald-400" : rule?.risk_level === "medium" ? "text-amber-400" : rule?.risk_level ? "text-red-400" : ""}`, children: rule?.risk_level ?? "—" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg border border-border/40 bg-black/20 p-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10px] uppercase tracking-wide text-muted-foreground", children: "Motor config" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1 text-sm font-medium", children: rule?.motor_count != null && rule?.motor_class ? `${rule.motor_count} × ${rule.motor_class}` : rule?.motor_count != null ? `${rule.motor_count} motors` : "—" })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-border/60 bg-card/60 p-6 space-y-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-semibold", children: "Match Intelligence" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs px-3 py-1 rounded-full border font-medium", style: {
          background: conf.bg,
          borderColor: conf.border,
          color: conf.color
        }, children: conf.label }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs text-muted-foreground", children: [
          "Rule score: ",
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-white font-medium", children: [
            rec.rule_confidence_score,
            "/100"
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs text-muted-foreground", children: [
          "Reference score: ",
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-white font-medium", children: [
            rec.reference_score,
            "/100"
          ] })
        ] })
      ] }),
      rec.is_fallback && rec.fallback_reason && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "mt-0.5 h-4 w-4 shrink-0 text-amber-400" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-medium text-amber-400", children: "Nearest rule used — not an exact match" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-0.5 text-xs text-amber-300/70", children: rec.fallback_reason })
        ] })
      ] }),
      rule?.engineer_notes && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg bg-black/20 border border-border/40 p-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs uppercase tracking-wide text-muted-foreground mb-2", children: "Engineer notes" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground leading-relaxed", children: rule.engineer_notes })
      ] }),
      (rule?.risk_flags ?? []).length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-wrap gap-1.5", children: rule.risk_flags.map((f, i) => /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[11px] px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-300", children: f }, i)) })
    ] })
  ] });
}
function ComplianceCard() {
  const project = useCurrentProject();
  const baseline = reactExports.useMemo(() => buildComplianceReport(project).allUpWeightKg, [project]);
  const [auw, setAuw] = reactExports.useState(Number(baseline.toFixed(2)));
  const report = reactExports.useMemo(() => buildComplianceReport(project, auw), [project, auw]);
  const tone = report.category === "Nano" || report.category === "Micro" ? "text-emerald-700 border-emerald-500/30 bg-emerald-500/10" : report.category === "Small" ? "text-amber-700 border-amber-500/30 bg-amber-500/10" : "text-rose-400 border-rose-500/30 bg-rose-500/10";
  const breakpoints = [{
    upTo: 0.25,
    label: "Nano"
  }, {
    upTo: 2,
    label: "Micro"
  }, {
    upTo: 25,
    label: "Small"
  }, {
    upTo: 150,
    label: "Medium"
  }, {
    upTo: Infinity,
    label: "Large"
  }];
  const next = breakpoints.find((b) => auw <= b.upTo && b.upTo !== Infinity && auw < b.upTo);
  const nextHint = next ? `+${(next.upTo - auw).toFixed(2)} kg → moves to ${breakpoints[breakpoints.indexOf(next) + 1]?.label ?? "Large"} class` : null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-border/60 bg-card/60 p-5 space-y-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between flex-wrap gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(ShieldAlert, { className: "h-4 w-4 text-sky-700" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "font-semibold", children: "DGCA & NPNT Compliance Rating" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: `inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${tone}`, children: [
        report.category,
        " class · ",
        report.weightBand
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: "Edit estimated All-Up Weight to see how component swaps (heavier battery, extra sensors, larger tank) push the design into a different DGCA class." }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid sm:grid-cols-[260px_1fr] gap-4 items-start", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { className: "text-xs", children: "Estimated All-Up Weight (kg)" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { type: "number", step: 0.1, min: 0, value: auw, onChange: (e) => setAuw(+e.target.value) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-[11px] text-muted-foreground", children: [
          "Baseline from current design: ",
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-medium", children: [
            baseline.toFixed(2),
            " kg"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "ml-2 underline text-sky-700", onClick: () => setAuw(Number(baseline.toFixed(2))), children: "reset" })
        ] }),
        nextHint && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[11px] text-amber-700", children: nextHint }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-[11px] text-muted-foreground pt-1", children: [
          "Altitude ceiling: ",
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-medium", children: [
            report.maxAltitudeFtAgl,
            " ft AGL"
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "grid sm:grid-cols-2 gap-1.5", children: report.checks.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex items-start gap-2 text-xs rounded border border-border/40 px-2.5 py-1.5", children: [
        c.ok ? /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "h-3.5 w-3.5 text-amber-700 mt-0.5 shrink-0" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(CircleX, { className: "h-3.5 w-3.5 text-emerald-700 mt-0.5 shrink-0" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-medium", children: c.label }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-muted-foreground", children: c.detail })
        ] })
      ] }, c.id)) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex justify-end", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { asChild: true, variant: "outline", size: "sm", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/mission-hub/torqwings-design-studio/compliance", children: "Open full compliance checklist →" }) }) })
  ] });
}
function Empty({
  msg,
  cta,
  ctaLabel
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-border/60 bg-card/60 p-10 text-center", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground", children: msg }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { asChild: true, className: "mt-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: cta, children: ctaLabel }) })
  ] });
}
export {
  DesignResult as component
};
