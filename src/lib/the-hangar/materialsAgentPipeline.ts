import { getValidation, getSpecsForValidations } from "./validationPersistence.ts";
import { getOptimization } from "./optimizationPersistence.ts";
import { getSpecsForStructurals } from "./structuralPersistence.ts";
import { evaluateMaterialsGate } from "./materialsRules.ts";
import { generateMaterialsAnalysis, type MaterialRecommendation } from "./materialsGeneration.ts";
import {
  createMaterials,
  getMaterials,
  updateMaterialsStatus,
  persistMaterialsSpec,
  listUserMaterials,
  getSpecsForMaterials,
  logMaterialsStageRun,
  type MaterialsRunStage,
  type MaterialsStatus,
  type HangarMaterialsRow,
} from "./materialsPersistence.ts";

// Materials Agent (Bay 10) orchestrator -- mirrors validationAgentPipeline.ts's
// structure/style exactly. Bay 10 fans in from ONE upstream bay (Bay 09
// only), same single-source shape Bay 09 itself uses against Bay 08 -- so
// there's a single ownership check inline against the validation row, not
// two. The structural safety factor is read TWO hops further upstream
// (validation -> optimization -> structural spec) via getOptimization and
// getSpecsForStructurals, since MaterialsAgent.md Section 1 carries that
// value through rather than re-deriving it. This is one hop deeper than
// Bay 09's own single-hop carry-through, but the same "read the upstream
// getter directly, don't duplicate a wrapper" principle applies at every
// hop.
//
// No "assertMaterialsOwnership" export exists yet either -- same rule
// every prior bay's pipeline file follows: it stays local/unexported until
// a downstream bay actually needs it.
//
// Implements the one real stage (Sections 10.1-10.3 combined -- Requirement
// Mapping, Material Selection, Output Generation) as one complete vertical
// slice, same reasoning every prior bay's single-call stage already gives.
// Section 10.4 (Output Interface) is likewise just this same JSON, handed
// to downstream consumers later, not a distinct stage here.

export class MaterialsAgentError extends Error {
  constructor(
    message: string,
    public readonly materialsId: string,
    public readonly stage: MaterialsRunStage,
  ) {
    super(message);
    this.name = "MaterialsAgentError";
  }
}

export class InvalidMaterialsInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidMaterialsInputError";
  }
}

// Local and unexported -- no downstream bay exists yet to need this
// exported, matching every prior bay's own rule for when to export an
// ownership check.
async function assertMaterialsOwnership(
  materialsId: string,
  userId: string,
): Promise<HangarMaterialsRow> {
  const materials = await getMaterials(materialsId);
  if (!materials) {
    throw new Error(`No Hangar_Materials row found for materialsId "${materialsId}"`);
  }
  if (materials.user_id !== userId) {
    throw new Error(`Materials "${materials.id}" does not belong to user "${userId}"`);
  }
  return materials;
}

async function recordStageFailure(
  materialsId: string,
  stage: MaterialsRunStage,
  error: unknown,
): Promise<MaterialsAgentError> {
  const message = error instanceof Error ? error.message : String(error);
  await logMaterialsStageRun(materialsId, stage, null, null, "error", 0, message);
  await updateMaterialsStatus(materialsId, "error").catch(() => {});
  return new MaterialsAgentError(message, materialsId, stage);
}

// -- Stage -- Material Selection -----------------------------------------

export interface MaterialsRequest {
  userId: string;
  validationId: string;
}

export interface MaterialsResult {
  materialsId: string;
  materialsCode: string;
  recommendations: MaterialRecommendation[];
  rationale: string;
  sourcingRiskFlags: string[];
  confidenceScore: number;
  reasoningSummary: string;
  sourceWasMock: boolean;
  specVersion: number;
}

// No self-reported LLM confidence is trusted here either -- matches every
// prior bay's established convention. Base is the upstream validation
// result's own confidence score, then penalized against having zero
// recommendations and sourcing risk flags, same shape
// computeValidationConfidence already uses.
function computeMaterialsConfidence(
  validationConfidence: number,
  recommendationCount: number,
  sourcingRiskFlags: string[],
  sourceWasMock: boolean,
): number {
  let score = validationConfidence;
  if (recommendationCount === 0) score -= 0.2;
  score -= 0.05 * sourcingRiskFlags.length;
  if (sourceWasMock) score -= 0.3;
  return Math.max(0, Math.min(1, score));
}

export async function runMaterialSelectionStage(
  request: MaterialsRequest,
): Promise<MaterialsResult> {
  const { userId, validationId } = request;
  if (!validationId) {
    throw new InvalidMaterialsInputError(
      "A spec-ready validation result must be selected before running materials selection.",
    );
  }

  // Never trust client-supplied ids -- same reasoning every prior bay's
  // ownership check already applies. Bay 10 reads Bay 09's row directly
  // (see file header comment) rather than through an exported
  // assert*Ownership from Bay 09.
  const validation = await getValidation(validationId);
  if (!validation || validation.user_id !== userId) {
    throw new InvalidMaterialsInputError("No accessible validation result found for this id.");
  }
  if (validation.status !== "spec_ready") {
    throw new InvalidMaterialsInputError("Source validation result is not spec-ready.");
  }

  const [validationSpec] = await getSpecsForValidations([validationId]);
  if (!validationSpec) {
    throw new InvalidMaterialsInputError("No spec has been generated for this validation result yet.");
  }

  // Two hops upstream for the carried-through structural safety factor --
  // see file header comment.
  const optimization = await getOptimization(validation.source_optimization_id);
  const structuralSafetyFactor = optimization
    ? (await getSpecsForStructurals([optimization.source_structural_id]))[0]?.safety_factor ?? null
    : null;

  // Known, disclosed gap: mission constraints have no real source anywhere
  // in the Concept/Aircraft Design/CAD chain, same reasoning every prior
  // bay's pipeline already documents. Always null.
  const missionConstraints = { maxLoadFactor: null, materialClass: null };

  // Phase 1 known gaps: no live operating-environment or material-catalog
  // source exists anywhere upstream yet -- see MaterialsAgent.md Section 1.
  const operatingEnvironment: string[] = [];
  const materialCatalog: string[] = [];

  const materials = await createMaterials(userId, validationId);
  const materialsId = materials.id;
  await updateMaterialsStatus(materialsId, "processing");

  const start = Date.now();
  try {
    // GATE -- deterministic, eliminates an already-invalid, unfinished, or
    // hard-failed upstream result before any materials reasoning is
    // attempted.
    const gate = evaluateMaterialsGate({
      validationVerdict: validationSpec.verdict,
      validationStatus: validation.status,
      validationReadinessScore: validationSpec.readiness_score,
    });
    if (gate.eliminated) {
      throw new InvalidMaterialsInputError(
        `Inputs were eliminated by the hard-constraint gate: ${gate.reasons.join("; ")}`,
      );
    }

    // GENERATE -- the one LLM call in this stage. generateMaterialsAnalysis
    // is a plain async function (not a createServerFn), same reasoning
    // every prior bay's generation file gives.
    const generation = await generateMaterialsAnalysis({
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
      structuralSafetyFactor,
      missionConstraints,
      operatingEnvironment,
      materialCatalog,
    });

    // SCORE -- deterministic, pipeline-owned (see
    // computeMaterialsConfidence's own comment). The raw LLM output is
    // still captured in the run's output_snapshot below for traceability.
    const finalSourceWasMock = validationSpec.source_was_mock || generation.mock;
    const confidenceScore = computeMaterialsConfidence(
      validationSpec.confidence_score ?? 0,
      generation.recommendations.length,
      generation.sourcingRiskFlags,
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

    const specRow = await persistMaterialsSpec(materialsId, {
      recommendations: generation.recommendations as unknown as Record<string, unknown>[],
      rationale: generation.rationale,
      sourcingRiskFlags: generation.sourcingRiskFlags,
      confidenceScore,
      reasoningSummary,
      sourceWasMock: finalSourceWasMock,
    });
    await updateMaterialsStatus(materialsId, "spec_ready", confidenceScore);

    await logMaterialsStageRun(
      materialsId,
      "output_generation",
      { validationId, structuralSafetyFactor, missionConstraints, operatingEnvironment, materialCatalog },
      { gate, generation, confidenceScore, persistedSpecId: specRow.id, version: specRow.version },
      "success",
      Date.now() - start,
    );

    return {
      materialsId,
      materialsCode: materials.materials_code,
      recommendations: generation.recommendations,
      rationale: generation.rationale,
      sourcingRiskFlags: generation.sourcingRiskFlags,
      confidenceScore,
      reasoningSummary,
      sourceWasMock: finalSourceWasMock,
      specVersion: specRow.version,
    };
  } catch (err) {
    throw await recordStageFailure(materialsId, "output_generation", err);
  }
}

// -- "Your materials" list -------------------------------------------------

export interface MaterialsListEntry {
  materialsId: string;
  materialsCode: string;
  sourceValidationId: string;
  status: MaterialsStatus;
  createdAt: string;
  recommendations: MaterialRecommendation[] | null;
  rationale: string | null;
  sourcingRiskFlags: string[] | null;
  confidenceScore: number | null;
  reasoningSummary: string | null;
  sourceWasMock: boolean | null;
}

export async function listMaterialsForUser(userId: string): Promise<MaterialsListEntry[]> {
  const materialsList = await listUserMaterials(userId);
  const ids = materialsList.map((m) => m.id);
  const specs = await getSpecsForMaterials(ids);
  const specsByMaterials = new Map(specs.map((s) => [s.materials_id, s]));
  return materialsList.map((m): MaterialsListEntry => {
    const spec = specsByMaterials.get(m.id);
    return {
      materialsId: m.id,
      materialsCode: m.materials_code,
      sourceValidationId: m.source_validation_id,
      status: m.status,
      createdAt: m.created_at,
      recommendations: spec
        ? (spec.recommendations as unknown as MaterialRecommendation[])
        : null,
      rationale: spec?.rationale ?? null,
      sourcingRiskFlags: spec?.sourcing_risk_flags ?? null,
      confidenceScore: spec?.confidence_score ?? null,
      reasoningSummary: spec?.reasoning_summary ?? null,
      sourceWasMock: spec?.source_was_mock ?? null,
    };
  });
}
