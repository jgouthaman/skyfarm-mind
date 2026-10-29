import { getMission, getSpecsForMissions } from "./missionPersistence.ts";
import { getConcept, getLatestConceptSpec } from "./conceptPersistence.ts";
import { listBernoulliRules } from "./bernoulliRules.ts";
import {
  computeBernoulliUsage,
  runBernoulliChecks,
  runBernoulliConceptChecks,
  type BernoulliCheckResult,
  type BernoulliReviewResult,
  type BernoulliUsage,
} from "./bernoulliChecks.ts";
import type { FinalizedConstraint, FinalizedKpi, MissionSpecsFields } from "./missionSpecAssembly.ts";
import type { CandidateConcept } from "./conceptIdeation.ts";
import type { ConceptTradeoffNote } from "./tradeoffReasoning.ts";
import type { RankedConcept } from "./conceptRanking.ts";
import {
  createBernoulliReview,
  updateBernoulliReviewStatus,
  persistBernoulliReviewSpec,
  logBernoulliReviewRun,
  getLatestBernoulliReviewForMission,
  type BernoulliReviewRunStage,
  type BernoulliSourceBay,
} from "./bernoulliPersistence.ts";

// Bernoulli Agent orchestrator. Reviews the output of the bay it was called
// from: a mission spec (Bay 01, BERN-M01-M06) or a concept run (Bay 02,
// BERN-C01-C04, judged against the concept's source mission KPIs). Reuses
// each bay's own readers directly, same cross-bay reuse convention every
// other bay's pipeline already follows.
//
// User-triggered review, not a pipeline stage -- Bernoulli doesn't decide
// whether the caller's output proceeds. Every check for that bay runs (or
// whichever subset checksRequested names); the hard-gate checks themselves
// are what can fail the review.

export class BernoulliAgentError extends Error {
  constructor(
    message: string,
    public readonly bernoulliReviewId: string,
    public readonly stage: BernoulliReviewRunStage,
  ) {
    super(message);
    this.name = "BernoulliAgentError";
  }
}

export class InvalidBernoulliInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidBernoulliInputError";
  }
}

export interface BernoulliReviewRequest {
  userId: string;
  missionId: string;
  checksRequested?: string[];
  // The calling bay. "concept" + sourceId (a concept id) reviews that
  // concept run; anything else reviews the mission spec.
  source?: string;
  sourceId?: string;
}

export interface BernoulliReviewResponse {
  reviewId: string;
  reviewCode: string;
  missionId: string;
  sourceBay: BernoulliSourceBay;
  conceptId: string | null;
  conceptCode: string | null;
  verdict: "PASS" | "WARN" | "FAIL";
  checks: BernoulliCheckResult[];
  confidenceScore: number;
  specVersion: number;
  createdAt: string;
  // Derived from `checks` (each LLM check carries its own usage), so a
  // reloaded review gets the same numbers as a fresh one with no extra
  // persistence.
  usage: BernoulliUsage;
  // Same convention as Bay 01's telemetry: only known for a run made in
  // this request; null for a review reloaded from storage.
  durationMs: number | null;
}

interface ConceptTarget {
  conceptId: string;
  conceptCode: string;
  candidates: CandidateConcept[];
  tradeoffNotes: ConceptTradeoffNote[];
  rankedConcepts: RankedConcept[];
}

async function loadConceptTarget(userId: string, conceptId: string): Promise<{ target: ConceptTarget; missionId: string }> {
  const concept = await getConcept(conceptId);
  if (!concept || concept.user_id !== userId) {
    throw new InvalidBernoulliInputError("No accessible concept found for this id.");
  }
  const spec = await getLatestConceptSpec(conceptId);
  if (!spec) {
    throw new InvalidBernoulliInputError("This concept has no generated output yet -- run Concept Agent first.");
  }
  return {
    missionId: concept.source_mission_id,
    target: {
      conceptId,
      conceptCode: concept.concept_code,
      candidates: (spec.candidate_concepts ?? []) as unknown as CandidateConcept[],
      tradeoffNotes: (spec.trade_off_notes ?? []) as unknown as ConceptTradeoffNote[],
      rankedConcepts: (spec.ranked_concepts ?? []) as unknown as RankedConcept[],
    },
  };
}

export async function runBernoulliReviewStage(
  request: BernoulliReviewRequest,
): Promise<BernoulliReviewResponse> {
  const { userId } = request;
  const conceptIdRequested = request.source === "concept" && request.sourceId ? request.sourceId : null;

  // A concept review is anchored to the concept's own source mission, not
  // whatever missionId the client sent alongside it.
  let missionId = request.missionId;
  let conceptTarget: ConceptTarget | null = null;
  if (conceptIdRequested) {
    const loaded = await loadConceptTarget(userId, conceptIdRequested);
    conceptTarget = loaded.target;
    missionId = loaded.missionId;
  }
  if (!missionId) {
    throw new InvalidBernoulliInputError("A spec-ready mission must be selected before running a review.");
  }
  // Which checks run comes from the registry (Mission Hub -> Agents ->
  // Bernoulli): every enabled rule for this bay. A non-empty
  // checksRequested narrows that further; it can't switch a disabled rule on.
  const { rules } = await listBernoulliRules(conceptTarget ? "concept" : "mission");
  const requested =
    request.checksRequested && request.checksRequested.length > 0 ? new Set(request.checksRequested) : null;
  const rulesToRun = rules.filter((r) => r.enabled && (!requested || requested.has(r.ruleId)));
  const checksRequested = rulesToRun.map((r) => r.ruleId);

  const mission = await getMission(missionId);
  if (!mission || mission.user_id !== userId) {
    throw new InvalidBernoulliInputError("No accessible mission found for this id.");
  }
  if (mission.status !== "spec_ready" && mission.status !== "finalized") {
    throw new InvalidBernoulliInputError("Source mission is not spec-ready yet.");
  }

  const [missionSpec] = await getSpecsForMissions([missionId]);
  if (!missionSpec) {
    throw new InvalidBernoulliInputError("No spec has been generated for this mission yet.");
  }

  const review = await createBernoulliReview(userId, missionId, conceptTarget?.conceptId ?? null);
  const reviewId = review.id;
  await updateBernoulliReviewStatus(reviewId, "processing");

  const runInput = { missionId, conceptId: conceptTarget?.conceptId ?? null, checksRequested };
  const start = Date.now();
  try {
    const missionInput = {
      missionSpecs: missionSpec.mission_specs as unknown as MissionSpecsFields,
      constraints: missionSpec.constraints as unknown as FinalizedConstraint[],
      kpis: missionSpec.kpis as unknown as FinalizedKpi[],
    };
    const result: BernoulliReviewResult = conceptTarget
      ? await runBernoulliConceptChecks(
          {
            ...missionInput,
            candidates: conceptTarget.candidates,
            tradeoffNotes: conceptTarget.tradeoffNotes,
            rankedConcepts: conceptTarget.rankedConcepts,
          },
          rulesToRun,
        )
      : await runBernoulliChecks(missionInput, rulesToRun);

    const specRow = await persistBernoulliReviewSpec(reviewId, {
      verdict: result.verdict,
      checks: result.checks as unknown as Record<string, unknown>[],
      confidenceScore: result.confidenceScore,
    });
    await updateBernoulliReviewStatus(reviewId, "spec_ready", result.verdict, result.confidenceScore);
    const durationMs = Date.now() - start;

    await logBernoulliReviewRun(
      reviewId,
      "review",
      runInput,
      { verdict: result.verdict, checks: result.checks, confidenceScore: result.confidenceScore },
      "success",
      durationMs,
    );

    return {
      reviewId,
      reviewCode: review.review_code,
      missionId,
      sourceBay: conceptTarget ? "concept" : "mission",
      conceptId: conceptTarget?.conceptId ?? null,
      conceptCode: conceptTarget?.conceptCode ?? null,
      verdict: result.verdict,
      checks: result.checks,
      confidenceScore: result.confidenceScore,
      specVersion: specRow.version,
      createdAt: specRow.created_at,
      usage: computeBernoulliUsage(result.checks),
      durationMs,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await logBernoulliReviewRun(reviewId, "review", runInput, null, "error", Date.now() - start, message);
    await updateBernoulliReviewStatus(reviewId, "error").catch(() => {});
    throw new BernoulliAgentError(message, reviewId, "review");
  }
}

// "Load the latest saved review" -- called when a mission (or, from Bay 02,
// a concept) is selected on the Bernoulli page, so a previously-run report
// shows immediately instead of requiring another Ask Bernoulli click.
// Returns null (not an error) when nothing's been saved yet -- that's a
// normal, expected state, not a failure.
export async function getLatestBernoulliReview(
  userId: string,
  missionId: string,
  conceptId: string | null = null,
): Promise<BernoulliReviewResponse | null> {
  const found = await getLatestBernoulliReviewForMission(userId, missionId, conceptId);
  if (!found) return null;
  const { review, spec } = found;
  const checks = spec.checks as unknown as BernoulliCheckResult[];
  const concept = review.concept_id ? await getConcept(review.concept_id) : null;
  return {
    reviewId: review.id,
    reviewCode: review.review_code,
    missionId: review.mission_id,
    sourceBay: review.source_bay ?? "mission",
    conceptId: review.concept_id ?? null,
    conceptCode: concept?.concept_code ?? null,
    verdict: spec.verdict,
    checks,
    confidenceScore: spec.confidence_score,
    specVersion: spec.version,
    createdAt: spec.created_at,
    usage: computeBernoulliUsage(checks),
    durationMs: null,
  };
}
