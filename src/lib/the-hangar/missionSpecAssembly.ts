import { formatKpiItem, isGateTierConstraint } from "./tradeoffPrioritization.ts";
import type { TracedConstraint } from "./constraintIdentification.ts";
import type { DerivedKpi, PrioritizedTradeoff } from "./types/hangar-mission";

// Stage 2.3, Steps 1-3 (MissionAgent.md Section 4.3.1) — deterministic
// assembly, no LLM. Step 4 (summary, LLM) lives in missionSummary.ts, and
// Step 5 (confidence score) in confidenceScore.ts, since each needs inputs
// this module doesn't take (finished output for the summary; Stage 2.1
// source/validation data for confidence).

export interface FinalizedConstraint {
  name: string;
  value: string;
  sources: string[];
}

export type KpiPriority = "critical" | number;

export interface FinalizedKpi {
  name: string;
  target: string;
  unit: string;
  priority: KpiPriority;
}

export interface MissionSpecsFields {
  domain: string;
  vertical: string | null;
  vehicleClass: string | null;
  missionType: string;
  phase: string;
  operatingEnvironment: string | null;
}

// ── Step 1 — Assemble Mission Specification ──
//
// Judgment call: this project's own domain rules (domainRules.ts, DOM-001–
// DOM-004) each imply a "vertical" label alongside a constraint — that
// half was deliberately NOT emitted as a constraint in Stage 2.2 (see
// domainRules.ts's header comment) because Section 11's example shows the
// vertical landing in mission_specs.vertical, not identified_constraints.
// This is that landing spot — the same keyword groups, reapplied here.

const VERTICAL_KEYWORDS: { vertical: string; keywords: string[] }[] = [
  { vertical: "AgriSky", keywords: ["crop", "agricultur", "farm"] },
  { vertical: "GuardSky", keywords: ["perimeter", "security", "surveillance"] },
  { vertical: "InfraSky", keywords: ["pipeline", "infrastructure", "inspection"] },
  { vertical: "GeoSky", keywords: ["mapping", "survey", "terrain"] },
];

const VEHICLE_CLASS_KEYWORDS: { vehicleClass: string; keywords: string[] }[] = [
  { vehicleClass: "Fixed-wing", keywords: ["fixed-wing", "fixed wing"] },
  { vehicleClass: "Multirotor", keywords: ["multirotor", "multi-rotor", "quadcopter", "rotary"] },
  { vehicleClass: "VTOL Hybrid", keywords: ["vtol", "hybrid"] },
];

function detectFromElements<T extends { keywords: string[] }>(
  decomposedElements: string[],
  table: T[],
  pick: (entry: T) => string,
): string | null {
  const text = decomposedElements.join(" ").toLowerCase();
  const match = table.find((entry) => entry.keywords.some((k) => text.includes(k)));
  return match ? pick(match) : null;
}

function capitalize(text: string): string {
  return text.length === 0 ? text : text[0].toUpperCase() + text.slice(1);
}

export interface AssembleMissionSpecsInput {
  detectedIntent: string;
  decomposedElements: string[];
  operatingEnvironment?: string | null;
}

export function assembleMissionSpecs(input: AssembleMissionSpecsInput): MissionSpecsFields {
  return {
    // "UAV" is TorqWings' platform throughout the doc — no other domain
    // signal exists anywhere in the pipeline to derive this from per-mission.
    domain: "UAV",
    vertical: detectFromElements(input.decomposedElements, VERTICAL_KEYWORDS, (e) => e.vertical),
    vehicleClass: detectFromElements(
      input.decomposedElements,
      VEHICLE_CLASS_KEYWORDS,
      (e) => e.vehicleClass,
    ),
    missionType: input.decomposedElements[0]
      ? capitalize(input.decomposedElements[0])
      : capitalize(input.detectedIntent),
    // Every MissionSpec example in the doc uses "Conceptual" — Mission
    // Agent (Bay 01) is always the earliest stage, and no phase field
    // exists anywhere upstream in this pipeline to source this from.
    phase: "Conceptual",
    operatingEnvironment: input.operatingEnvironment ?? null,
  };
}

// ── Step 2 — Finalize Constraints List ──
//
// Dedup rule (Section 4.3.1): "when two rules produce a constraint on the
// same field ... keep the more restrictive value ... and merge the
// contributing rule IDs into one sources[] array on the surviving entry."
// This is a SEPARATE, later dedup pass from Stage 2.2's constraint_hints
// dedup (constraintIdentification.ts's dedupeConstraintHints) — that pass
// collapsed near-duplicate WORDING against domain rules before the LLM
// call ran; this pass resolves genuinely CONFLICTING VALUES across
// multiple already-distinct constraints that happen to describe the same
// field (e.g. two different altitude limits from two different rules).

function parseLeadingNumber(text: string): number | null {
  const match = text.match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function normalizeConstraintName(name: string): string {
  return name.trim().toLowerCase();
}

export function finalizeConstraints(constraints: TracedConstraint[]): FinalizedConstraint[] {
  const groups = new Map<string, TracedConstraint[]>();
  for (const c of constraints) {
    const key = normalizeConstraintName(c.name);
    const list = groups.get(key) ?? [];
    list.push(c);
    groups.set(key, list);
  }

  const finalized: FinalizedConstraint[] = [];
  for (const group of groups.values()) {
    const sources = group.map((c) => c.sourceLabel);
    const distinctValues = [...new Set(group.map((c) => c.value))];

    if (distinctValues.length === 1) {
      finalized.push({ name: group[0].name, value: group[0].value, sources });
      continue;
    }

    // Distinct values on the same field. Try a numeric restrictiveness
    // comparison — lower = more restrictive/safer, per the doc's own
    // examples ("lower altitude ceiling, lower payload weight"). No
    // "higher is more restrictive" case is documented anywhere in the
    // spec, so that direction isn't modeled. Falls back to the
    // first-encountered value, deterministically, when values aren't
    // numerically comparable (e.g. "required" vs. "true") — every
    // contributing source still lands in sources[], nothing is silently
    // dropped even when only one value can "win".
    const withNumbers = group.map((c) => ({ c, n: parseLeadingNumber(c.value) }));
    const allNumeric = withNumbers.every((x) => x.n !== null);

    const winner = allNumeric
      ? withNumbers.reduce((min, cur) => (cur.n! < min.n! ? cur : min)).c
      : group[0];

    finalized.push({ name: winner.name, value: winner.value, sources });
  }

  return finalized;
}

// ── Step 3 — Finalize KPIs & Targets ──
//
// "A KPI backed by a gate-tier constraint (safety, regulatory) gets
// priority: 'critical'; everything else gets the rank order from the score
// tier." "Backed by" is a keyword-substring check against gate-tier
// constraints specifically (not all constraints) — e.g. a "Payload" KPI
// matches a "Max payload weight" constraint, but doesn't match "Max
// altitude", so Range/Endurance correctly stay rank-ordered instead of
// picking up "critical" just because SOME regulation constraint exists.

export function finalizeKpis(
  derivedKpis: DerivedKpi[],
  prioritizedTradeoffs: PrioritizedTradeoff[],
  identifiedConstraints: TracedConstraint[],
): FinalizedKpi[] {
  const gateTierConstraints = identifiedConstraints.filter(isGateTierConstraint);

  // prioritizedTradeoffs = [...gateTier, ...scoreTier] (tradeoffPrioritization.ts).
  // scoreTierItems recovers just the KPI-derived portion, in rank order.
  const scoreTierItems = prioritizedTradeoffs.filter((t) =>
    derivedKpis.some((k) => formatKpiItem(k) === t.item),
  );

  return derivedKpis.map((kpi) => {
    const backedByGateTier = gateTierConstraints.some((c) =>
      `${c.name} ${c.value}`.toLowerCase().includes(kpi.name.toLowerCase()),
    );

    if (backedByGateTier) {
      return { name: kpi.name, target: kpi.target, unit: kpi.unit, priority: "critical" };
    }

    const rank = scoreTierItems.findIndex((t) => t.item === formatKpiItem(kpi));
    return {
      name: kpi.name,
      target: kpi.target,
      unit: kpi.unit,
      priority: rank >= 0 ? rank + 1 : scoreTierItems.length + 1,
    };
  });
}
