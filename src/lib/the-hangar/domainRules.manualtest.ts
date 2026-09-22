// Manual verification script for the REG-* rules in domainRules.ts — pure,
// deterministic, no LLM. What it pins down: every regulation code the intake
// form can send (the four rows in the live Hangar_regulations_catalog) fires
// exactly its own rule. The DGCA row is stored as DGCA_CAR_S3, but REG-003 was
// first written to match DGCA_CAR_SECTION_3 — so ticking DGCA silently added no
// constraints until both spellings were accepted. Run directly:
//
//   node src/lib/the-hangar/domainRules.manualtest.ts
import { DOMAIN_RULES, type DomainRuleContext } from "./domainRules.ts";

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

const ctx = (attachedRegulations: string[]): DomainRuleContext => ({
  decomposedElements: [],
  attachedRegulations,
  payloadKg: null,
  altitudeCeilingM: null,
  operatingEnvironment: null,
  budgetBand: null,
});

const firedRegRules = (codes: string[]): string[] =>
  DOMAIN_RULES.filter((r) => r.id.startsWith("REG-") && r.matches(ctx(codes))).map((r) => r.id);

// The codes exactly as seeded in the live Hangar_regulations_catalog
// (supabase/migrations/20260801000000_hangar_mission_agent_baseline.sql).
console.log("--- the four catalog codes each fire their own rule ---");
check("FAR_107 -> REG-001", firedRegRules(["FAR_107"]), ["REG-001"]);
check("EASA_SORA -> REG-002", firedRegRules(["EASA_SORA"]), ["REG-002"]);
check("DGCA_CAR_S3 (the catalog's code) -> REG-003", firedRegRules(["DGCA_CAR_S3"]), ["REG-003"]);
check("MIL_STD_810 -> REG-004", firedRegRules(["MIL_STD_810"]), ["REG-004"]);

console.log("\n--- the older DGCA spelling still works ---");
check("DGCA_CAR_SECTION_3 -> REG-003", firedRegRules(["DGCA_CAR_SECTION_3"]), ["REG-003"]);

console.log("\n--- combinations and non-matches ---");
check(
  "several regulations fire several rules, in table order",
  firedRegRules(["MIL_STD_810", "FAR_107", "DGCA_CAR_S3"]),
  ["REG-001", "REG-003", "REG-004"],
);
check("both DGCA spellings together fire REG-003 once", firedRegRules(["DGCA_CAR_S3", "DGCA_CAR_SECTION_3"]), ["REG-003"]);
check("no regulations selected -> no REG rule fires", firedRegRules([]), []);
check("an unknown code fires nothing", firedRegRules(["NOT_A_REGULATION"]), []);
check("codes are matched exactly, not by substring", firedRegRules(["FAR_1070", "far_107"]), []);

console.log("\n--- what a selection actually adds ---");
const dgca = DOMAIN_RULES.find((r) => r.id === "REG-003")!;
check(
  "REG-003 adds the weight-category and registration constraints, tagged as regulation-sourced",
  [dgca.constraints.map((c) => c.name), dgca.source],
  [["Weight category", "Registration"], "regulation"],
);

console.log(`\n${passCount} passed, ${failCount} failed`);
if (failCount > 0) process.exit(1);
