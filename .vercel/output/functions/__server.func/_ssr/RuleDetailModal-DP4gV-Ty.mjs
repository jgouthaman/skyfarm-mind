import { s as supabase } from "./client-DYtC4Igq.mjs";
import { r as reactExports, j as jsxRuntimeExports } from "../_libs/react.mjs";
import { V as VERTICALS, P as PURPOSE_OPTIONS, T as TERRAIN_OPTIONS, W as WIND_OPTIONS, A as AUTOMATION_OPTIONS, B as BUDGET_OPTIONS } from "./constants-DuZL5k1r.mjs";
import { t as toast } from "../_libs/sonner.mjs";
import { e as LoaderCircle, $ as CircleArrowUp } from "../_libs/lucide-react.mjs";
async function fetchDesignRules() {
  const { data, error } = await supabase.from("design_rules").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}
async function insertDesignRule(rule) {
  const { data, error } = await supabase.from("design_rules").insert(rule).select().single();
  if (error) throw new Error(error.message);
  return data;
}
async function updateDesignRule(id, patch) {
  const { error } = await supabase.from("design_rules").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}
async function deleteDesignRule(id) {
  const { error } = await supabase.from("design_rules").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
const EMPTY_RULE = {
  engineer_name: "",
  vertical: "AgriSky",
  purpose: "Agriculture spraying",
  drone_type: null,
  confidence_level: 5,
  payload_min_kg: null,
  payload_max_kg: null,
  flight_time_min: null,
  flight_time_max: null,
  terrain_types: null,
  wind_condition: null,
  automation_level: null,
  budget_range: null,
  frame_size: null,
  motor_class: null,
  motor_count: null,
  esc_rating: null,
  propeller_spec: null,
  battery_config: null,
  flight_controller: null,
  gps_type: null,
  payload_system: null,
  risk_level: "Safe",
  twr_min: null,
  cost_min_inr: null,
  cost_max_inr: null,
  engineer_notes: null,
  risk_flags: [],
  is_active: true,
  rule_name: null,
  status: null,
  created_by: null,
  user_type: null
};
const DRONE_TYPE_OPTIONS = [
  "Quadcopter",
  "Hexacopter",
  "Octocopter",
  "Fixed Wing",
  "VTOL",
  "Tricopter"
];
const GPS_OPTIONS = [
  "Single GPS",
  "Dual GPS",
  "Dual GPS + RTK (cm-level)",
  "RTK only",
  "None"
];
const DRONE_TYPE_HINTS = {
  Quadcopter: "Best for light payloads under 3 kg. Simple, cost-effective, easy to maintain.",
  Hexacopter: "Motor redundancy makes it ideal for agri payloads 5–15 kg. Preferred for spraying.",
  Octocopter: "Maximum lift and redundancy. Use for payloads above 15 kg or critical missions.",
  "Fixed Wing": "Long endurance mapping. Not suited for hovering. Best for large area coverage.",
  VTOL: "Combines hover + cruise. High cost, complex setup. Best for long-range survey.",
  Tricopter: "Compact and agile. Limited payload. Good for close-range inspection work."
};
const INP = "w-full h-9 rounded-lg px-3 text-sm text-white bg-white/[0.08] border border-white/[0.12] placeholder-white/30 focus:outline-none focus:border-white/30 transition-colors";
const SEL_CLS = "w-full h-9 rounded-lg px-3 text-sm text-white bg-[#151f35] border border-white/[0.12] focus:outline-none focus:border-white/30 transition-colors appearance-none cursor-pointer";
const LBL = "block text-[12px] text-white/50 mb-1";
const OPT = { backgroundColor: "#151f35", color: "white" };
function Sel({
  value,
  onChange,
  children
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("select", { className: SEL_CLS, value, onChange, style: OPT, children: reactExports.Children.map(
    children,
    (child) => reactExports.isValidElement(child) ? reactExports.cloneElement(child, { style: OPT }) : child
  ) });
}
function F({ label, children }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: LBL, children: label }),
    children
  ] });
}
function RuleForm({ engineerName, userId, initial, onSave, saving, isEditing }) {
  const [form, setForm] = reactExports.useState(initial ?? EMPTY_RULE);
  const [flagInput, setFlagInput] = reactExports.useState("");
  const [error, setError] = reactExports.useState("");
  const patch = (p) => setForm((f) => ({ ...f, ...p }));
  reactExports.useEffect(() => {
    setForm(initial ?? EMPTY_RULE);
  }, [initial]);
  const initials = engineerName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(F, { label: "Rule name", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      "input",
      {
        type: "text",
        className: INP,
        placeholder: "e.g. Heavy-lift agri sprayer — hexacopter",
        value: form.rule_name ?? "",
        onChange: (e) => patch({ rule_name: e.target.value || null })
      }
    ) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-white/5 border border-white/[0.08] rounded-xl px-5 py-3 flex items-center gap-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-[#378ADD]/20 text-[#378ADD] w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0", children: initials }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm text-white font-medium", children: engineerName }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[12px] text-white/40", children: "Submitting as · knowledge auto-attributed to your profile" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ml-auto shrink-0 flex items-end gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(F, { label: "Status", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Sel, { value: form.status ?? "draft", onChange: (e) => patch({ status: e.target.value }), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "draft", children: "Draft" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "active", children: "Active" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "deprecated", children: "Deprecated" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(F, { label: "Your confidence", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Sel, { value: form.confidence_level ?? 5, onChange: (e) => patch({ confidence_level: +e.target.value }), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: 1, children: "1 – Uncertain" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: 2, children: "2 – Low" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: 3, children: "3 – Medium" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: 4, children: "4 – High" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: 5, children: "5 – Expert" })
        ] }) })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-[#0d1729] border border-white/[0.07] rounded-xl p-5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] uppercase tracking-widest text-white/40 font-medium mb-4", children: "BLOCK 1 — What drone type is this rule for?" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 md:grid-cols-3 gap-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(F, { label: "Drone vertical", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          Sel,
          {
            value: form.vertical,
            onChange: (e) => {
              const v = e.target.value;
              patch({
                vertical: v,
                purpose: PURPOSE_OPTIONS[v]?.[0] ?? ""
              });
            },
            children: VERTICALS.map((v) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: v, children: v }, v))
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(F, { label: "Drone purpose", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Sel, { value: form.purpose, onChange: (e) => patch({ purpose: e.target.value }), children: (PURPOSE_OPTIONS[form.vertical] ?? []).map((p) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: p, children: p }, p)) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(F, { label: "User type", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Sel, { value: form.user_type ?? "", onChange: (e) => patch({ user_type: e.target.value || null }), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "All types" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "commercial", children: "Commercial" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "research", children: "Research" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "defence", children: "Defence" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(F, { label: "Drone type", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Sel, { value: form.drone_type ?? "", onChange: (e) => patch({ drone_type: e.target.value || null }), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Select drone type" }),
          DRONE_TYPE_OPTIONS.map((d) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: d, children: d }, d))
        ] }) }),
        form.drone_type && DRONE_TYPE_HINTS[form.drone_type] && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "col-span-full bg-white/5 border border-white/[0.08] rounded-xl p-4 text-[12px] text-white/50 flex items-start gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[#378ADD] mt-0.5", children: "ⓘ" }),
          DRONE_TYPE_HINTS[form.drone_type]
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-[#0b1520] border border-white/[0.07] rounded-xl p-5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] uppercase tracking-widest text-white/40 font-medium mb-4", children: "BLOCK 2 — When does this drone type apply? (mission conditions)" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "col-span-full text-[11px] text-white/25 uppercase tracking-wider", children: "Mission parameters" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(F, { label: "Min payload (kg)", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "number",
            className: INP,
            placeholder: "e.g. 8",
            value: form.payload_min_kg ?? "",
            onChange: (e) => patch({ payload_min_kg: e.target.value ? +e.target.value : null })
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(F, { label: "Max payload (kg)", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "number",
            className: INP,
            placeholder: "e.g. 15",
            value: form.payload_max_kg ?? "",
            onChange: (e) => patch({ payload_max_kg: e.target.value ? +e.target.value : null })
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(F, { label: "Min flight time (min)", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "number",
            className: INP,
            placeholder: "e.g. 20",
            value: form.flight_time_min ?? "",
            onChange: (e) => patch({ flight_time_min: e.target.value ? +e.target.value : null })
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(F, { label: "Max flight time (min)", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "number",
            className: INP,
            placeholder: "e.g. 45",
            value: form.flight_time_max ?? "",
            onChange: (e) => patch({ flight_time_max: e.target.value ? +e.target.value : null })
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "col-span-full text-[11px] text-white/25 uppercase tracking-wider mt-3", children: "Environment" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(F, { label: "Terrain", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Sel, { value: form.terrain_types ?? "", onChange: (e) => patch({ terrain_types: e.target.value || null }), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Any" }),
          TERRAIN_OPTIONS.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: t, children: t }, t))
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(F, { label: "Wind condition", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Sel, { value: form.wind_condition ?? "", onChange: (e) => patch({ wind_condition: e.target.value || null }), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Any" }),
          WIND_OPTIONS.map((w) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: w, children: w }, w))
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "col-span-full text-[11px] text-white/25 uppercase tracking-wider mt-3", children: "Operations" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(F, { label: "Automation level", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Sel, { value: form.automation_level ?? "", onChange: (e) => patch({ automation_level: e.target.value || null }), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Any" }),
          AUTOMATION_OPTIONS.map((a) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: a, children: a }, a))
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(F, { label: "Budget range", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Sel, { value: form.budget_range ?? "", onChange: (e) => patch({ budget_range: e.target.value || null }), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Any" }),
          BUDGET_OPTIONS.map((b) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: b, children: b }, b))
        ] }) })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-[#111c2e] border border-white/[0.07] rounded-xl p-5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] uppercase tracking-widest text-white/40 font-medium mb-4", children: "BLOCK 3 — Recommended components for above conditions" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-4 mb-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "col-span-full text-[11px] text-white/25 uppercase tracking-wider", children: "Structure" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(F, { label: "Frame size", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "text",
            className: INP,
            placeholder: "e.g. 960mm",
            value: form.frame_size ?? "",
            onChange: (e) => patch({ frame_size: e.target.value || null })
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(F, { label: "Motor class", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "text",
            className: INP,
            placeholder: "e.g. Heavy-lift agricultural",
            value: form.motor_class ?? "",
            onChange: (e) => patch({ motor_class: e.target.value || null })
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(F, { label: "Motor count", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Sel, { value: form.motor_count ?? "", onChange: (e) => patch({ motor_count: e.target.value ? +e.target.value : null }), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Select" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: 4, children: "4" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: 6, children: "6" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: 8, children: "8" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: 12, children: "12" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(F, { label: "ESC rating", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "text",
            className: INP,
            placeholder: "e.g. 80A",
            value: form.esc_rating ?? "",
            onChange: (e) => patch({ esc_rating: e.target.value || null })
          }
        ) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-4 mb-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "col-span-full text-[11px] text-white/25 uppercase tracking-wider mt-3", children: "Power & Navigation" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(F, { label: "Propeller size", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "text",
            className: INP,
            placeholder: "e.g. 15 inch",
            value: form.propeller_spec ?? "",
            onChange: (e) => patch({ propeller_spec: e.target.value || null })
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(F, { label: "Battery", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "text",
            className: INP,
            placeholder: "e.g. 12S 22000mAh",
            value: form.battery_config ?? "",
            onChange: (e) => patch({ battery_config: e.target.value || null })
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(F, { label: "Flight controller", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "text",
            className: INP,
            placeholder: "e.g. Pixhawk 6C",
            value: form.flight_controller ?? "",
            onChange: (e) => patch({ flight_controller: e.target.value || null })
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(F, { label: "GPS type", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Sel, { value: form.gps_type ?? "", onChange: (e) => patch({ gps_type: e.target.value || null }), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Select GPS" }),
          GPS_OPTIONS.map((g) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: g, children: g }, g))
        ] }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-4 mb-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "col-span-full text-[11px] text-white/25 uppercase tracking-wider mt-3", children: "Performance" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(F, { label: "Min thrust-to-weight ratio (TWR)", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "number",
            step: "0.1",
            className: INP,
            placeholder: "e.g. 2.0",
            value: form.twr_min ?? "",
            onChange: (e) => patch({ twr_min: e.target.value ? +e.target.value : null })
          }
        ) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "col-span-full text-[11px] text-white/25 uppercase tracking-wider mt-3", children: "Payload & Cost" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(F, { label: "Payload system", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "text",
            className: INP,
            placeholder: "e.g. Pressurised spray tank",
            value: form.payload_system ?? "",
            onChange: (e) => patch({ payload_system: e.target.value || null })
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(F, { label: "Risk level", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Sel, { value: form.risk_level ?? "Safe", onChange: (e) => patch({ risk_level: e.target.value }), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "Safe", children: "Safe" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "Warning", children: "Warning" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "Unsafe", children: "Unsafe" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(F, { label: "Min cost (₹)", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "number",
            className: INP,
            placeholder: "e.g. 150000",
            value: form.cost_min_inr ?? "",
            onChange: (e) => patch({ cost_min_inr: e.target.value ? +e.target.value : null })
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(F, { label: "Max cost (₹)", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "number",
            className: INP,
            placeholder: "e.g. 250000",
            value: form.cost_max_inr ?? "",
            onChange: (e) => patch({ cost_max_inr: e.target.value ? +e.target.value : null })
          }
        ) })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-[#14180f] border border-white/[0.07] rounded-xl p-5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] uppercase tracking-widest text-white/40 font-medium mb-4", children: "Engineering notes & risk flags" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "textarea",
        {
          className: "w-full bg-white/[0.08] border border-white/[0.12] rounded-xl p-3 text-sm text-white placeholder-white/30 resize-none focus:outline-none focus:border-white/30 transition-colors",
          rows: 3,
          placeholder: "Explain why this configuration works for the above conditions. Include trade-offs, cautions, or field observations.",
          value: form.engineer_notes ?? "",
          onChange: (e) => patch({ engineer_notes: e.target.value || null })
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-wrap gap-2 mb-2", children: (form.risk_flags ?? []).map((flag, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "span",
          {
            className: "bg-red-500/15 border border-red-500/30 text-red-300 text-[12px] rounded-full px-3 py-1 inline-flex items-center gap-1.5",
            children: [
              flag,
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  type: "button",
                  onClick: () => patch({ risk_flags: form.risk_flags?.filter((_, j) => j !== i) }),
                  children: "×"
                }
              )
            ]
          },
          i
        )) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            className: INP,
            placeholder: "Type a risk flag and press Enter",
            value: flagInput,
            onChange: (e) => setFlagInput(e.target.value),
            onKeyDown: (e) => {
              if (e.key === "Enter" && flagInput.trim()) {
                e.preventDefault();
                patch({ risk_flags: [...form.risk_flags ?? [], flagInput.trim()] });
                setFlagInput("");
              }
            }
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border-t border-white/[0.08] pt-4 mt-2 flex items-center justify-between gap-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[12px] text-white/40", children: [
        "Saving as: ",
        engineerName,
        " · ",
        form.vertical,
        " · ",
        form.purpose
      ] }),
      error && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-red-400 text-[12px]", children: error }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          disabled: saving,
          onClick: async () => {
            if (!form.drone_type) {
              setError("Please select a drone type before saving.");
              return;
            }
            if (!form.purpose) {
              setError("Please select a purpose before saving.");
              return;
            }
            setError("");
            await onSave({ ...form, engineer_name: engineerName, created_by: userId ?? null });
          },
          className: "bg-[#378ADD] text-white h-10 px-8 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity shrink-0",
          children: saving ? "Saving…" : isEditing ? "Update Rule" : "Save Rule"
        }
      )
    ] })
  ] });
}
function SpecCard({ label, value }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-white/5 rounded-lg px-3 py-2", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10px] text-white/35 uppercase tracking-wide", children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm text-white/85 mt-0.5", children: value })
  ] });
}
function RuleDetailModal({ rule, onClose, onEdit, onDelete, onPromote }) {
  const [promoting, setPromoting] = reactExports.useState(false);
  reactExports.useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);
  if (!rule) return null;
  const handlePromote = async () => {
    if (!onPromote || promoting) return;
    setPromoting(true);
    try {
      await onPromote(rule);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Promote failed.");
    } finally {
      setPromoting(false);
    }
  };
  const confStars = () => {
    const v = rule.confidence_level ?? 0;
    const color = v >= 4 ? "text-emerald-400" : v >= 3 ? "text-amber-400" : "text-red-400";
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: `font-mono ${color}`, children: [
      "★".repeat(v),
      "☆".repeat(5 - v)
    ] });
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      className: "fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center overflow-y-auto py-12 px-4",
      onClick: onClose,
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          className: "bg-[#0d1b2e] border border-white/[0.12] rounded-2xl max-w-3xl w-full p-8 relative",
          onClick: (e) => e.stopPropagation(),
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                className: "absolute top-4 right-4 text-white/40 hover:text-white transition-colors text-xl leading-none",
                onClick: onClose,
                "aria-label": "Close",
                children: "×"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("h2", { className: "text-xl font-semibold text-white", children: [
              rule.engineer_name,
              " — ",
              rule.purpose
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-3 mt-1 flex-wrap text-[12px] text-white/50 items-center", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: rule.vertical }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                "· ",
                confStars()
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                "· ",
                new Date(rule.created_at).toLocaleDateString("en-IN")
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-1", children: [
                "·",
                " ",
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `w-1.5 h-1.5 rounded-full inline-block ${rule.is_active ? "bg-emerald-400" : "bg-white/20"}` }),
                rule.is_active ? "Active" : "Inactive"
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-6", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] uppercase tracking-widest text-white/30 font-medium mb-3", children: "Conditions" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  SpecCard,
                  {
                    label: "Payload range",
                    value: rule.payload_min_kg !== null || rule.payload_max_kg !== null ? `${rule.payload_min_kg ?? "?"} – ${rule.payload_max_kg ?? "?"} kg` : "Any"
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  SpecCard,
                  {
                    label: "Flight time",
                    value: rule.flight_time_min ? `${rule.flight_time_min} min min.` : "Any"
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(SpecCard, { label: "Terrain", value: rule.terrain_types ?? "Any" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(SpecCard, { label: "Wind", value: rule.wind_condition ?? "Any" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(SpecCard, { label: "Automation", value: rule.automation_level ?? "Any" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(SpecCard, { label: "Budget", value: rule.budget_range ?? "Any" })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-6", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] uppercase tracking-widest text-white/30 font-medium mb-3", children: "Recommended Design" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 md:grid-cols-3 gap-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(SpecCard, { label: "Drone type", value: rule.drone_type ?? "—" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(SpecCard, { label: "Frame size", value: rule.frame_size ?? "—" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(SpecCard, { label: "Motor class", value: rule.motor_class ?? "—" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(SpecCard, { label: "ESC rating", value: rule.esc_rating ?? "—" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(SpecCard, { label: "Propeller spec", value: rule.propeller_spec ?? "—" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(SpecCard, { label: "Battery config", value: rule.battery_config ?? "—" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(SpecCard, { label: "Flight controller", value: rule.flight_controller ?? "—" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(SpecCard, { label: "GPS type", value: rule.gps_type ?? "—" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(SpecCard, { label: "Payload system", value: rule.payload_system ?? "—" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-white/5 rounded-lg px-3 py-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10px] text-white/35 uppercase tracking-wide", children: "Risk level" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `text-sm mt-0.5 font-medium ${rule.risk_level === "Safe" ? "text-emerald-400" : rule.risk_level === "Warning" ? "text-amber-400" : "text-red-400"}`, children: rule.risk_level ?? "—" })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  SpecCard,
                  {
                    label: "Cost range",
                    value: rule.cost_min_inr !== null || rule.cost_max_inr !== null ? `₹${(rule.cost_min_inr ?? 0).toLocaleString("en-IN")} – ₹${(rule.cost_max_inr ?? 0).toLocaleString("en-IN")}` : "—"
                  }
                )
              ] })
            ] }),
            rule.engineer_notes && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-6", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] uppercase tracking-widest text-white/30 font-medium mb-3", children: "Engineering Notes" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-white/60 bg-white/5 rounded-xl p-4", children: rule.engineer_notes })
            ] }),
            (rule.risk_flags ?? []).length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-wrap gap-2 mt-3", children: rule.risk_flags.map((f, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(
              "span",
              {
                className: "bg-red-500/15 border border-red-500/30 text-red-300 text-[12px] rounded-full px-3 py-1",
                children: f
              },
              i
            )) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3 mt-8 pt-4 border-t border-white/[0.08]", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  type: "button",
                  onClick: () => {
                    if (confirm("Delete this rule? This cannot be undone.")) {
                      onDelete(rule.id);
                    }
                  },
                  className: "border border-red-500/30 text-red-400 hover:bg-red-500/10 h-9 px-5 rounded-lg text-sm transition-colors",
                  children: "Delete"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 ml-auto", children: [
                onPromote && /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "button",
                  {
                    type: "button",
                    onClick: handlePromote,
                    disabled: promoting,
                    className: "inline-flex items-center gap-2 h-9 px-5 rounded-lg text-sm transition-colors disabled:opacity-50",
                    style: {
                      background: "rgba(20,184,166,0.12)",
                      color: "#2dd4bf",
                      border: "0.5px solid rgba(20,184,166,0.3)"
                    },
                    children: [
                      promoting ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "h-3.5 w-3.5 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(CircleArrowUp, { className: "h-3.5 w-3.5" }),
                      "Promote to Proven Design"
                    ]
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    type: "button",
                    onClick: () => onEdit(rule),
                    className: "bg-[#378ADD] text-white h-9 px-6 rounded-lg text-sm hover:opacity-90 transition-opacity",
                    children: "Edit"
                  }
                )
              ] })
            ] })
          ]
        }
      )
    }
  );
}
export {
  RuleForm as R,
  RuleDetailModal as a,
  deleteDesignRule as d,
  fetchDesignRules as f,
  insertDesignRule as i,
  updateDesignRule as u
};
