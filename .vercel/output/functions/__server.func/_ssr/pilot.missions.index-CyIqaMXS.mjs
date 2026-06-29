import { r as reactExports, j as jsxRuntimeExports } from "../_libs/react.mjs";
import { L as Link } from "../_libs/tanstack__react-router.mjs";
import { u as usePilotStore } from "./pilot-store-Br2zyCNy.mjs";
import { Q as Search, M as MapPin, v as Clock, k as ArrowRight } from "../_libs/lucide-react.mjs";
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
const filters = ["ALL", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "SYNC_PENDING"];
function statusBadge(s) {
  const map = {
    ASSIGNED: "bg-primary/15 text-primary border-primary/30",
    IN_PROGRESS: "bg-amber-400/15 text-amber-700 border-amber-400/30",
    COMPLETED: "bg-accent/15 text-accent border-accent/30",
    SYNC_PENDING: "bg-destructive/15 text-destructive border-destructive/30"
  };
  return map[s] || "bg-muted text-muted-foreground";
}
function MissionsList() {
  const missions = usePilotStore((s) => s.missions);
  const [filter, setFilter] = reactExports.useState("ALL");
  const [q, setQ] = reactExports.useState("");
  const visible = missions.filter((m) => filter === "ALL" || m.status === filter).filter((m) => !q || m.farmName.toLowerCase().includes(q.toLowerCase()) || m.missionCode.toLowerCase().includes(q.toLowerCase()));
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 space-y-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-xl font-semibold", children: "Missions" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground", children: "All farm operations assigned to you." })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: q, onChange: (e) => setQ(e.target.value), placeholder: "Search farm or mission ID", className: "w-full h-11 pl-9 pr-3 rounded-xl bg-input/40 border border-border/60 text-sm outline-none focus:ring-2 focus:ring-ring" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex gap-2 overflow-x-auto pb-1 -mx-1 px-1", children: filters.map((f) => /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setFilter(f), className: `whitespace-nowrap text-[11px] px-3 py-1.5 rounded-full border ${filter === f ? "bg-primary text-primary-foreground border-primary" : "bg-secondary/40 text-muted-foreground border-border/60"}`, children: f.replace("_", " ") }, f)) }),
    visible.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rounded-2xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground", children: "No missions match this filter." }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-3", children: visible.map((m) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { to: "/pilot/missions/$id", params: {
      id: m.id
    }, className: "block rounded-2xl border border-border/60 bg-gradient-card p-4 shadow-card", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-[11px] text-muted-foreground", children: [
            m.missionCode,
            " · ",
            m.assignedDrone
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-semibold", children: m.farmName })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `text-[10px] px-2 py-1 rounded-full border ${statusBadge(m.status)}`, children: m.status.replace("_", " ") })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 text-xs text-muted-foreground flex items-center gap-3 flex-wrap", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(MapPin, { className: "h-3 w-3" }),
          m.farmLocation
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Clock, { className: "h-3 w-3" }),
          m.scheduledTime
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 flex items-center justify-between", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] uppercase tracking-wider px-2 py-1 rounded-md bg-secondary/60 border border-border/60", children: m.missionType === "SURVEY" ? "Farm Survey" : "Spraying" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs text-primary flex items-center gap-1", children: [
          "Open ",
          /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { className: "h-3 w-3" })
        ] })
      ] })
    ] }, m.id)) })
  ] });
}
export {
  MissionsList as component
};
