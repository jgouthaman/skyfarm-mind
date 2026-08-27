// Manual verification script for missionInputValidation.ts — pure,
// deterministic, no LLM. Run directly:
//
//   node src/lib/the-hangar/missionInputValidation.manualtest.ts
import { hasUsableContent, computeValidationFlags } from "./missionInputValidation.ts";

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

console.log("--- hasUsableContent ---");
check("non-empty text -> usable", hasUsableContent("Need a drone for crop monitoring.", {}), true);
check("structured fields only, no text -> usable", hasUsableContent("", { payload_kg: 25 }), true);
check("both empty -> not usable", hasUsableContent("", {}), false);
check("whitespace-only text, no fields -> not usable", hasUsableContent("   \n  ", {}), false);

console.log("\n--- computeValidationFlags: the doc's own hallucination example ---");
check(
  "payload_hint of 500000kg gets flagged as exceeding max (150kg)",
  computeValidationFlags(
    { payloadHint: "500000kg", rangeHint: null, enduranceHint: null },
    {},
  ).some((f) => f.startsWith("payload:")),
  true,
);

check(
  "explicit structured field wins over hint, and a valid value passes clean",
  computeValidationFlags(
    { payloadHint: "999999kg", rangeHint: null, enduranceHint: null },
    { payload_kg: 25 },
  ),
  ["range: no value extracted or provided", "endurance: no value extracted or provided"],
);

check(
  "endurance hint of 600 min (>8hr) gets flagged per the doc's own hallucination-suspect threshold",
  computeValidationFlags({ payloadHint: null, rangeHint: null, enduranceHint: "600" }, {}).some(
    (f) => f.startsWith("endurance:"),
  ),
  true,
);

check(
  "all three core fields missing -> three missing-field flags, no range flags",
  computeValidationFlags({ payloadHint: null, rangeHint: null, enduranceHint: null }, {}),
  [
    "payload: no value extracted or provided",
    "range: no value extracted or provided",
    "endurance: no value extracted or provided",
  ],
);

check(
  "all three present and in range -> no flags at all",
  computeValidationFlags({ payloadHint: "25kg", rangeHint: "40km", enduranceHint: "90min" }, {}),
  [],
);

console.log(`\n${passCount} passed, ${failCount} failed`);
if (failCount > 0) process.exit(1);
