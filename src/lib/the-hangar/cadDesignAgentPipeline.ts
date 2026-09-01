import { assertAircraftDesignOwnership } from "./aircraftDesignAgentPipeline.ts";
import { getLatestAircraftDesignSpec } from "./aircraftDesignPersistence.ts";
import { evaluateCADDesignGate, evaluateCADDesignValidation } from "./cadDesignRules.ts";
import {
  generateCADDesign,
  type CADModelFiles,
  type BomEntry,
  type MassProperties,
} from "./cadDesignGeneration.ts";
import {
  createCADDesign,
  getCADDesign,
  updateCADDesignStatus,
  persistCADDesignSpec,
  listUserCADDesigns,
  getSpecsForCADDesigns,
  logCADDesignStageRun,
  type CADDesignRunStage,
  type CADDesignStatus,
  type HangarCADDesignRow,
} from "./cadDesignPersistence.ts";

// CAD Agent (Bay 04) orchestrator — mirrors aircraftDesignAgentPipeline.ts's
// structure/style. This pass implements only Stage 1 (Model Generation,
// CADAgent.md Section 4.1) as one complete vertical slice — prerequisite
// checks, the deterministic gate, the one LLM call, deterministic
// post-generation validation, and persistence all happen here, since
// Stages 2-4 don't exist yet to hand off to. The UI is not wired to
// /the-hangar/welcome this pass (not asked for; every prior bay treated
// that as its own separate step).

export class CADDesignAgentError extends Error {
  constructor(
    message: string,
    public readonly cadDesignId: string,
    public readonly stage: CADDesignRunStage,
  ) {
    super(message);
    this.name = "CADDesignAgentError";
  }
}

export class InvalidCADDesignInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidCADDesignInputError";
  }
}

async function assertCADDesignOwnership(
  cadDesignId: string,
  userId: string,
): Promise<HangarCADDesignRow> {
  const design = await getCADDesign(cadDesignId);
  if (!design) {
    throw new Error(`No Hangar_CADDesigns row found for cadDesignId "${cadDesignId}"`);
  }
  if (design.user_id !== userId) {
    throw new Error(`CAD design "${design.id}" does not belong to user "${userId}"`);
  }
  return design;
}

async function recordStageFailure(
  cadDesignId: string,
  stage: CADDesignRunStage,
  error: unknown,
): Promise<CADDesignAgentError> {
  const message = error instanceof Error ? error.message : String(error);
  await logCADDesignStageRun(cadDesignId, stage, null, null, "error", 0, message);
  await updateCADDesignStatus(cadDesignId, "error").catch(() => {});
  return new CADDesignAgentError(message, cadDesignId, stage);
}

// ── Stage 01 — Model Generation ──────────────────────────────────────────

export interface Stage1Request {
  userId: string;
  aircraftDesignId: string;
}

export interface Stage1Result {
  cadDesignId: string;
  cadCode: string;
  modelFiles: CADModelFiles;
  bom: BomEntry[];
  massProperties: MassProperties;
  interferenceClear: boolean;
  dfmFlags: string[];
  designRationale: string;
  sourceWasMock: boolean;
  confidenceScore: number;
  specVersion: number;
}

// No existing formula defines confidence for CAD Agent. Unlike Bay 03
// (which only had a fitScore to work from), Bay 04 has a real upstream
// confidence score to carry forward — the aircraft design's own
// confidence_score — since garbage-in-garbage-out matters here too. Then
// penalized per DFM flag, penalized if interference isn't clear, penalized
// again if mock-sourced (same double-penalty reasoning as
// computeAircraftDesignConfidence).
function computeCADDesignConfidence(
  upstreamConfidence: number,
  dfmFlags: string[],
  interferenceClear: boolean,
  sourceWasMock: boolean,
): number {
  let score = upstreamConfidence;
  if (!interferenceClear) score -= 0.2;
  score -= 0.05 * dfmFlags.length;
  if (sourceWasMock) score -= 0.3;
  return Math.max(0, Math.min(1, score));
}

export async function runModelGenerationStage(request: Stage1Request): Promise<Stage1Result> {
  const { userId, aircraftDesignId } = request;
  if (!aircraftDesignId) {
    throw new InvalidCADDesignInputError(
      "A spec-ready aircraft design must be selected before generating a CAD model.",
    );
  }

  // Never trust a client-supplied aircraft_design_id — same reasoning
  // assertConceptOwnership/assertMissionOwnership already apply upstream.
  const aircraftDesign = await assertAircraftDesignOwnership(aircraftDesignId, userId);

  // Aircraft designs can never reach "finalized" — Bay 03 has no finalize
  // stage built (updateAircraftDesignStatus is only ever called with
  // "processing" or "spec_ready"/"error"). Gating on "finalized" the way
  // Bay 03 gates on the concept being finalized would make this bay
  // permanently unusable. "spec_ready" is the actual reachable success
  // state.
  if (aircraftDesign.status !== "spec_ready") {
    throw new InvalidCADDesignInputError("Source aircraft design is not spec-ready.");
  }

  const spec = await getLatestAircraftDesignSpec(aircraftDesignId);
  if (!spec) {
    throw new InvalidCADDesignInputError(
      "No spec has been generated for this aircraft design yet.",
    );
  }

  const geometryParameters = spec.geometry_parameters as unknown as {
    wingspan_m: number;
    fuselageLength_m: number;
    wingArea_m2: number;
    aspectRatio: number;
    vehicleClass: string;
  };
  const componentSelections = spec.component_selections as unknown as {
    category: string;
    selection: string;
    rationale: string;
  }[];

  const cadDesign = await createCADDesign(userId, aircraftDesignId);
  const cadDesignId = cadDesign.id;
  await updateCADDesignStatus(cadDesignId, "processing");

  const start = Date.now();
  try {
    // GATE — deterministic, eliminates an already-nothing upstream design
    // before any model generation is attempted.
    const gate = evaluateCADDesignGate({
      wingspan_m: geometryParameters.wingspan_m,
      fuselageLength_m: geometryParameters.fuselageLength_m,
      wingArea_m2: geometryParameters.wingArea_m2,
      aspectRatio: geometryParameters.aspectRatio,
      vehicleClass: geometryParameters.vehicleClass,
      componentSelectionCount: componentSelections.length,
    });
    if (gate.eliminated) {
      throw new InvalidCADDesignInputError(
        `Aircraft design "${aircraftDesign.design_code}" was eliminated by the hard-constraint gate: ${gate.reasons.join("; ")}`,
      );
    }

    // GENERATE — the one LLM call in this stage.
    const generation = await generateCADDesign({
      data: {
        cadCode: cadDesign.cad_code,
        vehicleClass: geometryParameters.vehicleClass,
        geometryParameters,
        componentSelections,
        designRationale: spec.design_rationale,
      },
    });

    // VALIDATE — deterministic, on the LLM's own output, never LLM-sourced.
    const validation = evaluateCADDesignValidation({
      bom: generation.bom,
      massProperties: generation.massProperties,
      fuselageLength_m: geometryParameters.fuselageLength_m,
    });

    const finalSourceWasMock = spec.source_was_mock || generation.mock;
    const confidenceScore = computeCADDesignConfidence(
      spec.confidence_score,
      validation.dfmFlags,
      validation.interferenceClear,
      finalSourceWasMock,
    );
    const designRationale = spec.source_was_mock
      ? `⚠ Source aircraft design was generated from Aircraft Design Agent's mock fallback (no real LLM output) — this CAD model should not be treated as based on real reasoning. ${generation.designRationale}`
      : generation.designRationale;

    const specRow = await persistCADDesignSpec(cadDesignId, {
      modelFiles: generation.modelFiles as unknown as Record<string, unknown>,
      bom: generation.bom,
      massProperties: generation.massProperties as unknown as Record<string, unknown>,
      interferenceClear: validation.interferenceClear,
      dfmFlags: validation.dfmFlags,
      designRationale,
      confidenceScore,
      sourceWasMock: finalSourceWasMock,
    });
    await updateCADDesignStatus(cadDesignId, "spec_ready", confidenceScore);

    await logCADDesignStageRun(
      cadDesignId,
      "model_generation",
      { aircraftDesignId, geometryParameters, componentSelections },
      { gate, generation, validation, persistedSpecId: specRow.id, version: specRow.version },
      "success",
      Date.now() - start,
    );

    return {
      cadDesignId,
      cadCode: cadDesign.cad_code,
      modelFiles: generation.modelFiles,
      bom: generation.bom,
      massProperties: generation.massProperties,
      interferenceClear: validation.interferenceClear,
      dfmFlags: validation.dfmFlags,
      designRationale,
      sourceWasMock: finalSourceWasMock,
      confidenceScore,
      specVersion: specRow.version,
    };
  } catch (err) {
    throw await recordStageFailure(cadDesignId, "model_generation", err);
  }
}

// ── "Your CAD designs" list ──────────────────────────────────────────────

export interface CADDesignListEntry {
  cadDesignId: string;
  cadCode: string;
  sourceAircraftDesignId: string;
  status: CADDesignStatus;
  createdAt: string;
  modelFiles: CADModelFiles | null;
  bom: BomEntry[] | null;
  massProperties: MassProperties | null;
  interferenceClear: boolean | null;
  dfmFlags: string[] | null;
  designRationale: string | null;
  confidenceScore: number | null;
  sourceWasMock: boolean | null;
}

export async function listCADDesignsForUser(userId: string): Promise<CADDesignListEntry[]> {
  const designs = await listUserCADDesigns(userId);
  const ids = designs.map((d) => d.id);
  const specs = await getSpecsForCADDesigns(ids);
  const specsByDesign = new Map(specs.map((s) => [s.cad_design_id, s]));
  return designs.map((d): CADDesignListEntry => {
    const spec = specsByDesign.get(d.id);
    return {
      cadDesignId: d.id,
      cadCode: d.cad_code,
      sourceAircraftDesignId: d.source_aircraft_design_id,
      status: d.status,
      createdAt: d.created_at,
      modelFiles: spec ? (spec.model_files as unknown as CADModelFiles) : null,
      bom: spec ? (spec.bom as unknown as BomEntry[]) : null,
      massProperties: spec ? (spec.mass_properties as unknown as MassProperties) : null,
      interferenceClear: spec?.interference_clear ?? null,
      dfmFlags: spec?.dfm_flags ?? null,
      designRationale: spec?.design_rationale ?? null,
      confidenceScore: spec?.confidence_score ?? null,
      sourceWasMock: spec?.source_was_mock ?? null,
    };
  });
}
