import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Documentation Agent (Bay 13) persistence against Hangar_Documentations /
// Hangar_Documentation_specs / Hangar_Documentation_runs -- mirrors
// certificationPersistence.ts file-for-file, including its .limit(1) (not
// .single()/.maybeSingle()) convention and its versioned parent/specs/runs
// split. Server-only, same reason as every other Hangar_* persistence file.
//
// Bay 09's own reader (getValidation from validationPersistence.ts) is
// reused directly by documentationAgentPipeline.ts rather than duplicated
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

export type DocumentationStatus = "draft" | "processing" | "spec_ready" | "finalized" | "error";

export interface HangarDocumentationRow {
  id: string;
  user_id: string;
  source_validation_id: string;
  documentation_code: string;
  status: DocumentationStatus;
  confidence_score: number | null;
  created_at: string;
  updated_at: string;
}

export interface HangarDocumentationSpecRow {
  id: string;
  documentation_id: string;
  version: number;
  report: string;
  slr: Record<string, unknown>[];
  completeness_flags: string[];
  confidence_score: number;
  reasoning_summary: string | null;
  source_was_mock: boolean;
  created_at: string;
}

export async function createDocumentation(
  userId: string,
  sourceValidationId: string,
): Promise<HangarDocumentationRow> {
  const { data, error } = await db
    .from("Hangar_Documentations")
    .insert({
      user_id: userId,
      source_validation_id: sourceValidationId,
      status: "draft",
    })
    .select("*")
    .limit(1);
  if (error) throw new Error(`createDocumentation: ${error.message}`);
  const row = data?.[0];
  if (!row) throw new Error("createDocumentation: insert returned no row");
  return row as unknown as HangarDocumentationRow;
}

export async function getDocumentation(
  documentationId: string,
): Promise<HangarDocumentationRow | null> {
  const { data, error } = await db
    .from("Hangar_Documentations")
    .select("*")
    .eq("id", documentationId)
    .limit(1);
  if (error) throw new Error(`getDocumentation: ${error.message}`);
  return (data?.[0] as HangarDocumentationRow | undefined) ?? null;
}

export async function updateDocumentationStatus(
  documentationId: string,
  status: DocumentationStatus,
  confidenceScore?: number,
): Promise<void> {
  const patch: Record<string, unknown> = { status };
  if (confidenceScore !== undefined) patch.confidence_score = confidenceScore;
  const { error } = await db
    .from("Hangar_Documentations")
    .update(patch)
    .eq("id", documentationId);
  if (error) throw new Error(`updateDocumentationStatus: ${error.message}`);
}

async function getNextDocumentationSpecVersion(documentationId: string): Promise<number> {
  const { data, error } = await (
    supabaseAdmin as unknown as {
      rpc: (fn: string, args: { p_documentation_id: string }) => DbResult<number>;
    }
  ).rpc("get_next_documentation_spec_version", { p_documentation_id: documentationId });
  if (error) throw new Error(`getNextDocumentationSpecVersion: ${error.message}`);
  return data;
}

export async function persistDocumentationSpec(
  documentationId: string,
  spec: {
    report: string;
    slr: Record<string, unknown>[];
    completenessFlags: string[];
    confidenceScore: number;
    reasoningSummary: string;
    sourceWasMock: boolean;
  },
): Promise<HangarDocumentationSpecRow> {
  const version = await getNextDocumentationSpecVersion(documentationId);
  const { data, error } = await db
    .from("Hangar_Documentation_specs")
    .insert({
      documentation_id: documentationId,
      version,
      report: spec.report,
      slr: spec.slr,
      completeness_flags: spec.completenessFlags,
      confidence_score: spec.confidenceScore,
      reasoning_summary: spec.reasoningSummary,
      source_was_mock: spec.sourceWasMock,
    })
    .select("*")
    .limit(1);
  if (error) throw new Error(`persistDocumentationSpec: ${error.message}`);
  const row = data?.[0];
  if (!row) throw new Error("persistDocumentationSpec: insert returned no row");
  return row as unknown as HangarDocumentationSpecRow;
}

// Same list/history cast pattern as certificationPersistence.ts's listDb.
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

export interface HangarDocumentationSpecSummary {
  documentation_id: string;
  report: string;
  slr: Record<string, unknown>[];
  completeness_flags: string[];
  confidence_score: number;
  reasoning_summary: string | null;
  source_was_mock: boolean;
}

export async function listUserDocumentations(userId: string): Promise<HangarDocumentationRow[]> {
  const { data, error } = await listDb
    .from("Hangar_Documentations")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`listUserDocumentations: ${error.message}`);
  return (data ?? []) as unknown as HangarDocumentationRow[];
}

export async function getSpecsForDocumentations(
  documentationIds: string[],
): Promise<HangarDocumentationSpecSummary[]> {
  if (documentationIds.length === 0) return [];
  const { data, error } = await orderedListDb
    .from("Hangar_Documentation_specs")
    .select(
      "documentation_id,report,slr,completeness_flags,confidence_score,reasoning_summary,source_was_mock",
    )
    .in("documentation_id", documentationIds)
    .order("documentation_id", { ascending: true })
    .order("version", { ascending: false });
  if (error) throw new Error(`getSpecsForDocumentations: ${error.message}`);
  const latestByDocumentation = new Map<string, Record<string, unknown>>();
  for (const row of data ?? []) {
    const id = row.documentation_id as string;
    if (!latestByDocumentation.has(id)) latestByDocumentation.set(id, row);
  }
  return Array.from(latestByDocumentation.values()) as unknown as HangarDocumentationSpecSummary[];
}

export type DocumentationRunStage =
  | "content_compilation"
  | "report_structuring"
  | "output_generation"
  | "output_interface";

export async function logDocumentationStageRun(
  documentationId: string,
  stage: DocumentationRunStage,
  input: unknown,
  output: unknown,
  status: "success" | "error",
  durationMs: number,
  errorMessage?: string,
): Promise<void> {
  const { error } = await db
    .from("Hangar_Documentation_runs")
    .insert({
      documentation_id: documentationId,
      agent_id: "DOCUMENTATION_AGENT",
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
      `logDocumentationStageRun: failed to log stage ${stage} for documentation ${documentationId}: ${error.message}`,
    );
  }
}
