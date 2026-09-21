// Manual verification script for gapOverrides.ts — pure, deterministic. This
// whitelist is the ONLY place request-supplied data enters Stage 2, so it's
// worth pinning down: anything not a known key, or not a positive finite
// number, must be dropped. Run directly:
//
//   node src/lib/the-hangar/gapOverrides.manualtest.ts
import { GAP_OVERRIDE_KEYS, sanitizeGapOverrides } from "./gapOverrides.ts";

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

check("the whitelist is exactly payload/range/endurance", [...GAP_OVERRIDE_KEYS], [
  "payload_kg",
  "range_km",
  "endurance_min",
]);

check(
  "valid answers for all three keys pass through",
  sanitizeGapOverrides({ payload_kg: 12, range_km: 40, endurance_min: 90 }),
  { payload_kg: 12, range_km: 40, endurance_min: 90 },
);

check(
  "decimals are fine",
  sanitizeGapOverrides({ payload_kg: 0.5 }),
  { payload_kg: 0.5 },
);

check(
  "unknown keys are dropped — the browser can't inject other structured fields",
  sanitizeGapOverrides({
    payload_kg: 5,
    operating_environment: "anything",
    confidenceScore: 0.99,
    intent: "forged",
    __proto__: { polluted: true },
  }),
  { payload_kg: 5 },
);

check(
  "strings are dropped, not coerced (\"12\" is not 12)",
  sanitizeGapOverrides({ payload_kg: "12", range_km: "40" }),
  {},
);

check("zero and negatives are dropped", sanitizeGapOverrides({ payload_kg: 0, range_km: -3 }), {});

check(
  "NaN and Infinity are dropped",
  sanitizeGapOverrides({ payload_kg: NaN, range_km: Infinity, endurance_min: -Infinity }),
  {},
);

check(
  "null / boolean / object / array values are dropped",
  sanitizeGapOverrides({ payload_kg: null, range_km: true, endurance_min: { a: 1 } }),
  {},
);

check("undefined input -> {}", sanitizeGapOverrides(undefined), {});
check("null input -> {}", sanitizeGapOverrides(null), {});
check("a string input -> {}", sanitizeGapOverrides("payload_kg=5"), {});
check("an array input -> {}", sanitizeGapOverrides([5, 5, 5]), {});
check("an empty object -> {}", sanitizeGapOverrides({}), {});

check(
  "a valid key alongside invalid ones keeps only the valid one",
  sanitizeGapOverrides({ payload_kg: 7, range_km: "far", endurance_min: -1 }),
  { payload_kg: 7 },
);

check(
  "the result is a fresh object (input isn't mutated or returned)",
  (() => {
    const input = { payload_kg: 3 };
    const out = sanitizeGapOverrides(input);
    return out !== input && input.payload_kg === 3;
  })(),
  true,
);

console.log(`\n${passCount} passed, ${failCount} failed`);
if (failCount > 0) process.exit(1);
