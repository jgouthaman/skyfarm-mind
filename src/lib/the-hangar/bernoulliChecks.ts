import { callLlmGateway, stripJsonFences, type LlmProvider, type LlmUsage } from "./llmGateway.ts";
import { estimateCostUsd } from "./missionUsage.ts";
import type { FinalizedConstraint, FinalizedKpi, MissionSpecsFields } from "./missionSpecAssembly.ts";
import type { CandidateConcept } from "./conceptIdeation.ts";
import type { ConceptTradeoffNote } from "./tradeoffReasoning.ts";
import type { RankedConcept } from "./conceptRanking.ts";
import type { BernoulliRuleDef } from "./bernoulliRules.ts";

// Bernoulli Agent -- Mission Agent (B01) spec review checks (BERN-M01
// through BERN-M05), per "Ask Bernoulli — Mission Spec Review
// Implementation Spec" §4, plus a locally-added BERN-M06 (energy/power
// budget plausibility -- not in the original spec doc, added to make the
// LLM-judged checks more rigorous for investor/technical scrutiny). Table/
// route naming in this codebase uses the "Bernoulli" rebrand throughout
// (matches every other Bernoulli file already built this session) rather
// than the doc's alternate `physics`-prefixed naming -- the doc itself says
// the logic doesn't change either way.
//
// M01 and M05 are the hard-gate checks (a FAIL on either fails the whole
// review); M02-M04 and M06 can only WARN. This mirrors every other bay's
// deterministic-gate-then-reasoning split, just expressed as independent
// checks instead of one gate + one generation call, since that's the shape
// the spec's report UI (one row per check) needs.

export type BernoulliCheckStatus = "PASS" | "WARN" | "FAIL" | "INFO";

export interface BernoulliCheckResult {
  ruleId: string;
  status: BernoulliCheckStatus;
  message: string;
  sourceWasMock: boolean;
  // Populated only by the LLM-judged checks (M03, M06) -- the visible
  // calculation/reasoning behind the verdict, not just the label, so a
  // technical reviewer can check the logic instead of trusting a bare
  // PASS/WARN/FAIL. Undefined for deterministic checks (nothing to show
  // beyond `message`, which already states the arithmetic) and for INFO/
  // mock results (nothing was actually reasoned about).
  reasoning?: string;
  // The rule's display name from the registry (Hangar_BernoulliRules), so a
  // page can label custom rules it has no hard-coded name for.
  ruleName?: string;
  // What the verdict is about, as "kpi:<name>", "constraint:<name>" or
  // "concept:<name>" -- the report marks these in the spec panels.
  targets?: string[];
  // Copy of the rule's settings at run time, so an old report keeps the
  // wording and limits it was produced with even after the rule changes.
  rule?: RuleSnapshot;
  // The rule's max result turned a FAIL into a WARN.
  capped?: boolean;
  // Real token usage + which provider answered -- set only when an LLM
  // check got a genuine reply (not mock, not INFO). Mirrors Bay 01's own
  // per-stage usage shape (missionUsage.ts) so the telemetry table/bar can
  // be built the same way for every bay.
  usage?: LlmUsage;
  provider?: LlmProvider;
}

export interface RuleSnapshot {
  name: string;
  kind: "rule" | "llm";
  builtin: boolean;
  instruction: string | null;
  version: number;
  hardGate: boolean;
  maxSeverity: "FAIL" | "WARN";
}

// Requests/tokens/cost across however many LLM checks actually ran with a
// real reply -- deterministic checks and INFO/mock results contribute
// nothing (no `usage`), same "counts only what actually got billed"
// convention as missionUsage.ts's aggregateMissionUsage. One check with a
// real reply = one request (M03 and M06 are each a single callLlmGateway()
// call, never a multi-call stage like Mission Agent's Stage 2).
export interface BernoulliUsage {
  requests: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
}

export function computeBernoulliUsage(checks: BernoulliCheckResult[]): BernoulliUsage {
  let requests = 0;
  let inputTokens = 0;
  let outputTokens = 0;
  for (const c of checks) {
    if (!c.usage) continue;
    requests += 1;
    inputTokens += c.usage.inputTokens;
    outputTokens += c.usage.outputTokens;
  }
  return { requests, inputTokens, outputTokens, estimatedCostUsd: estimateCostUsd(inputTokens, outputTokens) };
}

export interface BernoulliCheckInput {
  missionSpecs: MissionSpecsFields;
  constraints: FinalizedConstraint[];
  kpis: FinalizedKpi[];
}

// -- shared parsing helpers --------------------------------------------------

// Duplicated rather than imported from the-hangar.mission.tsx's own
// parseLeadingNumberClient -- that's client-side page code, this is
// server-only pipeline code, same "duplicate across the server/client
// boundary" convention every other bay's shared-shape fields already
// follow in this codebase.
function parseLeadingNumber(text: string): number | null {
  const match = text.match(/-?\d+(\.\d+)?/);
  if (!match) return null;
  const n = Number(match[0]);
  return Number.isFinite(n) ? n : null;
}

function findKpi(kpis: FinalizedKpi[], ...keywords: string[]): FinalizedKpi | null {
  const lower = keywords.map((k) => k.toLowerCase());
  return kpis.find((k) => lower.some((kw) => k.name.toLowerCase().includes(kw))) ?? null;
}

function findConstraint(constraints: FinalizedConstraint[], ...keywords: string[]): FinalizedConstraint | null {
  const lower = keywords.map((k) => k.toLowerCase());
  return constraints.find((c) => lower.some((kw) => c.name.toLowerCase().includes(kw))) ?? null;
}

const DISTANCE_UNITS = ["km", "mi", "nm", "m"];
const TIME_UNITS = ["min", "mins", "minutes", "hr", "hrs", "hours", "h", "s", "sec"];
const MASS_UNITS = ["kg", "lb", "lbs", "g"];
const SPEED_UNITS = ["km/h", "kph", "mph", "m/s", "kn", "knots"];

function unitFamily(unit: string): "distance" | "time" | "mass" | "speed" | null {
  const u = unit.trim().toLowerCase();
  if (DISTANCE_UNITS.includes(u)) return "distance";
  if (TIME_UNITS.includes(u)) return "time";
  if (MASS_UNITS.includes(u)) return "mass";
  if (SPEED_UNITS.includes(u)) return "speed";
  return null;
}

function expectedFamilyForKpiName(name: string): "distance" | "time" | "mass" | "speed" | null {
  const n = name.toLowerCase();
  if (n.includes("range") || n.includes("distance") || n.includes("altitude")) return "distance";
  if (n.includes("endurance") || n.includes("duration") || n.includes("time")) return "time";
  if (n.includes("payload") || n.includes("weight") || n.includes("mass")) return "mass";
  if (n.includes("speed") || n.includes("velocity")) return "speed";
  return null;
}

function timeToHours(value: number, unit: string): number {
  const u = unit.trim().toLowerCase();
  if (u === "s" || u === "sec") return value / 3600;
  if (u.startsWith("min")) return value / 60;
  return value; // already hours (hr/hrs/hours/h)
}

// -- BERN-M01: range/endurance -> plausible average speed (hard gate) -------

const VEHICLE_CLASS_MAX_SPEED_KMH: Record<string, number> = {
  multirotor: 150,
  "fixed-wing": 250,
  "fixed wing": 250,
  vtol: 220,
  helicopter: 280,
};

function checkSpeedConsistency(input: BernoulliCheckInput): BernoulliCheckResult {
  const rangeKpi = findKpi(input.kpis, "range");
  const enduranceKpi = findKpi(input.kpis, "endurance", "flight time");
  if (!rangeKpi || !enduranceKpi) {
    return {
      ruleId: "BERN-M01",
      status: "INFO",
      message: "Not enough data to check -- this spec doesn't carry both a Range and an Endurance KPI.",
      sourceWasMock: false,
    };
  }
  const rangeVal = parseLeadingNumber(rangeKpi.target);
  const enduranceVal = parseLeadingNumber(enduranceKpi.target);
  if (rangeVal === null || enduranceVal === null || enduranceVal <= 0) {
    return {
      ruleId: "BERN-M01",
      status: "INFO",
      message: "Range or Endurance KPI value couldn't be parsed as a number -- skipped.",
      sourceWasMock: false,
    };
  }
  const rangeFamily = unitFamily(rangeKpi.unit);
  if (rangeFamily && rangeFamily !== "distance") {
    return {
      ruleId: "BERN-M01",
      status: "WARN",
      message: `Range KPI's unit ("${rangeKpi.unit}") doesn't read as a distance -- can't compute a reliable average speed.`,
      sourceWasMock: false,
    };
  }
  const enduranceHours = timeToHours(enduranceVal, enduranceKpi.unit);
  const avgSpeedKmh = rangeVal / enduranceHours;
  const vehicleClass = (input.missionSpecs.vehicleClass ?? "").toLowerCase();
  const maxSpeed = VEHICLE_CLASS_MAX_SPEED_KMH[vehicleClass] ?? 300;
  if (avgSpeedKmh > maxSpeed) {
    return {
      ruleId: "BERN-M01",
      status: "FAIL",
      message: `Range/Endurance implies an average speed of ~${Math.round(avgSpeedKmh)} km/h, above the plausible ceiling for a ${input.missionSpecs.vehicleClass ?? "vehicle of this class"} (~${maxSpeed} km/h).`,
      sourceWasMock: false,
    };
  }
  if (avgSpeedKmh > maxSpeed * 0.8) {
    return {
      ruleId: "BERN-M01",
      status: "WARN",
      message: `Implied average speed (~${Math.round(avgSpeedKmh)} km/h) is close to the plausible ceiling for this vehicle class (~${maxSpeed} km/h) -- worth double-checking.`,
      sourceWasMock: false,
    };
  }
  return {
    ruleId: "BERN-M01",
    status: "PASS",
    message: `Range/Endurance imply an average speed of ~${Math.round(avgSpeedKmh)} km/h, plausible for a ${input.missionSpecs.vehicleClass ?? "vehicle of this class"}.`,
    sourceWasMock: false,
  };
}

// -- BERN-M02: multi-unit coverage math --------------------------------------

function checkCoverageMath(input: BernoulliCheckInput): BernoulliCheckResult {
  const unitsSource = findConstraint(input.constraints, "swarm", "fleet size", "number of units", "unit count");
  const angleSource = findConstraint(input.constraints, "coverage angle", "field of view", "fov", "per-unit angle");
  if (!unitsSource || !angleSource) {
    return {
      ruleId: "BERN-M02",
      status: "INFO",
      message: "Not applicable -- no multi-unit swarm/coverage-angle constraints present in this spec.",
      sourceWasMock: false,
    };
  }
  const unitCount = parseLeadingNumber(unitsSource.value);
  const perUnitAngle = parseLeadingNumber(angleSource.value);
  if (unitCount === null || perUnitAngle === null) {
    return {
      ruleId: "BERN-M02",
      status: "INFO",
      message: "Swarm size or per-unit coverage angle couldn't be parsed as a number -- skipped.",
      sourceWasMock: false,
    };
  }
  const totalCoverage = unitCount * perUnitAngle;
  if (totalCoverage < 360) {
    return {
      ruleId: "BERN-M02",
      status: "FAIL",
      message: `${unitCount} units × ${perUnitAngle}° covers only ${totalCoverage}° -- short of full 360° coverage.`,
      sourceWasMock: false,
    };
  }
  return {
    ruleId: "BERN-M02",
    status: "PASS",
    message: `${unitCount} units × ${perUnitAngle}° covers ${totalCoverage}°, at or above the 360° requirement.`,
    sourceWasMock: false,
  };
}

// -- shared reference benchmarks for the LLM-judged checks (M03, M06) -------

// Real, citable aerospace/battery reference ranges, embedded directly in
// both LLM-judged checks' prompts so their verdicts are grounded in actual
// numbers rather than Claude's own general knowledge alone -- reproducible
// and checkable by a reviewer, not just "the AI said so". Conservative,
// widely-cited ranges (not vehicle-specific datasheets); a judgment call
// outside these ranges should be rare and worth flagging either way.
const AEROSPACE_BENCHMARKS = `Reference ranges (typical, not absolute):
- Li-ion/Li-poly pack energy density: 150-250 Wh/kg at the pack level (electric UAS).
- Battery mass fraction of MTOW for electric UAS: typically 20-40%.
- Multirotor hover power loading: ~120-200 W/kg of MTOW.
- Fixed-wing/VTOL-cruise electric power loading: ~50-100 W/kg of MTOW.
- Propulsive + ESC efficiency (battery to thrust): ~60-75%.
- Typical payload fraction of MTOW: multirotor ~15-30%, fixed-wing ~10-25%.`;

// Appended to every TorqWings AI check's instructions so the reply names
// what it's about; parseTargets keeps only well-formed entries.
const TARGETS_NOTE = `Also include "targets": a list of the exact items your verdict is about, each written as "kpi:<KPI name>", "constraint:<constraint name>" or "concept:<concept name>", using the names exactly as given in the input. Use [] when the verdict isn't about specific items.`;

export function parseTargets(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out = raw
    .filter((t): t is string => typeof t === "string")
    .map((t) => t.trim())
    .filter((t) => /^(kpi|constraint|concept):.+/.test(t));
  return out.length > 0 ? Array.from(new Set(out)).slice(0, 20) : undefined;
}

// -- BERN-M03: payload/endurance/vehicle-class plausibility (Claude call) ---

// Primary judgment is still payload-vs-endurance (same contract as before --
// one ruleId, one status, one message, so the report UI's one-row-per-check
// shape doesn't change) but the prompt is now grounded in the *other* four
// checks' actual findings plus the spec's full KPI/constraint list, not just
// the isolated payload+endurance pair. This catches compounding problems a
// context-blind check can't see -- e.g. M01 already flagging an implausible
// average speed is directly relevant to whether the endurance number is
// trustworthy enough to judge payload against. `reasoning` surfaces the
// actual calculation/logic behind the verdict (not just a label) so a
// reviewer can check the work instead of trusting a bare PASS/WARN/FAIL.
const M03_SYSTEM = `You are Bernoulli Agent's physics-plausibility reviewer for TorqWings' aerospace design platform, reviewing a mission spec before it's trusted downstream. Your primary judgment is whether the Payload and Endurance KPIs are physically plausible together for the given vehicle class, using general aerospace engineering knowledge (typical payload-to-endurance trade-offs for that class). You are also given the spec's full KPI and constraint list, and the results of four other deterministic checks already run on this same spec (speed consistency, coverage math, dimensional consistency, KPI/constraint provenance) -- use them as corroborating or contradicting evidence. If an earlier check already flagged a problem (e.g. an implausible implied speed, or a dimensional mismatch) that bears on payload/endurance plausibility, factor it in and say so explicitly rather than judging payload/endurance in isolation.

${AEROSPACE_BENCHMARKS}

This is an engineering judgment call, not a certified analysis -- ground it in the given numbers and the reference ranges above, don't invent specifics not present in the input. Return JSON only: { "status": "PASS | WARN | FAIL", "message": "one or two sentences", "reasoning": "the calculation/logic behind the verdict -- show what you estimated and against what reference range, 2-4 sentences" }.

${TARGETS_NOTE}`;

async function checkPayloadEndurancePlausibility(
  input: BernoulliCheckInput,
  priorChecks: BernoulliCheckResult[],
): Promise<BernoulliCheckResult> {
  const payloadKpi = findKpi(input.kpis, "payload");
  const enduranceKpi = findKpi(input.kpis, "endurance", "flight time");
  if (!payloadKpi || !enduranceKpi) {
    return {
      ruleId: "BERN-M03",
      status: "INFO",
      message: "Not enough data to check -- this spec doesn't carry both a Payload and an Endurance KPI.",
      sourceWasMock: false,
    };
  }

  const otherKpis = input.kpis.filter((k) => k !== payloadKpi && k !== enduranceKpi);
  const priorFindings = priorChecks
    .filter((c) => c.status !== "INFO")
    .map((c) => `${c.ruleId} (${c.status}): ${c.message}`)
    .join("\n");

  const userContent = `Vehicle class: ${input.missionSpecs.vehicleClass ?? "unknown"}
Mission type: ${input.missionSpecs.missionType}
Payload KPI: ${payloadKpi.target} ${payloadKpi.unit}
Endurance KPI: ${enduranceKpi.target} ${enduranceKpi.unit}
Other KPIs on this spec: ${otherKpis.length > 0 ? otherKpis.map((k) => `${k.name}: ${k.target} ${k.unit}`).join("; ") : "none"}
Constraints on this spec: ${input.constraints.length > 0 ? input.constraints.map((c) => `${c.name}: ${c.value}`).join("; ") : "none"}
Findings from this spec's other Bernoulli checks so far:
${priorFindings || "(none ran, or all were not-applicable)"}`;

  const { content, usage, provider } = await callLlmGateway(M03_SYSTEM, userContent, { jsonMode: true });
  if (!content) return mockM03();

  try {
    const obj = JSON.parse(stripJsonFences(content));
    if (
      typeof obj !== "object" ||
      obj === null ||
      (obj.status !== "PASS" && obj.status !== "WARN" && obj.status !== "FAIL") ||
      typeof obj.message !== "string"
    ) {
      return mockM03();
    }
    return {
      ruleId: "BERN-M03",
      status: obj.status,
      message: obj.message,
      sourceWasMock: false,
      reasoning: typeof obj.reasoning === "string" ? obj.reasoning : undefined,
      targets: parseTargets(obj.targets),
      usage: usage ?? undefined,
      provider: provider ?? undefined,
    };
  } catch {
    return mockM03();
  }
}

function mockM03(): BernoulliCheckResult {
  return {
    ruleId: "BERN-M03",
    status: "INFO",
    message: "Couldn't reach Claude to judge payload/endurance plausibility -- no ANTHROPIC_API_KEY reply.",
    sourceWasMock: true,
  };
}

// -- BERN-M06: energy/power budget plausibility (Claude call) ---------------

// Locally added, not in the original "Ask Bernoulli" spec doc -- the spec's
// fields (payload, endurance, vehicle class) don't carry MTOW or battery
// capacity, so a hard deterministic energy-budget calculation isn't
// possible from what's actually on a mission spec. Instead this asks Claude
// to estimate the implied power draw and required battery mass fraction
// from payload+endurance+vehicle class, checked against the same reference
// ranges as M03 (power loading, pack energy density, battery mass
// fraction), and to show that estimate rather than just a verdict -- this
// is the check most likely to catch an energy-infeasible spec (too much
// payload/endurance for the implied battery to physically carry), which
// none of M01-M05 check for. Non-hard-gate: an estimate this far upstream
// of real geometry can only WARN, never fail the review outright.
const M06_SYSTEM = `You are Bernoulli Agent's physics-plausibility reviewer for TorqWings' aerospace design platform. Given a mission's vehicle class, payload KPI, and endurance KPI, estimate whether there's a physically plausible energy/power budget for that combination -- i.e. would a battery (or fuel) that could fit this vehicle class actually be able to deliver that much endurance while carrying that payload. Show your estimate: implied power draw, required energy, and implied battery mass fraction of MTOW, checked against the reference ranges below. This is a rough plausibility estimate given only payload/endurance/class (no MTOW or battery capacity is available) -- say so if the estimate is too underconstrained to judge confidently, and use WARN rather than FAIL in that case.

${AEROSPACE_BENCHMARKS}

Return JSON only: { "status": "PASS | WARN | FAIL", "message": "one or two sentences", "reasoning": "your estimate -- implied power draw, required energy, implied battery mass fraction, and which reference range(s) you checked it against, 2-4 sentences" }.

${TARGETS_NOTE}`;

async function checkEnergyPowerPlausibility(
  input: BernoulliCheckInput,
  priorChecks: BernoulliCheckResult[],
): Promise<BernoulliCheckResult> {
  const payloadKpi = findKpi(input.kpis, "payload");
  const enduranceKpi = findKpi(input.kpis, "endurance", "flight time");
  if (!payloadKpi || !enduranceKpi) {
    return {
      ruleId: "BERN-M06",
      status: "INFO",
      message: "Not enough data to check -- this spec doesn't carry both a Payload and an Endurance KPI.",
      sourceWasMock: false,
    };
  }

  const priorFindings = priorChecks
    .filter((c) => c.status !== "INFO")
    .map((c) => `${c.ruleId} (${c.status}): ${c.message}`)
    .join("\n");

  const userContent = `Vehicle class: ${input.missionSpecs.vehicleClass ?? "unknown"}
Mission type: ${input.missionSpecs.missionType}
Payload KPI: ${payloadKpi.target} ${payloadKpi.unit}
Endurance KPI: ${enduranceKpi.target} ${enduranceKpi.unit}
Findings from this spec's other Bernoulli checks so far:
${priorFindings || "(none ran, or all were not-applicable)"}`;

  const { content, usage, provider } = await callLlmGateway(M06_SYSTEM, userContent, { jsonMode: true });
  if (!content) return mockM06();

  try {
    const obj = JSON.parse(stripJsonFences(content));
    if (
      typeof obj !== "object" ||
      obj === null ||
      (obj.status !== "PASS" && obj.status !== "WARN" && obj.status !== "FAIL") ||
      typeof obj.message !== "string"
    ) {
      return mockM06();
    }
    return {
      ruleId: "BERN-M06",
      status: obj.status,
      message: obj.message,
      sourceWasMock: false,
      reasoning: typeof obj.reasoning === "string" ? obj.reasoning : undefined,
      targets: parseTargets(obj.targets),
      usage: usage ?? undefined,
      provider: provider ?? undefined,
    };
  } catch {
    return mockM06();
  }
}

function mockM06(): BernoulliCheckResult {
  return {
    ruleId: "BERN-M06",
    status: "INFO",
    message: "Couldn't reach Claude to judge energy/power budget plausibility -- no ANTHROPIC_API_KEY reply.",
    sourceWasMock: true,
  };
}

// -- BERN-M04: KPI/constraint provenance (deterministic) --------------------

function checkKpiProvenance(input: BernoulliCheckInput): BernoulliCheckResult {
  const untagged = input.constraints.filter((c) => !c.sources || c.sources.length === 0);
  if (input.constraints.length === 0) {
    return {
      ruleId: "BERN-M04",
      status: "INFO",
      message: "No constraints on this spec to check for source provenance.",
      sourceWasMock: false,
    };
  }
  if (untagged.length > 0) {
    return {
      ruleId: "BERN-M04",
      status: "WARN",
      message: `${untagged.length} of ${input.constraints.length} constraint(s) cite no source: ${untagged.map((c) => c.name).join(", ")}.`,
      sourceWasMock: false,
    };
  }
  return {
    ruleId: "BERN-M04",
    status: "PASS",
    message: `All ${input.constraints.length} constraint(s) cite at least one source.`,
    sourceWasMock: false,
  };
}

// -- BERN-M05: dimensional consistency across KPIs (hard gate) --------------

function checkDimensionalConsistency(input: BernoulliCheckInput): BernoulliCheckResult {
  const mismatches: string[] = [];
  for (const kpi of input.kpis) {
    const expected = expectedFamilyForKpiName(kpi.name);
    if (!expected) continue; // KPI name doesn't map to a known dimensional family -- nothing to check
    const actual = unitFamily(kpi.unit);
    if (actual !== null && actual !== expected) {
      mismatches.push(`${kpi.name} ("${kpi.unit}") doesn't read as a ${expected} unit`);
    }
  }
  if (mismatches.length > 0) {
    return {
      ruleId: "BERN-M05",
      status: "FAIL",
      message: mismatches.join("; "),
      sourceWasMock: false,
    };
  }
  return {
    ruleId: "BERN-M05",
    status: "PASS",
    message: "No dimensional mismatches found across this spec's KPIs.",
    sourceWasMock: false,
  };
}

// -- BERN-M07: payload vs MTOW (deterministic, hard gate) --------------------

// Mass in kg from a value + unit ("0.55", "kg") or a constraint string
// ("≤ 0.55 kg", "Maximum takeoff weight 250 g").
function massKg(text: string, unitHint = ""): number | null {
  const n = parseLeadingNumber(text);
  if (n === null) return null;
  const u = `${unitHint} ${text}`.toLowerCase();
  if (/\b(lb|lbs|pound)/.test(u)) return n * 0.4536;
  if (/\bkg\b|kilogram/.test(u)) return n;
  if (/\bg\b|gram/.test(u)) return n / 1000;
  return n; // unitless -- assume kg, the spec's own default unit for mass
}

function checkPayloadVsMtow(input: BernoulliCheckInput): BernoulliCheckResult {
  const payloadKpi = findKpi(input.kpis, "payload");
  const mtow = findConstraint(input.constraints, "takeoff weight", "take-off weight", "mtow", "gross weight", "maximum weight", "max weight", "all-up weight", "auw");
  if (!payloadKpi || !mtow) {
    return {
      ruleId: "BERN-M07",
      status: "INFO",
      message: "Not applicable -- this spec doesn't carry both a Payload KPI and a maximum takeoff weight constraint.",
      sourceWasMock: false,
    };
  }
  const payload = massKg(payloadKpi.target, payloadKpi.unit);
  const limit = massKg(mtow.value);
  if (payload === null || limit === null || limit <= 0) {
    return {
      ruleId: "BERN-M07",
      status: "INFO",
      message: "Payload or MTOW couldn't be read as a mass -- skipped.",
      sourceWasMock: false,
    };
  }
  const targets = [`kpi:${payloadKpi.name}`, `constraint:${mtow.name}`];
  const fraction = payload / limit;
  const fmt = (kg: number) => (kg < 1 ? `${Math.round(kg * 1000)} g` : `${+kg.toFixed(2)} kg`);
  if (fraction >= 1) {
    return {
      ruleId: "BERN-M07",
      status: "FAIL",
      message: `Payload (${fmt(payload)}) is ${fraction >= 2 ? `${+fraction.toFixed(1)}×` : `${Math.round(fraction * 100)}% of`} the maximum takeoff weight (${fmt(limit)}) -- the vehicle can't carry more than it's allowed to weigh in total.`,
      sourceWasMock: false,
      targets,
    };
  }
  if (fraction > 0.4) {
    return {
      ruleId: "BERN-M07",
      status: "WARN",
      message: `Payload is ${Math.round(fraction * 100)}% of the maximum takeoff weight -- above the ~10-30% payload fraction typical for UAS, leaving little for airframe, battery and propulsion.`,
      sourceWasMock: false,
      targets,
    };
  }
  return {
    ruleId: "BERN-M07",
    status: "PASS",
    message: `Payload is ${Math.round(fraction * 100)}% of the maximum takeoff weight, within a plausible payload fraction.`,
    sourceWasMock: false,
  };
}

// -- orchestrator -------------------------------------------------------------

export interface BernoulliReviewResult {
  verdict: "PASS" | "WARN" | "FAIL";
  checks: BernoulliCheckResult[];
  confidenceScore: number;
}

const HARD_GATE_RULE_IDS = new Set(["BERN-M01", "BERN-M05"]);

function computeVerdict(
  checks: BernoulliCheckResult[],
  hardGates: Set<string> = HARD_GATE_RULE_IDS,
): "PASS" | "WARN" | "FAIL" {
  if (checks.some((c) => c.status === "FAIL" && hardGates.has(c.ruleId))) return "FAIL";
  if (checks.some((c) => c.status === "WARN" || (c.status === "FAIL" && !hardGates.has(c.ruleId)))) {
    return "WARN";
  }
  return "PASS";
}

// Weighted average -- hard-gate rules count double, since they're the
// checks that can fail the whole review. INFO checks (not applicable / not
// enough data) are excluded from the average entirely rather than
// penalizing a spec for not carrying fields Bernoulli can't check.
function computeConfidenceScore(
  checks: BernoulliCheckResult[],
  hardGates: Set<string> = HARD_GATE_RULE_IDS,
): number {
  const STATUS_SCORE: Record<BernoulliCheckStatus, number | null> = {
    PASS: 1,
    WARN: 0.5,
    FAIL: 0,
    INFO: null,
  };
  let weightedSum = 0;
  let totalWeight = 0;
  for (const c of checks) {
    const score = STATUS_SCORE[c.status];
    if (score === null) continue;
    const weight = hardGates.has(c.ruleId) ? 2 : 1;
    weightedSum += score * weight;
    totalWeight += weight;
    if (c.sourceWasMock) weightedSum -= 0.15 * weight; // still counted, just penalized
  }
  if (totalWeight === 0) return 0.5; // every check was INFO -- nothing concrete to score
  return Math.max(0, Math.min(1, weightedSum / totalWeight));
}

type CheckImpl<I> = (input: I, prior: BernoulliCheckResult[]) => BernoulliCheckResult | Promise<BernoulliCheckResult>;

const MISSION_RULE_IMPLS: Record<string, CheckImpl<BernoulliCheckInput>> = {
  "BERN-M01": (i) => checkSpeedConsistency(i),
  "BERN-M02": (i) => checkCoverageMath(i),
  "BERN-M03": (i, prior) => checkPayloadEndurancePlausibility(i, prior),
  "BERN-M04": (i) => checkKpiProvenance(i),
  "BERN-M05": (i) => checkDimensionalConsistency(i),
  "BERN-M06": (i, prior) => checkEnergyPowerPlausibility(i, prior),
  "BERN-M07": (i) => checkPayloadVsMtow(i),
};

export interface BernoulliProgress {
  done: number;
  total: number;
  current: string | null;
}
export type ProgressFn = (p: BernoulliProgress) => void | Promise<void>;

interface NameIndex {
  kpi: string[];
  constraint: string[];
  concept: string[];
}

function snapshotRule(rule: BernoulliRuleDef): RuleSnapshot {
  return {
    name: rule.name,
    kind: rule.kind,
    builtin: rule.builtin,
    instruction: rule.instruction,
    version: rule.version,
    hardGate: rule.hardGate,
    maxSeverity: rule.maxSeverity,
  };
}

// Built-in rule-based checks already name what they're about in their
// message; pick those names up as targets when a check didn't set its own.
function targetsFromMessage(message: string, names: NameIndex): string[] | undefined {
  const lower = message.toLowerCase();
  const hits: string[] = [];
  for (const [kind, list] of Object.entries(names) as [keyof NameIndex, string[]][]) {
    for (const n of list) {
      if (n && n.length >= 3 && lower.includes(n.toLowerCase())) hits.push(`${kind}:${n}`);
    }
  }
  return hits.length > 0 ? hits : undefined;
}

function finishResult(result: BernoulliCheckResult, rule: BernoulliRuleDef, names: NameIndex): BernoulliCheckResult {
  const capped = result.status === "FAIL" && rule.maxSeverity === "WARN";
  const flagged = result.status === "WARN" || result.status === "FAIL";
  return {
    ...result,
    status: capped ? "WARN" : result.status,
    capped: capped || undefined,
    ruleName: rule.name,
    rule: snapshotRule(rule),
    targets: flagged ? (result.targets ?? targetsFromMessage(result.message, names)) : undefined,
  };
}

// Runs the registry's enabled rules for a bay in three passes, so each
// TorqWings AI check sees what came before it:
//   1. built-in rule-based checks (instant, no network)
//   2. built-in AI checks, in order (M06 sees M03)
//   3. custom AI rules, in parallel -- they only need passes 1-2
// Hard gates and each rule's max result come from the registry.
async function runRegisteredChecks<I>(
  input: I,
  rules: BernoulliRuleDef[],
  impls: Record<string, CheckImpl<I>>,
  describeForCustom: (input: I) => string,
  nameIndex: (input: I) => NameIndex,
  onProgress?: ProgressFn,
): Promise<BernoulliReviewResult> {
  const active = rules
    .filter((r) => r.enabled && (!r.builtin || impls[r.ruleId]))
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const pass1 = active.filter((r) => r.builtin && r.kind === "rule");
  const pass2 = active.filter((r) => r.builtin && r.kind === "llm");
  const pass3 = active.filter((r) => !r.builtin);
  const names = nameIndex(input);
  const total = active.length;
  const checks: BernoulliCheckResult[] = [];
  const report = async (current: string | null) => {
    if (onProgress) await onProgress({ done: checks.length, total, current });
  };

  for (const rule of [...pass1, ...pass2]) {
    await report(`${rule.ruleId} ${rule.name}`);
    const result = await impls[rule.ruleId](input, checks);
    checks.push(finishResult(result, rule, names));
  }

  if (pass3.length > 0) {
    await report(pass3.length === 1 ? `${pass3[0].ruleId} ${pass3[0].name}` : `${pass3.length} custom rules`);
    const prior = [...checks];
    const description = describeForCustom(input);
    const results = await Promise.all(pass3.map((rule) => runCustomRule(rule, description, prior)));
    results.forEach((result, i) => checks.push(finishResult(result, pass3[i], names)));
  }
  await report(null);

  const hardGates = new Set(active.filter((r) => r.hardGate && r.maxSeverity === "FAIL").map((r) => r.ruleId));
  return {
    verdict: computeVerdict(checks, hardGates),
    checks,
    confidenceScore: computeConfidenceScore(checks, hardGates),
  };
}

// One rule on its own, for the Mission Hub "Run test" button. Runs the free
// rule-based built-ins first so an AI rule sees the same earlier findings it
// would in a real review; returns only the tested rule's result. Nothing is
// saved.
async function testRegisteredRule<I>(
  input: I,
  rule: BernoulliRuleDef,
  allRules: BernoulliRuleDef[],
  impls: Record<string, CheckImpl<I>>,
  describeForCustom: (input: I) => string,
  nameIndex: (input: I) => NameIndex,
): Promise<BernoulliCheckResult> {
  const names = nameIndex(input);
  const prior: BernoulliCheckResult[] = [];
  if (rule.kind === "llm") {
    for (const r of allRules.filter((x) => x.enabled && x.builtin && x.kind === "rule" && impls[x.ruleId])) {
      prior.push(finishResult(await impls[r.ruleId](input, prior), r, names));
    }
  }
  if (rule.builtin) {
    const impl = impls[rule.ruleId];
    if (!impl) throw new Error(`No code for built-in check ${rule.ruleId}.`);
    return finishResult(await impl(input, prior), rule, names);
  }
  return finishResult(await runCustomRule(rule, describeForCustom(input), prior), rule, names);
}

function missionNames(input: BernoulliCheckInput): NameIndex {
  return { kpi: input.kpis.map((k) => k.name), constraint: input.constraints.map((c) => c.name), concept: [] };
}

function describeMissionInput(input: BernoulliCheckInput): string {
  const s = input.missionSpecs;
  return `Vehicle class: ${s.vehicleClass ?? "unspecified"}
Mission type: ${s.missionType}
Domain: ${s.domain ?? "unspecified"}${s.vertical ? ` / ${s.vertical}` : ""}
Phase: ${s.phase ?? "unspecified"}
Operating environment: ${s.operatingEnvironment ?? "unspecified"}
Mission KPIs: ${input.kpis.length > 0 ? input.kpis.map((k) => `${k.name}: ${k.target} ${k.unit}`).join("; ") : "none"}
Mission constraints: ${input.constraints.length > 0 ? input.constraints.map((c) => `${c.name}: ${c.value}`).join("; ") : "none"}`;
}

export async function runBernoulliChecks(
  input: BernoulliCheckInput,
  rules: BernoulliRuleDef[],
  onProgress?: ProgressFn,
): Promise<BernoulliReviewResult> {
  return runRegisteredChecks(input, rules, MISSION_RULE_IMPLS, describeMissionInput, missionNames, onProgress);
}

export async function testMissionRule(
  input: BernoulliCheckInput,
  rule: BernoulliRuleDef,
  allRules: BernoulliRuleDef[],
): Promise<BernoulliCheckResult> {
  return testRegisteredRule(input, rule, allRules, MISSION_RULE_IMPLS, describeMissionInput, missionNames);
}

// -- custom rules: TorqWings AI checks defined in Mission Hub ---------------

const CUSTOM_RULE_SYSTEM = `You are Bernoulli Agent's physics-plausibility reviewer for TorqWings' aerospace design platform. You are applying one review rule defined by the TorqWings engineering team to the output below. Judge the output strictly against that rule, using general aerospace engineering knowledge and the reference ranges below where relevant. You are also given the findings of the other Bernoulli checks already run on this output -- use them as corroborating or contradicting evidence. If the output doesn't carry what the rule needs, say so and use WARN rather than guessing.

${AEROSPACE_BENCHMARKS}

This is an engineering judgment call, not a certified analysis -- ground it in the given numbers, don't invent specifics not present in the input. Return JSON only: { "status": "PASS | WARN | FAIL", "message": "one or two sentences", "reasoning": "what you checked and how, 2-4 sentences" }.

${TARGETS_NOTE}`;

async function runCustomRule(
  rule: BernoulliRuleDef,
  outputDescription: string,
  priorChecks: BernoulliCheckResult[],
): Promise<BernoulliCheckResult> {
  const priorFindings = priorChecks
    .filter((c) => c.status !== "INFO")
    .map((c) => `${c.ruleId} (${c.status}): ${c.message}`)
    .join("\n");
  const userContent = `Rule ${rule.ruleId} -- ${rule.name}
What to check: ${rule.instruction ?? rule.description}

Output under review:
${outputDescription}

Findings from this review's other checks so far:
${priorFindings || "(none ran, or all were not-applicable)"}`;

  const mock = (): BernoulliCheckResult => ({
    ruleId: rule.ruleId,
    status: "INFO",
    message: `Couldn't reach TorqWings AI to apply "${rule.name}" -- no live reply.`,
    sourceWasMock: true,
  });
  const { content, usage, provider } = await callLlmGateway(CUSTOM_RULE_SYSTEM, userContent, { jsonMode: true });
  if (!content) return mock();
  try {
    const obj = JSON.parse(stripJsonFences(content));
    if (
      typeof obj !== "object" ||
      obj === null ||
      (obj.status !== "PASS" && obj.status !== "WARN" && obj.status !== "FAIL") ||
      typeof obj.message !== "string"
    ) {
      return mock();
    }
    return {
      ruleId: rule.ruleId,
      status: obj.status,
      message: obj.message,
      sourceWasMock: false,
      reasoning: typeof obj.reasoning === "string" ? obj.reasoning : undefined,
      targets: parseTargets(obj.targets),
      usage: usage ?? undefined,
      provider: provider ?? undefined,
    };
  } catch {
    return mock();
  }
}

// =============================================================================
// Concept Agent (B02) output review -- BERN-C01 through BERN-C04
// =============================================================================
//
// Called when "Ask Bernoulli" comes from Bay 02: checks the concepts Concept
// Agent produced, not the mission spec they came from (that's BERN-M01-M06's
// job). The mission's KPIs are still the yardstick -- every concept is judged
// on whether it can meet them. "Top" below means the CHOSEN concept -- the
// one the user saved in Bay 02, rank 1 by default. C02 is the only hard gate: a top-ranked
// concept whose vehicle class physically can't fly the mission is the one
// failure that should fail the review.

export interface BernoulliConceptCheckInput extends BernoulliCheckInput {
  candidates: CandidateConcept[];
  tradeoffNotes: ConceptTradeoffNote[];
  rankedConcepts: RankedConcept[];
  // The concept the user chose in Bay 02 (fit score 8+) and that carries
  // forward to Vehicle Design; null/absent means the rank-1 concept.
  chosenConceptName?: string | null;
}

// The concept the review is about: the user's saved choice if it's one of
// this run's concepts, otherwise the rank-1 concept. The checks judge this
// one most strictly, since it's what gets carried into detailed design.
function chosenConceptName(input: BernoulliConceptCheckInput): string | null {
  const order = conceptsInRankOrder(input);
  if (input.chosenConceptName && order.some((c) => c.name === input.chosenConceptName)) return input.chosenConceptName;
  return order[0]?.name ?? null;
}

function conceptLabel(input: BernoulliConceptCheckInput, name: string): string {
  return name === chosenConceptName(input) ? " [CHOSEN -- carried forward to Vehicle Design]" : "";
}

// Concept Agent writes vehicle classes as free text ("Quadcopter multirotor",
// "Tilt-rotor VTOL") -- fold them onto the same keys the speed table uses.
function normalizeVehicleClass(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const v = raw.toLowerCase();
  if (v.includes("vtol") || v.includes("tilt") || v.includes("hybrid")) return "vtol";
  if (
    v.includes("multirotor") ||
    v.includes("multi-rotor") ||
    v.includes("quad") ||
    v.includes("hexa") ||
    v.includes("octo")
  ) {
    return "multirotor";
  }
  if (v.includes("fixed")) return "fixed-wing";
  if (v.includes("heli")) return "helicopter";
  return null;
}

// Rank order, falling back to the ideation order when ranking hasn't run.
function conceptsInRankOrder(input: BernoulliConceptCheckInput): { name: string; vehicleClass: string }[] {
  const classOf = (name: string) => input.candidates.find((c) => c.conceptName === name)?.vehicleClass ?? "";
  if (input.rankedConcepts.length > 0) {
    return [...input.rankedConcepts]
      .sort((a, b) => a.rank - b.rank)
      .map((r) => ({ name: r.conceptName, vehicleClass: classOf(r.conceptName) }));
  }
  return input.candidates.map((c) => ({ name: c.conceptName, vehicleClass: c.vehicleClass }));
}

// -- BERN-C01: vehicle-class consistency (deterministic) --------------------

function checkConceptVehicleClass(input: BernoulliConceptCheckInput): BernoulliCheckResult {
  const specClassRaw = input.missionSpecs.vehicleClass ?? null;
  const specClass = normalizeVehicleClass(specClassRaw);
  const concepts = conceptsInRankOrder(input);
  if (concepts.length === 0) {
    return { ruleId: "BERN-C01", status: "INFO", message: "No concepts on this run to check.", sourceWasMock: false };
  }
  if (!specClass) {
    return {
      ruleId: "BERN-C01",
      status: "INFO",
      message: "The source mission spec doesn't name a vehicle class -- nothing to hold the concepts to.",
      sourceWasMock: false,
    };
  }
  const off = concepts.filter((c) => {
    const k = normalizeVehicleClass(c.vehicleClass);
    return k !== null && k !== specClass;
  });
  if (off.length === 0) {
    return {
      ruleId: "BERN-C01",
      status: "PASS",
      message: `All ${concepts.length} concept(s) stay within the spec's ${specClassRaw} vehicle class.`,
      sourceWasMock: false,
    };
  }
  const chosen = chosenConceptName(input);
  const topOff = off.some((c) => c.name === chosen);
  return {
    ruleId: "BERN-C01",
    status: "WARN",
    message: `${off.length} of ${concepts.length} concept(s) depart from the spec's ${specClassRaw} class: ${off
      .map((c) => `"${c.name}" (${c.vehicleClass})`)
      .join(", ")}${topOff ? " -- including the chosen concept" : ""}.`,
    sourceWasMock: false,
  };
}

// -- BERN-C02: per-concept speed feasibility (hard gate) --------------------

// Same Range / Endurance -> average speed derivation as BERN-M01, applied to
// each concept's own vehicle class instead of the spec's.
type ConceptSpeedRow = { name: string; vehicleClass: string; ceilingKmh: number; feasible: boolean };
type ConceptSpeedFindings =
  | { kind: "info"; message: string }
  | { kind: "ok"; avgKmh: number; concepts: ConceptSpeedRow[] };

function computeConceptSpeedFindings(input: BernoulliConceptCheckInput): ConceptSpeedFindings {
  const rangeKpi = findKpi(input.kpis, "range");
  const enduranceKpi = findKpi(input.kpis, "endurance", "flight time");
  if (!rangeKpi || !enduranceKpi) {
    return {
      kind: "info",
      message: "Not enough data to check -- the source mission spec doesn't carry both a Range and an Endurance KPI.",
    };
  }
  const rangeVal = parseLeadingNumber(rangeKpi.target);
  const enduranceVal = parseLeadingNumber(enduranceKpi.target);
  if (rangeVal === null || enduranceVal === null || enduranceVal <= 0) {
    return { kind: "info", message: "Range or Endurance KPI value couldn't be parsed as a number -- skipped." };
  }
  const rangeFamily = unitFamily(rangeKpi.unit);
  if (rangeFamily && rangeFamily !== "distance") {
    return {
      kind: "info",
      message: `Range KPI's unit ("${rangeKpi.unit}") doesn't read as a distance -- can't derive an average speed.`,
    };
  }
  const concepts = conceptsInRankOrder(input);
  if (concepts.length === 0) return { kind: "info", message: "No concepts on this run to check." };
  const avgKmh = rangeVal / timeToHours(enduranceVal, enduranceKpi.unit);
  return {
    kind: "ok",
    avgKmh,
    concepts: concepts.map((c) => {
      const ceilingKmh = VEHICLE_CLASS_MAX_SPEED_KMH[normalizeVehicleClass(c.vehicleClass) ?? ""] ?? 300;
      return { ...c, ceilingKmh, feasible: avgKmh <= ceilingKmh };
    }),
  };
}

function describeSpeedRow(c: ConceptSpeedRow): string {
  return `"${c.name}" (${c.vehicleClass || "class unknown"}, ~${c.ceilingKmh} km/h)`;
}

function checkConceptSpeedFeasibility(input: BernoulliConceptCheckInput): BernoulliCheckResult {
  const f = computeConceptSpeedFindings(input);
  if (f.kind === "info") return { ruleId: "BERN-C02", status: "INFO", message: f.message, sourceWasMock: false };
  const avg = Math.round(f.avgKmh);
  const infeasible = f.concepts.filter((c) => !c.feasible);
  if (infeasible.length === 0) {
    const slowest = Math.min(...f.concepts.map((c) => c.ceilingKmh));
    return {
      ruleId: "BERN-C02",
      status: "PASS",
      message: `Range/Endurance need ~${avg} km/h average; every concept's vehicle class can reach that (lowest ceiling ~${slowest} km/h).`,
      sourceWasMock: false,
    };
  }
  const chosen = chosenConceptName(input);
  const top = f.concepts.find((c) => c.name === chosen) ?? f.concepts[0];
  if (!top.feasible) {
    const others = infeasible.filter((c) => c.name !== top.name);
    return {
      ruleId: "BERN-C02",
      status: "FAIL",
      message: `The chosen concept ${describeSpeedRow(top)} can't fly the ~${avg} km/h average the mission's range/endurance need${
        others.length > 0 ? `; also short: ${others.map(describeSpeedRow).join(", ")}` : ""
      }.`,
      sourceWasMock: false,
    };
  }
  return {
    ruleId: "BERN-C02",
    status: "WARN",
    message: `${infeasible.length} concept(s) other than the chosen one can't reach the ~${avg} km/h average needed: ${infeasible
      .map(describeSpeedRow)
      .join(", ")}.`,
    sourceWasMock: false,
  };
}

// -- BERN-C03: ranking coherence (deterministic) ----------------------------

const CONCEPT_FIT_TIER: Record<string, number> = { pass: 0, partial: 1, fail: 2 };

function checkConceptRankingCoherence(input: BernoulliConceptCheckInput): BernoulliCheckResult {
  const ranked = [...input.rankedConcepts].sort((a, b) => a.rank - b.rank);
  if (ranked.length === 0) {
    return { ruleId: "BERN-C03", status: "INFO", message: "No ranked concepts on this run to check.", sourceWasMock: false };
  }
  const issues: string[] = [];
  for (let i = 1; i < ranked.length; i++) {
    const prev = ranked[i - 1];
    const cur = ranked[i];
    if ((CONCEPT_FIT_TIER[prev.constraintFit] ?? 1) > (CONCEPT_FIT_TIER[cur.constraintFit] ?? 1)) {
      issues.push(
        `#${prev.rank} "${prev.conceptName}" (${prev.constraintFit}) is ranked above #${cur.rank} "${cur.conceptName}" (${cur.constraintFit})`,
      );
    }
  }
  for (const r of ranked) {
    if (!Number.isFinite(r.fitScore) || r.fitScore < 1 || r.fitScore > 10) {
      issues.push(`"${r.conceptName}" has a fit score of ${r.fitScore}, outside 1-10`);
    }
  }
  const chosenRanked = ranked.find((r) => r.conceptName === chosenConceptName(input)) ?? ranked[0];
  if (chosenRanked.constraintFit === "fail") {
    issues.push(`the chosen concept "${chosenRanked.conceptName}" fails the mission's constraints`);
  }
  // A trade-off "pass" that the physics contradicts is the most useful thing
  // to surface: Concept Agent's own LLM judged it a fit, C02 shows it can't
  // actually fly the mission.
  const speed = computeConceptSpeedFindings(input);
  if (speed.kind === "ok") {
    const infeasible = new Set(speed.concepts.filter((c) => !c.feasible).map((c) => c.name));
    for (const r of ranked) {
      if (r.constraintFit === "pass" && infeasible.has(r.conceptName)) {
        issues.push(`"${r.conceptName}" is marked a constraint "pass" but can't reach the required average speed (see BERN-C02)`);
      }
    }
  }
  if (issues.length === 0) {
    return {
      ruleId: "BERN-C03",
      status: "PASS",
      message: `Ranking is consistent: ${ranked.length} concept(s) ordered by constraint fit, scores within 1-10, no "pass" contradicted by the speed check.`,
      sourceWasMock: false,
    };
  }
  return { ruleId: "BERN-C03", status: "WARN", message: `${issues.join("; ")}.`, sourceWasMock: false };
}

// -- BERN-C04: per-concept physical feasibility (TorqWings AI call) ---------

const C04_SYSTEM = `You are Bernoulli Agent's physics-plausibility reviewer for TorqWings' aerospace design platform, reviewing the candidate vehicle concepts Concept Agent generated for a mission, before one is carried into detailed design. For each concept, judge whether its vehicle class and described configuration can physically meet the mission's Payload, Endurance and Range KPIs: estimate the implied power draw and battery mass fraction for that class against the reference ranges below, and say whether it fits. You are also given each concept's own trade-off verdict (constraint fit pass/partial/fail and fit score, from Concept Agent's own reasoning) and the findings of the deterministic checks already run -- call out explicitly any concept whose trade-off verdict claims a fit the physics doesn't support, especially the one marked CHOSEN (the concept the user picked to carry into detailed design). Use FAIL only if the CHOSEN concept is physically implausible; WARN if only other concepts are, or if the inputs are too underconstrained to judge confidently; PASS if every concept is plausible.

${AEROSPACE_BENCHMARKS}

This is an engineering judgment call, not a certified analysis -- ground it in the given numbers and the reference ranges above, don't invent specifics not present in the input. Return JSON only: { "status": "PASS | WARN | FAIL", "message": "one or two sentences naming the concept(s) at issue", "reasoning": "one short line per concept -- name: estimate, reference range used, verdict" }.

${TARGETS_NOTE}`;

async function checkConceptPhysicalFeasibility(
  input: BernoulliConceptCheckInput,
  priorChecks: BernoulliCheckResult[],
): Promise<BernoulliCheckResult> {
  const concepts = conceptsInRankOrder(input);
  if (concepts.length === 0) {
    return { ruleId: "BERN-C04", status: "INFO", message: "No concepts on this run to check.", sourceWasMock: false };
  }
  if (!findKpi(input.kpis, "payload") && !findKpi(input.kpis, "endurance", "flight time")) {
    return {
      ruleId: "BERN-C04",
      status: "INFO",
      message: "Not enough data to check -- the source mission spec carries neither a Payload nor an Endurance KPI.",
      sourceWasMock: false,
    };
  }

  const conceptLines = concepts
    .map((c, i) => {
      const cand = input.candidates.find((x) => x.conceptName === c.name);
      const ranked = input.rankedConcepts.find((r) => r.conceptName === c.name);
      const fit = ranked ? ` | trade-off verdict: ${ranked.constraintFit}, fit score ${ranked.fitScore}/10` : "";
      return `#${ranked?.rank ?? i + 1} ${c.name}${conceptLabel(input, c.name)} (${c.vehicleClass || "class unknown"}): ${cand?.description ?? ""}${fit}`;
    })
    .join("\n");
  const priorFindings = priorChecks
    .filter((c) => c.status !== "INFO")
    .map((c) => `${c.ruleId} (${c.status}): ${c.message}`)
    .join("\n");

  const userContent = `Mission vehicle class: ${input.missionSpecs.vehicleClass ?? "unspecified"}
Mission type: ${input.missionSpecs.missionType}
Mission KPIs: ${input.kpis.length > 0 ? input.kpis.map((k) => `${k.name}: ${k.target} ${k.unit}`).join("; ") : "none"}
Mission constraints: ${input.constraints.length > 0 ? input.constraints.map((c) => `${c.name}: ${c.value}`).join("; ") : "none"}
Candidate concepts, in rank order:
${conceptLines}
Findings from this review's deterministic checks:
${priorFindings || "(none ran, or all were not-applicable)"}`;

  const { content, usage, provider } = await callLlmGateway(C04_SYSTEM, userContent, { jsonMode: true });
  if (!content) return mockC04();

  try {
    const obj = JSON.parse(stripJsonFences(content));
    if (
      typeof obj !== "object" ||
      obj === null ||
      (obj.status !== "PASS" && obj.status !== "WARN" && obj.status !== "FAIL") ||
      typeof obj.message !== "string"
    ) {
      return mockC04();
    }
    return {
      ruleId: "BERN-C04",
      status: obj.status,
      message: obj.message,
      sourceWasMock: false,
      reasoning: typeof obj.reasoning === "string" ? obj.reasoning : undefined,
      targets: parseTargets(obj.targets),
      usage: usage ?? undefined,
      provider: provider ?? undefined,
    };
  } catch {
    return mockC04();
  }
}

function mockC04(): BernoulliCheckResult {
  return {
    ruleId: "BERN-C04",
    status: "INFO",
    message: "Couldn't reach TorqWings AI to judge the concepts' physical feasibility -- no live reply.",
    sourceWasMock: true,
  };
}

// -- concept orchestrator -----------------------------------------------------

const CONCEPT_RULE_IMPLS: Record<string, CheckImpl<BernoulliConceptCheckInput>> = {
  "BERN-C01": (i) => checkConceptVehicleClass(i),
  "BERN-C02": (i) => checkConceptSpeedFeasibility(i),
  "BERN-C03": (i) => checkConceptRankingCoherence(i),
  "BERN-C04": (i, prior) => checkConceptPhysicalFeasibility(i, prior),
};

function describeConceptInput(input: BernoulliConceptCheckInput): string {
  const concepts = conceptsInRankOrder(input)
    .map((c, i) => {
      const cand = input.candidates.find((x) => x.conceptName === c.name);
      const ranked = input.rankedConcepts.find((r) => r.conceptName === c.name);
      const fit = ranked ? ` | trade-off verdict: ${ranked.constraintFit}, fit score ${ranked.fitScore}/10` : "";
      return `#${ranked?.rank ?? i + 1} ${c.name}${conceptLabel(input, c.name)} (${c.vehicleClass || "class unknown"}): ${cand?.description ?? ""}${fit}`;
    })
    .join("\n");
  return `${describeMissionInput(input)}
Candidate concepts generated for this mission, in rank order:
${concepts || "(none)"}`;
}

function conceptNames(input: BernoulliConceptCheckInput): NameIndex {
  return { ...missionNames(input), concept: input.candidates.map((c) => c.conceptName) };
}

export async function runBernoulliConceptChecks(
  input: BernoulliConceptCheckInput,
  rules: BernoulliRuleDef[],
  onProgress?: ProgressFn,
): Promise<BernoulliReviewResult> {
  return runRegisteredChecks(input, rules, CONCEPT_RULE_IMPLS, describeConceptInput, conceptNames, onProgress);
}

export async function testConceptRule(
  input: BernoulliConceptCheckInput,
  rule: BernoulliRuleDef,
  allRules: BernoulliRuleDef[],
): Promise<BernoulliCheckResult> {
  return testRegisteredRule(input, rule, allRules, CONCEPT_RULE_IMPLS, describeConceptInput, conceptNames);
}
