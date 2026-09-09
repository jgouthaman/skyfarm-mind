import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Validation Agent (Bay 09) persistence against Hangar_Validations /
// Hangar_Validation_specs / Hangar_Validation_runs — mirrors
// optimizationPersistence.ts file-for-file, including its .limit(1) (not
// .single()/.maybeSingle()) convention and its versioned parent/specs/runs
// split. Server-only, same reason as every other Hangar_* persistence file.
//
// Bay 08's own reader (getOptimization from optimizationPersistence.ts) is
// reused directly by validationAgentPipeline.ts rather than duplicated
// here — it already exists and does exactly what this bay needs; no new
// RPC or wrapper is added on Bay 08's schema for this bay's benefit.
//
// Difference from Bay 08's shape: only one source id column
// (source_optimization_id) since Bay 09 fans in from Bay 08 alone, not two
// upstream sources.

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

export type ValidationStatus = "draft" | "processing" | "spec_ready" | "finalized" | "error";

export interface HangarValidationRow {
  id: string;
  user_id: string;
  source_optimization_id: string;
  validation_code: string;
  status: ValidationStatus;
  confidence_score: number | null;
  created_at: string;
  updated_at: string;
}

export interface HangarValidationSpecRow {
  id: string;
  validation_id: string;
  version: number;
  verdict: "PASS" | "FAIL" | "CONDITIONAL";
  compliance_matrix: Record<string, unknown>[];
  non_conformances: Record<string, unknown>[];
  readiness_score: number | null;
  risk_flags: string[];
  confidence_score: number;
  reasoning_summary: string | null;
  source_was_mock: boolean;
  created_at: string;
}

export async function createValidation(
  userId: string,
  sourceOptimizationId: string,
): Promise<HangarValidationRow> {
  const { data, error } = await db
    .from("Hangar_Validations")
    .insert({
      user_id: userId,
      source_optimization_id: sourceOptimizationId,
      status: "draft",
    })
    .select("*")
    .limit(1);
  if (error) throw new Error(`createValidation: ${error.message}`);
  const row = data?.[0];
  if (!row) throw new Error("createValidation: insert returned no row");
  return row as unknown as HangarValidationRow;
}

export async function getValidation(
  validationId: string,
): Promise<HangarValidationRow | null> {
  const { data, error } = await db
    .from("Hangar_Validations")
    .select("*")
    .eq("id", validationId)
    .limit(1);
  if (error) throw new Error(`getValidation: ${error.message}`);
  return (data?.[0] as HangarValidationRow | undefined) ?? null;
}

export async function updateValidationStatus(
  validationId: string,
  status: ValidationStatus,
  confidenceScore?: number,
): Promise<void> {
  const patch: Record<string, unknown> = { status };
  if (confidenceScore !== undefined) patch.confidence_score = confidenceScore;
  const { error } = await db.from("Hangar_Validations").update(patch).eq("id", validationId);
  if (error) throw new Error(`updateValidationStatus: ${error.message}`);
}

async function getNextValidationSpecVersion(validationId: string): Promise<number> {
  const { data, error } = await (
    supabaseAdmin as unknown as {
      rpc: (fn: string, args: { p_validation_id: string }) => DbResult<number>;
    }
  ).rpc("get_next_validation_spec_version", { p_validation_id: validationId });
  if (error) throw new Error(`getNextValidationSpecVersion: ${error.message}`);
  return data;
}

export async function persistValidationSpec(
  validationId: string,
  spec: {
    verdict: "PASS" | "FAIL" | "CONDITIONAL";
    complianceMatrix: Record<string, unknown>[];
    nonConformances: Record<string, unknown>[];
    readinessScore: number;
    riskFlags: string[];
    confidenceScore: number;
    reasoningSummary: string;
    sourceWasMock: boolean;
  },
): Promise<HangarValidationSpecRow> {
  const version = await getNextValidationSpecVersion(validationId);
  const { data, error } = await db
    .from("Hangar_Validation_specs")
    .insert({
      validation_id: validationId,
      version,
      verdict: spec.verdict,
      compliance_matrix: spec.complianceMatrix,
      non_conformances: spec.nonConformances,
      readiness_score: spec.readinessScore,
      risk_flags: spec.riskFlags,
      confidence_score: spec.confidenceScore,
      reasoning_summary: spec.reasoningSummary,
      source_was_mock: spec.sourceWasMock,
    })
    .select("*")
    .limit(1);
  if (error) throw new Error(`persistValidationSpec: ${error.message}`);
  const row = data?.[0];
  if (!row) throw new Error("persistValidationSpec: insert returned no row");
  return row as unknown as HangarValidationSpecRow;
}

// Same list/history cast pattern as optimizationPersistence.ts's listDb.
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

// Same dedup-by-latest-version pattern as optimizationPersistence.ts's
// getSpecsForOptimizations — validations can be regenerated against the
// same source optimization too (e.g. after the upstream result changes).
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

export interface HangarValidationSpecSummary {
  validation_id: string;
  verdict: "PASS" | "FAIL" | "CONDITIONAL";
  compliance_matrix: Record<string, unknown>[];
  non_conformances: Record<string, unknown>[];
  readiness_score: number | null;
  risk_flags: string[];
  confidence_score: number;
  reasoning_summary: string | null;
  source_was_mock: boolean;
}

export async function listUserValidations(userId: string): Promise<HangarValidationRow[]> {
  const { data, error } = await listDb
    .from("Hangar_Validations")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`listUserValidations: ${error.message}`);
  return (data ?? []) as unknown as HangarValidationRow[];
}

export async function getSpecsForValidations(
  validationIds: string[],
): Promise<HangarValidationSpecSummary[]> {
  if (validationIds.length === 0) return [];
  const { data, error } = await orderedListDb
    .from("Hangar_Validation_specs")
    .select(
      "validation_id,verdict,compliance_matrix,non_conformances,readiness_score,risk_flags,confidence_score,reasoning_summary,source_was_mock",
    )
    .in("validation_id", validationIds)
    .order("validation_id", { ascending: true })
    .order("version", { ascending: false });
  if (error) throw new Error(`getSpecsForValidations: ${error.message}`);
  const latestByValidation = new Map<string, Record<string, unknown>>();
  for (const row of data ?? []) {
    const id = row.validation_id as string;
    if (!latestByValidation.has(id)) latestByValidation.set(id, row);
  }
  return Array.from(latestByValidation.values()) as unknown as HangarValidationSpecSummary[];
}

export type ValidationRunStage =
  | "compliance_checking"
  | "validation_execution"
  | "output_generation"
  | "output_interface";

export async function logValidationStageRun(
  validationId: string,
  stage: ValidationRunStage,
  input: unknown,
  output: unknown,
  status: "success" | "error",
  durationMs: number,
  errorMessage?: string,
): Promise<void> {
  const { error } = await db
    .from("Hangar_Validation_runs")
    .insert({
      validation_id: validationId,
      agent_id: "VALIDATION_AGENT",
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
      `logValidationStageRun: failed to log stage ${stage} for validation ${validationId}: ${error.message}`,
    );
  }
}
