import { r as reactExports, j as jsxRuntimeExports } from "../_libs/react.mjs";
import { d as useNavigate } from "../_libs/tanstack__react-router.mjs";
import { t as toast } from "../_libs/sonner.mjs";
import { s as supabase } from "./client-DYtC4Igq.mjs";
import { u as useMissionHubAuth } from "./context-BevYt8mH.mjs";
import { b as buildInsertPayload, c as createProject } from "./project-service-weIoT5zz.mjs";
import { V as VERTICALS, P as PURPOSE_OPTIONS, U as USER_TYPES, a as AREA_UNIT_OPTIONS, T as TERRAIN_OPTIONS, W as WIND_OPTIONS, B as BUDGET_OPTIONS, A as AUTOMATION_OPTIONS, L as LIQUID_DENSITY_OPTIONS, S as SPRAYING_MODE_OPTIONS } from "./constants-DuZL5k1r.mjs";
import { as as Bookmark, e as LoaderCircle } from "../_libs/lucide-react.mjs";
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
const INITIAL_FORM = {
  projectName: "",
  vertical: "AgriSky",
  purpose: "Agriculture spraying",
  userType: "Farmer",
  payloadWeight: "",
  requiredFlightTime: "",
  missionArea: "",
  areaUnit: "acres",
  altitude: "",
  terrain: "Flat farm",
  windCondition: "Medium",
  budgetRange: "Balanced",
  automationLevel: "Semi-autonomous",
  tankCapacity: "",
  sprayWidth: "",
  cropType: "",
  farmSize: "",
  liquidDensity: "Normal",
  sprayingMode: "route-based",
  returnToHome: true,
  gpsHold: true,
  obstacleAvoidance: false,
  geofencing: true,
  lowBatteryFailsafe: true,
  parachute: false,
  flightLogging: true
};
function WizardProgress({ step, total, projectName, vertical, purpose }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    step > 1 && projectName && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm text-white/60 mb-3 truncate", children: [
      projectName,
      " · ",
      vertical,
      " · ",
      purpose
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex gap-1.5", children: Array.from({ length: total }, (_, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        className: `h-1 flex-1 rounded-full transition-all ${i < step ? "bg-[#378ADD]" : "bg-white/20"}`
      },
      i
    )) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-white/40 mt-2", children: [
      "Step ",
      step,
      " of ",
      total
    ] })
  ] });
}
function WizardInput({
  label,
  ...props
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-[13px] text-white/70 mb-1.5", children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "input",
      {
        className: "w-full h-11 rounded-[10px] px-3 text-sm text-white\r\n          placeholder-white/40 bg-white/10 border border-white/15\r\n          focus:outline-none focus:border-white/40 transition-colors",
        ...props
      }
    )
  ] });
}
function WizardSelect({
  label,
  options,
  ...props
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-[13px] text-white/70 mb-1.5", children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "select",
      {
        className: "w-full h-11 rounded-[10px] px-3 text-sm text-white\r\n          bg-white/10 border border-white/15 focus:outline-none\r\n          focus:border-white/40 appearance-none transition-colors",
        ...props,
        children: options.map((o) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: o, className: "bg-[#1e2d45] text-white", children: o }, o))
      }
    )
  ] });
}
function WizardToggle({
  label,
  checked,
  onChange
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "label",
    {
      className: "flex items-center justify-between rounded-xl\r\n        border border-white/10 px-4 py-3 cursor-pointer\r\n        hover:bg-white/5 transition-colors",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm text-white/80", children: label }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "checkbox",
            className: "sr-only",
            checked,
            onChange: (e) => onChange(e.target.checked)
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            className: `relative w-10 h-6 rounded-full transition-colors flex-shrink-0
          ${checked ? "bg-[#378ADD]" : "bg-white/20"}`,
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              "div",
              {
                className: `absolute top-1 w-4 h-4 rounded-full bg-white shadow
            transition-transform ${checked ? "translate-x-5" : "translate-x-1"}`
              }
            )
          }
        )
      ]
    }
  );
}
function StepScope({ form, onChange, onNext }) {
  const [error, setError] = reactExports.useState("");
  function handleNext() {
    if (!form.projectName.trim()) {
      setError("Project name is required");
      return;
    }
    setError("");
    onNext();
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-2xl font-semibold text-white mb-1", children: "Create Drone Design Project" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-white/60 mb-6", children: "Define the project scope. You'll capture mission requirements next." }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: "rounded-2xl border p-8 space-y-5 backdrop-blur-sm",
        style: { background: "rgba(255,255,255,0.12)", borderColor: "rgba(255,255,255,0.15)" },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              WizardInput,
              {
                label: "Project name",
                value: form.projectName,
                placeholder: "e.g. AgriSky 10L Spraying Drone",
                onChange: (e) => {
                  onChange({ projectName: e.target.value });
                  setError("");
                }
              }
            ),
            error && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-red-400 text-xs mt-1.5", children: error })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            WizardSelect,
            {
              label: "Drone vertical",
              options: VERTICALS,
              value: form.vertical,
              onChange: (e) => onChange({
                vertical: e.target.value,
                purpose: PURPOSE_OPTIONS[e.target.value][0]
              })
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            WizardSelect,
            {
              label: "Drone purpose",
              options: PURPOSE_OPTIONS[form.vertical] ?? [],
              value: form.purpose,
              onChange: (e) => onChange({ purpose: e.target.value })
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            WizardSelect,
            {
              label: "User type",
              options: USER_TYPES,
              value: form.userType,
              onChange: (e) => onChange({ userType: e.target.value })
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: handleNext,
              className: "w-full h-11 rounded-[10px] text-sm font-medium text-white\r\n            hover:opacity-90 transition-opacity",
              style: { background: "#378ADD" },
              children: "Continue to Requirements"
            }
          )
        ]
      }
    )
  ] });
}
function StepMission({ form, onChange, onNext, onBack }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: "rounded-2xl border p-8 space-y-6 backdrop-blur-sm",
      style: { background: "rgba(255,255,255,0.12)", borderColor: "rgba(255,255,255,0.15)" },
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-base font-semibold text-white mb-5", children: "Mission Requirement" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid md:grid-cols-2 gap-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            WizardInput,
            {
              label: "Payload weight (kg)",
              type: "number",
              min: 0,
              value: form.payloadWeight,
              placeholder: "e.g. 10",
              onChange: (e) => onChange({ payloadWeight: e.target.value })
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            WizardInput,
            {
              label: "Required flight time (min)",
              type: "number",
              min: 0,
              value: form.requiredFlightTime,
              placeholder: "e.g. 20",
              onChange: (e) => onChange({ requiredFlightTime: e.target.value })
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            WizardInput,
            {
              label: "Mission area",
              type: "number",
              min: 0,
              value: form.missionArea,
              placeholder: "e.g. 25",
              onChange: (e) => onChange({ missionArea: e.target.value })
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            WizardSelect,
            {
              label: "Area unit",
              options: AREA_UNIT_OPTIONS,
              value: form.areaUnit,
              onChange: (e) => onChange({ areaUnit: e.target.value })
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            WizardInput,
            {
              label: "Altitude (m)",
              type: "number",
              min: 0,
              value: form.altitude,
              placeholder: "e.g. 30",
              onChange: (e) => onChange({ altitude: e.target.value })
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            WizardSelect,
            {
              label: "Terrain",
              options: TERRAIN_OPTIONS,
              value: form.terrain,
              onChange: (e) => onChange({ terrain: e.target.value })
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            WizardSelect,
            {
              label: "Wind condition",
              options: WIND_OPTIONS,
              value: form.windCondition,
              onChange: (e) => onChange({ windCondition: e.target.value })
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            WizardSelect,
            {
              label: "Budget range",
              options: BUDGET_OPTIONS,
              value: form.budgetRange,
              onChange: (e) => onChange({ budgetRange: e.target.value })
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          WizardSelect,
          {
            label: "Automation level",
            options: AUTOMATION_OPTIONS,
            value: form.automationLevel,
            onChange: (e) => onChange({ automationLevel: e.target.value })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between pt-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: onBack,
              className: "px-5 h-11 rounded-[10px] text-sm text-white/70\r\n            border border-white/20 bg-transparent hover:bg-white/5 transition-colors",
              children: "Back"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: onNext,
              className: "px-5 h-11 rounded-[10px] text-sm font-medium text-white\r\n            hover:opacity-90 transition-opacity",
              style: { background: "#378ADD" },
              children: "Next"
            }
          )
        ] })
      ]
    }
  );
}
function StepPayload({ form, onChange, onNext, onBack }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: "rounded-2xl border p-8 space-y-6 backdrop-blur-sm",
      style: { background: "rgba(255,255,255,0.12)", borderColor: "rgba(255,255,255,0.15)" },
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-base font-semibold text-white mb-5", children: "Payload Details" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid md:grid-cols-2 gap-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            WizardInput,
            {
              label: "Tank capacity (L)",
              type: "number",
              min: 0,
              value: form.tankCapacity,
              placeholder: "e.g. 10",
              onChange: (e) => onChange({ tankCapacity: e.target.value })
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            WizardInput,
            {
              label: "Spray width (m)",
              type: "number",
              min: 0,
              value: form.sprayWidth,
              placeholder: "e.g. 4",
              onChange: (e) => onChange({ sprayWidth: e.target.value })
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            WizardInput,
            {
              label: "Crop type",
              value: form.cropType,
              placeholder: "e.g. Cotton",
              onChange: (e) => onChange({ cropType: e.target.value })
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            WizardInput,
            {
              label: "Farm size (acres)",
              type: "number",
              min: 0,
              value: form.farmSize,
              placeholder: "e.g. 25",
              onChange: (e) => onChange({ farmSize: e.target.value })
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            WizardSelect,
            {
              label: "Liquid density",
              options: LIQUID_DENSITY_OPTIONS,
              value: form.liquidDensity,
              onChange: (e) => onChange({ liquidDensity: e.target.value })
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            WizardSelect,
            {
              label: "Spraying mode",
              options: SPRAYING_MODE_OPTIONS,
              value: form.sprayingMode,
              onChange: (e) => onChange({ sprayingMode: e.target.value })
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between pt-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: onBack,
              className: "px-5 h-11 rounded-[10px] text-sm text-white/70\r\n            border border-white/20 bg-transparent hover:bg-white/5 transition-colors",
              children: "Back"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: onNext,
              className: "px-5 h-11 rounded-[10px] text-sm font-medium text-white\r\n            hover:opacity-90 transition-opacity",
              style: { background: "#378ADD" },
              children: "Next"
            }
          )
        ] })
      ]
    }
  );
}
function StepSafety({ form, onChange, onNext, onBack }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: "rounded-2xl border p-8 space-y-6 backdrop-blur-sm",
      style: { background: "rgba(255,255,255,0.12)", borderColor: "rgba(255,255,255,0.15)" },
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-base font-semibold text-white mb-5", children: "Safety Requirements" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid md:grid-cols-2 gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              WizardToggle,
              {
                label: "Return to home",
                checked: form.returnToHome,
                onChange: (v) => onChange({ returnToHome: v })
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              WizardToggle,
              {
                label: "Obstacle avoidance",
                checked: form.obstacleAvoidance,
                onChange: (v) => onChange({ obstacleAvoidance: v })
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              WizardToggle,
              {
                label: "Low battery failsafe",
                checked: form.lowBatteryFailsafe,
                onChange: (v) => onChange({ lowBatteryFailsafe: v })
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              WizardToggle,
              {
                label: "Flight logging",
                checked: form.flightLogging,
                onChange: (v) => onChange({ flightLogging: v })
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              WizardToggle,
              {
                label: "GPS hold",
                checked: form.gpsHold,
                onChange: (v) => onChange({ gpsHold: v })
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              WizardToggle,
              {
                label: "Geofencing",
                checked: form.geofencing,
                onChange: (v) => onChange({ geofencing: v })
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              WizardToggle,
              {
                label: "Parachute",
                checked: form.parachute,
                onChange: (v) => onChange({ parachute: v })
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between pt-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: onBack,
              className: "px-5 h-11 rounded-[10px] text-sm text-white/70\r\n            border border-white/20 bg-transparent hover:bg-white/5 transition-colors",
              children: "Back"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: onNext,
              className: "px-5 h-11 rounded-[10px] text-sm font-medium text-white\r\n            hover:opacity-90 transition-opacity",
              style: { background: "#378ADD" },
              children: "Next"
            }
          )
        ] })
      ]
    }
  );
}
function StepReview({ form, onBack, onSubmit, saving }) {
  const review = {
    payloadWeight: form.payloadWeight,
    requiredFlightTime: form.requiredFlightTime,
    missionArea: form.missionArea,
    areaUnit: form.areaUnit,
    altitude: form.altitude,
    terrain: form.terrain,
    windCondition: form.windCondition,
    budgetRange: form.budgetRange,
    automationLevel: form.automationLevel,
    payloadDetails: {
      tankCapacity: form.tankCapacity,
      sprayWidth: form.sprayWidth,
      cropType: form.cropType,
      farmSize: form.farmSize,
      liquidDensity: form.liquidDensity,
      sprayingMode: form.sprayingMode
    },
    safetyRequirements: {
      returnToHome: form.returnToHome,
      gpsHold: form.gpsHold,
      obstacleAvoidance: form.obstacleAvoidance,
      geofencing: form.geofencing,
      lowBatteryFailsafe: form.lowBatteryFailsafe,
      parachute: form.parachute,
      flightLogging: form.flightLogging
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: "rounded-2xl border p-8 space-y-6 backdrop-blur-sm",
      style: { background: "rgba(255,255,255,0.12)", borderColor: "rgba(255,255,255,0.15)" },
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-base font-semibold text-white mb-5", children: "Review Inputs" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "pre",
          {
            className: "bg-black/30 rounded-xl p-5 text-[12px] font-mono\r\n          text-green-400 overflow-auto max-h-[400px]",
            children: JSON.stringify(review, null, 2)
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between pt-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: onBack,
              disabled: saving,
              className: "px-5 h-11 rounded-[10px] text-sm text-white/70\r\n            border border-white/20 bg-transparent hover:bg-white/5\r\n            disabled:opacity-40 transition-colors",
              children: "Back"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: onSubmit,
              disabled: saving,
              className: "px-6 h-11 rounded-[10px] text-sm font-medium text-white\r\n            hover:opacity-90 disabled:opacity-60 transition-opacity",
              style: { background: "#22c55e" },
              children: saving ? "Saving…" : "Generate Drone Design"
            }
          )
        ] })
      ]
    }
  );
}
const COMP_KEYS = ["frame", "motors", "esc", "battery", "flight_controller", "gps", "payload", "propellers"];
function Stars({ n }) {
  const color = n >= 4 ? "text-emerald-400" : n >= 3 ? "text-amber-400" : "text-red-400";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: `font-mono text-[13px] ${color}`, children: [
    "★".repeat(n),
    "☆".repeat(5 - n)
  ] });
}
function RiskBadge({ level }) {
  if (!level) return null;
  const cls = level === "Safe" ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400" : level === "Warning" ? "bg-amber-500/15 border-amber-500/30 text-amber-400" : "bg-red-500/15 border-red-500/30 text-red-400";
  return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `text-[11px] px-2 py-0.5 rounded-full border ${cls}`, children: level });
}
function Spec({ label, value }) {
  if (!value) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-white/35", children: [
      label,
      ": "
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-white/75", children: value })
  ] });
}
const BANNER = {
  high: { bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.3)", color: "#34d399", label: "High confidence match" },
  medium: { bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.3)", color: "#fbbf24", label: "Partial match — review recommended" },
  low: { bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.3)", color: "#f87171", label: "No direct match — engineer review required" }
};
function StepRecommendation({ result, onAccept, onBack, isLoading }) {
  const [selected, setSelected] = reactExports.useState(() => {
    if (!result) return null;
    if (!result.matched_rule) return "reference";
    if (!result.matched_reference) return "rule";
    return result.rule_confidence_score >= result.reference_score ? "rule" : "reference";
  });
  if (isLoading || !result) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: "rounded-2xl border p-8 flex flex-col items-center justify-center gap-4 min-h-[280px]",
        style: { background: "rgba(255,255,255,0.12)", borderColor: "rgba(255,255,255,0.15)" },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "h-8 w-8 animate-spin", style: { color: "#378ADD" } }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-white font-medium", children: "Analysing your requirements..." }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-white/50 mt-1", children: "Matching design rules and proven designs" })
          ] })
        ]
      }
    );
  }
  const { matched_rule: rule, matched_reference: ref, confidence, summary } = result;
  const banner = BANNER[confidence];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: "rounded-xl p-4",
        style: { background: banner.bg, border: `0.5px solid ${banner.border}` },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-semibold mb-1", style: { color: banner.color }, children: banner.label }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-white/60", children: summary })
        ]
      }
    ),
    result.is_fallback && result.fallback_reason && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 flex items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { className: "mt-0.5 h-4 w-4 shrink-0 text-amber-400", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-medium text-amber-400", children: "Nearest rule used — not an exact match" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-0.5 text-xs text-amber-300/70", children: result.fallback_reason })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-white/40", children: "Select the recommendation to use as your design base" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          className: [
            "relative rounded-xl border p-5 space-y-3 transition-all",
            rule ? selected === "rule" ? "border-blue-500 bg-blue-500/5 ring-1 ring-blue-500/30 cursor-pointer" : "border-white/10 opacity-60 cursor-pointer" : "border-white/10 opacity-40"
          ].join(" "),
          onClick: rule ? () => setSelected("rule") : void 0,
          children: [
            selected === "rule" && rule && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute top-3 right-3 flex items-center gap-1.5 rounded-full bg-blue-500 px-2 py-0.5 text-[10px] font-medium text-white", children: "✓ Selected" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] uppercase tracking-widest text-white/30 font-medium", children: "Matched Rule" }),
            rule ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-white font-semibold text-base leading-snug", children: rule.rule_name ?? rule.drone_type }),
              result.is_fallback && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "inline-block rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-400", children: "Nearest match" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12px]", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Spec, { label: "Drone type", value: rule.drone_type }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Spec, { label: "Frame size", value: rule.frame_size }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Spec, { label: "Motor class", value: rule.motor_class }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Spec, { label: "Motor count", value: rule.motor_count != null ? String(rule.motor_count) : null }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Spec, { label: "Battery", value: rule.battery_config }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Spec, { label: "ESC rating", value: rule.esc_rating }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Spec, { label: "Propeller", value: rule.propeller_spec }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Spec, { label: "Flight ctrl", value: rule.flight_controller }),
                rule.twr_min != null && /* @__PURE__ */ jsxRuntimeExports.jsx(Spec, { label: "Min TWR", value: String(rule.twr_min) })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(RiskBadge, { level: rule.risk_level }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Stars, { n: rule.confidence_level })
              ] }),
              (rule.cost_min_inr != null || rule.cost_max_inr != null) && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-[12px] text-white/50", children: [
                "₹",
                (rule.cost_min_inr ?? 0).toLocaleString("en-IN"),
                " – ",
                "₹",
                (rule.cost_max_inr ?? 0).toLocaleString("en-IN")
              ] }),
              rule.engineer_notes && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[12px] text-white/45 bg-white/5 rounded-lg p-3 leading-relaxed", children: rule.engineer_notes }),
              (rule.risk_flags ?? []).length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-wrap gap-1.5", children: rule.risk_flags.map((f, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                "span",
                {
                  className: "text-[11px] px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-300",
                  children: f
                },
                i
              )) })
            ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "py-8 text-center space-y-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-white/40 text-sm", children: "No matching rule found" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-white/25 text-[12px]", children: "Try adjusting payload or flight time requirements" })
            ] })
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          className: [
            "relative rounded-xl border p-5 space-y-3 transition-all",
            ref ? selected === "reference" ? "border-blue-500 bg-blue-500/5 ring-1 ring-blue-500/30 cursor-pointer" : "border-white/10 opacity-60 cursor-pointer" : "border-white/10 opacity-40"
          ].join(" "),
          onClick: ref ? () => setSelected("reference") : void 0,
          children: [
            selected === "reference" && ref && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute top-3 right-3 flex items-center gap-1.5 rounded-full bg-blue-500 px-2 py-0.5 text-[10px] font-medium text-white", children: "✓ Selected" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] uppercase tracking-widest text-white/30 font-medium", children: "Closest Proven Design" }),
            ref ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-white font-semibold text-base leading-snug", children: ref.name }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12px]", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Spec, { label: "Drone type", value: ref.drone_type }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Spec, { label: "Frame size", value: ref.frame_size }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Spec, { label: "Motor class", value: ref.motor_class }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Spec, { label: "Battery", value: ref.battery })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 flex-wrap text-[12px]", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-white/50", children: [
                  "Score: ",
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-white font-medium", children: [
                    ref.score,
                    "/100"
                  ] })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: ref.payload_delta < 2 ? "text-emerald-400 font-medium" : ref.payload_delta <= 5 ? "text-amber-400 font-medium" : "text-red-400 font-medium", children: [
                  "Payload delta: ",
                  ref.payload_delta.toFixed(1),
                  " kg"
                ] })
              ] }),
              ref.engineer_notes && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[12px] text-white/45 bg-white/5 rounded-lg p-3 leading-relaxed", children: ref.engineer_notes }),
              ref.component_list && (() => {
                const keys = COMP_KEYS.filter((k) => ref.component_list?.[k]);
                if (keys.length === 0) return null;
                return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] uppercase tracking-widest text-white/25 mb-1.5", children: "Components" }),
                  keys.map((k) => {
                    const val = ref.component_list[k];
                    const display = typeof val === "object" && val !== null ? val.model ?? JSON.stringify(val) : String(val);
                    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between items-center py-1 border-b border-white/5 last:border-0", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-white/40 text-xs capitalize", children: k.replace(/_/g, " ") }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-white/70 text-xs text-right max-w-[55%]", children: display })
                    ] }, k);
                  })
                ] });
              })()
            ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "py-8 text-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-white/40 text-sm", children: "No proven design found" }) })
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between pt-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          onClick: onBack,
          className: "h-10 px-6 rounded-lg text-sm text-white/60 hover:text-white border border-white/10 hover:border-white/20 transition-colors",
          children: "Back"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          onClick: () => onAccept(selected),
          disabled: selected === null || isLoading,
          className: "h-10 px-8 rounded-lg text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity inline-flex items-center gap-2",
          style: { background: "#378ADD" },
          children: [
            isLoading && /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "h-3.5 w-3.5 animate-spin" }),
            "Save & Continue →"
          ]
        }
      )
    ] })
  ] });
}
async function solveRule(input) {
  const SELECT_COLS = `
    id, rule_name, drone_type, frame_size, motor_class, motor_count,
    battery_config, esc_rating, propeller_spec, flight_controller,
    twr_min, risk_level, confidence_level, engineer_notes, risk_flags,
    cost_min_inr, cost_max_inr, payload_min_kg, payload_max_kg,
    flight_time_min, flight_time_max, user_type
  `;
  const { data: exactData, error: exactError } = await supabase.from("design_rules").select(SELECT_COLS).eq("status", "active").eq("vertical", input.vertical).eq("purpose", input.purpose).lte("payload_min_kg", input.payloadWeight).gte("payload_max_kg", input.payloadWeight).order("confidence_level", { ascending: false });
  if (!exactError && exactData && exactData.length > 0) {
    const filtered = exactData.filter(
      (r) => r.user_type === null || r.user_type === input.userType
    );
    const candidates = filtered.length > 0 ? filtered : exactData;
    const best = pickBest(candidates);
    return {
      rule: toMatchedRule(best),
      confidence_score: Math.min(100, (best.confidence_level ?? 1) * 20),
      is_fallback: false,
      fallback_reason: null
    };
  }
  const { data: fallbackData, error: fallbackError } = await supabase.from("design_rules").select(SELECT_COLS).eq("status", "active").eq("vertical", input.vertical).eq("purpose", input.purpose).order("confidence_level", { ascending: false });
  if (!fallbackError && fallbackData && fallbackData.length > 0) {
    const nearest = fallbackData.reduce((a, b) => {
      return payloadDist(a, input.payloadWeight) <= payloadDist(b, input.payloadWeight) ? a : b;
    });
    const dist = payloadDist(nearest, input.payloadWeight);
    const baseScore = Math.min(100, (nearest.confidence_level ?? 1) * 20);
    const confidence_score = Math.max(10, Math.min(60, baseScore - dist * 5));
    const fallback_reason = `Your payload (${input.payloadWeight} kg) is outside this rule's designed range (${nearest.payload_min_kg}–${nearest.payload_max_kg} kg). This is the nearest matching rule — ${dist.toFixed(1)} kg outside range. Verify component sizing before proceeding.`;
    return {
      rule: toMatchedRule(nearest),
      confidence_score,
      is_fallback: true,
      fallback_reason
    };
  }
  return { rule: null, confidence_score: 0, is_fallback: false, fallback_reason: null };
}
function payloadDist(rule, payload) {
  const min = rule.payload_min_kg ?? 0;
  const max = rule.payload_max_kg ?? 999;
  if (payload < min) return min - payload;
  if (payload > max) return payload - max;
  return 0;
}
function pickBest(candidates) {
  return candidates.reduce((a, b) => {
    if ((b.confidence_level ?? 0) !== (a.confidence_level ?? 0)) {
      return (b.confidence_level ?? 0) > (a.confidence_level ?? 0) ? b : a;
    }
    const rangeA = (a.payload_max_kg ?? 999) - (a.payload_min_kg ?? 0);
    const rangeB = (b.payload_max_kg ?? 999) - (b.payload_min_kg ?? 0);
    return rangeA <= rangeB ? a : b;
  });
}
function toMatchedRule(r) {
  return {
    id: r.id,
    rule_name: r.rule_name,
    drone_type: r.drone_type,
    frame_size: r.frame_size,
    motor_class: r.motor_class,
    motor_count: r.motor_count,
    battery_config: r.battery_config,
    esc_rating: r.esc_rating,
    propeller_spec: r.propeller_spec,
    flight_controller: r.flight_controller,
    twr_min: r.twr_min,
    risk_level: r.risk_level,
    confidence_level: r.confidence_level ?? 1,
    engineer_notes: r.engineer_notes,
    risk_flags: r.risk_flags,
    cost_min_inr: r.cost_min_inr,
    cost_max_inr: r.cost_max_inr,
    flight_time_min: r.flight_time_min,
    flight_time_max: r.flight_time_max
  };
}
const VERTICAL_TO_SLUG = {
  "AgriSky": "agriculture",
  "InfraSky": "infrastructure",
  "GeoSky": "mapping",
  "GuardSky": "surveillance",
  "TorqWings Labs": "industrial",
  "Academy": "education"
};
function scoreReference(design, input) {
  let score = 0;
  if (design.purpose === input.purpose) score += 40;
  const payloadDiff = Math.abs(
    Number(design.payload_weight) - input.payloadWeight
  );
  score += Math.max(0, 30 - payloadDiff * 3);
  const timeDiff = Math.abs(
    Number(design.estimated_flight_time) - input.requiredFlightTime
  );
  score += Math.max(0, 20 - timeDiff * 2);
  score += (Number(design.confidence_score) ?? 0) / 100 * 10;
  return Math.round(score);
}
async function matchReference(input) {
  const slug = VERTICAL_TO_SLUG[input.vertical];
  if (!slug) return { reference: null, score: 0 };
  const { data, error } = await supabase.from("reference_designs").select(`
      id, name, purpose, vertical, drone_type, frame_size, motor_class,
      battery, payload_weight, estimated_flight_time,
      component_list, requirements, engineer_notes, confidence_score
    `).eq("vertical", slug).eq("approval_status", "approved").eq("is_active", true);
  if (error || !data || data.length === 0) {
    return { reference: null, score: 0 };
  }
  const scored = data.map((d) => ({
    design: d,
    score: scoreReference(d, input)
  }));
  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];
  if (best.score === 0) return { reference: null, score: 0 };
  return {
    reference: {
      id: best.design.id,
      name: best.design.name,
      score: best.score,
      payload_delta: Math.abs(
        Number(best.design.payload_weight) - input.payloadWeight
      ),
      drone_type: best.design.drone_type,
      frame_size: best.design.frame_size,
      motor_class: best.design.motor_class,
      battery: best.design.battery,
      component_list: best.design.component_list,
      requirements: best.design.requirements,
      engineer_notes: best.design.engineer_notes,
      confidence_score: best.design.confidence_score
    },
    score: best.score
  };
}
async function trackRuleMatch(ruleId, isFallback) {
  const { data } = await supabase.from("design_rules").select("match_count, fallback_count").eq("id", ruleId).single();
  if (!data) return;
  await supabase.from("design_rules").update({
    match_count: (data.match_count ?? 0) + 1,
    fallback_count: isFallback ? (data.fallback_count ?? 0) + 1 : data.fallback_count ?? 0,
    last_matched_at: (/* @__PURE__ */ new Date()).toISOString()
  }).eq("id", ruleId);
}
async function runIntelligenceEngine(input) {
  const [ruleResult, referenceResult] = await Promise.all([
    solveRule(input),
    matchReference(input)
  ]);
  const { rule, confidence_score: ruleScore, is_fallback, fallback_reason } = ruleResult;
  const { reference, score: refScore } = referenceResult;
  let confidence;
  let ai_required = false;
  if (ruleScore >= 80 && refScore >= 70) {
    confidence = "high";
  } else if (ruleScore >= 40 || refScore >= 40) {
    confidence = "medium";
  } else {
    confidence = "low";
    ai_required = true;
  }
  let summary = "";
  if (rule && reference) {
    summary = `Matched rule "${rule.rule_name ?? rule.drone_type}" with ${ruleScore}% confidence. Closest proven design: "${reference.name}" (score ${refScore}/100, payload ${reference.payload_delta.toFixed(1)} kg off).`;
  } else if (rule) {
    summary = `Matched rule "${rule.rule_name ?? rule.drone_type}" with ${ruleScore}% confidence. No proven design found for this combination.`;
  } else if (reference) {
    summary = `No rule matched. Closest proven design: "${reference.name}" (score ${refScore}/100). Engineer review recommended.`;
  } else {
    summary = "No rule or proven design matched these requirements. AI advisor review required.";
  }
  if (rule?.id) {
    trackRuleMatch(rule.id, is_fallback).catch(() => {
    });
  }
  return {
    matched_rule: rule,
    matched_reference: reference,
    confidence,
    rule_confidence_score: ruleScore,
    reference_score: refScore,
    ai_required,
    summary,
    is_fallback,
    fallback_reason
  };
}
const TOTAL = 6;
function NewProjectWizard() {
  const {
    profile
  } = useMissionHubAuth();
  const nav = useNavigate();
  const [step, setStep] = reactExports.useState(1);
  const [form, setForm] = reactExports.useState(INITIAL_FORM);
  const [saving, setSaving] = reactExports.useState(false);
  const [baseName, setBaseName] = reactExports.useState(null);
  const [recommendation, setRecommendation] = reactExports.useState(null);
  const [engineLoading, setEngineLoading] = reactExports.useState(false);
  const [acceptedSource, setAcceptedSource] = reactExports.useState("rule");
  const patch = (p) => setForm((f) => ({
    ...f,
    ...p
  }));
  const SLUG_TO_VERTICAL = {
    agriculture: "AgriSky",
    infrastructure: "InfraSky",
    mapping: "GeoSky",
    surveillance: "GuardSky",
    industrial: "TorqWings Labs",
    defence: "GuardSky"
  };
  reactExports.useEffect(() => {
    const baseId = sessionStorage.getItem("torqwings-studio:base-design");
    if (!baseId) return;
    sessionStorage.removeItem("torqwings-studio:base-design");
    supabase.from("reference_designs").select("name, purpose, vertical, payload_weight, estimated_flight_time").eq("id", baseId).single().then(({
      data
    }) => {
      if (!data) return;
      patch({
        projectName: data.name ?? "",
        purpose: data.purpose ?? INITIAL_FORM.purpose,
        vertical: SLUG_TO_VERTICAL[data.vertical ?? ""] ?? INITIAL_FORM.vertical,
        payloadWeight: data.payload_weight != null ? String(data.payload_weight) : "",
        requiredFlightTime: data.estimated_flight_time != null ? String(data.estimated_flight_time) : ""
      });
      setBaseName(data.name ?? null);
    });
  }, []);
  function buildEngineInput(form2) {
    const USER_TYPE_MAP = {
      "Farmer": "commercial",
      "Engineer": "commercial",
      "Researcher": "research",
      "Student": "research",
      "Demo": "commercial"
    };
    return {
      vertical: form2.vertical,
      purpose: form2.purpose,
      payloadWeight: parseFloat(form2.payloadWeight) || 0,
      requiredFlightTime: parseFloat(form2.requiredFlightTime) || 0,
      terrain: form2.terrain || null,
      windCondition: form2.windCondition || null,
      userType: USER_TYPE_MAP[form2.userType] ?? null
    };
  }
  async function runEngine(f) {
    setEngineLoading(true);
    try {
      const result = await runIntelligenceEngine(buildEngineInput(f));
      setRecommendation(result);
    } finally {
      setEngineLoading(false);
    }
  }
  async function handleSubmit() {
    if (!profile?.id) return;
    setSaving(true);
    try {
      const payload = buildInsertPayload(form, profile.id, recommendation, acceptedSource);
      const result = await createProject(payload);
      if (result?.id) {
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem("torqwings-studio:selected", result.id);
        }
        toast.success("Project created! Generating design…");
        nav({
          to: "/mission-hub/torqwings-design-studio/design"
        });
      }
    } catch (err) {
      toast.error(err?.message ?? "Failed to save project.");
      setSaving(false);
    }
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-2xl mx-auto px-4 py-10 space-y-6", children: [
    baseName && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 rounded-xl px-4 py-3 text-sm", style: {
      background: "rgba(55,138,221,0.10)",
      border: "0.5px solid rgba(55,138,221,0.25)"
    }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Bookmark, { className: "h-4 w-4 shrink-0", style: {
        color: "#378ADD"
      } }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: {
        color: "#94c7f5"
      }, children: [
        "Started from proven design:",
        " ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { className: "text-white", children: baseName })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(WizardProgress, { step, total: TOTAL, projectName: form.projectName, vertical: form.vertical, purpose: form.purpose }),
    step === 1 && /* @__PURE__ */ jsxRuntimeExports.jsx(StepScope, { form, onChange: patch, onNext: () => setStep(2) }),
    step === 2 && /* @__PURE__ */ jsxRuntimeExports.jsx(StepMission, { form, onChange: patch, onNext: () => setStep(3), onBack: () => setStep(1) }),
    step === 3 && /* @__PURE__ */ jsxRuntimeExports.jsx(StepPayload, { form, onChange: patch, onNext: () => setStep(4), onBack: () => setStep(2) }),
    step === 4 && /* @__PURE__ */ jsxRuntimeExports.jsx(StepSafety, { form, onChange: patch, onNext: () => {
      runEngine(form);
      setStep(5);
    }, onBack: () => setStep(3) }),
    step === 5 && /* @__PURE__ */ jsxRuntimeExports.jsx(StepRecommendation, { result: recommendation, input: buildEngineInput(form), isLoading: engineLoading, onBack: () => setStep(4), onAccept: (choice) => {
      setAcceptedSource(choice);
      setStep(6);
    } }),
    step === 6 && /* @__PURE__ */ jsxRuntimeExports.jsx(StepReview, { form, onBack: () => setStep(5), onSubmit: handleSubmit, saving })
  ] });
}
export {
  NewProjectWizard as component
};
