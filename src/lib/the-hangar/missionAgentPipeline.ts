import { extractIntentAndEntities, type IntentExtractionResult } from "./intentExtraction.ts";
import { decomposeMission } from "./missionDecomposition.ts";
import { identifyConstraintsAndKpis, type TracedConstraint } from "./constraintIdentification.ts";
import { prioritizeTradeoffs } from "./tradeoffPrioritization.ts";
import { sumUsage, type LlmUsage } from "./llmGateway.ts";
import { runOutputGeneration, type Stage3Output } from "./stage3Orchestrator.ts";
import type { MissionUsage } from "./missionUsage.ts";
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
  getLatestStageRun,
  getUsageForMissions,
  logMissionAudit,
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

// Stages 1-3 write a success row that is ALSO the input to the next stage:
// Stage 2 reads Stage 1's row, Stage 3 reads Stages 1+2's, Stage 4 reads
// Stage 3's. None of them take their inputs from the request body, since
// anything in a request body can be forged by the caller (see
// getLatestStageRun). That makes a failed log write a real failure — the
// user would otherwise get a result that the next click can't build on —
// so unlike logStageRun's own best-effort contract, these throw.
async function logStageSuccess(
  missionId: string,
  stage: AgentRunStage,
  input: unknown,
  output: unknown,
  durationMs: number,
): Promise<void> {
  const written = await logStageRun(missionId, stage, input, output, "success", durationMs);
  if (!written) {
    throw new Error(`Could not record the ${stage} result — the next stage reads it from there`);
  }
}

// The latest successful run of an earlier stage, or a 400 telling the caller
// to run the earlier stage first. Thrown BEFORE the calling stage flips the
// mission to 'processing', so an out-of-order call can't disturb a mission
// that's already sitting at spec_ready/finalized.
async function requireStageRun(
  missionId: string,
  stage: AgentRunStage,
): Promise<{ input: Record<string, unknown>; output: Record<string, unknown> }> {
  const run = await getLatestStageRun(missionId, stage);
  if (!run || typeof run.output !== "object" || run.output === null) {
    throw new InvalidMissionInputError(
      `The ${stage} stage has not completed for this mission — run the earlier stages first.`,
    );
  }
  return {
    input: (run.input ?? {}) as Record<string, unknown>,
    output: run.output as Record<string, unknown>,
  };
}

function storedField<T>(record: Record<string, unknown>, key: string, stage: AgentRunStage): T {
  const value = record[key];
  if (value === undefined || value === null) {
    throw new Error(`Stored ${stage} record is missing "${key}"`);
  }
  return value as T;
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
  durationMs: number;
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
  await logMissionAudit(missionId, userId, "mission_created", { sourceTypesUsed });
  await updateMissionStatus(missionId, "processing");

  const start = Date.now();
  try {
    const directRefs = await resolveDirectReferences(sources, userId);
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
    const durationMs = Date.now() - start;

    await logStageSuccess(
      missionId,
      "input_processing",
      { rawTextCombined, structuredFields, attachedRegulations: directRefs.attachedRegulations },
      { ...extraction, validationFlags },
      durationMs,
    );

    return {
      missionId,
      missionCode: mission.mission_code,
      structuredFields,
      sourceTypesUsed,
      attachedRegulations: directRefs.attachedRegulations,
      extraction,
      validationFlags,
      durationMs,
    };
  } catch (err) {
    throw await recordStageFailure(missionId, "input_processing", err);
  }
}

// ── Stage 02 — Reasoning & Planning ──────────────────────────────────────

// The ONE thing the browser still contributes here: the gap-fill wizard's
// answers (Stage 1 flagged payload/range/endurance as missing and the user
// supplied them). Those are genuine user input, but they're accepted only for
// these three known keys and only as positive finite numbers — everything
// else Stage 2 needs (extraction, structured fields, regulations) comes from
// Stage 1's stored record, not from the request.
const GAP_OVERRIDE_KEYS = ["payload_kg", "range_km", "endurance_min"] as const;

function sanitizeGapOverrides(raw: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (typeof raw !== "object" || raw === null) return out;
  for (const key of GAP_OVERRIDE_KEYS) {
    const value = (raw as Record<string, unknown>)[key];
    if (typeof value === "number" && Number.isFinite(value) && value > 0) out[key] = value;
  }
  return out;
}

export interface Stage2Request {
  userId: string;
  missionId: string;
  gapOverrides?: Record<string, unknown>;
}

export interface Stage2Result {
  missionId: string;
  decomposedElements: string[];
  identifiedConstraints: TracedConstraint[];
  derivedKpis: DerivedKpi[];
  prioritizedTradeoffs: PrioritizedTradeoff[];
  mock: boolean;
  // This stage makes 2 separate LLM calls (decomposition, then combined
  // constraint+KPI) — requestCount/usage are the sum across whichever of
  // those 2 actually reached Claude (mock is true if EITHER failed, but
  // that alone can't tell you if it was 1 of 2 or 2 of 2).
  requestCount: number;
  usage: LlmUsage;
  durationMs: number;
}

export async function runReasoningPlanningStage(request: Stage2Request): Promise<Stage2Result> {
  const { userId, missionId } = request;
  await assertMissionOwnership(missionId, userId);
  const stage1 = await requireStageRun(missionId, "input_processing");
  const { validationFlags: _flags, ...extractionRecord } = stage1.output;
  const extraction = extractionRecord as unknown as IntentExtractionResult;
  const gapOverrides = sanitizeGapOverrides(request.gapOverrides);
  const structuredFields = {
    ...storedField<Record<string, unknown>>(stage1.input, "structuredFields", "input_processing"),
    ...gapOverrides,
  };
  const attachedRegulations = storedField<string[]>(
    stage1.input,
    "attachedRegulations",
    "input_processing",
  );
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

    const durationMs = Date.now() - start;

    await logStageSuccess(
      missionId,
      "reasoning_planning",
      { decomposedElements: decomposition.decomposedElements, gapOverrides },
      {
        identifiedConstraints: constraintsAndKpis.identifiedConstraints,
        derivedKpis: constraintsAndKpis.derivedKpis,
        prioritizedTradeoffs,
        // Logged so per-mission cost can be rebuilt from Hangar_agent_runs
        // later (missionUsage.ts) — Stages 1 and 3 already carry theirs.
        usage: sumUsage(decomposition.usage, constraintsAndKpis.usage),
        requestCount: (decomposition.mock ? 0 : 1) + (constraintsAndKpis.mock ? 0 : 1),
        mock: decomposition.mock || constraintsAndKpis.mock,
      },
      durationMs,
    );

    return {
      missionId,
      decomposedElements: decomposition.decomposedElements,
      identifiedConstraints: constraintsAndKpis.identifiedConstraints,
      derivedKpis: constraintsAndKpis.derivedKpis,
      prioritizedTradeoffs,
      mock: decomposition.mock || constraintsAndKpis.mock,
      requestCount: (decomposition.mock ? 0 : 1) + (constraintsAndKpis.mock ? 0 : 1),
      usage: sumUsage(decomposition.usage, constraintsAndKpis.usage),
      durationMs,
    };
  } catch (err) {
    throw await recordStageFailure(missionId, "reasoning_planning", err);
  }
}

// ── Stage 03 — Output Generation ─────────────────────────────────────────

// The request carries only the mission id. Everything the confidence score
// is computed from — source count, derived KPIs, validation flag count — is
// read server-side: the source count off the Hangar_missions row, the flags
// from Stage 1's record, the KPIs/constraints from Stage 2's. Taking any of
// those from the browser would let a caller dictate their own score.
export interface Stage3Request {
  userId: string;
  missionId: string;
}

export async function runOutputGenerationStage(request: Stage3Request): Promise<Stage3Output> {
  const { userId, missionId } = request;
  const mission = await assertMissionOwnership(missionId, userId);
  const stage1 = await requireStageRun(missionId, "input_processing");
  const stage2 = await requireStageRun(missionId, "reasoning_planning");
  const structuredFields = storedField<Record<string, unknown>>(
    stage1.input,
    "structuredFields",
    "input_processing",
  );
  const stage3Input = {
    detectedIntent: storedField<string>(stage1.output, "intent", "input_processing"),
    // Optional: a mission whose Stage 1 ran before intent categories existed
    // has no stored category — it just gets no category-based vertical.
    intentCategory:
      typeof stage1.output.intentCategory === "string" ? stage1.output.intentCategory : null,
    sourceTypesUsedCount: mission.source_types_used.length,
    validationFlagCount: storedField<string[]>(stage1.output, "validationFlags", "input_processing")
      .length,
    operatingEnvironment:
      typeof structuredFields.operating_environment === "string"
        ? structuredFields.operating_environment
        : null,
    decomposedElements: storedField<string[]>(stage2.input, "decomposedElements", "reasoning_planning"),
    identifiedConstraints: storedField<TracedConstraint[]>(
      stage2.output,
      "identifiedConstraints",
      "reasoning_planning",
    ),
    derivedKpis: storedField<DerivedKpi[]>(stage2.output, "derivedKpis", "reasoning_planning"),
    prioritizedTradeoffs: storedField<PrioritizedTradeoff[]>(
      stage2.output,
      "prioritizedTradeoffs",
      "reasoning_planning",
    ),
  };
  await updateMissionStatus(missionId, "processing");

  const start = Date.now();
  try {
    const stage3 = await runOutputGeneration({ data: { missionId, ...stage3Input } });
    const durationMs = Date.now() - start;
    await logStageSuccess(missionId, "output_generation", { missionId }, stage3, durationMs);
    return { ...stage3, durationMs };
  } catch (err) {
    throw await recordStageFailure(missionId, "output_generation", err);
  }
}

// ── Stage 04 — Output Interface ──────────────────────────────────────────

// The request carries only the mission id: the spec that gets persisted is
// Stage 3's own stored output, never a copy the browser echoes back. What
// lands in Hangar_mission_specs (and what Concept/Bernoulli/every later bay
// then trusts) is therefore always something this server generated — in
// particular the confidence score is always the Section 4.3.1 formula's
// result, not a number the caller chose.
export interface Stage4Request {
  userId: string;
  missionId: string;
}

export interface Stage4Result {
  missionId: string;
  missionCode: string;
  missionSpecs: MissionSpecsFields;
  constraints: FinalizedConstraint[];
  kpis: FinalizedKpi[];
  summary: string;
  confidenceScore: number;
  validationFlags: string[];
  specVersion: number;
  export: StubResult;
  eventPublish: EventStubResult;
}

export async function runOutputInterfaceStage(request: Stage4Request): Promise<Stage4Result> {
  const { userId, missionId } = request;
  const mission = await assertMissionOwnership(missionId, userId);
  const stage1 = await requireStageRun(missionId, "input_processing");
  const stage3 = await requireStageRun(missionId, "output_generation");
  const validationFlags = storedField<string[]>(stage1.output, "validationFlags", "input_processing");
  const missionSpecs = storedField<MissionSpecsFields>(stage3.output, "missionSpecs", "output_generation");
  const constraints = storedField<FinalizedConstraint[]>(stage3.output, "constraints", "output_generation");
  const kpis = storedField<FinalizedKpi[]>(stage3.output, "kpis", "output_generation");
  const summary = storedField<string>(stage3.output, "summary", "output_generation");
  const confidenceScore = storedField<number>(stage3.output, "confidenceScore", "output_generation");
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
    await logMissionAudit(missionId, userId, "spec_generated", {
      version: specRow.version,
      confidenceScore,
    });
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
      validationFlags,
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
  const mission = await assertMissionOwnership(missionId, userId);
  // Only a mission that actually has a persisted spec can be confirmed —
  // otherwise a draft/processing/error mission could be flipped to
  // 'finalized' via a direct API call and then be picked up by Concept Agent
  // (which trusts status = 'finalized'). Already-finalized stays a no-op.
  if (mission.status !== "spec_ready" && mission.status !== "finalized") {
    throw new InvalidMissionInputError(
      `Mission has no generated spec to finalize (status: ${mission.status})`,
    );
  }
  await updateMissionStatus(missionId, "finalized");
  // Only record a real transition — finalizing an already-final mission is a no-op.
  if (mission.status !== "finalized") {
    await logMissionAudit(missionId, userId, "mission_finalized", {
      confidenceScore: mission.confidence_score,
    });
  }
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
  /** Latest persisted spec version — null until a spec exists. */
  specVersion: number | null;
  /** LLM requests/tokens/estimated cost, rebuilt from the run log. null when unavailable. */
  usage: MissionUsage | null;
}

export async function listMissionsForUser(
  userId: string,
  statusFilter?: MissionStatus,
): Promise<MissionListEntry[]> {
  const missions = await listUserMissions(userId, statusFilter);
  const missionIds = missions.map((m) => m.id);
  const [specs, briefs, usageByMission] = await Promise.all([
    getSpecsForMissions(missionIds),
    getOriginalBriefsForMissions(missionIds),
    // Decoration only — if the usage query fails (e.g. a PostgREST/JSON-path
    // problem), the list must still load, just without usage numbers.
    getUsageForMissions(missionIds).catch((err) => {
      console.error("listMissionsForUser: usage unavailable:", err);
      return new Map<string, MissionUsage>();
    }),
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
      specVersion: spec?.version ?? null,
      usage: usageByMission.get(m.id) ?? null,
    };
  });
}
