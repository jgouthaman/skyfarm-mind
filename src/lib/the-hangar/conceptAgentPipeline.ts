import { generateConceptIdeas, type CandidateConcept } from "./conceptIdeation.ts";
import { analyzeConceptTradeoffs, type ConceptTradeoffNote } from "./tradeoffReasoning.ts";
import { rankConcepts, type RankedConcept } from "./conceptRanking.ts";
import type {
  FinalizedConstraint,
  FinalizedKpi,
  MissionSpecsFields,
} from "./missionSpecAssembly.ts";
import { getMission } from "./missionPersistence.ts";
import {
  createConcept,
  getConcept,
  updateConceptStatus,
  persistConceptSpec,
  logConceptStageRun,
  listUserConcepts,
  getSpecsForConcepts,
  type ConceptRunStage,
  type HangarConceptRow,
  type ConceptStatus,
} from "./conceptPersistence.ts";
import {
  stubExport,
  stubEventPublish,
  type StubResult,
  type EventStubResult,
} from "./exportAndEventStubs.ts";

// Concept Agent (Bay 02) orchestrator — mirrors missionAgentPipeline.ts's
// structure exactly (4 independently-callable stage functions so the UI
// can pause after each one for a review-then-proceed flow), adapted to the
// concept domain. There is no ConceptAgent.md — the 4-step breakdown below
// (Ideation -> Trade-off Reasoning -> Ranking & Scoring -> Output
// Interface) was designed against the welcome page's own one-line
// description of Bay 02 and confirmed with the user, since no reference
// doc exists the way MissionAgent.md exists for Bay 01.

export class ConceptAgentError extends Error {
  constructor(
    message: string,
    public readonly conceptId: string,
    public readonly stage: ConceptRunStage,
  ) {
    super(message);
    this.name = "ConceptAgentError";
  }
}

export class InvalidConceptInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidConceptInputError";
  }
}

async function assertConceptOwnership(
  conceptId: string,
  userId: string,
): Promise<HangarConceptRow> {
  const concept = await getConcept(conceptId);
  if (!concept) {
    throw new Error(`No Hangar_concepts row found for conceptId "${conceptId}"`);
  }
  if (concept.user_id !== userId) {
    throw new Error(`Concept "${concept.id}" does not belong to user "${userId}"`);
  }
  return concept;
}

// Closes the gap documented in ConceptAgent.md Section 11 / AircraftDesignAgent.md
// Section 3.g/3.a: Stage 1 previously trusted a client-supplied
// sourceMissionId with no check that it belongs to the caller or is
// actually finalized. Mirrors assertConceptOwnership's style (a getter +
// existence check + ownership check), with the added status gate this
// check specifically needs.
async function assertMissionOwnership(sourceMissionId: string, userId: string) {
  const mission = await getMission(sourceMissionId);
  if (!mission) {
    throw new Error("Source mission not found");
  }
  if (mission.user_id !== userId) {
    throw new Error("Source mission does not belong to this user");
  }
  if (mission.status !== "finalized") {
    throw new Error("Source mission is not finalized");
  }
  return mission;
}

async function recordStageFailure(
  conceptId: string,
  stage: ConceptRunStage,
  error: unknown,
): Promise<ConceptAgentError> {
  const message = error instanceof Error ? error.message : String(error);
  await logConceptStageRun(conceptId, stage, null, null, "error", 0, message);
  await updateConceptStatus(conceptId, "error").catch(() => {});
  return new ConceptAgentError(message, conceptId, stage);
}

// ── Stage 01 — Concept Ideation ──────────────────────────────────────────

export interface Stage1Request {
  userId: string;
  sourceMissionId: string;
  missionSpecs: MissionSpecsFields;
  constraints: FinalizedConstraint[];
  kpis: FinalizedKpi[];
  summary: string;
}

export interface Stage1Result {
  conceptId: string;
  conceptCode: string;
  candidates: CandidateConcept[];
  mock: boolean;
}

export async function runConceptIdeationStage(request: Stage1Request): Promise<Stage1Result> {
  const { userId, sourceMissionId, missionSpecs, constraints, kpis, summary } = request;
  if (!sourceMissionId) {
    throw new InvalidConceptInputError("A saved spec must be selected before generating concepts.");
  }
  await assertMissionOwnership(sourceMissionId, userId);

  const concept = await createConcept(userId, sourceMissionId);
  const conceptId = concept.id;
  await updateConceptStatus(conceptId, "processing");

  const start = Date.now();
  try {
    const ideation = await generateConceptIdeas({
      data: { missionSpecs, constraints, kpis, summary },
    });
    await logConceptStageRun(
      conceptId,
      "concept_ideation",
      { sourceMissionId },
      ideation,
      "success",
      Date.now() - start,
    );
    return {
      conceptId,
      conceptCode: concept.concept_code,
      candidates: ideation.candidates,
      mock: ideation.mock,
    };
  } catch (err) {
    throw await recordStageFailure(conceptId, "concept_ideation", err);
  }
}

// ── Stage 02 — Trade-off Reasoning ───────────────────────────────────────

export interface Stage2Request {
  userId: string;
  conceptId: string;
  candidates: CandidateConcept[];
  constraints: FinalizedConstraint[];
  kpis: FinalizedKpi[];
}

export interface Stage2Result {
  conceptId: string;
  notes: ConceptTradeoffNote[];
  mock: boolean;
}

export async function runTradeOffReasoningStage(request: Stage2Request): Promise<Stage2Result> {
  const { userId, conceptId, candidates, constraints, kpis } = request;
  await assertConceptOwnership(conceptId, userId);
  await updateConceptStatus(conceptId, "processing");

  const start = Date.now();
  try {
    const reasoning = await analyzeConceptTradeoffs({ data: { candidates, constraints, kpis } });
    await logConceptStageRun(
      conceptId,
      "trade_off_reasoning",
      { candidates },
      reasoning,
      "success",
      Date.now() - start,
    );
    return { conceptId, notes: reasoning.notes, mock: reasoning.mock };
  } catch (err) {
    throw await recordStageFailure(conceptId, "trade_off_reasoning", err);
  }
}

// ── Stage 03 — Ranking & Scoring (deterministic, no LLM) ─────────────────

export interface Stage3Request {
  userId: string;
  conceptId: string;
  candidates: CandidateConcept[];
  tradeoffNotes: ConceptTradeoffNote[];
}

export interface Stage3Result {
  conceptId: string;
  rankedConcepts: RankedConcept[];
}

export async function runRankingScoringStage(request: Stage3Request): Promise<Stage3Result> {
  const { userId, conceptId, candidates, tradeoffNotes } = request;
  await assertConceptOwnership(conceptId, userId);
  await updateConceptStatus(conceptId, "processing");

  const start = Date.now();
  try {
    const rankedConcepts = rankConcepts(candidates, tradeoffNotes);
    await logConceptStageRun(
      conceptId,
      "ranking_scoring",
      { candidates, tradeoffNotes },
      { rankedConcepts },
      "success",
      Date.now() - start,
    );
    return { conceptId, rankedConcepts };
  } catch (err) {
    throw await recordStageFailure(conceptId, "ranking_scoring", err);
  }
}

// ── Stage 04 — Output Interface ──────────────────────────────────────────

export interface Stage4Request {
  userId: string;
  conceptId: string;
  candidates: CandidateConcept[];
  tradeoffNotes: ConceptTradeoffNote[];
  rankedConcepts: RankedConcept[];
}

export interface Stage4Result {
  conceptId: string;
  conceptCode: string;
  candidates: CandidateConcept[];
  tradeoffNotes: ConceptTradeoffNote[];
  rankedConcepts: RankedConcept[];
  confidenceScore: number;
  specVersion: number;
  export: StubResult;
  eventPublish: EventStubResult;
}

// No existing spec defines a confidence formula for Concept Agent the way
// Mission Agent's Section 4.3.1 does — this is a simple, explainable
// default: the top-ranked concept's own fit score (1-10), scaled to 0-1.
function computeConceptConfidence(rankedConcepts: RankedConcept[]): number {
  if (rankedConcepts.length === 0) return 0;
  return Math.max(0, Math.min(1, rankedConcepts[0].fitScore / 10));
}

export async function runConceptOutputInterfaceStage(
  request: Stage4Request,
): Promise<Stage4Result> {
  const { userId, conceptId, candidates, tradeoffNotes, rankedConcepts } = request;
  const concept = await assertConceptOwnership(conceptId, userId);
  await updateConceptStatus(conceptId, "processing");

  const start = Date.now();
  try {
    const confidenceScore = computeConceptConfidence(rankedConcepts);
    const specRow = await persistConceptSpec(conceptId, {
      candidateConcepts: candidates,
      tradeOffNotes: tradeoffNotes,
      rankedConcepts,
      confidenceScore,
    });
    await updateConceptStatus(conceptId, "spec_ready", confidenceScore);
    const exportResult = stubExport();
    const eventResult = stubEventPublish();
    await logConceptStageRun(
      conceptId,
      "output_interface",
      { conceptId },
      {
        persistedSpecId: specRow.id,
        version: specRow.version,
        export: exportResult,
        eventPublish: eventResult,
      },
      "success",
      Date.now() - start,
    );

    return {
      conceptId,
      conceptCode: concept.concept_code,
      candidates,
      tradeoffNotes,
      rankedConcepts,
      confidenceScore,
      specVersion: specRow.version,
      export: exportResult,
      eventPublish: eventResult,
    };
  } catch (err) {
    throw await recordStageFailure(conceptId, "output_interface", err);
  }
}

// ── Save as final ─────────────────────────────────────────────────────────

export interface FinalizeConceptRequest {
  userId: string;
  conceptId: string;
}

export interface FinalizeConceptResult {
  conceptId: string;
  status: "finalized";
}

export async function finalizeConcept(
  request: FinalizeConceptRequest,
): Promise<FinalizeConceptResult> {
  const { userId, conceptId } = request;
  await assertConceptOwnership(conceptId, userId);
  await updateConceptStatus(conceptId, "finalized");
  return { conceptId, status: "finalized" };
}

// ── "Your concepts" list ──────────────────────────────────────────────────

export interface ConceptListEntry {
  conceptId: string;
  conceptCode: string;
  sourceMissionId: string;
  status: ConceptStatus;
  createdAt: string;
  candidateConcepts: CandidateConcept[] | null;
  tradeOffNotes: ConceptTradeoffNote[] | null;
  rankedConcepts: RankedConcept[] | null;
  confidenceScore: number | null;
}

export async function listConceptsForUser(userId: string): Promise<ConceptListEntry[]> {
  const concepts = await listUserConcepts(userId);
  const conceptIds = concepts.map((c) => c.id);
  const specs = await getSpecsForConcepts(conceptIds);
  const specsByConcept = new Map(specs.map((s) => [s.concept_id, s]));

  return concepts.map((c): ConceptListEntry => {
    const spec = specsByConcept.get(c.id);
    return {
      conceptId: c.id,
      conceptCode: c.concept_code,
      sourceMissionId: c.source_mission_id,
      status: c.status,
      createdAt: c.created_at,
      candidateConcepts: spec ? (spec.candidate_concepts as unknown as CandidateConcept[]) : null,
      tradeOffNotes: spec ? (spec.trade_off_notes as unknown as ConceptTradeoffNote[]) : null,
      rankedConcepts: spec ? (spec.ranked_concepts as unknown as RankedConcept[]) : null,
      confidenceScore: spec?.confidence_score ?? null,
    };
  });
}
