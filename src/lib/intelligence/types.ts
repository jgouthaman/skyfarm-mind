export interface IntelligenceInput {
  vertical: string;
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
}

export interface MatchedReference {
  id: string;
  name: string;
  score: number;
  payload_delta: number;
  drone_type: string;
  frame_size: string | null;
  motor_class: string | null;
  battery: string | null;
  component_list: Record<string, unknown> | null;
  requirements: Record<string, unknown> | null;
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
