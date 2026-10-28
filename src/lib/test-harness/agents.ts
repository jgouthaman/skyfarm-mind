// The 15 Hangar agents, as shown in the Test Harness's dropdown + side
// panel. `slug` is the exact filename (minus .py) of that agent's Vercel
// Python function in the separate th-vercel-functions project — keep the
// two in sync if either changes. `functions` are display-only, hardcoded
// descriptions of what each agent does (grounded in this repo's actual
// Hangar pipeline stage names, e.g. missionAgentPipeline.ts's stages), not
// fetched from anywhere; one is chosen per request to send as
// `function_name` in the payload.

export interface AgentFunction {
  id: string;
  label: string;
}

export interface TestHarnessAgent {
  bay: string;
  name: string;
  slug: string;
  functions: AgentFunction[];
}

export const TEST_HARNESS_AGENTS: TestHarnessAgent[] = [
  {
    bay: "01", name: "Mission", slug: "mission",
    functions: [
      { id: "input_processing", label: "Input Processing — parse brief into sources" },
      { id: "reasoning_planning", label: "Reasoning & Planning — decompose, identify constraints/KPIs" },
      { id: "output_generation", label: "Output Generation — assemble mission spec" },
      { id: "output_interface", label: "Output Interface — hand off to Concept" },
      { id: "agentic_run", label: "Agentic Run — Claude decides the stage order itself (payload: { raw_text, structured_fields?, attached_regulations? })" },
    ],
  },
  {
    bay: "02", name: "Concept", slug: "concept",
    functions: [
      { id: "concept_ideation", label: "Concept Ideation — generate candidate concepts" },
      { id: "trade_off_reasoning", label: "Trade-off Reasoning — evaluate vs. constraints/KPIs" },
      { id: "ranking_scoring", label: "Ranking & Scoring — rank candidates" },
      { id: "finalize", label: "Finalize — hand off top concept" },
    ],
  },
  {
    bay: "03", name: "Aircraft Design", slug: "aircraft-design",
    functions: [
      { id: "gate", label: "Gate — rules-engine feasibility check" },
      { id: "score", label: "Score — rate gated configurations" },
      { id: "generate", label: "Generate — produce geometry parameters" },
    ],
  },
  {
    bay: "04", name: "CAD", slug: "cad",
    functions: [
      { id: "generate_model", label: "Generate Model — build CAD geometry & assembly" },
      { id: "mass_properties", label: "Mass Properties — weight & center of gravity" },
      { id: "bom", label: "Bill of Materials — part list" },
    ],
  },
  {
    bay: "05", name: "Simulation Orchestrator", slug: "simulation-orchestrator",
    functions: [
      { id: "prepare_plan", label: "Prepare Simulation Plan" },
      { id: "dispatch", label: "Dispatch — send jobs to solver agents" },
      { id: "aggregate", label: "Aggregate Results" },
    ],
  },
  {
    bay: "06", name: "CFD", slug: "cfd",
    functions: [
      { id: "aero_assessment", label: "Aerodynamic Assessment" },
      { id: "forces_coefficients", label: "Forces & Coefficients Estimate" },
    ],
  },
  {
    bay: "07", name: "Structural", slug: "structural",
    functions: [
      { id: "structural_assessment", label: "Structural Assessment" },
      { id: "safety_factor", label: "Stress / Safety Factor Estimate" },
    ],
  },
  {
    bay: "08", name: "Optimization", slug: "optimization",
    functions: [
      { id: "tradeoff_search", label: "Trade-off Search — weight/drag/cost/safety" },
      { id: "recommend_adjustments", label: "Recommend Adjustments" },
    ],
  },
  {
    bay: "09", name: "Validation", slug: "validation",
    functions: [
      { id: "check_spec", label: "Check Against Mission Spec" },
      { id: "verdict", label: "Issue Pass / Fail Verdict" },
    ],
  },
  {
    bay: "10", name: "Materials", slug: "materials",
    functions: [
      { id: "recommend_materials", label: "Recommend Materials" },
      { id: "justify_selection", label: "Justify Selection" },
    ],
  },
  {
    bay: "11", name: "Manufacturing", slug: "manufacturing",
    functions: [
      { id: "dfm_check", label: "DFM Check — manufacturability" },
      { id: "build_plan", label: "Build Plan & BOM" },
    ],
  },
  {
    bay: "12", name: "Certification", slug: "certification",
    functions: [
      { id: "map_regulations", label: "Map Against Regulations" },
      { id: "compliance_gaps", label: "Flag Compliance Gaps" },
    ],
  },
  {
    bay: "13", name: "Documentation", slug: "documentation",
    functions: [
      { id: "compile_reports", label: "Compile Reports" },
      { id: "drawings_slr", label: "Generate Drawings & SLR" },
    ],
  },
  {
    bay: "14", name: "Bernoulli", slug: "bernoulli",
    functions: [
      { id: "physics_consistency", label: "Physics Consistency Check" },
      { id: "dimensional_analysis", label: "Dimensional Analysis Check" },
    ],
  },
  {
    bay: "15", name: "Knowledge", slug: "knowledge",
    functions: [
      { id: "query_memory", label: "Query Shared Memory" },
      { id: "surface_insight", label: "Surface Insight" },
    ],
  },
];
