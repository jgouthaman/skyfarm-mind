// Manual verification script for rulesEngine.ts. No test runner (vitest/jest)
// is configured in this repo yet, so run this directly with Node's native
// TypeScript support (Node 22.6+ strips types with no extra tooling):
//
//   node src/lib/the-hangar/rulesEngine.manualtest.ts
//
// Prints expected vs. actual for every check, then a pass/fail summary.
// Exits non-zero if any check failed.
import { normalizeUnits, validateRange, flagMissingRequired, KPI_BOUNDS } from "./rulesEngine.ts";

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

function checkThrows(name: string, fn: () => void, expectedMessageContains: string): void {
  try {
    fn();
    console.log(`FAIL  ${name}`);
    console.log(`      expected: throws containing "${expectedMessageContains}"`);
    console.log(`      actual:   did not throw`);
    failCount++;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const pass = message.includes(expectedMessageContains);
    console.log(`${pass ? "PASS" : "FAIL"}  ${name}`);
    console.log(`      expected: throws containing "${expectedMessageContains}"`);
    console.log(`      actual:   threw "${message}"`);
    if (pass) passCount++;
    else failCount++;
  }
}

console.log("--- normalizeUnits ---");
check("normalizeUnits(5, km, m)", normalizeUnits(5, "km", "m"), 5000);
check("normalizeUnits(1, mi, km).toFixed(3)", normalizeUnits(1, "mi", "km").toFixed(3), "1.609");
check("normalizeUnits(1, kg, lb).toFixed(3)", normalizeUnits(1, "kg", "lb").toFixed(3), "2.205");
check("normalizeUnits(10, ft, m).toFixed(3)", normalizeUnits(10, "ft", "m").toFixed(3), "3.048");
check("normalizeUnits(90, min, hr)", normalizeUnits(90, "min", "hr"), 1.5);
check("normalizeUnits(5, m, m) identity", normalizeUnits(5, "m", "m"), 5);
checkThrows(
  "normalizeUnits(5, kg, km) incompatible dimensions",
  () => normalizeUnits(5, "kg", "km"),
  "incompatible unit types",
);
checkThrows(
  "normalizeUnits(5, xx, km) unknown unit",
  () => normalizeUnits(5, "xx", "km"),
  "unsupported unit",
);

console.log("\n--- validateRange (Section 4.2.1 KPI bounds table) ---");
check(
  "validateRange(25, payload bounds).pass",
  validateRange(25, KPI_BOUNDS.payload.min, KPI_BOUNDS.payload.max, "payload").pass,
  true,
);
check(
  "validateRange(500000, payload bounds).pass [hallucination case from the doc]",
  validateRange(500000, KPI_BOUNDS.payload.min, KPI_BOUNDS.payload.max, "payload").pass,
  false,
);
check(
  "validateRange(0.01, payload bounds).pass [below min]",
  validateRange(0.01, KPI_BOUNDS.payload.min, KPI_BOUNDS.payload.max, "payload").pass,
  false,
);
check(
  "validateRange(90, endurance bounds).pass",
  validateRange(90, KPI_BOUNDS.endurance.min, KPI_BOUNDS.endurance.max, "endurance").pass,
  true,
);
check(
  "validateRange(600, endurance bounds).pass [>8hr flagged per the doc]",
  validateRange(600, KPI_BOUNDS.endurance.min, KPI_BOUNDS.endurance.max, "endurance").pass,
  false,
);
check("validateRange(NaN, 0, 10).pass", validateRange(NaN, 0, 10, "test").pass, false);

console.log("\n--- flagMissingRequired ---");
check(
  "flagMissingRequired(mixed null/empty/present)",
  flagMissingRequired({ payload: 25, range: null, endurance: "" }, [
    "payload",
    "range",
    "endurance",
    "altitude",
  ]),
  ["range", "endurance", "altitude"],
);
check("flagMissingRequired(all present)", flagMissingRequired({ payload: 25 }, ["payload"]), []);
check("flagMissingRequired(empty input, empty required list)", flagMissingRequired({}, []), []);

console.log(`\n${passCount} passed, ${failCount} failed`);
if (failCount > 0) process.exit(1);
