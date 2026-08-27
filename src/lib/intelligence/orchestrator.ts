import { solveRule } from './ruleSolver';
import { matchReference } from './referenceMatcher';
import type { IntelligenceInput, IntelligenceResult, ConfidenceLevel, MatchedRule, MatchedReference } from './types';
import { supabase } from '@/integrations/supabase/client';
import { DEFAULT_VEHICLE_TYPE } from '@/constants/vehicleTypes.constants';

async function trackRuleMatch(ruleId: string, isFallback: boolean): Promise<void> {
  const { data } = await supabase
    .from('design_rules')
    .select('match_count, fallback_count')
    .eq('id', ruleId)
    .single();

  if (!data) return;

  await supabase
    .from('design_rules')
    .update({
      match_count: (data.match_count ?? 0) + 1,
      fallback_count: isFallback ? (data.fallback_count ?? 0) + 1 : (data.fallback_count ?? 0),
      last_matched_at: new Date().toISOString(),
    })
    .eq('id', ruleId);
}

// DeStud sessions are anon (no real Supabase Auth session — see
// src/lib/destud-auth.ts), and design_rules'/reference_designs' SELECT
// policies both require auth.uid() IS NOT NULL / the `authenticated` role.
// solveRule()/matchReference() therefore always return zero rows for
// DeStud, regardless of seed data — confirmed via direct DB inspection that
// both tables are in fact populated. These two helpers call the
// SECURITY DEFINER RPCs (migration 20260803000000_destud_intelligence_engine_rpcs.sql)
// that run the identical query logic server-side, bypassing RLS, and map
// the jsonb result back into the exact same shape solveRule()/
// matchReference() already return — so everything below this point (and
// StepRecommendation.tsx, which consumes IntelligenceResult) needs no
// awareness of which path ran.
async function solveRuleDestud(
  input: IntelligenceInput,
  vehicleType: string,
): Promise<{
  rule: MatchedRule | null;
  confidence_score: number;
  is_fallback: boolean;
  fallback_reason: string | null;
}> {
  const { data, error } = await supabase.rpc('solve_rule_destud' as any, {
    p_vertical: input.vertical,
    p_vehicle_type: vehicleType,
    p_purpose: input.purpose,
    p_payload_weight: input.payloadWeight,
    p_user_type: input.userType,
  } as any);

  if (error || !data) {
    return { rule: null, confidence_score: 0, is_fallback: false, fallback_reason: null };
  }

  return data as unknown as {
    rule: MatchedRule | null;
    confidence_score: number;
    is_fallback: boolean;
    fallback_reason: string | null;
  };
}

async function matchReferenceDestud(
  input: IntelligenceInput,
  vehicleType: string,
): Promise<{ reference: MatchedReference | null; score: number }> {
  const { data, error } = await supabase.rpc('match_reference_destud' as any, {
    p_vertical: input.vertical,
    p_vehicle_type: vehicleType,
    p_purpose: input.purpose,
    p_payload_weight: input.payloadWeight,
    p_required_flight_time: input.requiredFlightTime,
  } as any);

  if (error || !data) {
    return { reference: null, score: 0 };
  }

  return data as unknown as { reference: MatchedReference | null; score: number };
}

export async function runIntelligenceEngine(
  input: IntelligenceInput,
  ownerKind: 'mission-hub' | 'destud' = 'mission-hub',
): Promise<IntelligenceResult> {
  const vehicleType = input.vehicleType || DEFAULT_VEHICLE_TYPE;

  // Run Phase 1 and Phase 2 in parallel. Mission Hub staff carry a real
  // Supabase Auth session, so the direct table queries (RLS-checked) work
  // unchanged; DeStud has none, so it goes through the RPCs above instead.
  const [ruleResult, referenceResult] = ownerKind === 'destud'
    ? await Promise.all([solveRuleDestud(input, vehicleType), matchReferenceDestud(input, vehicleType)])
    : await Promise.all([solveRule(input), matchReference(input)]);

  const { rule, confidence_score: ruleScore, is_fallback, fallback_reason } = ruleResult;
  const { reference, score: refScore } = referenceResult;

  // Determine overall confidence
  let confidence: ConfidenceLevel;
  let ai_required = false;

  if (ruleScore >= 80 && refScore >= 70) {
    confidence = 'high';
  } else if (ruleScore >= 40 || refScore >= 40) {
    confidence = 'medium';
  } else {
    confidence = 'low';
    ai_required = true;
  }

  // Build human-readable summary
  let summary = '';
  if (rule && reference) {
    summary = `Matched rule "${rule.rule_name ?? rule.drone_type}" with ${ruleScore}% confidence. Closest proven design: "${reference.name}" (score ${refScore}/100, payload ${reference.payload_delta.toFixed(1)} kg off).`;
  } else if (rule) {
    summary = `Matched rule "${rule.rule_name ?? rule.drone_type}" with ${ruleScore}% confidence. No proven design found for this combination.`;
  } else if (reference) {
    summary = `No rule matched. Closest proven design: "${reference.name}" (score ${refScore}/100). Engineer review recommended.`;
  } else {
    summary = 'No rule or proven design matched these requirements. AI advisor review required.';
  }

  // Track rule match in background — don't await, don't block the result
  if (rule?.id) {
    trackRuleMatch(rule.id, is_fallback).catch(() => {
      // Silent fail — tracking should never break the engine
    });
  }

  return {
    matched_rule: rule,
    matched_reference: reference,
    confidence,
    rule_confidence_score: ruleScore,
    reference_score: refScore,
    ai_required,
    summary,
    is_fallback,
    fallback_reason,
  };
}
