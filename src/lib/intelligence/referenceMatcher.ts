import { supabase } from '@/integrations/supabase/client';
import { DEFAULT_VEHICLE_TYPE } from '@/constants/vehicleTypes.constants';
import type { IntelligenceInput, MatchedReference } from './types';

// Maps wizard display names to reference_designs vertical slugs
const VERTICAL_TO_SLUG: Record<string, string> = {
  'AgriSky':        'agriculture',
  'InfraSky':       'infrastructure',
  'GeoSky':         'mapping',
  'GuardSky':       'surveillance',
  'TorqWings Labs': 'industrial',
  'Academy':        'education',
};

function scoreReference(
  design: Record<string, unknown>,
  input: IntelligenceInput
): number {
  let score = 0;

  // Purpose match worth 40 points
  if (design.purpose === input.purpose) score += 40;

  // Payload closeness — lose 3 points per kg difference, max 30 points
  const payloadDiff = Math.abs(
    Number(design.payload_weight) - input.payloadWeight
  );
  score += Math.max(0, 30 - payloadDiff * 3);

  // Flight time closeness — lose 2 points per minute difference, max 20 points
  const timeDiff = Math.abs(
    Number(design.estimated_flight_time) - input.requiredFlightTime
  );
  score += Math.max(0, 20 - timeDiff * 2);

  // Confidence score quality — up to 10 points
  score += ((Number(design.confidence_score) ?? 0) / 100) * 10;

  return Math.round(score);
}

export async function matchReference(input: IntelligenceInput): Promise<{
  reference: MatchedReference | null;
  score: number;
}> {
  const slug = VERTICAL_TO_SLUG[input.vertical];
  if (!slug) return { reference: null, score: 0 };

  const vehicleType = input.vehicleType || DEFAULT_VEHICLE_TYPE;

  const { data, error } = await supabase
    .from('reference_designs')
    .select(`
      id, name, purpose, vertical, vehicle_type, drone_type, frame_size, motor_class,
      battery, payload_weight, estimated_flight_time,
      component_list, requirements, engineer_notes, confidence_score
    `)
    .eq('vertical', slug)
    .eq('vehicle_type', vehicleType)
    .eq('approval_status', 'approved')
    .eq('is_active', true);

  if (error || !data || data.length === 0) {
    return { reference: null, score: 0 };
  }

  // Score every candidate and pick the highest
  const scored = data.map(d => ({
    design: d,
    score: scoreReference(d as Record<string, unknown>, input),
  }));

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];

  if (best.score === 0) return { reference: null, score: 0 };

  return {
    reference: {
      id: best.design.id,
      name: best.design.name,
      score: best.score,
      payload_delta: Math.abs(
        Number(best.design.payload_weight) - input.payloadWeight
      ),
      drone_type: best.design.drone_type,
      frame_size: best.design.frame_size,
      motor_class: best.design.motor_class,
      battery: best.design.battery,
      component_list: best.design.component_list as Record<string, unknown> | null,
      requirements: best.design.requirements as Record<string, unknown> | null,
      engineer_notes: best.design.engineer_notes,
      confidence_score: best.design.confidence_score,
    },
    score: best.score,
  };
}
