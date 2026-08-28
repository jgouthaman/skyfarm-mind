import { extractIntentAndEntities, type IntentExtractionResult } from "./intentExtraction.ts";
import { decomposeMission } from "./missionDecomposition.ts";
import { identifyConstraintsAndKpis, type TracedConstraint } from "./constraintIdentification.ts";
import { prioritizeTradeoffs } from "./tradeoffPrioritization.ts";
import { runOutputGeneration, type Stage3Output } from "./stage3Orchestrator.ts";
import type {
  FinalizedConstraint,
  FinalizedKpi,
  MissionSpecsFields,
} from "./missionSpecAssembly.ts";
import { resolveDirectReferences } from "./directReferenceResolver.ts";
import { parseNaturalLanguageAndFormSources } from "./missionSourceParsing.ts";
import { hasUsableContent, computeValidationFlags } from "./missionInputValidation.ts";
import {
  createMission,
  getMission,
  updateMissionStatus,
  persistMissionSpec,
  logStageRun,
  listUserMissions,
  getSpecsForMissions,
  getOriginalBriefsForMissions,
  type AgentRunStage,
  type HangarMissionRow,
  type MissionStatus,
} from "./missionPersistence.ts";
import {
  stubExport,
  stubEventPublish,
  type StubResult,
  type EventStubResult,
} from "./exportAndEventStubs.ts";
import type {
  DerivedKpi,
  MissionSourceInput,
  PrioritizedTradeoff,
  SourceType,
} from "./types/hangar-mission";

// Stage 2.4 orchestrator (MissionAgent.md Section 12.1's `runMissionAgent`,
// adapted) — split into 4 independently-callable stage functions so the UI
// can pause after each one for a "review findings, then proceed" flow
// instead of running all 4 stages in one request. Each function below does
// exactly the slice of work the original single `runMissionAgent` did for
// that stage; only the orchestration boundary moved, not the underlying
// per-stage logic (still the same LLM calls, domain rules, and DB writes).

export class MissionAgentError extends Error {
  constructor(
    message: string,
    public readonly missionId: string,
    public readonly stage: AgentRunStage,
  ) {
    super(message);
    this.name = "MissionAgentError";
  }
}

// Section 12.1: "Validate before calling the LLM, not after ... so a bad
// submission fails fast without burning an API call." Thrown before any
// Hangar_missions row is touched — there's nothing to attach a stage log
// to yet, unlike MissionAgentError which always has a real missionId.
export class InvalidMissionInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidMissionInputError";
  }
}

// Every call from Stage 2 onward carries a client-supplied missionId (the
// gated flow always resumes an existing mission, unlike the old single-shot
// call where it was optional) — so ownership must be checked on every one
// of them, not just optionally. Without this, any authenticated user who
// learns/guesses a missionId could advance or corrupt someone else's
// in-flight mission.
async function assertMissionOwnership(
  missionId: string,
  userId: string,
): Promise<HangarMissionRow> {
  const mission = await getMission(missionId);
  if (!mission) {
    throw new Error(`No Hangar_missions row found for missionId "${missionId}"`);
  }
  if (mission.user_id !== userId) {
    throw new Error(`Mission "${mission.id}" does not belong to user "${userId}"`);
  }
  return mission;
}

// Logs the failure + best-effort flips Hangar_missions.status to 'error',
// then returns (doesn't throw) a MissionAgentError — call sites do
// `throw await recordStageFailure(...)`, keeping each stage function's
// catch block to one line.
async function recordStageFailure(
  missionId: string,
  stage: AgentRunStage,
  error: unknown,
): Promise<MissionAgentError> {
  const message = error instanceof Error ? error.message : String(error);
  await logStageRun(missionId, stage, null, null, "error", 0, message);
  // Best-effort — if even the status update fails, the thrown
  // MissionAgentError is still the caller's signal that something went
  // wrong; don't let a second failure here mask the first.
  await updateMissionStatus(missionId, "error").catch(() => {});
  return new MissionAgentError(message, missionId, stage);
}

// ── Stage 01 — Input Processing ──────────────────────────────────────────

export interface Stage1Request {
  userId: string;
  sources: MissionSourceInput[];
}

export interface Stage1Result {
  missionId: string;
  missionCode: string;
  structuredFields: Record<string, unknown>;
  sourceTypesUsed: SourceType[];
  attachedRegulations: string[];
  extraction: IntentExtractionResult;
  validationFlags: string[];
}

export async function runInputProcessingStage(request: Stage1Request): Promise<Stage1Result> {
  const { userId, sources } = request;
  const { rawTextCombined, structuredFields, sourceTypesUsed } =
    parseNaturalLanguageAndFormSources(sources);

  if (!hasUsableContent(rawTextCombined, structuredFields)) {
    throw new InvalidMissionInputError(
      "Sources contain no usable content (no natural language/document text and no requirements form fields) — rejected before calling the LLM.",
    );
  }

  const mission = await createMission(userId, sourceTypesUsed);
  const missionId = mission.id;
  await updateMissionStatus(missionId, "processing");

  const start = Date.now();
  try {
    const directRefs = await resolveDirectReferences(sources);
    const extraction = await extractIntentAndEntities({
      data: {
        rawTextCombined,
        structuredFields,
        groundingContext: {
          importedMissionSpec: directRefs.importedMissionSpec,
          regulationDetails: directRefs.regulationDetails,
          marketDataDetails: directRefs.marketDataDetails,
        },
      },
    });

    const validationFlags = computeValidationFlags(extraction, structuredFields);

    await logStageRun(
      missionId,
      "input_processing",
      { rawTextCombined, structuredFields, attachedRegulations: directRefs.attachedRegulations },
      { ...extraction, validationFlags },
      "success",
      Date.now() - start,
    );

    return {
      missionId,
      missionCode: mission.mission_code,
      structuredFields,
      sourceTypesUsed,
      attachedRegulations: directRefs.attachedRegulations,
      extraction,
      validationFlags,
    };
  } catch (err) {
    throw await recordStageFailure(missionId, "input_processing", err);
  }
}

// ── Stage 02 — Reasoning & Planning ──────────────────────────────────────

export interface Stage2Request {
  userId: string;
  missionId: string;
  extraction: IntentExtractionResult;
  structuredFields: Record<string, unknown>;
  attachedRegulations: string[];
}

export interface Stage2Result {
  missionId: string;
  decomposedElements: string[];
  identifiedConstraints: TracedConstraint[];
  derivedKpis: DerivedKpi[];
  prioritizedTradeoffs: PrioritizedTradeoff[];
  mock: boolean;
}

export async function runReasoningPlanningStage(request: Stage2Request): Promise<Stage2Result> {
  const { userId, missionId, extraction, structuredFields, attachedRegulations } = request;
  await assertMissionOwnership(missionId, userId);
  await updateMissionStatus(missionId, "processing");

  const start = Date.now();
  try {
    const decomposition = await decomposeMission({
      data: { detectedIntent: extraction.intent, extractedEntities: extraction },
    });
    const constraintsAndKpis = await identifyConstraintsAndKpis({
      data: {
        decomposedElements: decomposition.decomposedElements,
        extractedEntities: extraction,
        structuredFields,
        attachedRegulations,
      },
    });
    const prioritizedTradeoffs = prioritizeTradeoffs({
      identifiedConstraints: constraintsAndKpis.identifiedConstraints,
      derivedKpis: constraintsAndKpis.derivedKpis,
      prioritySignals: extraction.constraintHints,
    });

    await logStageRun(
      missionId,
      "reasoning_planning",
      { decomposedElements: decomposition.decomposedElements },
      {
        identifiedConstraints: constraintsAndKpis.identifiedConstraints,
        derivedKpis: constraintsAndKpis.derivedKpis,
        prioritizedTradeoffs,
      },
      "success",
      Date.now() - start,
    );

    return {
      missionId,
      decomposedElements: decomposition.decomposedElements,
      identifiedConstraints: constraintsAndKpis.identifiedConstraints,
      derivedKpis: constraintsAndKpis.derivedKpis,
      prioritizedTradeoffs,
      mock: decomposition.mock || constraintsAndKpis.mock,
    };
  } catch (err) {
    throw await recordStageFailure(missionId, "reasoning_planning", err);
  }
}

// ── Stage 03 — Output Generation ─────────────────────────────────────────

export interface Stage3Request {
  userId: string;
  missionId: string;
  detectedIntent: string;
  sourceTypesUsedCount: number;
  validationFlagCount: number;
  operatingEnvironment?: string | null;
  decomposedElements: string[];
  identifiedConstraints: TracedConstraint[];
  derivedKpis: DerivedKpi[];
  prioritizedTradeoffs: PrioritizedTradeoff[];
}

export async function runOutputGenerationStage(request: Stage3Request): Promise<Stage3Output> {
  const { userId, missionId, ...stage3Input } = request;
  await assertMissionOwnership(missionId, userId);
  await updateMissionStatus(missionId, "processing");

  const start = Date.now();
  try {
    const stage3 = await runOutputGeneration({ data: { missionId, ...stage3Input } });
    await logStageRun(
      missionId,
      "output_generation",
      { missionId },
      stage3,
      "success",
      Date.now() - start,
    );
    return stage3;
  } catch (err) {
    throw await recordStageFailure(missionId, "output_generation", err);
  }
}

// ── Stage 04 — Output Interface ──────────────────────────────────────────

export interface Stage4Request {
  userId: string;
  missionId: string;
  missionSpecs: MissionSpecsFields;
  constraints: FinalizedConstraint[];
  kpis: FinalizedKpi[];
  summary: string;
  confidenceScore: number;
}

export interface Stage4Result {
  missionId: string;
  missionCode: string;
  missionSpecs: MissionSpecsFields;
  constraints: FinalizedConstraint[];
  kpis: FinalizedKpi[];
  summary: string;
  confidenceScore: number;
  specVersion: number;
  export: StubResult;
  eventPublish: EventStubResult;
}

export async function runOutputInterfaceStage(request: Stage4Request): Promise<Stage4Result> {
  const { userId, missionId, missionSpecs, constraints, kpis, summary, confidenceScore } = request;
  const mission = await assertMissionOwnership(missionId, userId);
  await updateMissionStatus(missionId, "processing");

  const start = Date.now();
  try {
    // Stage3Output.missionSpecs is the concrete MissionSpecsFields shape
    // (see stage3Orchestrator.ts for why it isn't typed Record<string,
    // unknown> there); the jsonb column just needs a plain serializable
    // object.
    const missionSpecsRecord = missionSpecs as unknown as Record<string, unknown>;
    const specRow = await persistMissionSpec(missionId, {
      missionSpecs: missionSpecsRecord,
      constraints,
      kpis,
      summary,
      confidenceScore,
    });
    await updateMissionStatus(missionId, "spec_ready", confidenceScore);
    const exportResult = stubExport();
    const eventResult = stubEventPublish();
    await logStageRun(
      missionId,
      "output_interface",
      { missionId },
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
      missionId,
      missionCode: mission.mission_code,
      missionSpecs,
      constraints,
      kpis,
      summary,
      confidenceScore,
      specVersion: specRow.version,
      export: exportResult,
      eventPublish: eventResult,
    };
  } catch (err) {
    throw await recordStageFailure(missionId, "output_interface", err);
  }
}

// ── Save as final (Section 13.2) ─────────────────────────────────────────
//
// "The first generation is saved immediately as version 1 (a draft) ...
// 'Save as final' simply confirms version 1 as-is (a status flip, not a
// new row)." Not one of the 4 pipeline stages, so deliberately doesn't call
// logStageRun — Hangar_agent_runs' own check constraint only accepts the 4
// stage names (see the comment on AgentRunStage), and this isn't a stage.

export interface FinalizeMissionRequest {
  userId: string;
  missionId: string;
}

export interface FinalizeMissionResult {
  missionId: string;
  status: "finalized";
}

export async function finalizeMission(
  request: FinalizeMissionRequest,
): Promise<FinalizeMissionResult> {
  const { userId, missionId } = request;
  await assertMissionOwnership(missionId, userId);
  await updateMissionStatus(missionId, "finalized");
  return { missionId, status: "finalized" };
}

// ── "Your missions" list ─────────────────────────────────────────────────
//
// Not part of MissionAgent.md — this session's own addition, so the intake
// page can show every mission this user has ever submitted (not just the
// one currently in progress) and let them reopen a past spec. One request
// assembles everything the list + detail view needs (brief, spec, findings)
// so opening a past mission is a client-side reveal, not a second fetch.

export interface MissionListEntry {
  missionId: string;
  missionCode: string;
  status: MissionStatus;
  createdAt: string;
  briefText: string | null;
  sourceTypesUsedCount: number;
  missionSpecs: MissionSpecsFields | null;
  constraints: FinalizedConstraint[] | null;
  kpis: FinalizedKpi[] | null;
  summary: string | null;
  confidenceScore: number | null;
}

export async function listMissionsForUser(
  userId: string,
  statusFilter?: MissionStatus,
): Promise<MissionListEntry[]> {
  const missions = await listUserMissions(userId, statusFilter);
  const missionIds = missions.map((m) => m.id);
  const [specs, briefs] = await Promise.all([
    getSpecsForMissions(missionIds),
    getOriginalBriefsForMissions(missionIds),
  ]);
  const specsByMission = new Map(specs.map((s) => [s.mission_id, s]));

  return missions.map((m): MissionListEntry => {
    const spec = specsByMission.get(m.id);
    return {
      missionId: m.id,
      missionCode: m.mission_code,
      status: m.status,
      createdAt: m.created_at,
      briefText: briefs.get(m.id) ?? null,
      sourceTypesUsedCount: m.source_types_used.length,
      missionSpecs: spec ? (spec.mission_specs as unknown as MissionSpecsFields) : null,
      constraints: spec ? (spec.constraints as unknown as FinalizedConstraint[]) : null,
      kpis: spec ? (spec.kpis as unknown as FinalizedKpi[]) : null,
      summary: spec?.summary ?? null,
      confidenceScore: spec?.confidence_score ?? null,
    };
  });
}
