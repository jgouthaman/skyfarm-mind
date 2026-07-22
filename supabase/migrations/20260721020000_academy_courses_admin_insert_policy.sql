-- academy_courses has a public SELECT policy and a temporary "any
-- authenticated user can UPDATE" policy (20260719020000, itself flagged as
-- tech debt to replace with an admin gate) but no INSERT policy at all —
-- the new "Add course" form in the mission-hub Academy vertical page's
-- Courses tab needs one. Unlike the temp UPDATE policy, this one is
-- properly admin-gated from the start, mirroring the same
-- mission_hub_users role check already used for academy_waitlist's admin
-- SELECT policy and the enroll_waitlist_user RPC.
create policy "academy_courses_admin_insert"
on public.academy_courses
for insert
to authenticated
with check (
  exists (
    select 1 from public.mission_hub_users
    where auth_user_id = auth.uid() and role in ('admin', 'super_admin')
  )
);
