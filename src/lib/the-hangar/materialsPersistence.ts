import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Materials Agent (Bay 10) persistence against Hangar_Materials /
// Hangar_Materials_specs / Hangar_Materials_runs -- mirrors
// validationPersistence.ts file-for-file, including its .limit(1) (not
// .single()/.maybeSingle()) convention and its versioned parent/specs/runs
// split. Server-only, same reason as every other Hangar_* persistence file.
//
// Bay 09's own reader (getValidation from validationPersistence.ts) is
// reused directly by materialsAgentPipeline.ts rather than duplicated
// here -- it already exists and does exactly what this bay needs; no new
// RPC or wrapper is added on Bay 09's schema for this bay's benefit.

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

export type MaterialsStatus = "draft" | "processing" | "spec_ready" | "finalized" | "error";

export interface HangarMaterialsRow {
  id: string;
  user_id: string;
  source_validation_id: string;
  materials_code: string;
  status: MaterialsStatus;
  confidence_score: number | null;
  created_at: string;
  updated_at: string;
}

export interface HangarMaterialsSpecRow {
  id: string;
  materials_id: string;
  version: number;
  recommendations: Record<string, unknown>[];
  rationale: string;
  sourcing_risk_flags: string[];
  confidence_score: number;
  reasoning_summary: string | null;
  source_was_mock: boolean;
  created_at: string;
}

export async function createMaterials(
  userId: string,
  sourceValidationId: string,
): Promise<HangarMaterialsRow> {
  const { data, error } = await db
    .from("Hangar_Materials")
    .insert({
      user_id: userId,
      source_validation_id: sourceValidationId,
      status: "draft",
    })
    .select("*")
    .limit(1);
  if (error) throw new Error(`createMaterials: ${error.message}`);
  const row = data?.[0];
  if (!row) throw new Error("createMaterials: insert returned no row");
  return row as unknown as HangarMaterialsRow;
}

export async function getMaterials(materialsId: string): Promise<HangarMaterialsRow | null> {
  const { data, error } = await db
    .from("Hangar_Materials")
    .select("*")
    .eq("id", materialsId)
    .limit(1);
  if (error) throw new Error(`getMaterials: ${error.message}`);
  return (data?.[0] as HangarMaterialsRow | undefined) ?? null;
}

export async function updateMaterialsStatus(
  materialsId: string,
  status: MaterialsStatus,
  confidenceScore?: number,
): Promise<void> {
  const patch: Record<string, unknown> = { status };
  if (confidenceScore !== undefined) patch.confidence_score = confidenceScore;
  const { error } = await db.from("Hangar_Materials").update(patch).eq("id", materialsId);
  if (error) throw new Error(`updateMaterialsStatus: ${error.message}`);
}

async function getNextMaterialsSpecVersion(materialsId: string): Promise<number> {
  const { data, error } = await (
    supabaseAdmin as unknown as {
      rpc: (fn: string, args: { p_materials_id: string }) => DbResult<number>;
    }
  ).rpc("get_next_materials_spec_version", { p_materials_id: materialsId });
  if (error) throw new Error(`getNextMaterialsSpecVersion: ${error.message}`);
  return data;
}

export async function persistMaterialsSpec(
  materialsId: string,
  spec: {
    recommendations: Record<string, unknown>[];
    rationale: string;
    sourcingRiskFlags: string[];
    confidenceScore: number;
    reasoningSummary: string;
    sourceWasMock: boolean;
  },
): Promise<HangarMaterialsSpecRow> {
  const version = await getNextMaterialsSpecVersion(materialsId);
  const { data, error } = await db
    .from("Hangar_Materials_specs")
    .insert({
      materials_id: materialsId,
      version,
      recommendations: spec.recommendations,
      rationale: spec.rationale,
      sourcing_risk_flags: spec.sourcingRiskFlags,
      confidence_score: spec.confidenceScore,
      reasoning_summary: spec.reasoningSummary,
      source_was_mock: spec.sourceWasMock,
    })
    .select("*")
    .limit(1);
  if (error) throw new Error(`persistMaterialsSpec: ${error.message}`);
  const row = data?.[0];
  if (!row) throw new Error("persistMaterialsSpec: insert returned no row");
  return row as unknown as HangarMaterialsSpecRow;
}

// Same list/history cast pattern as validationPersistence.ts's listDb.
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

// Same dedup-by-latest-version pattern as validationPersistence.ts's
// getSpecsForValidations -- materials can be regenerated against the same
// source validation too (e.g. after the upstream result changes).
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

export interface HangarMaterialsSpecSummary {
  materials_id: string;
  recommendations: Record<string, unknown>[];
  rationale: string;
  sourcing_risk_flags: string[];
  confidence_score: number;
  reasoning_summary: string | null;
  source_was_mock: boolean;
}

export async function listUserMaterials(userId: string): Promise<HangarMaterialsRow[]> {
  const { data, error } = await listDb
    .from("Hangar_Materials")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`listUserMaterials: ${error.message}`);
  return (data ?? []) as unknown as HangarMaterialsRow[];
}

export async function getSpecsForMaterials(
  materialsIds: string[],
): Promise<HangarMaterialsSpecSummary[]> {
  if (materialsIds.length === 0) return [];
  const { data, error } = await orderedListDb
    .from("Hangar_Materials_specs")
    .select(
      "materials_id,recommendations,rationale,sourcing_risk_flags,confidence_score,reasoning_summary,source_was_mock",
    )
    .in("materials_id", materialsIds)
    .order("materials_id", { ascending: true })
    .order("version", { ascending: false });
  if (error) throw new Error(`getSpecsForMaterials: ${error.message}`);
  const latestByMaterials = new Map<string, Record<string, unknown>>();
  for (const row of data ?? []) {
    const id = row.materials_id as string;
    if (!latestByMaterials.has(id)) latestByMaterials.set(id, row);
  }
  return Array.from(latestByMaterials.values()) as unknown as HangarMaterialsSpecSummary[];
}

export type MaterialsRunStage =
  | "requirement_mapping"
  | "material_selection"
  | "output_generation"
  | "output_interface";

export async function logMaterialsStageRun(
  materialsId: string,
  stage: MaterialsRunStage,
  input: unknown,
  output: unknown,
  status: "success" | "error",
  durationMs: number,
  errorMessage?: string,
): Promise<void> {
  const { error } = await db
    .from("Hangar_Materials_runs")
    .insert({
      materials_id: materialsId,
      agent_id: "MATERIALS_AGENT",
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
      `logMaterialsStageRun: failed to log stage ${stage} for materials ${materialsId}: ${error.message}`,
    );
  }
}
