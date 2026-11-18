import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Bay 06 (CFD Agent) solver runs: public."Hangar_CFD_runs"
// (20261118000000_hangar_cfd_runs.sql). Unlike the other Hangar_*
// persistence files, which use the service role throughout, reads and the
// insert here go through a client scoped to the caller's own Supabase
// session, so the table's RLS (select/insert own rows only) is what
// enforces ownership. The table has no update policy, so status changes
// (markDispatched / markFailed, and later the GCP worker) use the service
// role. Server-only.
//
// Hangar_CFD_runs isn't in the generated Database types yet, so both
// clients are cast to the minimal query shape used here, the same way the
// other persistence files cast supabaseAdmin.

export type CFDRunStatus =
  | "queued"
  | "dispatched"
  | "meshing"
  | "solving"
  | "postprocessing"
  | "completed"
  | "failed"
  | "cancelled";

export interface HangarCFDRunRow {
  id: string;
  cfd_id: string;
  user_id: string;
  status: CFDRunStatus;
  progress_pct: number | null;
  case_setup: Record<string, unknown> | null;
  solver: string | null;
  turbulence_model: string | null;
  mesh_stats: Record<string, unknown> | null;
  residuals: unknown[] | null;
  results: Record<string, unknown> | null;
  artifacts: Record<string, unknown> | null;
  error_message: string | null;
  gcp_execution_id: string | null;
  is_stub: boolean | null;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  completed_at: string | null;
}

const TABLE = "Hangar_CFD_runs";

type DbResult<T> = Promise<{ data: T; error: { message: string; code?: string } | null }>;

// A failed write, keeping the Postgres error code (e.g. 23505 when the
// one-active-run-per-cfd_id partial unique index rejects an insert).
export class CFDRunDbError extends Error {
  constructor(
    message: string,
    public readonly code: string | null,
  ) {
    super(message);
    this.name = "CFDRunDbError";
  }
}
type Rows = Record<string, unknown>[] | null;

interface RunsClient {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (
        column: string,
        value: string,
      ) => {
        limit: (n: number) => DbResult<Rows>;
        order: (column: string, opts: { ascending: boolean }) => DbResult<Rows>;
      };
    };
    insert: (row: Record<string, unknown>) => {
      select: (columns: string) => { limit: (n: number) => DbResult<Rows> };
    };
    update: (patch: Record<string, unknown>) => {
      eq: (column: string, value: string) => DbResult<null>;
    };
  };
}

export type CFDRunUserClient = RunsClient & { readonly __userScoped: true };

const adminDb = supabaseAdmin as unknown as RunsClient;

// A Supabase client acting as the caller (their bearer token, the
// publishable key), so RLS applies. Call after resolveUserId has verified
// the token.
export function cfdRunUserClient(request: Request): CFDRunUserClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key)
    throw new Error("cfdRunUserClient: SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY not set");
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  return createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  }) as unknown as CFDRunUserClient;
}

export async function createRun(
  client: CFDRunUserClient,
  run: {
    cfdId: string;
    userId: string;
    caseSetup: Record<string, unknown>;
    solver: string;
    turbulenceModel: string;
    isStub: boolean;
  },
): Promise<HangarCFDRunRow> {
  const { data, error } = await client
    .from(TABLE)
    .insert({
      cfd_id: run.cfdId,
      user_id: run.userId,
      status: "queued",
      progress_pct: 0,
      case_setup: run.caseSetup,
      solver: run.solver,
      turbulence_model: run.turbulenceModel,
      is_stub: run.isStub,
    })
    .select("*")
    .limit(1);
  if (error) throw new CFDRunDbError(`createRun: ${error.message}`, error.code ?? null);
  const row = data?.[0];
  if (!row) throw new Error("createRun: insert returned no row");
  return row as unknown as HangarCFDRunRow;
}

// null when the run doesn't exist or isn't the caller's (RLS hides it).
export async function getRun(
  client: CFDRunUserClient,
  runId: string,
): Promise<HangarCFDRunRow | null> {
  const { data, error } = await client.from(TABLE).select("*").eq("id", runId).limit(1);
  if (error) throw new Error(`getRun: ${error.message}`);
  return (data?.[0] as HangarCFDRunRow | undefined) ?? null;
}

// Newest first.
export async function listRunsForCfd(
  client: CFDRunUserClient,
  cfdId: string,
): Promise<HangarCFDRunRow[]> {
  const { data, error } = await client
    .from(TABLE)
    .select("*")
    .eq("cfd_id", cfdId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`listRunsForCfd: ${error.message}`);
  return (data ?? []) as unknown as HangarCFDRunRow[];
}

export async function markDispatched(runId: string, executionId: string): Promise<void> {
  const { error } = await adminDb
    .from(TABLE)
    .update({ status: "dispatched", gcp_execution_id: executionId })
    .eq("id", runId);
  if (error) throw new Error(`markDispatched: ${error.message}`);
}

export async function markFailed(runId: string, message: string): Promise<void> {
  const { error } = await adminDb
    .from(TABLE)
    .update({ status: "failed", error_message: message, completed_at: new Date().toISOString() })
    .eq("id", runId);
  if (error) throw new Error(`markFailed: ${error.message}`);
}
