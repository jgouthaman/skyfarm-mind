import {
  Wrench, Leaf, Building2, Map as MapIcon, Brain, Cog, Split,
  Plane, Layers, Compass, GitBranch, FlaskConical,
  Radar, FileText, Zap, Cpu, ScanLine, Sprout,
  Eye, BarChart3, Rocket, Users, Globe2,
  Store, Unlink, Clock, Sigma, ShieldCheck, Link,
} from "lucide-react";

export const SCIENCE_PROBLEM_CARDS: { icon: React.ReactNode; text: string; desc: string }[] = [
  { icon: <Store aria-hidden="true" />, text: "Vendor familiarity over published research", desc: "Design decisions default to whatever platform a vendor sells, not to the aerospace research on which architecture actually fits the mission." },
  { icon: <Unlink aria-hidden="true" />, text: "No shared language between research and deployment", desc: "Academic decision-science frameworks for UAV selection rarely reach the engineers and buyers actually specifying missions in the field." },
  { icon: <Users aria-hidden="true" />, text: "Reasoning lives in tribal knowledge, not codified rules", desc: "Mission-to-platform logic is passed down informally instead of being auditable, documented, and testable." },
  { icon: <Clock aria-hidden="true" />, text: "Validation happens after purchase", desc: "Simulation and design validation are typically an afterthought, applied once components are already ordered — when it's expensive to discover a mismatch." },
];

export const SCIENCE_SOLUTION_CARDS: { icon: React.ReactNode; text: string; desc: string }[] = [
  { icon: <Sigma aria-hidden="true" />, text: "Algorithm-driven, research-grounded selection", desc: "Platform recommendations come from aerospace decision-science research, not intuition or vendor bias." },
  { icon: <Eye aria-hidden="true" />, text: "Transparent by design", desc: "Every recommendation shows its reasoning — confidence level, contributing factors, and alternatives — instead of a black-box answer." },
  { icon: <ShieldCheck aria-hidden="true" />, text: "Validated before you build", desc: "Simulation tests the design against the mission before a single component is ordered." },
  { icon: <Link aria-hidden="true" />, text: "A bridge between research and field deployment", desc: "The Design Studio is where published aerospace science becomes a usable engineering tool, not a paper nobody reads." },
];

export const PROBLEM_CARDS: { icon: React.ReactNode; text: string; desc: string }[] = [
  { icon: <Split aria-hidden="true" />, text: "Choosing the right aerial platform is guesswork", desc: "Multirotor, fixed-wing, or VTOL-hybrid? Most buyers default to whatever's familiar — not what the mission's payload, range, and launch site actually require." },
  { icon: <Wrench aria-hidden="true" />, text: "Manual inspections are slow and risky", desc: "Sending people up towers, across roofs, and into confined structures to check what a platform could survey from the air — at higher cost, lower repeatability, and real physical risk." },
  { icon: <Leaf aria-hidden="true" />, text: "Farm and field issues are detected late", desc: "Crop stress, irrigation failure, and pest pressure are often visible from the air weeks before they're visible from the ground — by which point the yield impact is already locked in." },
  { icon: <Building2 aria-hidden="true" />, text: "Infrastructure monitoring lacks real-time visibility", desc: "Roads, towers, solar farms, and pipelines get inspected on a schedule, not continuously — meaning failures are discovered on the next visit, not the day they start." },
  { icon: <MapIcon aria-hidden="true" />, text: "Mapping and surveying are time-consuming", desc: "Traditional land survey and GIS data capture can take days of fieldwork for what a mission-tuned platform can cover in a single flight." },
  { icon: <Rocket aria-hidden="true" />, text: "New payloads and sensor needs have no fast path from concept to field validation", desc: "A new sensor configuration or mission-specific payload usually means starting from scratch — no shared research base, no rapid prototyping path, no place to validate before committing." },
];

// Ordered to pair 1:1 with PROBLEM_CARDS above (same index answers same problem).
export const SOLUTION_CARDS = [
  { icon: <Plane aria-hidden="true" />, text: "Custom platform design", desc: "Purpose-engineered autonomous aerial platforms across multirotor, fixed-wing, and VTOL-hybrid architectures — matched to your mission by proven design rules and AI-powered recommendations, not a one-size-fits-all frame." },
  { icon: <GitBranch aria-hidden="true" />, text: "Scalable aerial operations", desc: "Repeatable design processes from a single farm platform to enterprise-grade aerial fleets." },
  { icon: <Brain aria-hidden="true" />, text: "AI-powered aerial analytics", desc: "Computer vision models that turn aerial imagery into decisions — crop health, structural defects, boundary mapping, and threat detection." },
  { icon: <Layers aria-hidden="true" />, text: "Industry-specific verticals", desc: "Tailored design workflows and intelligence layers for agriculture, infrastructure, mapping, and surveillance." },
  { icon: <Compass aria-hidden="true" />, text: "Mission planning & reporting", desc: "From design brief to PDF compliance report — end-to-end platform engineering and operations." },
  { icon: <FlaskConical aria-hidden="true" />, text: "Research & prototyping", desc: "Rapid prototyping of payloads, aerospace experiments, and next-generation autonomous systems through TorqWings Labs." },
];

export const TECH_PIPELINE = [
  { num: "01", icon: <Plane aria-hidden="true" />, text: "Platform Mission", desc: "Multirotor, fixed-wing, or VTOL-hybrid platform — matched to your mission — captures the aerial data." },
  { num: "02", icon: <Radar aria-hidden="true" />, text: "Data Capture", desc: "RGB, thermal, multispectral, LiDAR, or sensor-based data." },
  { num: "03", icon: <Brain aria-hidden="true" />, text: "AI Analysis", desc: "Vision models detect patterns, risks, defects, stress, and changes." },
  { num: "04", icon: <FileText aria-hidden="true" />, text: "Actionable Reports", desc: "Dashboards, PDF reports, alerts and recommendations." },
  { num: "05", icon: <Zap aria-hidden="true" />, text: "Operational Intelligence", desc: "Insights for inspection, advisory, planning and automation." },
];

export const PRODUCT_CAPABILITIES = [
  { icon: <Plane aria-hidden="true" />, text: "Custom Platform Design" },
  { icon: <Cpu aria-hidden="true" />, text: "Payload Integration" },
  { icon: <Compass aria-hidden="true" />, text: "Mission Planning" },
  { icon: <ScanLine aria-hidden="true" />, text: "AI Image Analysis" },
  { icon: <MapIcon aria-hidden="true" />, text: "Aerial Mapping" },
  { icon: <Sprout aria-hidden="true" />, text: "Crop Intelligence" },
  { icon: <Building2 aria-hidden="true" />, text: "Infrastructure Inspection" },
  { icon: <Eye aria-hidden="true" />, text: "Surveillance Workflows" },
  { icon: <BarChart3 aria-hidden="true" />, text: "Reporting Dashboards" },
  { icon: <Cog aria-hidden="true" />, text: "Platform Operations" },
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
