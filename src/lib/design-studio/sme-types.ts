export interface DesignRule {
  id:                 string;
  engineer_name:      string;
  vertical:           string;
  purpose:            string;
  drone_type:         string | null;
  confidence_level:   number | null;
  payload_min_kg:     number | null;
  payload_max_kg:     number | null;
  flight_time_min:    number | null;
  terrain:            string | null;
  wind_condition:     string | null;
  automation_level:   string | null;
  budget_range:       string | null;
  frame_size:         string | null;
  motor_class:        string | null;
  esc_rating:         string | null;
  propeller_size:     string | null;
  battery:            string | null;
  flight_controller:  string | null;
  gps_type:           string | null;
  payload_system:     string | null;
  risk_level:         string | null;
  cost_min_inr:       number | null;
  cost_max_inr:       number | null;
  engineering_notes:  string | null;
  risk_flags:         string[] | null;
  is_active:          boolean;
  created_at:         string;
  updated_at:         string;
}

export type DesignRuleInsert = Omit<DesignRule, "id" | "created_at" | "updated_at">;

export const EMPTY_RULE: DesignRuleInsert = {
  engineer_name:     "",
  vertical:          "AgriSky",
  purpose:           "Agriculture spraying",
  drone_type:        null,
  confidence_level:  5,
  payload_min_kg:    null,
  payload_max_kg:    null,
  flight_time_min:   null,
  terrain:           null,
  wind_condition:    null,
  automation_level:  null,
  budget_range:      null,
  frame_size:        null,
  motor_class:       null,
  esc_rating:        null,
  propeller_size:    null,
  battery:           null,
  flight_controller: null,
  gps_type:          null,
  payload_system:    null,
  risk_level:        "Safe",
  cost_min_inr:      null,
  cost_max_inr:      null,
  engineering_notes: null,
  risk_flags:        [],
  is_active:         true,
};

export const SPECIALISATION_OPTIONS = [
  "Agriculture", "Surveillance", "Mapping",
  "Infrastructure", "R&D", "Fire Detection", "Logistics",
] as const;

export const DRONE_TYPE_OPTIONS = [
  "Quadcopter", "Hexacopter", "Octocopter",
  "Fixed Wing", "VTOL", "Tricopter",
] as const;

export const GPS_OPTIONS = [
  "Single GPS",
  "Dual GPS",
  "Dual GPS + RTK (cm-level)",
  "RTK only",
  "None",
] as const;

export const DRONE_TYPE_HINTS: Record<string, string> = {
  Quadcopter:    "Best for light payloads under 3 kg. Simple, cost-effective, easy to maintain.",
  Hexacopter:    "Motor redundancy makes it ideal for agri payloads 5–15 kg. Preferred for spraying.",
  Octocopter:    "Maximum lift and redundancy. Use for payloads above 15 kg or critical missions.",
  "Fixed Wing":  "Long endurance mapping. Not suited for hovering. Best for large area coverage.",
  VTOL:          "Combines hover + cruise. High cost, complex setup. Best for long-range survey.",
  Tricopter:     "Compact and agile. Limited payload. Good for close-range inspection work.",
};
