import { r as reactExports, j as jsxRuntimeExports } from "../_libs/react.mjs";
import { d as useNavigate, L as Link } from "../_libs/tanstack__react-router.mjs";
import { u as useMissionHubAuth } from "./context-BevYt8mH.mjs";
import { f as fetchProjectStats, a as fetchProjectsPage } from "./project-service-weIoT5zz.mjs";
import { R as RISK_TONE } from "./constants-DuZL5k1r.mjs";
import { B as Button } from "./button-DjOZMqFS.mjs";
import { D as Disclaimer } from "./sidebar-CQ8yt5pY.mjs";
import { an as FilePlus, F as FlaskConical, am as Sparkles, a4 as FileText, a2 as Inbox, u as ChevronRight } from "../_libs/lucide-react.mjs";
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
function Dashboard() {
  const {
    profile
  } = useMissionHubAuth();
  const nav = useNavigate();
  const isAdmin = profile?.role === "admin" || profile?.role === "super_admin";
  const userId = profile?.id ?? "";
  const [stats, setStats] = reactExports.useState({
    total: 0,
    draft: 0,
    designed: 0,
    simulated: 0,
    reviewed: 0
  });
  const [rows, setRows] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(true);
  reactExports.useEffect(() => {
    if (!userId) return;
    fetchProjectStats(userId, isAdmin).then(setStats).catch(() => {
    });
  }, [userId, isAdmin]);
  reactExports.useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setLoading(true);
    fetchProjectsPage(userId, isAdmin, 0, 8, "").then(({
      rows: r
    }) => {
      if (!cancelled) setRows(r);
    }).catch(() => {
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [userId, isAdmin]);
  const kpis = [{
    label: "Total Projects",
    value: stats.total,
    tone: "text-sky-700"
  }, {
    label: "Draft",
    value: stats.draft,
    tone: "text-slate-500"
  }, {
    label: "Designed",
    value: stats.designed,
    tone: "text-indigo-700"
  }, {
    label: "Simulations Completed",
    value: stats.simulated,
    tone: "text-violet-700"
  }, {
    label: "Reviewed",
    value: stats.reviewed,
    tone: "text-emerald-700"
  }];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-8", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3", children: kpis.map((k) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-border/60 bg-card/60 p-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs uppercase tracking-wide text-muted-foreground", children: k.label }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `mt-2 text-2xl font-semibold ${k.tone}`, children: k.value })
    ] }, k.label)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { onClick: () => nav({
        to: "/mission-hub/torqwings-design-studio/new"
      }), className: "bg-sky-500 hover:bg-sky-600 text-white", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(FilePlus, { className: "h-4 w-4 mr-1" }),
        " Create New Drone Design"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "outline", onClick: () => nav({
        to: "/mission-hub/torqwings-design-studio/simulation"
      }), children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(FlaskConical, { className: "h-4 w-4 mr-1" }),
        " Open Simulation Lab"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "outline", onClick: () => nav({
        to: "/mission-hub/torqwings-design-studio/advisor"
      }), children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { className: "h-4 w-4 mr-1" }),
        " Ask AI Advisor"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "outline", onClick: () => nav({
        to: "/mission-hub/torqwings-design-studio/report"
      }), children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { className: "h-4 w-4 mr-1" }),
        " View Reports"
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-lg font-semibold mb-3", children: "Recent Projects" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rounded-xl border border-border/60 bg-card/60 overflow-hidden", children: loading ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "py-4 space-y-2 px-4", children: [0, 1, 2].map((i) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-10 rounded bg-muted/30 animate-pulse" }, i)) }) : rows.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center py-12 text-muted-foreground", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Inbox, { className: "h-8 w-8 mx-auto mb-3 opacity-40" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm", children: "No projects yet" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs mt-1", children: 'Click "Create New Drone Design" above to get started.' })
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-sm", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: ["Project", "Vertical", "Purpose", "Status", "Risk", "Updated", ""].map((h) => /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left font-medium px-4 py-3", children: h }, h)) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: rows.map((r) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-t border-border/60 hover:bg-muted/20", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3 font-medium", children: r.project_name }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3 text-muted-foreground", children: r.vertical }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3 text-muted-foreground", children: r.purpose ?? "—" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs px-2 py-0.5 rounded-full bg-muted/40 border border-border", children: r.status }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: `px-4 py-3 text-xs ${RISK_TONE[r.risk_level]?.text ?? "text-muted-foreground"}`, children: r.risk_level ?? "—" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3 text-muted-foreground", children: new Date(r.updated_at).toLocaleDateString() }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { to: "/mission-hub/torqwings-design-studio/design", onClick: () => {
            if (typeof window !== "undefined") {
              window.sessionStorage.setItem("torqwings-studio:selected", r.id);
            }
          }, className: "text-primary text-xs inline-flex items-center", children: [
            "Open ",
            /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { className: "h-3 w-3" })
          ] }) })
        ] }, r.id)) })
      ] }) }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Disclaimer, {})
  ] });
}
export {
  Dashboard as component
};
