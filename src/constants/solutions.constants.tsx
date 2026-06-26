import {
  Wrench, Leaf, Building2, Map as MapIcon, Brain, Cog,
  Plane, Layers, Compass, GitBranch, FlaskConical,
  Radar, FileText, Zap, Cpu, ScanLine, Sprout,
  Eye, BarChart3, Rocket, Users, Globe2,
} from "lucide-react";

export const PROBLEM_CARDS = [
  { icon: <Wrench aria-hidden="true" />, text: "Manual inspections are slow and risky" },
  { icon: <Leaf aria-hidden="true" />, text: "Farm and field issues are detected late" },
  { icon: <Building2 aria-hidden="true" />, text: "Infrastructure monitoring lacks real-time visibility" },
  { icon: <MapIcon aria-hidden="true" />, text: "Mapping and surveying are time-consuming" },
  { icon: <Brain aria-hidden="true" />, text: "Drone data is rarely converted into actionable intelligence" },
  { icon: <Cog aria-hidden="true" />, text: "Industry-specific drone customization is limited" },
];

export const SOLUTION_CARDS = [
  { icon: <Plane aria-hidden="true" />, text: "Custom drone systems", desc: "Purpose-built UAVs engineered for specific industry missions." },
  { icon: <Brain aria-hidden="true" />, text: "AI-powered aerial analytics", desc: "Computer vision models that turn imagery into decisions." },
  { icon: <Layers aria-hidden="true" />, text: "Industry-specific verticals", desc: "Tailored workflows for agriculture, infra, mapping and more." },
  { icon: <Compass aria-hidden="true" />, text: "Mission planning & reporting", desc: "From flight plan to PDF — operations end-to-end." },
  { icon: <GitBranch aria-hidden="true" />, text: "Scalable drone operations", desc: "Repeatable processes from a single farm to enterprise fleets." },
  { icon: <FlaskConical aria-hidden="true" />, text: "Research & prototyping", desc: "Rapid prototyping of payloads and aerospace experiments." },
];

export const TECH_PIPELINE = [
  { num: "01", icon: <Plane aria-hidden="true" />, text: "Drone Mission", desc: "Custom UAV or partner drone captures aerial data." },
  { num: "02", icon: <Radar aria-hidden="true" />, text: "Data Capture", desc: "RGB, thermal, multispectral, LiDAR, or sensor-based data." },
  { num: "03", icon: <Brain aria-hidden="true" />, text: "AI Analysis", desc: "Vision models detect patterns, risks, defects, stress, and changes." },
  { num: "04", icon: <FileText aria-hidden="true" />, text: "Actionable Reports", desc: "Dashboards, PDF reports, alerts and recommendations." },
  { num: "05", icon: <Zap aria-hidden="true" />, text: "Operational Intelligence", desc: "Insights for inspection, advisory, planning and automation." },
];

export const PRODUCT_CAPABILITIES = [
  { icon: <Plane aria-hidden="true" />, text: "Custom UAV Design" },
  { icon: <Cpu aria-hidden="true" />, text: "Payload Integration" },
  { icon: <Compass aria-hidden="true" />, text: "Drone Mission Planning" },
  { icon: <ScanLine aria-hidden="true" />, text: "AI Image Analysis" },
  { icon: <MapIcon aria-hidden="true" />, text: "Aerial Mapping" },
  { icon: <Sprout aria-hidden="true" />, text: "Crop Intelligence" },
  { icon: <Building2 aria-hidden="true" />, text: "Infrastructure Inspection" },
  { icon: <Eye aria-hidden="true" />, text: "Surveillance Workflows" },
  { icon: <BarChart3 aria-hidden="true" />, text: "Reporting Dashboards" },
  { icon: <Cog aria-hidden="true" />, text: "Drone Service Operations" },
];

export const PILOT_PROGRAMS = [
  {
    tag: "Agriculture",
    icon: <Sprout className="h-5 w-5" aria-hidden="true" />,
    tone: "agri" as const,
    title: "AgriSky Farm Pilot",
    desc: "Drone imagery and AI-based crop health reports for farms.",
  },
  {
    tag: "Infrastructure",
    icon: <Building2 className="h-5 w-5" aria-hidden="true" />,
    tone: "primary" as const,
    title: "InfraSky Inspection Pilot",
    desc: "Drone-based inspection and reporting for infrastructure and industrial assets.",
  },
  {
    tag: "R&D",
    icon: <FlaskConical className="h-5 w-5" aria-hidden="true" />,
    tone: "primary" as const,
    title: "Custom UAV R&D Pilot",
    desc: "Prototype development and payload testing for specialized aerospace use cases.",
  },
];

export const TEAM_CAPABILITIES = [
  { icon: <Rocket aria-hidden="true" />, text: "Aerospace engineering" },
  { icon: <Plane aria-hidden="true" />, text: "UAV design" },
  { icon: <Cpu aria-hidden="true" />, text: "Flight systems" },
  { icon: <Brain aria-hidden="true" />, text: "AI & software platforms" },
  { icon: <Users aria-hidden="true" />, text: "Field pilots" },
  { icon: <Globe2 aria-hidden="true" />, text: "Industry partnerships" },
];
