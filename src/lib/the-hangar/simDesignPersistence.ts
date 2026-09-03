import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { HangarCADDesignSpecRow } from "./cadDesignPersistence.ts";

// Simulation Orchestrator Agent (Bay 05) persistence against
// Hangar_Simulations / Hangar_Simulation_specs / Hangar_Simulation_runs —
// mirrors cadDesignPersistence.ts file-for-file, including its .limit(1)
// (not .single()/.maybeSingle()) convention. Server-only, same reason.
//
// Placement note (resolved): an earlier version of this file exported
// assertSimulationOwnership here as a deliberate, documented deviation from
// the real precedent (ownership-assert functions live in the
// *AgentPipeline.ts file — see assertConceptOwnership/assertMissionOwnership
// in conceptAgentPipeline.ts, assertAircraftDesignOwnership in
// aircraftDesignAgentPipeline.ts, assertCADDesignOwnership in
// cadDesignAgentPipeline.ts), made only because simDesignAgentPipeline.ts
// didn't exist yet. Now that it does, assertSimulationOwnership has moved
// there (local/unexported, using getSimulation below — the same real
// original state assertCADDesignOwnership had before Bay 05 itself needed
// it exported) to match precedent exactly.

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

export type SimulationStatus = "draft" | "processing" | "spec_ready" | "finalized" | "error";

export interface HangarSimulationRow {
  id: string;
  user_id: string;
  source_cad_design_id: string;
  simulation_code: string;
  status: SimulationStatus;
  confidence_score: number | null;
  created_at: string;
  updated_at: string;
}

export interface HangarSimulationSpecRow {
  id: string;
  simulation_id: string;
  version: number;
  flight_envelope: Record<string, unknown>;
  stability: Record<string, unknown>;
  performance_score: number | null;
  risk_flags: string[];
  confidence_score: number;
  reasoning_summary: string | null;
  source_was_mock: boolean;
  created_at: string;
}

export async function createSimulation(
  userId: string,
  sourceCadDesignId: string,
): Promise<HangarSimulationRow> {
  const { data, error } = await db
    .from("Hangar_Simulations")
    .insert({ user_id: userId, source_cad_design_id: sourceCadDesignId, status: "draft" })
    .select("*")
    .limit(1);
  if (error) throw new Error(`createSimulation: ${error.message}`);
  const row = data?.[0];
  if (!row) throw new Error("createSimulation: insert returned no row");
  return row as unknown as HangarSimulationRow;
}

export async function getSimulation(simulationId: string): Promise<HangarSimulationRow | null> {
  const { data, error } = await db
    .from("Hangar_Simulations")
    .select("*")
    .eq("id", simulationId)
    .limit(1);
  if (error) throw new Error(`getSimulation: ${error.message}`);
  return (data?.[0] as HangarSimulationRow | undefined) ?? null;
}

export async function updateSimulationStatus(
  simulationId: string,
  status: SimulationStatus,
  confidenceScore?: number,
): Promise<void> {
  const patch: Record<string, unknown> = { status };
  if (confidenceScore !== undefined) patch.confidence_score = confidenceScore;
  const { error } = await db.from("Hangar_Simulations").update(patch).eq("id", simulationId);
  if (error) throw new Error(`updateSimulationStatus: ${error.message}`);
}

async function getNextSimulationSpecVersion(simulationId: string): Promise<number> {
  const { data, error } = await (
    supabaseAdmin as unknown as {
      rpc: (fn: string, args: { p_simulation_id: string }) => DbResult<number>;
    }
  ).rpc("get_next_simulation_spec_version", { p_simulation_id: simulationId });
  if (error) throw new Error(`getNextSimulationSpecVersion: ${error.message}`);
  return data;
}

export async function persistSimulationSpec(
  simulationId: string,
  spec: {
    flightEnvelope: Record<string, unknown>;
    stability: Record<string, unknown>;
    performanceScore: number;
    riskFlags: string[];
    confidenceScore: number;
    reasoningSummary: string;
    sourceWasMock: boolean;
  },
): Promise<HangarSimulationSpecRow> {
  const version = await getNextSimulationSpecVersion(simulationId);
  const { data, error } = await db
    .from("Hangar_Simulation_specs")
    .insert({
      simulation_id: simulationId,
      version,
      flight_envelope: spec.flightEnvelope,
      stability: spec.stability,
      performance_score: spec.performanceScore,
      risk_flags: spec.riskFlags,
      confidence_score: spec.confidenceScore,
      reasoning_summary: spec.reasoningSummary,
      source_was_mock: spec.sourceWasMock,
    })
    .select("*")
    .limit(1);
  if (error) throw new Error(`persistSimulationSpec: ${error.message}`);
  const row = data?.[0];
  if (!row) throw new Error("persistSimulationSpec: insert returned no row");
  return row as unknown as HangarSimulationSpecRow;
}

// Same list/history cast pattern as cadDesignPersistence.ts's listDb.
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

// Same dedup-by-latest-version pattern as cadDesignPersistence.ts's
// getSpecsForCADDesigns — simulations can be regenerated against the same
// source CAD design too.
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

export interface HangarSimulationSpecSummary {
  simulation_id: string;
  flight_envelope: Record<string, unknown>;
  stability: Record<string, unknown>;
  performance_score: number | null;
  risk_flags: string[];
  confidence_score: number;
  reasoning_summary: string | null;
  source_was_mock: boolean;
}

export async function listUserSimulations(userId: string): Promise<HangarSimulationRow[]> {
  const { data, error } = await listDb
    .from("Hangar_Simulations")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`listUserSimulations: ${error.message}`);
  return (data ?? []) as unknown as HangarSimulationRow[];
}

export async function getSpecsForSimulations(
  simulationIds: string[],
): Promise<HangarSimulationSpecSummary[]> {
  if (simulationIds.length === 0) return [];
  const { data, error } = await orderedListDb
    .from("Hangar_Simulation_specs")
    .select(
      "simulation_id,flight_envelope,stability,performance_score,risk_flags,confidence_score,reasoning_summary,source_was_mock",
    )
    .in("simulation_id", simulationIds)
    .order("simulation_id", { ascending: true })
    .order("version", { ascending: false });
  if (error) throw new Error(`getSpecsForSimulations: ${error.message}`);
  const latestBySimulation = new Map<string, Record<string, unknown>>();
  for (const row of data ?? []) {
    const id = row.simulation_id as string;
    if (!latestBySimulation.has(id)) latestBySimulation.set(id, row);
  }
  return Array.from(latestBySimulation.values()) as unknown as HangarSimulationSpecSummary[];
}

export type SimulationRunStage =
  | "flight_dynamics_assessment"
  | "stability_analysis"
  | "output_generation"
  | "output_interface";

export async function logSimulationStageRun(
  simulationId: string,
  stage: SimulationRunStage,
  input: unknown,
  output: unknown,
  status: "success" | "error",
  durationMs: number,
  errorMessage?: string,
): Promise<void> {
  const { error } = await db
    .from("Hangar_Simulation_runs")
    .insert({
      simulation_id: simulationId,
      agent_id: "SIMULATION_ORCHESTRATOR_AGENT",
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
      `logSimulationStageRun: failed to log stage ${stage} for simulation ${simulationId}: ${error.message}`,
    );
  }
}

// ── Bay 04 read: latest CAD design spec ───────────────────────────────────
//
// get_latest_cad_design_spec (supabase/migrations/20260901120000_hangar_cad_agent_get_latest_spec_rpc.sql)
// was added specifically for this bay to consume, per that migration's own
// header comment — this is its first real caller. Uses the RPC rather than
// querying Hangar_CADDesign_specs directly with order-by/limit, per the
// standing instruction (the RPC exists precisely so callers don't
// reimplement that query). Confirmed live before writing this: unlike
// get_latest_aircraft_design_spec (setof — empty array on no match),
// get_latest_cad_design_spec's return type is the bare row type (not
// setof), so a non-match comes back as a single object with every column
// null rather than an empty array — same shape as conceptPersistence.ts's
// getLatestConceptSpec, checked here the same way (a real column, not
// array length). Returns the real HangarCADDesignSpecRow type imported
// from cadDesignPersistence.ts, not redefined here.
export async function getLatestCADDesignSpec(
  cadDesignId: string,
): Promise<HangarCADDesignSpecRow | null> {
  const { data, error } = await (
    supabaseAdmin as unknown as {
      rpc: (
        fn: string,
        args: { p_cad_design_id: string },
      ) => DbResult<Record<string, unknown> | null>;
    }
  ).rpc("get_latest_cad_design_spec", { p_cad_design_id: cadDesignId });
  if (error) throw new Error(`getLatestCADDesignSpec: ${error.message}`);
  if (!data || data.id === null) return null;
  return data as unknown as HangarCADDesignSpecRow;
}
