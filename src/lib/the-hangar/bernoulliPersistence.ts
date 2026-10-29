import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Bernoulli Agent persistence against Hangar_BernoulliReviews /
// Hangar_BernoulliReview_specs / Hangar_BernoulliReview_runs -- mirrors
// documentationPersistence.ts file-for-file, including its .limit(1) (not
// .single()/.maybeSingle()) convention and its versioned parent/specs/runs
// split. Server-only, same reason as every other Hangar_* persistence file.
//
// Scoped to the Mission Agent (B01) call point only, per "Ask Bernoulli —
// Mission Spec Review Implementation Spec" §5 -- mission_id is a direct
// foreign key to Hangar_missions (not the generic (caller_bay,
// caller_run_id) shape the parent cross-cutting spec doc suggests),
// matching what the Bernoulli page's own dropdown already sends (a
// missionId, not a separate mission-spec id -- Hangar_mission_specs rows
// aren't individually addressable from the client today, see
// missionPersistence.ts's getSpecsForMissions). Generalize this to the
// other 9 caller bays only if/when their own integrations are built.

type DbResult<T> = Promise<{ data: T; error: { message: string } | null }>;

const db = supabaseAdmin as unknown as {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (
        column: string,
        value: string,
      ) => {
        limit: (n: number) => DbResult<Record<string, unknown>[] | null>;
      };
    };
    insert: (row: Record<string, unknown>) => {
      select: (columns: string) => {
        limit: (n: number) => DbResult<Record<string, unknown>[] | null>;
      };
    };
    update: (patch: Record<string, unknown>) => {
      eq: (column: string, value: string) => DbResult<null>;
    };
  };
};

export type BernoulliReviewStatus = "draft" | "processing" | "spec_ready" | "error";

// Which bay's output a review checks (20261029000000_hangar_bernoulli_caller_bay.sql).
// A concept review still carries its concept's source mission_id.
export type BernoulliSourceBay = "mission" | "concept";

export interface HangarBernoulliReviewRow {
  id: string;
  user_id: string;
  mission_id: string;
  source_bay: BernoulliSourceBay;
  concept_id: string | null;
  review_code: string;
  status: BernoulliReviewStatus;
  verdict: "PASS" | "WARN" | "FAIL" | null;
  confidence_score: number | null;
  created_at: string;
  updated_at: string;
}

export interface HangarBernoulliReviewSpecRow {
  id: string;
  bernoulli_review_id: string;
  version: number;
  verdict: "PASS" | "WARN" | "FAIL";
  checks: Record<string, unknown>[];
  confidence_score: number;
  created_at: string;
}

export async function createBernoulliReview(
  userId: string,
  missionId: string,
  conceptId: string | null = null,
  clientRunId: string | null = null,
): Promise<HangarBernoulliReviewRow> {
  const row: Record<string, unknown> = {
    user_id: userId,
    mission_id: missionId,
    status: "draft",
    source_bay: conceptId ? "concept" : "mission",
    concept_id: conceptId,
  };
  // Only sent when the page asked for progress, so a review still works on a
  // database that hasn't had 20261030020000 applied.
  if (clientRunId) row.client_run_id = clientRunId;
  const { data, error } = await db
    .from("Hangar_BernoulliReviews")
    .insert(row)
    .select("*")
    .limit(1);
  if (error) throw new Error(`createBernoulliReview: ${error.message}`);
  const created = data?.[0];
  if (!created) throw new Error("createBernoulliReview: insert returned no row");
  return created as unknown as HangarBernoulliReviewRow;
}

export async function getBernoulliReview(
  reviewId: string,
): Promise<HangarBernoulliReviewRow | null> {
  const { data, error } = await db
    .from("Hangar_BernoulliReviews")
    .select("*")
    .eq("id", reviewId)
    .limit(1);
  if (error) throw new Error(`getBernoulliReview: ${error.message}`);
  return (data?.[0] as HangarBernoulliReviewRow | undefined) ?? null;
}

export async function updateBernoulliReviewStatus(
  reviewId: string,
  status: BernoulliReviewStatus,
  verdict?: "PASS" | "WARN" | "FAIL",
  confidenceScore?: number,
): Promise<void> {
  const patch: Record<string, unknown> = { status };
  if (verdict !== undefined) patch.verdict = verdict;
  if (confidenceScore !== undefined) patch.confidence_score = confidenceScore;
  const { error } = await db.from("Hangar_BernoulliReviews").update(patch).eq("id", reviewId);
  if (error) throw new Error(`updateBernoulliReviewStatus: ${error.message}`);
}

async function getNextBernoulliReviewSpecVersion(reviewId: string): Promise<number> {
  const { data, error } = await (
    supabaseAdmin as unknown as {
      rpc: (fn: string, args: { p_bernoulli_review_id: string }) => DbResult<number>;
    }
  ).rpc("get_next_bernoulli_review_spec_version", { p_bernoulli_review_id: reviewId });
  if (error) throw new Error(`getNextBernoulliReviewSpecVersion: ${error.message}`);
  return data;
}

export async function persistBernoulliReviewSpec(
  reviewId: string,
  spec: {
    verdict: "PASS" | "WARN" | "FAIL";
    checks: Record<string, unknown>[];
    confidenceScore: number;
  },
): Promise<HangarBernoulliReviewSpecRow> {
  const version = await getNextBernoulliReviewSpecVersion(reviewId);
  const { data, error } = await db
    .from("Hangar_BernoulliReview_specs")
    .insert({
      bernoulli_review_id: reviewId,
      version,
      verdict: spec.verdict,
      checks: spec.checks,
      confidence_score: spec.confidenceScore,
    })
    .select("*")
    .limit(1);
  if (error) throw new Error(`persistBernoulliReviewSpec: ${error.message}`);
  const row = data?.[0];
  if (!row) throw new Error("persistBernoulliReviewSpec: insert returned no row");
  return row as unknown as HangarBernoulliReviewSpecRow;
}

// Read path for "load the latest saved review when a mission is
// selected" -- a plain ordered-list cast, same shape as
// documentationPersistence.ts's own listDb/orderedListDb pattern.
type ListQueryResult = Promise<{
  data: Record<string, unknown>[] | null;
  error: { message: string } | null;
}>;

const specsListDb = supabaseAdmin as unknown as {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (
        column: string,
        value: string,
      ) => {
        order: (column: string, opts: { ascending: boolean }) => {
          limit: (n: number) => ListQueryResult;
        };
      };
    };
  };
};

// User + target (mission or concept) + source_bay.
const scopedListDb = supabaseAdmin as unknown as {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        eq: (column: string, value: string) => {
          eq: (column: string, value: string) => {
            order: (column: string, opts: { ascending: boolean }) => {
              limit: (n: number) => ListQueryResult;
            };
          };
        };
      };
    };
  };
};

// Latest saved review of one bay's output: a mission review (conceptId null)
// or a concept review. Filtering on source_bay keeps a concept review from
// surfacing when the same source mission is reopened from Bay 01.
export async function getLatestBernoulliReviewForMission(
  userId: string,
  missionId: string,
  conceptId: string | null = null,
): Promise<{ review: HangarBernoulliReviewRow; spec: HangarBernoulliReviewSpecRow } | null> {
  const { data, error } = await scopedListDb
    .from("Hangar_BernoulliReviews")
    .select("*")
    .eq("user_id", userId)
    .eq(conceptId ? "concept_id" : "mission_id", conceptId ?? missionId)
    .eq("source_bay", conceptId ? "concept" : "mission")
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw new Error(`getLatestBernoulliReviewForMission: ${error.message}`);
  const review = data?.[0] as HangarBernoulliReviewRow | undefined;
  if (!review || review.status !== "spec_ready") return null;

  const { data: specData, error: specError } = await specsListDb
    .from("Hangar_BernoulliReview_specs")
    .select("*")
    .eq("bernoulli_review_id", review.id)
    .order("version", { ascending: false })
    .limit(1);
  if (specError) throw new Error(`getLatestBernoulliReviewForMission: ${specError.message}`);
  const spec = specData?.[0] as HangarBernoulliReviewSpecRow | undefined;
  if (!spec) return null;

  return { review, spec };
}

export type BernoulliReviewRunStage = "review";

export async function logBernoulliReviewRun(
  reviewId: string,
  stage: BernoulliReviewRunStage,
  input: unknown,
  output: unknown,
  status: "success" | "error",
  durationMs: number,
  errorMessage?: string,
): Promise<void> {
  const { error } = await db
    .from("Hangar_BernoulliReview_runs")
    .insert({
      bernoulli_review_id: reviewId,
      agent_id: "BERNOULLI_AGENT",
      stage,
      input_snapshot: input ?? null,
      output_snapshot: output ?? null,
      status,
      error_message: errorMessage ?? null,
      duration_ms: durationMs,
    })
    .select("*")
    .limit(1);
  if (error) {
    console.error(
      `logBernoulliReviewRun: failed to log stage ${stage} for review ${reviewId}: ${error.message}`,
    );
  }
}

// "Check 7 of 14" while a review runs: the pipeline writes progress to the
// review row, the page polls it by the run id it generated itself (it only
// learns the review id when the POST returns). Best-effort -- a failed write
// never fails the review.
export async function updateBernoulliReviewProgress(
  reviewId: string,
  progress: { done: number; total: number; current: string | null },
): Promise<void> {
  try {
    await db.from("Hangar_BernoulliReviews").update({ progress }).eq("id", reviewId);
  } catch {
    // progress is cosmetic
  }
}

export async function getBernoulliReviewProgress(
  userId: string,
  clientRunId: string,
): Promise<{ status: string; progress: unknown } | null> {
  const { data, error } = await (supabaseAdmin as unknown as {
    from: (t: string) => {
      select: (c: string) => {
        eq: (c: string, v: string) => { eq: (c: string, v: string) => { limit: (n: number) => DbResult<Record<string, unknown>[] | null> } };
      };
    };
  })
    .from("Hangar_BernoulliReviews")
    .select("status, progress")
    .eq("client_run_id", clientRunId)
    .eq("user_id", userId)
    .limit(1);
  if (error || !data?.[0]) return null;
  return { status: String(data[0].status), progress: data[0].progress ?? null };
}
