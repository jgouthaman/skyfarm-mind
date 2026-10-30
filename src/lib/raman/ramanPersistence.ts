import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type {
  RamanDesignChanges,
  RamanEvaluateResult,
  RamanFixGoal,
  RamanFixPredictionResult,
  RamanInputs,
  RamanNoiseCheckResult,
  RamanRankedOption,
  RamanTradeoffs,
  RamanVerdict,
} from "./ramanTypes";

// Raman (Bay 16) persistence -- every read/write of the raman_* tables
// (20261031010000_raman_bay16.sql). Server-only, supabaseAdmin throughout.
// No ownership or role checks here; those live in RamanAgentPipeline.ts.
// The generated types.ts doesn't know the raman_* tables, so this uses the
// same loose supabaseAdmin cast as the other Hangar persistence files.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as unknown as { from: (table: string) => any };

type Row = Record<string, unknown>;

function check<T>(result: { data: T; error: { message: string } | null }, what: string): T {
  if (result.error) throw new Error(`Failed to ${what}: ${result.error.message}`);
  return result.data;
}

// PostgREST filter syntax characters stripped from free-text search.
function cleanSearch(q: string | undefined): string {
  return (q ?? "").replace(/[,()%*\\]/g, " ").trim().slice(0, 100);
}

// ── Row types ────────────────────────────────────────────────────────────

export interface RamanCustomerRow {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface RamanVehicleRow {
  id: string;
  customer_id: string;
  name: string;
  vehicle_type: "multirotor" | "vtol" | "fixed_wing";
  layout: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type PaymentStatus = "pending" | "paid" | "waived";

export interface RamanEngagementRow {
  id: string;
  vehicle_id: string;
  cycle: number;
  status: "open" | "closed";
  furthest_tab: number;
  payment1_status: PaymentStatus;
  payment2_status: PaymentStatus;
  before_dba: number | null;
  after_dba: number | null;
  target_dba: number | null;
  target_distance_m: number | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RamanNoiseCheckRow {
  id: string;
  engagement_id: string;
  kind: "baseline" | "fix_prediction";
  inputs: RamanInputs | { inputs: RamanInputs; changes: RamanDesignChanges };
  provenance: Row | null;
  result: RamanNoiseCheckResult | RamanFixPredictionResult;
  verdict: RamanVerdict | null;
  headline: string | null;
  hover_dba: number | null;
  confidence_score: number | null;
  engine_version: string | null;
  summary_text: string | null;
  summary_source_was_mock: boolean | null;
  summary_provider: "anthropic" | "groq" | null;
  issued_at: string;
  frozen: boolean;
  created_at: string;
  updated_at: string;
}

export type RunStatus = "running" | "completed" | "stopped" | "failed";

export interface RamanAgentRunRow {
  id: string;
  engagement_id: string;
  goal: RamanFixGoal;
  status: RunStatus;
  stop_requested: boolean;
  stop_reason: string | null;
  error_message: string | null;
  model: string | null;
  source_was_mock: boolean;
  ranked_options: RamanRankedOption[] | null;
  recommended_design: RamanDesignChanges | null;
  locked_design: RamanDesignChanges | null;
  locked_result: RamanEvaluateResult | null;
  started_at: string;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RamanAgentStepRow {
  id: string;
  run_id: string;
  iteration: number;
  reasoning: string | null;
  action: RamanDesignChanges | null;
  result: RamanEvaluateResult | null;
  predicted_dba: number | null;
  delta_db: number | null;
  tradeoffs: RamanTradeoffs | null;
  feasible: boolean | null;
  model: string | null;
  created_at: string;
}

export interface RamanPropellerRow {
  id: string;
  brand: string;
  model: string;
  diameter_in: number | null;
  pitch_in: number | null;
  blade_count: number | null;
  chord_075_over_r: number | null;
  geometry: Row | null;
  performance: Row | null;
  source_url: string | null;
  status: "unverified" | "verified" | "rejected";
  verified_by: string | null;
  verified_at: string | null;
  loaded_via: "manual" | "llm";
  created_at: string;
  updated_at: string;
}

export interface RamanReportRow {
  id: string;
  engagement_id: string;
  type: "check" | "final" | "certificate";
  certificate_code: string | null;
  storage_path: string | null;
  issued_at: string;
  issued_by: string | null;
  created_at: string;
}

export interface RamanPaymentRow {
  id: string;
  engagement_id: string;
  stage: 1 | 2;
  amount_inr: number | null;
  status: PaymentStatus;
  reference: string | null;
}

// ── Mission Hub users (read for the admin check in the pipeline) ─────────

export async function getMissionHubUser(userId: string): Promise<{ role: string; status: string; full_name: string | null } | null> {
  const data = check<Row[] | null>(
    await db.from("mission_hub_users").select("role, status, full_name").eq("id", userId).limit(1),
    "read Mission Hub user",
  );
  return (data?.[0] as { role: string; status: string; full_name: string | null } | undefined) ?? null;
}

// ── Customers ────────────────────────────────────────────────────────────

// Customers with their vehicles and each vehicle's engagements (cycle,
// furthest tab, status) -- enough for the customer list to open a vehicle's
// latest engagement without another round trip.
export async function listCustomers(q?: string) {
  let query = db
    .from("raman_customers")
    .select(
      "*, raman_vehicles(id, name, vehicle_type, layout, created_at, raman_engagements(id, cycle, status, furthest_tab, before_dba, after_dba, created_at))",
    )
    .order("created_at", { ascending: false })
    .limit(200);
  const search = cleanSearch(q);
  if (search) query = query.or(`name.ilike.%${search}%,company.ilike.%${search}%,email.ilike.%${search}%`);
  return check<Row[] | null>(await query, "list customers") ?? [];
}

export async function getCustomer(id: string): Promise<RamanCustomerRow | null> {
  const data = check<Row[] | null>(await db.from("raman_customers").select("*").eq("id", id).limit(1), "read customer");
  return (data?.[0] as unknown as RamanCustomerRow) ?? null;
}

export async function insertCustomer(row: Partial<RamanCustomerRow>): Promise<RamanCustomerRow> {
  const data = check<Row[] | null>(await db.from("raman_customers").insert(row).select("*").limit(1), "create customer");
  return data![0] as unknown as RamanCustomerRow;
}

// ── Vehicles ─────────────────────────────────────────────────────────────

export async function listVehicles(opts: { customerId?: string; q?: string }): Promise<RamanVehicleRow[]> {
  let query = db.from("raman_vehicles").select("*").order("created_at", { ascending: false }).limit(200);
  if (opts.customerId) query = query.eq("customer_id", opts.customerId);
  const search = cleanSearch(opts.q);
  if (search) query = query.ilike("name", `%${search}%`);
  return (check<Row[] | null>(await query, "list vehicles") ?? []) as unknown as RamanVehicleRow[];
}

export async function getVehicle(id: string): Promise<RamanVehicleRow | null> {
  const data = check<Row[] | null>(await db.from("raman_vehicles").select("*").eq("id", id).limit(1), "read vehicle");
  return (data?.[0] as unknown as RamanVehicleRow) ?? null;
}

export async function insertVehicle(row: Partial<RamanVehicleRow>): Promise<RamanVehicleRow> {
  const data = check<Row[] | null>(await db.from("raman_vehicles").insert(row).select("*").limit(1), "create vehicle");
  return data![0] as unknown as RamanVehicleRow;
}

// ── Engagements ──────────────────────────────────────────────────────────

export async function listEngagementsForVehicle(vehicleId: string): Promise<RamanEngagementRow[]> {
  return (check<Row[] | null>(
    await db.from("raman_engagements").select("*").eq("vehicle_id", vehicleId).order("cycle", { ascending: true }),
    "list engagements",
  ) ?? []) as unknown as RamanEngagementRow[];
}

export async function getEngagement(id: string): Promise<RamanEngagementRow | null> {
  const data = check<Row[] | null>(await db.from("raman_engagements").select("*").eq("id", id).limit(1), "read engagement");
  return (data?.[0] as unknown as RamanEngagementRow) ?? null;
}

export async function insertEngagement(row: Partial<RamanEngagementRow>): Promise<RamanEngagementRow> {
  const data = check<Row[] | null>(await db.from("raman_engagements").insert(row).select("*").limit(1), "create engagement");
  return data![0] as unknown as RamanEngagementRow;
}

export async function updateEngagement(id: string, patch: Partial<RamanEngagementRow>): Promise<RamanEngagementRow> {
  const data = check<Row[] | null>(
    await db.from("raman_engagements").update(patch).eq("id", id).select("*").limit(1),
    "update engagement",
  );
  return data![0] as unknown as RamanEngagementRow;
}

// ── Noise checks ─────────────────────────────────────────────────────────

export async function listNoiseChecks(engagementId: string): Promise<RamanNoiseCheckRow[]> {
  return (check<Row[] | null>(
    await db.from("raman_noise_checks").select("*").eq("engagement_id", engagementId).order("issued_at", { ascending: true }),
    "list noise checks",
  ) ?? []) as unknown as RamanNoiseCheckRow[];
}

export async function insertNoiseCheck(row: Partial<RamanNoiseCheckRow>): Promise<RamanNoiseCheckRow> {
  const data = check<Row[] | null>(await db.from("raman_noise_checks").insert(row).select("*").limit(1), "save noise check");
  return data![0] as unknown as RamanNoiseCheckRow;
}

export async function freezeNoiseChecks(engagementId: string): Promise<void> {
  check(await db.from("raman_noise_checks").update({ frozen: true }).eq("engagement_id", engagementId), "freeze noise checks");
}

// ── Agent runs and steps ─────────────────────────────────────────────────

export async function listRuns(engagementId: string): Promise<RamanAgentRunRow[]> {
  return (check<Row[] | null>(
    await db.from("raman_agent_runs").select("*").eq("engagement_id", engagementId).order("started_at", { ascending: true }),
    "list agent runs",
  ) ?? []) as unknown as RamanAgentRunRow[];
}

export async function getRun(id: string): Promise<RamanAgentRunRow | null> {
  const data = check<Row[] | null>(await db.from("raman_agent_runs").select("*").eq("id", id).limit(1), "read agent run");
  return (data?.[0] as unknown as RamanAgentRunRow) ?? null;
}

export async function insertRun(row: Partial<RamanAgentRunRow>): Promise<RamanAgentRunRow> {
  const data = check<Row[] | null>(await db.from("raman_agent_runs").insert(row).select("*").limit(1), "start agent run");
  return data![0] as unknown as RamanAgentRunRow;
}

export async function updateRun(id: string, patch: Partial<RamanAgentRunRow>): Promise<RamanAgentRunRow> {
  const data = check<Row[] | null>(
    await db.from("raman_agent_runs").update(patch).eq("id", id).select("*").limit(1),
    "update agent run",
  );
  return data![0] as unknown as RamanAgentRunRow;
}

export async function listSteps(runId: string, afterIteration = 0): Promise<RamanAgentStepRow[]> {
  return (check<Row[] | null>(
    await db
      .from("raman_agent_steps")
      .select("*")
      .eq("run_id", runId)
      .gt("iteration", afterIteration)
      .order("iteration", { ascending: true }),
    "list agent steps",
  ) ?? []) as unknown as RamanAgentStepRow[];
}

export async function insertStep(row: Partial<RamanAgentStepRow>): Promise<RamanAgentStepRow> {
  const data = check<Row[] | null>(await db.from("raman_agent_steps").insert(row).select("*").limit(1), "save agent step");
  return data![0] as unknown as RamanAgentStepRow;
}

// ── Propellers ───────────────────────────────────────────────────────────

export async function listPropellers(opts: { q?: string; status?: string }): Promise<RamanPropellerRow[]> {
  let query = db.from("raman_propellers").select("*").order("brand").order("model").limit(500);
  if (opts.status) query = query.eq("status", opts.status);
  const search = cleanSearch(opts.q);
  if (search) query = query.or(`brand.ilike.%${search}%,model.ilike.%${search}%`);
  return (check<Row[] | null>(await query, "list propellers") ?? []) as unknown as RamanPropellerRow[];
}

export async function insertPropellers(rows: Partial<RamanPropellerRow>[]): Promise<RamanPropellerRow[]> {
  if (rows.length === 0) return [];
  return (check<Row[] | null>(await db.from("raman_propellers").insert(rows).select("*"), "save propellers") ??
    []) as unknown as RamanPropellerRow[];
}

export async function updatePropeller(id: string, patch: Partial<RamanPropellerRow>): Promise<RamanPropellerRow | null> {
  const data = check<Row[] | null>(
    await db.from("raman_propellers").update(patch).eq("id", id).select("*").limit(1),
    "update propeller",
  );
  return (data?.[0] as unknown as RamanPropellerRow) ?? null;
}

// ── Reports and payments ─────────────────────────────────────────────────

export async function listReports(engagementId: string): Promise<RamanReportRow[]> {
  return (check<Row[] | null>(
    await db.from("raman_reports").select("*").eq("engagement_id", engagementId).order("issued_at", { ascending: true }),
    "list reports",
  ) ?? []) as unknown as RamanReportRow[];
}

export async function getReportByCode(code: string): Promise<RamanReportRow | null> {
  const data = check<Row[] | null>(
    await db.from("raman_reports").select("*").eq("certificate_code", code).limit(1),
    "read certificate",
  );
  return (data?.[0] as unknown as RamanReportRow) ?? null;
}

// certificate_code is filled by the raman_reports_certificate_code trigger.
export async function insertReport(row: Partial<RamanReportRow>): Promise<RamanReportRow> {
  const data = check<Row[] | null>(await db.from("raman_reports").insert(row).select("*").limit(1), "create report");
  return data![0] as unknown as RamanReportRow;
}

export async function listPayments(engagementId: string): Promise<RamanPaymentRow[]> {
  return (check<Row[] | null>(
    await db.from("raman_payments").select("*").eq("engagement_id", engagementId).order("stage"),
    "list payments",
  ) ?? []) as unknown as RamanPaymentRow[];
}

export async function upsertPayment(row: Partial<RamanPaymentRow>): Promise<RamanPaymentRow> {
  const data = check<Row[] | null>(
    await db.from("raman_payments").upsert(row, { onConflict: "engagement_id,stage" }).select("*").limit(1),
    "save payment",
  );
  return data![0] as unknown as RamanPaymentRow;
}
