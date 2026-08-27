import { VERTICALS } from "@/constants/verticals.constants";
import { getVehicleType, type VehicleTypeSlug } from "@/constants/vehicleTypes.constants";

export type YesNoUnsure = "yes" | "no" | "unsure";

export interface VehicleTypeRecommenderInput {
  payloadKg: number;
  rangeKm: number;
  enduranceMin: number;
  hoverRequired: YesNoUnsure;
  runwayAvailable: YesNoUnsure;
  /** One of the VERTICALS `tag` values from verticals.constants.tsx */
  vertical: string;
}

export interface VehicleTypeRecommendation {
  type: VehicleTypeSlug | null;
  reasoning: string;
  confidence: "high" | "medium" | "low" | null;
  runnerUp: { type: VehicleTypeSlug; score: number } | null;
  overflow: boolean;
  /** Set when a numeric input failed validation. Describes which field and why; consumers can show this instead of a generic "no match" state. */
  invalidInput?: string;
  /**
   * Every active vehicle type's scoring detail, including types removed by
   * gating — powers the Step 1 "Reason" explainer. Empty when validation or
   * the payload-overflow check short-circuited before scoring ever ran.
   */
  allResults: { type: ActiveVehicleTypeSlug; score: number; factors: Factor[]; gated: boolean }[];
  /** The actual numbers behind the confidence calculation, for the "Reason" explainer. */
  confidenceExplanation: { scoreGap: number | null; unsureCount: number; thresholdApplied: string };
}

// The 3 currently active vehicle types. Cargo/heavy-lift stays in
// vehicleTypes.constants.ts and the DB check constraint for future
// re-enablement, but is deliberately excluded from gating and scoring here.
export type ActiveVehicleTypeSlug = "multirotor" | "fixed-wing" | "vtol-hybrid";
const ACTIVE_TYPES: ActiveVehicleTypeSlug[] = ["multirotor", "fixed-wing", "vtol-hybrid"];
const TIE_ORDER: ActiveVehicleTypeSlug[] = ["multirotor", "fixed-wing", "vtol-hybrid"];

// All numeric thresholds/points used by gating, scoring, and confidence,
// named so the reasoning behind each number is legible at a glance.
//
// Gate thresholds below are calibrated against the product's own stated
// operating envelopes in vehicleTypes.constants.ts (typicalRange: multirotor
// 1-15 km, fixed-wing 30-150+ km, vtol-hybrid 15-60 km) rather than the
// design_rules/reference_designs tables — those tables carry no range_km
// column at all (only payload and flight_time), and a live query against
// both returned no rows to calibrate against anyway.
const SCORING_THRESHOLDS = {
  // ── Gating ──────────────────────────────────────────────────────────
  // Multirotor's typical range tops out around 15 km; beyond ~2-3x that,
  // a battery-only hover platform can't realistically cover the mission
  // and needs fixed-wing/hybrid forward-flight efficiency instead.
  MULTIROTOR_MAX_RANGE_KM: 40,
  // A mission this short in both range AND endurance sits well inside
  // multirotor's comfortable envelope and below fixed-wing/hybrid's
  // typical minimum (~15 km) — not enough to justify VTOL's added
  // weight, cost, and mechanical complexity.
  VTOL_MIN_JUSTIFY_RANGE_KM: 3,
  VTOL_MIN_JUSTIFY_ENDURANCE_MIN: 15,

  // ── Confidence ──────────────────────────────────────────────────────
  CONFIDENCE_HIGH_SCORE_GAP: 4, // winner beats runner-up by this much or more -> high confidence
  CONFIDENCE_LOW_SCORE_GAP: 1,  // winner beats runner-up by this little or less -> low confidence

  // ── Multirotor scoring ──────────────────────────────────────────────
  MULTIROTOR_PAYLOAD_LIGHT_POINTS: 4,        // payloadKg <= 10
  MULTIROTOR_PAYLOAD_MODERATE_POINTS: 2,     // payloadKg <= 25
  MULTIROTOR_RANGE_SHORT_POINTS: 2,          // rangeKm <= 15
  MULTIROTOR_ENDURANCE_SHORT_POINTS: 2,      // enduranceMin <= 30
  MULTIROTOR_AGRICULTURE_POINTS: 2,          // agriculture mission profile
  MULTIROTOR_NO_RUNWAY_POINTS: 1,            // no runway available
  MULTIROTOR_PAYLOAD_UPPER_PENALTY: -2,      // payloadKg > 20
  MULTIROTOR_RANGE_BEYOND_REACH_PENALTY: -2, // rangeKm > 30

  // ── Fixed-wing scoring ──────────────────────────────────────────────
  FIXEDWING_RUNWAY_YES_POINTS: 3,
  FIXEDWING_RUNWAY_NO_PENALTY: -3,
  FIXEDWING_RUNWAY_UNSURE_PENALTY: -1,
  FIXEDWING_PAYLOAD_LIGHT_POINTS: 3,       // payloadKg <= 15
  FIXEDWING_PAYLOAD_MODERATE_POINTS: 1,    // payloadKg <= 25
  FIXEDWING_RANGE_LONG_POINTS: 2,          // rangeKm > 30
  FIXEDWING_RANGE_MODERATE_POINTS: 1,      // rangeKm > 15
  FIXEDWING_ENDURANCE_LONG_POINTS: 2,      // enduranceMin > 60
  FIXEDWING_ENDURANCE_MODERATE_POINTS: 1,  // enduranceMin > 30
  FIXEDWING_MAPPING_INFRA_POINTS: 2,       // mapping/survey or infrastructure mission profile

  // ── VTOL hybrid scoring ─────────────────────────────────────────────
  VTOL_NO_RUNWAY_POINTS: 2,
  VTOL_PAYLOAD_MIDBAND_POINTS: 3,    // 10 <= payloadKg <= 25
  VTOL_PAYLOAD_LIGHT_POINTS: 1,      // payloadKg < 10
  VTOL_RANGE_BEYOND_HOVER_POINTS: 2, // rangeKm > 20
  VTOL_RANGE_MODERATE_POINTS: 1,     // rangeKm > 10
  VTOL_ENDURANCE_POINTS: 1,          // enduranceMin > 45
  VTOL_MISSION_PROFILE_POINTS: 2,    // delivery, infrastructure, or surveillance mission profile
  // Soft scoring-level nudge for a small mission (distinct from the hard
  // VTOL_MIN_JUSTIFY_* gate above — this only docks points, it doesn't remove the type).
  VTOL_SMALL_MISSION_PENALTY: -2,    // rangeKm <= 10 && enduranceMin <= 20
} as const;

// Derive matching vertical tags from the actual verticals.constants.tsx
// content (tag/title/subtitle keyword search) instead of hardcoding slugs
// that may not exist in that file.
function tagsMatching(keywords: string[]): Set<string> {
  const kws = keywords.map((k) => k.toLowerCase());
  return new Set(
    VERTICALS.filter((v) =>
      kws.some(
        (k) =>
          v.tag.toLowerCase().includes(k) ||
          v.title.toLowerCase().includes(k) ||
          v.subtitle.toLowerCase().includes(k),
      ),
    ).map((v) => v.tag),
  );
}

const AGRICULTURE_TAGS = tagsMatching(["agri"]);
const MAPPING_SURVEY_TAGS = tagsMatching(["map", "survey"]);
const INFRASTRUCTURE_TAGS = tagsMatching(["infra"]);
const SURVEILLANCE_TAGS = tagsMatching(["surveillance", "guard"]);
const DELIVERY_TAGS = tagsMatching(["deliver"]);

export interface Factor {
  points: number;
  label: string;
}

interface ScoreResult {
  type: ActiveVehicleTypeSlug;
  score: number;
  factors: Factor[];
}

function scoreMultirotor(input: VehicleTypeRecommenderInput): ScoreResult {
  const { payloadKg, rangeKm, enduranceMin, runwayAvailable, vertical } = input;
  const factors: Factor[] = [];
  let score = 0;

  if (payloadKg <= 10) {
    score += SCORING_THRESHOLDS.MULTIROTOR_PAYLOAD_LIGHT_POINTS;
    factors.push({ points: SCORING_THRESHOLDS.MULTIROTOR_PAYLOAD_LIGHT_POINTS, label: `a light payload of ${payloadKg} kg` });
  } else if (payloadKg <= 25) {
    score += SCORING_THRESHOLDS.MULTIROTOR_PAYLOAD_MODERATE_POINTS;
    factors.push({ points: SCORING_THRESHOLDS.MULTIROTOR_PAYLOAD_MODERATE_POINTS, label: `a moderate payload of ${payloadKg} kg` });
  }

  if (rangeKm <= 15) {
    score += SCORING_THRESHOLDS.MULTIROTOR_RANGE_SHORT_POINTS;
    factors.push({ points: SCORING_THRESHOLDS.MULTIROTOR_RANGE_SHORT_POINTS, label: `a short range of ${rangeKm} km` });
  }
  if (enduranceMin <= 30) {
    score += SCORING_THRESHOLDS.MULTIROTOR_ENDURANCE_SHORT_POINTS;
    factors.push({ points: SCORING_THRESHOLDS.MULTIROTOR_ENDURANCE_SHORT_POINTS, label: `a short endurance need of ${enduranceMin} min` });
  }
  if (AGRICULTURE_TAGS.has(vertical)) {
    score += SCORING_THRESHOLDS.MULTIROTOR_AGRICULTURE_POINTS;
    factors.push({ points: SCORING_THRESHOLDS.MULTIROTOR_AGRICULTURE_POINTS, label: "an agriculture mission profile" });
  }
  if (runwayAvailable === "no") {
    score += SCORING_THRESHOLDS.MULTIROTOR_NO_RUNWAY_POINTS;
    factors.push({ points: SCORING_THRESHOLDS.MULTIROTOR_NO_RUNWAY_POINTS, label: "no runway available" });
  }
  if (payloadKg > 20) {
    score += SCORING_THRESHOLDS.MULTIROTOR_PAYLOAD_UPPER_PENALTY;
    factors.push({ points: SCORING_THRESHOLDS.MULTIROTOR_PAYLOAD_UPPER_PENALTY, label: `a payload of ${payloadKg} kg near the upper limit` });
  }
  if (rangeKm > 30) {
    score += SCORING_THRESHOLDS.MULTIROTOR_RANGE_BEYOND_REACH_PENALTY;
    factors.push({ points: SCORING_THRESHOLDS.MULTIROTOR_RANGE_BEYOND_REACH_PENALTY, label: `a range of ${rangeKm} km beyond typical multirotor reach` });
  }

  return { type: "multirotor", score, factors };
}

function scoreFixedWing(input: VehicleTypeRecommenderInput): ScoreResult {
  const { payloadKg, rangeKm, enduranceMin, runwayAvailable, vertical } = input;
  const factors: Factor[] = [];
  let score = 0;

  if (runwayAvailable === "yes") {
    score += SCORING_THRESHOLDS.FIXEDWING_RUNWAY_YES_POINTS;
    factors.push({ points: SCORING_THRESHOLDS.FIXEDWING_RUNWAY_YES_POINTS, label: "a runway available for launch" });
  } else if (runwayAvailable === "no") {
    score += SCORING_THRESHOLDS.FIXEDWING_RUNWAY_NO_PENALTY;
    factors.push({ points: SCORING_THRESHOLDS.FIXEDWING_RUNWAY_NO_PENALTY, label: "no runway available" });
  } else if (runwayAvailable === "unsure") {
    score += SCORING_THRESHOLDS.FIXEDWING_RUNWAY_UNSURE_PENALTY;
    factors.push({ points: SCORING_THRESHOLDS.FIXEDWING_RUNWAY_UNSURE_PENALTY, label: "uncertain runway access" });
  }

  if (payloadKg <= 15) {
    score += SCORING_THRESHOLDS.FIXEDWING_PAYLOAD_LIGHT_POINTS;
    factors.push({ points: SCORING_THRESHOLDS.FIXEDWING_PAYLOAD_LIGHT_POINTS, label: `a light payload of ${payloadKg} kg` });
  } else if (payloadKg <= 25) {
    score += SCORING_THRESHOLDS.FIXEDWING_PAYLOAD_MODERATE_POINTS;
    factors.push({ points: SCORING_THRESHOLDS.FIXEDWING_PAYLOAD_MODERATE_POINTS, label: `a moderate payload of ${payloadKg} kg` });
  }

  if (rangeKm > 30) {
    score += SCORING_THRESHOLDS.FIXEDWING_RANGE_LONG_POINTS;
    factors.push({ points: SCORING_THRESHOLDS.FIXEDWING_RANGE_LONG_POINTS, label: `a long range of ${rangeKm} km` });
  } else if (rangeKm > 15) {
    score += SCORING_THRESHOLDS.FIXEDWING_RANGE_MODERATE_POINTS;
    factors.push({ points: SCORING_THRESHOLDS.FIXEDWING_RANGE_MODERATE_POINTS, label: `a moderate range of ${rangeKm} km` });
  }

  if (enduranceMin > 60) {
    score += SCORING_THRESHOLDS.FIXEDWING_ENDURANCE_LONG_POINTS;
    factors.push({ points: SCORING_THRESHOLDS.FIXEDWING_ENDURANCE_LONG_POINTS, label: `a long endurance need of ${enduranceMin} min` });
  } else if (enduranceMin > 30) {
    score += SCORING_THRESHOLDS.FIXEDWING_ENDURANCE_MODERATE_POINTS;
    factors.push({ points: SCORING_THRESHOLDS.FIXEDWING_ENDURANCE_MODERATE_POINTS, label: `a moderate endurance need of ${enduranceMin} min` });
  }

  if (MAPPING_SURVEY_TAGS.has(vertical) || INFRASTRUCTURE_TAGS.has(vertical)) {
    score += SCORING_THRESHOLDS.FIXEDWING_MAPPING_INFRA_POINTS;
    factors.push({ points: SCORING_THRESHOLDS.FIXEDWING_MAPPING_INFRA_POINTS, label: "a mapping/survey or infrastructure mission profile" });
  }

  return { type: "fixed-wing", score, factors };
}

function scoreVtolHybrid(input: VehicleTypeRecommenderInput): ScoreResult {
  const { payloadKg, rangeKm, enduranceMin, runwayAvailable, vertical } = input;
  const factors: Factor[] = [];
  let score = 0;

  if (runwayAvailable === "no") {
    score += SCORING_THRESHOLDS.VTOL_NO_RUNWAY_POINTS;
    factors.push({ points: SCORING_THRESHOLDS.VTOL_NO_RUNWAY_POINTS, label: "no runway available" });
  }

  if (payloadKg >= 10 && payloadKg <= 25) {
    score += SCORING_THRESHOLDS.VTOL_PAYLOAD_MIDBAND_POINTS;
    factors.push({ points: SCORING_THRESHOLDS.VTOL_PAYLOAD_MIDBAND_POINTS, label: `a payload of ${payloadKg} kg in the mid-weight band` });
  } else if (payloadKg < 10) {
    score += SCORING_THRESHOLDS.VTOL_PAYLOAD_LIGHT_POINTS;
    factors.push({ points: SCORING_THRESHOLDS.VTOL_PAYLOAD_LIGHT_POINTS, label: `a payload of ${payloadKg} kg` });
  }

  if (rangeKm > 20) {
    score += SCORING_THRESHOLDS.VTOL_RANGE_BEYOND_HOVER_POINTS;
    factors.push({ points: SCORING_THRESHOLDS.VTOL_RANGE_BEYOND_HOVER_POINTS, label: `a range of ${rangeKm} km beyond simple hover range` });
  } else if (rangeKm > 10) {
    score += SCORING_THRESHOLDS.VTOL_RANGE_MODERATE_POINTS;
    factors.push({ points: SCORING_THRESHOLDS.VTOL_RANGE_MODERATE_POINTS, label: `a moderate range of ${rangeKm} km` });
  }

  if (enduranceMin > 45) {
    score += SCORING_THRESHOLDS.VTOL_ENDURANCE_POINTS;
    factors.push({ points: SCORING_THRESHOLDS.VTOL_ENDURANCE_POINTS, label: `an endurance need of ${enduranceMin} min` });
  }

  if (DELIVERY_TAGS.has(vertical) || INFRASTRUCTURE_TAGS.has(vertical) || SURVEILLANCE_TAGS.has(vertical)) {
    score += SCORING_THRESHOLDS.VTOL_MISSION_PROFILE_POINTS;
    factors.push({ points: SCORING_THRESHOLDS.VTOL_MISSION_PROFILE_POINTS, label: "a delivery, infrastructure, or surveillance mission profile" });
  }

  if (rangeKm <= 10 && enduranceMin <= 20) {
    score += SCORING_THRESHOLDS.VTOL_SMALL_MISSION_PENALTY;
    factors.push({ points: SCORING_THRESHOLDS.VTOL_SMALL_MISSION_PENALTY, label: `a short range and endurance that don't justify hybrid complexity` });
  }

  return { type: "vtol-hybrid", score, factors };
}

const SCORERS: Record<ActiveVehicleTypeSlug, (input: VehicleTypeRecommenderInput) => ScoreResult> = {
  "multirotor": scoreMultirotor,
  "fixed-wing": scoreFixedWing,
  "vtol-hybrid": scoreVtolHybrid,
};

function gateSurvivors(input: VehicleTypeRecommenderInput): ActiveVehicleTypeSlug[] {
  let survivors: ActiveVehicleTypeSlug[] = [...ACTIVE_TYPES];

  // Hover requirement rules out fixed-wing — it needs forward airspeed for
  // wing lift and cannot hover.
  if (input.hoverRequired === "yes") {
    survivors = survivors.filter((t) => t !== "fixed-wing");
  }

  // Range far beyond multirotor's typical reach rules out multirotor — a
  // battery-only hover platform can't realistically cover it.
  if (input.rangeKm > SCORING_THRESHOLDS.MULTIROTOR_MAX_RANGE_KM) {
    survivors = survivors.filter((t) => t !== "multirotor");
  }

  // A mission this short in both range AND endurance rules out vtol-hybrid —
  // not enough distance/duration to justify VTOL's added complexity over a
  // plain multirotor.
  if (
    input.rangeKm <= SCORING_THRESHOLDS.VTOL_MIN_JUSTIFY_RANGE_KM &&
    input.enduranceMin <= SCORING_THRESHOLDS.VTOL_MIN_JUSTIFY_ENDURANCE_MIN
  ) {
    survivors = survivors.filter((t) => t !== "vtol-hybrid");
  }

  return survivors;
}

function buildReasoning(winner: ScoreResult): string {
  const label = getVehicleType(winner.type)?.label ?? winner.type;
  const top = [...winner.factors]
    .sort((a, b) => Math.abs(b.points) - Math.abs(a.points))
    .slice(0, 2);

  if (top.length === 0) {
    return `${label} is the best fit among the available platform types for this mission.`;
  }

  const clauses = top.map((f) => f.label).join(" and ");
  return `${label} fits best here, mainly because of ${clauses}.`;
}

// Rejects non-finite (NaN/Infinity) or negative values for a numeric input field.
function validateNumericField(name: string, value: number): string | null {
  if (!Number.isFinite(value) || value < 0) {
    return `${name} must be a positive number`;
  }
  return null;
}

export function recommendVehicleType(
  input: VehicleTypeRecommenderInput,
): VehicleTypeRecommendation {
  // Stage -1 — input validation
  const invalidInput =
    validateNumericField("payloadKg", input.payloadKg) ??
    validateNumericField("rangeKm", input.rangeKm) ??
    validateNumericField("enduranceMin", input.enduranceMin);

  if (invalidInput) {
    return {
      type: null, overflow: true, reasoning: "", confidence: null, runnerUp: null, invalidInput,
      allResults: [],
      confidenceExplanation: { scoreGap: null, unsureCount: 0, thresholdApplied: "input validation failed — no scoring performed" },
    };
  }

  // Stage 0 — overflow check
  if (input.payloadKg > 25) {
    return {
      type: null, overflow: true, reasoning: "", confidence: null, runnerUp: null,
      allResults: [],
      confidenceExplanation: { scoreGap: null, unsureCount: 0, thresholdApplied: "payload exceeds supported range — no scoring performed" },
    };
  }

  // Stage 1 — gate
  const survivors = gateSurvivors(input);

  // Stage 2 — score survivors
  const results = survivors
    .map((t) => SCORERS[t](input))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return TIE_ORDER.indexOf(a.type) - TIE_ORDER.indexOf(b.type);
    });

  const winner = results[0];
  const runnerUpResult = results[1] ?? null;

  // unsureCount is always well-defined regardless of which confidence branch
  // fires below, so it's computed once up front for confidenceExplanation.
  const unsureCount = [input.hoverRequired, input.runwayAvailable].filter(
    (v) => v === "unsure",
  ).length;

  // Stage 3 — confidence
  //
  // survivors.length === 1 is reachable now that gateSurvivors can remove
  // two types at once:
  //   - hoverRequired === "yes" (drops fixed-wing) + rangeKm > MULTIROTOR_MAX_RANGE_KM
  //     (drops multirotor) leaves only vtol-hybrid.
  //   - hoverRequired === "yes" (drops fixed-wing) + a tiny mission (drops
  //     vtol-hybrid) leaves only multirotor.
  // (All three gates firing at once is not possible: the multirotor gate
  // requires rangeKm > 40 while the vtol-hybrid gate requires rangeKm <= 3,
  // so survivors.length can never reach 0.)
  let confidence: "high" | "medium" | "low";
  let scoreGap: number | null = null;
  let thresholdApplied: string;
  if (survivors.length === 1 || !runnerUpResult) {
    confidence = "high";
    thresholdApplied = "only one platform type survived gating — no comparison needed";
  } else {
    scoreGap = winner.score - runnerUpResult.score;

    if (scoreGap >= SCORING_THRESHOLDS.CONFIDENCE_HIGH_SCORE_GAP && unsureCount <= 1) {
      confidence = "high";
      thresholdApplied = `scoreGap >= ${SCORING_THRESHOLDS.CONFIDENCE_HIGH_SCORE_GAP} and unsureCount <= 1`;
    } else if (scoreGap <= SCORING_THRESHOLDS.CONFIDENCE_LOW_SCORE_GAP || unsureCount === 2) {
      confidence = "low";
      const reasons: string[] = [];
      if (scoreGap <= SCORING_THRESHOLDS.CONFIDENCE_LOW_SCORE_GAP) {
        reasons.push(`scoreGap <= ${SCORING_THRESHOLDS.CONFIDENCE_LOW_SCORE_GAP}`);
      }
      if (unsureCount === 2) reasons.push("unsureCount === 2");
      thresholdApplied = reasons.join(" and ");
    } else {
      confidence = "medium";
      thresholdApplied = "scoreGap and unsureCount fell between the high- and low-confidence thresholds";
    }
  }

  const runnerUp =
    survivors.length === 1 || !runnerUpResult
      ? null
      : { type: runnerUpResult.type, score: runnerUpResult.score };

  // Stage 4 — reasoning
  const reasoning = buildReasoning(winner);

  // Stage 5 — full scoring detail for the Step 1 "Reason" explainer. Every
  // ACTIVE_TYPES entry appears, including ones gateSurvivors removed — those
  // are surfaced as gated:true (never scored) rather than omitted.
  const allResults: VehicleTypeRecommendation["allResults"] = ACTIVE_TYPES.map((t) => {
    if (!survivors.includes(t)) {
      return { type: t, score: 0, factors: [], gated: true };
    }
    const scored = results.find((r) => r.type === t)!;
    return { type: scored.type, score: scored.score, factors: scored.factors, gated: false };
  });

  return {
    type: winner.type,
    reasoning,
    confidence,
    runnerUp,
    overflow: false,
    allResults,
    confidenceExplanation: { scoreGap, unsureCount, thresholdApplied },
  };
}
