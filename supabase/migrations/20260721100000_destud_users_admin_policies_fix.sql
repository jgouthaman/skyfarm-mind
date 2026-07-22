-- destud_users is the renamed design_studio_leads table (20260721050000),
-- so it still carries the original "MH admins can view/update/delete design
-- studio leads" policies, which call is_mh_admin()/has_role() — functions
-- that don't exist on this live DB (see 20260721060000's note on schema
-- drift). The new "DeStud Users" list on the Design Studio page selects
-- from this table directly, so it would hit the same
-- "function ... does not exist" error the destud_waitlist policies did.
-- Replace with the same mission_hub_users.auth_user_id check already
-- proven working elsewhere in this project.
DROP POLICY IF EXISTS "MH admins can view design studio leads" ON public.destud_users;
DROP POLICY IF EXISTS "MH admins can update design studio leads" ON public.destud_users;
DROP POLICY IF EXISTS "MH admins can delete design studio leads" ON public.destud_users;
DROP POLICY IF EXISTS "Admins can view design studio leads" ON public.destud_users;
DROP POLICY IF EXISTS "Admins can update design studio leads" ON public.destud_users;
DROP POLICY IF EXISTS "Admins can delete design studio leads" ON public.destud_users;

CREATE POLICY "MH admins can view destud users"
  ON public.destud_users FOR SELECT TO authenticated
  USING (
    exists (
      select 1 from public.mission_hub_users
      where auth_user_id = auth.uid() and role in ('admin', 'super_admin')
    )
  );

CREATE POLICY "MH admins can update destud users"
  ON public.destud_users FOR UPDATE TO authenticated
  USING (
    exists (
      select 1 from public.mission_hub_users
      where auth_user_id = auth.uid() and role in ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    exists (
      select 1 from public.mission_hub_users
      where auth_user_id = auth.uid() and role in ('admin', 'super_admin')
    )
  );

CREATE POLICY "MH admins can delete destud users"
  ON public.destud_users FOR DELETE TO authenticated
  USING (
    exists (
      select 1 from public.mission_hub_users
      where auth_user_id = auth.uid() and role in ('admin', 'super_admin')
    )
  );
