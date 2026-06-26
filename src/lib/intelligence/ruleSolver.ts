import { supabase } from '@/integrations/supabase/client';
import type { IntelligenceInput, MatchedRule } from './types';

export async function solveRule(input: IntelligenceInput): Promise<{
  rule: MatchedRule | null;
  confidence_score: number;
  is_fallback: boolean;
  fallback_reason: string | null;
}> {
  const SELECT_COLS = `
    id, rule_name, drone_type, frame_size, motor_class, motor_count,
    battery_config, esc_rating, propeller_spec, flight_controller,
    twr_min, risk_level, confidence_level, engineer_notes, risk_flags,
    cost_min_inr, cost_max_inr, payload_min_kg, payload_max_kg,
    flight_time_min, flight_time_max, user_type
  `;

  // ── Phase 1A: exact match ──────────────────────────────────────────
  // vertical + purpose + payload within range
  const { data: exactData, error: exactError } = await supabase
    .from('design_rules')
    .select(SELECT_COLS)
    .eq('status', 'active')
    .eq('vertical', input.vertical)
    .eq('purpose', input.purpose)
    .lte('payload_min_kg', input.payloadWeight)
    .gte('payload_max_kg', input.payloadWeight)
    .order('confidence_level', { ascending: false });

  if (!exactError && exactData && exactData.length > 0) {
    const filtered = exactData.filter(
      r => r.user_type === null || r.user_type === input.userType
    );
    const candidates = filtered.length > 0 ? filtered : exactData;
    const best = pickBest(candidates);
    return {
      rule: toMatchedRule(best),
      confidence_score: Math.min(100, (best.confidence_level ?? 1) * 20),
      is_fallback: false,
      fallback_reason: null,
    };
  }

  // ── Phase 1B: nearest fallback ─────────────────────────────────────
  // same vertical + purpose, no payload constraint — find nearest by
  // smallest distance from input.payloadWeight to rule's [min, max] range
  const { data: fallbackData, error: fallbackError } = await supabase
    .from('design_rules')
    .select(SELECT_COLS)
    .eq('status', 'active')
    .eq('vertical', input.vertical)
    .eq('purpose', input.purpose)
    .order('confidence_level', { ascending: false });

  if (!fallbackError && fallbackData && fallbackData.length > 0) {
    const nearest = fallbackData.reduce((a, b) => {
      return payloadDist(a, input.payloadWeight) <= payloadDist(b, input.payloadWeight) ? a : b;
    });

    const dist = payloadDist(nearest, input.payloadWeight);

    // Confidence penalty: start from rule's base score, subtract 5 pts per kg outside range, cap at 60
    const baseScore = Math.min(100, (nearest.confidence_level ?? 1) * 20);
    const confidence_score = Math.max(10, Math.min(60, baseScore - dist * 5));

    const fallback_reason = `Your payload (${input.payloadWeight} kg) is outside this rule's designed range (${nearest.payload_min_kg}–${nearest.payload_max_kg} kg). This is the nearest matching rule — ${dist.toFixed(1)} kg outside range. Verify component sizing before proceeding.`;

    return {
      rule: toMatchedRule(nearest),
      confidence_score,
      is_fallback: true,
      fallback_reason,
    };
  }

  return { rule: null, confidence_score: 0, is_fallback: false, fallback_reason: null };
}

// Distance from payload to nearest edge of rule's [min, max] range
function payloadDist(rule: Record<string, unknown>, payload: number): number {
  const min = (rule.payload_min_kg as number) ?? 0;
  const max = (rule.payload_max_kg as number) ?? 999;
  if (payload < min) return min - payload;
  if (payload > max) return payload - max;
  return 0;
}

function pickBest(candidates: Record<string, unknown>[]): Record<string, unknown> {
  return candidates.reduce((a, b) => {
    if ((b.confidence_level as number ?? 0) !== (a.confidence_level as number ?? 0)) {
      return (b.confidence_level as number ?? 0) > (a.confidence_level as number ?? 0) ? b : a;
    }
    const rangeA = (a.payload_max_kg as number ?? 999) - (a.payload_min_kg as number ?? 0);
    const rangeB = (b.payload_max_kg as number ?? 999) - (b.payload_min_kg as number ?? 0);
    return rangeA <= rangeB ? a : b;
  });
}

function toMatchedRule(r: Record<string, unknown>): MatchedRule {
  return {
    id: r.id as string,
    rule_name: r.rule_name as string | null,
    drone_type: r.drone_type as string,
    frame_size: r.frame_size as string | null,
    motor_class: r.motor_class as string | null,
    motor_count: r.motor_count as number | null,
    battery_config: r.battery_config as string | null,
    esc_rating: r.esc_rating as string | null,
    propeller_spec: r.propeller_spec as string | null,
    flight_controller: r.flight_controller as string | null,
    twr_min: r.twr_min as number | null,
    risk_level: r.risk_level as string | null,
    confidence_level: (r.confidence_level as number) ?? 1,
    engineer_notes: r.engineer_notes as string | null,
    risk_flags: r.risk_flags as string[] | null,
    cost_min_inr: r.cost_min_inr as number | null,
    cost_max_inr: r.cost_max_inr as number | null,
    flight_time_min: r.flight_time_min as number | null,
    flight_time_max: r.flight_time_max as number | null,
  };
}
