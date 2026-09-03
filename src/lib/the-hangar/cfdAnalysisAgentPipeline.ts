import { assertCADDesignOwnership } from "./cadDesignAgentPipeline.ts";
import { getCADDesign, getSpecsForCADDesigns } from "./cadDesignPersistence.ts";
import { evaluateCFDAnalysisGate } from "./cfdAnalysisRules.ts";
import {
  generateCFDAnalysis,
  type CFDForces,
  type CFDCoefficients,
  type CFDFlowFields,
} from "./cfdAnalysisGeneration.ts";
import {
  createCFDAnalysis,
  getCFDAnalysis,
  persistCFDAnalysisInput,
  updateCFDAnalysisResult,
  listUserCFDAnalyses,
  logCFDAnalysisStageRun,
  type CFDAnalysisRunStage,
  type CFDAnalysisStatus,
  type HangarCFDAnalysisRow,
} from "./cfdAnalysisPersistence.ts";

// CFD Agent (Bay 06) Phase 1 orchestrator — mirrors
// cadDesignAgentPipeline.ts's structure/style. Implements the one Phase 1
// stage (Output Generation, CFDAgent.md Section 3.3) as a complete vertical
// slice: ownership check, upstream-status gate, the deterministic
// pre-generation gate, the one LLM call, persistence. Sections 3.1/3.2
// (Mesh Generation, Solver Setup & Execution) are explicitly "reasoning
// only" per the spec — folded into the single generation call's prompt
// rather than built as separate stages/DB rows, since Phase 1 never
// actually runs a mesher or solver to produce intermediate state worth a
// stage boundary of its own; Section 3.4's "Output Interface" is likewise
// just this same JSON, handed to Bay 09 later, not a distinct stage here.
//
// The upstream Hangar_CADDesigns read reuses cadDesignAgentPipeline.ts's
// own assertCADDesignOwnership (exported specifically for Bay 05's
// benefit, and reused again here) plus cadDesignPersistence.ts's
// getCADDesign directly, rather than duplicating either here.
//
// Per CFDAgent.md Section 1: Bay 05's real output (a stubbed default
// config for Phase 1) is not read here at all — Section 10 resolves this
// explicitly, so there is no simDesignAgentPipeline import in this file.

export class CFDAnalysisAgentError extends Error {
  constructor(
    message: string,
    public readonly cfdAnalysisId: string,
    public readonly stage: CFDAnalysisRunStage,
  ) {
    super(message);
    this.name = "CFDAnalysisAgentError";
  }
}

export class InvalidCFDAnalysisInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidCFDAnalysisInputError";
  }
}

// Local/unexported — CFDAgent.md Section 5/10 explicitly resolves this: no
// downstream bay consumes Bay 06's ownership check yet (Bay 09 doesn't
// exist), so this stays unexported until a real caller needs it, matching
// every prior bay's own stated rule for when to export.
async function assertCFDAnalysisOwnership(
  cfdAnalysisId: string,
  userId: string,
): Promise<HangarCFDAnalysisRow> {
  const analysis = await getCFDAnalysis(cfdAnalysisId);
  if (!analysis) {
    throw new Error(`No Hangar_CFDAnalyses row found for cfdAnalysisId "${cfdAnalysisId}"`);
  }
  if (analysis.user_id !== userId) {
    throw new Error(`CFD analysis "${analysis.id}" does not belong to user "${userId}"`);
  }
  return analysis;
}

async function recordStageFailure(
  cfdAnalysisId: string,
  stage: CFDAnalysisRunStage,
  error: unknown,
): Promise<CFDAnalysisAgentError> {
  const message = error instanceof Error ? error.message : String(error);
  await logCFDAnalysisStageRun(cfdAnalysisId, stage, null, null, "error", 0, message);
  await updateCFDAnalysisResult(cfdAnalysisId, { status: "error" }).catch(() => {});
  return new CFDAnalysisAgentError(message, cfdAnalysisId, stage);
}

// ── Stage — Output Generation ────────────────────────────────────────────

export interface CFDAnalysisRequest {
  userId: string;
  cadDesignId: string;
  solverType?: string | null;
  turbulenceModel?: string | null;
  boundaryConditions?: Record<string, unknown> | null;
}

export interface CFDAnalysisResult {
  cfdAnalysisId: string;
  cfdCode: string;
  forces: CFDForces;
  coefficients: CFDCoefficients;
  flowFields: CFDFlowFields;
  designRationale: string;
  sourceWasMock: true;
  confidenceScore: number;
}

// No self-reported LLM score is trusted here either — matches the CAD/Sim
// established convention (see cadDesignAgentPipeline.ts's own comment on
// this) of always computing confidence independently in the pipeline.
// Unlike Bay 04 (which has a real upstream confidence_score to carry
// forward), Bay 05's own runFlightDynamicsAssessmentStage has no such
// upstream signal available either and starts from a flat base — Bay 06 is
// in the same position (Hangar_CADDesigns' own confidence_score lives on
// its versioned _specs row, not the parent row this pipeline reads via
// assertCADDesignOwnership, so plumbing it through isn't free — and
// CFDAgent.md never asks for it to be carried forward the way Section
// 10/Bay 04's own spec explicitly did). Starts from a flat base, penalized
// if the LLM call itself fell back to mock (distinct from the
// spec-mandated source_was_mock: true — see below).
function computeCFDAnalysisConfidence(generationWasMock: boolean): number {
  let score = 0.75;
  if (generationWasMock) score -= 0.3;
  return Math.max(0, Math.min(1, score));
}

export async function runOutputGenerationStage(
  request: CFDAnalysisRequest,
): Promise<CFDAnalysisResult> {
  const { userId, cadDesignId } = request;
  if (!cadDesignId) {
    throw new InvalidCFDAnalysisInputError(
      "A spec-ready CAD design must be selected before running a CFD analysis.",
    );
  }

  // Never trust a client-supplied cad_design_id — same reasoning
  // assertCADDesignOwnership already applies for Bay 05.
  const cadDesign = await assertCADDesignOwnership(cadDesignId, userId);

  if (cadDesign.status !== "spec_ready") {
    throw new InvalidCFDAnalysisInputError("Source CAD design is not spec-ready.");
  }

  const cadDesignRow = await getCADDesign(cadDesignId);
  if (!cadDesignRow) {
    throw new InvalidCFDAnalysisInputError("No CAD design found for this id.");
  }

  const cfdAnalysis = await createCFDAnalysis(userId, cadDesignId);
  const cfdAnalysisId = cfdAnalysis.id;
  await updateCFDAnalysisResult(cfdAnalysisId, { status: "processing" });

  const start = Date.now();
  try {
    // GATE — deterministic, eliminates an already-nothing/inconsistent
    // upstream CAD design before any CFD reasoning is attempted. Bay 06 has
    // no direct access to the CAD design's own mass_properties/
    // interference_clear from the parent Hangar_CADDesigns row (those live
    // on the versioned Hangar_CADDesign_specs row) — so this gate reads
    // them via the same getSpecsForCADDesigns path cadDesignAgentPipeline's
    // own list view uses, scoped to this one design.
    const [cadSpec] = await getSpecsForCADDesigns([cadDesignId]);
    if (!cadSpec) {
      throw new InvalidCFDAnalysisInputError("No spec has been generated for this CAD design yet.");
    }

    const gate = evaluateCFDAnalysisGate({
      massProperties: cadSpec.mass_properties as unknown as {
        weightKg: number;
        cg: { x: number; y: number; z: number };
      },
      interferenceClear: cadSpec.interference_clear,
    });
    if (gate.eliminated) {
      throw new InvalidCFDAnalysisInputError(
        `CAD design "${cadDesignRow.cad_code}" was eliminated by the hard-constraint gate: ${gate.reasons.join("; ")}`,
      );
    }

    await persistCFDAnalysisInput(cfdAnalysisId, {
      solverType: request.solverType ?? null,
      turbulenceModel: request.turbulenceModel ?? null,
      boundaryConditions: request.boundaryConditions ?? null,
    });

    // GENERATE — the one LLM call in this stage. generateCFDAnalysis is a
    // plain async function, not a createServerFn — see its own header
    // comment on why this bay starts that way rather than fixing it later.
    const generation = await generateCFDAnalysis({
      massProperties: cadSpec.mass_properties as unknown as {
        weightKg: number;
        cg: { x: number; y: number; z: number };
      },
      bom: cadSpec.bom as unknown as { part: string; qty: number; material: string }[],
      designRationale: cadSpec.design_rationale,
      solverType: request.solverType ?? null,
      turbulenceModel: request.turbulenceModel ?? null,
      boundaryConditions: request.boundaryConditions ?? null,
    });

    const confidenceScore = computeCFDAnalysisConfidence(generation.mock);

    const disclaimerPrefix = cadSpec.source_was_mock
      ? "⚠ Source CAD design was generated from CAD Agent's mock fallback (no real LLM output) — this CFD analysis should not be treated as based on real reasoning. "
      : "";
    // CFDAgent.md Section 1: "no real solver runs. source_was_mock: true on
    // every result" — unconditional, regardless of whether this specific
    // LLM call itself succeeded (generation.mock tracks that separately,
    // for the disclaimer text above, mirroring CAD's own mock: boolean
    // convention — see cfdAnalysisGeneration.ts's header comment).
    const sourceWasMock = true as const;
    const designRationale = `${disclaimerPrefix}${generation.designRationale}`;

    await updateCFDAnalysisResult(cfdAnalysisId, {
      status: "spec_ready",
      forces: generation.forces as unknown as Record<string, unknown>,
      coefficients: generation.coefficients as unknown as Record<string, unknown>,
      flowFields: generation.flowFields as unknown as Record<string, unknown>,
      designRationale,
      confidenceScore,
      sourceWasMock,
    });

    await logCFDAnalysisStageRun(
      cfdAnalysisId,
      "output_generation",
      { cadDesignId, solverType: request.solverType, turbulenceModel: request.turbulenceModel },
      { gate, generation },
      "success",
      Date.now() - start,
    );

    return {
      cfdAnalysisId,
      cfdCode: cfdAnalysis.cfd_code,
      forces: generation.forces,
      coefficients: generation.coefficients,
      flowFields: generation.flowFields,
      designRationale,
      sourceWasMock,
      confidenceScore,
    };
  } catch (err) {
    throw await recordStageFailure(cfdAnalysisId, "output_generation", err);
  }
}

// ── "Your CFD analyses" list ─────────────────────────────────────────────

export interface CFDAnalysisListEntry {
  cfdAnalysisId: string;
  cfdCode: string;
  sourceCadDesignId: string;
  status: CFDAnalysisStatus;
  createdAt: string;
  forces: CFDForces | null;
  coefficients: CFDCoefficients | null;
  flowFields: CFDFlowFields | null;
  designRationale: string | null;
  confidenceScore: number | null;
  sourceWasMock: boolean;
}

// Simpler than listCADDesignsForUser — output already lives directly on
// Hangar_CFDAnalyses, so there's no separate specs table to merge in here.
export async function listCFDAnalysesForUser(userId: string): Promise<CFDAnalysisListEntry[]> {
  const analyses = await listUserCFDAnalyses(userId);
  return analyses.map(
    (a): CFDAnalysisListEntry => ({
      cfdAnalysisId: a.id,
      cfdCode: a.cfd_code,
      sourceCadDesignId: a.source_cad_design_id,
      status: a.status,
      createdAt: a.created_at,
      forces: a.forces as unknown as CFDForces | null,
      coefficients: a.coefficients as unknown as CFDCoefficients | null,
      flowFields: a.flow_fields as unknown as CFDFlowFields | null,
      designRationale: a.design_rationale,
      confidenceScore: a.confidence_score,
      sourceWasMock: a.source_was_mock,
    }),
  );
}
