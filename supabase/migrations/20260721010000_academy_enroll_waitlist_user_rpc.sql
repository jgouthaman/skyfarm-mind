-- New "Academy Users" mission-hub page needs to change a pending
-- academy_waitlist entry's status to "Enrolled", which per the product
-- requirement means deleting the row from academy_waitlist and inserting
-- the person into academy_users — not the soft "converted" status flip
-- that promote_waitlist_to_active (the existing Waitlist tab's RPC) does.
--
-- academy_waitlist has no admin UPDATE/DELETE policy (only the admin SELECT
-- policy from 20260719010000), so this has to go through a SECURITY DEFINER
-- function, same as the existing promote flow — a plain client-side
-- .delete()/.insert() from the browser would fail RLS.
create or replace function public.enroll_waitlist_user(p_waitlist_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_name text;
  v_course_id uuid;
  v_status text;
begin
  if not exists (
    select 1 from public.mission_hub_users
    where auth_user_id = auth.uid() and role in ('admin', 'super_admin')
  ) then
    raise exception 'Not authorized';
  end if;

  select email, name, course_id, status
    into v_email, v_name, v_course_id, v_status
    from public.academy_waitlist
    where id = p_waitlist_id;

  if not found then
    raise exception 'Waitlist entry % not found', p_waitlist_id;
  end if;

  if v_status <> 'pending' then
    raise exception 'Waitlist entry % is not pending (status: %)', p_waitlist_id, v_status;
  end if;

  insert into public.academy_users (full_name, email, course_id)
  values (coalesce(nullif(v_name, ''), v_email), v_email, v_course_id);

  delete from public.academy_waitlist where id = p_waitlist_id;
end;
$$;

revoke all on function public.enroll_waitlist_user(uuid) from public;
grant execute on function public.enroll_waitlist_user(uuid) to authenticated;
