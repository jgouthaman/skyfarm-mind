import { j as jsxRuntimeExports } from "../_libs/react.mjs";
import { S as StudioStepNav } from "./step-nav-4ASvtYHx.mjs";
import { S as StudioTabNav } from "./StudioTabNav-A7uSJqj-.mjs";
import { u as useCurrentProject } from "./store-D8Xv1K_U.mjs";
import { B as Button } from "./button-DjOZMqFS.mjs";
import { D as Disclaimer } from "./sidebar-CQ8yt5pY.mjs";
import { a as riskColor } from "./engine-DuoJgisk.mjs";
import { t as toast } from "../_libs/sonner.mjs";
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
import "../_libs/lucide-react.mjs";
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
function Report() {
  const project = useCurrentProject();
  if (!project) return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm text-muted-foreground", children: "No active project." });
  function exportJSON() {
    const blob = new Blob([JSON.stringify(project, null, 2)], {
      type: "application/json"
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${project.projectName}-report.json`;
    a.click();
    toast.success("Exported JSON");
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-5 max-w-4xl", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(StudioTabNav, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "flex justify-between items-end flex-wrap gap-3 print:hidden", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-2xl font-semibold", children: "Design Report" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground mt-1", children: "Investor-ready summary of the project." })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", onClick: () => window.print(), children: "Download PDF" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", onClick: exportJSON, children: "Export JSON" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", onClick: () => {
          navigator.clipboard.writeText(window.location.href);
          toast.success("Link copied");
        }, children: "Share" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { className: "bg-sky-500 hover:bg-sky-600 text-white", onClick: () => toast.success("Saved to project history"), children: "Save" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("article", { className: "rounded-xl border border-border/60 bg-card/60 p-8 space-y-6 print:bg-white print:text-black", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border-b border-border/60 pb-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs uppercase tracking-widest text-muted-foreground", children: "TorqWings Design Studio Report" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-2xl font-bold mt-1", children: project.projectName }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-sm text-muted-foreground mt-1", children: [
          project.vertical,
          " · ",
          project.purpose,
          " · ",
          project.userType
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Section, { title: "1. Project Overview", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(KV, { k: "Project", v: project.projectName }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(KV, { k: "Vertical", v: project.vertical }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(KV, { k: "Purpose", v: project.purpose }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(KV, { k: "User type", v: project.userType }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(KV, { k: "Status", v: project.status }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(KV, { k: "Risk level", v: project.riskLevel ?? "—" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Section, { title: "2. User Requirements", children: project.requirements ? /* @__PURE__ */ jsxRuntimeExports.jsx("pre", { className: "text-xs bg-muted/40 print:bg-gray-100 rounded p-3 overflow-auto", children: JSON.stringify(project.requirements, null, 2) }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Empty, {}) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Section, { title: "3. Recommended Drone Architecture", children: project.recommendedDesign ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid sm:grid-cols-2 gap-2 text-sm", children: [
        Object.entries(project.recommendedDesign).filter(([k]) => k !== "notes" && k !== "estimatedCost").map(([k, v]) => /* @__PURE__ */ jsxRuntimeExports.jsx(KV, { k, v: String(v) }, k)),
        /* @__PURE__ */ jsxRuntimeExports.jsx(KV, { k: "Estimated cost", v: `$${project.recommendedDesign.estimatedCost.min.toLocaleString()} – $${project.recommendedDesign.estimatedCost.max.toLocaleString()}` })
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Empty, {}) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Section, { title: "4. Component List", children: project.componentList ? /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-xs", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "text-left text-muted-foreground", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "py-1", children: "Category" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Component" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Qty" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "$" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: project.componentList.map((c, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-t border-border/40", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "py-1", children: c.category }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: c.name }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: c.quantity }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { children: [
            "$",
            c.estimatedCost
          ] })
        ] }, i)) })
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Empty, {}) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Section, { title: "5. Simulation Parameters", children: project.simulationParameters ? /* @__PURE__ */ jsxRuntimeExports.jsx("pre", { className: "text-xs bg-muted/40 print:bg-gray-100 rounded p-3 overflow-auto", children: JSON.stringify(project.simulationParameters, null, 2) }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Empty, {}) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Section, { title: "6. Simulation Results", children: project.simulationResults ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid sm:grid-cols-2 gap-2 text-sm", children: Object.entries(project.simulationResults).map(([k, v]) => /* @__PURE__ */ jsxRuntimeExports.jsx(KV, { k, v: String(v) }, k)) }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Empty, {}) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Section, { title: "7. Safety & Risk Score", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${riskColor(project.riskLevel)}`, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold", children: project.riskLevel ?? "Not evaluated" }),
        project.simulationResults && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs", children: [
          "· TWR ",
          project.simulationResults.thrustToWeightRatio.toFixed(2)
        ] })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Section, { title: "8. AI Advisor Summary", children: project.advisorMessages && project.advisorMessages.length > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-2 text-xs", children: project.advisorMessages.slice(-4).map((m, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border border-border/40 rounded p-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-semibold uppercase text-[10px] text-muted-foreground", children: m.role }),
        m.content
      ] }, i)) }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Empty, { msg: "No advisor conversation yet." }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Section, { title: "9. Cost Estimate", children: project.componentList ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-lg font-semibold", children: [
        "$",
        project.componentList.reduce((s, c) => s + c.estimatedCost * c.quantity, 0).toLocaleString()
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Empty, {}) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Section, { title: "10. Engineering Recommendations", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("ul", { className: "list-disc list-inside text-sm text-muted-foreground space-y-1", children: [
        (project.recommendedDesign?.notes ?? []).map((n, i) => /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: n }, i)),
        /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "Validate motor and ESC thermals under sustained payload." }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "Perform bench thrust test before first flight." }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "Cross-check airspace and operational permissions." })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Section, { title: "12. Next Steps", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("ol", { className: "list-decimal list-inside text-sm text-muted-foreground space-y-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "Procure BOM and assemble prototype." }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "Conduct hover trial in controlled environment." }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "Iterate on motor/propeller pairing based on real telemetry." }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "Run mission rehearsal at planned site." }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "File DigitalSky permission and obtain state-level NOC before first outdoor flight." })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Section, { title: "13. Disclaimer", children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: "This portal provides design assistance, simulation estimates, and indicative regulatory guidance only. It does not certify that a drone is safe, legal, or flight-ready. Final design must be reviewed by qualified drone engineers, and all flights must be cleared via the DGCA DigitalSky portal and relevant state authorities before take-off." }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "print:hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Disclaimer, {}) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "print:hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsx(StudioStepNav, {}) })
  ] });
}
function Section({
  title,
  children
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2", children: title }),
    children
  ] });
}
function KV({
  k,
  v
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between gap-3 text-sm border-b border-border/40 py-1", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground capitalize", children: k.replace(/([A-Z])/g, " $1").trim() }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium text-right", children: v })
  ] });
}
function Empty({
  msg = "Not generated yet."
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground italic", children: msg });
}
export {
  Report as component
};
