import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Optimization Agent (Bay 08) persistence against Hangar_Optimizations /
// Hangar_Optimization_specs / Hangar_Optimization_runs — mirrors
// structuralPersistence.ts file-for-file, including its .limit(1) (not
// .single()/.maybeSingle()) convention and its versioned parent/specs/runs
// split (OptimizationAgent.md Section 5 resolves in favor of this shape,
// not Bay 06's simplified combined-row shape). Server-only, same reason as
// every other Hangar_* persistence file.
//
// Bay 06's and Bay 07's own readers (getCFDAnalysis from
// cfdAnalysisPersistence.ts, getSpecsForStructurals from
// structuralPersistence.ts) are reused directly by
// optimizationAgentPipeline.ts rather than duplicated here — both already
// exist and do exactly what this bay needs; no new RPC or wrapper is added
// on either upstream bay's schema for this bay's benefit, per
// OptimizationAgent.md's own Implementation Notes.

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

export type OptimizationStatus = "draft" | "processing" | "spec_ready" | "finalized" | "error";

export interface HangarOptimizationRow {
  id: string;
  user_id: string;
  source_cfd_analysis_id: string;
  source_structural_id: string;
  optimization_code: string;
  status: OptimizationStatus;
  confidence_score: number | null;
  created_at: string;
  updated_at: string;
}

export interface HangarOptimizationSpecRow {
  id: string;
  optimization_id: string;
  version: number;
  objective_scores: Record<string, unknown>;
  trade_off_analysis: string;
  recommended_adjustments: Record<string, unknown>[];
  overall_optimization_score: number | null;
  risk_flags: string[];
  confidence_score: number;
  reasoning_summary: string | null;
  source_was_mock: boolean;
  created_at: string;
}

export async function createOptimization(
  userId: string,
  sourceCfdAnalysisId: string,
  sourceStructuralId: string,
): Promise<HangarOptimizationRow> {
  const { data, error } = await db
    .from("Hangar_Optimizations")
    .insert({
      user_id: userId,
      source_cfd_analysis_id: sourceCfdAnalysisId,
      source_structural_id: sourceStructuralId,
      status: "draft",
    })
    .select("*")
    .limit(1);
  if (error) throw new Error(`createOptimization: ${error.message}`);
  const row = data?.[0];
  if (!row) throw new Error("createOptimization: insert returned no row");
  return row as unknown as HangarOptimizationRow;
}

export async function getOptimization(
  optimizationId: string,
): Promise<HangarOptimizationRow | null> {
  const { data, error } = await db
    .from("Hangar_Optimizations")
    .select("*")
    .eq("id", optimizationId)
    .limit(1);
  if (error) throw new Error(`getOptimization: ${error.message}`);
  return (data?.[0] as HangarOptimizationRow | undefined) ?? null;
}

export async function updateOptimizationStatus(
  optimizationId: string,
  status: OptimizationStatus,
  confidenceScore?: number,
): Promise<void> {
  const patch: Record<string, unknown> = { status };
  if (confidenceScore !== undefined) patch.confidence_score = confidenceScore;
  const { error } = await db.from("Hangar_Optimizations").update(patch).eq("id", optimizationId);
  if (error) throw new Error(`updateOptimizationStatus: ${error.message}`);
}

async function getNextOptimizationSpecVersion(optimizationId: string): Promise<number> {
  const { data, error } = await (
    supabaseAdmin as unknown as {
      rpc: (fn: string, args: { p_optimization_id: string }) => DbResult<number>;
    }
  ).rpc("get_next_optimization_spec_version", { p_optimization_id: optimizationId });
  if (error) throw new Error(`getNextOptimizationSpecVersion: ${error.message}`);
  return data;
}

export async function persistOptimizationSpec(
  optimizationId: string,
  spec: {
    objectiveScores: Record<string, unknown>;
    tradeOffAnalysis: string;
    recommendedAdjustments: Record<string, unknown>[];
    overallOptimizationScore: number;
    riskFlags: string[];
    confidenceScore: number;
    reasoningSummary: string;
    sourceWasMock: boolean;
  },
): Promise<HangarOptimizationSpecRow> {
  const version = await getNextOptimizationSpecVersion(optimizationId);
  const { data, error } = await db
    .from("Hangar_Optimization_specs")
    .insert({
      optimization_id: optimizationId,
      version,
      objective_scores: spec.objectiveScores,
      trade_off_analysis: spec.tradeOffAnalysis,
      recommended_adjustments: spec.recommendedAdjustments,
      overall_optimization_score: spec.overallOptimizationScore,
      risk_flags: spec.riskFlags,
      confidence_score: spec.confidenceScore,
      reasoning_summary: spec.reasoningSummary,
      source_was_mock: spec.sourceWasMock,
    })
    .select("*")
    .limit(1);
  if (error) throw new Error(`persistOptimizationSpec: ${error.message}`);
  const row = data?.[0];
  if (!row) throw new Error("persistOptimizationSpec: insert returned no row");
  return row as unknown as HangarOptimizationSpecRow;
}

// Same list/history cast pattern as structuralPersistence.ts's listDb.
type ListQueryResult = Promise<{
  data: Record<string, unknown>[] | null;
  error: { message: string } | null;
}>;

const listDb = supabaseAdmin as unknown as {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (
        column: string,
        value: string,
      ) => {
        order: (column: string, opts: { ascending: boolean }) => ListQueryResult;
      };
    };
  };
};

// Same dedup-by-latest-version pattern as structuralPersistence.ts's
// getSpecsForStructurals — optimizations can be regenerated against the
// same source CFD/structural pair too (e.g. after either upstream result
// changes).
const orderedListDb = supabaseAdmin as unknown as {
  from: (table: string) => {
    select: (columns: string) => {
      in: (
        column: string,
        values: string[],
      ) => {
        order: (
          column: string,
          opts: { ascending: boolean },
        ) => {
          order: (column: string, opts: { ascending: boolean }) => ListQueryResult;
        };
      };
    };
  };
};

export interface HangarOptimizationSpecSummary {
  optimization_id: string;
  objective_scores: Record<string, unknown>;
  trade_off_analysis: string;
  recommended_adjustments: Record<string, unknown>[];
  overall_optimization_score: number | null;
  risk_flags: string[];
  confidence_score: number;
  reasoning_summary: string | null;
  source_was_mock: boolean;
}

export async function listUserOptimizations(userId: string): Promise<HangarOptimizationRow[]> {
  const { data, error } = await listDb
    .from("Hangar_Optimizations")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`listUserOptimizations: ${error.message}`);
  return (data ?? []) as unknown as HangarOptimizationRow[];
}

export async function getSpecsForOptimizations(
  optimizationIds: string[],
): Promise<HangarOptimizationSpecSummary[]> {
  if (optimizationIds.length === 0) return [];
  const { data, error } = await orderedListDb
    .from("Hangar_Optimization_specs")
    .select(
      "optimization_id,objective_scores,trade_off_analysis,recommended_adjustments,overall_optimization_score,risk_flags,confidence_score,reasoning_summary,source_was_mock",
    )
    .in("optimization_id", optimizationIds)
    .order("optimization_id", { ascending: true })
    .order("version", { ascending: false });
  if (error) throw new Error(`getSpecsForOptimizations: ${error.message}`);
  const latestByOptimization = new Map<string, Record<string, unknown>>();
  for (const row of data ?? []) {
    const id = row.optimization_id as string;
    if (!latestByOptimization.has(id)) latestByOptimization.set(id, row);
  }
  return Array.from(latestByOptimization.values()) as unknown as HangarOptimizationSpecSummary[];
}

export type OptimizationRunStage =
  | "objective_formulation"
  | "optimization_execution"
  | "output_generation"
  | "output_interface";

export async function logOptimizationStageRun(
  optimizationId: string,
  stage: OptimizationRunStage,
  input: unknown,
  output: unknown,
  status: "success" | "error",
  durationMs: number,
  errorMessage?: string,
): Promise<void> {
  const { error } = await db
    .from("Hangar_Optimization_runs")
    .insert({
      optimization_id: optimizationId,
      agent_id: "OPTIMIZATION_AGENT",
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
      `logOptimizationStageRun: failed to log stage ${stage} for optimization ${optimizationId}: ${error.message}`,
    );
  }
}
