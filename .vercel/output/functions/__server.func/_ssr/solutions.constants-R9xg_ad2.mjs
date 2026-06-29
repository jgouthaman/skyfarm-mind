import { j as jsxRuntimeExports } from "../_libs/react.mjs";
import { P as Plane, R as Radar, _ as Brain, a4 as FileText, a5 as Zap, x as Cpu, a6 as Compass, a7 as ScanLine, z as Map, E as Sprout, D as Building2, Z as Eye, a8 as ChartColumn, a9 as Cog, aa as Wrench, d as Leaf, ab as Layers, ac as GitBranch, F as FlaskConical, ad as Rocket, K as Users, ae as Earth } from "../_libs/lucide-react.mjs";
const PROBLEM_CARDS = [
  { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Wrench, { "aria-hidden": "true" }), text: "Manual inspections are slow and risky" },
  { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Leaf, { "aria-hidden": "true" }), text: "Farm and field issues are detected late" },
  { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Building2, { "aria-hidden": "true" }), text: "Infrastructure monitoring lacks real-time visibility" },
  { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Map, { "aria-hidden": "true" }), text: "Mapping and surveying are time-consuming" },
  { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Brain, { "aria-hidden": "true" }), text: "Drone data is rarely converted into actionable intelligence" },
  { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Cog, { "aria-hidden": "true" }), text: "Industry-specific drone customization is limited" }
];
const SOLUTION_CARDS = [
  { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Plane, { "aria-hidden": "true" }), text: "Custom drone systems", desc: "Purpose-built UAVs engineered for specific industry missions." },
  { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Brain, { "aria-hidden": "true" }), text: "AI-powered aerial analytics", desc: "Computer vision models that turn imagery into decisions." },
  { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Layers, { "aria-hidden": "true" }), text: "Industry-specific verticals", desc: "Tailored workflows for agriculture, infra, mapping and more." },
  { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Compass, { "aria-hidden": "true" }), text: "Mission planning & reporting", desc: "From flight plan to PDF — operations end-to-end." },
  { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(GitBranch, { "aria-hidden": "true" }), text: "Scalable drone operations", desc: "Repeatable processes from a single farm to enterprise fleets." },
  { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(FlaskConical, { "aria-hidden": "true" }), text: "Research & prototyping", desc: "Rapid prototyping of payloads and aerospace experiments." }
];
const TECH_PIPELINE = [
  { num: "01", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Plane, { "aria-hidden": "true" }), text: "Drone Mission", desc: "Custom UAV or partner drone captures aerial data." },
  { num: "02", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Radar, { "aria-hidden": "true" }), text: "Data Capture", desc: "RGB, thermal, multispectral, LiDAR, or sensor-based data." },
  { num: "03", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Brain, { "aria-hidden": "true" }), text: "AI Analysis", desc: "Vision models detect patterns, risks, defects, stress, and changes." },
  { num: "04", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { "aria-hidden": "true" }), text: "Actionable Reports", desc: "Dashboards, PDF reports, alerts and recommendations." },
  { num: "05", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Zap, { "aria-hidden": "true" }), text: "Operational Intelligence", desc: "Insights for inspection, advisory, planning and automation." }
];
const PRODUCT_CAPABILITIES = [
  { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Plane, { "aria-hidden": "true" }), text: "Custom UAV Design" },
  { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Cpu, { "aria-hidden": "true" }), text: "Payload Integration" },
  { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Compass, { "aria-hidden": "true" }), text: "Drone Mission Planning" },
  { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(ScanLine, { "aria-hidden": "true" }), text: "AI Image Analysis" },
  { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Map, { "aria-hidden": "true" }), text: "Aerial Mapping" },
  { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Sprout, { "aria-hidden": "true" }), text: "Crop Intelligence" },
  { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Building2, { "aria-hidden": "true" }), text: "Infrastructure Inspection" },
  { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, { "aria-hidden": "true" }), text: "Surveillance Workflows" },
  { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(ChartColumn, { "aria-hidden": "true" }), text: "Reporting Dashboards" },
  { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Cog, { "aria-hidden": "true" }), text: "Drone Service Operations" }
];
const PILOT_PROGRAMS = [
  {
    tag: "Agriculture",
    icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Sprout, { className: "h-5 w-5", "aria-hidden": "true" }),
    tone: "agri",
    title: "AgriSky Farm Pilot",
    desc: "Drone imagery and AI-based crop health reports for farms."
  },
  {
    tag: "Infrastructure",
    icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Building2, { className: "h-5 w-5", "aria-hidden": "true" }),
    tone: "primary",
    title: "InfraSky Inspection Pilot",
    desc: "Drone-based inspection and reporting for infrastructure and industrial assets."
  },
  {
    tag: "R&D",
    icon: /* @__PURE__ */ jsxRuntimeExports.jsx(FlaskConical, { className: "h-5 w-5", "aria-hidden": "true" }),
    tone: "primary",
    title: "Custom UAV R&D Pilot",
    desc: "Prototype development and payload testing for specialized aerospace use cases."
  }
];
const TEAM_CAPABILITIES = [
  { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Rocket, { "aria-hidden": "true" }), text: "Aerospace engineering" },
  { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Plane, { "aria-hidden": "true" }), text: "UAV design" },
  { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Cpu, { "aria-hidden": "true" }), text: "Flight systems" },
  { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Brain, { "aria-hidden": "true" }), text: "AI & software platforms" },
  { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Users, { "aria-hidden": "true" }), text: "Field pilots" },
  { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Earth, { "aria-hidden": "true" }), text: "Industry partnerships" }
];
export {
  PRODUCT_CAPABILITIES as P,
  SOLUTION_CARDS as S,
  TECH_PIPELINE as T,
  PROBLEM_CARDS as a,
  PILOT_PROGRAMS as b,
  TEAM_CAPABILITIES as c
};
