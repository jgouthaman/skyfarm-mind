import type { DerivedKpi, IdentifiedConstraint, PrioritizedTradeoff } from "./types/hangar-mission";

// Stage 2.2, Step 4 (MissionAgent.md Section 4.2.1) — Trade-off
// Prioritization. No LLM, deliberately (per the doc: "a ranked priority
// order should be explainable and reproducible, not an unexplainable model
// judgment call") — same gate-then-score pattern already used by
// src/lib/intelligence/vehicleTypeRecommender.ts: a hard gate first
// (nothing in the score tier can ever outrank it), then a weighted score
// applied only to what's left.

export type TradeoffCategory = "performance" | "cost" | "payload" | "schedule";

const CATEGORY_LABELS: Record<TradeoffCategory, string> = {
  performance: "Performance (range, endurance, altitude)",
  cost: "Cost",
  payload: "Payload capability",
  schedule: "Schedule / build complexity",
};

const CATEGORY_KEYWORDS: Record<TradeoffCategory, string[]> = {
  performance: ["range", "endurance", "altitude", "speed"],
  cost: ["cost", "budget", "price"],
  payload: ["payload", "capacity"],
  schedule: ["schedule", "build", "complexity", "timeline", "lead time"],
};

// Section 4.2.1's default score-tier weights.
const DEFAULT_WEIGHTS: Record<TradeoffCategory, number> = {
  performance: 35,
  cost: 30,
  payload: 20,
  schedule: 15,
};

// Override rule (Section 4.2.1): "if the user's original input explicitly
// signaled a priority ... that signal overrides the default weights for
// this specific mission." These sentinel weights sit outside the 0-35
// default range so an override always wins/loses against every
// non-overridden category, regardless of its default weight.
const OVERRIDE_EMPHASIZE_WEIGHT = 100;
const OVERRIDE_DEPRIORITIZE_WEIGHT = -1;

const EMPHASIS_PATTERN = /\b(maxim(?:um|ize)|priorit(?:y|ize)|most important|critical|primary)\b/i;
const DEPRIORITIZE_PATTERN =
  /\b(not a concern|doesn'?t matter|not important|not a priority|no constraint on)\b/i;

function isGateTierConstraint(c: IdentifiedConstraint): boolean {
  // Gate tier (Section 4.2.1): (1) safety-implicated constraints, (2)
  // regulatory constraints (source: "regulation"). Safety detection is a
  // keyword check on name/value — the domain rules table (domainRules.ts)
  // doesn't carry a dedicated "safety" flag, only free-text constraint values.
  return c.source === "regulation" || /safety/i.test(`${c.name} ${c.value}`);
}

function categorizeKpi(kpi: DerivedKpi): TradeoffCategory | null {
  const text = kpi.name.toLowerCase();
  for (const category of Object.keys(CATEGORY_KEYWORDS) as TradeoffCategory[]) {
    if (CATEGORY_KEYWORDS[category].some((kw) => text.includes(kw))) return category;
  }
  return null;
}

interface OverrideEffect {
  category: TradeoffCategory;
  direction: "emphasize" | "deprioritize";
  signal: string;
}

// Splits on clause boundaries (comma/semicolon/period, "but", "while") so
// emphasis/deprioritize phrases get matched against the clause that
// actually contains them, not the whole signal. Without this, a sentence
// like the doc's own example — "Cost is not a concern, we need maximum
// range" — would match BOTH "not a concern" and "maximum" against BOTH
// "cost" and "range" (each keyword-matching category scans the full
// string), incorrectly flagging cost as emphasized too and range as
// deprioritized too. Deliberately not splitting on "and" — that usually
// joins same-direction items ("maximum range and endurance"), not opposing ones.
function splitClauses(signal: string): string[] {
  return signal
    .split(/[,;.]|\bwhile\b|\bbut\b/i)
    .map((s) => s.trim())
    .filter(Boolean);
}

// prioritySignals is free text (e.g. Stage 2.1's constraint_hints, or the
// raw mission brief) — the doc's own example is "cost is not a concern, we
// need maximum range", which is exactly this kind of unstructured signal,
// not a formal field anywhere in ParsedMissionInput.
function detectOverrides(prioritySignals: string[]): OverrideEffect[] {
  const effects: OverrideEffect[] = [];
  for (const signal of prioritySignals) {
    for (const clause of splitClauses(signal)) {
      const lower = clause.toLowerCase();
      for (const category of Object.keys(CATEGORY_KEYWORDS) as TradeoffCategory[]) {
        if (!CATEGORY_KEYWORDS[category].some((kw) => lower.includes(kw))) continue;
        if (EMPHASIS_PATTERN.test(clause))
          effects.push({ category, direction: "emphasize", signal });
        if (DEPRIORITIZE_PATTERN.test(clause))
          effects.push({ category, direction: "deprioritize", signal });
      }
    }
  }
  return effects;
}

function effectiveWeights(prioritySignals: string[]): {
  weights: Record<TradeoffCategory, number>;
  overrides: OverrideEffect[];
} {
  const weights = { ...DEFAULT_WEIGHTS };
  const overrides = detectOverrides(prioritySignals);
  for (const o of overrides) {
    weights[o.category] =
      o.direction === "emphasize" ? OVERRIDE_EMPHASIZE_WEIGHT : OVERRIDE_DEPRIORITIZE_WEIGHT;
  }
  return { weights, overrides };
}

function formatKpiItem(kpi: DerivedKpi): string {
  return `${kpi.name} (target: ${kpi.target}${kpi.unit ? ` ${kpi.unit}` : ""})`;
}

export interface TradeoffPrioritizationInput {
  identifiedConstraints: IdentifiedConstraint[];
  derivedKpis: DerivedKpi[];
  /** Free-text signals (e.g. Stage 2.1's constraint_hints) checked for an explicit user-stated priority override. */
  prioritySignals?: string[];
}

export function prioritizeTradeoffs(input: TradeoffPrioritizationInput): PrioritizedTradeoff[] {
  // Gate tier — never traded away against anything in the score tier below.
  const gateTier: PrioritizedTradeoff[] = input.identifiedConstraints
    .filter(isGateTierConstraint)
    .map((c) => ({
      item: `${c.name}: ${c.value}`,
      rationale:
        c.source === "regulation"
          ? "Gate tier — regulatory compliance constraint, never traded away against anything."
          : "Gate tier — safety constraint, never traded away against anything.",
    }));

  // Score tier — weighted multi-criteria, applied only to the remaining flexible KPIs.
  const { weights, overrides } = effectiveWeights(input.prioritySignals ?? []);

  const scored = input.derivedKpis
    .map((kpi) => {
      const category = categorizeKpi(kpi);
      return { kpi, category, weight: category ? weights[category] : 0 };
    })
    .sort((a, b) => b.weight - a.weight);

  const scoreTier: PrioritizedTradeoff[] = scored.map(({ kpi, category, weight }) => {
    const override = category ? overrides.find((o) => o.category === category) : undefined;
    if (override) {
      const verb =
        override.direction === "emphasize"
          ? "prioritized over the other criteria"
          : "deprioritized below the other criteria";
      return {
        item: formatKpiItem(kpi),
        rationale: `${CATEGORY_LABELS[override.category]} ${verb} — user signaled: "${override.signal}"`,
      };
    }
    if (!category) {
      return {
        item: formatKpiItem(kpi),
        rationale:
          "Uncategorized KPI — no default weighting bucket matched; ranked last among score-tier items.",
      };
    }
    return {
      item: formatKpiItem(kpi),
      rationale: `${CATEGORY_LABELS[category]} — ${weight}% default weight.`,
    };
  });

  return [...gateTier, ...scoreTier];
}
