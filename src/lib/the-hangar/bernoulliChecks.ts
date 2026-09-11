import { callLlmGateway, stripJsonFences } from "./llmGateway.ts";
import type { FinalizedConstraint, FinalizedKpi, MissionSpecsFields } from "./missionSpecAssembly.ts";

// Bernoulli Agent -- Mission Agent (B01) spec review checks (BERN-M01
// through BERN-M05), per "Ask Bernoulli — Mission Spec Review
// Implementation Spec" §4. Table/route naming in this codebase uses the
// "Bernoulli" rebrand throughout (matches every other Bernoulli file
// already built this session) rather than the doc's alternate
// `physics`-prefixed naming -- the doc itself says the logic doesn't
// change either way.
//
// M01 and M05 are the hard-gate checks (a FAIL on either fails the whole
// review); M02-M04 can only WARN. This mirrors every other bay's
// deterministic-gate-then-reasoning split, just expressed as five
// independent checks instead of one gate + one generation call, since
// that's the shape the spec's report UI (one row per check) needs.

export type BernoulliCheckStatus = "PASS" | "WARN" | "FAIL" | "INFO";

export interface BernoulliCheckResult {
  ruleId: string;
  status: BernoulliCheckStatus;
  message: string;
  sourceWasMock: boolean;
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

// -- BERN-M03: payload/endurance/vehicle-class plausibility (Claude call) ---

const M03_SYSTEM = `You are Bernoulli Agent's physics-plausibility reviewer for TorqWings' aerospace design platform. Given a mission's vehicle class, payload KPI, and endurance KPI, judge whether the combination is physically plausible for that vehicle class using general aerospace engineering knowledge (typical payload-to-endurance trade-offs for the given class). This is an engineering judgment call, not a certified analysis -- ground it in the given numbers, don't invent specifics not present in the input. Return JSON only: { "status": "PASS | WARN | FAIL", "message": "one or two sentences" }.`;

async function checkPayloadEndurancePlausibility(
  input: BernoulliCheckInput,
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

  const userContent = `Vehicle class: ${input.missionSpecs.vehicleClass ?? "unknown"}
Mission type: ${input.missionSpecs.missionType}
Payload KPI: ${payloadKpi.target} ${payloadKpi.unit}
Endurance KPI: ${enduranceKpi.target} ${enduranceKpi.unit}`;

  const { content } = await callLlmGateway(M03_SYSTEM, userContent, { jsonMode: true });
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
    return { ruleId: "BERN-M03", status: obj.status, message: obj.message, sourceWasMock: false };
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

  // Deterministic checks first -- cheap, no network round-trip.
  if (wants("BERN-M01")) checks.push(checkSpeedConsistency(input));
  if (wants("BERN-M02")) checks.push(checkCoverageMath(input));
  if (wants("BERN-M05")) checks.push(checkDimensionalConsistency(input));
  if (wants("BERN-M04")) checks.push(checkKpiProvenance(input));

  // Claude-backed check last -- the only one that blocks on the network.
  if (wants("BERN-M03")) checks.push(await checkPayloadEndurancePlausibility(input));

  return {
    verdict: computeVerdict(checks),
    checks,
    confidenceScore: computeConfidenceScore(checks),
  };
}
