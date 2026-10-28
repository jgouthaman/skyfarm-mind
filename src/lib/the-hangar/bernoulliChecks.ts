import { callLlmGateway, stripJsonFences, type LlmProvider, type LlmUsage } from "./llmGateway.ts";
import { estimateCostUsd } from "./missionUsage.ts";
import type { FinalizedConstraint, FinalizedKpi, MissionSpecsFields } from "./missionSpecAssembly.ts";

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
  // Real token usage + which provider answered -- set only when an LLM
  // check (M03, M06) got a genuine reply (not mock, not INFO). Mirrors
  // Bay 01's own per-stage usage shape (missionUsage.ts) so the telemetry
  // table/bar can be built the same way for both bays.
  usage?: LlmUsage;
  provider?: LlmProvider;
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

This is an engineering judgment call, not a certified analysis -- ground it in the given numbers and the reference ranges above, don't invent specifics not present in the input. Return JSON only: { "status": "PASS | WARN | FAIL", "message": "one or two sentences", "reasoning": "the calculation/logic behind the verdict -- show what you estimated and against what reference range, 2-4 sentences" }.`;

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

Return JSON only: { "status": "PASS | WARN | FAIL", "message": "one or two sentences", "reasoning": "your estimate -- implied power draw, required energy, implied battery mass fraction, and which reference range(s) you checked it against, 2-4 sentences" }.`;

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

// -- orchestrator -------------------------------------------------------------

export interface BernoulliReviewResult {
  verdict: "PASS" | "WARN" | "FAIL";
  checks: BernoulliCheckResult[];
  confidenceScore: number;
}

const HARD_GATE_RULE_IDS = new Set(["BERN-M01", "BERN-M05"]);

function computeVerdict(checks: BernoulliCheckResult[]): "PASS" | "WARN" | "FAIL" {
  if (checks.some((c) => c.status === "FAIL" && HARD_GATE_RULE_IDS.has(c.ruleId))) return "FAIL";
  if (checks.some((c) => c.status === "WARN" || (c.status === "FAIL" && !HARD_GATE_RULE_IDS.has(c.ruleId)))) {
    return "WARN";
  }
  return "PASS";
}

// Weighted average -- hard-gate rules (M01/M05) count double, since they're
// the checks that can fail the whole review. INFO checks (not applicable /
// not enough data) are excluded from the average entirely rather than
// penalizing a spec for not carrying fields Bernoulli can't check.
function computeConfidenceScore(checks: BernoulliCheckResult[]): number {
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
    const weight = HARD_GATE_RULE_IDS.has(c.ruleId) ? 2 : 1;
    weightedSum += score * weight;
    totalWeight += weight;
    if (c.sourceWasMock) weightedSum -= 0.15 * weight; // still counted, just penalized
  }
  if (totalWeight === 0) return 0.5; // every check was INFO -- nothing concrete to score
  return Math.max(0, Math.min(1, weightedSum / totalWeight));
}

export async function runBernoulliChecks(
  input: BernoulliCheckInput,
  checksRequested: string[],
): Promise<BernoulliReviewResult> {
  const wants = (id: string) => checksRequested.includes(id);
  const checks: BernoulliCheckResult[] = [];

  // Deterministic checks first -- cheap, no network round-trip, and their
  // results are what make M03's LLM judgment context-aware instead of
  // isolated (see checkPayloadEndurancePlausibility's doc comment).
  if (wants("BERN-M01")) checks.push(checkSpeedConsistency(input));
  if (wants("BERN-M02")) checks.push(checkCoverageMath(input));
  if (wants("BERN-M05")) checks.push(checkDimensionalConsistency(input));
  if (wants("BERN-M04")) checks.push(checkKpiProvenance(input));

  // Claude-backed checks last -- the only ones that block on the network,
  // and the only ones that benefit from seeing what the checks above found.
  // M06 runs after M03 so it can also see M03's payload/endurance verdict,
  // not just the four deterministic ones.
  if (wants("BERN-M03")) checks.push(await checkPayloadEndurancePlausibility(input, checks));
  if (wants("BERN-M06")) checks.push(await checkEnergyPowerPlausibility(input, checks));

  return {
    verdict: computeVerdict(checks),
    checks,
    confidenceScore: computeConfidenceScore(checks),
  };
}
