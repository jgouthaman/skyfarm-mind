import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Aircraft Design Agent (Bay 03) persistence against Hangar_aircraft_designs
// / Hangar_aircraft_design_specs / Hangar_aircraft_design_runs — mirrors
// conceptPersistence.ts file-for-file. Server-only, same reason.

type DbResult<T> = Promise<{ data: T; error: { message: string } | null }>;

const db = supabaseAdmin as unknown as {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (
        column: string,
        value: string,
      ) => {
        maybeSingle: () => DbResult<Record<string, unknown> | null>;
      };
    };
    insert: (row: Record<string, unknown>) => DbResult<null> & {
      select: (columns: string) => {
        single: () => DbResult<Record<string, unknown>>;
      };
    };
    update: (patch: Record<string, unknown>) => {
      eq: (column: string, value: string) => DbResult<null>;
    };
  };
};

export type AircraftDesignStatus = "draft" | "processing" | "spec_ready" | "finalized" | "error";

export interface HangarAircraftDesignRow {
  id: string;
  user_id: string;
  source_concept_id: string;
  design_code: string;
  status: AircraftDesignStatus;
  confidence_score: number | null;
  created_at: string;
  updated_at: string;
}

export interface HangarAircraftDesignSpecRow {
  id: string;
  aircraft_design_id: string;
  version: number;
  geometry_parameters: Record<string, unknown>;
  component_selections: unknown[];
  design_rationale: string;
  confidence_score: number;
  source_was_mock: boolean;
  created_at: string;
}

export async function createAircraftDesign(
  userId: string,
  sourceConceptId: string,
): Promise<HangarAircraftDesignRow> {
  const { data, error } = await db
    .from("Hangar_aircraft_designs")
    .insert({ user_id: userId, source_concept_id: sourceConceptId, status: "draft" })
    .select("*")
    .single();
  if (error) throw new Error(`createAircraftDesign: ${error.message}`);
  return data as unknown as HangarAircraftDesignRow;
}

export async function getAircraftDesign(
  aircraftDesignId: string,
): Promise<HangarAircraftDesignRow | null> {
  const { data, error } = await db
    .from("Hangar_aircraft_designs")
    .select("*")
    .eq("id", aircraftDesignId)
    .maybeSingle();
  if (error) throw new Error(`getAircraftDesign: ${error.message}`);
  return data as HangarAircraftDesignRow | null;
}

export async function updateAircraftDesignStatus(
  aircraftDesignId: string,
  status: AircraftDesignStatus,
  confidenceScore?: number,
): Promise<void> {
  const patch: Record<string, unknown> = { status };
  if (confidenceScore !== undefined) patch.confidence_score = confidenceScore;
  const { error } = await db
    .from("Hangar_aircraft_designs")
    .update(patch)
    .eq("id", aircraftDesignId);
  if (error) throw new Error(`updateAircraftDesignStatus: ${error.message}`);
}

// Mirrors conceptPersistence.ts's getNextConceptSpecVersion.
async function getNextAircraftDesignSpecVersion(aircraftDesignId: string): Promise<number> {
  const { data, error } = await (
    supabaseAdmin as unknown as {
      rpc: (fn: string, args: { p_aircraft_design_id: string }) => DbResult<number>;
    }
  ).rpc("get_next_aircraft_design_spec_version", { p_aircraft_design_id: aircraftDesignId });
  if (error) throw new Error(`getNextAircraftDesignSpecVersion: ${error.message}`);
  return data;
}

export async function persistAircraftDesignSpec(
  aircraftDesignId: string,
  spec: {
    geometryParameters: Record<string, unknown>;
    componentSelections: unknown[];
    designRationale: string;
    confidenceScore: number;
    sourceWasMock: boolean;
  },
): Promise<HangarAircraftDesignSpecRow> {
  const version = await getNextAircraftDesignSpecVersion(aircraftDesignId);
  const { data, error } = await db
    .from("Hangar_aircraft_design_specs")
    .insert({
      aircraft_design_id: aircraftDesignId,
      version,
      geometry_parameters: spec.geometryParameters,
      component_selections: spec.componentSelections,
      design_rationale: spec.designRationale,
      confidence_score: spec.confidenceScore,
      source_was_mock: spec.sourceWasMock,
    })
    .select("*")
    .single();
  if (error) throw new Error(`persistAircraftDesignSpec: ${error.message}`);
  return data as unknown as HangarAircraftDesignSpecRow;
}

export type AircraftDesignRunStage =
  | "geometry_generation"
  | "component_selection"
  | "output_generation"
  | "output_interface";

export async function logAircraftDesignStageRun(
  aircraftDesignId: string,
  stage: AircraftDesignRunStage,
  input: unknown,
  output: unknown,
  status: "success" | "error",
  durationMs: number,
  errorMessage?: string,
): Promise<void> {
  const { error } = await db.from("Hangar_aircraft_design_runs").insert({
    aircraft_design_id: aircraftDesignId,
    agent_id: "AIRCRAFT_DESIGN_AGENT",
    stage,
    input_snapshot: input ?? null,
    output_snapshot: output ?? null,
    status,
    error_message: errorMessage ?? null,
    duration_ms: durationMs,
  });
  if (error) {
    console.error(
      `logAircraftDesignStageRun: failed to log stage ${stage} for aircraft design ${aircraftDesignId}: ${error.message}`,
    );
  }
}
