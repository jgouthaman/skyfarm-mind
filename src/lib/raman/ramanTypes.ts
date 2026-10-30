// Raman Agent (Bay 16) -- TypeScript mirror of the JSON the deterministic
// engine (th-gcp-service/agents/raman/raman_engine.py, ENGINE_VERSION
// raman-s1-0.1.0) returns through hangar_runner.py on the GCP VM. Field
// names and shapes copy the engine's return dicts exactly; nothing here is
// computed on the TypeScript side.

export type RamanVerdict = "PASS" | "WARN" | "FAIL" | "INFO";
export type RamanProvenanceTag = "provided" | "derived" | "assumed" | "none";
export type RamanEngineFunction = "noise_check" | "evaluate_design" | "lever_ranges" | "health";

// ── Request payloads ─────────────────────────────────────────────────────

// noise_check / lever_ranges payload, and evaluate_design's `inputs`.
// Six required inputs, then the optional ones the engine reads.
export interface RamanInputs {
  take_off_mass_kg: number;
  rotor_count: number;
  prop_diameter: number;
  prop_diameter_unit?: "in" | "m";
  blade_count: number;
  motor_kv: number;
  battery_voltage?: number;
  battery_cells?: number;
  cruise_speed: number;
  cruise_speed_unit?: "m/s" | "km/h";
  vehicle_type?: string;
  prop_pitch_in?: number;
  hover_rpm?: number;
  target_dba?: number;
  target_distance_m?: number;
  environment?: "rural" | "suburban" | "urban" | "near_people";
  rotor_spacing_m?: number;
  arm_clearance_ratio?: number;
  altitude_agl_m?: number;
  temperature_c?: number;
  humidity_pct?: number;
  chord_075_over_r?: number;
  figure_of_merit?: number;
  motor_pole_pairs?: number;
  drag_area_m2?: number;
  receiver_distances_m?: number[];
  ground_type?: "soft" | "hard" | "none";
}

// The levers evaluate_design accepts (hover_rpm and tip_speed_ms are
// alternatives; hover_rpm wins if both are given).
export interface RamanDesignChanges {
  prop_diameter_in?: number;
  blade_count?: number;
  hover_rpm?: number;
  tip_speed_ms?: number;
  rotor_spacing_m?: number;
  arm_clearance_ratio?: number;
}

export const RAMAN_LEVER_KEYS = [
  "prop_diameter_in",
  "blade_count",
  "hover_rpm",
  "tip_speed_ms",
  "rotor_spacing_m",
  "arm_clearance_ratio",
] as const;

// ── Shared pieces ────────────────────────────────────────────────────────

export interface RamanBreakdownPct {
  tonal: number;
  interaction: number;
  broadband: number;
  motor: number;
}

export interface RamanSpectrumBand {
  band_hz: number;
  spl_db: number;
  spl_dba: number;
}

export interface RamanTone {
  freq_hz: number;
  spl_db: number;
}

export interface RamanDriver {
  code:
    | "TONAL_DOMINANT"
    | "HIGH_TIP_SPEED"
    | "INTERACTION"
    | "BROADBAND"
    | "HIGH_DISK_LOADING"
    | "MOTOR"
    | "TONAL_PROMINENCE";
  weight: number;
  message: string;
}

// Fields hangar_runner.py and handler.py add around every engine result.
export interface RamanEnvelope {
  ok?: boolean;
  agent?: string;
  bay?: string;
  function?: string;
  request_id?: string | null;
  handler_ms?: number;
}

// ── noise_check ──────────────────────────────────────────────────────────

export interface RamanNoiseCheckResult extends RamanEnvelope {
  status: "ok";
  engine_version: string;
  source_was_mock: boolean;
  computed_ms: number;
  verdict: RamanVerdict;
  verdict_hover: RamanVerdict;
  verdict_cruise: RamanVerdict;
  headline: string;
  target_dba: number | null;
  target_distance_m: number;
  hover: {
    lamax_dba: number;
    laeq_dba: number;
    worst_angle_deg: number;
    breakdown_pct: RamanBreakdownPct;
    parts_dba: RamanBreakdownPct;
    spectrum: RamanSpectrumBand[];
    tones: RamanTone[];
    tonal_prominence_db: number | null;
    tonal_prominent: boolean;
  };
  cruise: {
    lamax_dba: number;
    breakdown_pct: RamanBreakdownPct;
    parts_dba: RamanBreakdownPct;
    flyover_sel_dba: number | null;
    altitude_m: number;
  };
  sound_power_lwa_db: number;
  levels_by_distance: { distance_m: number; hover_dba: number; cruise_dba: number }[];
  performance: {
    hover_rpm: number;
    cruise_rpm: number;
    tip_speed_ms: number;
    tip_mach: number;
    advancing_tip_mach_cruise: number;
    bpf_hz: number;
    disk_loading_n_m2: number;
    thrust_to_weight: number;
    rpm_max_est: number;
    hover_power_w: number;
    cruise_tilt_deg: number;
  };
  drivers: RamanDriver[];
  warnings: string[];
  inputs_resolved: {
    take_off_mass_kg: number;
    rotor_count: number;
    prop_diameter_m: number;
    blade_count: number;
    motor_kv: number;
    battery_voltage: number;
    cruise_speed_ms: number;
    pitch_ratio: number;
    arm_clearance_ratio: number;
    rotor_spacing_m: number | null;
    altitude_agl_m: number;
    temperature_c: number;
    humidity_pct: number;
    ground_type: string;
    environment: string | null;
  };
  provenance: Record<string, RamanProvenanceTag>;
  assumptions: string[];
  excluded_sources: string[];
  confidence_score: number;
  accuracy_note: string;
  models: string[];
}

// ── evaluate_design ──────────────────────────────────────────────────────

export interface RamanEvaluateResult extends RamanEnvelope {
  status: "ok";
  engine_version: string;
  source_was_mock: boolean;
  computed_ms: number;
  baseline_dba: number;
  predicted_dba: number;
  delta_db: number;
  verdict: RamanVerdict;
  target_dba: number | null;
  target_distance_m: number;
  breakdown_pct: RamanBreakdownPct;
  design: {
    prop_diameter_in: number;
    blade_count: number;
    hover_rpm: number;
    tip_speed_ms: number;
    tip_mach: number;
    rotor_spacing_m: number | null;
    arm_clearance_ratio: number;
    take_off_mass_kg: number;
  };
  tradeoffs: RamanTradeoffs;
  warnings: string[];
  implied_pitch_ratio: number | null;
  feasible: boolean;
}

// A locked fix (raman_noise_checks kind fix_prediction): the evaluate_design
// result plus the full noise_check rerun on the modified design.
export type RamanFixPredictionResult = RamanEvaluateResult & { noise_check: RamanNoiseCheckResult };

export interface RamanTradeoffs {
  added_mass_g: number;
  hover_power_w: number;
  hover_power_change_pct: number;
  flight_time_change_pct: number;
  efficiency_g_per_w: number;
  efficiency_change_pct: number;
  thrust_to_weight: number;
}

// ── lever_ranges ─────────────────────────────────────────────────────────

export interface RamanLever {
  min: number;
  max: number;
  step: number;
  current: number | null;
}

export interface RamanLeverRangesResult extends RamanEnvelope {
  status: "ok";
  levers: {
    prop_diameter_in: RamanLever;
    blade_count: RamanLever;
    hover_rpm: RamanLever;
    rotor_spacing_m: RamanLever;
    arm_clearance_ratio: RamanLever;
  };
}

// ── health ───────────────────────────────────────────────────────────────

export interface RamanHealthResult extends RamanEnvelope {
  status: "ok";
  functions: string[];
  engine_version?: string;
}

// ── Engine errors ────────────────────────────────────────────────────────

export interface RamanFieldError {
  field: string;
  message: string;
}

export interface RamanEngineErrorBody extends RamanEnvelope {
  status: "error";
  error: "invalid_input" | "unknown_function" | "engine_failure" | string;
  message: string;
  fields?: RamanFieldError[];
}

export interface RamanResultByFunction {
  noise_check: RamanNoiseCheckResult;
  evaluate_design: RamanEvaluateResult;
  lever_ranges: RamanLeverRangesResult;
  health: RamanHealthResult;
}

// ── Noise Fix agent ──────────────────────────────────────────────────────

// raman_agent_runs.goal
export interface RamanFixGoal {
  target_dba: number;
  target_distance_m: number;
  max_added_mass_g: number;
  min_flight_time_change_pct: number;
  max_iterations: number;
  lever_ranges?: RamanLeverRangesResult["levers"];
}

// One ranked option in raman_agent_runs.ranked_options -- always an
// iteration the agent actually evaluated, with the engine's own numbers.
export interface RamanRankedOption {
  rank: number;
  iteration: number;
  changes: RamanDesignChanges;
  summary: string;
  effort: "easy" | "medium" | "hard";
  predicted_dba: number | null;
  delta_db: number | null;
  tradeoffs: RamanTradeoffs | null;
  feasible: boolean | null;
}
