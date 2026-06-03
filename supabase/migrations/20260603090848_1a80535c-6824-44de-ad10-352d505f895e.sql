
-- Lock down write access on all studio_* and agrisky_* tables to authenticated users.
-- Read access stays open per user's chosen security posture (demo/prototype reads).

-- ============ agrisky_drones ============
DROP POLICY IF EXISTS "demo insert agrisky_drones" ON public.agrisky_drones;
DROP POLICY IF EXISTS "demo update agrisky_drones" ON public.agrisky_drones;
CREATE POLICY "auth insert agrisky_drones" ON public.agrisky_drones
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update agrisky_drones" ON public.agrisky_drones
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- ============ agrisky_farms ============
DROP POLICY IF EXISTS "demo insert agrisky_farms" ON public.agrisky_farms;
DROP POLICY IF EXISTS "demo update agrisky_farms" ON public.agrisky_farms;
CREATE POLICY "auth insert agrisky_farms" ON public.agrisky_farms
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update agrisky_farms" ON public.agrisky_farms
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- ============ agrisky_field_uploads ============
DROP POLICY IF EXISTS "demo insert agrisky_field_uploads" ON public.agrisky_field_uploads;
CREATE POLICY "auth insert agrisky_field_uploads" ON public.agrisky_field_uploads
  FOR INSERT TO authenticated WITH CHECK (true);

-- ============ agrisky_missions ============
DROP POLICY IF EXISTS "demo insert agrisky_missions" ON public.agrisky_missions;
DROP POLICY IF EXISTS "demo update agrisky_missions" ON public.agrisky_missions;
CREATE POLICY "auth insert agrisky_missions" ON public.agrisky_missions
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update agrisky_missions" ON public.agrisky_missions
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- ============ agrisky_pilots ============
DROP POLICY IF EXISTS "demo insert agrisky_pilots" ON public.agrisky_pilots;
DROP POLICY IF EXISTS "demo update agrisky_pilots" ON public.agrisky_pilots;
CREATE POLICY "auth insert agrisky_pilots" ON public.agrisky_pilots
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update agrisky_pilots" ON public.agrisky_pilots
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- ============ studio_projects ============
DROP POLICY IF EXISTS "demo insert studio_projects" ON public.studio_projects;
DROP POLICY IF EXISTS "demo update studio_projects" ON public.studio_projects;
DROP POLICY IF EXISTS "demo delete studio_projects" ON public.studio_projects;
CREATE POLICY "auth insert studio_projects" ON public.studio_projects
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update studio_projects" ON public.studio_projects
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth delete studio_projects" ON public.studio_projects
  FOR DELETE TO authenticated USING (true);

-- ============ studio_reports ============
DROP POLICY IF EXISTS "demo insert studio_reports" ON public.studio_reports;
DROP POLICY IF EXISTS "demo delete studio_reports" ON public.studio_reports;
CREATE POLICY "auth insert studio_reports" ON public.studio_reports
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth delete studio_reports" ON public.studio_reports
  FOR DELETE TO authenticated USING (true);

-- ============ studio_requirements ============
DROP POLICY IF EXISTS "demo insert studio_requirements" ON public.studio_requirements;
DROP POLICY IF EXISTS "demo update studio_requirements" ON public.studio_requirements;
DROP POLICY IF EXISTS "demo delete studio_requirements" ON public.studio_requirements;
CREATE POLICY "auth insert studio_requirements" ON public.studio_requirements
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update studio_requirements" ON public.studio_requirements
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth delete studio_requirements" ON public.studio_requirements
  FOR DELETE TO authenticated USING (true);

-- ============ studio_designs ============
DROP POLICY IF EXISTS "demo insert studio_designs" ON public.studio_designs;
DROP POLICY IF EXISTS "demo update studio_designs" ON public.studio_designs;
DROP POLICY IF EXISTS "demo delete studio_designs" ON public.studio_designs;
CREATE POLICY "auth insert studio_designs" ON public.studio_designs
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update studio_designs" ON public.studio_designs
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth delete studio_designs" ON public.studio_designs
  FOR DELETE TO authenticated USING (true);

-- ============ studio_components ============
DROP POLICY IF EXISTS "demo insert studio_components" ON public.studio_components;
DROP POLICY IF EXISTS "demo update studio_components" ON public.studio_components;
DROP POLICY IF EXISTS "demo delete studio_components" ON public.studio_components;
CREATE POLICY "auth insert studio_components" ON public.studio_components
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update studio_components" ON public.studio_components
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth delete studio_components" ON public.studio_components
  FOR DELETE TO authenticated USING (true);

-- ============ studio_simulations ============
DROP POLICY IF EXISTS "demo insert studio_simulations" ON public.studio_simulations;
DROP POLICY IF EXISTS "demo update studio_simulations" ON public.studio_simulations;
DROP POLICY IF EXISTS "demo delete studio_simulations" ON public.studio_simulations;
CREATE POLICY "auth insert studio_simulations" ON public.studio_simulations
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update studio_simulations" ON public.studio_simulations
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth delete studio_simulations" ON public.studio_simulations
  FOR DELETE TO authenticated USING (true);

-- ============ storage.objects: field-uploads bucket ============
-- Restrict INSERT to authenticated users (was public).
DROP POLICY IF EXISTS "field-uploads public insert" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload to field-uploads" ON storage.objects;
DROP POLICY IF EXISTS "Public can upload field-uploads" ON storage.objects;

DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
      AND cmd='INSERT'
      AND qual IS NULL
      AND with_check ILIKE '%field-uploads%'
  LOOP
    EXECUTE format('DROP POLICY %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "field-uploads auth insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'field-uploads');
