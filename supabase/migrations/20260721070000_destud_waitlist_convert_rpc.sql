-- Same pattern as enroll_waitlist_user (20260721010000): when a DeStud Users
-- admin marks a destud_waitlist row "converted", it should move to
-- destud_users rather than just flip a status flag in place. RLS on both
-- tables only allows plain UPDATE/INSERT for admins, not this cross-table
-- move, so it needs a SECURITY DEFINER RPC gated the same way as the rest of
-- this project's admin writes (mission_hub_users.auth_user_id, not
-- is_mh_admin()/has_role() — see 20260721060000's note on schema drift).
create or replace function public.convert_destud_waitlist_entry(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
begin
  if not exists (
    select 1 from public.mission_hub_users
    where auth_user_id = auth.uid() and role in ('admin', 'super_admin')
  ) then
    raise exception 'Not authorized';
  end if;

  select * into v_row from public.destud_waitlist where id = p_id;
  if not found then
    raise exception 'destud_waitlist entry % not found', p_id;
  end if;

  insert into public.destud_users (full_name, email, phone, organisation, role, location, plan, message, source, status)
    values (v_row.full_name, v_row.email, v_row.phone, v_row.organisation, v_row.role, v_row.location, v_row.plan, v_row.message, v_row.source, 'converted');

  delete from public.destud_waitlist where id = p_id;
end;
$$;

revoke all on function public.convert_destud_waitlist_entry(uuid) from public;
grant execute on function public.convert_destud_waitlist_entry(uuid) to authenticated;
