import { getMission, getSpecsForMissions } from "./missionPersistence.ts";
import { runBernoulliChecks, type BernoulliCheckResult } from "./bernoulliChecks.ts";
import type { FinalizedConstraint, FinalizedKpi, MissionSpecsFields } from "./missionSpecAssembly.ts";
import {
  createBernoulliReview,
  updateBernoulliReviewStatus,
  persistBernoulliReviewSpec,
  logBernoulliReviewRun,
  getLatestBernoulliReviewForMission,
  type BernoulliReviewRunStage,
} from "./bernoulliPersistence.ts";

// Bernoulli Agent orchestrator -- Mission Agent (B01) spec review call
// point only, per "Ask Bernoulli — Mission Spec Review Implementation
// Spec" §7 (scope boundary: this covers B01 only, not the other 9 caller
// bays or a synchronous hard gate on Mission -> Concept). Reuses Mission
// Agent's own readers (getMission/getSpecsForMissions from
// missionPersistence.ts) directly, same cross-bay reuse convention every
// other bay's pipeline already follows (e.g. documentationAgentPipeline.ts
// reusing validationPersistence.ts's getValidation).
//
// User-triggered review, not a pipeline stage -- there's no "gate before
// reasoning" split here the way every sequential bay has, since Bernoulli
// doesn't decide whether Mission's spec proceeds. All 5 checks always run
// (or whichever subset checksRequested names); the checks THEMSELVES
// (BERN-M01/M05) are what can fail, not an upstream eligibility gate.

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

const ALL_CHECK_IDS = ["BERN-M01", "BERN-M02", "BERN-M03", "BERN-M04", "BERN-M05"];

export interface BernoulliReviewRequest {
  userId: string;
  missionId: string;
  checksRequested?: string[];
}

export interface BernoulliReviewResponse {
  reviewId: string;
  reviewCode: string;
  missionId: string;
  verdict: "PASS" | "WARN" | "FAIL";
  checks: BernoulliCheckResult[];
  confidenceScore: number;
  specVersion: number;
  createdAt: string;
}

export async function runBernoulliReviewStage(
  request: BernoulliReviewRequest,
): Promise<BernoulliReviewResponse> {
  const { userId, missionId } = request;
  if (!missionId) {
    throw new InvalidBernoulliInputError("A spec-ready mission must be selected before running a review.");
  }
  // Non-empty-array-shaped per the API contract's "no silent default check
  // set" rule (§3) -- but an empty/omitted array from the client still
  // means "run everything," matching how the frontend doesn't enumerate
  // checks explicitly for this flow.
  const checksRequested =
    request.checksRequested && request.checksRequested.length > 0
      ? request.checksRequested
      : ALL_CHECK_IDS;

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

  const review = await createBernoulliReview(userId, missionId);
  const reviewId = review.id;
  await updateBernoulliReviewStatus(reviewId, "processing");

  const start = Date.now();
  try {
    const result = await runBernoulliChecks(
      {
        missionSpecs: missionSpec.mission_specs as unknown as MissionSpecsFields,
        constraints: missionSpec.constraints as unknown as FinalizedConstraint[],
        kpis: missionSpec.kpis as unknown as FinalizedKpi[],
      },
      checksRequested,
    );

    const specRow = await persistBernoulliReviewSpec(reviewId, {
      verdict: result.verdict,
      checks: result.checks as unknown as Record<string, unknown>[],
      confidenceScore: result.confidenceScore,
    });
    await updateBernoulliReviewStatus(reviewId, "spec_ready", result.verdict, result.confidenceScore);

    await logBernoulliReviewRun(
      reviewId,
      "review",
      { missionId, checksRequested },
      { verdict: result.verdict, checks: result.checks, confidenceScore: result.confidenceScore },
      "success",
      Date.now() - start,
    );

    return {
      reviewId,
      reviewCode: review.review_code,
      missionId,
      verdict: result.verdict,
      checks: result.checks,
      confidenceScore: result.confidenceScore,
      specVersion: specRow.version,
      createdAt: specRow.created_at,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await logBernoulliReviewRun(reviewId, "review", { missionId, checksRequested }, null, "error", Date.now() - start, message);
    await updateBernoulliReviewStatus(reviewId, "error").catch(() => {});
    throw new BernoulliAgentError(message, reviewId, "review");
  }
}

// "Load the latest saved review" -- called when a mission is selected on
// the Bernoulli page, so a previously-run report shows immediately
// instead of requiring another Ask Bernoulli click. Returns null (not an
// error) when nothing's been saved for this mission yet -- that's a
// normal, expected state, not a failure.
export async function getLatestBernoulliReview(
  userId: string,
  missionId: string,
): Promise<BernoulliReviewResponse | null> {
  const found = await getLatestBernoulliReviewForMission(userId, missionId);
  if (!found) return null;
  const { review, spec } = found;
  return {
    reviewId: review.id,
    reviewCode: review.review_code,
    missionId: review.mission_id,
    verdict: spec.verdict,
    checks: spec.checks as unknown as BernoulliCheckResult[],
    confidenceScore: spec.confidence_score,
    specVersion: spec.version,
    createdAt: spec.created_at,
  };
}
