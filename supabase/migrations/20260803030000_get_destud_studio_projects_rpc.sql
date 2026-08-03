-- get_destud_studio_projects is called by useDestudDesigns
-- (src/lib/destud-designs.ts:20) as
-- supabase.rpc("get_destud_studio_projects", { p_destud_user_id }), whose
-- result is cast directly to DesignSummary[] (src/components/destud/
-- DesignCard.tsx) — { id, project_name, vertical, purpose, status,
-- updated_at, created_at }. Same root cause as create_destud_studio_project:
-- the 20260728000000 migration defining this was never actually applied to
-- the linked project, confirmed via direct inspection (only verify_destud_user
-- existed live before this session's fixes). This is why the "designs so
-- far" grid on both DeStud dashboards has never shown anything.
--
-- Unlike that migration's `returns setof public.studio_projects` (every
-- column, including jsonb blobs like requirements/safety/design_recommendation
-- that DesignSummary never reads), this returns exactly DesignSummary's
-- shape — narrower, and confirmed against the real consuming type rather
-- than assumed.
--
-- Guards on destud_users.status = 'converted', same gate verify_destud_user
-- and create_destud_studio_project use — but note verify_destud_user itself
-- returns null silently for an invalid user rather than raising, so "same
-- gate" doesn't mean "identical failure behavior" across all three. This
-- raises like create_destud_studio_project does (language plpgsql, not sql,
-- specifically to allow that), since a listing call for a user that isn't a
-- valid DeStud identity at all is a different case from a valid user who
-- simply has zero projects yet (which correctly returns an empty set, not
-- an error).
create or replace function public.get_destud_studio_projects(p_destud_user_id uuid)
returns table (
  id uuid,
  project_name text,
  vertical text,
  purpose text,
  status text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  -- Table-aliased and column-qualified throughout: returns table(id uuid, ...)
  -- implicitly declares `id` (and the other column names) as OUT parameter
  -- variables in this function's scope, which would otherwise collide with
  -- a bare `id` column reference against destud_users here.
  if not exists (
    select 1 from public.destud_users du
    where du.id = p_destud_user_id and du.status = 'converted'
  ) then
    raise exception 'Not a valid DeStud user';
  end if;

  return query
    select sp.id, sp.project_name, sp.vertical, sp.purpose, sp.status, sp.created_at, sp.updated_at
    from public.studio_projects sp
    where sp.destud_user_id = p_destud_user_id
    order by sp.updated_at desc;
end;
$$;

revoke all on function public.get_destud_studio_projects(uuid) from public;
grant execute on function public.get_destud_studio_projects(uuid) to anon, authenticated;
