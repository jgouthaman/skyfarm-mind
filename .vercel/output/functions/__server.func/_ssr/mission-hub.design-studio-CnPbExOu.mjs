import { r as reactExports, j as jsxRuntimeExports } from "../_libs/react.mjs";
import { d as useNavigate, L as Link } from "../_libs/tanstack__react-router.mjs";
import { M as MissionHubShell, a as MhCard } from "./Shell-BRA8Q4Nz.mjs";
import { u as useMissionHubAuth } from "./context-BevYt8mH.mjs";
import { f as fetchProjectStats, a as fetchProjectsPage } from "./project-service-weIoT5zz.mjs";
import { R as RISK_TONE } from "./constants-DuZL5k1r.mjs";
import { t as toast } from "../_libs/sonner.mjs";
import { Z as Plus, a3 as Inbox, a4 as ArrowUpRight } from "../_libs/lucide-react.mjs";
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
const PAGE_SIZE = 10;
function DesignStudioPage() {
  const {
    profile,
    verticals,
    loading
  } = useMissionHubAuth();
  const navigate = useNavigate();
  const isAdmin = profile?.role === "admin" || profile?.role === "super_admin";
  const hasAccess = isAdmin || verticals.includes("design-studio");
  reactExports.useEffect(() => {
    if (!loading && profile && !hasAccess) {
      toast.error("Access restricted.");
      navigate({
        to: "/mission-hub/dashboard"
      });
    }
  }, [loading, profile, hasAccess, navigate]);
  if (loading || !profile) return null;
  if (!hasAccess) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(MissionHubShell, { title: "Design Studio", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(LaunchBanner, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsx(MyProjects, { isAdmin, userId: profile.id })
  ] });
}
function LaunchBanner() {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex justify-end mb-6", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { to: "/mission-hub/torqwings-design-studio/new", className: "inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-[13px] text-white", style: {
    background: "#185FA5"
  }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "h-4 w-4" }),
    " New project"
  ] }) });
}
function MyProjects({
  isAdmin,
  userId
}) {
  const [stats, setStats] = reactExports.useState({
    total: 0,
    draft: 0,
    designed: 0,
    simulated: 0,
    reviewed: 0
  });
  const [rows, setRows] = reactExports.useState([]);
  const [totalRows, setTotalRows] = reactExports.useState(0);
  const [page, setPage] = reactExports.useState(0);
  const [search, setSearch] = reactExports.useState("");
  const [debouncedSearch, setDebouncedSearch] = reactExports.useState("");
  const [loadingRows, setLoadingRows] = reactExports.useState(true);
  const [fetchError, setFetchError] = reactExports.useState(null);
  const [retryTick, setRetryTick] = reactExports.useState(0);
  reactExports.useEffect(() => {
    fetchProjectStats(userId, isAdmin).then(setStats).catch(() => {
    });
  }, []);
  reactExports.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);
  reactExports.useEffect(() => {
    setPage(0);
  }, [debouncedSearch]);
  reactExports.useEffect(() => {
    let cancelled = false;
    setLoadingRows(true);
    setFetchError(null);
    fetchProjectsPage(userId, isAdmin, page, PAGE_SIZE, debouncedSearch).then(({
      rows: r,
      total
    }) => {
      if (cancelled) return;
      setRows(r);
      setTotalRows(total);
    }).catch((e) => {
      if (!cancelled) setFetchError(e?.message ?? "Unknown error");
    }).finally(() => {
      if (!cancelled) setLoadingRows(false);
    });
    return () => {
      cancelled = true;
    };
  }, [page, debouncedSearch, retryTick]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-8", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 lg:grid-cols-5 gap-4 mb-5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Stat, { label: isAdmin ? "Total projects" : "Your projects", value: stats.total }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Stat, { label: "Draft", value: stats.draft }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Stat, { label: "Designed", value: stats.designed }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Stat, { label: "Simulated", value: stats.simulated }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Stat, { label: "Reviewed", value: stats.reviewed })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(MhCard, { className: "overflow-hidden", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-white text-base shrink-0", style: {
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 500
        }, children: isAdmin ? "All Design Studio projects" : "Your Design Studio projects" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "text", value: search, onChange: (e) => {
            setSearch(e.target.value);
            setPage(0);
          }, placeholder: "Search projects…", className: "h-8 w-52 rounded-lg bg-white/8 border border-white/10\r\n                text-sm text-white/80 placeholder-white/30 px-3\r\n                focus:outline-none focus:border-white/25" }),
          search && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => {
            setSearch("");
            setPage(0);
          }, className: "text-white/40 hover:text-white/70 text-xs ml-1", children: "Clear" })
        ] })
      ] }),
      loadingRows ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "py-2", children: [0, 1, 2].map((i) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-10 rounded bg-white/5 animate-pulse mx-4 my-2" }, i)) }) : fetchError ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-white/50 text-sm text-center py-8", children: [
        "Failed to load projects.",
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setRetryTick((t) => t + 1), className: "underline ml-2 hover:text-white/70", children: "Retry" })
      ] }) : rows.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center py-12 text-white/40", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Inbox, { className: "h-8 w-8 mx-auto mb-3" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm", children: "No projects yet" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[12px] mt-1", children: 'Click "New project" above to start your first drone design.' })
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-sm", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "bg-[#0a0f1c] text-[11px] uppercase text-white/40 text-left", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-4 py-3 font-normal", children: "Project" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-4 py-3 font-normal", children: "Vertical" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-4 py-3 font-normal", children: "Purpose" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-4 py-3 font-normal", children: "Status" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-4 py-3 font-normal", children: "Risk" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-4 py-3 font-normal", children: "Updated" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-4 py-3 font-normal text-right", children: "Open" })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: rows.map((r) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-t border-white/[0.05]", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3 text-white/85", children: r.project_name }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3 text-white/70 text-[12px]", children: r.vertical }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3 text-white/70 text-[12px]", children: r.purpose ?? "—" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3 text-[12px] text-white/70", children: r.status }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: `px-4 py-3 text-[12px] ${RISK_TONE[r.risk_level]?.text ?? "text-white/60"}`, children: r.risk_level ?? "—" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3 text-[12px] text-white/60", children: new Date(r.updated_at).toLocaleDateString() }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3 text-right", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { to: "/mission-hub/torqwings-design-studio", className: "text-[12px] text-[#378ADD] inline-flex items-center gap-1", onClick: () => {
              if (typeof window !== "undefined") {
                window.sessionStorage.setItem("torqwings-studio:selected", r.id);
              }
            }, children: [
              "Open ",
              /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowUpRight, { className: "h-3.5 w-3.5" })
            ] }) })
          ] }, r.id)) })
        ] }) }),
        totalRows > PAGE_SIZE && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between px-5 py-3\r\n                border-t border-white/[0.05] text-[12px] text-white/40", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
            "Showing ",
            page * PAGE_SIZE + 1,
            "–",
            Math.min((page + 1) * PAGE_SIZE, totalRows),
            " of ",
            totalRows
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { disabled: page === 0, onClick: () => setPage((p) => p - 1), className: "px-3 py-1 rounded border border-white/10 text-white/60\r\n                      hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed", children: "Prev" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { disabled: (page + 1) * PAGE_SIZE >= totalRows, onClick: () => setPage((p) => p + 1), className: "px-3 py-1 rounded border border-white/10 text-white/60\r\n                      hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed", children: "Next" })
          ] })
        ] })
      ] })
    ] })
  ] });
}
function Stat({
  label,
  value
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(MhCard, { className: "p-5", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-3xl text-white", style: {
      fontFamily: "'Space Grotesk', sans-serif",
      fontWeight: 500
    }, children: value }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1 text-[12px] text-white/50", children: label })
  ] });
}
export {
  DesignStudioPage as component
};
