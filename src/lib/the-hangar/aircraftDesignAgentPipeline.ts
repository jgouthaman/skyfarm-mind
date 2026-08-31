import { assertConceptOwnership, assertMissionOwnership } from "./conceptAgentPipeline.ts";
import { getLatestConceptSpec, getConceptStageMockFlags } from "./conceptPersistence.ts";
import type { ConstraintFit } from "./tradeoffReasoning.ts";
import { evaluateAircraftDesignGate } from "./aircraftDesignRules.ts";
import {
  generateAircraftDesignGeometry,
  type GeometryParameters,
  type ComponentSelection,
} from "./aircraftDesignGeneration.ts";
import {
  createAircraftDesign,
  getAircraftDesign,
  updateAircraftDesignStatus,
  persistAircraftDesignSpec,
  logAircraftDesignStageRun,
  listUserAircraftDesigns,
  getSpecsForAircraftDesigns,
  type AircraftDesignRunStage,
  type AircraftDesignStatus,
  type HangarAircraftDesignRow,
} from "./aircraftDesignPersistence.ts";

// Aircraft Design Agent (Bay 03) orchestrator — mirrors
// conceptAgentPipeline.ts's structure/style. This pass implements only
// Stage 1 (Geometry Generation, AircraftDesignAgent.md Section 4.1) as one
// complete vertical slice — prerequisite checks, the deterministic gate,
// the one LLM call, and persistence all happen here, since Stages 2-4
// don't exist yet to hand off to. The UI is not wired this pass.

export class AircraftDesignAgentError extends Error {
  constructor(
    message: string,
    public readonly aircraftDesignId: string,
    public readonly stage: AircraftDesignRunStage,
  ) {
    super(message);
    this.name = "AircraftDesignAgentError";
  }
}

export class InvalidAircraftDesignInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidAircraftDesignInputError";
  }
}

// New with Bay 04 — Bay 03 itself never needed this: Stage 1 always creates
// a fresh Hangar_aircraft_designs row, so there was nothing pre-existing to
// check ownership on. Bay 04 is the first bay that reads an *existing*
// aircraft design by a client-supplied id, so it needs the same
// never-trust-a-client-supplied-id check assertConceptOwnership already
// applies for concepts.
export async function assertAircraftDesignOwnership(
  aircraftDesignId: string,
  userId: string,
): Promise<HangarAircraftDesignRow> {
  const design = await getAircraftDesign(aircraftDesignId);
  if (!design) {
    throw new Error(
      `No Hangar_aircraft_designs row found for aircraftDesignId "${aircraftDesignId}"`,
    );
  }
  if (design.user_id !== userId) {
    throw new Error(`Aircraft design "${design.id}" does not belong to user "${userId}"`);
  }
  return design;
}

async function recordStageFailure(
  aircraftDesignId: string,
  stage: AircraftDesignRunStage,
  error: unknown,
): Promise<AircraftDesignAgentError> {
  const message = error instanceof Error ? error.message : String(error);
  await logAircraftDesignStageRun(aircraftDesignId, stage, null, null, "error", 0, message);
  await updateAircraftDesignStatus(aircraftDesignId, "error").catch(() => {});
  return new AircraftDesignAgentError(message, aircraftDesignId, stage);
}

// ── Stage 01 — Geometry Generation ───────────────────────────────────────

export interface Stage1Request {
  userId: string;
  conceptId: string;
}

export interface Stage1Result {
  aircraftDesignId: string;
  designCode: string;
  geometryParameters: GeometryParameters;
  componentSelections: ComponentSelection[];
  designRationale: string;
  sourceWasMock: boolean;
  confidenceScore: number;
  specVersion: number;
}

interface ValidatedRankedConcept {
  conceptName: string;
  description: string;
  rank: number;
  fitScore: number;
  constraintFit: ConstraintFit;
  rationale: string;
}

// AircraftDesignAgent.md Section 3.h — candidate_concepts/ranked_concepts
// are untyped jsonb; validate the fields this stage actually depends on
// rather than an unchecked cast the way Concept Agent's own read sites do.
function validateRankedConcepts(raw: unknown): ValidatedRankedConcept[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new InvalidAircraftDesignInputError("Source concept has no ranked concepts.");
  }
  return raw.map((entry, i) => {
    if (typeof entry !== "object" || entry === null) {
      throw new InvalidAircraftDesignInputError(`ranked_concepts[${i}] is not an object.`);
    }
    const e = entry as Record<string, unknown>;
    if (
      typeof e.conceptName !== "string" ||
      typeof e.description !== "string" ||
      typeof e.rank !== "number" ||
      typeof e.fitScore !== "number" ||
      (e.constraintFit !== "pass" && e.constraintFit !== "partial" && e.constraintFit !== "fail") ||
      typeof e.rationale !== "string"
    ) {
      throw new InvalidAircraftDesignInputError(
        `ranked_concepts[${i}] is missing or has malformed required fields.`,
      );
    }
    return {
      conceptName: e.conceptName,
      description: e.description,
      rank: e.rank,
      fitScore: e.fitScore,
      constraintFit: e.constraintFit,
      rationale: e.rationale,
    };
  });
}

// AircraftDesignAgent.md Section 3.f — don't assume index [0] is rank 1.
function getRankOneConcept(concepts: ValidatedRankedConcept[]): ValidatedRankedConcept {
  const rankOne = concepts.find((c) => c.rank === 1);
  if (!rankOne) {
    throw new InvalidAircraftDesignInputError("No rank-1 entry found in ranked_concepts.");
  }
  return rankOne;
}

// RankedConcept (conceptRanking.ts) does not carry vehicleClass forward —
// rankConcepts's merge of CandidateConcept + ConceptTradeoffNote drops it.
// It only exists on the sibling candidate_concepts array, matched here by
// conceptName. Validated the same way as ranked_concepts, for the same
// Section 3.h reason.
interface ValidatedCandidateConcept {
  conceptName: string;
  vehicleClass: string;
}

function validateCandidateConcepts(raw: unknown): ValidatedCandidateConcept[] {
  if (!Array.isArray(raw)) {
    throw new InvalidAircraftDesignInputError("Source concept has no candidate concepts.");
  }
  return raw.map((entry, i) => {
    if (typeof entry !== "object" || entry === null) {
      throw new InvalidAircraftDesignInputError(`candidate_concepts[${i}] is not an object.`);
    }
    const e = entry as Record<string, unknown>;
    if (typeof e.conceptName !== "string" || typeof e.vehicleClass !== "string") {
      throw new InvalidAircraftDesignInputError(
        `candidate_concepts[${i}] is missing conceptName/vehicleClass.`,
      );
    }
    return { conceptName: e.conceptName, vehicleClass: e.vehicleClass };
  });
}

// No existing formula defines confidence for Aircraft Design Agent.
// Adapted from Concept Agent's own approach (top candidate's fitScore,
// scaled 0-1) — but unlike that one (AircraftDesignAgent.md Section
// 3.d/7's own flagged gap), this folds in constraintFit and mock status
// directly, since Section 3.d's whole point is that fitScore alone isn't
// trustworthy: a "partial" fit is penalized, and mock-sourced output is
// penalized again, so this number can't overstate confidence either way
// the upstream one can.
function computeAircraftDesignConfidence(
  concept: ValidatedRankedConcept,
  sourceWasMock: boolean,
): number {
  let score = concept.fitScore / 10;
  if (concept.constraintFit === "partial") score -= 0.2;
  if (sourceWasMock) score -= 0.3;
  return Math.max(0, Math.min(1, score));
}

export async function runGeometryGenerationStage(request: Stage1Request): Promise<Stage1Result> {
  const { userId, conceptId } = request;
  if (!conceptId) {
    throw new InvalidAircraftDesignInputError(
      "A finalized concept must be selected before generating a design.",
    );
  }

  // 3.b — never trust a client-supplied concept_id.
  const concept = await assertConceptOwnership(conceptId, userId);

  // 3.a — spec_ready is not the same as reviewed and confirmed.
  if (concept.status !== "finalized") {
    throw new InvalidAircraftDesignInputError("Source concept is not finalized.");
  }

  // 3.g — re-verify transitively. Bay 02 now checks this at concept-
  // creation time (commit 28b8c8f) — this is defense in depth, the same
  // reasoning assertConceptOwnership itself already applies at every
  // stage rather than trusting an earlier stage's check.
  await assertMissionOwnership(concept.source_mission_id, userId);

  // 3.c — fetch explicitly by latest version; first real caller of
  // get_latest_concept_spec.
  const spec = await getLatestConceptSpec(conceptId);
  if (!spec) {
    throw new InvalidAircraftDesignInputError("No spec has been generated for this concept yet.");
  }

  // 3.h then 3.f.
  const rankedConcepts = validateRankedConcepts(spec.ranked_concepts);
  const topConcept = getRankOneConcept(rankedConcepts);
  const candidates = validateCandidateConcepts(spec.candidate_concepts);
  const topCandidate = candidates.find((c) => c.conceptName === topConcept.conceptName);
  if (!topCandidate) {
    throw new InvalidAircraftDesignInputError(
      `No matching candidate_concepts entry found for rank-1 concept "${topConcept.conceptName}" — cannot determine its vehicle class.`,
    );
  }

  // 3.e — the mock flag isn't on Hangar_concept_specs; recover it from
  // Hangar_concept_runs.
  const sourceWasMock = await getConceptStageMockFlags(conceptId);

  const design = await createAircraftDesign(userId, conceptId);
  const aircraftDesignId = design.id;
  await updateAircraftDesignStatus(aircraftDesignId, "processing");

  const start = Date.now();
  try {
    // GATE — deterministic, eliminates infeasible concepts before any
    // geometry is generated (Section 3.d/4.1).
    const gate = evaluateAircraftDesignGate({
      vehicleClass: topCandidate.vehicleClass,
      constraintFit: topConcept.constraintFit,
    });
    if (gate.eliminated) {
      throw new InvalidAircraftDesignInputError(
        `Concept "${topConcept.conceptName}" was eliminated by the hard-constraint gate: ${gate.reasons.join("; ")}`,
      );
    }

    // SCORE + GENERATE — the one LLM call in this stage (Claude Sonnet 5,
    // same gateway Bay 01/Bay 02 use), reasoning about the already-gated
    // survivor only.
    const generation = await generateAircraftDesignGeometry({
      data: {
        conceptName: topConcept.conceptName,
        description: topConcept.description,
        vehicleClass: topCandidate.vehicleClass,
        rationale: topConcept.rationale,
        constraintFit: topConcept.constraintFit,
      },
    });

    const finalSourceWasMock = sourceWasMock || generation.mock;
    const confidenceScore = computeAircraftDesignConfidence(topConcept, finalSourceWasMock);
    // "don't silently generate real-looking geometry against mock source
    // data" — persistence still happens (source_was_mock records it
    // queryably), but the disclaimer travels with the human-readable text
    // itself too, not just a column nothing renders yet.
    const designRationale = sourceWasMock
      ? `⚠ Source concept was generated from Concept Agent's mock fallback (no real LLM output) — this design should not be treated as based on real reasoning. ${generation.designRationale}`
      : generation.designRationale;

    const specRow = await persistAircraftDesignSpec(aircraftDesignId, {
      geometryParameters: generation.geometryParameters as unknown as Record<string, unknown>,
      componentSelections: generation.componentSelections,
      designRationale,
      confidenceScore,
      sourceWasMock: finalSourceWasMock,
    });
    await updateAircraftDesignStatus(aircraftDesignId, "spec_ready", confidenceScore);

    await logAircraftDesignStageRun(
      aircraftDesignId,
      "geometry_generation",
      { conceptId, topConcept, topCandidate },
      { gate, generation, persistedSpecId: specRow.id, version: specRow.version },
      "success",
      Date.now() - start,
    );

    return {
      aircraftDesignId,
      designCode: design.design_code,
      geometryParameters: generation.geometryParameters,
      componentSelections: generation.componentSelections,
      designRationale,
      sourceWasMock: finalSourceWasMock,
      confidenceScore,
      specVersion: specRow.version,
    };
  } catch (err) {
    throw await recordStageFailure(aircraftDesignId, "geometry_generation", err);
  }
}

// ── "Your aircraft designs" list ─────────────────────────────────────────

export interface AircraftDesignListEntry {
  aircraftDesignId: string;
  designCode: string;
  sourceConceptId: string;
  status: AircraftDesignStatus;
  createdAt: string;
  geometryParameters: GeometryParameters | null;
  componentSelections: ComponentSelection[] | null;
  designRationale: string | null;
  confidenceScore: number | null;
  sourceWasMock: boolean | null;
}

export async function listAircraftDesignsForUser(
  userId: string,
): Promise<AircraftDesignListEntry[]> {
  const designs = await listUserAircraftDesigns(userId);
  const ids = designs.map((d) => d.id);
  const specs = await getSpecsForAircraftDesigns(ids);
  const specsByDesign = new Map(specs.map((s) => [s.aircraft_design_id, s]));
  return designs.map((d): AircraftDesignListEntry => {
    const spec = specsByDesign.get(d.id);
    return {
      aircraftDesignId: d.id,
      designCode: d.design_code,
      sourceConceptId: d.source_concept_id,
      status: d.status,
      createdAt: d.created_at,
      geometryParameters: spec ? (spec.geometry_parameters as unknown as GeometryParameters) : null,
      componentSelections: spec
        ? (spec.component_selections as unknown as ComponentSelection[])
        : null,
      designRationale: spec?.design_rationale ?? null,
      confidenceScore: spec?.confidence_score ?? null,
      sourceWasMock: spec?.source_was_mock ?? null,
    };
  });
}
