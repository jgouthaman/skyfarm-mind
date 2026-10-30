import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Bernoulli check registry (Hangar_BernoulliRules, see
// 20261030000000_hangar_bernoulli_rules.sql and
// 20261030020000_hangar_bernoulli_rule_editor.sql): which checks run for
// each calling bay, their type, category, hard gate and maximum result.
// Managed from Mission Hub -> Agents -> Bernoulli. Server-only.
//
// Built-in rules map to code in bernoulliChecks.ts by ruleId; custom rules
// are TorqWings AI checks defined by an instruction. If the table can't be
// read every caller falls back to DEFAULT_BERNOULLI_RULES, so a review never
// breaks over the registry.

export type BernoulliRuleBay = "mission" | "concept" | "vehicle_design";
export type BernoulliRuleKind = "rule" | "llm";
export type BernoulliRuleCategory = "physics" | "regulatory" | "data_quality" | "consistency";
export type BernoulliMaxSeverity = "FAIL" | "WARN";

export const RULE_CATEGORIES: BernoulliRuleCategory[] = ["physics", "regulatory", "data_quality", "consistency"];

// Bays Bernoulli is actually wired into -- rules for any other bay would
// never run, so the admin page doesn't allow adding them.
export const WIRED_BERNOULLI_BAYS: BernoulliRuleBay[] = ["mission", "concept", "vehicle_design"];

// Form limits (rule editor spec §1).
export const RULE_LIMITS = { name: 60, description: 140, instruction: 1500 } as const;

export interface BernoulliRuleDef {
  ruleId: string;
  bay: string;
  name: string;
  description: string;
  kind: BernoulliRuleKind;
  category: BernoulliRuleCategory;
  hardGate: boolean;
  maxSeverity: BernoulliMaxSeverity;
  enabled: boolean;
  builtin: boolean;
  instruction: string | null;
  sortOrder: number;
  version: number;
  updatedAt: string | null;
  updatedBy: string | null;
}

const builtin = (
  ruleId: string,
  bay: BernoulliRuleBay,
  name: string,
  description: string,
  kind: BernoulliRuleKind,
  category: BernoulliRuleCategory,
  hardGate: boolean,
  sortOrder: number,
): BernoulliRuleDef => ({
  ruleId,
  bay,
  name,
  description,
  kind,
  category,
  hardGate,
  maxSeverity: "FAIL",
  enabled: true,
  builtin: true,
  instruction: null,
  sortOrder,
  version: 1,
  updatedAt: null,
  updatedBy: null,
});

// Same rows the migrations seed -- the fallback when the table isn't there.
export const DEFAULT_BERNOULLI_RULES: BernoulliRuleDef[] = [
  builtin("BERN-M01", "mission", "Speed Consistency", "Range ÷ Endurance implies an average speed -- flagged if implausible for the vehicle class.", "rule", "physics", true, 10),
  builtin("BERN-M02", "mission", "Coverage Math", "For multi-unit/swarm specs: units × per-unit coverage angle should reach 360°.", "rule", "consistency", false, 20),
  builtin("BERN-M03", "mission", "Payload/Endurance Plausibility", "TorqWings AI-judged: is this payload/endurance combination realistic for this vehicle class?", "llm", "physics", false, 30),
  builtin("BERN-M04", "mission", "KPI/Constraint Provenance", "Does every constraint cite a source, or are some untagged?", "rule", "data_quality", false, 40),
  builtin("BERN-M05", "mission", "Dimensional Consistency", 'Do KPI units actually match what their names imply (e.g. "Range" isn\'t given in kg)?', "rule", "data_quality", true, 50),
  builtin("BERN-M06", "mission", "Energy/Power Budget Plausibility", "TorqWings AI-judged, grounded in reference ranges: could a battery/fuel load that fits this vehicle class actually deliver this payload+endurance?", "llm", "physics", false, 60),
  builtin("BERN-M07", "mission", "Payload vs MTOW", "The payload KPI must fit inside the spec's maximum takeoff weight constraint -- payload can't exceed MTOW.", "rule", "physics", true, 70),
  builtin("BERN-C01", "concept", "Vehicle-Class Consistency", "Do the concepts stay within the vehicle class the mission spec calls for?", "rule", "consistency", false, 10),
  builtin("BERN-C02", "concept", "Speed Feasibility per Concept", "Can each concept's vehicle class fly the average speed the mission's range ÷ endurance needs?", "rule", "physics", true, 20),
  builtin("BERN-C03", "concept", "Ranking Coherence", 'Is the ranking consistent with constraint fit, and is any "pass" contradicted by the physics?', "rule", "consistency", false, 30),
  builtin("BERN-C04", "concept", "Physical Feasibility per Concept", "TorqWings AI-judged, grounded in reference ranges: can each concept physically carry the payload for the required endurance?", "llm", "physics", false, 40),
  builtin("BERN-V01", "vehicle_design", "Mass Closure", "The component masses must add up to the stated MTOW, and the battery mass must agree everywhere it appears.", "rule", "physics", true, 10),
  builtin("BERN-V02", "vehicle_design", "Balance Closure", "The mass-weighted CG of the components must match the stated CG, with every component inside the airframe.", "rule", "consistency", false, 20),
  builtin("BERN-V03", "vehicle_design", "Stability & Trim", "CG inside its allowed range, a positive static margin that matches NP and CG, stable in all axes and trimmable.", "rule", "physics", true, 30),
  builtin("BERN-V04", "vehicle_design", "Lift & Stall Consistency", "Stall speed and cruise lift coefficient recomputed from weight, wing area and CL max must match the stated values.", "rule", "physics", false, 40),
  builtin("BERN-V05", "vehicle_design", "Energy Budget", "Usable battery energy must cover the mission energy with at least the required reserve, and the budget must add up.", "rule", "physics", true, 50),
  builtin("BERN-V06", "vehicle_design", "Performance Closure", "Range must follow from cruise speed x endurance, and endurance from usable energy / cruise power.", "rule", "consistency", false, 60),
  builtin("BERN-V07", "vehicle_design", "Requirements & Limits", "The design must meet every mission requirement and constraint: MTOW and span limits, endurance, range and payload.", "rule", "regulatory", true, 70),
  builtin("BERN-V08", "vehicle_design", "Electrical Consistency", "Bus voltage must match the battery, and the ESC and battery current ratings must cover the cruise draw with margin.", "rule", "consistency", false, 80),
  builtin("BERN-V09", "vehicle_design", "Engineering Plausibility", "TorqWings AI-judged, grounded in reference ranges: are the sizing and the selected motor, propeller, ESC and battery realistic for this mission?", "llm", "physics", false, 90),
];

type DbResult<T> = Promise<{ data: T; error: { message: string } | null }>;
type Row = Record<string, unknown>;

const db = supabaseAdmin as unknown as {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        order: (column: string, opts: { ascending: boolean }) => DbResult<Row[] | null>;
        limit: (n: number) => DbResult<Row[] | null>;
      };
      in: (column: string, values: string[]) => DbResult<Row[] | null>;
      order: (column: string, opts: { ascending: boolean }) => DbResult<Row[] | null>;
    };
    insert: (row: Row) => { select: (columns: string) => { limit: (n: number) => DbResult<Row[] | null> } };
    update: (patch: Row) => { eq: (column: string, value: string) => { select: (columns: string) => { limit: (n: number) => DbResult<Row[] | null> } } };
    delete: () => { eq: (column: string, value: string) => DbResult<null> };
  };
};

const TABLE = "Hangar_BernoulliRules";

function isCategory(v: unknown): v is BernoulliRuleCategory {
  return typeof v === "string" && (RULE_CATEGORIES as string[]).includes(v);
}

function fromRow(r: Row): BernoulliRuleDef {
  return {
    ruleId: String(r.rule_id),
    bay: String(r.bay),
    name: String(r.name),
    description: String(r.description ?? ""),
    kind: r.kind === "llm" ? "llm" : "rule",
    // Columns added by 20261030020000 -- default sensibly if not migrated yet.
    category: isCategory(r.category) ? r.category : "physics",
    hardGate: Boolean(r.hard_gate),
    maxSeverity: r.max_severity === "WARN" ? "WARN" : "FAIL",
    enabled: Boolean(r.enabled),
    builtin: Boolean(r.builtin),
    instruction: typeof r.instruction === "string" ? r.instruction : null,
    sortOrder: typeof r.sort_order === "number" ? r.sort_order : 100,
    version: typeof r.version === "number" ? r.version : 1,
    updatedAt: typeof r.updated_at === "string" ? r.updated_at : null,
    updatedBy: typeof r.updated_by === "string" ? r.updated_by : null,
  };
}

function bySortOrder(a: BernoulliRuleDef, b: BernoulliRuleDef) {
  return a.sortOrder - b.sortOrder || a.ruleId.localeCompare(b.ruleId);
}

// Every rule for one bay (enabled or not), registry first, defaults if the
// registry can't be read or has nothing for this bay.
export async function listBernoulliRules(bay: string): Promise<{ rules: BernoulliRuleDef[]; fromRegistry: boolean }> {
  try {
    const { data, error } = await db.from(TABLE).select("*").eq("bay", bay).order("sort_order", { ascending: true });
    if (!error && data && data.length > 0) {
      return { rules: data.map(fromRow).sort(bySortOrder), fromRegistry: true };
    }
  } catch {
    // fall through to defaults
  }
  return { rules: DEFAULT_BERNOULLI_RULES.filter((r) => r.bay === bay).sort(bySortOrder), fromRegistry: false };
}

export class BernoulliRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BernoulliRuleError";
  }
}

// Custom rules: BERN-MX01, BERN-CX01, BERN-VX01, ... -- the plain numbers
// (M07-M14, C05-C11, V10+) are kept for coded checks.
const CUSTOM_PREFIX: Record<BernoulliRuleBay, string> = { mission: "BERN-MX", concept: "BERN-CX", vehicle_design: "BERN-VX" };

async function nextCustomRuleId(bay: BernoulliRuleBay): Promise<{ ruleId: string; sortOrder: number }> {
  const { rules } = await listBernoulliRules(bay);
  const prefix = CUSTOM_PREFIX[bay];
  const maxNum = rules.reduce((m, r) => {
    const n = r.ruleId.startsWith(prefix) ? Number(r.ruleId.slice(prefix.length)) : NaN;
    return Number.isFinite(n) ? Math.max(m, n) : m;
  }, 0);
  const maxSort = rules.reduce((m, r) => Math.max(m, r.sortOrder), 0);
  return { ruleId: `${prefix}${String(maxNum + 1).padStart(2, "0")}`, sortOrder: Math.max(maxSort, 100) + 10 };
}

export interface CustomRuleFields {
  name: string;
  description: string;
  instruction: string;
  category: BernoulliRuleCategory;
  hardGate: boolean;
  maxSeverity: BernoulliMaxSeverity;
}

// Shared validation for create and edit. A "WARN only" rule can never fail a
// review, so it can't be a hard gate either.
function validateCustomFields(f: CustomRuleFields): CustomRuleFields {
  const name = f.name.trim();
  const description = f.description.trim();
  const instruction = f.instruction.trim();
  if (!name) throw new BernoulliRuleError("A rule needs a name.");
  if (!instruction) throw new BernoulliRuleError("A rule needs an instruction -- what TorqWings AI should check.");
  if (name.length > RULE_LIMITS.name) throw new BernoulliRuleError(`Name is limited to ${RULE_LIMITS.name} characters.`);
  if (description.length > RULE_LIMITS.description) {
    throw new BernoulliRuleError(`Short description is limited to ${RULE_LIMITS.description} characters.`);
  }
  if (instruction.length > RULE_LIMITS.instruction) {
    throw new BernoulliRuleError(`The instruction is limited to ${RULE_LIMITS.instruction} characters.`);
  }
  if (!isCategory(f.category)) throw new BernoulliRuleError("Pick a category.");
  const maxSeverity: BernoulliMaxSeverity = f.maxSeverity === "WARN" ? "WARN" : "FAIL";
  return { name, description, instruction, category: f.category, maxSeverity, hardGate: maxSeverity === "WARN" ? false : f.hardGate };
}

async function assertUniqueName(bay: string, name: string, exceptRuleId?: string) {
  const { rules } = await listBernoulliRules(bay);
  const clash = rules.find((r) => r.ruleId !== exceptRuleId && r.name.trim().toLowerCase() === name.trim().toLowerCase());
  if (clash) throw new BernoulliRuleError(`${clash.ruleId} is already called "${clash.name}" -- pick a different name.`);
}

export async function createCustomBernoulliRule(
  input: CustomRuleFields & { bay: string; enabled: boolean },
  userId: string,
): Promise<BernoulliRuleDef> {
  if (!WIRED_BERNOULLI_BAYS.includes(input.bay as BernoulliRuleBay)) {
    throw new BernoulliRuleError("Bernoulli isn't wired into this agent yet, so a rule for it would never run.");
  }
  const f = validateCustomFields(input);
  await assertUniqueName(input.bay, f.name);
  const { ruleId, sortOrder } = await nextCustomRuleId(input.bay as BernoulliRuleBay);
  const { data, error } = await db
    .from(TABLE)
    .insert({
      rule_id: ruleId,
      bay: input.bay,
      name: f.name,
      description: f.description,
      kind: "llm",
      category: f.category,
      hard_gate: f.hardGate,
      max_severity: f.maxSeverity,
      enabled: input.enabled,
      builtin: false,
      instruction: f.instruction,
      sort_order: sortOrder,
      version: 1,
      created_by: userId,
      updated_by: userId,
    })
    .select("*")
    .limit(1);
  if (error) throw new Error(`createCustomBernoulliRule: ${error.message}`);
  const row = data?.[0];
  if (!row) throw new Error("createCustomBernoulliRule: insert returned no row");
  return fromRow(row);
}

export interface BernoulliRulePatch {
  enabled?: boolean;
  hardGate?: boolean;
  name?: string;
  description?: string;
  instruction?: string;
  category?: BernoulliRuleCategory;
  maxSeverity?: BernoulliMaxSeverity;
}

async function getRule(ruleId: string): Promise<{ rule: BernoulliRuleDef; row: Row } | null> {
  const { data, error } = await db.from(TABLE).select("*").eq("rule_id", ruleId).limit(1);
  if (error) throw new Error(`getRule: ${error.message}`);
  const row = data?.[0];
  return row ? { rule: fromRow(row), row } : null;
}

// Built-ins: only enabled/hardGate change (their logic and max result are
// fixed in code). Custom rules: everything, and any change to the rule's
// wording or behaviour bumps its version.
export async function updateBernoulliRule(ruleId: string, patch: BernoulliRulePatch, userId: string): Promise<BernoulliRuleDef> {
  const found = await getRule(ruleId);
  if (!found) throw new BernoulliRuleError("No rule with this id.");
  const existing = found.rule;

  const row: Row = {};
  if (existing.builtin) {
    if (
      patch.name !== undefined ||
      patch.description !== undefined ||
      patch.instruction !== undefined ||
      patch.category !== undefined ||
      patch.maxSeverity !== undefined
    ) {
      throw new BernoulliRuleError("Built-in checks run fixed code -- only enabled and hard gate can change.");
    }
    if (patch.enabled !== undefined) row.enabled = patch.enabled;
    if (patch.hardGate !== undefined) row.hard_gate = patch.hardGate;
  } else {
    const merged = validateCustomFields({
      name: patch.name ?? existing.name,
      description: patch.description ?? existing.description,
      instruction: patch.instruction ?? existing.instruction ?? "",
      category: patch.category ?? existing.category,
      hardGate: patch.hardGate ?? existing.hardGate,
      maxSeverity: patch.maxSeverity ?? existing.maxSeverity,
    });
    if (merged.name.toLowerCase() !== existing.name.toLowerCase()) await assertUniqueName(existing.bay, merged.name, ruleId);
    const behaviourChanged =
      merged.name !== existing.name ||
      merged.description !== existing.description ||
      merged.instruction !== (existing.instruction ?? "") ||
      merged.category !== existing.category ||
      merged.maxSeverity !== existing.maxSeverity ||
      merged.hardGate !== existing.hardGate;
    row.name = merged.name;
    row.description = merged.description;
    row.instruction = merged.instruction;
    row.category = merged.category;
    row.max_severity = merged.maxSeverity;
    row.hard_gate = merged.hardGate;
    if (patch.enabled !== undefined) row.enabled = patch.enabled;
    if (behaviourChanged) row.version = existing.version + 1;
  }
  if (Object.keys(row).length === 0) return existing;
  row.updated_by = userId;

  const { data, error } = await db.from(TABLE).update(row).eq("rule_id", ruleId).select("*").limit(1);
  if (error) throw new Error(`updateBernoulliRule: ${error.message}`);
  return fromRow(data?.[0] ?? { ...found.row, ...row });
}

export async function deleteCustomBernoulliRule(ruleId: string): Promise<void> {
  const found = await getRule(ruleId);
  if (!found) throw new BernoulliRuleError("No rule with this id.");
  if (found.rule.builtin) throw new BernoulliRuleError("Built-in checks can't be deleted -- disable them instead.");
  const { error } = await db.from(TABLE).delete().eq("rule_id", ruleId);
  if (error) throw new Error(`deleteCustomBernoulliRule: ${error.message}`);
}

// Mission Hub admin gate for writes -- same check Mission Hub's own server
// functions use (mission_hub_users.role/status).
export async function assertMissionHubAdmin(userId: string): Promise<void> {
  const { data, error } = await db.from("mission_hub_users").select("role, status").eq("id", userId).limit(1);
  const caller = data?.[0];
  if (error || !caller || caller.status !== "active" || (caller.role !== "admin" && caller.role !== "super_admin")) {
    throw new BernoulliRuleError("Only Mission Hub admins can change Bernoulli rules.");
  }
}

// Display names for the "v3 · edited 29 Oct by Jothi" line.
export async function getEditorNames(userIds: string[]): Promise<Record<string, string>> {
  const ids = Array.from(new Set(userIds.filter(Boolean)));
  if (ids.length === 0) return {};
  const { data } = await db.from("mission_hub_users").select("id, full_name").in("id", ids);
  const out: Record<string, string> = {};
  for (const r of data ?? []) if (typeof r.full_name === "string") out[String(r.id)] = r.full_name;
  return out;
}

// "Last 30 reviews" column: how often each rule returned each status across
// this bay's 30 most recent saved reviews (all users -- it's a health signal
// for the rule, not a per-user view).
export type RuleStats = Record<string, { PASS: number; WARN: number; FAIL: number; INFO: number }>;

export async function getRuleStats(bay: string, lastN = 30): Promise<{ stats: RuleStats; reviews: number; avgAiCostUsd: number | null; avgAiSeconds: number | null }> {
  const listDb = supabaseAdmin as unknown as {
    from: (t: string) => {
      select: (c: string) => {
        eq: (c: string, v: string) => { eq: (c: string, v: string) => { order: (c: string, o: { ascending: boolean }) => { limit: (n: number) => DbResult<Row[] | null> } } };
      };
    };
  };
  const { data: reviews } = await listDb
    .from("Hangar_BernoulliReviews")
    .select("id")
    .eq("source_bay", bay)
    .eq("status", "spec_ready")
    .order("created_at", { ascending: false })
    .limit(lastN);
  const ids = (reviews ?? []).map((r) => String(r.id));
  const stats: RuleStats = {};
  if (ids.length === 0) return { stats, reviews: 0, avgAiCostUsd: null, avgAiSeconds: null };

  const { data: specs } = await db.from("Hangar_BernoulliReview_specs").select("bernoulli_review_id, version, checks").in("bernoulli_review_id", ids);
  // keep the latest version per review
  const latest = new Map<string, Row>();
  for (const s of specs ?? []) {
    const id = String(s.bernoulli_review_id);
    const cur = latest.get(id);
    if (!cur || Number(s.version) > Number(cur.version)) latest.set(id, s);
  }
  let aiCalls = 0;
  let aiTokensIn = 0;
  let aiTokensOut = 0;
  for (const s of latest.values()) {
    for (const c of (s.checks as Row[] | null) ?? []) {
      const id = String(c.ruleId);
      const status = String(c.status) as "PASS" | "WARN" | "FAIL" | "INFO";
      const bucket = (stats[id] ??= { PASS: 0, WARN: 0, FAIL: 0, INFO: 0 });
      if (status in bucket) bucket[status] += 1;
      const u = c.usage as { inputTokens?: number; outputTokens?: number } | undefined;
      if (u && typeof u.inputTokens === "number" && typeof u.outputTokens === "number") {
        aiCalls += 1;
        aiTokensIn += u.inputTokens;
        aiTokensOut += u.outputTokens;
      }
    }
  }

  // Average AI call time from the run log (whole review duration / its AI calls).
  const { data: runs } = await db
    .from("Hangar_BernoulliReview_runs")
    .select("bernoulli_review_id, duration_ms, output_snapshot")
    .in("bernoulli_review_id", ids);
  let secs = 0;
  let calls = 0;
  for (const r of runs ?? []) {
    const checks = ((r.output_snapshot as Row | null)?.checks as Row[] | undefined) ?? [];
    const n = checks.filter((c) => c.usage).length;
    if (n > 0 && typeof r.duration_ms === "number") {
      secs += r.duration_ms / 1000;
      calls += n;
    }
  }
  const { estimateCostUsd } = await import("./missionUsage.ts");
  return {
    stats,
    reviews: latest.size,
    avgAiCostUsd: aiCalls > 0 ? estimateCostUsd(aiTokensIn / aiCalls, aiTokensOut / aiCalls) : null,
    avgAiSeconds: calls > 0 ? secs / calls : null,
  };
}
