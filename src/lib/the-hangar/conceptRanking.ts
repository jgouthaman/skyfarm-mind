import type { CandidateConcept } from "./conceptIdeation.ts";
import type { ConceptTradeoffNote, ConstraintFit } from "./tradeoffReasoning.ts";

// Concept Agent Stage 3 — Ranking & Scoring. No LLM, deliberately — mirrors
// tradeoffPrioritization.ts's gate-then-score idea: a hard gate first
// (nothing that fails a constraint can ever outrank something that
// doesn't), then a score-based ordering applied only within each fit tier.
// A "reproducible, explainable ranking" property, same reasoning as
// Section 4.2.1's own no-LLM design for trade-off prioritization.

export interface RankedConcept {
  conceptName: string;
  description: string;
  rank: number;
  fitScore: number;
  constraintFit: ConstraintFit;
  rationale: string;
}

const FIT_TIER_ORDER: Record<ConstraintFit, number> = { pass: 0, partial: 1, fail: 2 };

export function rankConcepts(
  candidates: CandidateConcept[],
  tradeoffNotes: ConceptTradeoffNote[],
): RankedConcept[] {
  const notesByName = new Map(tradeoffNotes.map((n) => [n.conceptName, n]));

  const merged = candidates.map((c) => {
    const note = notesByName.get(c.conceptName);
    return {
      conceptName: c.conceptName,
      description: c.description,
      fitScore: note?.fitScore ?? 1,
      constraintFit: note?.constraintFit ?? ("partial" as ConstraintFit),
      rationale: note?.rationale ?? c.rationale,
    };
  });

  merged.sort((a, b) => {
    const tierDiff = FIT_TIER_ORDER[a.constraintFit] - FIT_TIER_ORDER[b.constraintFit];
    if (tierDiff !== 0) return tierDiff;
    return b.fitScore - a.fitScore;
  });

  return merged.map((m, i) => ({ ...m, rank: i + 1 }));
}
