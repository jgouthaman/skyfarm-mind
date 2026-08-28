import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Concept Agent (Bay 02) persistence against Hangar_concepts /
// Hangar_concept_specs / Hangar_concept_runs — mirrors missionPersistence.ts
// file-for-file (same supabaseAdmin-cast pattern, same function shapes),
// adapted to the concept schema. Server-only, same reason as
// missionPersistence.ts: only ever imported from conceptAgentPipeline.ts,
// which only ever runs inside a server route.

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

export type ConceptStatus = "draft" | "processing" | "spec_ready" | "finalized" | "error";

export interface HangarConceptRow {
  id: string;
  user_id: string;
  source_mission_id: string;
  concept_code: string;
  status: ConceptStatus;
  confidence_score: number | null;
  created_at: string;
  updated_at: string;
}

export interface HangarConceptSpecRow {
  id: string;
  concept_id: string;
  version: number;
  candidate_concepts: unknown[];
  trade_off_notes: unknown[];
  ranked_concepts: unknown[];
  confidence_score: number;
  created_at: string;
}

export async function createConcept(
  userId: string,
  sourceMissionId: string,
): Promise<HangarConceptRow> {
  const { data, error } = await db
    .from("Hangar_concepts")
    .insert({ user_id: userId, source_mission_id: sourceMissionId, status: "draft" })
    .select("*")
    .single();
  if (error) throw new Error(`createConcept: ${error.message}`);
  return data as unknown as HangarConceptRow;
}

export async function getConcept(conceptId: string): Promise<HangarConceptRow | null> {
  const { data, error } = await db
    .from("Hangar_concepts")
    .select("*")
    .eq("id", conceptId)
    .maybeSingle();
  if (error) throw new Error(`getConcept: ${error.message}`);
  return data as HangarConceptRow | null;
}

export async function updateConceptStatus(
  conceptId: string,
  status: ConceptStatus,
  confidenceScore?: number,
): Promise<void> {
  const patch: Record<string, unknown> = { status };
  if (confidenceScore !== undefined) patch.confidence_score = confidenceScore;
  const { error } = await db.from("Hangar_concepts").update(patch).eq("id", conceptId);
  if (error) throw new Error(`updateConceptStatus: ${error.message}`);
}

// Same list/history cast pattern as missionPersistence.ts's listDb.
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

// Same dedup-by-latest-version pattern as missionPersistence.ts's
// getSpecsForMissions — concepts can be regenerated against the same
// source mission too, so this must not assume one spec per concept_id.
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

export interface HangarConceptSpecSummary {
  concept_id: string;
  candidate_concepts: unknown[];
  trade_off_notes: unknown[];
  ranked_concepts: unknown[];
  confidence_score: number;
}

export async function listUserConcepts(userId: string): Promise<HangarConceptRow[]> {
  const { data, error } = await listDb
    .from("Hangar_concepts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`listUserConcepts: ${error.message}`);
  return (data ?? []) as unknown as HangarConceptRow[];
}

export async function getSpecsForConcepts(
  conceptIds: string[],
): Promise<HangarConceptSpecSummary[]> {
  if (conceptIds.length === 0) return [];
  const { data, error } = await orderedListDb
    .from("Hangar_concept_specs")
    .select("concept_id,candidate_concepts,trade_off_notes,ranked_concepts,confidence_score")
    .in("concept_id", conceptIds)
    .order("concept_id", { ascending: true })
    .order("version", { ascending: false });
  if (error) throw new Error(`getSpecsForConcepts: ${error.message}`);
  const latestByConcept = new Map<string, Record<string, unknown>>();
  for (const row of data ?? []) {
    const conceptId = row.concept_id as string;
    if (!latestByConcept.has(conceptId)) latestByConcept.set(conceptId, row);
  }
  return Array.from(latestByConcept.values()) as unknown as HangarConceptSpecSummary[];
}

// Mirrors missionPersistence.ts's getNextMissionSpecVersion — same reason:
// a concept can be regenerated against the same concept_id (e.g. a future
// "regenerate ranking" action), so the version can't be hardcoded.
async function getNextConceptSpecVersion(conceptId: string): Promise<number> {
  const { data, error } = await (
    supabaseAdmin as unknown as {
      rpc: (fn: string, args: { p_concept_id: string }) => DbResult<number>;
    }
  ).rpc("get_next_concept_spec_version", { p_concept_id: conceptId });
  if (error) throw new Error(`getNextConceptSpecVersion: ${error.message}`);
  return data;
}

export async function persistConceptSpec(
  conceptId: string,
  spec: {
    candidateConcepts: unknown[];
    tradeOffNotes: unknown[];
    rankedConcepts: unknown[];
    confidenceScore: number;
  },
): Promise<HangarConceptSpecRow> {
  const version = await getNextConceptSpecVersion(conceptId);
  const { data, error } = await db
    .from("Hangar_concept_specs")
    .insert({
      concept_id: conceptId,
      version,
      candidate_concepts: spec.candidateConcepts,
      trade_off_notes: spec.tradeOffNotes,
      ranked_concepts: spec.rankedConcepts,
      confidence_score: spec.confidenceScore,
    })
    .select("*")
    .single();
  if (error) throw new Error(`persistConceptSpec: ${error.message}`);
  return data as unknown as HangarConceptSpecRow;
}

export type ConceptRunStage =
  | "concept_ideation"
  | "trade_off_reasoning"
  | "ranking_scoring"
  | "output_interface";

export async function logConceptStageRun(
  conceptId: string,
  stage: ConceptRunStage,
  input: unknown,
  output: unknown,
  status: "success" | "error",
  durationMs: number,
  errorMessage?: string,
): Promise<void> {
  const { error } = await db.from("Hangar_concept_runs").insert({
    concept_id: conceptId,
    agent_id: "CONCEPT_AGENT",
    stage,
    input_snapshot: input ?? null,
    output_snapshot: output ?? null,
    status,
    error_message: errorMessage ?? null,
    duration_ms: durationMs,
  });
  if (error) {
    console.error(
      `logConceptStageRun: failed to log stage ${stage} for concept ${conceptId}: ${error.message}`,
    );
  }
}
