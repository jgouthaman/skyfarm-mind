// Manual verification script for missionSpecAssembly.ts — pure,
// deterministic, no LLM. Run directly:
//
//   node src/lib/the-hangar/missionSpecAssembly.manualtest.ts
import { assembleMissionSpecs, finalizeConstraints, finalizeKpis } from "./missionSpecAssembly.ts";
import type { TracedConstraint } from "./constraintIdentification.ts";
import type { DerivedKpi, PrioritizedTradeoff } from "./types/hangar-mission.ts";

let passCount = 0;
let failCount = 0;

function check(name: string, actual: unknown, expected: unknown): void {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}`);
  console.log(`      expected: ${JSON.stringify(expected)}`);
  console.log(`      actual:   ${JSON.stringify(actual)}`);
  if (pass) passCount++;
  else failCount++;
}

console.log("--- assembleMissionSpecs (Step 1) ---");

check(
  "crop + fixed-wing decomposed elements -> AgriSky / Fixed-wing / capitalized mission type",
  assembleMissionSpecs({
    detectedIntent: "irrelevant fallback",
    decomposedElements: ["aerial crop health monitoring", "fixed-wing platform class"],
    operatingEnvironment: "Agricultural / rural",
  }),
  {
    domain: "UAV",
    vertical: "AgriSky",
    vehicleClass: "Fixed-wing",
    missionType: "Aerial crop health monitoring",
    phase: "Conceptual",
    operatingEnvironment: "Agricultural / rural",
  },
);

check(
  "no decomposed elements -> falls back to capitalized detectedIntent, no vertical/vehicleClass",
  assembleMissionSpecs({ detectedIntent: "crop survey mission", decomposedElements: [] }),
  {
    domain: "UAV",
    vertical: null,
    vehicleClass: null,
    missionType: "Crop survey mission",
    phase: "Conceptual",
    operatingEnvironment: null,
  },
);

console.log("\n--- finalizeConstraints (Step 2) ---");

check(
  "same name, same value -> merged into one entry, sources combined",
  finalizeConstraints([
    { name: "Registration", value: "required", source: "regulation", sourceLabel: "REG-003" },
    { name: "registration", value: "required", source: "inferred", sourceLabel: "Stage 2.1 hint" },
  ]),
  [{ name: "Registration", value: "required", sources: ["REG-003", "Stage 2.1 hint"] }],
);

check(
  "same name, conflicting numeric values -> keeps the more restrictive (lower) one",
  finalizeConstraints([
    { name: "Max altitude", value: "150m", source: "regulation", sourceLabel: "REG-002" },
    { name: "Max altitude", value: "122m", source: "regulation", sourceLabel: "REG-001" },
  ]),
  [{ name: "Max altitude", value: "122m", sources: ["REG-002", "REG-001"] }],
);

check(
  "same name, non-numeric conflicting values -> deterministic first-value fallback, both sources kept",
  finalizeConstraints([
    { name: "VLOS required", value: "true", source: "regulation", sourceLabel: "REG-001" },
    {
      name: "VLOS required",
      value: "conditional",
      source: "inferred",
      sourceLabel: "LLM inference (Stage 2.2)",
    },
  ]),
  [{ name: "VLOS required", value: "true", sources: ["REG-001", "LLM inference (Stage 2.2)"] }],
);

check(
  "distinct constraints stay distinct",
  finalizeConstraints([
    { name: "Max altitude", value: "122m", source: "regulation", sourceLabel: "REG-001" },
    { name: "Registration", value: "required", source: "regulation", sourceLabel: "REG-003" },
  ]).map((c) => c.name),
  ["Max altitude", "Registration"],
);

console.log("\n--- finalizeKpis (Step 3) ---");

const KPIS: DerivedKpi[] = [
  { name: "Payload", target: "25", unit: "kg" },
  { name: "Range", target: "40", unit: "km" },
  { name: "Cost", target: "450000", unit: "INR" },
];

const GATE_TIER_CONSTRAINTS: TracedConstraint[] = [
  { name: "Max payload weight", value: "25kg", source: "regulation", sourceLabel: "REG-003" },
];

// Mirrors what tradeoffPrioritization.ts's prioritizeTradeoffs would
// actually produce for these KPIs (Range=performance 35%, Cost=cost 30%),
// hand-built here to keep this test independent of that module's output.
const PRIORITIZED_TRADEOFFS: PrioritizedTradeoff[] = [
  {
    item: "Max payload weight: 25kg",
    rationale: "Gate tier — regulatory compliance constraint, never traded away against anything.",
  },
  {
    item: "Range (target: 40 km)",
    rationale: "Performance (range, endurance, altitude) — 35% default weight.",
  },
  { item: "Cost (target: 450000 INR)", rationale: "Cost — 30% default weight." },
];

const finalizedKpis = finalizeKpis(KPIS, PRIORITIZED_TRADEOFFS, GATE_TIER_CONSTRAINTS);

check(
  "Payload backed by a gate-tier (regulation) constraint -> priority critical",
  finalizedKpis.find((k) => k.name === "Payload")?.priority,
  "critical",
);

check(
  "Range not backed by any gate-tier constraint -> gets its score-tier rank (1)",
  finalizedKpis.find((k) => k.name === "Range")?.priority,
  1,
);

check(
  "Cost not backed by any gate-tier constraint -> gets its score-tier rank (2)",
  finalizedKpis.find((k) => k.name === "Cost")?.priority,
  2,
);

console.log(`\n${passCount} passed, ${failCount} failed`);
if (failCount > 0) process.exit(1);
