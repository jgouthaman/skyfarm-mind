import { j as jsxRuntimeExports, r as reactExports } from "../_libs/react.mjs";
import { t as toast } from "../_libs/sonner.mjs";
import { u as useMissionHubAuth } from "./context-BevYt8mH.mjs";
import { s as supabase } from "./client-DYtC4Igq.mjs";
import { f as fetchDesignRules, R as RuleForm, a as RuleDetailModal, u as updateDesignRule, i as insertDesignRule, d as deleteDesignRule } from "./RuleDetailModal-DP4gV-Ty.mjs";
import { _ as Brain } from "../_libs/lucide-react.mjs";
import "../_libs/react-dom.mjs";
import "util";
import "crypto";
import "async_hooks";
import "stream";
import "../_libs/tanstack__react-router.mjs";
import "../_libs/tanstack__router-core.mjs";
import "../_libs/tanstack__history.mjs";
import "../_libs/cookie-es.mjs";
import "../_libs/seroval.mjs";
import "../_libs/seroval-plugins.mjs";
import "node:stream/web";
import "node:stream";
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
import "./constants-DuZL5k1r.mjs";
const VERTICAL_MAP = {
  "AgriSky": "agriculture",
  "InfraSky": "infrastructure",
  "GeoSky": "mapping",
  "GuardSky": "surveillance",
  "TorqWings Labs": "industrial",
  "Academy": null
};
function DesignRulePage() {
  const {
    profile
  } = useMissionHubAuth();
  const isAdmin = profile?.role === "admin" || profile?.role === "super_admin";
  const engineerName = profile?.full_name ?? "Unknown Engineer";
  if (!isAdmin) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-center justify-center py-24 text-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Brain, { className: "h-10 w-10 text-white/20 mb-4", "aria-hidden": "true" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-white/40 text-sm", children: "Access restricted to the engineering team." })
    ] });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(DesignRuleContent, { engineerName, userId: profile.id });
}
function DesignRuleContent({
  engineerName,
  userId
}) {
  const [rules, setRules] = reactExports.useState([]);
  const [loadingRules, setLoading] = reactExports.useState(true);
  const [saving, setSaving] = reactExports.useState(false);
  const [selected, setSelected] = reactExports.useState(null);
  const [editingRule, setEditingRule] = reactExports.useState(null);
  reactExports.useEffect(() => {
    fetchDesignRules().then(setRules).catch((e) => toast.error(e.message)).finally(() => setLoading(false));
  }, []);
  const handleSave = async (form) => {
    setSaving(true);
    try {
      if (editingRule) {
        await updateDesignRule(editingRule.id, form);
        const updated = await fetchDesignRules();
        setRules(updated);
        setEditingRule(null);
        toast.success("Rule updated successfully.");
      } else {
        const saved = await insertDesignRule(form);
        setRules((r) => [saved, ...r]);
        toast.success("Design rule saved to Design Rule.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };
  const handleDelete = async (id) => {
    try {
      await deleteDesignRule(id);
      setRules((r) => r.filter((x) => x.id !== id));
      setSelected(null);
      toast.success("Rule deleted.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed.");
    }
  };
  const handleEdit = (rule) => {
    setEditingRule(rule);
    setSelected(null);
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  };
  const handlePromote = async (rule) => {
    const droneLabel = rule.drone_type ?? "Drone";
    const payloadPart = rule.payload_max_kg != null ? ` Payload up to ${rule.payload_max_kg} kg.` : "";
    const noteParts = [rule.engineer_notes, "Reference: see real-world implementation (link TBD)"].filter(Boolean);
    const {
      error
    } = await supabase.from("reference_designs").insert({
      name: rule.purpose,
      purpose: rule.purpose,
      description: `${droneLabel} for ${rule.purpose}.${payloadPart}`,
      vertical: VERTICAL_MAP[rule.vertical] ?? null,
      drone_type: rule.drone_type ?? null,
      frame_size: rule.frame_size ?? null,
      motor_class: rule.motor_class ?? null,
      battery: rule.battery ?? null,
      estimated_flight_time: rule.flight_time_min ?? null,
      payload_weight: rule.payload_max_kg,
      confidence_score: rule.confidence_level != null ? rule.confidence_level * 20 : 60,
      engineer_notes: noteParts.length > 0 ? noteParts.join("\n") : null,
      approval_status: "pending",
      created_by: userId
    });
    if (error) throw new Error(error.message);
    toast.success("Promoted to Proven Designs (pending review)");
  };
  const stars = (n) => {
    const v = n ?? 0;
    return "★".repeat(v) + "☆".repeat(5 - v);
  };
  const starColor = (n) => (n ?? 0) >= 4 ? "text-emerald-400" : (n ?? 0) >= 3 ? "text-amber-400" : "text-red-400";
  const editInitial = editingRule ? (({
    id: _id,
    created_at: _c,
    updated_at: _u,
    ...rest
  }) => rest)(editingRule) : void 0;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-6xl mx-auto px-4 py-8 space-y-10", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Brain, { className: "h-5 w-5 text-[#378ADD]", "aria-hidden": "true" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-2xl font-semibold text-white", children: "Design Rule — Design Knowledge Capture" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-white/50 mt-1 max-w-2xl", children: "Feed your engineering knowledge here. Each rule teaches the design engine how to recommend drone configurations for specific mission conditions." })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[11px] uppercase tracking-widest text-white/30", children: editingRule ? "EDITING RULE" : "NEW KNOWLEDGE ENTRY" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 h-px bg-white/[0.08]" }),
      editingRule && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: () => setEditingRule(null), className: "text-[12px] text-white/40 hover:text-white/70", children: "Cancel edit" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(RuleForm, { engineerName, userId, initial: editInitial, onSave: handleSave, saving, isEditing: !!editingRule }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 pt-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[11px] uppercase tracking-widest text-white/30", children: [
        "KNOWLEDGE BASE — ",
        rules.length,
        " rule",
        rules.length !== 1 ? "s" : "",
        " stored"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 h-px bg-white/[0.08]" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-[#0d1b2e]/60 border border-white/[0.08] rounded-xl overflow-hidden", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-[2fr_1fr_1fr_1fr_1fr_80px_80px_60px] bg-[#0a0f1c] text-[11px] uppercase text-white/40 px-4 py-3 gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Purpose" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Vertical" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Drone type" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Payload range" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "By" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Conf" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Date" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Active" })
      ] }),
      loadingRules && [0, 1, 2].map((i) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-12 mx-4 my-2 rounded bg-white/5 animate-pulse" }, i)),
      !loadingRules && rules.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "py-16 text-center text-white/30", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Brain, { className: "h-8 w-8 mx-auto mb-3 opacity-40", "aria-hidden": "true" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm", children: "No rules yet." }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[12px] mt-1", children: "Add your first design rule above." })
      ] }),
      !loadingRules && rules.map((rule) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { onDoubleClick: () => setSelected(rule), className: "grid grid-cols-[2fr_1fr_1fr_1fr_1fr_80px_80px_60px] border-t border-white/[0.05] px-4 py-3 gap-3 items-center cursor-pointer hover:bg-white/[0.04] transition-colors", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-white/85 text-sm truncate", children: rule.purpose }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-white/60 text-[12px] truncate", children: rule.vertical }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-white/60 text-[12px]", children: rule.drone_type ?? "—" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-white/60 text-[12px]", children: rule.payload_min_kg !== null || rule.payload_max_kg !== null ? `${rule.payload_min_kg ?? "?"} – ${rule.payload_max_kg ?? "?"} kg` : "Any" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-white/70 text-[12px] truncate", children: rule.engineer_name }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `text-[12px] font-mono ${starColor(rule.confidence_level)}`, children: stars(rule.confidence_level) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-white/40 text-[12px]", children: new Date(rule.created_at).toLocaleDateString("en-IN") }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex items-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `w-2 h-2 rounded-full ${rule.is_active ? "bg-emerald-400" : "bg-white/20"}` }) })
      ] }, rule.id)),
      !loadingRules && rules.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-center py-2 text-[11px] text-white/20 border-t border-white/[0.05]", children: "Double-click any row to view full details" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(RuleDetailModal, { rule: selected, onClose: () => setSelected(null), onEdit: handleEdit, onDelete: handleDelete, onPromote: handlePromote })
  ] });
}
export {
  DesignRulePage as component
};
