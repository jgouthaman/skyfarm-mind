import { assertCADDesignOwnership } from "./cadDesignAgentPipeline.ts";
import type { MassProperties } from "./cadDesignGeneration.ts";
import { getLatestCADDesignSpec } from "./simDesignPersistence.ts";
import { evaluateStructuralGate } from "./structuralRules.ts";
import {
  generateStructuralAnalysis,
  type MeshMaterial,
  type LoadCase,
  type StressResults,
  type ConvergenceStatus,
} from "./structuralGeneration.ts";
import {
  createStructural,
  getStructural,
  updateStructuralStatus,
  persistStructuralSpec,
  listUserStructurals,
  getSpecsForStructurals,
  logStructuralStageRun,
  type StructuralRunStage,
  type StructuralStatus,
  type HangarStructuralRow,
} from "./structuralPersistence.ts";

// Structural Agent (Bay 07) orchestrator — mirrors
// simDesignAgentPipeline.ts's structure/style exactly. This pass implements
// the one real stage (Sections 7.1-7.3 combined — Mesh & Material Setup,
// Solver Setup & Execution, Output Generation) as one complete vertical
// slice, same reasoning cadDesignAgentPipeline.ts/simDesignAgentPipeline.ts
// already give for their own single-call stages: the one LLM call
// (structuralGeneration.ts) already produces mesh/material assignment,
// load cases, and stress/safety-factor output in a single response — there
// is no separate solver-execution call to log as its own run, so this
// stage's audit trail is written under "output_generation" only, matching
// cfdAnalysisAgentPipeline.ts's identical choice for the identical shape
// (one call spanning multiple conceptually-distinct sub-steps). Section
// 7.4 (Output Interface) is likewise just this same JSON, handed to Bay 09
// later, not a distinct stage here. The UI is not wired to
// /the-hangar/welcome this pass — separate step, same as every prior bay.
//
// Reads Bay 04's CAD output via getLatestCADDesignSpec, reused directly
// from simDesignPersistence.ts (see structuralPersistence.ts's own header
// comment on why it isn't duplicated here) — this bay's first new caller
// of that function outside Bay 05 itself, per StructuralAgent.md's own
// instruction to read the existing get_latest_cad_design_spec RPC rather
// than add a new one.
//
// Per StructuralAgent.md's Input scope note (confirmed 2026-09-03): Bay 05
// is not read here at all, even though it's now merged — the note
// explicitly says the Job Configuration input is "dropped, not stubbed,"
// revisited only once Bay 05's own output shape needs to change this
// bay's safety-factor reasoning, which hasn't been decided. No
// simDesignAgentPipeline import for that reason (only its sibling
// persistence file's Bay-04 reader is reused, which has nothing to do with
// Bay 05's own simulation output).

export class StructuralAgentError extends Error {
  constructor(
    message: string,
    public readonly structuralId: string,
    public readonly stage: StructuralRunStage,
  ) {
    super(message);
    this.name = "StructuralAgentError";
  }
}

export class InvalidStructuralInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidStructuralInputError";
  }
}

// Local and unexported — matching assertSimulationOwnership's/
// assertCADDesignOwnership's real original state (local/unexported) before
// a real downstream bay needed cross-bay reuse. No Bay 09 exists yet to
// need this exported, so it isn't, until one does.
async function assertStructuralOwnership(
  structuralId: string,
  userId: string,
): Promise<HangarStructuralRow> {
  const structural = await getStructural(structuralId);
  if (!structural) {
    throw new Error(`No Hangar_Structurals row found for structuralId "${structuralId}"`);
  }
  if (structural.user_id !== userId) {
    throw new Error(`Structural analysis "${structural.id}" does not belong to user "${userId}"`);
  }
  return structural;
}

async function recordStageFailure(
  structuralId: string,
  stage: StructuralRunStage,
  error: unknown,
): Promise<StructuralAgentError> {
  const message = error instanceof Error ? error.message : String(error);
  await logStructuralStageRun(structuralId, stage, null, null, "error", 0, message);
  await updateStructuralStatus(structuralId, "error").catch(() => {});
  return new StructuralAgentError(message, structuralId, stage);
}

// ── Stage — Structural Assessment ────────────────────────────────────────

export interface Stage1Request {
  userId: string;
  cadDesignId: string;
}

export interface Stage1Result {
  structuralId: string;
  structuralCode: string;
  meshMaterial: MeshMaterial;
  loadCases: LoadCase[];
  stressResults: StressResults;
  safetyFactor: number;
  convergenceStatus: ConvergenceStatus;
  riskFlags: string[];
  confidenceScore: number;
  reasoningSummary: string;
  sourceWasMock: boolean;
  specVersion: number;
}

// No self-reported LLM confidence is trusted here either — matches the
// CAD/Sim/CFD established convention (see cadDesignAgentPipeline.ts's own
// comment on this) of always computing confidence independently in the
// pipeline. Base is the upstream CAD design's own confidence (same
// garbage-in-garbage-out reasoning computeCADDesignConfidence/
// computeSimulationConfidence already apply), then penalized against a
// safety factor and convergence status.
//
// The 1.5 safety-factor floor used below is a commonly-cited conventional
// aerospace preliminary-design margin, not a real regulatory figure pulled
// from a FAR/EASA/MIL table — no such table exists in this codebase (same
// Materials DB gap structuralRules.ts's header comment flags). Used here
// only as a directional confidence penalty, never as a pass/fail gate —
// StructuralAgent.md's own Open Questions section leaves "gate-then-score
// vs. advisory-only for risk_flags/safety margins" unresolved for MVP, the
// same open question Bay 05 carried forward for its own risk_flags.
function computeStructuralConfidence(
  upstreamConfidence: number,
  safetyFactor: number,
  convergenceStatus: ConvergenceStatus,
  riskFlags: string[],
  sourceWasMock: boolean,
): number {
  let score = upstreamConfidence;
  if (safetyFactor < 1.5) score -= 0.2;
  if (convergenceStatus !== "converged") score -= 0.1;
  score -= 0.05 * riskFlags.length;
  if (sourceWasMock) score -= 0.3;
  return Math.max(0, Math.min(1, score));
}

export async function runStructuralAssessmentStage(request: Stage1Request): Promise<Stage1Result> {
  const { userId, cadDesignId } = request;
  if (!cadDesignId) {
    throw new InvalidStructuralInputError(
      "A spec-ready CAD design must be selected before running a structural assessment.",
    );
  }

  // Never trust a client-supplied cad_design_id — same reasoning
  // assertCADDesignOwnership already applies for Bay 05/06.
  const cadDesign = await assertCADDesignOwnership(cadDesignId, userId);

  if (cadDesign.status !== "spec_ready") {
    throw new InvalidStructuralInputError("Source CAD design is not spec-ready.");
  }

  const cadSpec = await getLatestCADDesignSpec(cadDesignId);
  if (!cadSpec) {
    throw new InvalidStructuralInputError("No spec has been generated for this CAD design yet.");
  }

  const massProperties = cadSpec.mass_properties as unknown as MassProperties;

  // Known, disclosed gap: constraints (max_load_factor/material_class) have
  // no real source anywhere in the Concept/Aircraft Design/CAD chain, same
  // reasoning simDesignAgentPipeline.ts already documents for `vertical`.
  // Always null — structuralGeneration.ts's system prompt handles a null
  // constraints object by reasoning qualitatively and saying so, so this
  // degrades honestly rather than silently.
  const constraints = { maxLoadFactor: null, materialClass: null };

  const structural = await createStructural(userId, cadDesignId);
  const structuralId = structural.id;
  await updateStructuralStatus(structuralId, "processing");

  const start = Date.now();
  try {
    // GATE — deterministic, eliminates an already-nothing/already-flagged
    // upstream CAD design before any assessment is attempted.
    const gate = evaluateStructuralGate({
      massProperties,
      interferenceClear: cadSpec.interference_clear,
    });
    if (gate.eliminated) {
      throw new InvalidStructuralInputError(
        `CAD design "${cadDesign.cad_code}" was eliminated by the hard-constraint gate: ${gate.reasons.join("; ")}`,
      );
    }

    // GENERATE — the one LLM call in this stage. generateStructuralAnalysis
    // is a plain async function (not a createServerFn — see its own header
    // comment for why), so this is a direct call, not a { data: {...} }
    // wrapped RPC invocation like Bay 04's generateCADDesign call.
    const generation = await generateStructuralAnalysis({
      massProperties,
      interferenceClear: cadSpec.interference_clear,
      dfmFlags: cadSpec.dfm_flags,
      constraints,
    });

    // SCORE — deterministic, pipeline-owned (see computeStructuralConfidence's
    // own comment). The raw LLM output is still captured in the run's
    // output_snapshot below for traceability.
    const finalSourceWasMock = cadSpec.source_was_mock || generation.sourceWasMock;
    const confidenceScore = computeStructuralConfidence(
      cadSpec.confidence_score,
      generation.safetyFactor,
      generation.convergenceStatus,
      generation.riskFlags,
      finalSourceWasMock,
    );
    const reasoningSummary = cadSpec.source_was_mock
      ? `⚠ Source CAD design was generated from CAD Agent's mock fallback (no real LLM output) — this structural assessment should not be treated as based on real reasoning. ${generation.reasoningSummary}`
      : generation.reasoningSummary;

    const specRow = await persistStructuralSpec(structuralId, {
      meshMaterial: generation.meshMaterial as unknown as Record<string, unknown>,
      loadCases: generation.loadCases as unknown as Record<string, unknown>[],
      stressResults: generation.stressResults as unknown as Record<string, unknown>,
      safetyFactor: generation.safetyFactor,
      convergenceStatus: generation.convergenceStatus,
      riskFlags: generation.riskFlags,
      confidenceScore,
      reasoningSummary,
      sourceWasMock: finalSourceWasMock,
    });
    await updateStructuralStatus(structuralId, "spec_ready", confidenceScore);

    await logStructuralStageRun(
      structuralId,
      "output_generation",
      {
        cadDesignId,
        massProperties,
        interferenceClear: cadSpec.interference_clear,
        dfmFlags: cadSpec.dfm_flags,
        constraints,
      },
      { gate, generation, confidenceScore, persistedSpecId: specRow.id, version: specRow.version },
      "success",
      Date.now() - start,
    );

    return {
      structuralId,
      structuralCode: structural.structural_code,
      meshMaterial: generation.meshMaterial,
      loadCases: generation.loadCases,
      stressResults: generation.stressResults,
      safetyFactor: generation.safetyFactor,
      convergenceStatus: generation.convergenceStatus,
      riskFlags: generation.riskFlags,
      confidenceScore,
      reasoningSummary,
      sourceWasMock: finalSourceWasMock,
      specVersion: specRow.version,
    };
  } catch (err) {
    throw await recordStageFailure(structuralId, "output_generation", err);
  }
}

// ── "Your structural analyses" list ──────────────────────────────────────

export interface StructuralListEntry {
  structuralId: string;
  structuralCode: string;
  sourceCadDesignId: string;
  status: StructuralStatus;
  createdAt: string;
  meshMaterial: MeshMaterial | null;
  loadCases: LoadCase[] | null;
  stressResults: StressResults | null;
  safetyFactor: number | null;
  convergenceStatus: ConvergenceStatus | null;
  riskFlags: string[] | null;
  confidenceScore: number | null;
  reasoningSummary: string | null;
  sourceWasMock: boolean | null;
}

export async function listStructuralsForUser(userId: string): Promise<StructuralListEntry[]> {
  const structurals = await listUserStructurals(userId);
  const ids = structurals.map((s) => s.id);
  const specs = await getSpecsForStructurals(ids);
  const specsByStructural = new Map(specs.map((s) => [s.structural_id, s]));
  return structurals.map((s): StructuralListEntry => {
    const spec = specsByStructural.get(s.id);
    return {
      structuralId: s.id,
      structuralCode: s.structural_code,
      sourceCadDesignId: s.source_cad_design_id,
      status: s.status,
      createdAt: s.created_at,
      meshMaterial: spec ? (spec.mesh_material as unknown as MeshMaterial) : null,
      loadCases: spec ? (spec.load_cases as unknown as LoadCase[]) : null,
      stressResults: spec ? (spec.stress_results as unknown as StressResults) : null,
      safetyFactor: spec?.safety_factor ?? null,
      convergenceStatus: (spec?.convergence_status as ConvergenceStatus | null) ?? null,
      riskFlags: spec?.risk_flags ?? null,
      confidenceScore: spec?.confidence_score ?? null,
      reasoningSummary: spec?.reasoning_summary ?? null,
      sourceWasMock: spec?.source_was_mock ?? null,
    };
  });
}
