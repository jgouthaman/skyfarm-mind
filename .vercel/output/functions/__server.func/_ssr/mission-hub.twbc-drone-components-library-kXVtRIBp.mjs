import { r as reactExports, j as jsxRuntimeExports } from "../_libs/react.mjs";
import { M as MissionHubShell } from "./Shell-BRA8Q4Nz.mjs";
import { s as supabase } from "./client-DYtC4Igq.mjs";
import { u as useMissionHubAuth } from "./context-BevYt8mH.mjs";
import "../_libs/sonner.mjs";
import { a0 as Package, Y as Plus, Q as Search, X } from "../_libs/lucide-react.mjs";
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
import "../_libs/supabase__supabase-js.mjs";
import "../_libs/supabase__postgrest-js.mjs";
import "../_libs/supabase__realtime-js.mjs";
import "../_libs/supabase__phoenix.mjs";
import "../_libs/supabase__storage-js.mjs";
import "../_libs/iceberg-js.mjs";
import "../_libs/supabase__auth-js.mjs";
import "tslib";
import "../_libs/supabase__functions-js.mjs";
const DARK_VARS = {
  "--foreground": "oklch(0.95 0.01 250)",
  "--muted-foreground": "oklch(0.58 0.04 250)",
  "--border": "oklch(0.95 0.01 250 / 15%)",
  "--card": "oklch(0.14 0.04 250)"
};
const CATEGORY_CONFIG = {
  frame: {
    label: "Frame",
    color: "bg-blue-500/20 text-blue-300 border-blue-500/30"
  },
  motor: {
    label: "Motor",
    color: "bg-green-500/20 text-green-300 border-green-500/30"
  },
  esc: {
    label: "ESC",
    color: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30"
  },
  battery: {
    label: "Battery",
    color: "bg-orange-500/20 text-orange-300 border-orange-500/30"
  },
  propeller: {
    label: "Propeller",
    color: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30"
  },
  flight_controller: {
    label: "Flight Controller",
    color: "bg-purple-500/20 text-purple-300 border-purple-500/30"
  },
  gps: {
    label: "GPS",
    color: "bg-teal-500/20 text-teal-300 border-teal-500/30"
  },
  payload: {
    label: "Payload",
    color: "bg-pink-500/20 text-pink-300 border-pink-500/30"
  },
  accessory: {
    label: "Accessory",
    color: "bg-slate-500/20 text-slate-300 border-slate-500/30"
  }
};
const SKIP_SPEC_KEYS = /* @__PURE__ */ new Set(["notes", "compatible_motors", "compatible_liquids"]);
function formatSpecKey(key) {
  return key.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}
function SpecRow({
  label,
  value
}) {
  const display = typeof value === "object" ? JSON.stringify(value) : String(value);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between gap-2 text-[11px]", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-white/35", children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-white/65 text-right", children: display })
  ] });
}
function CategoryBadge({
  category
}) {
  const cfg = CATEGORY_CONFIG[category] ?? {
    label: category,
    color: "bg-white/10 text-white/50 border-white/10"
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `inline-block text-[10px] font-medium px-2 py-0.5 rounded-full border ${cfg.color}`, children: cfg.label });
}
function ComponentCard({
  component
}) {
  const specEntries = Object.entries(component.specs ?? {}).filter(([k]) => !SKIP_SPEC_KEYS.has(k)).slice(0, 3);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-white/[0.08] bg-[#0d1b2e]/70 p-5 flex flex-col gap-3 hover:border-white/[0.15] transition-colors", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(CategoryBadge, { category: component.category }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: `flex items-center gap-1.5 text-[11px] ${component.in_stock ? "text-emerald-400" : "text-red-400"}`, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `w-1.5 h-1.5 rounded-full ${component.in_stock ? "bg-emerald-400" : "bg-red-400"}` }),
        component.in_stock ? "In stock" : "Out of stock"
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-white font-semibold text-sm leading-snug", children: component.name }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-white/40 text-[11px] mt-0.5", children: [
        component.manufacturer,
        component.part_number && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "ml-1.5 text-white/25", children: [
          "· ",
          component.part_number
        ] })
      ] })
    ] }),
    specEntries.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-1.5 border-t border-white/[0.06] pt-3", children: specEntries.map(([k, v]) => /* @__PURE__ */ jsxRuntimeExports.jsx(SpecRow, { label: formatSpecKey(k), value: v }, k)) }),
    (component.compatible_verticals ?? []).length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap gap-1", children: [
      component.compatible_verticals.slice(0, 3).map((v) => /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] px-1.5 py-0.5 rounded bg-[#378ADD]/10 text-[#378ADD] border border-[#378ADD]/20", children: v }, v)),
      component.compatible_verticals.length > 3 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[10px] text-white/25", children: [
        "+",
        component.compatible_verticals.length - 3
      ] })
    ] }),
    (component.tags ?? []).length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-wrap gap-1", children: component.tags.slice(0, 3).map((t) => /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] px-1.5 py-0.5 rounded bg-white/[0.06] text-white/40", children: t }, t)) })
  ] });
}
const EMPTY_FORM = {
  name: "",
  manufacturer: "",
  part_number: "",
  category: "frame",
  status: "active",
  compatible_verticals: "",
  tags: "",
  specs: "",
  in_stock: true
};
function AddComponentModal({
  onClose,
  onAdded
}) {
  const [form, setForm] = reactExports.useState({
    ...EMPTY_FORM
  });
  const [saving, setSaving] = reactExports.useState(false);
  const [error, setError] = reactExports.useState(null);
  reactExports.useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const set = (k, v) => setForm((f) => ({
    ...f,
    [k]: v
  }));
  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    let specs = null;
    if (form.specs.trim()) {
      try {
        specs = JSON.parse(form.specs);
      } catch {
        setError('Specs must be valid JSON — e.g. {"kv_rating": 320}');
        return;
      }
    }
    const payload = {
      name: form.name.trim(),
      manufacturer: form.manufacturer.trim(),
      part_number: form.part_number.trim() || null,
      category: form.category,
      status: form.status,
      compatible_verticals: form.compatible_verticals.trim() ? form.compatible_verticals.split(",").map((s) => s.trim()).filter(Boolean) : null,
      tags: form.tags.trim() ? form.tags.split(",").map((s) => s.trim()).filter(Boolean) : null,
      specs,
      in_stock: form.in_stock
    };
    setSaving(true);
    try {
      const {
        error: dbErr
      } = await supabase.from("drone_components").insert(payload);
      if (dbErr) throw new Error(dbErr.message);
      onAdded();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Insert failed");
    } finally {
      setSaving(false);
    }
  }
  const inputCls = "w-full bg-[#0a0f1c] text-white placeholder:text-white/30 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#378ADD]/50 transition-colors";
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4 overflow-y-auto", onClick: onClose, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative w-full max-w-lg bg-[#141928] border border-white/10 rounded-2xl p-7 my-8", onClick: (e) => e.stopPropagation(), children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: onClose, className: "absolute right-4 top-4 text-white/40 hover:text-white", children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "h-5 w-5" }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-white font-semibold text-lg mb-5", children: "Add Component" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-[11px] uppercase tracking-wider text-white/40 mb-1", children: "Name *" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { required: true, className: inputCls, value: form.name, onChange: (e) => set("name", e.target.value), placeholder: "e.g. T-Motor MN5008" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-[11px] uppercase tracking-wider text-white/40 mb-1", children: "Manufacturer *" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { required: true, className: inputCls, value: form.manufacturer, onChange: (e) => set("manufacturer", e.target.value), placeholder: "e.g. T-Motor" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-[11px] uppercase tracking-wider text-white/40 mb-1", children: "Part Number" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: inputCls, value: form.part_number, onChange: (e) => set("part_number", e.target.value), placeholder: "e.g. MN5008-KV340" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-[11px] uppercase tracking-wider text-white/40 mb-1", children: "Category *" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("select", { required: true, className: inputCls, value: form.category, onChange: (e) => set("category", e.target.value), children: Object.entries(CATEGORY_CONFIG).map(([k, v]) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: k, children: v.label }, k)) })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-[11px] uppercase tracking-wider text-white/40 mb-1", children: "Status" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { className: inputCls, value: form.status, onChange: (e) => set("status", e.target.value), children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "active", children: "Active" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "discontinued", children: "Discontinued" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "under_review", children: "Under Review" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-end pb-1", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-center gap-2 cursor-pointer", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", checked: form.in_stock, onChange: (e) => set("in_stock", e.target.checked), className: "w-4 h-4 rounded border-white/20 accent-[#378ADD]" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm text-white/70", children: "In stock" })
        ] }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-[11px] uppercase tracking-wider text-white/40 mb-1", children: "Compatible Verticals" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: inputCls, value: form.compatible_verticals, onChange: (e) => set("compatible_verticals", e.target.value), placeholder: "AgriSky, InfraSky (comma-separated)" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-[11px] uppercase tracking-wider text-white/40 mb-1", children: "Tags" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: inputCls, value: form.tags, onChange: (e) => set("tags", e.target.value), placeholder: "heavy-lift, waterproof (comma-separated)" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "block text-[11px] uppercase tracking-wider text-white/40 mb-1", children: [
          "Specs ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "normal-case text-white/25 tracking-normal ml-1", children: "(valid JSON)" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("textarea", { rows: 3, className: inputCls, value: form.specs, onChange: (e) => set("specs", e.target.value), placeholder: '{"kv_rating": 320, "max_thrust_kg": 4.2}' })
      ] }),
      error && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-red-400 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2", children: error }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-3 pt-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: onClose, className: "flex-1 h-10 rounded-lg border border-white/10 text-white/60 hover:text-white text-sm transition-colors", children: "Cancel" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "submit", disabled: saving, className: "flex-1 h-10 rounded-lg text-sm font-medium text-white disabled:opacity-50 transition-opacity", style: {
          background: "#378ADD"
        }, children: saving ? "Saving…" : "Add Component" })
      ] })
    ] })
  ] }) });
}
function ComponentsLibraryPage() {
  const {
    profile
  } = useMissionHubAuth();
  const isAdmin = profile?.role === "admin" || profile?.role === "super_admin";
  const [components, setComponents] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(true);
  const [search, setSearch] = reactExports.useState("");
  const [activeCategory, setActiveCategory] = reactExports.useState(null);
  const [showAdd, setShowAdd] = reactExports.useState(false);
  async function load() {
    setLoading(true);
    const {
      data
    } = await supabase.from("drone_components").select("*").order("category").order("name");
    setComponents(data ?? []);
    setLoading(false);
  }
  reactExports.useEffect(() => {
    load();
  }, []);
  const categories = Array.from(new Set(components.map((c) => c.category))).sort();
  const filtered = components.filter((c) => {
    const matchesSearch = !search.trim() || c.name.toLowerCase().includes(search.toLowerCase()) || c.manufacturer.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !activeCategory || c.category === activeCategory;
    return matchesSearch && matchesCategory;
  });
  const inStockCount = components.filter((c) => c.in_stock).length;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(MissionHubShell, { title: "Components Library", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: DARK_VARS, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between gap-4 mb-7", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 mb-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Package, { className: "h-5 w-5 text-[#378ADD]" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-2xl font-semibold text-white", children: "Component Library" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm text-white/50", children: [
          "Drone component repository — ",
          components.length,
          " component",
          components.length !== 1 ? "s" : "",
          " across ",
          categories.length,
          " categor",
          categories.length !== 1 ? "ies" : "y"
        ] })
      ] }),
      isAdmin && /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => setShowAdd(true), className: "flex items-center gap-2 h-9 px-4 rounded-lg text-sm font-medium text-white shrink-0", style: {
        background: "#378ADD"
      }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "h-4 w-4" }),
        "Add Component"
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-3 gap-4 mb-7", children: [{
      label: "Total Components",
      value: components.length
    }, {
      label: "In Stock",
      value: inStockCount
    }, {
      label: "Categories",
      value: categories.length
    }].map((s) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-white/[0.08] bg-[#0d1b2e]/60 px-5 py-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-2xl font-semibold text-white", children: s.value }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[12px] text-white/45 mt-0.5", children: s.label })
    ] }, s.label)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col sm:flex-row gap-3 mb-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative flex-1 max-w-xs", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: search, onChange: (e) => setSearch(e.target.value), placeholder: "Search by name or manufacturer…", className: "w-full bg-[#0d1b2e]/80 border border-white/[0.08] rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#378ADD]/40 transition-colors" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setActiveCategory(null), className: `px-3 py-1.5 rounded-lg text-[12px] transition-colors border ${activeCategory === null ? "bg-[#378ADD]/20 border-[#378ADD]/40 text-[#378ADD]" : "border-white/[0.08] text-white/50 hover:text-white hover:border-white/20"}`, children: "All Categories" }),
        categories.map((cat) => /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setActiveCategory(cat === activeCategory ? null : cat), className: `px-3 py-1.5 rounded-lg text-[12px] transition-colors border ${activeCategory === cat ? "bg-[#378ADD]/20 border-[#378ADD]/40 text-[#378ADD]" : "border-white/[0.08] text-white/50 hover:text-white hover:border-white/20"}`, children: CATEGORY_CONFIG[cat]?.label ?? cat }, cat))
      ] })
    ] }),
    loading && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4", children: [0, 1, 2, 3, 4, 5].map((i) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-44 rounded-xl bg-white/[0.04] animate-pulse" }, i)) }),
    !loading && filtered.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "py-20 text-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Package, { className: "h-10 w-10 mx-auto text-white/15 mb-4" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-white/40 text-sm", children: "No components found for this filter" }),
      (search || activeCategory) && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => {
        setSearch("");
        setActiveCategory(null);
      }, className: "mt-3 text-[12px] text-[#378ADD] hover:underline", children: "Clear filters" })
    ] }),
    !loading && filtered.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4", children: filtered.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx(ComponentCard, { component: c }, c.id)) }),
    showAdd && /* @__PURE__ */ jsxRuntimeExports.jsx(AddComponentModal, { onClose: () => setShowAdd(false), onAdded: load })
  ] }) });
}
export {
  ComponentsLibraryPage as component
};
