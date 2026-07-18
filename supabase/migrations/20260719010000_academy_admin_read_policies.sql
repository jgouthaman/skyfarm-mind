-- ============================================================
-- Admin-scoped SELECT policies for academy_waitlist and enrollments,
-- mirroring the existing admins_select_contacts pattern on `contacts`.
-- Lets the Mission Hub Academy vertical page read these tables with the
-- plain browser client (same convention already used for Contacts/Users),
-- without exposing them to the public anon key.
-- ============================================================

create policy "admins_select_academy_waitlist" on public.academy_waitlist
  for select
  using (exists (
    select 1 from public.mission_hub_users
    where auth_user_id = auth.uid() and role in ('admin', 'super_admin')
  ));

create policy "admins_select_enrollments" on public.enrollments
  for select
  using (exists (
    select 1 from public.mission_hub_users
    where auth_user_id = auth.uid() and role in ('admin', 'super_admin')
  ));

-- Verification
select tablename, policyname, cmd, roles
from pg_policies
where tablename in ('academy_waitlist', 'enrollments')
order by tablename, cmd;
