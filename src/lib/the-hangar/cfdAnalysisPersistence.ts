import { supabaseAdmin } from "@/integrations/supabase/client.server";

// CFD Agent (Bay 06) persistence against Hangar_CFDAnalyses /
// Hangar_CFDAnalysis_specs / Hangar_CFDAnalysis_runs — same .limit(1)
// convention as cadDesignPersistence.ts, but the shape here is simpler as a
// direct consequence of the migration's table-role split (see that file's
// header comment):
//   - Hangar_CFDAnalyses holds the parent/status row AND the structured
//     output (forces/coefficients/flow_fields/design_rationale) combined,
//     so there is no separate "persist a new output spec" insert — output
//     is written with a single update on the same row (see
//     updateCFDAnalysisResult). Contrast cadDesignPersistence.ts's
//     persistCADDesignSpec, which inserts a new *versioned* row per run.
//   - Hangar_CFDAnalysis_specs holds INPUT config (solver settings,
//     boundary conditions) and is not versioned (no version column, no
//     get_next_..._version RPC — see the migration), so persisting it is a
//     plain insert with no version lookup.
// The upstream Hangar_CADDesigns read reuses cadDesignPersistence.ts's own
// getCADDesign directly (imported there by cfdAnalysisAgentPipeline.ts)
// rather than duplicating that query here. Server-only, same reason as
// every other Hangar_* persistence file.

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

export type CFDAnalysisStatus = "draft" | "processing" | "spec_ready" | "finalized" | "error";

export interface HangarCFDAnalysisRow {
  id: string;
  user_id: string;
  source_cad_design_id: string;
  cfd_code: string;
  status: CFDAnalysisStatus;
  forces: Record<string, unknown> | null;
  coefficients: Record<string, unknown> | null;
  flow_fields: Record<string, unknown> | null;
  design_rationale: string | null;
  confidence_score: number | null;
  source_was_mock: boolean;
  created_at: string;
  updated_at: string;
}

export interface HangarCFDAnalysisSpecRow {
  id: string;
  cfd_analysis_id: string;
  solver_type: string | null;
  turbulence_model: string | null;
  boundary_conditions: Record<string, unknown> | null;
  created_at: string;
}

export async function createCFDAnalysis(
  userId: string,
  sourceCadDesignId: string,
): Promise<HangarCFDAnalysisRow> {
  const { data, error } = await db
    .from("Hangar_CFDAnalyses")
    .insert({ user_id: userId, source_cad_design_id: sourceCadDesignId, status: "draft" })
    .select("*")
    .limit(1);
  if (error) throw new Error(`createCFDAnalysis: ${error.message}`);
  const row = data?.[0];
  if (!row) throw new Error("createCFDAnalysis: insert returned no row");
  return row as unknown as HangarCFDAnalysisRow;
}

export async function getCFDAnalysis(cfdAnalysisId: string): Promise<HangarCFDAnalysisRow | null> {
  const { data, error } = await db
    .from("Hangar_CFDAnalyses")
    .select("*")
    .eq("id", cfdAnalysisId)
    .limit(1);
  if (error) throw new Error(`getCFDAnalysis: ${error.message}`);
  return (data?.[0] as HangarCFDAnalysisRow | undefined) ?? null;
}

export async function persistCFDAnalysisInputSpec(
  cfdAnalysisId: string,
  spec: {
    solverType: string | null;
    turbulenceModel: string | null;
    boundaryConditions: Record<string, unknown> | null;
  },
): Promise<HangarCFDAnalysisSpecRow> {
  const { data, error } = await db
    .from("Hangar_CFDAnalysis_specs")
    .insert({
      cfd_analysis_id: cfdAnalysisId,
      solver_type: spec.solverType,
      turbulence_model: spec.turbulenceModel,
      boundary_conditions: spec.boundaryConditions,
    })
    .select("*")
    .limit(1);
  if (error) throw new Error(`persistCFDAnalysisInputSpec: ${error.message}`);
  const row = data?.[0];
  if (!row) throw new Error("persistCFDAnalysisInputSpec: insert returned no row");
  return row as unknown as HangarCFDAnalysisSpecRow;
}

export async function updateCFDAnalysisResult(
  cfdAnalysisId: string,
  result: {
    status: CFDAnalysisStatus;
    forces?: Record<string, unknown>;
    coefficients?: Record<string, unknown>;
    flowFields?: Record<string, unknown>;
    designRationale?: string;
    confidenceScore?: number;
    sourceWasMock?: boolean;
  },
): Promise<void> {
  const patch: Record<string, unknown> = { status: result.status };
  if (result.forces !== undefined) patch.forces = result.forces;
  if (result.coefficients !== undefined) patch.coefficients = result.coefficients;
  if (result.flowFields !== undefined) patch.flow_fields = result.flowFields;
  if (result.designRationale !== undefined) patch.design_rationale = result.designRationale;
  if (result.confidenceScore !== undefined) patch.confidence_score = result.confidenceScore;
  if (result.sourceWasMock !== undefined) patch.source_was_mock = result.sourceWasMock;
  const { error } = await db.from("Hangar_CFDAnalyses").update(patch).eq("id", cfdAnalysisId);
  if (error) throw new Error(`updateCFDAnalysisResult: ${error.message}`);
}

// Same list/history cast pattern as cadDesignPersistence.ts's listDb. No
// getSpecsForCFDAnalyses-equivalent merge step is needed on the list path —
// output already lives on Hangar_CFDAnalyses itself, so listUserCFDAnalyses
// alone returns everything a list view needs.
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

export async function listUserCFDAnalyses(userId: string): Promise<HangarCFDAnalysisRow[]> {
  const { data, error } = await listDb
    .from("Hangar_CFDAnalyses")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`listUserCFDAnalyses: ${error.message}`);
  return (data ?? []) as unknown as HangarCFDAnalysisRow[];
}

export type CFDAnalysisRunStage =
  | "mesh_generation"
  | "solver_setup_execution"
  | "output_generation"
  | "output_interface";

export async function logCFDAnalysisStageRun(
  cfdAnalysisId: string,
  stage: CFDAnalysisRunStage,
  input: unknown,
  output: unknown,
  status: "success" | "error",
  durationMs: number,
  errorMessage?: string,
): Promise<void> {
  const { error } = await db
    .from("Hangar_CFDAnalysis_runs")
    .insert({
      cfd_analysis_id: cfdAnalysisId,
      agent_id: "CFD_AGENT",
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
      `logCFDAnalysisStageRun: failed to log stage ${stage} for CFD analysis ${cfdAnalysisId}: ${error.message}`,
    );
  }
}
