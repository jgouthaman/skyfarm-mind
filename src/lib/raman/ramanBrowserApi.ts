import { supabase } from "@/integrations/supabase/client";
import type {
  RamanAgentRunRow,
  RamanAgentStepRow,
  RamanCustomerRow,
  RamanEngagementRow,
  RamanNoiseCheckRow,
  RamanPaymentRow,
  RamanPropellerRow,
  RamanReportRow,
  RamanVehicleRow,
} from "./ramanPersistence";
import type {
  RamanDesignChanges,
  RamanEvaluateResult,
  RamanFieldError,
  RamanInputs,
  RamanLeverRangesResult,
} from "./ramanTypes";

// Browser-side calls to /api/hangar/raman/* with the Mission Hub session's
// bearer token. The browser never talks to the GCP VM or Anthropic -- only
// to these same-origin routes.

export class RamanApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly fields: RamanFieldError[] = [],
  ) {
    super(message);
  }
}

async function call<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new RamanApiError("Your session has expired -- sign in again.", 401);
  const res = await fetch(`/api/hangar/raman/${path}`, {
    method: init.method ?? (init.body === undefined ? "GET" : "POST"),
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new RamanApiError(json?.error ?? `Request failed (HTTP ${res.status}).`, res.status, json?.fields ?? []);
  return json as T;
}

const q = (params: Record<string, string | number | undefined>) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : "";
};

export type CustomerListItem = RamanCustomerRow & {
  raman_vehicles: (Pick<RamanVehicleRow, "id" | "name" | "vehicle_type" | "layout" | "created_at"> & {
    raman_engagements: Pick<RamanEngagementRow, "id" | "cycle" | "status" | "furthest_tab" | "before_dba" | "after_dba" | "created_at">[];
  })[];
};

export interface HistoryRow {
  id: string;
  cycle: number;
  created_at: string;
  before_dba: number | null;
  after_dba: number | null;
  reduction_db: number | null;
  status: "open" | "closed";
}

export interface EngagementBundle {
  engagement: RamanEngagementRow;
  vehicle: RamanVehicleRow | null;
  customer: RamanCustomerRow | null;
  baseline: RamanNoiseCheckRow | null;
  fix_prediction: RamanNoiseCheckRow | null;
  runs: RamanAgentRunRow[];
  reports: RamanReportRow[];
  payments: RamanPaymentRow[];
  history: HistoryRow[];
}

export type ReportData = EngagementBundle & {
  report: RamanReportRow;
  issued_by_name: string | null;
  locked_run: RamanAgentRunRow | null;
};

export interface StepOutcome {
  run: RamanAgentRunRow;
  step: RamanAgentStepRow | null;
  done: boolean;
}

export interface RamanAiStatus {
  live: boolean;
  provider: "anthropic" | "groq" | null;
  model: string | null;
  configuredOrder: ("anthropic" | "groq")[];
}

export const ramanApi = {
  aiStatus: () => call<RamanAiStatus>("ai-status"),
  customers: (search?: string) => call<CustomerListItem[]>(`customers${q({ q: search })}`),
  createCustomer: (body: Partial<RamanCustomerRow>) => call<RamanCustomerRow>("customers", { body }),
  createVehicle: (body: Partial<RamanVehicleRow>) => call<RamanVehicleRow>("vehicles", { body }),
  startEngagement: (vehicleId: string) => call<RamanEngagementRow>("engagements", { body: { vehicle_id: vehicleId } }),
  engagement: (id: string) => call<EngagementBundle>(`engagements/${id}`),
  closeEngagement: (id: string) => call<RamanEngagementRow>(`engagements/${id}/close`, { body: {} }),
  noiseCheck: (engagementId: string, inputs: Partial<RamanInputs>) =>
    call<{ engagement: RamanEngagementRow; check: RamanNoiseCheckRow }>("noise-check", { body: { engagement_id: engagementId, inputs } }),
  evaluate: (engagementId: string, changes: RamanDesignChanges) =>
    call<RamanEvaluateResult>("evaluate", { body: { engagement_id: engagementId, changes } }),
  leverRanges: (engagementId: string) => call<RamanLeverRangesResult>(`lever-ranges/${engagementId}`),
  payment: (engagementId: string, stage: 1 | 2, body: { status: string; amount_inr?: number | null; reference?: string }) =>
    call<{ engagement: RamanEngagementRow; payment: RamanPaymentRow }>(`payments/${engagementId}/${stage}`, { body }),
  startRun: (engagementId: string, goal: Record<string, number | null>) =>
    call<RamanAgentRunRow>("fix-runs", { body: { engagement_id: engagementId, goal } }),
  stepRun: (runId: string) => call<StepOutcome>(`fix-runs/${runId}/step`, { body: {} }),
  steps: (runId: string, after = 0) => call<{ run: RamanAgentRunRow; steps: RamanAgentStepRow[] }>(`fix-runs/${runId}/steps${q({ after })}`),
  stopRun: (runId: string) => call<RamanAgentRunRow>(`fix-runs/${runId}/stop`, { body: {} }),
  lockRun: (runId: string, changes: RamanDesignChanges) =>
    call<{ run: RamanAgentRunRow; check: RamanNoiseCheckRow; engagement: RamanEngagementRow }>(`fix-runs/${runId}/lock`, { body: { changes } }),
  report: (engagementId: string, type: "check" | "final" | "certificate") =>
    call<ReportData>(`reports/${engagementId}/${type}`, { body: {} }),
  verify: (code: string) =>
    call<{
      report: RamanReportRow;
      customer: { name: string; company: string | null } | null;
      vehicle: { name: string; vehicle_type: string } | null;
      cycle: number;
      before_dba: number | null;
      after_dba: number | null;
      target_distance_m: number | null;
      status: string;
    }>(`verify/${encodeURIComponent(code)}`),
  propellers: (search?: string, status?: string) => call<RamanPropellerRow[]>(`propellers${q({ q: search, status })}`),
  saveProp: (body: Record<string, unknown>) => call<RamanPropellerRow>("propellers", { body }),
  loadProps: (query: string) =>
    call<{ saved: RamanPropellerRow[]; skipped: string[]; source_was_mock: boolean; via: string }>("propellers/load", { body: { query } }),
};
