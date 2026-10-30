import type Anthropic from "@anthropic-ai/sdk";
import {
  callClaude,
  claudeText,
  llmProviderOrder,
  startAgentTurn,
  stripJsonFences,
  type LlmProvider,
} from "@/lib/the-hangar/llmGateway";
import { callRamanEngine, RamanInputError } from "./ramanEngineClient";
import { advanceFixRun, initialRunMode, type StepOutcome } from "./ramanAgentLoop";
import * as store from "./ramanPersistence";
import type {
  RamanDesignChanges,
  RamanEvaluateResult,
  RamanFixGoal,
  RamanInputs,
  RamanLeverRangesResult,
  RamanNoiseCheckResult,
} from "./ramanTypes";

// Raman Agent (Bay 16) orchestration -- what each /api/hangar/raman/* route
// does, plus the Mission Hub admin assertion (assertRamanAdmin). Every
// number comes from the engine (ramanEngineClient.ts); the LLM writes only
// the Noise Check summary and the Noise Fix decisions (ramanAgentLoop.ts),
// using the Mission Hub AI Providers order like Bay 01, plus propeller
// research (Claude only: it needs Anthropic's web search). Each is flagged
// with the provider that wrote it so the UI can tag it.
//
// Frozen rule: a Noise Check is issued frozen. Anything that would change a
// frozen check, or any write to a closed engagement, is refused with 409 --
// changing inputs means a new engagement cycle.

export class RamanForbiddenError extends Error {}
export class RamanNotFoundError extends Error {}
export class RamanConflictError extends Error {}
export { RamanInputError };

const UUID_RE = /^[0-9a-f-]{36}$/i;

function requireId(id: unknown, what: string): string {
  const s = String(id ?? "");
  if (!UUID_RE.test(s)) throw new RamanInputError(`Unknown ${what}.`);
  return s;
}

function text(v: unknown, max: number): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s ? s.slice(0, max) : null;
}

function num(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
}

// ── Admin ────────────────────────────────────────────────────────────────

// Same gate as the rest of Mission Hub: an active admin or super_admin row
// in mission_hub_users (and the same check as public.raman_is_admin()).
export async function assertRamanAdmin(userId: string): Promise<{ role: string; full_name: string | null }> {
  const user = await store.getMissionHubUser(userId);
  if (!user || user.status !== "active" || (user.role !== "admin" && user.role !== "super_admin")) {
    throw new RamanForbiddenError("Only Mission Hub admins can use Raman.");
  }
  return user;
}

// ── Loading helpers ──────────────────────────────────────────────────────

async function loadEngagement(id: unknown): Promise<store.RamanEngagementRow> {
  const engagement = await store.getEngagement(requireId(id, "engagement"));
  if (!engagement) throw new RamanNotFoundError("Engagement not found.");
  return engagement;
}

function assertOpen(engagement: store.RamanEngagementRow): void {
  if (engagement.status === "closed") {
    throw new RamanConflictError("This engagement is closed and frozen. Start a new cycle to make changes.");
  }
}

async function latestCheck(engagementId: string, kind: "baseline" | "fix_prediction"): Promise<store.RamanNoiseCheckRow | null> {
  const checks = await store.listNoiseChecks(engagementId);
  return checks.filter((c) => c.kind === kind).at(-1) ?? null;
}

async function requireBaseline(engagementId: string): Promise<store.RamanNoiseCheckRow> {
  const baseline = await latestCheck(engagementId, "baseline");
  if (!baseline) throw new RamanConflictError("Run the Noise Check (Tab 1) first.");
  return baseline;
}

async function loadRun(id: unknown): Promise<store.RamanAgentRunRow> {
  const run = await store.getRun(requireId(id, "run"));
  if (!run) throw new RamanNotFoundError("Noise Fix run not found.");
  return run;
}

// ── Customers and vehicles ───────────────────────────────────────────────

export function listCustomers(q?: string) {
  return store.listCustomers(q);
}

export async function createCustomer(body: Record<string, unknown>, userId: string) {
  const name = text(body.name, 200);
  if (!name) throw new RamanInputError("Customer name is required.", [{ field: "name", message: "is required" }]);
  return store.insertCustomer({
    name,
    company: text(body.company, 200),
    email: text(body.email, 320),
    phone: text(body.phone, 50),
    notes: text(body.notes, 4000),
    created_by: userId,
  });
}

export function listVehicles(opts: { customerId?: string; q?: string }) {
  return store.listVehicles({ customerId: opts.customerId ? requireId(opts.customerId, "customer") : undefined, q: opts.q });
}

const VEHICLE_TYPES = ["multirotor", "vtol", "fixed_wing"] as const;

export async function createVehicle(body: Record<string, unknown>) {
  const customerId = requireId(body.customer_id, "customer");
  if (!(await store.getCustomer(customerId))) throw new RamanNotFoundError("Customer not found.");
  const name = text(body.name, 200);
  if (!name) throw new RamanInputError("Vehicle name is required.", [{ field: "name", message: "is required" }]);
  const type = String(body.vehicle_type ?? "multirotor");
  if (!(VEHICLE_TYPES as readonly string[]).includes(type)) {
    throw new RamanInputError("Unknown vehicle type.", [{ field: "vehicle_type", message: "must be multirotor, vtol or fixed_wing" }]);
  }
  return store.insertVehicle({
    customer_id: customerId,
    name,
    vehicle_type: type as store.RamanVehicleRow["vehicle_type"],
    layout: text(body.layout, 100),
    notes: text(body.notes, 4000),
  });
}

// ── Engagements ──────────────────────────────────────────────────────────

// A new cycle for a vehicle: cycle = max + 1, starting at Tab 1.
export async function startEngagement(vehicleIdRaw: unknown) {
  const vehicleId = requireId(vehicleIdRaw, "vehicle");
  if (!(await store.getVehicle(vehicleId))) throw new RamanNotFoundError("Vehicle not found.");
  const existing = await store.listEngagementsForVehicle(vehicleId);
  const cycle = existing.reduce((m, e) => Math.max(m, e.cycle), 0) + 1;
  return store.insertEngagement({ vehicle_id: vehicleId, cycle, status: "open", furthest_tab: 1 });
}

// Everything the workspace needs for one engagement: which tab to open
// (furthest_tab), the checks, runs, reports, payments, and the vehicle's
// cycle history for the history drawer.
export async function getEngagementBundle(id: unknown) {
  const engagement = await loadEngagement(id);
  const vehicle = await store.getVehicle(engagement.vehicle_id);
  const [customer, checks, runs, reports, payments, history] = await Promise.all([
    vehicle ? store.getCustomer(vehicle.customer_id) : Promise.resolve(null),
    store.listNoiseChecks(engagement.id),
    store.listRuns(engagement.id),
    store.listReports(engagement.id),
    store.listPayments(engagement.id),
    store.listEngagementsForVehicle(engagement.vehicle_id),
  ]);
  return {
    engagement,
    vehicle,
    customer,
    baseline: checks.filter((c) => c.kind === "baseline").at(-1) ?? null,
    fix_prediction: checks.filter((c) => c.kind === "fix_prediction").at(-1) ?? null,
    runs,
    reports,
    payments,
    history: history.map((e) => ({
      id: e.id,
      cycle: e.cycle,
      created_at: e.created_at,
      before_dba: e.before_dba,
      after_dba: e.after_dba,
      reduction_db: e.before_dba !== null && e.after_dba !== null ? Math.round((e.before_dba - e.after_dba) * 10) / 10 : null,
      status: e.status,
    })),
  };
}

export async function closeEngagement(id: unknown) {
  const engagement = await loadEngagement(id);
  assertOpen(engagement);
  await store.freezeNoiseChecks(engagement.id);
  return store.updateEngagement(engagement.id, { status: "closed", closed_at: new Date().toISOString() });
}

// ── Noise Check (Tabs 1-2) ───────────────────────────────────────────────

const INPUT_KEYS: (keyof RamanInputs)[] = [
  "take_off_mass_kg", "rotor_count", "prop_diameter", "prop_diameter_unit", "blade_count", "motor_kv",
  "battery_voltage", "battery_cells", "cruise_speed", "cruise_speed_unit", "prop_pitch_in", "hover_rpm",
  "target_dba", "target_distance_m", "environment", "rotor_spacing_m", "arm_clearance_ratio",
  "altitude_agl_m", "temperature_c", "humidity_pct", "chord_075_over_r",
];

// Keeps only the engine's own keys, drops blanks; vehicle_type comes from
// the vehicle record so the engine applies its Spiral 1 multirotor rule.
function engineInputs(raw: unknown, vehicleType: string): RamanInputs {
  const src = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const out: Record<string, unknown> = { vehicle_type: vehicleType };
  for (const k of INPUT_KEYS) {
    const v = src[k];
    if (v === undefined || v === null || v === "") continue;
    out[k] = v;
  }
  return out as unknown as RamanInputs;
}

const SUMMARY_SYSTEM = `You write the plain-language summary for a TorqWings Raman Noise Check report on a multirotor drone.
Rules:
- At most 5 short sentences, plain words a drone operator understands.
- Explain what makes this vehicle as loud as it is: the causes only. Do not suggest fixes, changes or next steps.
- Use only numbers that appear in the data given. Do not calculate, round differently or invent any number.
- Mention that it is an early-stage estimate of about plus or minus 5 dB if you mention accuracy at all.
Return the summary text only.`;

// Summary from the AI Providers order (primary, then secondary), as on Bay 01;
// the provider that answered is stored so the UI tags it "via Claude" or "via Groq".
async function writeSummary(
  result: RamanNoiseCheckResult,
): Promise<{ text: string; mock: boolean; provider: LlmProvider | null }> {
  const data = {
    headline: result.headline,
    verdict: result.verdict,
    target_dba: result.target_dba,
    target_distance_m: result.target_distance_m,
    hover_source_breakdown_pct: result.hover.breakdown_pct,
    tonal_prominent: result.hover.tonal_prominent,
    drivers: result.drivers.map((d) => d.message),
    performance: {
      hover_rpm: result.performance.hover_rpm,
      tip_speed_ms: result.performance.tip_speed_ms,
      tip_mach: result.performance.tip_mach,
      bpf_hz: result.performance.bpf_hz,
      disk_loading_n_m2: result.performance.disk_loading_n_m2,
    },
  };
  const errors: string[] = [];
  for (const provider of await llmProviderOrder()) {
    const res = await startAgentTurn(provider, JSON.stringify(data, null, 1), {
      system: SUMMARY_SYSTEM,
      maxTokens: 2000,
      effort: "low",
      timeoutMs: 30_000,
    });
    if (res.ok && res.text) return { text: res.text, mock: false, provider };
    errors.push(`${provider}: ${res.ok ? "empty reply" : res.error}`);
  }
  // Loud fallback: the engine's own driver sentences, flagged as mock.
  console.error(`[raman] Noise Check summary fell back to engine text: ${errors.join("; ")}`);
  return { text: [result.headline + ".", ...result.drivers.map((d) => d.message)].join(" "), mock: true, provider: null };
}

// The ranges raman_engine.py's resolve_inputs accepts for optional inputs.
// Outside them the engine silently uses its default and tags it "assumed",
// so the customer's number would be ignored -- reject it here instead.
const OPTIONAL_RANGES: Partial<Record<keyof RamanInputs, [number, number]>> = {
  temperature_c: [-30, 55],
  humidity_pct: [5, 100],
  arm_clearance_ratio: [0.01, 1],
  rotor_spacing_m: [0, 10],
  altitude_agl_m: [2, 500],
  chord_075_over_r: [0.04, 0.35],
};
const HOVER_RPM_MAX_RATIO = 2;

async function checkOptionalInputs(inputs: RamanInputs): Promise<void> {
  const fields: { field: string; message: string }[] = [];
  for (const [key, [lo, hi]] of Object.entries(OPTIONAL_RANGES) as [keyof RamanInputs, [number, number]][]) {
    const v = inputs[key];
    if (v === undefined) continue;
    const n = Number(v);
    if (!Number.isFinite(n) || n < lo || n > hi) fields.push({ field: key, message: `must be between ${lo} and ${hi}` });
  }
  for (const key of ["prop_pitch_in", "hover_rpm", "target_distance_m"] as const) {
    const v = inputs[key];
    if (v !== undefined && !(Number(v) > 0)) fields.push({ field: key, message: "must be a positive number" });
  }
  if (fields.length) throw new RamanInputError("Some optional inputs are outside the range Raman can use.", fields);

  // A typed hover RPM must be able to lift the vehicle: compare it with the
  // RPM the engine derives from thrust = weight for the same vehicle.
  if (inputs.hover_rpm !== undefined) {
    const { hover_rpm: given, ...rest } = inputs;
    const derived = (await callRamanEngine("noise_check", rest)).performance.hover_rpm;
    const ratio = Number(given) / derived;
    if (ratio < 1 / HOVER_RPM_MAX_RATIO || ratio > HOVER_RPM_MAX_RATIO) {
      throw new RamanInputError("Hover RPM doesn't match this vehicle.", [
        {
          field: "hover_rpm",
          message: `of ${given} rpm can't hover this vehicle -- the engine needs about ${derived} rpm for this mass and propeller. Check the value or leave it blank.`,
        },
      ]);
    }
  }
}

export async function runNoiseCheck(body: Record<string, unknown>) {
  const engagement = await loadEngagement(body.engagement_id);
  assertOpen(engagement);
  if (await latestCheck(engagement.id, "baseline")) {
    throw new RamanConflictError("This cycle's Noise Check is already issued and frozen. Start a new cycle to change the inputs.");
  }
  const vehicle = await store.getVehicle(engagement.vehicle_id);
  if (!vehicle) throw new RamanNotFoundError("Vehicle not found.");

  const inputs = engineInputs(body.inputs, vehicle.vehicle_type);
  await checkOptionalInputs(inputs);
  const result = await callRamanEngine("noise_check", inputs);
  const summary = await writeSummary(result);

  const check = await store.insertNoiseCheck({
    engagement_id: engagement.id,
    kind: "baseline",
    inputs,
    provenance: result.provenance,
    result,
    verdict: result.verdict,
    headline: result.headline,
    hover_dba: result.hover.lamax_dba,
    confidence_score: result.confidence_score,
    engine_version: result.engine_version,
    summary_text: summary.text,
    summary_source_was_mock: summary.mock,
    summary_provider: summary.provider,
    frozen: true,
  });
  const updated = await store.updateEngagement(engagement.id, {
    before_dba: result.hover.lamax_dba,
    target_dba: result.target_dba,
    target_distance_m: result.target_distance_m,
    furthest_tab: Math.max(engagement.furthest_tab, 2),
  });
  return { engagement: updated, check };
}

// ── Sliders (Tab 4) ──────────────────────────────────────────────────────

const LEVER_KEYS: (keyof RamanDesignChanges)[] = [
  "prop_diameter_in", "blade_count", "hover_rpm", "tip_speed_ms", "rotor_spacing_m", "arm_clearance_ratio",
];

function cleanChanges(raw: unknown): RamanDesignChanges {
  const src = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const out: RamanDesignChanges = {};
  for (const k of LEVER_KEYS) {
    const v = num(src[k]);
    if (v !== null) out[k] = k === "blade_count" ? Math.round(v) : v;
  }
  return out;
}

// What-if for the sliders. No persistence.
export async function evaluateDesign(body: Record<string, unknown>): Promise<RamanEvaluateResult> {
  const engagement = await loadEngagement(body.engagement_id);
  const baseline = await requireBaseline(engagement.id);
  return callRamanEngine("evaluate_design", { inputs: baseline.inputs, changes: cleanChanges(body.changes) });
}

export async function leverRanges(engagementId: unknown): Promise<RamanLeverRangesResult> {
  const engagement = await loadEngagement(engagementId);
  const baseline = await requireBaseline(engagement.id);
  return callRamanEngine("lever_ranges", baseline.inputs);
}

// ── Payments (placeholders) ──────────────────────────────────────────────

// Marks Payment 1 or 2 paid/waived. Payment 2 unlocks Tab 3 (Noise Fix).
export async function recordPayment(engagementId: unknown, stageRaw: unknown, body: Record<string, unknown>) {
  const engagement = await loadEngagement(engagementId);
  assertOpen(engagement);
  const stage = Number(stageRaw);
  if (stage !== 1 && stage !== 2) throw new RamanInputError("Payment stage must be 1 or 2.");
  const status = String(body.status ?? "");
  if (status !== "paid" && status !== "waived" && status !== "pending") {
    throw new RamanInputError("Payment status must be paid, waived or pending.");
  }
  if (stage === 2 && status !== "pending") await requireBaseline(engagement.id);

  const payment = await store.upsertPayment({
    engagement_id: engagement.id,
    stage,
    status: status as store.PaymentStatus,
    amount_inr: num(body.amount_inr),
    reference: text(body.reference, 200),
  });
  const unlock = stage === 2 && status !== "pending" ? Math.max(engagement.furthest_tab, 3) : engagement.furthest_tab;
  const updated = await store.updateEngagement(engagement.id, {
    [stage === 1 ? "payment1_status" : "payment2_status"]: status,
    furthest_tab: unlock,
  } as Partial<store.RamanEngagementRow>);
  return { engagement: updated, payment };
}

// ── Noise Fix runs (Tabs 3-4) ────────────────────────────────────────────

export async function startFixRun(body: Record<string, unknown>) {
  const engagement = await loadEngagement(body.engagement_id);
  assertOpen(engagement);
  if (engagement.payment2_status === "pending") {
    throw new RamanConflictError("Noise Fix unlocks after Payment 2. Mark Payment 2 paid or waived first.");
  }
  const baseline = await requireBaseline(engagement.id);
  if (await latestCheck(engagement.id, "fix_prediction")) {
    throw new RamanConflictError("A fix is already locked for this cycle. Start a new cycle to run Noise Fix again.");
  }
  const runs = await store.listRuns(engagement.id);
  if (runs.some((r) => r.status === "running")) throw new RamanConflictError("A Noise Fix run is already in progress.");

  const result = baseline.result as RamanNoiseCheckResult;
  const goalIn = (body.goal && typeof body.goal === "object" ? body.goal : {}) as Record<string, unknown>;
  const target = num(goalIn.target_dba) ?? engagement.target_dba ?? result.target_dba;
  if (target === null) {
    throw new RamanInputError("Noise Fix needs a target dBA.", [{ field: "target_dba", message: "is required for Noise Fix" }]);
  }
  if (result.hover.lamax_dba <= target) {
    throw new RamanConflictError(
      `The vehicle already meets this target: ${result.hover.lamax_dba} dBA at ${result.target_distance_m} m in hover vs a target of ${target} dBA. Set a lower target to look for further reductions.`,
    );
  }
  const ranges = await callRamanEngine("lever_ranges", baseline.inputs);
  const goal: RamanFixGoal = {
    target_dba: target,
    target_distance_m: result.target_distance_m,
    max_added_mass_g: num(goalIn.max_added_mass_g) ?? 150,
    min_flight_time_change_pct: num(goalIn.min_flight_time_change_pct) ?? -10,
    max_iterations: Math.min(8, Math.max(1, Math.round(num(goalIn.max_iterations) ?? 8))),
    lever_ranges: ranges.levers,
  };
  const mode = await initialRunMode();
  const run = await store.insertRun({ engagement_id: engagement.id, goal, status: "running", ...mode });
  if (engagement.furthest_tab < 4) await store.updateEngagement(engagement.id, { furthest_tab: 4 });
  return run;
}

// One iteration of the agent (see ramanAgentLoop.ts).
export async function advanceRun(runId: unknown): Promise<StepOutcome> {
  const run = await loadRun(runId);
  const engagement = await loadEngagement(run.engagement_id);
  assertOpen(engagement);
  return advanceFixRun(run, await requireBaseline(engagement.id));
}

export async function listRunSteps(runId: unknown, after: unknown) {
  const run = await loadRun(runId);
  const steps = await store.listSteps(run.id, Math.max(0, Math.floor(num(after) ?? 0)));
  return { run, steps };
}

export async function requestStop(runId: unknown) {
  const run = await loadRun(runId);
  if (run.status !== "running") return run;
  return store.updateRun(run.id, { stop_requested: true });
}

// The modified vehicle as noise_check inputs, mirroring how the engine's
// evaluate_design builds it: diameter in inches with the pitch ratio kept,
// hover_rpm dropped when diameter or blade count change, and the take-off
// mass the engine computed for the new propellers.
export function modifiedInputs(
  baseline: store.RamanNoiseCheckRow,
  changes: RamanDesignChanges,
  evaluated: RamanEvaluateResult,
): RamanInputs {
  const base = baseline.result as RamanNoiseCheckResult;
  const mod: RamanInputs = { ...(baseline.inputs as RamanInputs), take_off_mass_kg: evaluated.design.take_off_mass_kg };
  if (changes.prop_diameter_in !== undefined) {
    mod.prop_diameter = changes.prop_diameter_in;
    mod.prop_diameter_unit = "in";
    mod.prop_pitch_in = base.inputs_resolved.pitch_ratio * changes.prop_diameter_in;
  }
  if (changes.blade_count !== undefined) mod.blade_count = changes.blade_count;
  if (changes.rotor_spacing_m !== undefined) mod.rotor_spacing_m = changes.rotor_spacing_m;
  if (changes.arm_clearance_ratio !== undefined) mod.arm_clearance_ratio = changes.arm_clearance_ratio;
  if (changes.prop_diameter_in !== undefined || changes.blade_count !== undefined) delete mod.hover_rpm;
  if (changes.hover_rpm !== undefined) mod.hover_rpm = changes.hover_rpm;
  return mod;
}

// Locks the final design: one more engine evaluation of the chosen changes,
// saved as the run's locked design and a frozen fix_prediction check.
export async function lockFixRun(runId: unknown, body: Record<string, unknown>) {
  const run = await loadRun(runId);
  if (run.status === "running") throw new RamanConflictError("Wait for the run to finish (or stop it) before locking a design.");
  if (run.locked_design) throw new RamanConflictError("A design is already locked for this run.");
  const engagement = await loadEngagement(run.engagement_id);
  assertOpen(engagement);
  if (await latestCheck(engagement.id, "fix_prediction")) {
    throw new RamanConflictError("A fix is already locked for this cycle. Start a new cycle to change it.");
  }
  const baseline = await requireBaseline(engagement.id);
  const changes = cleanChanges(body.changes ?? run.recommended_design);
  if (Object.keys(changes).length === 0) throw new RamanInputError("Choose at least one change to lock.");

  const result = await callRamanEngine("evaluate_design", { inputs: baseline.inputs, changes });
  if (!result.feasible) {
    throw new RamanConflictError(`This design isn't feasible: ${result.warnings.join(" ") || "check the warnings"}`);
  }
  // Spec Tab 4: rerun the full Noise Check on the modified design, for the
  // before/after levels table on the final report and certificate.
  const rerun = await callRamanEngine("noise_check", modifiedInputs(baseline, changes, result));
  const updatedRun = await store.updateRun(run.id, { locked_design: changes, locked_result: result });
  const check = await store.insertNoiseCheck({
    engagement_id: engagement.id,
    kind: "fix_prediction",
    inputs: { inputs: baseline.inputs as RamanInputs, changes },
    provenance: rerun.provenance,
    result: { ...result, noise_check: rerun },
    verdict: result.verdict,
    headline: `${result.baseline_dba} to ${result.predicted_dba} dBA at ${result.target_distance_m} m in hover, ${Math.abs(result.delta_db)} dB ${result.delta_db <= 0 ? "quieter" : "louder"} (predicted)`,
    hover_dba: result.predicted_dba,
    confidence_score: baseline.confidence_score,
    engine_version: result.engine_version,
    frozen: true,
  });
  const updatedEngagement = await store.updateEngagement(engagement.id, {
    after_dba: result.predicted_dba,
    furthest_tab: 5,
  });
  return { run: updatedRun, check, engagement: updatedEngagement };
}

// ── Reports and certificates (Tab 5) ─────────────────────────────────────

const REPORT_TYPES = ["check", "final", "certificate"] as const;

// Creates the report row (certificate code from the DB trigger) and returns
// everything the PDF needs. The PDF itself is drawn in the browser.
export async function createReport(engagementId: unknown, typeRaw: unknown, userId: string) {
  const type = String(typeRaw);
  if (!(REPORT_TYPES as readonly string[]).includes(type)) throw new RamanInputError("Report type must be check, final or certificate.");
  const bundle = await getEngagementBundle(engagementId);
  if (!bundle.baseline) throw new RamanConflictError("Run the Noise Check first.");
  if (type !== "check" && !bundle.fix_prediction) throw new RamanConflictError("Lock a fix design (Tab 4) before issuing the final report or certificate.");

  const report = await store.insertReport({
    engagement_id: bundle.engagement.id,
    type: type as store.RamanReportRow["type"],
    issued_by: userId,
  });
  const issuer = await store.getMissionHubUser(userId);
  const lockedRun = bundle.runs.filter((r) => r.locked_design).at(-1) ?? null;
  return { report, issued_by_name: issuer?.full_name ?? null, ...bundle, locked_run: lockedRun };
}

// Certificate lookup for the QR code (admin-only in the beta).
export async function verifyCertificate(codeRaw: unknown) {
  const code = String(codeRaw ?? "").trim().toUpperCase();
  if (!/^RNC-\d{4}-\d{4,}$/.test(code)) throw new RamanInputError("That isn't a Raman certificate ID.");
  const report = await store.getReportByCode(code);
  if (!report) throw new RamanNotFoundError(`No certificate ${code} in the database.`);
  const bundle = await getEngagementBundle(report.engagement_id);
  return {
    report,
    customer: bundle.customer ? { name: bundle.customer.name, company: bundle.customer.company } : null,
    vehicle: bundle.vehicle ? { name: bundle.vehicle.name, vehicle_type: bundle.vehicle.vehicle_type } : null,
    cycle: bundle.engagement.cycle,
    before_dba: bundle.engagement.before_dba,
    after_dba: bundle.engagement.after_dba,
    target_distance_m: bundle.engagement.target_distance_m,
    status: bundle.engagement.status,
  };
}

// ── Propeller DB ─────────────────────────────────────────────────────────

const PROP_STATUSES = ["unverified", "verified", "rejected"] as const;

export function listPropellers(opts: { q?: string; status?: string }) {
  const status = opts.status && (PROP_STATUSES as readonly string[]).includes(opts.status) ? opts.status : undefined;
  return store.listPropellers({ q: opts.q, status });
}

function propellerFields(body: Record<string, unknown>): Partial<store.RamanPropellerRow> {
  const out: Partial<store.RamanPropellerRow> = {};
  if ("brand" in body) out.brand = text(body.brand, 100) ?? "";
  if ("model" in body) out.model = text(body.model, 100) ?? "";
  if ("diameter_in" in body) out.diameter_in = num(body.diameter_in);
  if ("pitch_in" in body) out.pitch_in = num(body.pitch_in);
  if ("blade_count" in body) out.blade_count = num(body.blade_count);
  if ("chord_075_over_r" in body) out.chord_075_over_r = num(body.chord_075_over_r);
  if ("source_url" in body) out.source_url = text(body.source_url, 1000);
  if ("geometry" in body && body.geometry && typeof body.geometry === "object") out.geometry = body.geometry as Record<string, unknown>;
  if ("performance" in body && body.performance && typeof body.performance === "object") out.performance = body.performance as Record<string, unknown>;
  return out;
}

// POST without id creates a manual entry; with id edits it. status
// verified/rejected records who decided and when.
export async function savePropeller(body: Record<string, unknown>, userId: string) {
  const fields = propellerFields(body);
  if (body.status !== undefined) {
    const status = String(body.status);
    if (!(PROP_STATUSES as readonly string[]).includes(status)) throw new RamanInputError("Unknown propeller status.");
    fields.status = status as store.RamanPropellerRow["status"];
    fields.verified_by = status === "unverified" ? null : userId;
    fields.verified_at = status === "unverified" ? null : new Date().toISOString();
  }
  if (body.id) {
    const updated = await store.updatePropeller(requireId(body.id, "propeller"), fields);
    if (!updated) throw new RamanNotFoundError("Propeller not found.");
    return updated;
  }
  if (!fields.brand || !fields.model) throw new RamanInputError("Brand and model are required.");
  return (await store.insertPropellers([{ ...fields, loaded_via: "manual" }]))[0];
}

const PROP_RESEARCH_SYSTEM = `You research drone propeller specifications for TorqWings' propeller database.
Use web search to find manufacturer or retailer pages for the propellers asked about.
Return ONLY a JSON array (no prose, no code fences). Each item:
{"brand": string, "model": string, "diameter_in": number|null, "pitch_in": number|null, "blade_count": number|null, "chord_075_over_r": number|null, "source_url": string, "notes": string}
Rules:
- Every value must come from a page you found; use null when a page doesn't state it. Never estimate.
- source_url must be the exact URL of the page the values came from.
- At most 10 items.`;

// Load: Claude researches specs with web search; rows are saved unverified
// and only kept when their source_url is a page the search actually returned.
export async function loadPropellers(body: Record<string, unknown>) {
  const query = text(body.query, 300);
  if (!query) throw new RamanInputError("Say which propellers to look up.", [{ field: "query", message: "is required" }]);

  const messages: Anthropic.MessageParam[] = [{ role: "user", content: `Find specifications for: ${query}` }];
  const tools: Anthropic.ToolUnion[] = [{ type: "web_search_20260209", name: "web_search", max_uses: 6 }];
  const seenUrls = new Set<string>();
  let reply = "";
  for (let round = 0; round < 3; round++) {
    const res = await callClaude({ system: PROP_RESEARCH_SYSTEM, messages, tools, maxTokens: 16000, effort: "medium", timeoutMs: 120_000 });
    if (!res.ok) throw new Error(`Propeller research failed: ${res.error}`);
    for (const block of res.message.content) {
      if (block.type === "web_search_tool_result" && Array.isArray(block.content)) {
        for (const r of block.content) if (r.type === "web_search_result") seenUrls.add(r.url);
      }
    }
    if (res.message.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: res.message.content });
      continue;
    }
    reply = claudeText(res.message);
    break;
  }

  let items: unknown;
  try {
    const start = reply.indexOf("[");
    items = JSON.parse(stripJsonFences(start >= 0 ? reply.slice(start, reply.lastIndexOf("]") + 1) : reply));
  } catch {
    throw new Error("Propeller research didn't return a JSON list.");
  }
  if (!Array.isArray(items)) throw new Error("Propeller research didn't return a JSON list.");

  const rows: Partial<store.RamanPropellerRow>[] = [];
  const skipped: string[] = [];
  for (const raw of items.slice(0, 10)) {
    const item = raw as Record<string, unknown>;
    const fields = propellerFields(item);
    const url = fields.source_url ?? "";
    if (!fields.brand || !fields.model) continue;
    if (!seenUrls.has(url)) {
      skipped.push(`${fields.brand} ${fields.model} (source not from search results)`);
      continue;
    }
    rows.push({ ...fields, geometry: item.notes ? { notes: String(item.notes).slice(0, 1000) } : null, status: "unverified", loaded_via: "llm" });
  }
  const saved = await store.insertPropellers(rows);
  return { saved, skipped, source_was_mock: false, via: "Claude" };
}
