-- destud_waitlist was created directly in the Supabase dashboard (mirroring
-- the academy_waitlist / academy_users split: destud_waitlist now receives
-- plan-signup submissions from the /design-studio landing page popup,
-- destud_users is repurposed for confirmed/converted access). This migration
-- only tracks the columns/RLS/grants needed for the public form to insert
-- and for Mission Hub admins to manage rows — it does not create the table
-- itself. Uses ADD COLUMN IF NOT EXISTS / DROP POLICY IF EXISTS + CREATE so
-- it's safe to run whether or not these already exist on the table.
--
-- Admin check uses mission_hub_users directly (not is_mh_admin()/has_role()
-- from the original design_studio_leads migrations) because this live DB's
-- schema was built out-of-band from this repo's tracked migration history —
-- those helper functions don't actually exist here. mission_hub_users is the
-- same admin-gate already proven working in 20260721010000/020000/030000.
ALTER TABLE public.destud_waitlist ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'new';
ALTER TABLE public.destud_waitlist ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'destud_waitlist_status_check') THEN
    ALTER TABLE public.destud_waitlist ADD CONSTRAINT destud_waitlist_status_check
      CHECK (status IN ('new','contacted','converted','not_interested'));
  END IF;
END $$;

GRANT INSERT ON public.destud_waitlist TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.destud_waitlist TO authenticated;
GRANT ALL ON public.destud_waitlist TO service_role;

ALTER TABLE public.destud_waitlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can submit a destud waitlist entry" ON public.destud_waitlist;
CREATE POLICY "Anyone can submit a destud waitlist entry"
  ON public.destud_waitlist FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "MH admins can view destud waitlist" ON public.destud_waitlist;
CREATE POLICY "MH admins can view destud waitlist"
  ON public.destud_waitlist FOR SELECT TO authenticated
  USING (
    exists (
      select 1 from public.mission_hub_users
      where auth_user_id = auth.uid() and role in ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "MH admins can update destud waitlist" ON public.destud_waitlist;
CREATE POLICY "MH admins can update destud waitlist"
  ON public.destud_waitlist FOR UPDATE TO authenticated
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

DROP POLICY IF EXISTS "MH admins can delete destud waitlist" ON public.destud_waitlist;
CREATE POLICY "MH admins can delete destud waitlist"
  ON public.destud_waitlist FOR DELETE TO authenticated
  USING (
    exists (
      select 1 from public.mission_hub_users
      where auth_user_id = auth.uid() and role in ('admin', 'super_admin')
    )
  );
