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
}

// The 3 currently active vehicle types. Cargo/heavy-lift stays in
// vehicleTypes.constants.ts and the DB check constraint for future
// re-enablement, but is deliberately excluded from gating and scoring here.
type ActiveVehicleTypeSlug = "multirotor" | "fixed-wing" | "vtol-hybrid";
const ACTIVE_TYPES: ActiveVehicleTypeSlug[] = ["multirotor", "fixed-wing", "vtol-hybrid"];
const TIE_ORDER: ActiveVehicleTypeSlug[] = ["multirotor", "fixed-wing", "vtol-hybrid"];

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

interface Factor {
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
    score += 4;
    factors.push({ points: 4, label: `a light payload of ${payloadKg} kg` });
  } else if (payloadKg <= 25) {
    score += 2;
    factors.push({ points: 2, label: `a moderate payload of ${payloadKg} kg` });
  }

  if (rangeKm <= 15) {
    score += 2;
    factors.push({ points: 2, label: `a short range of ${rangeKm} km` });
  }
  if (enduranceMin <= 30) {
    score += 2;
    factors.push({ points: 2, label: `a short endurance need of ${enduranceMin} min` });
  }
  if (AGRICULTURE_TAGS.has(vertical)) {
    score += 2;
    factors.push({ points: 2, label: "an agriculture mission profile" });
  }
  if (runwayAvailable === "no") {
    score += 1;
    factors.push({ points: 1, label: "no runway available" });
  }
  if (payloadKg > 20) {
    score -= 2;
    factors.push({ points: -2, label: `a payload of ${payloadKg} kg near the upper limit` });
  }
  if (rangeKm > 30) {
    score -= 2;
    factors.push({ points: -2, label: `a range of ${rangeKm} km beyond typical multirotor reach` });
  }

  return { type: "multirotor", score, factors };
}

function scoreFixedWing(input: VehicleTypeRecommenderInput): ScoreResult {
  const { payloadKg, rangeKm, enduranceMin, runwayAvailable, vertical } = input;
  const factors: Factor[] = [];
  let score = 0;

  if (runwayAvailable === "yes") {
    score += 3;
    factors.push({ points: 3, label: "a runway available for launch" });
  } else if (runwayAvailable === "no") {
    score -= 3;
    factors.push({ points: -3, label: "no runway available" });
  } else if (runwayAvailable === "unsure") {
    score -= 1;
    factors.push({ points: -1, label: "uncertain runway access" });
  }

  if (payloadKg <= 15) {
    score += 3;
    factors.push({ points: 3, label: `a light payload of ${payloadKg} kg` });
  } else if (payloadKg <= 25) {
    score += 1;
    factors.push({ points: 1, label: `a moderate payload of ${payloadKg} kg` });
  }

  if (rangeKm > 30) {
    score += 2;
    factors.push({ points: 2, label: `a long range of ${rangeKm} km` });
  } else if (rangeKm > 15) {
    score += 1;
    factors.push({ points: 1, label: `a moderate range of ${rangeKm} km` });
  }

  if (enduranceMin > 60) {
    score += 2;
    factors.push({ points: 2, label: `a long endurance need of ${enduranceMin} min` });
  } else if (enduranceMin > 30) {
    score += 1;
    factors.push({ points: 1, label: `a moderate endurance need of ${enduranceMin} min` });
  }

  if (MAPPING_SURVEY_TAGS.has(vertical) || INFRASTRUCTURE_TAGS.has(vertical)) {
    score += 2;
    factors.push({ points: 2, label: "a mapping/survey or infrastructure mission profile" });
  }

  return { type: "fixed-wing", score, factors };
}

function scoreVtolHybrid(input: VehicleTypeRecommenderInput): ScoreResult {
  const { payloadKg, rangeKm, enduranceMin, runwayAvailable, vertical } = input;
  const factors: Factor[] = [];
  let score = 0;

  if (runwayAvailable === "no") {
    score += 2;
    factors.push({ points: 2, label: "no runway available" });
  }

  if (payloadKg >= 10 && payloadKg <= 25) {
    score += 3;
    factors.push({ points: 3, label: `a payload of ${payloadKg} kg in the mid-weight band` });
  } else if (payloadKg < 10) {
    score += 1;
    factors.push({ points: 1, label: `a payload of ${payloadKg} kg` });
  }

  if (rangeKm > 20) {
    score += 2;
    factors.push({ points: 2, label: `a range of ${rangeKm} km beyond simple hover range` });
  } else if (rangeKm > 10) {
    score += 1;
    factors.push({ points: 1, label: `a moderate range of ${rangeKm} km` });
  }

  if (enduranceMin > 45) {
    score += 1;
    factors.push({ points: 1, label: `an endurance need of ${enduranceMin} min` });
  }

  if (DELIVERY_TAGS.has(vertical) || INFRASTRUCTURE_TAGS.has(vertical) || SURVEILLANCE_TAGS.has(vertical)) {
    score += 2;
    factors.push({ points: 2, label: "a delivery, infrastructure, or surveillance mission profile" });
  }

  if (rangeKm <= 10 && enduranceMin <= 20) {
    score -= 2;
    factors.push({ points: -2, label: `a short range and endurance that don't justify hybrid complexity` });
  }

  return { type: "vtol-hybrid", score, factors };
}

const SCORERS: Record<ActiveVehicleTypeSlug, (input: VehicleTypeRecommenderInput) => ScoreResult> = {
  "multirotor": scoreMultirotor,
  "fixed-wing": scoreFixedWing,
  "vtol-hybrid": scoreVtolHybrid,
};

function gateSurvivors(input: VehicleTypeRecommenderInput): ActiveVehicleTypeSlug[] {
  if (input.hoverRequired === "yes") {
    return ACTIVE_TYPES.filter((t) => t !== "fixed-wing");
  }
  return [...ACTIVE_TYPES];
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

export function recommendVehicleType(
  input: VehicleTypeRecommenderInput,
): VehicleTypeRecommendation {
  // Stage 0 — overflow check
  if (input.payloadKg > 25) {
    return { type: null, overflow: true, reasoning: "", confidence: null, runnerUp: null };
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

  // Stage 3 — confidence
  let confidence: "high" | "medium" | "low";
  if (survivors.length === 1 || !runnerUpResult) {
    confidence = "high";
  } else {
    const scoreGap = winner.score - runnerUpResult.score;
    const unsureCount = [input.hoverRequired, input.runwayAvailable].filter(
      (v) => v === "unsure",
    ).length;

    if (scoreGap >= 4 && unsureCount <= 1) confidence = "high";
    else if (scoreGap <= 1 || unsureCount === 2) confidence = "low";
    else confidence = "medium";
  }

  const runnerUp =
    survivors.length === 1 || !runnerUpResult
      ? null
      : { type: runnerUpResult.type, score: runnerUpResult.score };

  // Stage 4 — reasoning
  const reasoning = buildReasoning(winner);

  return {
    type: winner.type,
    reasoning,
    confidence,
    runnerUp,
    overflow: false,
  };
}
