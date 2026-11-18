import { GoogleAuth } from "google-auth-library";
import { markDispatched, markFailed } from "./cfdRunPersistence.ts";

// Bay 06 (CFD Agent): starts the OpenFOAM solver for one Hangar_CFD_runs row
// as a GCP Cloud Run Job execution (Cloud Run Admin API v2, jobs.run). The
// job gets only RUN_ID; it reads the case setup from the row and writes
// status, residuals and results back with the service role. Server to
// server only -- the browser never calls GCP.
//
// Env:
//   CFD_DISPATCH_MODE  "off" (default): leave the run 'queued', call nothing
//                      "cloud_run_job": run the job, set 'dispatched'
//   GCP_PROJECT_ID, GCP_REGION, CFD_JOB_NAME   which job to run
//   GCP_SA_KEY_JSON    base64 of a service-account key JSON allowed to run it
//                      (roles/run.developer, or run.jobs.runWithOverrides)
// Any dispatch error marks the run 'failed' with the reason.

export type CFDDispatchMode = "off" | "cloud_run_job";

export interface CFDDispatchResult {
  dispatched: boolean;
  status: "queued" | "dispatched" | "failed";
  mode: CFDDispatchMode | string;
  executionId: string | null;
  error: string | null;
}

export function cfdDispatchMode(): string {
  return process.env.CFD_DISPATCH_MODE?.trim() || "off";
}

function missingEnv(): string[] {
  return ["GCP_PROJECT_ID", "GCP_REGION", "CFD_JOB_NAME", "GCP_SA_KEY_JSON"].filter(
    (k) => !process.env[k]?.trim(),
  );
}

function serviceAccountCredentials(): Record<string, unknown> {
  const raw = process.env.GCP_SA_KEY_JSON!.trim();
  try {
    return JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
  } catch {
    throw new Error("GCP_SA_KEY_JSON is not base64-encoded service-account JSON.");
  }
}

// Cloud Run returns a long-running Operation; its metadata is the new
// Execution, whose name is the id worth keeping. Falls back to the
// operation name.
function executionNameOf(body: unknown): string | null {
  const op = body as { name?: unknown; metadata?: { name?: unknown } } | null;
  if (typeof op?.metadata?.name === "string") return op.metadata.name;
  if (typeof op?.name === "string") return op.name;
  return null;
}

function describeGcpError(err: unknown): string {
  const e = err as {
    response?: { status?: number; data?: { error?: { message?: string } } };
    message?: string;
  };
  const status = e?.response?.status;
  const detail = e?.response?.data?.error?.message ?? e?.message ?? String(err);
  if (status === 401 || status === 403)
    return `GCP refused the job run (HTTP ${status}): ${detail}. Check the service account's Cloud Run permissions.`;
  if (status === 404)
    return `Cloud Run job not found (HTTP 404): ${detail}. Check GCP_PROJECT_ID, GCP_REGION and CFD_JOB_NAME.`;
  return status
    ? `Cloud Run job run failed (HTTP ${status}): ${detail}`
    : `Cloud Run job run failed: ${detail}`;
}

async function fail(runId: string, mode: string, message: string): Promise<CFDDispatchResult> {
  await markFailed(runId, message);
  return { dispatched: false, status: "failed", mode, executionId: null, error: message };
}

export async function dispatchCFDRun(runId: string): Promise<CFDDispatchResult> {
  const mode = cfdDispatchMode();
  if (mode === "off") {
    return { dispatched: false, status: "queued", mode, executionId: null, error: null };
  }
  if (mode !== "cloud_run_job") {
    return fail(
      runId,
      mode,
      `Unknown CFD_DISPATCH_MODE "${mode}" (expected "off" or "cloud_run_job").`,
    );
  }
  const missing = missingEnv();
  if (missing.length > 0) {
    return fail(runId, mode, `CFD dispatch is not configured: missing ${missing.join(", ")}.`);
  }

  const project = process.env.GCP_PROJECT_ID!.trim();
  const region = process.env.GCP_REGION!.trim();
  const job = process.env.CFD_JOB_NAME!.trim();
  const url = `https://run.googleapis.com/v2/projects/${encodeURIComponent(project)}/locations/${encodeURIComponent(region)}/jobs/${encodeURIComponent(job)}:run`;

  let executionId: string | null;
  try {
    const auth = new GoogleAuth({
      credentials: serviceAccountCredentials(),
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });
    const client = await auth.getClient();
    const res = await client.request({
      url,
      method: "POST",
      data: { overrides: { containerOverrides: [{ env: [{ name: "RUN_ID", value: runId }] }] } },
      timeout: 20_000,
    });
    executionId = executionNameOf(res.data);
  } catch (err) {
    return fail(runId, mode, describeGcpError(err));
  }
  if (!executionId) {
    return fail(
      runId,
      mode,
      "Cloud Run accepted the job run but returned no operation or execution name.",
    );
  }

  await markDispatched(runId, executionId);
  return { dispatched: true, status: "dispatched", mode, executionId, error: null };
}
