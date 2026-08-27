export interface IntelligenceInput {
  vertical: string;
  vehicleType: string;
  purpose: string;
  payloadWeight: number;
  requiredFlightTime: number;
  terrain: string | null;
  windCondition: string | null;
  userType: string | null;
}

export interface MatchedRule {
  id: string;
  rule_name: string | null;
  drone_type: string;
  frame_size: string | null;
  motor_class: string | null;
  motor_count: number | null;
  battery_config: string | null;
  esc_rating: string | null;
  propeller_spec: string | null;
  flight_controller: string | null;
  twr_min: number | null;
  risk_level: string | null;
  confidence_level: number;
  engineer_notes: string | null;
  risk_flags: string[] | null;
  cost_min_inr: number | null;
  cost_max_inr: number | null;
  flight_time_min: number | null;
  flight_time_max: number | null;
  // Already selected in ruleSolver.ts's SELECT_COLS (needed for the Phase 1B
  // nearest-fallback distance calc) but not previously mapped onto this
  // type — added for designStudioBuilder.ts's "Payload fit" confidence metric.
  payload_min_kg: number | null;
  payload_max_kg: number | null;
}

export interface MatchedReference {
  id: string;
  name: string;
  score: number;
  payload_delta: number;
  drone_type: string | null;
  frame_size: string | null;
  motor_class: string | null;
  battery: string | null;
  component_list: Record<string, unknown> | null;
  requirements: Record<string, unknown> | null;
  engineer_notes: string | null;
  confidence_score: number | null;
}

// Placeholder shape for the future AI Advisor output (Phase 3, currently on
// hold — no design doc or reference file for it exists in this repo, so this
// is a reasonable placeholder mirroring MatchedRule/MatchedReference's
// common fields, just enough for buildFromAI (designStudioBuilder.ts) to
// type-check against something real once AI Advisor actually ships. Revisit
// this shape against the real Phase 3 spec when that work resumes.
export interface AIGeneratedDesign {
  id: string;
  name: string;
  drone_type: string | null;
  frame_size: string | null;
  motor_class: string | null;
  battery_config: string | null;
  component_list: Record<string, unknown> | null;
  engineer_notes: string | null;
  confidence_score: number | null;
}

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface IntelligenceResult {
  matched_rule: MatchedRule | null;
  matched_reference: MatchedReference | null;
  confidence: ConfidenceLevel;
  rule_confidence_score: number;
  reference_score: number;
  ai_required: boolean;
  summary: string;
  is_fallback: boolean;
  fallback_reason: string | null;
}
