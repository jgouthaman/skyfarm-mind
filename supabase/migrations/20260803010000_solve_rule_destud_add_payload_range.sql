-- MatchedRule (src/lib/intelligence/types.ts) gained payload_min_kg/
-- payload_max_kg (already selected in ruleSolver.ts's SELECT_COLS, just
-- never mapped onto the returned type — needed for
-- designStudioBuilder.ts's "Payload fit" confidence metric). Add the same
-- two fields to solve_rule_destud's returned rule jsonb so the DeStud path
-- stays shape-consistent with the direct-query (Mission Hub) path. Full
-- function body restated since CREATE OR REPLACE FUNCTION requires it;
-- everything else is unchanged from 20260803000000_destud_intelligence_engine_rpcs.sql.
create or replace function public.solve_rule_destud(
  p_vertical text,
  p_vehicle_type text,
  p_purpose text,
  p_payload_weight numeric,
  p_user_type text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_best record;
  v_rule jsonb;
  v_confidence_score numeric;
  v_base_score numeric;
  v_dist numeric;
begin
  select dr.* into v_best
  from public.design_rules dr
  where dr.status = 'active'
    and dr.vertical = p_vertical
    and lower(dr.vehicle_type) = lower(p_vehicle_type)
    and dr.purpose = p_purpose
    and dr.payload_min_kg <= p_payload_weight
    and dr.payload_max_kg >= p_payload_weight
    and (dr.user_type is null or dr.user_type = p_user_type)
  order by dr.confidence_level desc nulls last,
           (coalesce(dr.payload_max_kg, 999) - coalesce(dr.payload_min_kg, 0)) asc,
           dr.id asc
  limit 1;

  if v_best.id is null then
    select dr.* into v_best
    from public.design_rules dr
    where dr.status = 'active'
      and dr.vertical = p_vertical
      and lower(dr.vehicle_type) = lower(p_vehicle_type)
      and dr.purpose = p_purpose
      and dr.payload_min_kg <= p_payload_weight
      and dr.payload_max_kg >= p_payload_weight
    order by dr.confidence_level desc nulls last,
             (coalesce(dr.payload_max_kg, 999) - coalesce(dr.payload_min_kg, 0)) asc,
             dr.id asc
    limit 1;
  end if;

  if v_best.id is not null then
    v_confidence_score := least(100, coalesce(v_best.confidence_level, 1) * 20);
    v_rule := jsonb_build_object(
      'id', v_best.id,
      'rule_name', v_best.rule_name,
      'drone_type', v_best.drone_type,
      'frame_size', v_best.frame_size,
      'motor_class', v_best.motor_class,
      'motor_count', v_best.motor_count,
      'battery_config', v_best.battery_config,
      'esc_rating', v_best.esc_rating,
      'propeller_spec', v_best.propeller_spec,
      'flight_controller', v_best.flight_controller,
      'twr_min', v_best.twr_min,
      'risk_level', v_best.risk_level,
      'confidence_level', coalesce(v_best.confidence_level, 1),
      'engineer_notes', v_best.engineer_notes,
      'risk_flags', to_jsonb(v_best.risk_flags),
      'cost_min_inr', v_best.cost_min_inr,
      'cost_max_inr', v_best.cost_max_inr,
      'flight_time_min', v_best.flight_time_min,
      'flight_time_max', v_best.flight_time_max,
      'payload_min_kg', v_best.payload_min_kg,
      'payload_max_kg', v_best.payload_max_kg
    );
    return jsonb_build_object(
      'rule', v_rule,
      'confidence_score', v_confidence_score,
      'is_fallback', false,
      'fallback_reason', null
    );
  end if;

  select dr.*,
         case
           when p_payload_weight < coalesce(dr.payload_min_kg, 0) then coalesce(dr.payload_min_kg, 0) - p_payload_weight
           when p_payload_weight > coalesce(dr.payload_max_kg, 999) then p_payload_weight - coalesce(dr.payload_max_kg, 999)
           else 0
         end as dist
  into v_best
  from public.design_rules dr
  where dr.status = 'active'
    and dr.vertical = p_vertical
    and lower(dr.vehicle_type) = lower(p_vehicle_type)
    and dr.purpose = p_purpose
  order by dist asc, dr.confidence_level desc nulls last, dr.id asc
  limit 1;

  if v_best.id is null then
    return jsonb_build_object(
      'rule', null,
      'confidence_score', 0,
      'is_fallback', false,
      'fallback_reason', null
    );
  end if;

  v_dist := v_best.dist;
  v_base_score := least(100, coalesce(v_best.confidence_level, 1) * 20);
  v_confidence_score := greatest(10, least(60, v_base_score - v_dist * 5));

  v_rule := jsonb_build_object(
    'id', v_best.id,
    'rule_name', v_best.rule_name,
    'drone_type', v_best.drone_type,
    'frame_size', v_best.frame_size,
    'motor_class', v_best.motor_class,
    'motor_count', v_best.motor_count,
    'battery_config', v_best.battery_config,
    'esc_rating', v_best.esc_rating,
    'propeller_spec', v_best.propeller_spec,
    'flight_controller', v_best.flight_controller,
    'twr_min', v_best.twr_min,
    'risk_level', v_best.risk_level,
    'confidence_level', coalesce(v_best.confidence_level, 1),
    'engineer_notes', v_best.engineer_notes,
    'risk_flags', to_jsonb(v_best.risk_flags),
    'cost_min_inr', v_best.cost_min_inr,
    'cost_max_inr', v_best.cost_max_inr,
    'flight_time_min', v_best.flight_time_min,
    'flight_time_max', v_best.flight_time_max,
    'payload_min_kg', v_best.payload_min_kg,
    'payload_max_kg', v_best.payload_max_kg
  );

  return jsonb_build_object(
    'rule', v_rule,
    'confidence_score', v_confidence_score,
    'is_fallback', true,
    'fallback_reason', format(
      'Your payload (%s kg) is outside this rule''s designed range (%s–%s kg). This is the nearest matching rule — %s kg outside range. Verify component sizing before proceeding.',
      p_payload_weight, v_best.payload_min_kg, v_best.payload_max_kg, round(v_dist::numeric, 1)
    )
  );
end;
$$;

revoke all on function public.solve_rule_destud(text, text, text, numeric, text) from public;
grant execute on function public.solve_rule_destud(text, text, text, numeric, text) to anon, authenticated;
