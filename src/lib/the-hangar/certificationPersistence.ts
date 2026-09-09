import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Certification Agent (Bay 12) persistence against Hangar_Certifications /
// Hangar_Certification_specs / Hangar_Certification_runs -- mirrors
// manufacturingPersistence.ts file-for-file, including its .limit(1) (not
// .single()/.maybeSingle()) convention and its versioned parent/specs/runs
// split. Server-only, same reason as every other Hangar_* persistence file.
//
// Bay 09's own reader (getValidation from validationPersistence.ts) is
// reused directly by certificationAgentPipeline.ts rather than duplicated
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

export type CertificationStatus = "draft" | "processing" | "spec_ready" | "finalized" | "error";

export interface HangarCertificationRow {
  id: string;
  user_id: string;
  source_validation_id: string;
  certification_code: string;
  status: CertificationStatus;
  confidence_score: number | null;
  created_at: string;
  updated_at: string;
}

export interface HangarCertificationSpecRow {
  id: string;
  certification_id: string;
  version: number;
  checklist: Record<string, unknown>[];
  gap_report: Record<string, unknown>[];
  certification_readiness: "READY" | "GAPS_OPEN" | "BLOCKED";
  confidence_score: number;
  reasoning_summary: string | null;
  source_was_mock: boolean;
  created_at: string;
}

export async function createCertification(
  userId: string,
  sourceValidationId: string,
): Promise<HangarCertificationRow> {
  const { data, error } = await db
    .from("Hangar_Certifications")
    .insert({
      user_id: userId,
      source_validation_id: sourceValidationId,
      status: "draft",
    })
    .select("*")
    .limit(1);
  if (error) throw new Error(`createCertification: ${error.message}`);
  const row = data?.[0];
  if (!row) throw new Error("createCertification: insert returned no row");
  return row as unknown as HangarCertificationRow;
}

export async function getCertification(
  certificationId: string,
): Promise<HangarCertificationRow | null> {
  const { data, error } = await db
    .from("Hangar_Certifications")
    .select("*")
    .eq("id", certificationId)
    .limit(1);
  if (error) throw new Error(`getCertification: ${error.message}`);
  return (data?.[0] as HangarCertificationRow | undefined) ?? null;
}

export async function updateCertificationStatus(
  certificationId: string,
  status: CertificationStatus,
  confidenceScore?: number,
): Promise<void> {
  const patch: Record<string, unknown> = { status };
  if (confidenceScore !== undefined) patch.confidence_score = confidenceScore;
  const { error } = await db
    .from("Hangar_Certifications")
    .update(patch)
    .eq("id", certificationId);
  if (error) throw new Error(`updateCertificationStatus: ${error.message}`);
}

async function getNextCertificationSpecVersion(certificationId: string): Promise<number> {
  const { data, error } = await (
    supabaseAdmin as unknown as {
      rpc: (fn: string, args: { p_certification_id: string }) => DbResult<number>;
    }
  ).rpc("get_next_certification_spec_version", { p_certification_id: certificationId });
  if (error) throw new Error(`getNextCertificationSpecVersion: ${error.message}`);
  return data;
}

export async function persistCertificationSpec(
  certificationId: string,
  spec: {
    checklist: Record<string, unknown>[];
    gapReport: Record<string, unknown>[];
    certificationReadiness: "READY" | "GAPS_OPEN" | "BLOCKED";
    confidenceScore: number;
    reasoningSummary: string;
    sourceWasMock: boolean;
  },
): Promise<HangarCertificationSpecRow> {
  const version = await getNextCertificationSpecVersion(certificationId);
  const { data, error } = await db
    .from("Hangar_Certification_specs")
    .insert({
      certification_id: certificationId,
      version,
      checklist: spec.checklist,
      gap_report: spec.gapReport,
      certification_readiness: spec.certificationReadiness,
      confidence_score: spec.confidenceScore,
      reasoning_summary: spec.reasoningSummary,
      source_was_mock: spec.sourceWasMock,
    })
    .select("*")
    .limit(1);
  if (error) throw new Error(`persistCertificationSpec: ${error.message}`);
  const row = data?.[0];
  if (!row) throw new Error("persistCertificationSpec: insert returned no row");
  return row as unknown as HangarCertificationSpecRow;
}

// Same list/history cast pattern as manufacturingPersistence.ts's listDb.
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

export interface HangarCertificationSpecSummary {
  certification_id: string;
  checklist: Record<string, unknown>[];
  gap_report: Record<string, unknown>[];
  certification_readiness: "READY" | "GAPS_OPEN" | "BLOCKED";
  confidence_score: number;
  reasoning_summary: string | null;
  source_was_mock: boolean;
}

export async function listUserCertifications(userId: string): Promise<HangarCertificationRow[]> {
  const { data, error } = await listDb
    .from("Hangar_Certifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`listUserCertifications: ${error.message}`);
  return (data ?? []) as unknown as HangarCertificationRow[];
}

export async function getSpecsForCertifications(
  certificationIds: string[],
): Promise<HangarCertificationSpecSummary[]> {
  if (certificationIds.length === 0) return [];
  const { data, error } = await orderedListDb
    .from("Hangar_Certification_specs")
    .select(
      "certification_id,checklist,gap_report,certification_readiness,confidence_score,reasoning_summary,source_was_mock",
    )
    .in("certification_id", certificationIds)
    .order("certification_id", { ascending: true })
    .order("version", { ascending: false });
  if (error) throw new Error(`getSpecsForCertifications: ${error.message}`);
  const latestByCertification = new Map<string, Record<string, unknown>>();
  for (const row of data ?? []) {
    const id = row.certification_id as string;
    if (!latestByCertification.has(id)) latestByCertification.set(id, row);
  }
  return Array.from(latestByCertification.values()) as unknown as HangarCertificationSpecSummary[];
}

export type CertificationRunStage =
  | "regulatory_mapping"
  | "gap_analysis"
  | "output_generation"
  | "output_interface";

export async function logCertificationStageRun(
  certificationId: string,
  stage: CertificationRunStage,
  input: unknown,
  output: unknown,
  status: "success" | "error",
  durationMs: number,
  errorMessage?: string,
): Promise<void> {
  const { error } = await db
    .from("Hangar_Certification_runs")
    .insert({
      certification_id: certificationId,
      agent_id: "CERTIFICATION_AGENT",
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
      `logCertificationStageRun: failed to log stage ${stage} for certification ${certificationId}: ${error.message}`,
    );
  }
}
