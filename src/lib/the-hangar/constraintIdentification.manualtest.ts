// Manual verification script for domainRules.ts's evaluateDomainRules and
// constraintIdentification.ts's dedupeConstraintHints — both pure,
// deterministic, no LLM/network involved. Run directly:
//
//   node src/lib/the-hangar/constraintIdentification.manualtest.ts
//
// Prints expected vs. actual for every check, then a pass/fail summary.
import { evaluateDomainRules, type DomainRuleContext } from "./domainRules.ts";
import { dedupeConstraintHints } from "./constraintIdentification.ts";
import type { IdentifiedConstraint } from "./types/hangar-mission.ts";

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

const EMPTY_CONTEXT: DomainRuleContext = {
  decomposedElements: [],
  attachedRegulations: [],
  payloadKg: null,
  altitudeCeilingM: null,
  operatingEnvironment: null,
  budgetBand: null,
};

console.log("--- evaluateDomainRules ---");

check("no context -> no constraints fire", evaluateDomainRules(EMPTY_CONTEXT), []);

check(
  "REG-001 (FAR_107 selected) -> max altitude + VLOS",
  evaluateDomainRules({ ...EMPTY_CONTEXT, attachedRegulations: ["FAR_107"] }).map((c) => c.ruleId),
  ["REG-001", "REG-001"],
);

check(
  "REG-003 (DGCA CAR Section 3 selected) -> weight category + registration",
  evaluateDomainRules({ ...EMPTY_CONTEXT, attachedRegulations: ["DGCA_CAR_SECTION_3"] }).map(
    (c) => ({
      ruleId: c.ruleId,
      name: c.name,
    }),
  ),
  [
    { ruleId: "REG-003", name: "Weight category" },
    { ruleId: "REG-003", name: "Registration" },
  ],
);

check(
  "FORM-001 (payload 30kg > 25kg) fires",
  evaluateDomainRules({ ...EMPTY_CONTEXT, payloadKg: 30 }).map((c) => c.ruleId),
  ["FORM-001"],
);
check(
  "FORM-001 (payload 25kg, not > 25) does NOT fire",
  evaluateDomainRules({ ...EMPTY_CONTEXT, payloadKg: 25 }).map((c) => c.ruleId),
  [],
);

check(
  "FORM-003 (operating_environment = Urban) -> noise + population density",
  evaluateDomainRules({ ...EMPTY_CONTEXT, operatingEnvironment: "Urban" }).map((c) => c.name),
  ["Noise", "Population density"],
);

check(
  "DOM-001 (decomposed elements mention crop) -> spray-drift avoidance",
  evaluateDomainRules({
    ...EMPTY_CONTEXT,
    decomposedElements: ["aerial crop health monitoring", "fixed-wing platform class"],
  }).map((c) => c.name),
  ["Spray-drift avoidance"],
);

check(
  "REG-001 + DOM-001 together -> 3 constraints from 2 rules",
  evaluateDomainRules({
    ...EMPTY_CONTEXT,
    attachedRegulations: ["FAR_107"],
    decomposedElements: ["aerial crop health monitoring"],
  }).map((c) => c.ruleId),
  ["REG-001", "REG-001", "DOM-001"],
);

console.log("\n--- dedupeConstraintHints ---");

const REG003_CONSTRAINTS: IdentifiedConstraint[] = [
  {
    name: "Weight category",
    value: "Nano <250g / Micro <2kg / Small <25kg / Medium <150kg",
    source: "regulation",
  },
  { name: "Registration", value: "required", source: "regulation" },
];

check(
  "hint literally about registration gets dropped as covered",
  dedupeConstraintHints(
    [
      "May require DGCA type certification and UIN (Unique Identification Number) registration for legal operation",
    ],
    REG003_CONSTRAINTS,
  ).dropped.length,
  1,
);

check(
  "unrelated hint (terrain) is kept, not dropped",
  dedupeConstraintHints(
    ["Terrain: predominantly flat to semi-flat agricultural land"],
    REG003_CONSTRAINTS,
  ).kept.length,
  1,
);

check(
  "pilot-license hint is kept (distinct from aircraft registration, not merged)",
  dedupeConstraintHints(
    ["Remote pilot must hold DGCA Remote Pilot Certificate (RPC) for operation"],
    REG003_CONSTRAINTS,
  ).kept.length,
  1,
);

check("empty hints -> nothing kept or dropped", dedupeConstraintHints([], REG003_CONSTRAINTS), {
  kept: [],
  dropped: [],
});

check(
  "no existing constraints -> every hint kept",
  dedupeConstraintHints(["Budget cap: ₹5,00,000 INR"], []).kept.length,
  1,
);

// Synonym-canonicalization case: "moisture"/"IP rating" hint vs REG-004's
// "environmental hardening ... humidity resistance" constraint — different
// literal words, same concept, only caught via the curated synonym table.
const REG004_CONSTRAINT: IdentifiedConstraint[] = [
  {
    name: "Environmental hardening",
    value: "required (temperature, vibration, humidity resistance)",
    source: "regulation",
  },
];
check(
  "moisture/IP-rating hint matches 'humidity resistance' via synonym table",
  dedupeConstraintHints(
    [
      "Dust, moisture, and monsoon-season resilience recommended — consider IP rating (IP43 or higher)",
    ],
    REG004_CONSTRAINT,
  ).dropped.length,
  1,
);

console.log(`\n${passCount} passed, ${failCount} failed`);
if (failCount > 0) process.exit(1);
