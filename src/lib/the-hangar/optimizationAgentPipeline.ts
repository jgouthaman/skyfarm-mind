import { getCFDAnalysis } from "./cfdAnalysisPersistence.ts";
import { getSpecsForStructurals, getStructural } from "./structuralPersistence.ts";
import { evaluateOptimizationGate } from "./optimizationRules.ts";
import {
  generateOptimizationAnalysis,
  type ObjectiveScores,
  type RecommendedAdjustment,
} from "./optimizationGeneration.ts";
import {
  createOptimization,
  getOptimization,
  updateOptimizationStatus,
  persistOptimizationSpec,
  listUserOptimizations,
  getSpecsForOptimizations,
  logOptimizationStageRun,
  type OptimizationRunStage,
  type OptimizationStatus,
  type HangarOptimizationRow,
} from "./optimizationPersistence.ts";

// Optimization Agent (Bay 08) orchestrator — mirrors
// structuralAgentPipeline.ts's structure/style exactly. Bay 08 is the first
// bay in the pipeline to fan in from TWO upstream bays (Bay 06 CFD, Bay 07
// Structural) rather than one, so ownership is checked differently from
// every prior bay: there's no "assertCFDAnalysisOwnership"/
// "assertStructuralOwnership" import here, because both of those stay
// local/unexported in their own pipeline files (neither has a downstream
// consumer yet, per their own header comments) — instead this file reads
// each upstream row directly via its persistence-layer getter
// (getCFDAnalysis, getStructural/getSpecsForStructurals) and checks
// user_id itself, same shape as assertOptimizationOwnership below but
// inlined for the two upstream reads since there's nothing to export or
// reuse across two different bays' row types.
//
// Implements the one real stage (Sections 3.1-3.3 combined — Objective
// Formulation, Optimization Execution, Output Generation) as one complete
// vertical slice, same reasoning cfdAnalysisAgentPipeline.ts/
// structuralAgentPipeline.ts already give for their own single-call
// stages. Section 3.4 (Output Interface) is likewise just this same JSON,
// handed to Bay 09 later, not a distinct stage here.

export class OptimizationAgentError extends Error {
  constructor(
    message: string,
    public readonly optimizationId: string,
    public readonly stage: OptimizationRunStage,
  ) {
    super(message);
    this.name = "OptimizationAgentError";
  }
}

export class InvalidOptimizationInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidOptimizationInputError";
  }
}

// Local and unexported — no Bay 09 exists yet to need this exported,
// matching every prior bay's own rule for when to export an ownership
// check.
async function assertOptimizationOwnership(
  optimizationId: string,
  userId: string,
): Promise<HangarOptimizationRow> {
  const optimization = await getOptimization(optimizationId);
  if (!optimization) {
    throw new Error(`No Hangar_Optimizations row found for optimizationId "${optimizationId}"`);
  }
  if (optimization.user_id !== userId) {
    throw new Error(`Optimization "${optimization.id}" does not belong to user "${userId}"`);
  }
  return optimization;
}

async function recordStageFailure(
  optimizationId: string,
  stage: OptimizationRunStage,
  error: unknown,
): Promise<OptimizationAgentError> {
  const message = error instanceof Error ? error.message : String(error);
  await logOptimizationStageRun(optimizationId, stage, null, null, "error", 0, message);
  await updateOptimizationStatus(optimizationId, "error").catch(() => {});
  return new OptimizationAgentError(message, optimizationId, stage);
}

// ── Stage — Trade-off Optimization ───────────────────────────────────────

export interface OptimizationRequest {
  userId: string;
  cfdAnalysisId: string;
  structuralId: string;
}

export interface OptimizationResult {
  optimizationId: string;
  optimizationCode: string;
  objectiveScores: ObjectiveScores;
  tradeOffAnalysis: string;
  recommendedAdjustments: RecommendedAdjustment[];
  overallOptimizationScore: number;
  riskFlags: string[];
  confidenceScore: number;
  reasoningSummary: string;
  sourceWasMock: boolean;
  specVersion: number;
}

// No self-reported LLM confidence is trusted here either — matches the
// CFD/Structural established convention. Base is the average of both
// upstream results' own confidence scores (garbage-in-garbage-out from
// two sources this time, not one), then penalized against the overall
// optimization score and risk flags, same shape
// computeStructuralConfidence already uses.
function computeOptimizationConfidence(
  cfdConfidence: number,
  structuralConfidence: number,
  overallOptimizationScore: number,
  riskFlags: string[],
  sourceWasMock: boolean,
): number {
  let score = (cfdConfidence + structuralConfidence) / 2;
  if (overallOptimizationScore < 0.5) score -= 0.2;
  score -= 0.05 * riskFlags.length;
  if (sourceWasMock) score -= 0.3;
  return Math.max(0, Math.min(1, score));
}

export async function runTradeOffOptimizationStage(
  request: OptimizationRequest,
): Promise<OptimizationResult> {
  const { userId, cfdAnalysisId, structuralId } = request;
  if (!cfdAnalysisId || !structuralId) {
    throw new InvalidOptimizationInputError(
      "A spec-ready CFD analysis and structural analysis must both be selected before running optimization.",
    );
  }

  // Never trust client-supplied ids — same reasoning every prior bay's
  // ownership check already applies. Bay 08 reads Bay 06/07 rows directly
  // (see file header comment) rather than through an exported
  // assert*Ownership from either bay.
  const cfdAnalysis = await getCFDAnalysis(cfdAnalysisId);
  if (!cfdAnalysis || cfdAnalysis.user_id !== userId) {
    throw new InvalidOptimizationInputError("No accessible CFD analysis found for this id.");
  }
  if (cfdAnalysis.status !== "spec_ready") {
    throw new InvalidOptimizationInputError("Source CFD analysis is not spec-ready.");
  }

  const structural = await getStructural(structuralId);
  if (!structural || structural.user_id !== userId) {
    throw new InvalidOptimizationInputError("No accessible structural analysis found for this id.");
  }
  if (structural.status !== "spec_ready") {
    throw new InvalidOptimizationInputError("Source structural analysis is not spec-ready.");
  }

  const [structuralSpec] = await getSpecsForStructurals([structuralId]);
  if (!structuralSpec) {
    throw new InvalidOptimizationInputError("No spec has been generated for this structural analysis yet.");
  }

  // Known, disclosed gap: constraints have no real source anywhere in the
  // Concept/Aircraft Design/CAD chain, same reasoning
  // structuralAgentPipeline.ts already documents. Always null —
  // optimizationGeneration.ts's system prompt handles a null constraints
  // object by reasoning qualitatively and saying so.
  const constraints = { maxLoadFactor: null, materialClass: null };

  const optimization = await createOptimization(userId, cfdAnalysisId, structuralId);
  const optimizationId = optimization.id;
  await updateOptimizationStatus(optimizationId, "processing");

  const start = Date.now();
  try {
    const cfdForces = cfdAnalysis.forces as unknown as { cl: number; cd: number };
    const cfdCoefficients = cfdAnalysis.coefficients as unknown as { cm: number };
    const structuralStress = structuralSpec.stress_results as unknown as {
      von_mises_max_mpa: number;
      max_displacement_mm: number;
    };

    // GATE — deterministic, eliminates an already-invalid upstream pair
    // (or a mismatched CFD/structural pair) before any optimization
    // reasoning is attempted.
    const gate = evaluateOptimizationGate({
      cfdCd: cfdForces?.cd ?? 0,
      structuralSafetyFactor: structuralSpec.safety_factor,
      cfdSourceCadDesignId: cfdAnalysis.source_cad_design_id,
      structuralSourceCadDesignId: structural.source_cad_design_id,
    });
    if (gate.eliminated) {
      throw new InvalidOptimizationInputError(
        `Inputs were eliminated by the hard-constraint gate: ${gate.reasons.join("; ")}`,
      );
    }

    // GENERATE — the one LLM call in this stage. generateOptimizationAnalysis
    // is a plain async function (not a createServerFn), same reasoning
    // every prior bay's generation file gives.
    const generation = await generateOptimizationAnalysis({
      cfdForces,
      cfdCoefficients,
      structuralStress,
      safetyFactor: structuralSpec.safety_factor ?? 0,
      riskFlags: structuralSpec.risk_flags,
      constraints,
    });

    // SCORE — deterministic, pipeline-owned (see
    // computeOptimizationConfidence's own comment). The raw LLM output is
    // still captured in the run's output_snapshot below for traceability.
    const finalSourceWasMock =
      cfdAnalysis.source_was_mock || structuralSpec.source_was_mock || generation.mock;
    const confidenceScore = computeOptimizationConfidence(
      cfdAnalysis.confidence_score ?? 0,
      structuralSpec.confidence_score,
      generation.overallOptimizationScore,
      generation.riskFlags,
      finalSourceWasMock,
    );

    const disclaimerParts: string[] = [];
    if (cfdAnalysis.source_was_mock) {
      disclaimerParts.push(
        "⚠ Source CFD result is Phase 1 (LLM reasoning only, no real solver run).",
      );
    }
    if (structuralSpec.source_was_mock) {
      disclaimerParts.push(
        "⚠ Source structural result was generated from a mock fallback (no real LLM output).",
      );
    }
    const reasoningSummary =
      disclaimerParts.length > 0
        ? `${disclaimerParts.join(" ")} ${generation.reasoningSummary}`
        : generation.reasoningSummary;

    const specRow = await persistOptimizationSpec(optimizationId, {
      objectiveScores: generation.objectiveScores as unknown as Record<string, unknown>,
      tradeOffAnalysis: generation.tradeOffAnalysis,
      recommendedAdjustments: generation.recommendedAdjustments as unknown as Record<
        string,
        unknown
      >[],
      overallOptimizationScore: generation.overallOptimizationScore,
      riskFlags: generation.riskFlags,
      confidenceScore,
      reasoningSummary,
      sourceWasMock: finalSourceWasMock,
    });
    await updateOptimizationStatus(optimizationId, "spec_ready", confidenceScore);

    await logOptimizationStageRun(
      optimizationId,
      "output_generation",
      { cfdAnalysisId, structuralId, cfdForces, cfdCoefficients, structuralStress, constraints },
      { gate, generation, confidenceScore, persistedSpecId: specRow.id, version: specRow.version },
      "success",
      Date.now() - start,
    );

    return {
      optimizationId,
      optimizationCode: optimization.optimization_code,
      objectiveScores: generation.objectiveScores,
      tradeOffAnalysis: generation.tradeOffAnalysis,
      recommendedAdjustments: generation.recommendedAdjustments,
      overallOptimizationScore: generation.overallOptimizationScore,
      riskFlags: generation.riskFlags,
      confidenceScore,
      reasoningSummary,
      sourceWasMock: finalSourceWasMock,
      specVersion: specRow.version,
    };
  } catch (err) {
    throw await recordStageFailure(optimizationId, "output_generation", err);
  }
}

// ── "Your optimizations" list ────────────────────────────────────────────

export interface OptimizationListEntry {
  optimizationId: string;
  optimizationCode: string;
  sourceCfdAnalysisId: string;
  sourceStructuralId: string;
  status: OptimizationStatus;
  createdAt: string;
  objectiveScores: ObjectiveScores | null;
  tradeOffAnalysis: string | null;
  recommendedAdjustments: RecommendedAdjustment[] | null;
  overallOptimizationScore: number | null;
  riskFlags: string[] | null;
  confidenceScore: number | null;
  reasoningSummary: string | null;
  sourceWasMock: boolean | null;
}

export async function listOptimizationsForUser(userId: string): Promise<OptimizationListEntry[]> {
  const optimizations = await listUserOptimizations(userId);
  const ids = optimizations.map((o) => o.id);
  const specs = await getSpecsForOptimizations(ids);
  const specsByOptimization = new Map(specs.map((s) => [s.optimization_id, s]));
  return optimizations.map((o): OptimizationListEntry => {
    const spec = specsByOptimization.get(o.id);
    return {
      optimizationId: o.id,
      optimizationCode: o.optimization_code,
      sourceCfdAnalysisId: o.source_cfd_analysis_id,
      sourceStructuralId: o.source_structural_id,
      status: o.status,
      createdAt: o.created_at,
      objectiveScores: spec ? (spec.objective_scores as unknown as ObjectiveScores) : null,
      tradeOffAnalysis: spec?.trade_off_analysis ?? null,
      recommendedAdjustments: spec
        ? (spec.recommended_adjustments as unknown as RecommendedAdjustment[])
        : null,
      overallOptimizationScore: spec?.overall_optimization_score ?? null,
      riskFlags: spec?.risk_flags ?? null,
      confidenceScore: spec?.confidence_score ?? null,
      reasoningSummary: spec?.reasoning_summary ?? null,
      sourceWasMock: spec?.source_was_mock ?? null,
    };
  });
}
