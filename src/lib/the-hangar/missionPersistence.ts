import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { SourceType } from "./types/hangar-mission";

// Stage 2.4 (MissionAgent.md Section 4.4.1) — persistence against
// Hangar_missions / Hangar_mission_specs / Hangar_agent_runs. Server-only:
// this module is only ever imported from missionAgentPipeline.ts, which
// only ever runs inside a server route (Section 12.1's execution-boundary
// requirement — the service role key must never reach the client).
//
// Hangar_* tables aren't in the generated Database type yet (same gap
// noted in directReferenceResolver.ts) — supabaseAdmin is cast to an
// untyped shape locally. Drop this cast once src/integrations/supabase/types.ts
// is regenerated after a Hangar_* migration actually runs against the
// generated-types workflow.

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

export type MissionStatus = "draft" | "processing" | "spec_ready" | "finalized" | "error";

export interface HangarMissionRow {
  id: string;
  user_id: string;
  mission_code: string;
  status: MissionStatus;
  source_types_used: string[];
  confidence_score: number | null;
  created_at: string;
  updated_at: string;
}

export interface HangarMissionSpecRow {
  id: string;
  mission_id: string;
  version: number;
  mission_specs: Record<string, unknown>;
  constraints: unknown[];
  kpis: unknown[];
  summary: string;
  confidence_score: number;
  created_at: string;
}

// Section 12.1's ordering requirement: a Hangar_missions row must exist
// before the pipeline proper runs — this creates it, status defaults 'draft'.
export async function createMission(
  userId: string,
  sourceTypesUsed: SourceType[],
): Promise<HangarMissionRow> {
  const { data, error } = await db
    .from("Hangar_missions")
    .insert({ user_id: userId, status: "draft", source_types_used: sourceTypesUsed })
    .select("*")
    .single();
  if (error) throw new Error(`createMission: ${error.message}`);
  return data as unknown as HangarMissionRow;
}

export async function getMission(missionId: string): Promise<HangarMissionRow | null> {
  const { data, error } = await db
    .from("Hangar_missions")
    .select("*")
    .eq("id", missionId)
    .maybeSingle();
  if (error) throw new Error(`getMission: ${error.message}`);
  return data as HangarMissionRow | null;
}

export async function updateMissionStatus(
  missionId: string,
  status: MissionStatus,
  confidenceScore?: number,
): Promise<void> {
  const patch: Record<string, unknown> = { status };
  if (confidenceScore !== undefined) patch.confidence_score = confidenceScore;
  const { error } = await db.from("Hangar_missions").update(patch).eq("id", missionId);
  if (error) throw new Error(`updateMissionStatus: ${error.message}`);
}

// Stage 2.4, component #0 (Section 4.4.1) — Persistence, the prerequisite
// that blocks everything else. version is hardcoded to 1: every mission
// this pipeline handles today is its first generation — Section 13.2's
// "Edit and regenerate" -> version 2 flow is a dashboard/review-step
// feature that doesn't exist yet (Stage 2.4 is backend-only, no UI wired).
export async function persistMissionSpec(
  missionId: string,
  spec: {
    missionSpecs: Record<string, unknown>;
    constraints: unknown[];
    kpis: unknown[];
    summary: string;
    confidenceScore: number;
  },
): Promise<HangarMissionSpecRow> {
  const { data, error } = await db
    .from("Hangar_mission_specs")
    .insert({
      mission_id: missionId,
      version: 1,
      mission_specs: spec.missionSpecs,
      constraints: spec.constraints,
      kpis: spec.kpis,
      summary: spec.summary,
      confidence_score: spec.confidenceScore,
    })
    .select("*")
    .single();
  if (error) throw new Error(`persistMissionSpec: ${error.message}`);
  return data as unknown as HangarMissionSpecRow;
}

// KNOWN SPEC/SCHEMA DRIFT: Section 10's documented check constraint uses
// '2.1_input_processing' / '2.2_reasoning_planning' /
// '2.3_output_generation' / '2.4_output_interface' (numeric-prefixed).
// The live Hangar_agent_runs table's actual check constraint — confirmed
// directly by probing it — only accepts these four, unprefixed:
export type AgentRunStage =
  | "input_processing"
  | "reasoning_planning"
  | "output_generation"
  | "output_interface";

// Section 9 / Section 12.1: every stage writes one row, win or fail — "no
// silent failures." Deliberately swallows its OWN failure (logs to
// console, doesn't throw): a logging write failing is not a reason to turn
// an otherwise-successful mission into an error response to the caller.
export async function logStageRun(
  missionId: string,
  stage: AgentRunStage,
  input: unknown,
  output: unknown,
  status: "success" | "error",
  durationMs: number,
  errorMessage?: string,
): Promise<void> {
  const { error } = await db.from("Hangar_agent_runs").insert({
    mission_id: missionId,
    agent_id: "MISSION_AGENT",
    stage,
    input_snapshot: input ?? null,
    output_snapshot: output ?? null,
    status,
    error_message: errorMessage ?? null,
    duration_ms: durationMs,
  });
  if (error) {
    console.error(
      `logStageRun: failed to log stage ${stage} for mission ${missionId}: ${error.message}`,
    );
  }
}
