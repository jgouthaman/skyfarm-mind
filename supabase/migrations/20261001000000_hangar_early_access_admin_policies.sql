-- Lets Mission Hub admins read and update Hangar_early_access from the
-- /mission-hub/waitlist page (RecordsTable queries the table directly from
-- the browser via the authenticated client, not a server route). The
-- original 20260923000000_hangar_early_access.sql migration deliberately
-- only granted anon/authenticated INSERT (reading leads wasn't part of what
-- was asked for yet) -- this adds the SELECT/UPDATE half, using the same
-- mission_hub_users admin-gate already proven working for destud_waitlist
-- (see 20260721060000_destud_waitlist_setup.sql's own header comment: the
-- is_mh_admin()/public.profiles helpers referenced by this project's older
-- migrations don't actually exist on the live DB).
--
-- Not auto-applied to the live project -- run manually in the Supabase SQL
-- editor, same as every other Hangar_* migration in this repo.

GRANT SELECT, UPDATE ON public."Hangar_early_access" TO authenticated;

DROP POLICY IF EXISTS "MH admins can view Hangar early access" ON public."Hangar_early_access";
CREATE POLICY "MH admins can view Hangar early access"
  ON public."Hangar_early_access" FOR SELECT TO authenticated
  USING (
    exists (
      select 1 from public.mission_hub_users
      where auth_user_id = auth.uid() and role in ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "MH admins can update Hangar early access" ON public."Hangar_early_access";
CREATE POLICY "MH admins can update Hangar early access"
  ON public."Hangar_early_access" FOR UPDATE TO authenticated
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
