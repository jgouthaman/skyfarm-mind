import type { DerivedKpi } from "./types/hangar-mission";

// Stage 2.3, Step 5 (MissionAgent.md Section 4.3.1) — Confidence Score.
// Deterministic formula, no LLM — this is also the exact number that flows
// into design_outcomes for Phase 3 AI Advisor work (per the doc's Decisions
// Log, Section 16), so it needs to mean something consistent across every
// mission, not vary in method run to run. Keep this file's formula and
// weights the single source of truth — don't let another file recompute it
// differently.
//
// Verbatim formula (Section 4.3.1):
//   confidence_score = (0.4 × source_completeness)
//                     + (0.4 × field_completeness)
//                     − (0.05 × validation_flag_count, floored at 0)
//
// KNOWN SPEC INCONSISTENCY, documented rather than silently "corrected":
// with these weights, the mathematical maximum of this formula is
// 0.4 + 0.4 = 0.8 (source_completeness and field_completeness each cap at
// 1; the penalty term only subtracts). But the doc's own worked examples
// elsewhere show confidence_score values of 0.87 (Section 11) and 0.92
// (Section 3.1's at-a-glance diagram) — both above what this formula can
// ever produce. Implemented exactly as specified rather than reverse-
// engineering different weights to hit those illustrative numbers, since
// nothing in Section 4.3.1 suggests what the "real" weights would be —
// those examples were most likely written before the formula was pinned
// down. Flagged for whoever owns the spec to reconcile.

const SOURCE_COMPLETENESS_WEIGHT = 0.4;
const FIELD_COMPLETENESS_WEIGHT = 0.4;
const VALIDATION_FLAG_PENALTY = 0.05;

// "Three or more of the six input sources combined counts as 'full'."
const FULL_SOURCE_COUNT = 3;

// "the fraction of core KPI fields (payload, range, endurance, at minimum)
// that Stage 2.2 derived with a real value rather than null." Only these
// three are named in the doc ("at minimum") — kept to exactly these three
// rather than guessing at a longer list, so the formula stays stable and
// reproducible rather than silently drifting as KPI names vary mission to mission.
const CORE_KPI_FIELDS = ["payload", "range", "endurance"];

export interface ConfidenceScoreInput {
  /** Stage 2.1's source_types_used.length — how many of the 6 input sources were combined. */
  sourceTypesUsedCount: number;
  /** Stage 2.2's derived_kpis — checked for payload/range/endurance presence. */
  derivedKpis: DerivedKpi[];
  /** Stage 2.1's validation_flags.length (Section 4.1's rules engine). */
  validationFlagCount: number;
}

export function computeConfidenceScore(input: ConfidenceScoreInput): number {
  const sourceCompleteness = Math.min(input.sourceTypesUsedCount / FULL_SOURCE_COUNT, 1);

  const presentCoreFields = CORE_KPI_FIELDS.filter((field) =>
    input.derivedKpis.some((k) => k.name.trim().toLowerCase() === field),
  ).length;
  const fieldCompleteness = presentCoreFields / CORE_KPI_FIELDS.length;

  const flagPenalty = Math.max(0, input.validationFlagCount) * VALIDATION_FLAG_PENALTY;

  const raw =
    SOURCE_COMPLETENESS_WEIGHT * sourceCompleteness +
    FIELD_COMPLETENESS_WEIGHT * fieldCompleteness -
    flagPenalty;

  // "floored so the score never goes negative" — applied to the final
  // result, since the penalty term alone can never make `raw` negative on
  // its own (source/field completeness both start at >= 0).
  return Math.max(0, raw);
}
