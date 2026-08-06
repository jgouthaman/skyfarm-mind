// Manual verification script for confidenceScore.ts — pure, deterministic,
// no LLM. Run directly:
//
//   node src/lib/the-hangar/confidenceScore.manualtest.ts
import { computeConfidenceScore } from "./confidenceScore.ts";

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

// Full source completeness (3+ sources), full field completeness (payload +
// range + endurance all present), no validation flags -> the formula's
// mathematical ceiling: 0.4*1 + 0.4*1 - 0 = 0.8.
check(
  "3 sources, all 3 core KPI fields present, 0 flags -> 0.8 (formula's max)",
  computeConfidenceScore({
    sourceTypesUsedCount: 3,
    derivedKpis: [
      { name: "Payload", target: "25", unit: "kg" },
      { name: "Range", target: "40", unit: "km" },
      { name: "Endurance", target: "90", unit: "min" },
    ],
    validationFlagCount: 0,
  }),
  0.8,
);

check(
  "1 source (of 3 needed for full), 0 core fields, 0 flags -> 0.4 * (1/3) = 0.1333...",
  computeConfidenceScore({ sourceTypesUsedCount: 1, derivedKpis: [], validationFlagCount: 0 }),
  0.4 * (1 / 3),
);

check(
  "sources beyond 3 don't push source_completeness past 1 (min() cap)",
  computeConfidenceScore({ sourceTypesUsedCount: 6, derivedKpis: [], validationFlagCount: 0 }),
  computeConfidenceScore({ sourceTypesUsedCount: 3, derivedKpis: [], validationFlagCount: 0 }),
);

check(
  "each validation flag subtracts exactly 0.05",
  computeConfidenceScore({ sourceTypesUsedCount: 3, derivedKpis: [], validationFlagCount: 2 }) +
    0.1,
  computeConfidenceScore({ sourceTypesUsedCount: 3, derivedKpis: [], validationFlagCount: 0 }),
);

check(
  "score never goes negative even with a large flag count",
  computeConfidenceScore({ sourceTypesUsedCount: 0, derivedKpis: [], validationFlagCount: 100 }),
  0,
);

check(
  "partial field completeness: only payload present -> field_completeness = 1/3",
  computeConfidenceScore({
    sourceTypesUsedCount: 0,
    derivedKpis: [{ name: "Payload", target: "25", unit: "kg" }],
    validationFlagCount: 0,
  }),
  0.4 * (1 / 3),
);

check(
  "KPI name matching is case-insensitive",
  computeConfidenceScore({
    sourceTypesUsedCount: 0,
    derivedKpis: [{ name: "PAYLOAD", target: "25", unit: "kg" }],
    validationFlagCount: 0,
  }),
  0.4 * (1 / 3),
);

console.log(`\n${passCount} passed, ${failCount} failed`);
if (failCount > 0) process.exit(1);
