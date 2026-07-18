-- TEMPORARY — INTERNAL USE ONLY. Allows any authenticated user to update
-- academy_courses. MUST be replaced with an admin-only gate BEFORE public
-- login ships, or any logged-in student could flip course status/pricing.
create policy "academy_courses_update_temp_internal"
on public.academy_courses for update
to authenticated
using ( true )
with check ( true );
