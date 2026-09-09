import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Manufacturing Agent (Bay 11) persistence against Hangar_Manufacturings /
// Hangar_Manufacturing_specs / Hangar_Manufacturing_runs -- mirrors
// materialsPersistence.ts file-for-file, including its .limit(1) (not
// .single()/.maybeSingle()) convention and its versioned parent/specs/runs
// split. Server-only, same reason as every other Hangar_* persistence file.
//
// Bay 09's own reader (getValidation from validationPersistence.ts) is
// reused directly by manufacturingAgentPipeline.ts rather than duplicated
// here.

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

export type ManufacturingStatus = "draft" | "processing" | "spec_ready" | "finalized" | "error";

export interface HangarManufacturingRow {
  id: string;
  user_id: string;
  source_validation_id: string;
  manufacturing_code: string;
  status: ManufacturingStatus;
  confidence_score: number | null;
  created_at: string;
  updated_at: string;
}

export interface HangarManufacturingSpecRow {
  id: string;
  manufacturing_id: string;
  version: number;
  dfm_report: Record<string, unknown>[];
  build_plan: Record<string, unknown>[];
  bill_of_materials: Record<string, unknown>[];
  confidence_score: number;
  reasoning_summary: string | null;
  source_was_mock: boolean;
  created_at: string;
}

export async function createManufacturing(
  userId: string,
  sourceValidationId: string,
): Promise<HangarManufacturingRow> {
  const { data, error } = await db
    .from("Hangar_Manufacturings")
    .insert({
      user_id: userId,
      source_validation_id: sourceValidationId,
      status: "draft",
    })
    .select("*")
    .limit(1);
  if (error) throw new Error(`createManufacturing: ${error.message}`);
  const row = data?.[0];
  if (!row) throw new Error("createManufacturing: insert returned no row");
  return row as unknown as HangarManufacturingRow;
}

export async function getManufacturing(
  manufacturingId: string,
): Promise<HangarManufacturingRow | null> {
  const { data, error } = await db
    .from("Hangar_Manufacturings")
    .select("*")
    .eq("id", manufacturingId)
    .limit(1);
  if (error) throw new Error(`getManufacturing: ${error.message}`);
  return (data?.[0] as HangarManufacturingRow | undefined) ?? null;
}

export async function updateManufacturingStatus(
  manufacturingId: string,
  status: ManufacturingStatus,
  confidenceScore?: number,
): Promise<void> {
  const patch: Record<string, unknown> = { status };
  if (confidenceScore !== undefined) patch.confidence_score = confidenceScore;
  const { error } = await db.from("Hangar_Manufacturings").update(patch).eq("id", manufacturingId);
  if (error) throw new Error(`updateManufacturingStatus: ${error.message}`);
}

async function getNextManufacturingSpecVersion(manufacturingId: string): Promise<number> {
  const { data, error } = await (
    supabaseAdmin as unknown as {
      rpc: (fn: string, args: { p_manufacturing_id: string }) => DbResult<number>;
    }
  ).rpc("get_next_manufacturing_spec_version", { p_manufacturing_id: manufacturingId });
  if (error) throw new Error(`getNextManufacturingSpecVersion: ${error.message}`);
  return data;
}

export async function persistManufacturingSpec(
  manufacturingId: string,
  spec: {
    dfmReport: Record<string, unknown>[];
    buildPlan: Record<string, unknown>[];
    billOfMaterials: Record<string, unknown>[];
    confidenceScore: number;
    reasoningSummary: string;
    sourceWasMock: boolean;
  },
): Promise<HangarManufacturingSpecRow> {
  const version = await getNextManufacturingSpecVersion(manufacturingId);
  const { data, error } = await db
    .from("Hangar_Manufacturing_specs")
    .insert({
      manufacturing_id: manufacturingId,
      version,
      dfm_report: spec.dfmReport,
      build_plan: spec.buildPlan,
      bill_of_materials: spec.billOfMaterials,
      confidence_score: spec.confidenceScore,
      reasoning_summary: spec.reasoningSummary,
      source_was_mock: spec.sourceWasMock,
    })
    .select("*")
    .limit(1);
  if (error) throw new Error(`persistManufacturingSpec: ${error.message}`);
  const row = data?.[0];
  if (!row) throw new Error("persistManufacturingSpec: insert returned no row");
  return row as unknown as HangarManufacturingSpecRow;
}

// Same list/history cast pattern as materialsPersistence.ts's listDb.
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

export interface HangarManufacturingSpecSummary {
  manufacturing_id: string;
  dfm_report: Record<string, unknown>[];
  build_plan: Record<string, unknown>[];
  bill_of_materials: Record<string, unknown>[];
  confidence_score: number;
  reasoning_summary: string | null;
  source_was_mock: boolean;
}

export async function listUserManufacturings(userId: string): Promise<HangarManufacturingRow[]> {
  const { data, error } = await listDb
    .from("Hangar_Manufacturings")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`listUserManufacturings: ${error.message}`);
  return (data ?? []) as unknown as HangarManufacturingRow[];
}

export async function getSpecsForManufacturings(
  manufacturingIds: string[],
): Promise<HangarManufacturingSpecSummary[]> {
  if (manufacturingIds.length === 0) return [];
  const { data, error } = await orderedListDb
    .from("Hangar_Manufacturing_specs")
    .select(
      "manufacturing_id,dfm_report,build_plan,bill_of_materials,confidence_score,reasoning_summary,source_was_mock",
    )
    .in("manufacturing_id", manufacturingIds)
    .order("manufacturing_id", { ascending: true })
    .order("version", { ascending: false });
  if (error) throw new Error(`getSpecsForManufacturings: ${error.message}`);
  const latestByManufacturing = new Map<string, Record<string, unknown>>();
  for (const row of data ?? []) {
    const id = row.manufacturing_id as string;
    if (!latestByManufacturing.has(id)) latestByManufacturing.set(id, row);
  }
  return Array.from(latestByManufacturing.values()) as unknown as HangarManufacturingSpecSummary[];
}

export type ManufacturingRunStage =
  | "manufacturability_review"
  | "build_planning"
  | "output_generation"
  | "output_interface";

export async function logManufacturingStageRun(
  manufacturingId: string,
  stage: ManufacturingRunStage,
  input: unknown,
  output: unknown,
  status: "success" | "error",
  durationMs: number,
  errorMessage?: string,
): Promise<void> {
  const { error } = await db
    .from("Hangar_Manufacturing_runs")
    .insert({
      manufacturing_id: manufacturingId,
      agent_id: "MANUFACTURING_AGENT",
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
      `logManufacturingStageRun: failed to log stage ${stage} for manufacturing ${manufacturingId}: ${error.message}`,
    );
  }
}
