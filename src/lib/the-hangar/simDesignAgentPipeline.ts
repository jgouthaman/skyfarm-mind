import { assertCADDesignOwnership } from "./cadDesignAgentPipeline.ts";
import type { MassProperties, BomEntry } from "./cadDesignGeneration.ts";
import { evaluateSimulationGate, loadPerformanceThresholds } from "./simDesignRules.ts";
import {
  generateSimDesign,
  type FlightEnvelope,
  type StabilityAssessment,
} from "./simDesignGeneration.ts";
import {
  createSimulation,
  getSimulation,
  updateSimulationStatus,
  persistSimulationSpec,
  logSimulationStageRun,
  getLatestCADDesignSpec,
  type SimulationRunStage,
  type HangarSimulationRow,
} from "./simDesignPersistence.ts";

// Simulation Orchestrator Agent (Bay 05) orchestrator — mirrors
// cadDesignAgentPipeline.ts's structure/style. This pass implements only
// Stage 1 (Flight Dynamics Assessment, SimulationOrchestratorAgent.md
// Section 5.1) as one complete vertical slice — prerequisite checks, the
// deterministic gate, the one LLM call, deterministic scoring, and
// persistence all happen here, since Stages 2-4 don't exist yet to hand off
// to. The one LLM call (simDesignGeneration.ts) already produces both the
// flight-envelope estimate (5.1) and the stability classification (5.2) in
// a single response — there is no separate "stability_analysis" call to log
// as its own run, so this stage's audit trail is written under
// "flight_dynamics_assessment" only, the same way cadDesignAgentPipeline.ts
// logs its one real call as "model_generation" despite CADAgent.md's
// architecture section naming three conceptual sub-steps (Model Generation/
// Design Validation/Output Generation) for what is, in the real code, one
// function call. The UI is not wired this pass, matching every prior bay's
// first pipeline commit.

export class SimulationAgentError extends Error {
  constructor(
    message: string,
    public readonly simulationId: string,
    public readonly stage: SimulationRunStage,
  ) {
    super(message);
    this.name = "SimulationAgentError";
  }
}

export class InvalidSimulationInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidSimulationInputError";
  }
}

// Local and unexported — matching assertCADDesignOwnership's real original
// state in cadDesignAgentPipeline.ts (local/unexported) before this file's
// own need caused it to be exported for cross-bay reuse this same turn. No
// Bay 06 exists yet to need this exported, so it isn't, until one does.
// Relocated from simDesignPersistence.ts (see that file's own note) to
// match this precedent exactly, per the same reasoning.
async function assertSimulationOwnership(
  simulationId: string,
  userId: string,
): Promise<HangarSimulationRow> {
  const simulation = await getSimulation(simulationId);
  if (!simulation) {
    throw new Error(`No Hangar_Simulations row found for simulationId "${simulationId}"`);
  }
  if (simulation.user_id !== userId) {
    throw new Error(`Simulation "${simulation.id}" does not belong to user "${userId}"`);
  }
  return simulation;
}

async function recordStageFailure(
  simulationId: string,
  stage: SimulationRunStage,
  error: unknown,
): Promise<SimulationAgentError> {
  const message = error instanceof Error ? error.message : String(error);
  await logSimulationStageRun(simulationId, stage, null, null, "error", 0, message);
  await updateSimulationStatus(simulationId, "error").catch(() => {});
  return new SimulationAgentError(message, simulationId, stage);
}

// ── Stage 01 — Flight Dynamics Assessment ────────────────────────────────

export interface Stage1Request {
  userId: string;
  cadDesignId: string;
}

export interface Stage1Result {
  simulationId: string;
  simulationCode: string;
  flightEnvelope: FlightEnvelope;
  stability: StabilityAssessment;
  performanceScore: number;
  riskFlags: string[];
  confidenceScore: number;
  reasoningSummary: string;
  sourceWasMock: boolean;
  specVersion: number;
}

// SimulationOrchestratorAgent.md Section 5.1: "Performance Scoring — 0-100
// composite score feeding confidence signal (heuristic/rules)". Computed
// here, not taken from the LLM's own output — generation.performanceScore
// is discarded. Checked cadDesignAgentPipeline.ts directly before writing
// this: it computes confidence_score independently of anything the LLM
// reports (cadDesignGeneration.ts doesn't even have a confidence_score
// field at all), so this mirrors that same "pipeline owns scoring, not the
// model" precedent rather than passing simDesignGeneration.ts's
// self-reported values through unchanged — those were explicitly flagged
// as provisional in that file's own header comment, pending exactly this
// pipeline existing. Base 100, penalized per non-stable stability axis and
// per risk flag.
function computeSimulationPerformanceScore(
  stability: StabilityAssessment,
  riskFlags: string[],
): number {
  let score = 100;
  if (stability.longitudinal !== "stable") score -= 20;
  if (stability.lateral !== "stable") score -= 20;
  score -= 10 * riskFlags.length;
  return Math.max(0, Math.min(100, score));
}

// Blends the just-computed performance score (scaled to 0-1) with the
// upstream CAD design's own confidence — same garbage-in-garbage-out
// reasoning computeCADDesignConfidence applies to its own upstream
// confidence — then applies the same flat mock penalty (-0.3) every other
// bay's confidence formula uses.
function computeSimulationConfidence(
  upstreamConfidence: number,
  performanceScore: number,
  sourceWasMock: boolean,
): number {
  let score = (upstreamConfidence + performanceScore / 100) / 2;
  if (sourceWasMock) score -= 0.3;
  return Math.max(0, Math.min(1, score));
}

export async function runFlightDynamicsAssessmentStage(
  request: Stage1Request,
): Promise<Stage1Result> {
  const { userId, cadDesignId } = request;
  if (!cadDesignId) {
    throw new InvalidSimulationInputError(
      "A spec-ready CAD design must be selected before running a simulation.",
    );
  }

  // Never trust a client-supplied cad_design_id — same reasoning
  // assertAircraftDesignOwnership/assertConceptOwnership already apply
  // upstream.
  const cadDesign = await assertCADDesignOwnership(cadDesignId, userId);

  if (cadDesign.status !== "spec_ready") {
    throw new InvalidSimulationInputError("Source CAD design is not spec-ready.");
  }

  const cadSpec = await getLatestCADDesignSpec(cadDesignId);
  if (!cadSpec) {
    throw new InvalidSimulationInputError("No spec has been generated for this CAD design yet.");
  }

  const massProperties = cadSpec.mass_properties as unknown as MassProperties;
  const bom = cadSpec.bom as unknown as BomEntry[];

  // Known, disclosed gap: nothing in the Concept/Aircraft Design/CAD chain
  // carries Mission Agent's own mission_specs.vertical forward —
  // Hangar_concept_specs never persists it (persistConceptSpec doesn't
  // write it), so by the time a CAD design reaches Bay 05 there is no real
  // vertical value to look up thresholds against. loadPerformanceThresholds(null)
  // short-circuits to null (its own documented behavior), so thresholds is
  // always null in this pass. simDesignGeneration.ts's system prompt already
  // handles a null thresholds object by reasoning qualitatively and saying
  // so, so this degrades honestly rather than silently. Fixing this for
  // real means threading a mission_id/vertical through Concept/Aircraft
  // Design/CAD persistence — out of scope for this one pipeline file.
  const thresholds = await loadPerformanceThresholds(null);

  const simulation = await createSimulation(userId, cadDesignId);
  const simulationId = simulation.id;
  await updateSimulationStatus(simulationId, "processing");

  const start = Date.now();
  try {
    // GATE — deterministic, eliminates an already-nothing/already-flagged
    // upstream CAD design before any assessment is attempted.
    const gate = evaluateSimulationGate({
      massProperties,
      interferenceClear: cadSpec.interference_clear,
    });
    if (gate.eliminated) {
      throw new InvalidSimulationInputError(
        `CAD design "${cadDesign.cad_code}" was eliminated by the hard-constraint gate: ${gate.reasons.join("; ")}`,
      );
    }

    // GENERATE — the one LLM call in this stage.
    const generation = await generateSimDesign({
      data: {
        massProperties,
        interferenceClear: cadSpec.interference_clear,
        dfmFlags: cadSpec.dfm_flags,
        bom,
        designRationale: cadSpec.design_rationale,
        thresholds,
      },
    });

    // SCORE — deterministic, pipeline-owned (see computeSimulationPerformanceScore's
    // own comment). The raw LLM self-assessment is still captured in the
    // run's output_snapshot below for traceability, just not what gets
    // persisted/returned as the authoritative score.
    const finalSourceWasMock = cadSpec.source_was_mock || generation.sourceWasMock;
    const performanceScore = computeSimulationPerformanceScore(
      generation.stability,
      generation.riskFlags,
    );
    const confidenceScore = computeSimulationConfidence(
      cadSpec.confidence_score,
      performanceScore,
      finalSourceWasMock,
    );
    const reasoningSummary = cadSpec.source_was_mock
      ? `⚠ Source CAD design was generated from CAD Agent's mock fallback (no real LLM output) — this simulation should not be treated as based on real reasoning. ${generation.reasoningSummary}`
      : generation.reasoningSummary;

    const specRow = await persistSimulationSpec(simulationId, {
      flightEnvelope: generation.flightEnvelope as unknown as Record<string, unknown>,
      stability: generation.stability as unknown as Record<string, unknown>,
      performanceScore,
      riskFlags: generation.riskFlags,
      confidenceScore,
      reasoningSummary,
      sourceWasMock: finalSourceWasMock,
    });
    await updateSimulationStatus(simulationId, "spec_ready", confidenceScore);

    await logSimulationStageRun(
      simulationId,
      "flight_dynamics_assessment",
      {
        cadDesignId,
        massProperties,
        interferenceClear: cadSpec.interference_clear,
        dfmFlags: cadSpec.dfm_flags,
        thresholds,
      },
      {
        gate,
        generation,
        performanceScore,
        confidenceScore,
        persistedSpecId: specRow.id,
        version: specRow.version,
      },
      "success",
      Date.now() - start,
    );

    return {
      simulationId,
      simulationCode: simulation.simulation_code,
      flightEnvelope: generation.flightEnvelope,
      stability: generation.stability,
      performanceScore,
      riskFlags: generation.riskFlags,
      confidenceScore,
      reasoningSummary,
      sourceWasMock: finalSourceWasMock,
      specVersion: specRow.version,
    };
  } catch (err) {
    throw await recordStageFailure(simulationId, "flight_dynamics_assessment", err);
  }
}
