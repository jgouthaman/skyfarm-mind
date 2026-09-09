import { getOptimization, getSpecsForOptimizations } from "./optimizationPersistence.ts";
import { getSpecsForStructurals } from "./structuralPersistence.ts";
import { evaluateValidationGate } from "./validationRules.ts";
import {
  generateValidationAnalysis,
  type ComplianceMatrixEntry,
  type NonConformance,
} from "./validationGeneration.ts";
import {
  createValidation,
  getValidation,
  updateValidationStatus,
  persistValidationSpec,
  listUserValidations,
  getSpecsForValidations,
  logValidationStageRun,
  type ValidationRunStage,
  type ValidationStatus,
  type HangarValidationRow,
} from "./validationPersistence.ts";

// Validation Agent (Bay 09) orchestrator — mirrors optimizationAgentPipeline.ts's
// structure/style exactly. Unlike Bay 08, Bay 09 fans in from ONE upstream
// bay (Bay 08 only), not two — so there's a single ownership check inline
// against the optimization row, not two. The structural safety factor is
// still read one hop further upstream via getSpecsForStructurals against
// Bay 08's own source_structural_id, since ValidationAgent.md Section 1
// carries that value through rather than re-deriving it.
//
// No "assertValidationOwnership" export exists yet either — same rule
// every prior bay's pipeline file follows: it stays local/unexported until
// a downstream bay (Bay 10, not yet scoped) actually needs it.
//
// Implements the one real stage (Sections 9.1-9.3 combined — Compliance
// Checking, Validation Execution, Output Generation) as one complete
// vertical slice, same reasoning every prior bay's single-call stage
// already gives. Section 9.4 (Output Interface) is likewise just this same
// JSON, handed to Bay 10 later, not a distinct stage here.

export class ValidationAgentError extends Error {
  constructor(
    message: string,
    public readonly validationId: string,
    public readonly stage: ValidationRunStage,
  ) {
    super(message);
    this.name = "ValidationAgentError";
  }
}

export class InvalidValidationInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidValidationInputError";
  }
}

// Local and unexported — no Bay 10 exists yet to need this exported,
// matching every prior bay's own rule for when to export an ownership
// check.
async function assertValidationOwnership(
  validationId: string,
  userId: string,
): Promise<HangarValidationRow> {
  const validation = await getValidation(validationId);
  if (!validation) {
    throw new Error(`No Hangar_Validations row found for validationId "${validationId}"`);
  }
  if (validation.user_id !== userId) {
    throw new Error(`Validation "${validation.id}" does not belong to user "${userId}"`);
  }
  return validation;
}

async function recordStageFailure(
  validationId: string,
  stage: ValidationRunStage,
  error: unknown,
): Promise<ValidationAgentError> {
  const message = error instanceof Error ? error.message : String(error);
  await logValidationStageRun(validationId, stage, null, null, "error", 0, message);
  await updateValidationStatus(validationId, "error").catch(() => {});
  return new ValidationAgentError(message, validationId, stage);
}

// ── Stage — Compliance Validation ────────────────────────────────────────

export interface ValidationRequest {
  userId: string;
  optimizationId: string;
}

export interface ValidationResult {
  validationId: string;
  validationCode: string;
  verdict: "PASS" | "FAIL" | "CONDITIONAL";
  complianceMatrix: ComplianceMatrixEntry[];
  nonConformances: NonConformance[];
  readinessScore: number;
  riskFlags: string[];
  confidenceScore: number;
  reasoningSummary: string;
  sourceWasMock: boolean;
  specVersion: number;
}

// No self-reported LLM confidence is trusted here either — matches every
// prior bay's established convention. Base is the upstream optimization
// result's own confidence score (one source this time, not an average of
// two), then penalized against the readiness score and risk flags, same
// shape computeOptimizationConfidence already uses.
function computeValidationConfidence(
  optimizationConfidence: number,
  readinessScore: number,
  riskFlags: string[],
  sourceWasMock: boolean,
): number {
  let score = optimizationConfidence;
  if (readinessScore < 0.5) score -= 0.2;
  score -= 0.05 * riskFlags.length;
  if (sourceWasMock) score -= 0.3;
  return Math.max(0, Math.min(1, score));
}

export async function runComplianceValidationStage(
  request: ValidationRequest,
): Promise<ValidationResult> {
  const { userId, optimizationId } = request;
  if (!optimizationId) {
    throw new InvalidValidationInputError(
      "A spec-ready optimization result must be selected before running validation.",
    );
  }

  // Never trust client-supplied ids — same reasoning every prior bay's
  // ownership check already applies. Bay 09 reads Bay 08's row directly
  // (see file header comment) rather than through an exported
  // assert*Ownership from Bay 08.
  const optimization = await getOptimization(optimizationId);
  if (!optimization || optimization.user_id !== userId) {
    throw new InvalidValidationInputError("No accessible optimization result found for this id.");
  }
  if (optimization.status !== "spec_ready") {
    throw new InvalidValidationInputError("Source optimization result is not spec-ready.");
  }

  const [optimizationSpec] = await getSpecsForOptimizations([optimizationId]);
  if (!optimizationSpec) {
    throw new InvalidValidationInputError("No spec has been generated for this optimization result yet.");
  }

  const [structuralSpec] = await getSpecsForStructurals([
    optimization.source_structural_id,
  ]);
  if (!structuralSpec) {
    throw new InvalidValidationInputError(
      "No structural spec found for this optimization's source structural analysis.",
    );
  }

  // Known, disclosed gap: mission constraints have no real source anywhere
  // in the Concept/Aircraft Design/CAD chain, same reasoning every prior
  // bay's pipeline already documents. Always null —
  // validationGeneration.ts's system prompt handles a null constraints
  // object by reasoning qualitatively and saying so.
  const missionConstraints = { maxLoadFactor: null, materialClass: null };

  // Known, disclosed gap: no live regulatory clause database exists
  // anywhere in the chain yet, same reasoning every prior bay's pipeline
  // already documents for its own missing upstream source. Always empty —
  // validationGeneration.ts's system prompt handles an empty standards
  // list by reasoning qualitatively and saying so, same as it does for a
  // null missionConstraints object.
  const applicableStandards: string[] = [];

  const validation = await createValidation(userId, optimizationId);
  const validationId = validation.id;
  await updateValidationStatus(validationId, "processing");

  const start = Date.now();
  try {
    const objectiveScores = optimizationSpec.objective_scores as unknown as {
      weight: number;
      drag: number;
      cost: number;
      safety: number;
    };

    // GATE — deterministic, eliminates an already-invalid upstream result
    // (or one resting on an unsound structural safety factor) before any
    // validation reasoning is attempted.
    const gate = evaluateValidationGate({
      optimizationScore: optimizationSpec.overall_optimization_score,
      optimizationStatus: optimization.status,
      structuralSafetyFactor: structuralSpec.safety_factor,
    });
    if (gate.eliminated) {
      throw new InvalidValidationInputError(
        `Inputs were eliminated by the hard-constraint gate: ${gate.reasons.join("; ")}`,
      );
    }

    // GENERATE — the one LLM call in this stage. generateValidationAnalysis
    // is a plain async function (not a createServerFn), same reasoning
    // every prior bay's generation file gives.
    const generation = await generateValidationAnalysis({
      objectiveScores,
      tradeOffAnalysis: optimizationSpec.trade_off_analysis,
      overallOptimizationScore: optimizationSpec.overall_optimization_score ?? 0,
      optimizationRiskFlags: optimizationSpec.risk_flags,
      structuralSafetyFactor: structuralSpec.safety_factor ?? 0,
      missionConstraints,
      applicableStandards,
    });

    // SCORE — deterministic, pipeline-owned (see
    // computeValidationConfidence's own comment). The raw LLM output is
    // still captured in the run's output_snapshot below for traceability.
    const finalSourceWasMock = optimizationSpec.source_was_mock || generation.mock;
    const confidenceScore = computeValidationConfidence(
      optimizationSpec.confidence_score ?? 0,
      generation.readinessScore,
      generation.riskFlags,
      finalSourceWasMock,
    );

    const disclaimerParts: string[] = [];
    if (optimizationSpec.source_was_mock) {
      disclaimerParts.push(
        "⚠ Source optimization result was generated from a mock fallback (no real LLM output).",
      );
    }
    const reasoningSummary =
      disclaimerParts.length > 0
        ? `${disclaimerParts.join(" ")} ${generation.reasoningSummary}`
        : generation.reasoningSummary;

    const specRow = await persistValidationSpec(validationId, {
      verdict: generation.verdict,
      complianceMatrix: generation.complianceMatrix as unknown as Record<string, unknown>[],
      nonConformances: generation.nonConformances as unknown as Record<string, unknown>[],
      readinessScore: generation.readinessScore,
      riskFlags: generation.riskFlags,
      confidenceScore,
      reasoningSummary,
      sourceWasMock: finalSourceWasMock,
    });
    await updateValidationStatus(validationId, "spec_ready", confidenceScore);

    await logValidationStageRun(
      validationId,
      "output_generation",
      { optimizationId, objectiveScores, missionConstraints, applicableStandards },
      { gate, generation, confidenceScore, persistedSpecId: specRow.id, version: specRow.version },
      "success",
      Date.now() - start,
    );

    return {
      validationId,
      validationCode: validation.validation_code,
      verdict: generation.verdict,
      complianceMatrix: generation.complianceMatrix,
      nonConformances: generation.nonConformances,
      readinessScore: generation.readinessScore,
      riskFlags: generation.riskFlags,
      confidenceScore,
      reasoningSummary,
      sourceWasMock: finalSourceWasMock,
      specVersion: specRow.version,
    };
  } catch (err) {
    throw await recordStageFailure(validationId, "output_generation", err);
  }
}

// ── "Your validations" list ──────────────────────────────────────────────

export interface ValidationListEntry {
  validationId: string;
  validationCode: string;
  sourceOptimizationId: string;
  status: ValidationStatus;
  createdAt: string;
  verdict: "PASS" | "FAIL" | "CONDITIONAL" | null;
  complianceMatrix: ComplianceMatrixEntry[] | null;
  nonConformances: NonConformance[] | null;
  readinessScore: number | null;
  riskFlags: string[] | null;
  confidenceScore: number | null;
  reasoningSummary: string | null;
  sourceWasMock: boolean | null;
}

export async function listValidationsForUser(userId: string): Promise<ValidationListEntry[]> {
  const validations = await listUserValidations(userId);
  const ids = validations.map((v) => v.id);
  const specs = await getSpecsForValidations(ids);
  const specsByValidation = new Map(specs.map((s) => [s.validation_id, s]));
  return validations.map((v): ValidationListEntry => {
    const spec = specsByValidation.get(v.id);
    return {
      validationId: v.id,
      validationCode: v.validation_code,
      sourceOptimizationId: v.source_optimization_id,
      status: v.status,
      createdAt: v.created_at,
      verdict: spec?.verdict ?? null,
      complianceMatrix: spec
        ? (spec.compliance_matrix as unknown as ComplianceMatrixEntry[])
        : null,
      nonConformances: spec ? (spec.non_conformances as unknown as NonConformance[]) : null,
      readinessScore: spec?.readiness_score ?? null,
      riskFlags: spec?.risk_flags ?? null,
      confidenceScore: spec?.confidence_score ?? null,
      reasoningSummary: spec?.reasoning_summary ?? null,
      sourceWasMock: spec?.source_was_mock ?? null,
    };
  });
}
