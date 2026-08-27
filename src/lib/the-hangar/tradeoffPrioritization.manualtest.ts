// Manual verification script for tradeoffPrioritization.ts — pure,
// deterministic, no LLM. Run directly:
//
//   node src/lib/the-hangar/tradeoffPrioritization.manualtest.ts
import { prioritizeTradeoffs } from "./tradeoffPrioritization.ts";
import type { DerivedKpi, IdentifiedConstraint } from "./types/hangar-mission.ts";

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

const KPIS: DerivedKpi[] = [
  { name: "Schedule", target: "8", unit: "weeks" },
  { name: "Payload", target: "25", unit: "kg" },
  { name: "Cost", target: "450000", unit: "INR" },
  { name: "Range", target: "40", unit: "km" },
];

const CONSTRAINTS: IdentifiedConstraint[] = [
  { name: "Max altitude", value: "122m AGL", source: "regulation" },
  { name: "Population density", value: "safety constraint applies", source: "user" },
  { name: "Component sourcing", value: "cost-conscious — COTS preference", source: "user" },
];

console.log("--- gate tier ---");

const defaultResult = prioritizeTradeoffs({
  identifiedConstraints: CONSTRAINTS,
  derivedKpis: KPIS,
});

check(
  "gate tier constraints (regulation + safety) appear first, in order",
  defaultResult.slice(0, 2).map((t) => t.item),
  ["Max altitude: 122m AGL", "Population density: safety constraint applies"],
);

check(
  "non-safety, non-regulation constraint (cost sourcing) is NOT in the gate tier",
  defaultResult.some((t) => t.item === "Component sourcing: cost-conscious — COTS preference"),
  false,
);

console.log("\n--- score tier, default weights (no override) ---");

check(
  "KPIs ranked Performance(35%) > Cost(30%) > Payload(20%) > Schedule(15%)",
  defaultResult.slice(2).map((t) => t.item.split(" (")[0]),
  ["Range", "Cost", "Payload", "Schedule"],
);

console.log("\n--- override rule: doc's own example ---");
console.log('Signal: "Cost is not a concern, we need maximum range for this mission."');

const overrideResult = prioritizeTradeoffs({
  identifiedConstraints: CONSTRAINTS,
  derivedKpis: KPIS,
  prioritySignals: ["Cost is not a concern, we need maximum range for this mission."],
});

check(
  "with the override signal, Range now ranks first among score-tier items (ahead of default-weighted Cost)",
  overrideResult.slice(2, 3).map((t) => t.item.split(" (")[0]),
  ["Range"],
);

check(
  "Cost drops to last among score-tier items once deprioritized",
  overrideResult.slice(-1).map((t) => t.item.split(" (")[0]),
  ["Cost"],
);

check(
  "Range's rationale cites the actual override signal, not a generic label",
  overrideResult
    .find((t) => t.item.startsWith("Range"))
    ?.rationale.includes("Cost is not a concern, we need maximum range"),
  true,
);

console.log("\n--- uncategorized KPI ---");
const uncategorizedResult = prioritizeTradeoffs({
  identifiedConstraints: [],
  derivedKpis: [{ name: "Sensor resolution", target: "12", unit: "MP" }],
});
check(
  "KPI matching no category keyword still appears, ranked with an explanatory rationale",
  uncategorizedResult[0]?.rationale,
  "Uncategorized KPI — no default weighting bucket matched; ranked last among score-tier items.",
);

console.log(`\n${passCount} passed, ${failCount} failed`);
if (failCount > 0) process.exit(1);
