import { callLlmGateway, stripJsonFences } from "./llmGateway.ts";

// Bay 10 (Materials Agent) Phase 1's generation step -- callLlmGateway +
// mock-fallback pattern, same as validationGeneration.ts. Deliberately a
// plain async function, not a createServerFn, from the start -- same
// reasoning every other bay's generation file gives (only ever called from
// materialsAgentPipeline.ts, itself only reached from a server-only API
// route handler, never from client code).
//
// MaterialsAgent.md Section 1: this does NOT run against a real materials
// database, supplier catalog, or property-simulation tool -- the LLM
// reasons over the upstream validation result and (currently empty/null)
// operating-environment and catalog context to produce qualitative,
// per-component recommendations. recommendations/rationale should read as
// an engineering judgment call, not a claim of a sourced materials
// database lookup.
//
// source_was_mock is NOT part of this file's own result type -- mirrors
// every other bay's precedent: it's a pipeline-level concern (OR-composed
// against the upstream Bay 09 result's own source_was_mock flag), not
// something this generation function decides. This file still tracks its
// own internal mock flag (mock: boolean) for the same reason every other
// bay's generation file does: distinguishing "real LLM reasoning" from
// "engineering fallback, no LLM reply at all."

const SYSTEM = `You are Materials Agent's Phase 1 reasoning step for TorqWings' aerospace design platform -- no real materials database, supplier catalog, or property-simulation tool runs in this phase. Given a design's validation result (verdict, compliance matrix issues, non-conformances, readiness score), its carried-through structural safety margin, its mission constraints, and (possibly empty) operating-environment and material-catalog context, reason about likely component-level material choices -- produce per-component recommendations with a primary material, a short justification grounded in the given inputs, and any sourcing risk flags (e.g. exotic alloys, long lead times, single-supplier risk). Ground every claim in the given inputs -- do not invent specific supplier names, part numbers, or material property values not present in them. If operating environment or catalog context is empty, reason qualitatively and say so rather than inventing specific numeric property targets. This is not a sourced materials database lookup -- recommendations should read as an engineering judgment call, not a claim of a searched supplier catalog. Return JSON only.`;

export interface MaterialsGenerationInput {
  validationVerdict: "PASS" | "FAIL" | "CONDITIONAL";
  complianceMatrix: { standard: string; status: string; notes: string }[];
  nonConformances: { issue: string; severity: string; fixReference: string }[];
  readinessScore: number;
  structuralSafetyFactor: number | null;
  missionConstraints: { maxLoadFactor: number | null; materialClass: string | null } | null;
  operatingEnvironment: string[];
  materialCatalog: string[];
}

export interface MaterialRecommendation {
  component: string;
  material: string;
  justification: string;
}

export interface MaterialsGenerationResult {
  recommendations: MaterialRecommendation[];
  rationale: string;
  sourcingRiskFlags: string[];
  reasoningSummary: string;
  // Same meaning as every other bay's generation-level mock flag: false on
  // a successful, parsed Claude response; true only on the fallback branch.
  mock: boolean;
}

export async function generateMaterialsAnalysis(
  data: MaterialsGenerationInput,
): Promise<MaterialsGenerationResult> {
  const userContent = `Validation result + carried structural/mission data + environment/catalog context: ${JSON.stringify(data, null, 2)}

Return: { "recommendations": [{ "component": "string", "material": "string", "justification": "string" }], "rationale": "string", "sourcing_risk_flags": ["string"], "reasoning_summary": "string" }`;

  const { content } = await callLlmGateway(SYSTEM, userContent, { jsonMode: true });
  if (!content) return mockMaterialsAnalysis();

  const parsed = parseMaterialsResponse(content);
  if (!parsed) return mockMaterialsAnalysis();
  return { ...parsed, mock: false };
}

function parseMaterialsResponse(raw: string): Omit<MaterialsGenerationResult, "mock"> | null {
  try {
    const obj = JSON.parse(stripJsonFences(raw));

    const recommendationsRaw = obj.recommendations;
    if (!Array.isArray(recommendationsRaw)) return null;
    const recommendations: MaterialRecommendation[] = [];
    for (const r of recommendationsRaw) {
      if (
        typeof r !== "object" ||
        r === null ||
        typeof r.component !== "string" ||
        typeof r.material !== "string" ||
        typeof r.justification !== "string"
      ) {
        return null;
      }
      recommendations.push({
        component: r.component,
        material: r.material,
        justification: r.justification,
      });
    }

    if (typeof obj.rationale !== "string") return null;

    const sourcingRiskFlags = Array.isArray(obj.sourcing_risk_flags)
      ? obj.sourcing_risk_flags.filter((f: unknown): f is string => typeof f === "string")
      : [];

    if (typeof obj.reasoning_summary !== "string") return null;

    return {
      recommendations,
      rationale: obj.rationale,
      sourcingRiskFlags,
      reasoningSummary: obj.reasoning_summary,
    };
  } catch {
    return null;
  }
}

function mockMaterialsAnalysis(): MaterialsGenerationResult {
  return {
    recommendations: [],
    rationale: "",
    sourcingRiskFlags: [],
    reasoningSummary: "Mock reasoning summary -- no ANTHROPIC_API_KEY reply.",
    mock: true,
  };
}
