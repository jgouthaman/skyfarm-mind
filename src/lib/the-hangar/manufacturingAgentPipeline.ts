import { getValidation, getSpecsForValidations } from "./validationPersistence.ts";
import { getOptimization } from "./optimizationPersistence.ts";
import { getStructural } from "./structuralPersistence.ts";
import { evaluateManufacturingGate } from "./manufacturingRules.ts";
import { generateManufacturingAnalysis } from "./manufacturingGeneration.ts";
import type { DFMIssue, BuildPlanStep, BOMItem } from "./manufacturingGeneration.ts";
import {
  createManufacturing,
  getManufacturing,
  updateManufacturingStatus,
  persistManufacturingSpec,
  listUserManufacturings,
  getSpecsForManufacturings,
  logManufacturingStageRun,
  type ManufacturingRunStage,
  type ManufacturingStatus,
  type HangarManufacturingRow,
} from "./manufacturingPersistence.ts";

// Manufacturing Agent (Bay 11) orchestrator -- mirrors materialsAgentPipeline.ts's
// structure/style exactly. Bay 11 fans in from ONE upstream bay (Bay 09
// only), same single-source shape Bay 10 (Materials) itself uses -- Bay 11
// is a SIBLING of Bay 10, not downstream of it. The carried-through CAD
// design reference is read THREE hops upstream (validation -> optimization
// -> structural row -> its own source_cad_design_id) via getOptimization
// and getStructural -- only the id is carried, not full geometry, per
// ManufacturingAgent.md Section 1's own Phase 1 scope note.
//
// No "assertManufacturingOwnership" export exists yet either -- same rule
// every prior bay's pipeline file follows.
//
// Implements the one real stage (Sections 11.1-11.3 combined --
// Manufacturability Review, Build Planning, Output Generation) as one
// complete vertical slice, same reasoning every prior bay's single-call
// stage already gives.

export class ManufacturingAgentError extends Error {
  constructor(
    message: string,
    public readonly manufacturingId: string,
    public readonly stage: ManufacturingRunStage,
  ) {
    super(message);
    this.name = "ManufacturingAgentError";
  }
}

export class InvalidManufacturingInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidManufacturingInputError";
  }
}

// Local and unexported -- no downstream bay exists yet to need this
// exported, matching every prior bay's own rule.
async function assertManufacturingOwnership(
  manufacturingId: string,
  userId: string,
): Promise<HangarManufacturingRow> {
  const manufacturing = await getManufacturing(manufacturingId);
  if (!manufacturing) {
    throw new Error(`No Hangar_Manufacturings row found for manufacturingId "${manufacturingId}"`);
  }
  if (manufacturing.user_id !== userId) {
    throw new Error(`Manufacturing "${manufacturing.id}" does not belong to user "${userId}"`);
  }
  return manufacturing;
}

async function recordStageFailure(
  manufacturingId: string,
  stage: ManufacturingRunStage,
  error: unknown,
): Promise<ManufacturingAgentError> {
  const message = error instanceof Error ? error.message : String(error);
  await logManufacturingStageRun(manufacturingId, stage, null, null, "error", 0, message);
  await updateManufacturingStatus(manufacturingId, "error").catch(() => {});
  return new ManufacturingAgentError(message, manufacturingId, stage);
}

// -- Stage -- Manufacturability Review -------------------------------------

export interface ManufacturingRequest {
  userId: string;
  validationId: string;
}

export interface ManufacturingResult {
  manufacturingId: string;
  manufacturingCode: string;
  dfmReport: DFMIssue[];
  buildPlan: BuildPlanStep[];
  billOfMaterials: BOMItem[];
  confidenceScore: number;
  reasoningSummary: string;
  sourceWasMock: boolean;
  specVersion: number;
}

// No self-reported LLM confidence is trusted here either -- matches every
// prior bay's established convention. Base is the upstream validation
// result's own confidence score, then penalized against DFM issue count
// and an empty BOM, same shape computeMaterialsConfidence already uses.
function computeManufacturingConfidence(
  validationConfidence: number,
  dfmIssueCount: number,
  bomItemCount: number,
  sourceWasMock: boolean,
): number {
  let score = validationConfidence;
  if (bomItemCount === 0) score -= 0.2;
  score -= 0.05 * dfmIssueCount;
  if (sourceWasMock) score -= 0.3;
  return Math.max(0, Math.min(1, score));
}

export async function runManufacturabilityReviewStage(
  request: ManufacturingRequest,
): Promise<ManufacturingResult> {
  const { userId, validationId } = request;
  if (!validationId) {
    throw new InvalidManufacturingInputError(
      "A spec-ready validation result must be selected before running manufacturability review.",
    );
  }

  const validation = await getValidation(validationId);
  if (!validation || validation.user_id !== userId) {
    throw new InvalidManufacturingInputError("No accessible validation result found for this id.");
  }
  if (validation.status !== "spec_ready") {
    throw new InvalidManufacturingInputError("Source validation result is not spec-ready.");
  }

  const [validationSpec] = await getSpecsForValidations([validationId]);
  if (!validationSpec) {
    throw new InvalidManufacturingInputError(
      "No spec has been generated for this validation result yet.",
    );
  }

  // Three hops upstream for the carried-through CAD design reference id --
  // see file header comment. Only the id is carried, not full geometry.
  const optimization = await getOptimization(validation.source_optimization_id);
  const structural = optimization ? await getStructural(optimization.source_structural_id) : null;
  const cadDesignId = structural?.source_cad_design_id ?? null;

  // Known, disclosed gap: mission constraints have no real source anywhere
  // in the Concept/Aircraft Design/CAD chain, same reasoning every prior
  // bay's pipeline already documents. Always null.
  const missionConstraints = { maxLoadFactor: null, materialClass: null };

  const manufacturing = await createManufacturing(userId, validationId);
  const manufacturingId = manufacturing.id;
  await updateManufacturingStatus(manufacturingId, "processing");

  const start = Date.now();
  try {
    // GATE -- deterministic, eliminates an already-invalid, unfinished, or
    // hard-failed upstream result before any manufacturing reasoning is
    // attempted.
    const gate = evaluateManufacturingGate({
      validationVerdict: validationSpec.verdict,
      validationStatus: validation.status,
      validationReadinessScore: validationSpec.readiness_score,
    });
    if (gate.eliminated) {
      throw new InvalidManufacturingInputError(
        `Inputs were eliminated by the hard-constraint gate: ${gate.reasons.join("; ")}`,
      );
    }

    // GENERATE -- the one LLM call in this stage.
    const generation = await generateManufacturingAnalysis({
      validationVerdict: validationSpec.verdict,
      complianceMatrix: validationSpec.compliance_matrix as unknown as {
        standard: string;
        status: string;
        notes: string;
      }[],
      nonConformances: validationSpec.non_conformances as unknown as {
        issue: string;
        severity: string;
        fixReference: string;
      }[],
      readinessScore: validationSpec.readiness_score ?? 0,
      cadDesignId,
      missionConstraints,
    });

    // SCORE -- deterministic, pipeline-owned. The raw LLM output is still
    // captured in the run's output_snapshot below for traceability.
    const finalSourceWasMock = validationSpec.source_was_mock || generation.mock;
    const confidenceScore = computeManufacturingConfidence(
      validationSpec.confidence_score ?? 0,
      generation.dfmReport.length,
      generation.billOfMaterials.length,
      finalSourceWasMock,
    );

    const disclaimerParts: string[] = [];
    if (validationSpec.source_was_mock) {
      disclaimerParts.push(
        "⚠ Source validation result was generated from a mock fallback (no real LLM output).",
      );
    }
    const reasoningSummary =
      disclaimerParts.length > 0
        ? `${disclaimerParts.join(" ")} ${generation.reasoningSummary}`
        : generation.reasoningSummary;

    const specRow = await persistManufacturingSpec(manufacturingId, {
      dfmReport: generation.dfmReport as unknown as Record<string, unknown>[],
      buildPlan: generation.buildPlan as unknown as Record<string, unknown>[],
      billOfMaterials: generation.billOfMaterials as unknown as Record<string, unknown>[],
      confidenceScore,
      reasoningSummary,
      sourceWasMock: finalSourceWasMock,
    });
    await updateManufacturingStatus(manufacturingId, "spec_ready", confidenceScore);

    await logManufacturingStageRun(
      manufacturingId,
      "output_generation",
      { validationId, cadDesignId, missionConstraints },
      { gate, generation, confidenceScore, persistedSpecId: specRow.id, version: specRow.version },
      "success",
      Date.now() - start,
    );

    return {
      manufacturingId,
      manufacturingCode: manufacturing.manufacturing_code,
      dfmReport: generation.dfmReport,
      buildPlan: generation.buildPlan,
      billOfMaterials: generation.billOfMaterials,
      confidenceScore,
      reasoningSummary,
      sourceWasMock: finalSourceWasMock,
      specVersion: specRow.version,
    };
  } catch (err) {
    throw await recordStageFailure(manufacturingId, "output_generation", err);
  }
}

// -- "Your manufacturings" list ---------------------------------------------

export interface ManufacturingListEntry {
  manufacturingId: string;
  manufacturingCode: string;
  sourceValidationId: string;
  status: ManufacturingStatus;
  createdAt: string;
  dfmReport: DFMIssue[] | null;
  buildPlan: BuildPlanStep[] | null;
  billOfMaterials: BOMItem[] | null;
  confidenceScore: number | null;
  reasoningSummary: string | null;
  sourceWasMock: boolean | null;
}

export async function listManufacturingsForUser(
  userId: string,
): Promise<ManufacturingListEntry[]> {
  const manufacturings = await listUserManufacturings(userId);
  const ids = manufacturings.map((m) => m.id);
  const specs = await getSpecsForManufacturings(ids);
  const specsByManufacturing = new Map(specs.map((s) => [s.manufacturing_id, s]));
  return manufacturings.map((m): ManufacturingListEntry => {
    const spec = specsByManufacturing.get(m.id);
    return {
      manufacturingId: m.id,
      manufacturingCode: m.manufacturing_code,
      sourceValidationId: m.source_validation_id,
      status: m.status,
      createdAt: m.created_at,
      dfmReport: spec ? (spec.dfm_report as unknown as DFMIssue[]) : null,
      buildPlan: spec ? (spec.build_plan as unknown as BuildPlanStep[]) : null,
      billOfMaterials: spec ? (spec.bill_of_materials as unknown as BOMItem[]) : null,
      confidenceScore: spec?.confidence_score ?? null,
      reasoningSummary: spec?.reasoning_summary ?? null,
      sourceWasMock: spec?.source_was_mock ?? null,
    };
  });
}
