-- Same gap as academy_courses (20260721020000): academy_course_modules has
-- never had a write path from the mission-hub admin UI before now (the
-- Modules tab was previously read-only), so it likely has only a SELECT
-- policy and no INSERT policy. The new "Add module" form (Modules tab,
-- course picked from a dropdown of academy_courses) needs one.
create policy "academy_course_modules_admin_insert"
on public.academy_course_modules
for insert
to authenticated
with check (
  exists (
    select 1 from public.mission_hub_users
    where auth_user_id = auth.uid() and role in ('admin', 'super_admin')
  )
);
