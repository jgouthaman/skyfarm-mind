import type {
  IntelligenceResult, MatchedRule, MatchedReference, AIGeneratedDesign,
} from './types';
import type { WizardFormState } from '@/lib/design-studio/wizard-types';

// NOTE ON SCOPE: this module was specified against a DesignStudioOutput
// interface and three builder signatures that were meant to be pasted into
// the task but weren't actually present in the message — reconstructed here
// from the detailed field-by-field description that followed instead. Field
// names/types are my best-faith read of that description; flag if anything
// here doesn't match what was actually intended.

export type DesignStudioSource = 'rule' | 'reference' | 'ai';

export interface ConfidenceMetric {
  label: string;
  percent: number; // 0-100
}

export interface DesignStudioOutput {
  source: DesignStudioSource;
  sourceLabel: string;
  designName: string;

  // Build spec — populated by whichever source builder ran; every field a
  // given source doesn't have stays null (never fabricated).
  droneType: string | null;
  frameSize: string | null;
  motorClass: string | null;
  motorCount: number | null;
  batteryConfig: string | null; // design_rules.battery_config / AIGeneratedDesign.battery_config
  battery: string | null;       // reference_designs.battery (kept distinct — different real column)
  escRating: string | null;
  propellerSpec: string | null;
  flightController: string | null;
  twrMin: number | null;
  riskLevel: string | null;
  riskFlags: string[] | null;
  engineerNotes: string | null;
  costMinInr: number | null;
  costMaxInr: number | null;
  flightTimeMin: number | null;
  flightTimeMax: number | null;

  componentList: Record<string, unknown> | null;
  requirements: Record<string, unknown> | null;
  payloadDelta: number | null;
  matchScore: number | null;
  confidenceScore: number | null;

  aiDisclaimer: string | null;

  confidenceMetrics: ConfidenceMetric[];
}

// How centered `value` is within [min, max]: 100% at the midpoint, decaying
// linearly to 0% at either edge and beyond (never below 0). Used for both
// "Payload fit" and "Flight time target" — both are the same shape of
// question (is this real number centered in this real range?), so one
// formula covers both rather than inventing a second one.
function centeredFitPercent(value: number, min: number, max: number): number {
  const midpoint = (min + max) / 2;
  const halfRange = (max - min) / 2;
  if (halfRange <= 0) return value === midpoint ? 100 : 0;
  const distance = Math.abs(value - midpoint);
  return Math.max(0, Math.min(100, Math.round(100 - (distance / halfRange) * 100)));
}

export function buildFromRule(rule: MatchedRule, form: WizardFormState): DesignStudioOutput {
  const confidenceMetrics: ConfidenceMetric[] = [];

  const payloadWeight = parseFloat(form.payloadWeight);
  if (Number.isFinite(payloadWeight) && rule.payload_min_kg != null && rule.payload_max_kg != null) {
    confidenceMetrics.push({
      label: 'Payload fit',
      percent: centeredFitPercent(payloadWeight, rule.payload_min_kg, rule.payload_max_kg),
    });
  }

  const requiredFlightTime = parseFloat(form.requiredFlightTime);
  if (Number.isFinite(requiredFlightTime) && rule.flight_time_min != null && rule.flight_time_max != null) {
    confidenceMetrics.push({
      label: 'Flight time target',
      percent: centeredFitPercent(requiredFlightTime, rule.flight_time_min, rule.flight_time_max),
    });
  }

  return {
    source: 'rule',
    sourceLabel: 'From Matched Rule',
    designName: rule.rule_name ?? rule.drone_type,
    droneType: rule.drone_type,
    frameSize: rule.frame_size,
    motorClass: rule.motor_class,
    motorCount: rule.motor_count,
    batteryConfig: rule.battery_config,
    battery: null,
    escRating: rule.esc_rating,
    propellerSpec: rule.propeller_spec,
    flightController: rule.flight_controller,
    twrMin: rule.twr_min,
    riskLevel: rule.risk_level,
    riskFlags: rule.risk_flags,
    engineerNotes: rule.engineer_notes,
    costMinInr: rule.cost_min_inr,
    costMaxInr: rule.cost_max_inr,
    flightTimeMin: rule.flight_time_min,
    flightTimeMax: rule.flight_time_max,
    componentList: null,
    requirements: null,
    payloadDelta: null,
    matchScore: null,
    confidenceScore: null,
    aiDisclaimer: null,
    confidenceMetrics,
  };
}

export function buildFromReference(reference: MatchedReference, form: WizardFormState): DesignStudioOutput {
  void form; // no form field feeds a reference-design metric today; kept for signature symmetry

  const confidenceMetrics: ConfidenceMetric[] = [
    {
      // Reuses the same 2 kg / 5 kg good/borderline boundaries
      // StepRecommendation.tsx already uses to color payload_delta
      // (emerald < 2, amber <= 5, red beyond), rather than inventing a new
      // scale: 0 kg delta = 100%, decaying 10 points per kg, floored at 0%
      // by a 10 kg delta.
      label: 'Payload match',
      percent: Math.max(0, Math.min(100, Math.round(100 - reference.payload_delta * 10))),
    },
  ];

  if (reference.confidence_score != null) {
    confidenceMetrics.push({
      label: 'Design confidence',
      percent: Math.max(0, Math.min(100, Math.round(reference.confidence_score))),
    });
  }

  return {
    source: 'reference',
    sourceLabel: 'From Proven Design',
    designName: reference.name,
    droneType: reference.drone_type,
    frameSize: reference.frame_size,
    motorClass: reference.motor_class,
    motorCount: null,
    batteryConfig: null,
    battery: reference.battery,
    escRating: null,
    propellerSpec: null,
    flightController: null,
    twrMin: null,
    riskLevel: null,
    riskFlags: null,
    engineerNotes: reference.engineer_notes,
    costMinInr: null,
    costMaxInr: null,
    flightTimeMin: null,
    flightTimeMax: null,
    componentList: reference.component_list,
    requirements: reference.requirements,
    payloadDelta: reference.payload_delta,
    matchScore: reference.score,
    confidenceScore: reference.confidence_score,
    aiDisclaimer: null,
    confidenceMetrics,
  };
}

// Stub only — AI Advisor (Phase 3) is on hold, so nothing calls this yet
// (buildDesignStudioOutput's 'ai' branch always returns null below, since
// IntelligenceResult carries no AI-generated design data today). Exists so
// the type checks and the wiring is ready once that work resumes.
export function buildFromAI(ai: AIGeneratedDesign): DesignStudioOutput {
  return {
    source: 'ai',
    sourceLabel: 'From AI Advisor',
    designName: ai.name,
    droneType: ai.drone_type,
    frameSize: ai.frame_size,
    motorClass: ai.motor_class,
    motorCount: null,
    batteryConfig: ai.battery_config,
    battery: null,
    escRating: null,
    propellerSpec: null,
    flightController: null,
    twrMin: null,
    riskLevel: null,
    riskFlags: null,
    engineerNotes: ai.engineer_notes,
    costMinInr: null,
    costMaxInr: null,
    flightTimeMin: null,
    flightTimeMax: null,
    componentList: ai.component_list,
    requirements: null,
    payloadDelta: null,
    matchScore: null,
    confidenceScore: ai.confidence_score,
    aiDisclaimer: 'AI-generated — not yet validated against build outcomes. Review carefully before use.',
    confidenceMetrics: [],
  };
}

export function buildDesignStudioOutput(
  recommendation: IntelligenceResult,
  acceptedSource: DesignStudioSource,
  form: WizardFormState,
): DesignStudioOutput | null {
  if (acceptedSource === 'rule') {
    return recommendation.matched_rule ? buildFromRule(recommendation.matched_rule, form) : null;
  }
  if (acceptedSource === 'reference') {
    return recommendation.matched_reference ? buildFromReference(recommendation.matched_reference, form) : null;
  }
  // 'ai' — no AI-generated design data flows through IntelligenceResult yet;
  // see buildFromAI's comment above.
  return null;
}
