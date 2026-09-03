import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Structural Agent (Bay 07) persistence against Hangar_Structurals /
// Hangar_Structural_specs / Hangar_Structural_runs — mirrors
// simDesignPersistence.ts file-for-file, including its .limit(1) (not
// .single()/.maybeSingle()) convention. Server-only, same reason.
//
// assertStructuralOwnership is NOT defined here — matching the real,
// corrected precedent simDesignPersistence.ts's own header comment
// documents (ownership-assert functions live in the *AgentPipeline.ts
// file: assertConceptOwnership/assertMissionOwnership in
// conceptAgentPipeline.ts, assertAircraftDesignOwnership in
// aircraftDesignAgentPipeline.ts, assertCADDesignOwnership in
// cadDesignAgentPipeline.ts, assertSimulationOwnership in
// simDesignAgentPipeline.ts). See structuralAgentPipeline.ts.
//
// Bay 04's latest-spec reader (getLatestCADDesignSpec) is reused directly
// from simDesignPersistence.ts rather than duplicated here — it already
// exists there (added specifically for Bay 05 to consume, per its own
// header comment) and does exactly what this bay needs; no new RPC or
// wrapper is added on Bay 04's schema for this bay's benefit, per
// StructuralAgent.md Section "Implementation Notes."

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

export type StructuralStatus = "draft" | "processing" | "spec_ready" | "finalized" | "error";

export interface HangarStructuralRow {
  id: string;
  user_id: string;
  source_cad_design_id: string;
  structural_code: string;
  status: StructuralStatus;
  confidence_score: number | null;
  created_at: string;
  updated_at: string;
}

export interface HangarStructuralSpecRow {
  id: string;
  structural_id: string;
  version: number;
  mesh_material: Record<string, unknown>;
  load_cases: Record<string, unknown>[];
  stress_results: Record<string, unknown>;
  safety_factor: number | null;
  convergence_status: string | null;
  risk_flags: string[];
  confidence_score: number;
  reasoning_summary: string | null;
  source_was_mock: boolean;
  created_at: string;
}

export async function createStructural(
  userId: string,
  sourceCadDesignId: string,
): Promise<HangarStructuralRow> {
  const { data, error } = await db
    .from("Hangar_Structurals")
    .insert({ user_id: userId, source_cad_design_id: sourceCadDesignId, status: "draft" })
    .select("*")
    .limit(1);
  if (error) throw new Error(`createStructural: ${error.message}`);
  const row = data?.[0];
  if (!row) throw new Error("createStructural: insert returned no row");
  return row as unknown as HangarStructuralRow;
}

export async function getStructural(structuralId: string): Promise<HangarStructuralRow | null> {
  const { data, error } = await db
    .from("Hangar_Structurals")
    .select("*")
    .eq("id", structuralId)
    .limit(1);
  if (error) throw new Error(`getStructural: ${error.message}`);
  return (data?.[0] as HangarStructuralRow | undefined) ?? null;
}

export async function updateStructuralStatus(
  structuralId: string,
  status: StructuralStatus,
  confidenceScore?: number,
): Promise<void> {
  const patch: Record<string, unknown> = { status };
  if (confidenceScore !== undefined) patch.confidence_score = confidenceScore;
  const { error } = await db.from("Hangar_Structurals").update(patch).eq("id", structuralId);
  if (error) throw new Error(`updateStructuralStatus: ${error.message}`);
}

async function getNextStructuralSpecVersion(structuralId: string): Promise<number> {
  const { data, error } = await (
    supabaseAdmin as unknown as {
      rpc: (fn: string, args: { p_structural_id: string }) => DbResult<number>;
    }
  ).rpc("get_next_structural_spec_version", { p_structural_id: structuralId });
  if (error) throw new Error(`getNextStructuralSpecVersion: ${error.message}`);
  return data;
}

export async function persistStructuralSpec(
  structuralId: string,
  spec: {
    meshMaterial: Record<string, unknown>;
    loadCases: Record<string, unknown>[];
    stressResults: Record<string, unknown>;
    safetyFactor: number;
    convergenceStatus: string;
    riskFlags: string[];
    confidenceScore: number;
    reasoningSummary: string;
    sourceWasMock: boolean;
  },
): Promise<HangarStructuralSpecRow> {
  const version = await getNextStructuralSpecVersion(structuralId);
  const { data, error } = await db
    .from("Hangar_Structural_specs")
    .insert({
      structural_id: structuralId,
      version,
      mesh_material: spec.meshMaterial,
      load_cases: spec.loadCases,
      stress_results: spec.stressResults,
      safety_factor: spec.safetyFactor,
      convergence_status: spec.convergenceStatus,
      risk_flags: spec.riskFlags,
      confidence_score: spec.confidenceScore,
      reasoning_summary: spec.reasoningSummary,
      source_was_mock: spec.sourceWasMock,
    })
    .select("*")
    .limit(1);
  if (error) throw new Error(`persistStructuralSpec: ${error.message}`);
  const row = data?.[0];
  if (!row) throw new Error("persistStructuralSpec: insert returned no row");
  return row as unknown as HangarStructuralSpecRow;
}

// Same list/history cast pattern as simDesignPersistence.ts's listDb.
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

// Same dedup-by-latest-version pattern as simDesignPersistence.ts's
// getSpecsForSimulations — structural analyses can be regenerated against
// the same source CAD design too.
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

export interface HangarStructuralSpecSummary {
  structural_id: string;
  mesh_material: Record<string, unknown>;
  load_cases: Record<string, unknown>[];
  stress_results: Record<string, unknown>;
  safety_factor: number | null;
  convergence_status: string | null;
  risk_flags: string[];
  confidence_score: number;
  reasoning_summary: string | null;
  source_was_mock: boolean;
}

export async function listUserStructurals(userId: string): Promise<HangarStructuralRow[]> {
  const { data, error } = await listDb
    .from("Hangar_Structurals")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`listUserStructurals: ${error.message}`);
  return (data ?? []) as unknown as HangarStructuralRow[];
}

export async function getSpecsForStructurals(
  structuralIds: string[],
): Promise<HangarStructuralSpecSummary[]> {
  if (structuralIds.length === 0) return [];
  const { data, error } = await orderedListDb
    .from("Hangar_Structural_specs")
    .select(
      "structural_id,mesh_material,load_cases,stress_results,safety_factor,convergence_status,risk_flags,confidence_score,reasoning_summary,source_was_mock",
    )
    .in("structural_id", structuralIds)
    .order("structural_id", { ascending: true })
    .order("version", { ascending: false });
  if (error) throw new Error(`getSpecsForStructurals: ${error.message}`);
  const latestByStructural = new Map<string, Record<string, unknown>>();
  for (const row of data ?? []) {
    const id = row.structural_id as string;
    if (!latestByStructural.has(id)) latestByStructural.set(id, row);
  }
  return Array.from(latestByStructural.values()) as unknown as HangarStructuralSpecSummary[];
}

export type StructuralRunStage =
  | "mesh_material_setup"
  | "solver_setup_execution"
  | "output_generation"
  | "output_interface";

export async function logStructuralStageRun(
  structuralId: string,
  stage: StructuralRunStage,
  input: unknown,
  output: unknown,
  status: "success" | "error",
  durationMs: number,
  errorMessage?: string,
): Promise<void> {
  const { error } = await db
    .from("Hangar_Structural_runs")
    .insert({
      structural_id: structuralId,
      agent_id: "STRUCTURAL_AGENT",
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
      `logStructuralStageRun: failed to log stage ${stage} for structural ${structuralId}: ${error.message}`,
    );
  }
}
