import { supabaseAdmin } from "@/integrations/supabase/client.server";

// CAD Agent (Bay 04) persistence against Hangar_CADDesigns /
// Hangar_CADDesign_specs / Hangar_CADDesign_runs — mirrors
// aircraftDesignPersistence.ts, with one deliberate deviation: .limit(1)
// instead of .single()/.maybeSingle() everywhere (data?.[0] ?? null), per
// this bay's own convention. The upstream Hangar_aircraft_designs read
// reuses aircraftDesignPersistence.ts's own getAircraftDesign directly
// (imported there by cadDesignAgentPipeline.ts) rather than duplicating
// that query here. No Hangar_Projects read/write — that table doesn't
// exist (confirmed: no tracked migration, no reference anywhere in the
// codebase); CADAgent.md lists it alongside other aspirational stores
// (Component & Materials DB, Regulations DB, Knowledge Base) that were
// never built either. Server-only, same reason as every other Hangar_*
// persistence file.

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

export type CADDesignStatus = "draft" | "processing" | "spec_ready" | "finalized" | "error";

export interface HangarCADDesignRow {
  id: string;
  user_id: string;
  source_aircraft_design_id: string;
  cad_code: string;
  status: CADDesignStatus;
  confidence_score: number | null;
  created_at: string;
  updated_at: string;
}

export interface HangarCADDesignSpecRow {
  id: string;
  cad_design_id: string;
  version: number;
  model_files: Record<string, unknown>;
  bom: unknown[];
  mass_properties: Record<string, unknown>;
  interference_clear: boolean;
  dfm_flags: string[];
  design_rationale: string;
  confidence_score: number;
  source_was_mock: boolean;
  created_at: string;
}

export async function createCADDesign(
  userId: string,
  sourceAircraftDesignId: string,
): Promise<HangarCADDesignRow> {
  const { data, error } = await db
    .from("Hangar_CADDesigns")
    .insert({ user_id: userId, source_aircraft_design_id: sourceAircraftDesignId, status: "draft" })
    .select("*")
    .limit(1);
  if (error) throw new Error(`createCADDesign: ${error.message}`);
  const row = data?.[0];
  if (!row) throw new Error("createCADDesign: insert returned no row");
  return row as unknown as HangarCADDesignRow;
}

export async function getCADDesign(cadDesignId: string): Promise<HangarCADDesignRow | null> {
  const { data, error } = await db
    .from("Hangar_CADDesigns")
    .select("*")
    .eq("id", cadDesignId)
    .limit(1);
  if (error) throw new Error(`getCADDesign: ${error.message}`);
  return (data?.[0] as HangarCADDesignRow | undefined) ?? null;
}

export async function updateCADDesignStatus(
  cadDesignId: string,
  status: CADDesignStatus,
  confidenceScore?: number,
): Promise<void> {
  const patch: Record<string, unknown> = { status };
  if (confidenceScore !== undefined) patch.confidence_score = confidenceScore;
  const { error } = await db.from("Hangar_CADDesigns").update(patch).eq("id", cadDesignId);
  if (error) throw new Error(`updateCADDesignStatus: ${error.message}`);
}

async function getNextCADDesignSpecVersion(cadDesignId: string): Promise<number> {
  const { data, error } = await (
    supabaseAdmin as unknown as {
      rpc: (fn: string, args: { p_cad_design_id: string }) => DbResult<number>;
    }
  ).rpc("get_next_cad_design_spec_version", { p_cad_design_id: cadDesignId });
  if (error) throw new Error(`getNextCADDesignSpecVersion: ${error.message}`);
  return data;
}

export async function persistCADDesignSpec(
  cadDesignId: string,
  spec: {
    modelFiles: Record<string, unknown>;
    bom: unknown[];
    massProperties: Record<string, unknown>;
    interferenceClear: boolean;
    dfmFlags: string[];
    designRationale: string;
    confidenceScore: number;
    sourceWasMock: boolean;
  },
): Promise<HangarCADDesignSpecRow> {
  const version = await getNextCADDesignSpecVersion(cadDesignId);
  const { data, error } = await db
    .from("Hangar_CADDesign_specs")
    .insert({
      cad_design_id: cadDesignId,
      version,
      model_files: spec.modelFiles,
      bom: spec.bom,
      mass_properties: spec.massProperties,
      interference_clear: spec.interferenceClear,
      dfm_flags: spec.dfmFlags,
      design_rationale: spec.designRationale,
      confidence_score: spec.confidenceScore,
      source_was_mock: spec.sourceWasMock,
    })
    .select("*")
    .limit(1);
  if (error) throw new Error(`persistCADDesignSpec: ${error.message}`);
  const row = data?.[0];
  if (!row) throw new Error("persistCADDesignSpec: insert returned no row");
  return row as unknown as HangarCADDesignSpecRow;
}

// Same list/history cast pattern as aircraftDesignPersistence.ts's listDb.
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

// Same dedup-by-latest-version pattern as aircraftDesignPersistence.ts's
// getSpecsForAircraftDesigns — CAD designs can be regenerated against the
// same source aircraft design too.
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

export interface HangarCADDesignSpecSummary {
  cad_design_id: string;
  model_files: Record<string, unknown>;
  bom: unknown[];
  mass_properties: Record<string, unknown>;
  interference_clear: boolean;
  dfm_flags: string[];
  design_rationale: string;
  confidence_score: number;
  source_was_mock: boolean;
}

export async function listUserCADDesigns(userId: string): Promise<HangarCADDesignRow[]> {
  const { data, error } = await listDb
    .from("Hangar_CADDesigns")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`listUserCADDesigns: ${error.message}`);
  return (data ?? []) as unknown as HangarCADDesignRow[];
}

export async function getSpecsForCADDesigns(
  cadDesignIds: string[],
): Promise<HangarCADDesignSpecSummary[]> {
  if (cadDesignIds.length === 0) return [];
  const { data, error } = await orderedListDb
    .from("Hangar_CADDesign_specs")
    .select(
      "cad_design_id,model_files,bom,mass_properties,interference_clear,dfm_flags,design_rationale,confidence_score,source_was_mock",
    )
    .in("cad_design_id", cadDesignIds)
    .order("cad_design_id", { ascending: true })
    .order("version", { ascending: false });
  if (error) throw new Error(`getSpecsForCADDesigns: ${error.message}`);
  const latestByDesign = new Map<string, Record<string, unknown>>();
  for (const row of data ?? []) {
    const id = row.cad_design_id as string;
    if (!latestByDesign.has(id)) latestByDesign.set(id, row);
  }
  return Array.from(latestByDesign.values()) as unknown as HangarCADDesignSpecSummary[];
}

export type CADDesignRunStage =
  | "model_generation"
  | "design_validation"
  | "output_generation"
  | "output_interface";

export async function logCADDesignStageRun(
  cadDesignId: string,
  stage: CADDesignRunStage,
  input: unknown,
  output: unknown,
  status: "success" | "error",
  durationMs: number,
  errorMessage?: string,
): Promise<void> {
  const { error } = await db
    .from("Hangar_CADDesign_runs")
    .insert({
      cad_design_id: cadDesignId,
      agent_id: "CAD_AGENT",
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
      `logCADDesignStageRun: failed to log stage ${stage} for CAD design ${cadDesignId}: ${error.message}`,
    );
  }
}
