import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { MassProperties } from "./cadDesignGeneration.ts";

// Bay 05 (Simulation Orchestrator Agent) rules. The gate below mirrors
// cadDesignRules.ts's exact pattern (flat rule table + evaluate function,
// no DB) — it runs BEFORE any LLM call, on Bay 04's already-known output
// shape (MassProperties + its own interference/DFM validation), and never
// proceeds to flight-envelope reasoning for a CAD design already known to
// be nothing or already flagged as physically inconsistent.
//
// There is no post-LLM "evaluateSimulationValidation" here yet, unlike
// cadDesignRules.ts's paired evaluateCADDesignValidation — that function
// would need to operate on simDesignGeneration.ts's own output shape
// (flight_envelope / stability / risk_flags, SimulationOrchestratorAgent.md
// Section 7), which doesn't exist yet and is explicitly out of scope this
// pass. Adding it now would mean guessing that file's shape rather than
// building against it. It belongs in this file once simDesignGeneration.ts
// is built.
//
// The threshold loader below is this file's one deliberate departure from
// cadDesignRules.ts's no-DB convention. SimulationOrchestratorAgent.md
// Section 1 names `design_rules` as the source of vertical-specific
// performance thresholds — and unlike the fictitious `Hangar_design_rules`
// Bay 01/03/04's own rules files deliberately avoid inventing, `design_rules`
// is a real, pre-existing table (already queried by src/lib/intelligence/
// ruleSolver.ts and referenceMatcher.ts for the Design Studio wizard). Since
// it's real, this file queries it directly instead of hardcoding a second,
// competing TS rule table.

export interface SimulationGateContext {
  massProperties: MassProperties;
  interferenceClear: boolean;
}

export interface SimulationGateResult {
  eliminated: boolean;
  reasons: string[];
}

interface SimulationGateRule {
  id: string;
  trigger: string;
  matches: (ctx: SimulationGateContext) => boolean;
  reason: string;
}

const SIMULATION_GATE_RULES: SimulationGateRule[] = [
  {
    id: "SDR-001",
    trigger: "CAD model weight is non-positive",
    matches: (ctx) => ctx.massProperties.weightKg <= 0,
    reason:
      "The upstream CAD model has a non-positive weight — there is nothing physically valid to estimate flight performance for.",
  },
  {
    id: "SDR-002",
    trigger: "CAD design's own interference check did not clear",
    matches: (ctx) => !ctx.interferenceClear,
    reason:
      "The upstream CAD design's own interference/DFM validation did not clear — never proceed to flight simulation for a design already flagged as physically inconsistent.",
  },
];

export function evaluateSimulationGate(ctx: SimulationGateContext): SimulationGateResult {
  const reasons: string[] = [];
  for (const rule of SIMULATION_GATE_RULES) {
    if (rule.matches(ctx)) reasons.push(`${rule.id}: ${rule.reason}`);
  }
  return { eliminated: reasons.length > 0, reasons };
}

// ── Vertical-specific performance thresholds (design_rules) ──────────────
//
// Checked the real design_rules table schema live via a service-role probe
// before writing this (not assumed from the spec doc). Its actual columns:
// automation_level, battery_config, budget_range, confidence_level,
// cost_max_inr, cost_min_inr, created_at, created_by, drone_type,
// engineer_name, engineer_notes, esc_rating, fallback_count,
// flight_controller, flight_time_max, flight_time_min, frame_size,
// gps_type, id, last_matched_at, match_count, motor_class, motor_count,
// payload_max_kg, payload_min_kg, payload_system, propeller_spec, purpose,
// risk_flags, risk_level, rule_name, status, terrain_types, twr_min,
// updated_at, user_type, vehicle_type, vertical, wind_condition.
//
// SimulationOrchestratorAgent.md Section 1 asks for three threshold
// categories. Against the real schema:
// - Loiter time minimum: no column named this. flight_time_min is the
//   closest real analogue and is used as that below — but note it
//   describes the achieved flight-time range of a *specific matched
//   hardware rule* (e.g. "this AgriSky NDVI build gets 30-60 min"), not a
//   regulatory-style floor every design in the vertical must clear. Treat
//   it as a sanity bound, not a hard requirement.
// - Payload-vs-range tradeoff curve: GAP. design_rules has payload_min_kg/
//   payload_max_kg (a payload range) but no distance/range column at all,
//   and nothing resembling a curve. Not invented here.
// - Stability margin requirement: GAP. No column anywhere in design_rules
//   resembles a CG/static-margin threshold. twr_min is real but is a
//   propulsion thrust-to-weight floor, not an aerodynamic stability
//   margin — exposed below as twrMin, not relabeled.
// Both gaps are represented as explicit `null` fields with the comments
// above, per the standing instruction to flag missing data rather than
// invent placeholder values.
//
// vertical is passed through as-is — no VERTICAL_TO_SLUG bridging.
// referenceMatcher.ts's VERTICAL_TO_SLUG maps wizard display names
// ("AgriSky", ...) to reference_designs' slug format ("agriculture", ...).
// design_rules does not use that slug format: confirmed live (a sampled
// design_rules.vertical column returns "AgriSky", "GuardSky", "GeoSky",
// "InfraSky" directly) and matches ruleSolver.ts's own header comment
// ("input.vertical is compared as-is, with no display-name→slug mapping").
// This also matches the display-name format Mission Agent's own
// mission_specs.vertical field already produces (missionSpecAssembly.ts's
// VERTICAL_KEYWORDS). No bridging is needed for this lookup; VERTICAL_TO_SLUG
// only matters when querying reference_designs, which this file doesn't do.
//
// No new RPC/SET search_path='' function was added for this lookup — it's
// a plain filtered select, the same shape ruleSolver.ts already uses
// against this exact table, not a Hangar_*-owned versioned function like
// Bay 03/04's get_next_*_spec_version RPCs.

export interface PerformanceThresholds {
  vertical: string;
  loiterTimeMinMinutes: number | null;
  payloadMinKg: number | null;
  payloadMaxKg: number | null;
  twrMin: number | null;
  payloadRangeCurve: null; // GAP — no such column in design_rules; see header comment.
  stabilityMarginMin: null; // GAP — no such column in design_rules; see header comment.
}

type DbResult<T> = Promise<{ data: T; error: { message: string } | null }>;

const db = supabaseAdmin as unknown as {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (
        column: string,
        value: string,
      ) => {
        eq: (
          column: string,
          value: string,
        ) => {
          order: (
            column: string,
            opts: { ascending: boolean },
          ) => {
            limit: (n: number) => DbResult<Record<string, unknown>[] | null>;
          };
        };
      };
    };
  };
};

export async function loadPerformanceThresholds(
  vertical: string | null,
): Promise<PerformanceThresholds | null> {
  if (!vertical) return null;

  const { data, error } = await db
    .from("design_rules")
    .select("vertical,flight_time_min,payload_min_kg,payload_max_kg,twr_min")
    .eq("vertical", vertical)
    .eq("status", "active")
    .order("confidence_level", { ascending: false })
    .limit(1);
  if (error) throw new Error(`loadPerformanceThresholds: ${error.message}`);

  const row = data?.[0];
  if (!row) return null;

  return {
    vertical: row.vertical as string,
    loiterTimeMinMinutes: (row.flight_time_min as number | null) ?? null,
    payloadMinKg: (row.payload_min_kg as number | null) ?? null,
    payloadMaxKg: (row.payload_max_kg as number | null) ?? null,
    twrMin: (row.twr_min as number | null) ?? null,
    payloadRangeCurve: null,
    stabilityMarginMin: null,
  };
}
