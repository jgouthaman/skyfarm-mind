import { callLlmGateway, stripJsonFences, type LlmUsage } from "./llmGateway.ts";
import type {
  FinalizedConstraint,
  FinalizedKpi,
  MissionSpecsFields,
} from "./missionSpecAssembly.ts";

// Concept Agent Stage 1 — Concept Ideation. callLlmGateway + mock-fallback
// pattern, same as Mission Agent's intentExtraction.ts. Grounded only in the
// source mission's own finalized spec — no knowledge-graph or benchmark
// lookup exists yet (contextRetrieval.ts is still a stub), so this is Claude
// reasoning against the given spec, not a real trade-study database query.
// Always generates exactly 3 candidates — a fixed, simple v1 choice, not
// user-configurable yet.
//
// PRODUCTION FIX: generateConceptIdeas was a createServerFn until this
// change. On real Vercel production it threw "Server function info not
// found for <hash>" — its manifest entry not resolving at runtime —
// identical to the confirmed bug that hit Bay 04's generateCADDesign and
// Bay 05's generateSimDesign (see cadDesignGeneration.ts's header comment
// for the full investigation history). generateConceptIdeas has exactly one
// caller anywhere in the codebase (conceptAgentPipeline.ts's
// runConceptIdeationStage, itself only ever reached from the server-only API
// route handler) and is never invoked from client code — so it never needed
// the createServerFn RPC/hash dispatch mechanism; it only ever ran
// in-process, server-to-server. Removing the wrapper is the identical fix
// already applied to Bays 04 and 05.
const SYSTEM = `You are Concept Agent's ideation step for TorqWings' aerospace design platform. Given a finalized mission specification (spec, constraints, KPIs, summary), generate exactly 3 distinct candidate vehicle-concept options that could satisfy this mission. Each concept must differ meaningfully from the others (e.g. different vehicle class or configuration approach), and every claim must be grounded in the given mission spec — do not introduce requirements, numbers, or constraints not present in the input. Return JSON only.`;

export interface ConceptIdeationInput {
  missionSpecs: MissionSpecsFields;
  constraints: FinalizedConstraint[];
  kpis: FinalizedKpi[];
  summary: string;
}

export interface CandidateConcept {
  conceptName: string;
  description: string;
  vehicleClass: string;
  rationale: string;
}

export interface ConceptIdeationResult {
  candidates: CandidateConcept[];
  mock: boolean;
  usage: LlmUsage | null;
}

export async function generateConceptIdeas(data: ConceptIdeationInput): Promise<ConceptIdeationResult> {
  const userContent = `Mission specification: ${JSON.stringify(data.missionSpecs, null, 2)}
Constraints: ${JSON.stringify(data.constraints, null, 2)}
KPIs: ${JSON.stringify(data.kpis, null, 2)}
Mission summary: ${data.summary}

Return: { "candidates": [{ "concept_name": "string", "description": "string", "vehicle_class": "string", "rationale": "string" }] } — exactly 3 entries in "candidates".`;

  const { content, usage } = await callLlmGateway(SYSTEM, userContent, { jsonMode: true });
  if (!content) return { candidates: mockCandidates(data), mock: true, usage: null };

  const parsed = parseIdeationResponse(content);
  if (!parsed || parsed.length === 0) {
    return { candidates: mockCandidates(data), mock: true, usage: null };
  }
  return { candidates: parsed, mock: false, usage };
}

function parseIdeationResponse(raw: string): CandidateConcept[] | null {
  try {
    const obj = JSON.parse(stripJsonFences(raw));
    if (!Array.isArray(obj.candidates)) return null;
    const candidates = obj.candidates
      .filter(
        (c: unknown): c is Record<string, unknown> =>
          typeof c === "object" &&
          c !== null &&
          typeof (c as Record<string, unknown>).concept_name === "string",
      )
      .map(
        (c: Record<string, unknown>): CandidateConcept => ({
          conceptName: c.concept_name as string,
          description: typeof c.description === "string" ? c.description : "",
          vehicleClass: typeof c.vehicle_class === "string" ? c.vehicle_class : "",
          rationale: typeof c.rationale === "string" ? c.rationale : "",
        }),
      );
    return candidates.length > 0 ? candidates : null;
  } catch {
    return null;
  }
}

function mockCandidates(data: ConceptIdeationInput): CandidateConcept[] {
  const base = data.missionSpecs.vehicleClass ?? data.missionSpecs.missionType;
  return [
    {
      conceptName: `Mock Concept A — ${base}`,
      description: "Mock candidate — no ANTHROPIC_API_KEY reply.",
      vehicleClass: data.missionSpecs.vehicleClass ?? "Unspecified",
      rationale: "Mock fallback.",
    },
    {
      conceptName: `Mock Concept B — ${base}`,
      description: "Mock candidate — no ANTHROPIC_API_KEY reply.",
      vehicleClass: data.missionSpecs.vehicleClass ?? "Unspecified",
      rationale: "Mock fallback.",
    },
    {
      conceptName: `Mock Concept C — ${base}`,
      description: "Mock candidate — no ANTHROPIC_API_KEY reply.",
      vehicleClass: data.missionSpecs.vehicleClass ?? "Unspecified",
      rationale: "Mock fallback.",
    },
  ];
}
