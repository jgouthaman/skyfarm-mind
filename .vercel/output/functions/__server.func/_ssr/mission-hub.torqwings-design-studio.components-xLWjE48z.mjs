import { r as reactExports, j as jsxRuntimeExports } from "../_libs/react.mjs";
import { L as Link } from "../_libs/tanstack__react-router.mjs";
import { S as StudioStepNav } from "./step-nav-4ASvtYHx.mjs";
import { S as StudioTabNav } from "./StudioTabNav-A7uSJqj-.mjs";
import { u as useCurrentProject } from "./store-D8Xv1K_U.mjs";
import { s as supabase } from "./client-DYtC4Igq.mjs";
import { B as Button } from "./button-DjOZMqFS.mjs";
import { t as toast } from "../_libs/sonner.mjs";
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
import "../_libs/lucide-react.mjs";
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
const SAFETY = /* @__PURE__ */ new Set(["Safety buzzer", "Voltage monitor", "Obstacle sensor", "Parachute", "Landing gear"]);
const PAYLOAD = /* @__PURE__ */ new Set(["Payload module", "Camera module", "Spray system", "Pump", "Nozzles", "Tank"]);
const DARK_VARS = {
  "--foreground": "oklch(0.95 0.01 250)",
  "--muted-foreground": "oklch(0.58 0.04 250)",
  "--border": "oklch(0.95 0.01 250 / 15%)",
  "--card": "oklch(0.14 0.04 250)"
};
const COMP_KEYS = ["frame", "motors", "esc", "battery", "flight_controller", "gps", "payload", "propellers"];
const COMP_BADGE = {
  frame: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  motors: "bg-green-500/20 text-green-300 border-green-500/30",
  esc: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  battery: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  flight_controller: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  gps: "bg-teal-500/20 text-teal-300 border-teal-500/30",
  payload: "bg-pink-500/20 text-pink-300 border-pink-500/30",
  propellers: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30"
};
const CONFIDENCE_BADGE = {
  high: "bg-emerald-500/15 border-emerald-500/30 text-emerald-400",
  medium: "bg-amber-500/15 border-amber-500/30 text-amber-400",
  low: "bg-red-500/15 border-red-500/30 text-red-400"
};
function Components() {
  const project = useCurrentProject();
  const rec = project?.design_recommendation ?? null;
  const hasOldList = !!project?.componentList;
  const [liveComponentList, setLiveComponentList] = reactExports.useState(null);
  const [refNotFound, setRefNotFound] = reactExports.useState(false);
  const [filter, setFilter] = reactExports.useState("all");
  const filtered = reactExports.useMemo(() => {
    const list = project?.componentList ?? [];
    if (filter === "mandatory") return list.filter((c) => c.priority === "Mandatory");
    if (filter === "optional") return list.filter((c) => c.priority === "Optional" || c.priority === "Recommended");
    if (filter === "safety") return list.filter((c) => SAFETY.has(c.category));
    if (filter === "payload") return list.filter((c) => PAYLOAD.has(c.category));
    return list;
  }, [project, filter]);
  reactExports.useEffect(() => {
    const refId = rec?.matched_reference?.id;
    if (!refId) return;
    const saved = rec?.matched_reference?.component_list;
    const isEmpty = !saved || Array.isArray(saved) || Object.keys(saved).length === 0;
    if (!isEmpty) {
      setLiveComponentList(saved);
      return;
    }
    supabase.from("reference_designs").select("component_list").eq("id", refId).eq("approval_status", "approved").limit(1).then(({
      data
    }) => {
      const row = Array.isArray(data) ? data[0] : data;
      if (row?.component_list) {
        setLiveComponentList(row.component_list);
      } else {
        setRefNotFound(true);
      }
    });
  }, [rec?.matched_reference?.id]);
  const hasNewRec = rec !== null && (rec.matched_reference?.component_list != null && !Array.isArray(rec.matched_reference.component_list) || liveComponentList !== null);
  if (refNotFound && !hasOldList) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "py-12 text-center text-white/40 text-sm", children: [
      "Reference design no longer available.",
      /* @__PURE__ */ jsxRuntimeExports.jsx("a", { href: "/mission-hub/torqwings-design-studio/new", className: "text-[#378ADD] ml-1 hover:underline", children: "Regenerate this design →" })
    ] });
  }
  if (!hasOldList && !hasNewRec) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-border/60 bg-card/60 p-10 text-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground", children: "No component list yet. Generate a design first." }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { asChild: true, className: "mt-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/mission-hub/torqwings-design-studio/requirements", children: "Open requirements" }) })
    ] });
  }
  if (hasNewRec) {
    const compList = liveComponentList ?? rec.matched_reference.component_list;
    const rows = COMP_KEYS.filter((k) => compList[k]);
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-5", style: DARK_VARS, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(StudioTabNav, {}),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "flex items-end justify-between flex-wrap gap-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-2xl font-semibold text-white", children: "Bill of Materials" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm text-white/50 mt-1", children: [
            project.projectName,
            " · Based on:",
            " ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-white/70", children: rec.matched_reference.name })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: `text-[11px] px-2.5 py-1 rounded-full border font-medium capitalize ${CONFIDENCE_BADGE[rec.confidence] ?? CONFIDENCE_BADGE.low}`, children: [
          rec.confidence,
          " confidence"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-white/[0.08] bg-[#0a0f1c] overflow-hidden", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-[140px_1fr_1fr_110px] gap-4 bg-[#0d1117] text-[11px] uppercase tracking-wider text-white/40 px-4 py-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Category" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Model" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Specs" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", {})
        ] }),
        rows.map((key) => {
          const val = compList[key];
          const model = val?.model ?? "—";
          const extras = Object.entries(val ?? {}).filter(([k]) => k !== "model").map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`).join(" · ");
          const badgeCls = COMP_BADGE[key] ?? "bg-white/10 text-white/50 border-white/10";
          return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-[140px_1fr_1fr_110px] gap-4 border-t border-white/[0.05] px-4 py-3.5 items-center", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `inline-flex text-[11px] font-medium px-2 py-0.5 rounded-full border w-fit ${badgeCls}`, children: key.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase()) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-white font-medium text-sm", children: model }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-white/45 text-[12px]", children: extras || "—" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/mission-hub/twbc-drone-components-library", className: "text-[12px] text-[#378ADD] hover:underline whitespace-nowrap", children: "Find in Library →" })
          ] }, key);
        })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(StudioStepNav, {})
    ] });
  }
  const total = filtered.reduce((s, c) => s + c.estimatedCost * c.quantity, 0);
  const inr = (n) => `₹${n.toLocaleString("en-IN")}`;
  function exportCSV() {
    const header = ["Category", "Name", "Specification", "Quantity", "Unit Cost (INR)", "Total Cost (INR)", "Priority", "Source", "Source URL", "Notes"];
    const rows = filtered.map((c) => [c.category, c.name, c.specification, c.quantity, c.estimatedCost, c.quantity * c.estimatedCost, c.priority, c.sourceName ?? "", c.sourceUrl ?? "", c.notes ?? ""]);
    const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], {
      type: "text/csv"
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${project.projectName}-BOM.csv`;
    a.click();
    toast.success("BOM exported as CSV");
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-5", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(StudioTabNav, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "flex items-end justify-between flex-wrap gap-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-2xl font-semibold", children: "Bill of Materials" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm text-muted-foreground mt-1", children: [
          project.projectName,
          " · ",
          filtered.length,
          " items · Est. total ",
          inr(total)
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-muted-foreground mt-1", children: [
          "Indicative pricing in INR sourced from ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("a", { href: "https://robu.in", target: "_blank", rel: "noreferrer", className: "underline text-sky-700", children: "robu.in" }),
          ". Click any row's source link for the latest live price."
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", size: "sm", onClick: exportCSV, children: "Export CSV" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", size: "sm", onClick: () => window.print(), children: "Download PDF" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "sm", className: "bg-sky-500 hover:bg-sky-600 text-white", onClick: () => toast.success("Sent for engineering review"), children: "Send for Review" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-wrap gap-2", children: [["all", "All"], ["mandatory", "Mandatory only"], ["optional", "Optional / Recommended"], ["safety", "Safety components"], ["payload", "Payload-specific"]].map(([k, label]) => /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setFilter(k), className: `text-xs px-3 py-1.5 rounded-full border ${filter === k ? "bg-primary/15 text-primary border-primary/30" : "border-border text-muted-foreground hover:text-foreground"}`, children: label }, k)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rounded-xl border border-border/60 bg-card/60 overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-sm", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: ["Category", "Component", "Specification", "Qty", "Unit ₹", "Total ₹", "Priority", "Source"].map((h) => /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left font-medium px-4 py-3", children: h }, h)) }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: filtered.map((c, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-t border-border/60", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5 text-muted-foreground", children: c.category }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5 font-medium", children: c.name }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5 text-muted-foreground", children: c.specification }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5", children: c.quantity }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5", children: inr(c.estimatedCost) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5", children: inr(c.quantity * c.estimatedCost) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `text-xs px-2 py-0.5 rounded-full border ${c.priority === "Mandatory" ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30" : c.priority === "Recommended" ? "bg-sky-500/10 text-sky-700 border-sky-500/30" : c.priority === "Advanced" ? "bg-violet-500/10 text-violet-700 border-violet-500/30" : "bg-muted/40 text-muted-foreground border-border"}`, children: c.priority }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5", children: c.sourceUrl ? /* @__PURE__ */ jsxRuntimeExports.jsxs("a", { href: c.sourceUrl, target: "_blank", rel: "noreferrer", className: "text-xs text-sky-700 hover:underline", children: [
          c.sourceName ?? "view",
          " ↗"
        ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground", children: "—" }) })
      ] }, i)) })
    ] }) }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(StudioStepNav, {})
  ] });
}
export {
  Components as component
};
