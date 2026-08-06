import { createServerFn } from "@tanstack/react-start";
import { callLlmGateway, stripJsonFences } from "./llmGateway.ts";
import { DOMAIN_RULES, evaluateDomainRules, type DomainRuleContext } from "./domainRules.ts";
import type { DerivedKpi, IdentifiedConstraint, ParsedMissionInput } from "./types/hangar-mission";

// Stage 2.2, Steps 2 + 3 (MissionAgent.md Section 4.2.1) — Constraint
// Identification and KPI Derivation.
//
// Design decision (task item 3): combined into ONE function / one LLM call
// rather than a sibling function, per the doc's own "Efficiency note":
// "Steps 2b and 3's LLM portions can be one combined API call in practice
// (both operate on decomposed_elements and flow directly into each other)
// — same pattern as Stage 2.1 combining intent + entity extraction."
// A sibling function would've meant a second round trip for data the first
// call already has in context (decomposed_elements, known constraints) —
// same latency/cost argument the doc already made for Stage 2.1.
//
// Sequence per Section 4.2.1:
//   2a. Domain rules (deterministic, domainRules.ts) — no LLM.
//   —   Dedup Stage 2.1's constraint_hints against 2a's output (this
//       repo's own addition — not in the doc, but required so the same
//       constraint doesn't appear twice: once as an LLM hint, once as a
//       domain-rule match).
//   2b + 3. One combined LLM call: new inferred constraints the rule table
//       can't catch, plus derived KPIs — given "known constraints" (2a's
//       output + the hints that survived dedup) so it doesn't repeat them.

export interface ConstraintIdentificationInput {
  decomposedElements: string[];
  extractedEntities: ParsedMissionInput["extractedEntities"];
  structuredFields: Record<string, unknown>;
  attachedRegulations: string[];
}

export interface ConstraintAndKpiResult {
  identifiedConstraints: IdentifiedConstraint[];
  derivedKpis: DerivedKpi[];
  mock: boolean;
}

// ── Step 2a input: parse raw hints/structured fields into a clean context ──

function parseLeadingNumber(text: string | null | undefined): number | null {
  if (!text) return null;
  const match = text.match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : null;
}

// Merge rule (Section 4.1.1, carried forward into Stage 2.2): explicit
// structured field values always win over LLM-inferred hints.
export function buildDomainRuleContext(input: ConstraintIdentificationInput): DomainRuleContext {
  const structuredPayload =
    typeof input.structuredFields.payload_kg === "number"
      ? input.structuredFields.payload_kg
      : null;
  const payloadKg = structuredPayload ?? parseLeadingNumber(input.extractedEntities.payloadHint);

  const altitudeCeilingM =
    typeof input.structuredFields.altitude_ceiling === "number"
      ? input.structuredFields.altitude_ceiling
      : null;

  const operatingEnvironment =
    typeof input.structuredFields.operating_environment === "string"
      ? input.structuredFields.operating_environment
      : null;

  const budgetBand =
    typeof input.structuredFields.budget_band === "string"
      ? input.structuredFields.budget_band
      : null;

  return {
    decomposedElements: input.decomposedElements,
    attachedRegulations: input.attachedRegulations,
    payloadKg,
    altitudeCeilingM,
    operatingEnvironment,
    budgetBand,
  };
}

// ── Dedup: Stage 2.1's constraint_hints[] vs. domain-rule-table output ──
//
// Deterministic keyword/token-overlap matching, not an LLM judge call — an
// LLM-based "is this a duplicate" check would be a 5th LLM call per mission
// just to dedupe two lists, working against the doc's own call-minimization
// stance (Section 5.1: "4 calls" total, none earmarked for this). A small
// curated synonym table (below) covers the domain vocabulary this repo
// actually uses (DGCA/registration, humidity/moisture, etc.) — this catches
// near-restatements of the same concept, not full semantic equivalence.
// A hint phrased in genuinely different vocabulary than any fired rule's
// output won't be caught; that's a known limitation, not a bug.

const STOPWORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "of",
  "in",
  "for",
  "to",
  "with",
  "must",
  "should",
  "required",
  "require",
  "requires",
  "recommended",
  "likely",
  "may",
  "need",
  "needs",
  "this",
  "that",
  "is",
  "are",
  "be",
  "per",
  "on",
]);

// Curated aliases for this domain's vocabulary — each group's first entry
// is the canonical token everything in the group maps to.
const SYNONYM_GROUPS: string[][] = [
  // "certificate"/"certification" deliberately excluded — too overloaded
  // (pilot certificate vs. aircraft registration vs. generic "additional
  // certification constraint") to safely canonicalize with "registration"
  // without conflating genuinely different requirements.
  ["registration", "register", "registered", "uin"],
  ["humidity", "moisture", "damp", "monsoon"],
  ["weight", "payload"],
  ["environmental", "environment"],
  ["hardening", "resilience", "resilient", "resistant", "resistance", "rating", "ip43", "ip"],
  ["vlos", "lineofsight"],
  ["bvlos", "beyondvisuallineofsight"],
];
const SYNONYM_MAP = new Map<string, string>();
for (const group of SYNONYM_GROUPS) {
  for (const word of group) SYNONYM_MAP.set(word, group[0]);
}

function tokenize(text: string): Set<string> {
  const raw = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
  return new Set(raw.map((w) => SYNONYM_MAP.get(w) ?? w));
}

const OVERLAP_THRESHOLD = 0.34;

export interface DedupResult {
  kept: string[];
  dropped: { hint: string; matchedConstraint: string }[];
}

// Prefers the domain-rule-table version on a match (per task instructions)
// — a hint is dropped, never a rule constraint; rule constraints are always
// deterministic/traceable, so they win.
export function dedupeConstraintHints(
  hints: string[],
  existing: IdentifiedConstraint[],
): DedupResult {
  const kept: string[] = [];
  const dropped: { hint: string; matchedConstraint: string }[] = [];

  for (const hint of hints) {
    const hintTokens = tokenize(hint);
    let matchedConstraint: string | null = null;

    if (hintTokens.size > 0) {
      for (const c of existing) {
        const existingTokens = tokenize(`${c.name} ${c.value}`);
        if (existingTokens.size === 0) continue;
        let overlap = 0;
        for (const t of hintTokens) if (existingTokens.has(t)) overlap++;
        const ratio = overlap / Math.min(hintTokens.size, existingTokens.size);
        if (ratio >= OVERLAP_THRESHOLD) {
          matchedConstraint = `${c.name}: ${c.value}`;
          break;
        }
      }
    }

    if (matchedConstraint) dropped.push({ hint, matchedConstraint });
    else kept.push(hint);
  }

  return { kept, dropped };
}

// ── Combined LLM call: Section 4.2.1 Step 2b (constraint inference) + Step 3
// (KPI derivation), merged into one prompt/response per the doc's efficiency
// note. SYSTEM/USER content below is a direct merge of both of the doc's
// verbatim templates — not a rewrite of either. ──

const SYSTEM = `You identify constraints a mission implies but the user never stated explicitly, and derive performance, cost, and safety KPIs for the mission, in one response. Only infer a constraint if it's a reasonable, defensible consequence of the mission elements below — do not speculate broadly. Tag every constraint you return with source "inferred". For any KPI already implied directly by a listed constraint, copy that value — do not re-derive it. Only infer new KPI values where no constraint already states one. Stay within realistic bounds for a small UAS. Return JSON only.`;

export const identifyConstraintsAndKpis = createServerFn({ method: "POST" })
  .validator((d: ConstraintIdentificationInput) => d)
  .handler(async ({ data }): Promise<ConstraintAndKpiResult> => {
    // Step 2a — domain rules (deterministic).
    const ctx = buildDomainRuleContext(data);
    const ruleConstraints = evaluateDomainRules(ctx).map(({ ruleId: _ruleId, ...c }) => c);

    // Dedup Stage 2.1's hints against the rules that actually fired.
    const { kept: keptHints } = dedupeConstraintHints(
      data.extractedEntities.constraintHints,
      ruleConstraints,
    );
    const hintConstraints: IdentifiedConstraint[] = keptHints.map((hint) => ({
      name: hint,
      value: "",
      source: "inferred",
    }));

    const knownConstraints = [...ruleConstraints, ...hintConstraints];

    const userContent = `Decomposed mission elements: ${JSON.stringify(data.decomposedElements, null, 2)}
Constraints already known (do not repeat these): ${JSON.stringify(knownConstraints, null, 2)}

Return:
{ "identified_constraints": [ { "name": "string", "value": "string", "source": "inferred" } ], "derived_kpis": [ { "name": "string", "target": "string", "unit": "string" } ] }`;

    const { content } = await callLlmGateway(SYSTEM, userContent, { jsonMode: true });
    if (!content) {
      return { identifiedConstraints: knownConstraints, derivedKpis: mockKpis(data), mock: true };
    }

    const parsed = parseConstraintAndKpiResponse(content);
    if (!parsed) {
      return { identifiedConstraints: knownConstraints, derivedKpis: mockKpis(data), mock: true };
    }

    return {
      identifiedConstraints: [...knownConstraints, ...parsed.identifiedConstraints],
      derivedKpis: parsed.derivedKpis,
      mock: false,
    };
  });

function parseConstraintAndKpiResponse(
  raw: string,
): { identifiedConstraints: IdentifiedConstraint[]; derivedKpis: DerivedKpi[] } | null {
  try {
    const obj = JSON.parse(stripJsonFences(raw));
    if (!Array.isArray(obj.identified_constraints) || !Array.isArray(obj.derived_kpis)) return null;

    const identifiedConstraints: IdentifiedConstraint[] = obj.identified_constraints
      .filter((c: unknown): c is Record<string, unknown> => typeof c === "object" && c !== null)
      .filter(
        (c: Record<string, unknown>) => typeof c.name === "string" && typeof c.value === "string",
      )
      .map((c: Record<string, unknown>) => ({
        name: c.name as string,
        value: c.value as string,
        source: "inferred" as const,
      }));

    const derivedKpis: DerivedKpi[] = obj.derived_kpis
      .filter((k: unknown): k is Record<string, unknown> => typeof k === "object" && k !== null)
      .filter(
        (k: Record<string, unknown>) =>
          typeof k.name === "string" && typeof k.target === "string" && typeof k.unit === "string",
      )
      .map((k: Record<string, unknown>) => ({
        name: k.name as string,
        target: k.target as string,
        unit: k.unit as string,
      }));

    return { identifiedConstraints, derivedKpis };
  } catch {
    return null;
  }
}

function mockKpis(data: ConstraintIdentificationInput): DerivedKpi[] {
  const kpis: DerivedKpi[] = [];
  if (data.extractedEntities.payloadHint) {
    kpis.push({ name: "Payload", target: data.extractedEntities.payloadHint, unit: "kg" });
  }
  if (data.extractedEntities.rangeHint) {
    kpis.push({ name: "Range", target: data.extractedEntities.rangeHint, unit: "km" });
  }
  if (data.extractedEntities.enduranceHint) {
    kpis.push({ name: "Endurance", target: data.extractedEntities.enduranceHint, unit: "min" });
  }
  return kpis;
}

// Re-exported so callers/tests can reference the rule table without a
// second import path.
export { DOMAIN_RULES };
