import { solveRule } from './ruleSolver';
import { matchReference } from './referenceMatcher';
import type { IntelligenceInput, IntelligenceResult, ConfidenceLevel } from './types';
import { supabase } from '@/integrations/supabase/client';

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

export async function runIntelligenceEngine(
  input: IntelligenceInput
): Promise<IntelligenceResult> {
  // Run Phase 1 and Phase 2 in parallel
  const [ruleResult, referenceResult] = await Promise.all([
    solveRule(input),
    matchReference(input),
  ]);

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
