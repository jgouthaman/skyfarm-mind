import { j as jsxRuntimeExports, r as reactExports } from "../_libs/react.mjs";
import { d as useNavigate } from "../_libs/tanstack__react-router.mjs";
import { M as MissionHubShell } from "./Shell-BRA8Q4Nz.mjs";
import { u as useMissionHubAuth } from "./context-BevYt8mH.mjs";
import { s as supabase } from "./client-DYtC4Igq.mjs";
import "../_libs/sonner.mjs";
import { Z as Plus, T as Search, X, w as Clock, _ as Eye, Y as Copy, e as LoaderCircle, g as CircleCheck, r as CircleX, u as ChevronDown } from "../_libs/lucide-react.mjs";
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
import "../_libs/supabase__supabase-js.mjs";
import "../_libs/supabase__postgrest-js.mjs";
import "../_libs/supabase__realtime-js.mjs";
import "../_libs/supabase__phoenix.mjs";
import "../_libs/supabase__storage-js.mjs";
import "../_libs/iceberg-js.mjs";
import "../_libs/supabase__auth-js.mjs";
import "tslib";
import "../_libs/supabase__functions-js.mjs";
function useReferenceDesigns(search, verticalFilter, approvedOnly = false) {
  const [designs, setDesigns] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(true);
  const [error, setError] = reactExports.useState(null);
  const [stats, setStats] = reactExports.useState({ total: 0, approved: 0, pending: 0, verticals: 0 });
  const [tick, setTick] = reactExports.useState(0);
  const [debouncedSearch, setDebouncedSearch] = reactExports.useState(search);
  reactExports.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);
  reactExports.useEffect(() => {
    supabase.from("reference_designs").select("approval_status, vertical").then(({ data, error: sErr }) => {
      if (sErr) {
        console.error("[useReferenceDesigns] stats:", sErr.message);
        return;
      }
      const rows = data ?? [];
      setStats({
        total: rows.length,
        approved: rows.filter((r) => r.approval_status === "approved").length,
        pending: rows.filter((r) => r.approval_status === "pending").length,
        verticals: new Set(rows.map((r) => r.vertical).filter(Boolean)).size
      });
    });
  }, [tick]);
  reactExports.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    async function load() {
      let q = supabase.from("reference_designs").select("*").order("confidence_score", { ascending: false });
      if (approvedOnly) {
        q = q.eq("approval_status", "approved");
      }
      if (debouncedSearch) {
        q = q.or(`name.ilike.%${debouncedSearch}%,purpose.ilike.%${debouncedSearch}%`);
      }
      if (verticalFilter.length > 0) {
        q = q.in("vertical", verticalFilter);
      }
      const { data, error: qErr } = await q;
      if (cancelled) return;
      if (qErr) {
        console.error("[useReferenceDesigns] grid:", qErr.message);
        setError(qErr.message);
        setLoading(false);
        return;
      }
      setDesigns(data ?? []);
      setLoading(false);
    }
    load().catch((err) => {
      if (!cancelled) {
        console.error("[useReferenceDesigns] load threw:", err);
        setError(err?.message ?? "Unexpected error");
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, JSON.stringify(verticalFilter), tick]);
  const insert = reactExports.useCallback(async (row) => {
    const { error: insErr } = await supabase.from("reference_designs").insert(row);
    if (insErr) throw new Error(insErr.message);
    setTick((t) => t + 1);
  }, []);
  const approveDesign = reactExports.useCallback(async (id, userId) => {
    const { error: upErr } = await supabase.from("reference_designs").update({ approval_status: "approved", approved_by: userId }).eq("id", id);
    if (upErr) throw new Error(upErr.message);
    setTick((t) => t + 1);
  }, []);
  const rejectDesign = reactExports.useCallback(async (id, userId) => {
    const { error: upErr } = await supabase.from("reference_designs").update({ approval_status: "rejected", approved_by: userId }).eq("id", id);
    if (upErr) throw new Error(upErr.message);
    setTick((t) => t + 1);
  }, []);
  return { designs, loading, error, stats, insert, approveDesign, rejectDesign };
}
const ALL_VERTICALS = ["Agriculture", "Infrastructure", "Mapping", "Surveillance", "Industrial", "Defence"];
const VERTICAL_COLOR = {
  Agriculture: {
    bg: "rgba(34,197,94,0.12)",
    text: "#4ade80"
  },
  Infrastructure: {
    bg: "rgba(55,138,221,0.12)",
    text: "#378ADD"
  },
  Mapping: {
    bg: "rgba(168,85,247,0.12)",
    text: "#c084fc"
  },
  Surveillance: {
    bg: "rgba(245,158,11,0.12)",
    text: "#fbbf24"
  },
  Industrial: {
    bg: "rgba(249,115,22,0.12)",
    text: "#fb923c"
  },
  Defence: {
    bg: "rgba(239,68,68,0.12)",
    text: "#f87171"
  }
};
const DRONE_TYPES = ["Quadcopter", "Hexacopter", "Octocopter", "Fixed-wing", "Fixed-wing VTOL", "Tethered", "Other"];
const MOTOR_CLASSES = ["2204 2300KV", "2206 2400KV", "2207 1750KV", "2306 2400KV", "3515 400KV", "4012 400KV", "4014 330KV", "4108 380KV", "Other"];
function ProvenDesignsPage() {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(MissionHubShell, { title: "Proven Designs", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ProvenDesignsContent, {}) });
}
function ProvenDesignsContent() {
  const {
    profile
  } = useMissionHubAuth();
  const navigate = useNavigate();
  const [search, setSearch] = reactExports.useState("");
  const [activeVerticals, setActiveVerticals] = reactExports.useState([]);
  const [modalOpen, setModalOpen] = reactExports.useState(false);
  const [viewTarget, setViewTarget] = reactExports.useState(null);
  const isAdmin = profile?.role === "admin" || profile?.role === "super_admin";
  const {
    designs,
    loading,
    error,
    stats,
    insert,
    approveDesign,
    rejectDesign
  } = useReferenceDesigns(search, activeVerticals.map((v) => v.toLowerCase()), !isAdmin);
  const [pendingOnly, setPendingOnly] = reactExports.useState(false);
  const displayedDesigns = pendingOnly ? designs.filter((d) => d.approval_status === "pending") : designs;
  const toggleVertical = (v) => setActiveVerticals((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]);
  const handleAdd = async (form) => {
    await insert({
      ...form,
      created_by: profile?.id ?? null
    });
    setModalOpen(false);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: {
    fontFamily: "Inter, system-ui, sans-serif"
  }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[13px] text-white/50 max-w-lg self-center", children: "Validated drone configurations approved by the engineering team. Use these as starting points or reference baselines for new projects." }),
      isAdmin && /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => setModalOpen(true), className: "inline-flex items-center gap-2 shrink-0 rounded-lg px-4 py-2.5 text-[13px] text-white transition-colors hover:opacity-90", style: {
        background: "#185FA5",
        fontFamily: "'Space Grotesk', sans-serif",
        fontWeight: 500
      }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "h-4 w-4" }),
        "Add proven design"
      ] })
    ] }),
    isAdmin && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(StatCard, { label: "Total designs", value: stats.total }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(StatCard, { label: "Approved", value: stats.approved, accent: "#4ade80" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(StatCard, { label: "Pending review", value: stats.pending, accent: "#fbbf24" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(StatCard, { label: "Verticals covered", value: stats.verticals })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col sm:flex-row gap-3 mb-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative flex-1 max-w-sm", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 pointer-events-none" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "text", value: search, onChange: (e) => setSearch(e.target.value), placeholder: "Search designs, purpose, drone type…", className: "w-full h-9 bg-[#141928] border rounded-lg pl-9 pr-3 text-sm text-white/80 placeholder-white/30 outline-none focus:border-[#378ADD]/50", style: {
          borderColor: "rgba(255,255,255,0.1)"
        } }),
        search && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setSearch(""), className: "absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60", children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "h-3.5 w-3.5" }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap gap-2", children: [
        ALL_VERTICALS.map((v) => {
          const active = activeVerticals.includes(v);
          const c = VERTICAL_COLOR[v];
          return /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => toggleVertical(v), className: "rounded-full px-3 py-1 text-[12px] border transition-all", style: active ? {
            background: c.bg,
            color: c.text,
            borderColor: c.text + "55"
          } : {
            background: "transparent",
            color: "rgba(255,255,255,0.4)",
            borderColor: "rgba(255,255,255,0.12)"
          }, children: v }, v);
        }),
        activeVerticals.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setActiveVerticals([]), className: "rounded-full px-3 py-1 text-[12px] text-white/30 hover:text-white/60 border transition-colors", style: {
          borderColor: "rgba(255,255,255,0.08)"
        }, children: "Clear" }),
        isAdmin && /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => setPendingOnly((p) => !p), className: "rounded-full px-3 py-1 text-[12px] border transition-all inline-flex items-center gap-1", style: pendingOnly ? {
          background: "rgba(245,158,11,0.12)",
          color: "#fbbf24",
          borderColor: "#fbbf2455"
        } : {
          background: "transparent",
          color: "rgba(255,255,255,0.4)",
          borderColor: "rgba(255,255,255,0.12)"
        }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Clock, { className: "h-3 w-3" }),
          "Pending review"
        ] })
      ] })
    ] }),
    loading ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5", children: Array.from({
      length: 6
    }).map((_, i) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rounded-[14px] h-64 animate-pulse", style: {
      background: "#141928",
      border: "0.5px solid rgba(255,255,255,0.08)"
    } }, i)) }) : error ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-center py-20", children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[13px] text-[#f87171]", children: error }) }) : displayedDesigns.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-center py-20 text-white/30", children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm", children: "No designs match your filters." }) }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5", children: displayedDesigns.map((d) => /* @__PURE__ */ jsxRuntimeExports.jsx(DesignCard, { design: d, isAdmin, onView: () => setViewTarget(d), onUseAsBase: () => {
      sessionStorage.setItem("torqwings-studio:base-design", d.id);
      navigate({
        to: "/mission-hub/torqwings-design-studio/new"
      });
    }, onApprove: isAdmin ? async () => approveDesign(d.id, profile.id) : void 0, onReject: isAdmin ? async () => rejectDesign(d.id, profile.id) : void 0 }, d.id)) }),
    modalOpen && /* @__PURE__ */ jsxRuntimeExports.jsx(AddDesignModal, { onClose: () => setModalOpen(false), onAdd: handleAdd }),
    viewTarget && /* @__PURE__ */ jsxRuntimeExports.jsx(ViewDesignModal, { design: viewTarget, isAdmin, onClose: () => setViewTarget(null), onUseAsBase: () => {
      sessionStorage.setItem("torqwings-studio:base-design", viewTarget.id);
      navigate({
        to: "/mission-hub/torqwings-design-studio/new"
      });
    }, onApprove: isAdmin && viewTarget.approval_status === "pending" ? async () => {
      await approveDesign(viewTarget.id, profile.id);
      setViewTarget(null);
    } : void 0, onReject: isAdmin && viewTarget.approval_status === "pending" ? async () => {
      await rejectDesign(viewTarget.id, profile.id);
      setViewTarget(null);
    } : void 0 })
  ] });
}
function StatCard({
  label,
  value,
  accent
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-[14px] p-5", style: {
    background: "#141928",
    border: "0.5px solid rgba(255,255,255,0.08)"
  }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-3xl", style: {
      fontFamily: "'Space Grotesk', sans-serif",
      fontWeight: 500,
      color: accent ?? "white"
    }, children: value }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1 text-[12px] text-white/50", children: label })
  ] });
}
function DesignCard({
  design,
  onView,
  onUseAsBase,
  isAdmin,
  onApprove,
  onReject
}) {
  const [acting, setActing] = reactExports.useState(false);
  const act = async (fn) => {
    setActing(true);
    try {
      await fn();
    } finally {
      setActing(false);
    }
  };
  const scoreColor = design.confidence_score >= 80 ? "#4ade80" : design.confidence_score >= 60 ? "#fbbf24" : "#f87171";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-[14px] flex flex-col gap-4 p-5 transition-colors hover:border-white/[0.14]", style: {
    background: "#141928",
    border: "0.5px solid rgba(255,255,255,0.08)"
  }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-white text-[15px] truncate", style: {
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 500
        }, children: design.name }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-0.5 text-[12px] text-white/50 line-clamp-2", children: design.description })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(ApprovalBadge, { status: design.approval_status })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-wrap gap-1.5", children: design.vertical && /* @__PURE__ */ jsxRuntimeExports.jsx(VerticalBadge, { vertical: design.vertical }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(SpecPill, { label: "Type", value: design.drone_type ?? "—" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(SpecPill, { label: "Payload", value: design.payload_weight ?? "—" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(SpecPill, { label: "Flight time", value: design.estimated_flight_time != null ? `${design.estimated_flight_time} min` : "—" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(SpecPill, { label: "Frame", value: design.frame_size ?? "—" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-1.5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[11px] uppercase tracking-wider text-white/30", children: "Confidence" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[12px] font-medium", style: {
          color: scoreColor
        }, children: [
          design.confidence_score,
          "%"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-1.5 rounded-full bg-white/[0.08] overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-full rounded-full transition-all", style: {
        width: `${design.confidence_score}%`,
        background: scoreColor
      } }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2 pt-1", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: onView, className: "flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border py-2 text-[12px] text-white/70 hover:text-white hover:border-white/25 transition-colors", style: {
        borderColor: "rgba(255,255,255,0.12)"
      }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, { className: "h-3.5 w-3.5" }),
        " View"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: onUseAsBase, className: "flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-[12px] transition-colors hover:opacity-90", style: {
        background: "rgba(55,138,221,0.15)",
        color: "#378ADD"
      }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Copy, { className: "h-3.5 w-3.5" }),
        " Use as base"
      ] })
    ] }),
    isAdmin && design.approval_status === "pending" && onApprove && onReject && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => act(onApprove), disabled: acting, className: "flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-[12px] transition-colors disabled:opacity-50", style: {
        background: "rgba(34,197,94,0.12)",
        color: "#4ade80"
      }, children: [
        acting ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "h-3.5 w-3.5 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "h-3.5 w-3.5" }),
        "Approve"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => act(onReject), disabled: acting, className: "flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-[12px] transition-colors disabled:opacity-50", style: {
        background: "rgba(239,68,68,0.12)",
        color: "#f87171"
      }, children: [
        acting ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "h-3.5 w-3.5 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(CircleX, { className: "h-3.5 w-3.5" }),
        "Reject"
      ] })
    ] })
  ] });
}
function ViewDesignModal({
  design,
  onClose,
  onUseAsBase,
  isAdmin,
  onApprove,
  onReject
}) {
  const [acting, setActing] = reactExports.useState(false);
  const act = async (fn) => {
    setActing(true);
    try {
      await fn();
    } finally {
      setActing(false);
    }
  };
  reactExports.useEffect(() => {
    const h = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);
  const scoreColor = design.confidence_score >= 80 ? "#4ade80" : design.confidence_score >= 60 ? "#fbbf24" : "#f87171";
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-12 px-4", style: {
    background: "rgba(0,0,0,0.65)"
  }, onClick: onClose, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative w-full max-w-2xl rounded-2xl p-8", style: {
    background: "#141928",
    border: "0.5px solid rgba(255,255,255,0.12)"
  }, onClick: (e) => e.stopPropagation(), children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: onClose, className: "absolute top-4 right-4 text-white/40 hover:text-white text-xl leading-none", children: "×" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-3 flex-wrap mb-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-white text-xl flex-1", style: {
        fontFamily: "'Space Grotesk', sans-serif",
        fontWeight: 600
      }, children: design.name }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(ApprovalBadge, { status: design.approval_status })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[13px] text-white/55 mb-4", children: design.description }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-wrap gap-1.5 mb-6", children: design.vertical && /* @__PURE__ */ jsxRuntimeExports.jsx(VerticalBadge, { vertical: design.vertical }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(SectionLabel, { children: "Purpose" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-white/70 mb-5", children: design.purpose }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(SectionLabel, { children: "Drone Specifications" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 md:grid-cols-3 gap-2 mb-5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(SpecCard, { label: "Drone type", value: design.drone_type ?? "—" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(SpecCard, { label: "Frame size", value: design.frame_size ?? "—" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(SpecCard, { label: "Payload", value: design.payload_weight ?? "—" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(SpecCard, { label: "Flight time", value: design.estimated_flight_time != null ? `${design.estimated_flight_time} min` : "—" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(SpecCard, { label: "Motor class", value: design.motor_class ?? "—" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(SpecCard, { label: "Battery", value: design.battery ?? "—" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(SectionLabel, { children: "Confidence Score" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 mb-5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 h-2 rounded-full bg-white/[0.08] overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-full rounded-full", style: {
        width: `${design.confidence_score}%`,
        background: scoreColor
      } }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-sm font-medium shrink-0", style: {
        color: scoreColor
      }, children: [
        design.confidence_score,
        "%"
      ] })
    ] }),
    design.engineer_notes && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(SectionLabel, { children: "Engineer Notes" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-white/60 rounded-xl p-4 mb-6", style: {
        background: "rgba(255,255,255,0.04)"
      }, children: design.engineer_notes })
    ] }),
    isAdmin && design.approval_status === "pending" && onApprove && onReject && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-3 mb-5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => act(onApprove), disabled: acting, className: "flex-1 inline-flex items-center justify-center gap-2 rounded-lg py-2.5 text-[13px] transition-colors disabled:opacity-50", style: {
        background: "rgba(34,197,94,0.12)",
        color: "#4ade80",
        border: "0.5px solid rgba(74,222,128,0.2)"
      }, children: [
        acting ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "h-4 w-4 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "h-4 w-4" }),
        "Approve design"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => act(onReject), disabled: acting, className: "flex-1 inline-flex items-center justify-center gap-2 rounded-lg py-2.5 text-[13px] transition-colors disabled:opacity-50", style: {
        background: "rgba(239,68,68,0.12)",
        color: "#f87171",
        border: "0.5px solid rgba(248,113,113,0.2)"
      }, children: [
        acting ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "h-4 w-4 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(CircleX, { className: "h-4 w-4" }),
        "Reject design"
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between items-center pt-4 border-t", style: {
      borderColor: "rgba(255,255,255,0.08)"
    }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[12px] text-white/30", children: [
        "Added ",
        design.created_at?.split("T")[0] ?? ""
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: onUseAsBase, className: "inline-flex items-center gap-2 rounded-lg px-5 py-2 text-[13px] text-white hover:opacity-90 transition-opacity", style: {
        background: "#185FA5"
      }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Copy, { className: "h-4 w-4" }),
        " Use as base"
      ] })
    ] })
  ] }) });
}
const EMPTY_FORM = {
  name: "",
  description: "",
  purpose: "",
  vertical: "",
  drone_type: "",
  frame_size: "",
  payload_weight: "",
  estimated_flight_time: 20,
  motor_class: "",
  battery: "",
  confidence_score: 70,
  engineer_notes: "",
  approval_status: "pending"
};
function AddDesignModal({
  onClose,
  onAdd
}) {
  const [form, setForm] = reactExports.useState(EMPTY_FORM);
  const [saving, setSaving] = reactExports.useState(false);
  const firstRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    const h = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", h);
    firstRef.current?.focus();
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);
  const set = (k, v) => setForm((f) => ({
    ...f,
    [k]: v
  }));
  const selectVertical = (v) => set("vertical", form.vertical === v.toLowerCase() ? "" : v.toLowerCase());
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || saving) return;
    setSaving(true);
    try {
      await onAdd(form);
    } finally {
      setSaving(false);
    }
  };
  const scoreColor = form.confidence_score >= 80 ? "#4ade80" : form.confidence_score >= 60 ? "#fbbf24" : "#f87171";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-10 px-4", style: {
    background: "rgba(0,0,0,0.65)"
  }, onClick: onClose, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative w-full max-w-2xl rounded-2xl p-8 my-auto", style: {
      background: "#141928",
      border: "0.5px solid rgba(255,255,255,0.12)"
    }, onClick: (e) => e.stopPropagation(), children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: onClose, className: "absolute top-4 right-4 text-white/40 hover:text-white text-xl leading-none", children: "×" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-white text-xl mb-1", style: {
        fontFamily: "'Space Grotesk', sans-serif",
        fontWeight: 600
      }, children: "Add Proven Design" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[13px] text-white/45 mb-6", children: "Submit a validated configuration to the proven designs library." }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: handleSubmit, className: "space-y-5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Design Name", required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { ref: firstRef, type: "text", value: form.name, onChange: (e) => set("name", e.target.value), placeholder: "e.g. AgroScan X4", required: true, className: "mh-input" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Description", children: /* @__PURE__ */ jsxRuntimeExports.jsx("textarea", { value: form.description, onChange: (e) => set("description", e.target.value), rows: 2, placeholder: "Short summary of what this drone is designed for…", className: "mh-input resize-none" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Purpose", children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "text", value: form.purpose, onChange: (e) => set("purpose", e.target.value), placeholder: "e.g. Crop health monitoring & spray routing", className: "mh-input" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Vertical", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-wrap gap-2 pt-1", children: ALL_VERTICALS.map((v) => {
          const active = form.vertical === v.toLowerCase();
          const c = VERTICAL_COLOR[v];
          return /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: () => selectVertical(v), className: "rounded-full px-3 py-1 text-[12px] border transition-all", style: active ? {
            background: c.bg,
            color: c.text,
            borderColor: c.text + "55"
          } : {
            background: "transparent",
            color: "rgba(255,255,255,0.4)",
            borderColor: "rgba(255,255,255,0.12)"
          }, children: v }, v);
        }) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Drone Type", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { value: form.drone_type, onChange: (e) => set("drone_type", e.target.value), className: "mh-input appearance-none pr-8", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Select…" }),
              DRONE_TYPES.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: t }, t))
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { className: "pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Frame Size", children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "text", value: form.frame_size, onChange: (e) => set("frame_size", e.target.value), placeholder: "e.g. 450 mm", className: "mh-input" }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Payload Weight", children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "text", value: form.payload_weight, onChange: (e) => set("payload_weight", e.target.value), placeholder: "e.g. 1.2 kg", className: "mh-input" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Est. Flight Time (min)", children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "number", min: 1, max: 300, value: form.estimated_flight_time, onChange: (e) => set("estimated_flight_time", Number(e.target.value)), className: "mh-input" }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Motor Class", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { value: form.motor_class, onChange: (e) => set("motor_class", e.target.value), className: "mh-input appearance-none pr-8", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Select…" }),
              MOTOR_CLASSES.map((m) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: m }, m))
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { className: "pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Battery", children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "text", value: form.battery, onChange: (e) => set("battery", e.target.value), placeholder: "e.g. 6S 5000 mAh LiPo", className: "mh-input" }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Field, { label: `Confidence Score — ${form.confidence_score}%`, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 pt-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "range", min: 0, max: 100, value: form.confidence_score, onChange: (e) => set("confidence_score", Number(e.target.value)), className: "flex-1 accent-[#378ADD]" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[13px] font-medium shrink-0 w-10 text-right", style: {
              color: scoreColor
            }, children: form.confidence_score })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-2 h-1.5 rounded-full bg-white/[0.08] overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-full rounded-full transition-all", style: {
            width: `${form.confidence_score}%`,
            background: scoreColor
          } }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Engineer Notes", children: /* @__PURE__ */ jsxRuntimeExports.jsx("textarea", { value: form.engineer_notes, onChange: (e) => set("engineer_notes", e.target.value), rows: 3, placeholder: "Deployment conditions, caveats, certifications required…", className: "mh-input resize-none" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Approval Status", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { value: form.approval_status, onChange: (e) => set("approval_status", e.target.value), className: "mh-input appearance-none pr-8", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "pending", children: "Pending" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "approved", children: "Approved" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "rejected", children: "Rejected" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { className: "pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-end gap-3 pt-4 border-t", style: {
          borderColor: "rgba(255,255,255,0.08)"
        }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: onClose, disabled: saving, className: "rounded-lg border px-5 py-2 text-[13px] text-white/60 hover:text-white transition-colors disabled:opacity-50", style: {
            borderColor: "rgba(255,255,255,0.12)"
          }, children: "Cancel" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "submit", disabled: saving, className: "rounded-lg px-6 py-2 text-[13px] text-white hover:opacity-90 transition-opacity disabled:opacity-70 inline-flex items-center gap-2", style: {
            background: "#185FA5",
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 500
          }, children: [
            saving && /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "h-3.5 w-3.5 animate-spin" }),
            "Save design"
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("style", { children: `
        .mh-input {
          width: 100%;
          background: rgba(255,255,255,0.04);
          border: 0.5px solid rgba(255,255,255,0.10);
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 13px;
          color: rgba(255,255,255,0.85);
          outline: none;
          transition: border-color 0.15s;
        }
        .mh-input::placeholder { color: rgba(255,255,255,0.25); }
        .mh-input:focus { border-color: rgba(55,138,221,0.50); }
        .mh-input option { background: #141928; }
      ` })
  ] });
}
function ApprovalBadge({
  status
}) {
  const cfg = {
    approved: {
      icon: CircleCheck,
      bg: "rgba(34,197,94,0.12)",
      text: "#4ade80",
      label: "Approved"
    },
    pending: {
      icon: Clock,
      bg: "rgba(245,158,11,0.12)",
      text: "#fbbf24",
      label: "Pending"
    },
    rejected: {
      icon: CircleX,
      bg: "rgba(239,68,68,0.12)",
      text: "#f87171",
      label: "Rejected"
    }
  }[status] ?? {
    icon: Clock,
    bg: "rgba(255,255,255,0.08)",
    text: "rgba(255,255,255,0.4)",
    label: status
  };
  const Icon = cfg.icon;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] shrink-0", style: {
    background: cfg.bg,
    color: cfg.text
  }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: "h-3 w-3" }),
    cfg.label
  ] });
}
function VerticalBadge({
  vertical
}) {
  const c = VERTICAL_COLOR[vertical] ?? {
    bg: "rgba(255,255,255,0.08)",
    text: "rgba(255,255,255,0.5)"
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded-full px-2.5 py-0.5 text-[11px]", style: {
    background: c.bg,
    color: c.text
  }, children: vertical });
}
function SpecPill({
  label,
  value
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg px-3 py-2", style: {
    background: "rgba(255,255,255,0.04)"
  }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10px] uppercase tracking-wide text-white/30", children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[12px] text-white/75 mt-0.5 truncate", children: value })
  ] });
}
function SpecCard({
  label,
  value
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg px-3 py-2", style: {
    background: "rgba(255,255,255,0.04)"
  }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10px] uppercase tracking-wide text-white/30", children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm text-white/80 mt-0.5", children: value })
  ] });
}
function SectionLabel({
  children
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] uppercase tracking-widest text-white/30 font-medium mb-3", children });
}
function Field({
  label,
  required,
  children
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "block text-[11px] uppercase tracking-wider text-white/40 mb-1.5", children: [
      label,
      required && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[#378ADD] ml-0.5", children: "*" })
    ] }),
    children
  ] });
}
export {
  ProvenDesignsPage as component
};
