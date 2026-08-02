-- studio_projects.user_id has a hard FK to auth.users(id), and its RLS
-- policies (20260617104400) are restricted to the `authenticated` role with
-- `user_id = auth.uid()`. A DeStud session has neither: it runs as anon with
-- no real Supabase Auth user, so a destud_users.id can satisfy neither the
-- FK nor the RLS check. This is why "Generate Drone Design" on
-- /destud/new-mission silently failed, and why the "designs so far" grid on
-- both dashboards never showed anything — every insert/select against
-- studio_projects from a DeStud session was being rejected.
--
-- Fix: a separate destud_user_id column (its own FK to destud_users, not
-- auth.users) plus two SECURITY DEFINER RPCs that bypass studio_projects'
-- authenticated-only RLS after independently verifying the caller really is
-- an active ('converted') DeStud user. Mission Hub's existing user_id/RLS
-- path is untouched.
alter table public.studio_projects
  add column if not exists destud_user_id uuid references public.destud_users(id) on delete cascade;

create index if not exists idx_studio_projects_destud_user_id on public.studio_projects(destud_user_id);

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

create or replace function public.get_destud_studio_projects(p_destud_user_id uuid)
returns setof public.studio_projects
language sql
stable
security definer
set search_path = public
as $$
  select * from public.studio_projects
  where destud_user_id = p_destud_user_id
  order by updated_at desc;
$$;

revoke all on function public.get_destud_studio_projects(uuid) from public;
grant execute on function public.get_destud_studio_projects(uuid) to anon, authenticated;
