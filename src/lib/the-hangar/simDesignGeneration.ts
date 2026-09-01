import { createServerFn } from "@tanstack/react-start";
import { callLlmGateway, stripJsonFences } from "./llmGateway.ts";
import type { MassProperties, BomEntry } from "./cadDesignGeneration.ts";
import type { PerformanceThresholds } from "./simDesignRules.ts";

// Bay 05 (Simulation Orchestrator Agent) Stage 1's generation step — same
// createServerFn + callLlmGateway + mock-fallback pattern as
// cadDesignGeneration.ts. callLlmGateway is already a direct Anthropic SDK
// call (model + max_tokens, see its own header comment) — it does not
// expose a temperature parameter, so none is set here; adding one would
// mean bypassing callLlmGateway and instantiating the SDK directly in this
// file, which is exactly the "different call pattern" this task said not
// to invent. Runs only after simDesignRules.ts's evaluateSimulationGate has
// already passed.
//
// Input shape: SimulationOrchestratorAgent.md Section 7's proposed input
// schema names `geometry_id`/`cad_id` alongside the CAD data, but neither
// aircraftDesignGeneration.ts nor cadDesignGeneration.ts thread their own
// entity's id through generation — that assembly happens in the pipeline
// layer (aircraftDesignAgentPipeline.ts/cadDesignAgentPipeline.ts create
// the row and attach the id to the returned Stage1Result themselves; the
// *Generation.ts file underneath never sees or returns an id at all).
// Matched exactly here: this function takes only the CAD data + thresholds
// and returns only the LLM-derived fields — id assembly is
// simDesignAgentPipeline.ts's job, not yet built.
//
// The real fields used below (massProperties, interferenceClear, dfmFlags,
// bom, designRationale) are exactly what Bay 04's real Stage 1 output
// (cadDesignAgentPipeline.ts's Stage1Result) actually returns. modelFiles/
// cadCode/specVersion are left out as pure bookkeeping with no bearing on a
// flight/stability assessment.
//
// performance_score and confidence_score are present in Section 7's schema,
// but SimulationOrchestratorAgent.md Section 5.1 frames "Performance
// Scoring" as a rules/heuristic step, not an LLM one — and every prior
// bay's own confidence_score is a pipeline-computed formula
// (computeAircraftDesignConfidence, computeCADDesignConfidence), never
// returned by that bay's *Generation.ts file. There is no
// simDesignAgentPipeline.ts yet to own that formula. Since this file must
// still return a complete Section 7 shape from one call, the LLM proposes
// both here as its own self-assessment — flagged explicitly so a future
// pipeline file can recompute/override them deterministically the way
// computeCADDesignConfidence does, rather than this being mistaken for an
// established, final pattern.

export type StabilityClassification = "stable" | "marginal" | "unstable";

export interface SimDesignGenerationInput {
  massProperties: MassProperties;
  interferenceClear: boolean;
  dfmFlags: string[];
  bom: BomEntry[];
  designRationale: string;
  thresholds: PerformanceThresholds | null;
}

export interface FlightEnvelope {
  maxSpeedKmh: number;
  stallSpeedKmh: number;
  serviceCeilingM: number;
  rangeKm: number;
  enduranceMin: number;
}

export interface StabilityAssessment {
  longitudinal: StabilityClassification;
  lateral: StabilityClassification;
  notes: string;
}

// Matches SimulationOrchestratorAgent.md Section 7's LLM-derived fields:
// flight_envelope, stability, performance_score, risk_flags,
// confidence_score (not confidence_signal — CAD Agent's own naming),
// reasoning_summary, source_was_mock. simulation_id/cad_id are intentionally
// not part of this type — see the file header comment.
export interface SimDesignGenerationResult {
  flightEnvelope: FlightEnvelope;
  stability: StabilityAssessment;
  performanceScore: number;
  riskFlags: string[];
  confidenceScore: number;
  reasoningSummary: string;
  // Same meaning as Bay 03/04's mock flag: false on a successful, parsed
  // Claude response; true only on the fallback branch (no ANTHROPIC_API_KEY
  // or an unparseable response). Mirrors cadDesignGeneration.ts's
  // `{ ...parsed, mock: false }` / `mockCADDesign()`'s `mock: true` split
  // exactly — this is not a claim that Bay 05 has a real physics engine,
  // it's the same "did the LLM call actually produce this" signal every
  // other bay already uses.
  sourceWasMock: boolean;
}

const SYSTEM = `You are Simulation Orchestrator Agent's flight dynamics and stability assessment step for TorqWings' aerospace design platform. Given one CAD design's mass properties, bill of materials, and manufacturability validation, estimate a flight envelope (max speed, stall speed, service ceiling, range, endurance), classify longitudinal and lateral stability (stable/marginal/unstable) with supporting notes, propose a 0-100 performance score and a 0-1 confidence score, and list any risk flags. Vertical-specific performance thresholds may be supplied as bounds — if a specific threshold is null, that means no confirmed numeric threshold exists for that dimension, not zero: reason qualitatively using general aerospace judgment for that dimension and say so explicitly in reasoning_summary (e.g. "no confirmed stability margin threshold exists for this vertical; assessed qualitatively"). Never treat a null threshold as a target of zero. Every claim must be grounded in the given mass properties/BOM — do not invent requirements not present in the input. This is not a real physics simulation (no JSBSim/X-Plane) — reasoning_summary should read as an engineering estimate, not a claim of simulated results. Return JSON only.`;

export const generateSimDesign = createServerFn({ method: "POST" })
  .validator((d: SimDesignGenerationInput) => d)
  .handler(async ({ data }): Promise<SimDesignGenerationResult> => {
    const userContent = `CAD design: ${JSON.stringify(data, null, 2)}

Return: { "flight_envelope": { "max_speed_kmh": number, "stall_speed_kmh": number, "service_ceiling_m": number, "range_km": number, "endurance_min": number }, "stability": { "longitudinal": "stable | marginal | unstable", "lateral": "stable | marginal | unstable", "notes": "string" }, "performance_score": number, "risk_flags": ["string"], "confidence_score": number, "reasoning_summary": "string" }`;

    const { content } = await callLlmGateway(SYSTEM, userContent, { jsonMode: true });
    if (!content) return mockSimDesign();

    const parsed = parseSimDesignResponse(content);
    if (!parsed) return mockSimDesign();
    return { ...parsed, sourceWasMock: false };
  });

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function isStabilityClassification(v: unknown): v is StabilityClassification {
  return v === "stable" || v === "marginal" || v === "unstable";
}

function parseSimDesignResponse(
  raw: string,
): Omit<SimDesignGenerationResult, "sourceWasMock"> | null {
  try {
    const obj = JSON.parse(stripJsonFences(raw));

    const fe = obj.flight_envelope;
    if (
      typeof fe !== "object" ||
      fe === null ||
      !isFiniteNumber(fe.max_speed_kmh) ||
      !isFiniteNumber(fe.stall_speed_kmh) ||
      !isFiniteNumber(fe.service_ceiling_m) ||
      !isFiniteNumber(fe.range_km) ||
      !isFiniteNumber(fe.endurance_min)
    ) {
      return null;
    }

    const st = obj.stability;
    if (
      typeof st !== "object" ||
      st === null ||
      !isStabilityClassification(st.longitudinal) ||
      !isStabilityClassification(st.lateral) ||
      typeof st.notes !== "string"
    ) {
      return null;
    }

    if (!isFiniteNumber(obj.performance_score)) return null;
    if (!isFiniteNumber(obj.confidence_score)) return null;
    if (typeof obj.reasoning_summary !== "string") return null;

    const riskFlags: string[] = Array.isArray(obj.risk_flags)
      ? obj.risk_flags.filter((f: unknown): f is string => typeof f === "string")
      : [];

    return {
      flightEnvelope: {
        maxSpeedKmh: fe.max_speed_kmh,
        stallSpeedKmh: fe.stall_speed_kmh,
        serviceCeilingM: fe.service_ceiling_m,
        rangeKm: fe.range_km,
        enduranceMin: fe.endurance_min,
      },
      stability: {
        longitudinal: st.longitudinal,
        lateral: st.lateral,
        notes: st.notes,
      },
      performanceScore: obj.performance_score,
      riskFlags,
      confidenceScore: obj.confidence_score,
      reasoningSummary: obj.reasoning_summary,
    };
  } catch {
    return null;
  }
}

function mockSimDesign(): SimDesignGenerationResult {
  return {
    flightEnvelope: {
      maxSpeedKmh: 0,
      stallSpeedKmh: 0,
      serviceCeilingM: 0,
      rangeKm: 0,
      enduranceMin: 0,
    },
    stability: {
      longitudinal: "unstable",
      lateral: "unstable",
      notes:
        "Mock fallback — no ANTHROPIC_API_KEY reply or unparseable response; no real assessment was performed.",
    },
    performanceScore: 0,
    riskFlags: [
      "No real assessment was performed — ANTHROPIC_API_KEY missing or the LLM response was unparseable.",
    ],
    confidenceScore: 0,
    reasoningSummary: "Mock reasoning summary — no ANTHROPIC_API_KEY reply.",
    sourceWasMock: true,
  };
}
