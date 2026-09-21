// Manual verification script for missionIntentCategories.ts — pure,
// deterministic. Covers the validation of the model's answer against the
// fixed list, plus integrity of the list itself (so an edit to it can't
// silently break the prompt or the vertical mapping). Run directly:
//
//   node src/lib/the-hangar/missionIntentCategories.manualtest.ts
import {
  FALLBACK_INTENT_CATEGORY,
  INTENT_CATEGORIES,
  intentCategoryLabel,
  intentCategoryPromptList,
  normalizeIntentCategory,
  verticalForIntentCategory,
} from "./missionIntentCategories.ts";

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

console.log("--- list integrity ---");

const ids = INTENT_CATEGORIES.map((c) => c.id);
check("ids are unique", new Set(ids).size, ids.length);
check("the fallback category exists in the list", ids.includes(FALLBACK_INTENT_CATEGORY), true);
check("the fallback is 'other'", FALLBACK_INTENT_CATEGORY, "other");
check(
  "ids are lowercase snake_case (what normalize produces)",
  ids.every((id) => /^[a-z]+(_[a-z]+)*$/.test(id)),
  true,
);
check(
  "every mapped vertical is one of the four existing TorqWings verticals",
  INTENT_CATEGORIES.every(
    (c) => c.vertical === null || ["AgriSky", "GuardSky", "InfraSky", "GeoSky"].includes(c.vertical),
  ),
  true,
);
check(
  "every category is shown to the model in the prompt list",
  ids.every((id) => intentCategoryPromptList().includes(`- ${id}:`)),
  true,
);

console.log("\n--- normalizeIntentCategory ---");

check("an exact id passes through", normalizeIntentCategory("emergency_response"), "emergency_response");
check("case and surrounding space are forgiven", normalizeIntentCategory("  Mapping_Survey "), "mapping_survey");
check(
  "spaces / ampersands / hyphens become underscores",
  normalizeIntentCategory("Security & Surveillance"),
  "security_surveillance",
);
check("hyphenated form", normalizeIntentCategory("infrastructure-inspection"), "infrastructure_inspection");
check(
  "a made-up category becomes 'other', not free text",
  normalizeIntentCategory("fire_fighting_water_drop"),
  "other",
);
check("a whole sentence becomes 'other'", normalizeIntentCategory("a drone that drops water on fires"), "other");
check("empty string becomes 'other'", normalizeIntentCategory(""), "other");
check("undefined becomes 'other'", normalizeIntentCategory(undefined), "other");
check("null becomes 'other'", normalizeIntentCategory(null), "other");
check("a number becomes 'other'", normalizeIntentCategory(42), "other");
check("an object becomes 'other'", normalizeIntentCategory({ id: "agriculture" }), "other");
check(
  "every real id round-trips unchanged",
  ids.map((id) => normalizeIntentCategory(id)),
  ids,
);

console.log("\n--- verticalForIntentCategory / label ---");

check("agriculture -> AgriSky", verticalForIntentCategory("agriculture"), "AgriSky");
check("security_surveillance -> GuardSky", verticalForIntentCategory("security_surveillance"), "GuardSky");
check("infrastructure_inspection -> InfraSky", verticalForIntentCategory("infrastructure_inspection"), "InfraSky");
check("mapping_survey -> GeoSky", verticalForIntentCategory("mapping_survey"), "GeoSky");
check(
  "a category with no defined vertical stays null (nothing invented)",
  verticalForIntentCategory("emergency_response"),
  null,
);
check("'other' -> null", verticalForIntentCategory("other"), null);
check("an unknown id -> null", verticalForIntentCategory("nonsense"), null);
check("null / undefined -> null", [verticalForIntentCategory(null), verticalForIntentCategory(undefined)], [null, null]);
check("label for a known id", intentCategoryLabel("agriculture"), "Agriculture");
check("label falls back to 'Other' for an unknown id", intentCategoryLabel("nonsense"), "Other");

console.log(`\n${passCount} passed, ${failCount} failed`);
if (failCount > 0) process.exit(1);
