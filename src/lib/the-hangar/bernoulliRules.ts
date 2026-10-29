import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Bernoulli check registry (Hangar_BernoulliRules, see
// 20261030000000_hangar_bernoulli_rules.sql): which checks run for each
// calling bay, their type and hard-gate flag. Managed from Mission Hub ->
// Agents -> Bernoulli. Server-only.
//
// Built-in rules map to code in bernoulliChecks.ts by ruleId; custom rules
// are TorqWings AI checks defined by an instruction. If the table can't be
// read (not migrated yet, transient error) every caller falls back to
// DEFAULT_BERNOULLI_RULES, so a review never breaks over the registry.

export type BernoulliRuleBay = "mission" | "concept";
export type BernoulliRuleKind = "rule" | "llm";

// Bays Bernoulli is actually wired into -- rules for any other bay would
// never run, so the admin page doesn't allow adding them.
export const WIRED_BERNOULLI_BAYS: BernoulliRuleBay[] = ["mission", "concept"];

export interface BernoulliRuleDef {
  ruleId: string;
  bay: string;
  name: string;
  description: string;
  kind: BernoulliRuleKind;
  hardGate: boolean;
  enabled: boolean;
  builtin: boolean;
  instruction: string | null;
  sortOrder: number;
}

const builtin = (
  ruleId: string,
  bay: BernoulliRuleBay,
  name: string,
  description: string,
  kind: BernoulliRuleKind,
  hardGate: boolean,
  sortOrder: number,
): BernoulliRuleDef => ({ ruleId, bay, name, description, kind, hardGate, enabled: true, builtin: true, instruction: null, sortOrder });

// Same rows the migration seeds -- the fallback when the table isn't there.
export const DEFAULT_BERNOULLI_RULES: BernoulliRuleDef[] = [
  builtin("BERN-M01", "mission", "Speed Consistency", "Range ÷ Endurance implies an average speed -- flagged if implausible for the vehicle class.", "rule", true, 10),
  builtin("BERN-M02", "mission", "Coverage Math", "For multi-unit/swarm specs: units × per-unit coverage angle should reach 360°.", "rule", false, 20),
  builtin("BERN-M03", "mission", "Payload/Endurance Plausibility", "TorqWings AI-judged: is this payload/endurance combination realistic for this vehicle class?", "llm", false, 30),
  builtin("BERN-M04", "mission", "KPI/Constraint Provenance", "Does every constraint cite a source, or are some untagged?", "rule", false, 40),
  builtin("BERN-M05", "mission", "Dimensional Consistency", 'Do KPI units actually match what their names imply (e.g. "Range" isn\'t given in kg)?', "rule", true, 50),
  builtin("BERN-M06", "mission", "Energy/Power Budget Plausibility", "TorqWings AI-judged, grounded in reference ranges: could a battery/fuel load that fits this vehicle class actually deliver this payload+endurance?", "llm", false, 60),
  builtin("BERN-C01", "concept", "Vehicle-Class Consistency", "Do the concepts stay within the vehicle class the mission spec calls for?", "rule", false, 10),
  builtin("BERN-C02", "concept", "Speed Feasibility per Concept", "Can each concept's vehicle class fly the average speed the mission's range ÷ endurance needs?", "rule", true, 20),
  builtin("BERN-C03", "concept", "Ranking Coherence", 'Is the ranking consistent with constraint fit, and is any "pass" contradicted by the physics?', "rule", false, 30),
  builtin("BERN-C04", "concept", "Physical Feasibility per Concept", "TorqWings AI-judged, grounded in reference ranges: can each concept physically carry the payload for the required endurance?", "llm", false, 40),
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
      order: (column: string, opts: { ascending: boolean }) => DbResult<Row[] | null>;
    };
    insert: (row: Row) => { select: (columns: string) => { limit: (n: number) => DbResult<Row[] | null> } };
    update: (patch: Row) => { eq: (column: string, value: string) => { select: (columns: string) => { limit: (n: number) => DbResult<Row[] | null> } } };
    delete: () => { eq: (column: string, value: string) => DbResult<null> };
  };
};

const TABLE = "Hangar_BernoulliRules";

function fromRow(r: Row): BernoulliRuleDef {
  return {
    ruleId: String(r.rule_id),
    bay: String(r.bay),
    name: String(r.name),
    description: String(r.description ?? ""),
    kind: r.kind === "llm" ? "llm" : "rule",
    hardGate: Boolean(r.hard_gate),
    enabled: Boolean(r.enabled),
    builtin: Boolean(r.builtin),
    instruction: typeof r.instruction === "string" ? r.instruction : null,
    sortOrder: typeof r.sort_order === "number" ? r.sort_order : 100,
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

const PREFIX: Record<BernoulliRuleBay, string> = { mission: "BERN-M", concept: "BERN-C" };

// Custom rules continue the bay's numbering: BERN-M07, BERN-C05, ...
async function nextRuleId(bay: BernoulliRuleBay): Promise<{ ruleId: string; sortOrder: number }> {
  const { rules } = await listBernoulliRules(bay);
  const prefix = PREFIX[bay];
  const maxNum = rules.reduce((m, r) => {
    const n = r.ruleId.startsWith(prefix) ? Number(r.ruleId.slice(prefix.length)) : NaN;
    return Number.isFinite(n) ? Math.max(m, n) : m;
  }, 0);
  const maxSort = rules.reduce((m, r) => Math.max(m, r.sortOrder), 0);
  return { ruleId: `${prefix}${String(maxNum + 1).padStart(2, "0")}`, sortOrder: maxSort + 10 };
}

export interface NewCustomRule {
  bay: string;
  name: string;
  description: string;
  instruction: string;
  hardGate: boolean;
}

export async function createCustomBernoulliRule(input: NewCustomRule, userId: string): Promise<BernoulliRuleDef> {
  if (!WIRED_BERNOULLI_BAYS.includes(input.bay as BernoulliRuleBay)) {
    throw new BernoulliRuleError("Bernoulli isn't wired into this agent yet, so a rule for it would never run.");
  }
  const name = input.name.trim();
  const instruction = input.instruction.trim();
  if (!name) throw new BernoulliRuleError("A rule needs a name.");
  if (!instruction) throw new BernoulliRuleError("A rule needs an instruction -- what TorqWings AI should check.");
  if (name.length > 120 || instruction.length > 2000 || input.description.length > 500) {
    throw new BernoulliRuleError("Name, description or instruction is too long.");
  }
  const { ruleId, sortOrder } = await nextRuleId(input.bay as BernoulliRuleBay);
  const { data, error } = await db
    .from(TABLE)
    .insert({
      rule_id: ruleId,
      bay: input.bay,
      name,
      description: input.description.trim(),
      kind: "llm",
      hard_gate: input.hardGate,
      enabled: true,
      builtin: false,
      instruction,
      sort_order: sortOrder,
      created_by: userId,
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
}

// Built-ins: only enabled/hardGate change (their logic lives in code).
// Custom rules: name/description/instruction too.
export async function updateBernoulliRule(ruleId: string, patch: BernoulliRulePatch): Promise<BernoulliRuleDef> {
  const { data: existingRows, error: readErr } = await db.from(TABLE).select("*").eq("rule_id", ruleId).limit(1);
  if (readErr) throw new Error(`updateBernoulliRule: ${readErr.message}`);
  const existing = existingRows?.[0] ? fromRow(existingRows[0]) : null;
  if (!existing) throw new BernoulliRuleError("No rule with this id.");

  const row: Row = {};
  if (patch.enabled !== undefined) row.enabled = patch.enabled;
  if (patch.hardGate !== undefined) row.hard_gate = patch.hardGate;
  if (!existing.builtin) {
    if (patch.name !== undefined) {
      if (!patch.name.trim()) throw new BernoulliRuleError("A rule needs a name.");
      row.name = patch.name.trim();
    }
    if (patch.description !== undefined) row.description = patch.description.trim();
    if (patch.instruction !== undefined) {
      if (!patch.instruction.trim()) throw new BernoulliRuleError("A rule needs an instruction.");
      row.instruction = patch.instruction.trim();
    }
  } else if (patch.name !== undefined || patch.description !== undefined || patch.instruction !== undefined) {
    throw new BernoulliRuleError("Built-in checks run fixed code -- only enabled and hard gate can change.");
  }
  if (Object.keys(row).length === 0) return existing;

  const { data, error } = await db.from(TABLE).update(row).eq("rule_id", ruleId).select("*").limit(1);
  if (error) throw new Error(`updateBernoulliRule: ${error.message}`);
  return fromRow(data?.[0] ?? { ...existingRows![0], ...row });
}

export async function deleteCustomBernoulliRule(ruleId: string): Promise<void> {
  const { data, error: readErr } = await db.from(TABLE).select("*").eq("rule_id", ruleId).limit(1);
  if (readErr) throw new Error(`deleteCustomBernoulliRule: ${readErr.message}`);
  const existing = data?.[0] ? fromRow(data[0]) : null;
  if (!existing) throw new BernoulliRuleError("No rule with this id.");
  if (existing.builtin) throw new BernoulliRuleError("Built-in checks can't be deleted -- disable them instead.");
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
