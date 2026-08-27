-- DeStud sessions are anon (no real Supabase Auth session — see
-- src/lib/destud-auth.ts). design_rules' and reference_designs' SELECT
-- policies both require auth.uid() IS NOT NULL / the `authenticated` role,
-- so solveRule()/matchReference() (src/lib/intelligence/ruleSolver.ts,
-- referenceMatcher.ts) always return zero rows for DeStud, regardless of
-- seed data — confirmed via direct inspection that both tables are in fact
-- populated (e.g. design_rules has vertical='GuardSky', purpose='Perimeter
-- surveillance', vehicle_type='multirotor' rows). These two SECURITY
-- DEFINER RPCs run the identical query logic server-side, bypassing RLS.
-- Unlike create_destud_studio_project, these are read-only lookups against
-- shared reference/rule tables rather than user-owned rows, so there's no
-- per-caller ownership check to perform — the underlying tables' RLS
-- policies stay exactly as-is; the RPCs themselves are the security
-- boundary, same pattern as verify_destud_user / create_destud_studio_project.

-- ── solve_rule_destud ───────────────────────────────────────────────────
-- Mirrors solveRule()'s Phase 1A (exact match) / Phase 1B (nearest
-- fallback) exactly, with one addition: vehicle_type is compared
-- case-insensitively (design_rules stores lowercase slugs like
-- "multirotor"; the wizard form's value may carry different casing).
-- vertical is compared as-is — design_rules.vertical stores display names
-- ("GuardSky"), the same format the wizard sends, confirmed via direct
-- query; no mapping needed here (contrast match_reference_destud below).
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
  -- Phase 1A: exact match — vertical + purpose + payload within range,
  -- preferring rows whose user_type is null or matches p_user_type (mirrors
  -- solveRule()'s client-side filter-then-fall-back-to-unfiltered logic).
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
      'flight_time_max', v_best.flight_time_max
    );
    return jsonb_build_object(
      'rule', v_rule,
      'confidence_score', v_confidence_score,
      'is_fallback', false,
      'fallback_reason', null
    );
  end if;

  -- Phase 1B: nearest fallback — same vertical + purpose, no payload
  -- constraint; nearest by distance from p_payload_weight to the rule's
  -- [min, max] range (mirrors payloadDist() in ruleSolver.ts).
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
    'flight_time_max', v_best.flight_time_max
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

-- ── match_reference_destud ──────────────────────────────────────────────
-- Mirrors matchReference()/scoreReference() exactly, plus the same
-- case-insensitive vehicle_type comparison as solve_rule_destud above.
-- Unlike design_rules, reference_designs.vertical stores slugs
-- ("surveillance"), not the wizard's display name ("GuardSky") — confirmed
-- via direct query — so the same VERTICAL_TO_SLUG mapping used client-side
-- in referenceMatcher.ts is reproduced here before querying.
create or replace function public.match_reference_destud(
  p_vertical text,
  p_vehicle_type text,
  p_purpose text,
  p_payload_weight numeric,
  p_required_flight_time numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slug text;
  v_best record;
begin
  v_slug := case p_vertical
    when 'AgriSky' then 'agriculture'
    when 'InfraSky' then 'infrastructure'
    when 'GeoSky' then 'mapping'
    when 'GuardSky' then 'surveillance'
    when 'TorqWings Labs' then 'industrial'
    when 'Academy' then 'education'
    else null
  end;

  if v_slug is null then
    return jsonb_build_object('reference', null, 'score', 0);
  end if;

  select rd.*, round(
    (case when rd.purpose = p_purpose then 40 else 0 end)
    + greatest(0, 30 - abs(coalesce(rd.payload_weight, 0) - p_payload_weight) * 3)
    + greatest(0, 20 - abs(coalesce(rd.estimated_flight_time, 0) - p_required_flight_time) * 2)
    + (coalesce(rd.confidence_score, 0) / 100.0) * 10
  ) as score
  into v_best
  from public.reference_designs rd
  where rd.vertical = v_slug
    and lower(rd.vehicle_type) = lower(p_vehicle_type)
    and rd.approval_status = 'approved'
    and rd.is_active = true
  order by score desc, rd.id asc
  limit 1;

  if v_best.id is null or v_best.score = 0 then
    return jsonb_build_object('reference', null, 'score', 0);
  end if;

  return jsonb_build_object(
    'reference', jsonb_build_object(
      'id', v_best.id,
      'name', v_best.name,
      'score', v_best.score,
      'payload_delta', abs(coalesce(v_best.payload_weight, 0) - p_payload_weight),
      'drone_type', v_best.drone_type,
      'frame_size', v_best.frame_size,
      'motor_class', v_best.motor_class,
      'battery', v_best.battery,
      'component_list', v_best.component_list,
      'requirements', v_best.requirements,
      'engineer_notes', v_best.engineer_notes,
      'confidence_score', v_best.confidence_score
    ),
    'score', v_best.score
  );
end;
$$;

revoke all on function public.match_reference_destud(text, text, text, numeric, numeric) from public;
grant execute on function public.match_reference_destud(text, text, text, numeric, numeric) to anon, authenticated;
