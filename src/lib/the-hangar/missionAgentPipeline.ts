import { extractIntentAndEntities } from "./intentExtraction.ts";
import { decomposeMission } from "./missionDecomposition.ts";
import { identifyConstraintsAndKpis } from "./constraintIdentification.ts";
import { prioritizeTradeoffs } from "./tradeoffPrioritization.ts";
import { runOutputGeneration } from "./stage3Orchestrator.ts";
import { resolveDirectReferences } from "./directReferenceResolver.ts";
import { parseNaturalLanguageAndFormSources } from "./missionSourceParsing.ts";
import {
  createMission,
  getMission,
  updateMissionStatus,
  persistMissionSpec,
  logStageRun,
  type AgentRunStage,
} from "./missionPersistence.ts";
import { stubExport, stubEventPublish } from "./exportAndEventStubs.ts";
import type { MissionSourceInput } from "./types/hangar-mission";

// Stage 2.4 orchestrator (MissionAgent.md Section 12.1's `runMissionAgent`,
// adapted) — the full Stage 2.1 -> 2.2 -> 2.3 -> 2.4 chain, driven by the
// actual Section 12 input schema (an array of MissionSourceInput, not
// hand-fed rawTextCombined/structuredFields like the Phase 4 test route
// used). This is the piece that didn't exist yet: Stages 2.1-2.3 each had
// their own createServerFn, but nothing chained them from raw sources
// through to a persisted spec until now.
//
// Not a createServerFn itself — Section 12.1's own architecture note:
// "the intake UI's 'Process Mission' button calls a server route ... which
// runs runMissionAgent internally." The server route IS the HTTP boundary;
// this is the plain module it calls, same relationship as every other
// stage file's relationship to whatever route eventually calls it.

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

export interface RunMissionAgentInput {
  userId: string;
  /** Omit to create a new Hangar_missions row; pass an existing id to attach to it (Section 4.4.1's persistence step). */
  missionId?: string;
  sources: MissionSourceInput[];
}

export interface RunMissionAgentResult {
  missionId: string;
  missionSpecs: Record<string, unknown>;
  constraints: unknown[];
  kpis: unknown[];
  summary: string;
  confidenceScore: number;
}

export async function runMissionAgent(input: RunMissionAgentInput): Promise<RunMissionAgentResult> {
  const { userId, sources } = input;
  const { rawTextCombined, structuredFields, sourceTypesUsed } =
    parseNaturalLanguageAndFormSources(sources);

  // Ordering requirement (Section 12.1): the mission row exists before the
  // pipeline runs, not created inside it — mirrored here as "attach to an
  // existing one, or create it right now" rather than deferred further in.
  let mission = input.missionId ? await getMission(input.missionId) : null;
  if (input.missionId && !mission) {
    throw new Error(
      `runMissionAgent: no Hangar_missions row found for missionId "${input.missionId}"`,
    );
  }
  if (mission && mission.user_id !== userId) {
    throw new Error(`runMissionAgent: mission "${mission.id}" does not belong to user "${userId}"`);
  }
  if (!mission) {
    mission = await createMission(userId, sourceTypesUsed);
  }
  const missionId = mission.id;

  await updateMissionStatus(missionId, "processing");

  let currentStage: AgentRunStage = "input_processing";
  try {
    // Step 0 + Stage 2.1 — direct reference resolution, then combined intent+entity extraction.
    let start = Date.now();
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
    await logStageRun(
      missionId,
      "input_processing",
      { rawTextCombined, structuredFields, attachedRegulations: directRefs.attachedRegulations },
      extraction,
      "success",
      Date.now() - start,
    );

    // Stage 2.2 — decomposition, constraints + KPIs, trade-off prioritization.
    currentStage = "reasoning_planning";
    start = Date.now();
    const decomposition = await decomposeMission({
      data: { detectedIntent: extraction.intent, extractedEntities: extraction },
    });
    const constraintsAndKpis = await identifyConstraintsAndKpis({
      data: {
        decomposedElements: decomposition.decomposedElements,
        extractedEntities: extraction,
        structuredFields,
        attachedRegulations: directRefs.attachedRegulations,
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

    // Stage 2.3 — spec assembly, summary, confidence score.
    currentStage = "output_generation";
    start = Date.now();
    const stage3 = await runOutputGeneration({
      data: {
        missionId,
        detectedIntent: extraction.intent,
        sourceTypesUsedCount: sourceTypesUsed.length,
        // TODO: wire rulesEngine.ts's validateRange/flagMissingRequired
        // against the merged entities once Stage 2.1's intake actually
        // runs them — Section 4.1's rules-engine validation isn't called
        // anywhere in this pipeline yet, so this is always 0 today.
        validationFlagCount: 0,
        operatingEnvironment:
          typeof structuredFields.operating_environment === "string"
            ? structuredFields.operating_environment
            : null,
        decomposedElements: decomposition.decomposedElements,
        identifiedConstraints: constraintsAndKpis.identifiedConstraints,
        derivedKpis: constraintsAndKpis.derivedKpis,
        prioritizedTradeoffs,
      },
    });
    await logStageRun(
      missionId,
      "output_generation",
      { missionId },
      stage3,
      "success",
      Date.now() - start,
    );

    // Stage 2.4 — persistence (blocks everything below it), then the
    // stub channels. Section 4.4.1: persistence is the one true
    // bottleneck; the stubs here are synchronous no-ops today (no real
    // async work to defer yet), but are sequenced after persistence
    // regardless, matching where a real implementation would place them.
    currentStage = "output_interface";
    start = Date.now();
    // Stage3Output.missionSpecs is the concrete MissionSpecsFields shape
    // (see stage3Orchestrator.ts for why it isn't typed Record<string,
    // unknown> there); the jsonb column and this pipeline's own return
    // type both just need a plain serializable object.
    const missionSpecsRecord = stage3.missionSpecs as unknown as Record<string, unknown>;
    const specRow = await persistMissionSpec(missionId, {
      ...stage3,
      missionSpecs: missionSpecsRecord,
    });
    await updateMissionStatus(missionId, "spec_ready", stage3.confidenceScore);
    const exportResult = stubExport();
    const eventResult = stubEventPublish();
    await logStageRun(
      missionId,
      "output_interface",
      { missionSpec: stage3 },
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
      missionSpecs: missionSpecsRecord,
      constraints: stage3.constraints,
      kpis: stage3.kpis,
      summary: stage3.summary,
      confidenceScore: stage3.confidenceScore,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await logStageRun(missionId, currentStage, null, null, "error", 0, message);
    // Best-effort — if even the status update fails, the thrown
    // MissionAgentError below is still the caller's signal that something
    // went wrong; don't let a second failure here mask the first.
    await updateMissionStatus(missionId, "error").catch(() => {});
    throw new MissionAgentError(message, missionId, currentStage);
  }
}
