-- create_destud_studio_project is referenced by src/lib/design-studio/
-- project-service.ts (createDestudProject) and has been since migration
-- 20260728000000_destud_studio_project_rpcs.sql, but direct inspection of
-- the linked project confirms that migration was never actually applied —
-- create_destud_studio_project and get_destud_studio_projects don't exist
-- live (only verify_destud_user does), and destud_user_id doesn't exist on
-- studio_projects either. This is the real cause of "DeStud missions
-- couldn't save" (a017e86's fix never reached the live database).
--
-- Also: studio_projects.user_id is `uuid NOT NULL` with no default. The
-- original (never-applied) draft's INSERT omitted user_id entirely, which
-- would have failed the NOT NULL constraint even if it had been applied —
-- so this also drops that constraint. Existing RLS policies all key on
-- `auth.uid() = user_id`; that comparison is never true against a NULL
-- user_id for any caller (DeStud rows have no auth.uid() to match), so this
-- doesn't open any new access path through those policies — DeStud rows
-- stay reachable only via SECURITY DEFINER RPCs, same as before.
alter table public.studio_projects
  alter column user_id drop not null;

alter table public.studio_projects
  add column if not exists destud_user_id uuid references public.destud_users(id) on delete cascade;

create index if not exists idx_studio_projects_destud_user_id on public.studio_projects(destud_user_id);

-- Verifies the caller is a real, access-holding ('converted') DeStud user
-- before inserting — same status gate verify_destud_user itself uses to
-- define "valid DeStud user" — rather than inserting for any UUID that
-- merely happens to exist in destud_users regardless of status.
create or replace function public.create_destud_studio_project(
  p_destud_user_id uuid,
  p_project_name text,
  p_vehicle_type text,
  p_vertical text,
  p_purpose text,
  p_user_type text,
  p_requirements jsonb,
  p_payload_details jsonb,
  p_safety jsonb,
  p_design_recommendation jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not exists (
    select 1 from public.destud_users
    where id = p_destud_user_id and status = 'converted'
  ) then
    raise exception 'Not a valid DeStud user';
  end if;

  insert into public.studio_projects (
    destud_user_id, project_name, vehicle_type, vertical, purpose, user_type,
    status, risk_level, requirements, payload_details, safety, design_recommendation
  ) values (
    p_destud_user_id, p_project_name, p_vehicle_type, p_vertical, p_purpose, p_user_type,
    'Draft', null, p_requirements, p_payload_details, p_safety, p_design_recommendation
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.create_destud_studio_project(uuid, text, text, text, text, text, jsonb, jsonb, jsonb, jsonb) from public;
grant execute on function public.create_destud_studio_project(uuid, text, text, text, text, text, jsonb, jsonb, jsonb, jsonb) to anon, authenticated;
