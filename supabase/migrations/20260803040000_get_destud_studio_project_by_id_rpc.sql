-- Backs the new /destud/projects/$projectId detail page: a single-project
-- lookup (unlike get_destud_studio_projects' listing), so this follows
-- verify_destud_user's "returns jsonb, a single object" pattern rather than
-- get_destud_studio_projects' "returns table(...), an array" pattern —
-- matches how the client will actually consume it (project-service.ts's
-- fetchDestudProject expects a single object, not data[0]).
--
-- Returns exactly the columns the detail page needs: project_name/vertical/
-- purpose/status/created_at for the page header, plus requirements/
-- design_recommendation to reconstruct IntelligenceResult + acceptedSource +
-- the couple of WizardFormState fields buildDesignStudioOutput actually
-- reads (payloadWeight/requiredFlightTime, both stored inside requirements —
-- not payload_details, which holds unrelated per-vertical payload config
-- fields and isn't used by the design-output builders at all).
--
-- Ownership check is in the WHERE clause itself (destud_user_id =
-- p_destud_user_id), not a separate "does this project exist" check — a
-- DeStud user requesting someone else's project id gets the same null
-- result as a nonexistent id, never another user's data.
create or replace function public.get_destud_studio_project_by_id(
  p_destud_user_id uuid,
  p_project_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_row record;
begin
  if not exists (
    select 1 from public.destud_users du
    where du.id = p_destud_user_id and du.status = 'converted'
  ) then
    raise exception 'Not a valid DeStud user';
  end if;

  select sp.id, sp.project_name, sp.vertical, sp.purpose, sp.status, sp.created_at,
         sp.requirements, sp.design_recommendation
  into v_row
  from public.studio_projects sp
  where sp.id = p_project_id
    and sp.destud_user_id = p_destud_user_id;

  if v_row.id is null then
    return null;
  end if;

  return jsonb_build_object(
    'id', v_row.id,
    'project_name', v_row.project_name,
    'vertical', v_row.vertical,
    'purpose', v_row.purpose,
    'status', v_row.status,
    'created_at', v_row.created_at,
    'requirements', v_row.requirements,
    'design_recommendation', v_row.design_recommendation
  );
end;
$$;

revoke all on function public.get_destud_studio_project_by_id(uuid, uuid) from public;
grant execute on function public.get_destud_studio_project_by_id(uuid, uuid) to anon, authenticated;
