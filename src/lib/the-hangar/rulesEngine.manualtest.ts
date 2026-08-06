// Manual verification script for rulesEngine.ts. No test runner (vitest/jest)
// is configured in this repo yet, so run this directly with Node's native
// TypeScript support (Node 22.6+ strips types with no extra tooling):
//
//   node src/lib/the-hangar/rulesEngine.manualtest.ts
//
// Exits non-zero (via the thrown AssertionError) on first failure, prints a
// pass message on success.
import assert from "node:assert/strict";
import { normalizeUnits, validateRange, flagMissingRequired, KPI_BOUNDS } from "./rulesEngine.ts";

// --- normalizeUnits ---
assert.equal(normalizeUnits(5, "km", "m"), 5000);
assert.equal(normalizeUnits(1, "mi", "km").toFixed(3), "1.609");
assert.equal(normalizeUnits(1, "kg", "lb").toFixed(3), "2.205");
assert.equal(normalizeUnits(10, "ft", "m").toFixed(3), "3.048");
assert.equal(normalizeUnits(90, "min", "hr"), 1.5);
assert.equal(normalizeUnits(5, "m", "m"), 5); // identity conversion
assert.throws(() => normalizeUnits(5, "kg", "km"), /incompatible unit types/); // mass -> length
assert.throws(() => normalizeUnits(5, "xx", "km"), /unsupported unit/); // unknown unit

// --- validateRange, using Section 4.2.1's KPI bounds table ---
assert.equal(
  validateRange(25, KPI_BOUNDS.payload.min, KPI_BOUNDS.payload.max, "payload").pass,
  true,
);
assert.equal(
  validateRange(500000, KPI_BOUNDS.payload.min, KPI_BOUNDS.payload.max, "payload").pass,
  false,
); // hallucination case from the doc
assert.equal(
  validateRange(0.01, KPI_BOUNDS.payload.min, KPI_BOUNDS.payload.max, "payload").pass,
  false,
); // below min
assert.equal(
  validateRange(90, KPI_BOUNDS.endurance.min, KPI_BOUNDS.endurance.max, "endurance").pass,
  true,
);
assert.equal(
  validateRange(600, KPI_BOUNDS.endurance.min, KPI_BOUNDS.endurance.max, "endurance").pass,
  false,
); // >8hr flagged per the doc
assert.equal(validateRange(NaN, 0, 10, "test").pass, false);

// --- flagMissingRequired ---
assert.deepEqual(
  flagMissingRequired({ payload: 25, range: null, endurance: "" }, [
    "payload",
    "range",
    "endurance",
    "altitude",
  ]),
  ["range", "endurance", "altitude"],
);
assert.deepEqual(flagMissingRequired({ payload: 25 }, ["payload"]), []);
assert.deepEqual(flagMissingRequired({}, []), []);

console.log("rulesEngine.ts: all manual checks passed");
