import type { ConstraintSource, IdentifiedConstraint } from "./types/hangar-mission";

// Stage 2.2, Step 2a (MissionAgent.md Section 4.2.1) — the domain rules
// table (REG-001–REG-004, FORM-001–FORM-005, DOM-001–DOM-004), implemented
// directly as code per the doc: "This table is the actual thing to
// implement as code, not prose to re-derive at runtime." Deterministic,
// no LLM — plain lookup against known inputs.
//
// Each rule's `matches` predicate runs against an already-normalized
// DomainRuleContext; domainRules.ts stays pure data + comparisons — parsing
// raw hints/structured fields into that context is constraintIdentification.ts's job.
//
// Judgment call: DOM-001–DOM-004 in the doc each imply two things — a
// "vertical" label (e.g. "AgriSky vertical") AND a genuine constraint (e.g.
// "spray-drift avoidance"). Section 11's realistic output example shows the
// vertical label landing in mission_specs.vertical (Stage 2.3), not in
// identified_constraints — so only the constraint half is emitted here.
// The vertical-tagging half isn't Stage 2.2's output type (MissionReasoningResult
// has no "vertical" field) and belongs to whichever future Stage 2.3 logic
// assembles mission_specs from decomposed_elements.

export interface DomainRuleContext {
  decomposedElements: string[];
  attachedRegulations: string[];
  payloadKg: number | null;
  altitudeCeilingM: number | null;
  operatingEnvironment: string | null;
  budgetBand: string | null;
}

export interface DomainRule {
  id: string;
  trigger: string;
  matches: (ctx: DomainRuleContext) => boolean;
  constraints: Omit<IdentifiedConstraint, "source">[];
  source: ConstraintSource;
}

function containsAny(elements: string[], keywords: string[]): boolean {
  const text = elements.join(" ").toLowerCase();
  return keywords.some((k) => text.includes(k));
}

export const DOMAIN_RULES: DomainRule[] = [
  {
    id: "REG-001",
    trigger: "Regulation = FAR Part 107 selected",
    matches: (ctx) => ctx.attachedRegulations.includes("FAR_107"),
    constraints: [
      { name: "Max altitude", value: "122m AGL (400ft)" },
      { name: "VLOS required", value: "true" },
    ],
    source: "regulation",
  },
  {
    id: "REG-002",
    trigger: "Regulation = EASA SORA selected",
    matches: (ctx) => ctx.attachedRegulations.includes("EASA_SORA"),
    constraints: [
      { name: "Formal risk assessment", value: "required" },
      { name: "Operational category", value: "must be declared" },
    ],
    source: "regulation",
  },
  {
    id: "REG-003",
    trigger: "Regulation = DGCA CAR Section 3 selected",
    matches: (ctx) => ctx.attachedRegulations.includes("DGCA_CAR_SECTION_3"),
    constraints: [
      { name: "Weight category", value: "Nano <250g / Micro <2kg / Small <25kg / Medium <150kg" },
      { name: "Registration", value: "required" },
    ],
    source: "regulation",
  },
  {
    id: "REG-004",
    trigger: "Regulation = MIL-STD-810 selected",
    matches: (ctx) => ctx.attachedRegulations.includes("MIL_STD_810"),
    constraints: [
      {
        name: "Environmental hardening",
        value: "required (temperature, vibration, humidity resistance)",
      },
    ],
    source: "regulation",
  },
  {
    id: "FORM-001",
    trigger: "payload_hint > 25kg",
    matches: (ctx) => ctx.payloadKg !== null && ctx.payloadKg > 25,
    constraints: [
      {
        name: "Payload category",
        value: "exceeds small-UAS category — additional certification constraint",
      },
    ],
    source: "user",
  },
  {
    id: "FORM-002",
    trigger: "altitude_ceiling > 120m",
    matches: (ctx) => ctx.altitudeCeilingM !== null && ctx.altitudeCeilingM > 120,
    constraints: [
      {
        name: "Altitude ceiling",
        value: "beyond standard VLOS ceiling — special permission constraint",
      },
    ],
    source: "user",
  },
  {
    id: "FORM-003",
    trigger: 'operating_environment = "Urban"',
    matches: (ctx) => ctx.operatingEnvironment?.toLowerCase() === "urban",
    constraints: [
      { name: "Noise", value: "constraint applies" },
      { name: "Population density", value: "safety constraint applies" },
    ],
    source: "user",
  },
  {
    id: "FORM-004",
    trigger: 'operating_environment = "Coastal / maritime"',
    matches: (ctx) => ctx.operatingEnvironment?.toLowerCase() === "coastal / maritime",
    constraints: [{ name: "Corrosion resistance", value: "waterproofing required" }],
    source: "user",
  },
  {
    id: "FORM-005",
    trigger: 'budget_band = "Under ₹5L"',
    matches: (ctx) => ctx.budgetBand === "Under ₹5L",
    constraints: [{ name: "Component sourcing", value: "cost-conscious — COTS preference" }],
    source: "user",
  },
  {
    id: "DOM-001",
    trigger: "Decomposed elements contain crop/agriculture terms",
    matches: (ctx) => containsAny(ctx.decomposedElements, ["crop", "agricultur", "farm"]),
    constraints: [{ name: "Spray-drift avoidance", value: "low-altitude flight path required" }],
    source: "inferred",
  },
  {
    id: "DOM-002",
    trigger: "Decomposed elements contain perimeter/security/surveillance terms",
    matches: (ctx) =>
      containsAny(ctx.decomposedElements, ["perimeter", "security", "surveillance"]),
    constraints: [{ name: "Loiter endurance", value: "persistent-loiter endurance constraint" }],
    source: "inferred",
  },
  {
    id: "DOM-003",
    trigger: "Decomposed elements contain pipeline/infrastructure/inspection terms",
    matches: (ctx) =>
      containsAny(ctx.decomposedElements, ["pipeline", "infrastructure", "inspection"]),
    constraints: [{ name: "BVLOS", value: "beyond visual line of sight constraint" }],
    source: "inferred",
  },
  {
    id: "DOM-004",
    trigger: "Decomposed elements contain mapping/survey/terrain terms",
    matches: (ctx) => containsAny(ctx.decomposedElements, ["mapping", "survey", "terrain"]),
    constraints: [{ name: "Imaging payload", value: "high-resolution imaging payload constraint" }],
    source: "inferred",
  },
];

// Runs every rule against the context, returning one flattened
// IdentifiedConstraint per matched rule's constraint entry, tagged with
// both the rule's id (for traceability) and its source.
export interface EvaluatedConstraint extends IdentifiedConstraint {
  ruleId: string;
}

export function evaluateDomainRules(ctx: DomainRuleContext): EvaluatedConstraint[] {
  const results: EvaluatedConstraint[] = [];
  for (const rule of DOMAIN_RULES) {
    if (!rule.matches(ctx)) continue;
    for (const c of rule.constraints) {
      results.push({ ...c, source: rule.source, ruleId: rule.id });
    }
  }
  return results;
}
