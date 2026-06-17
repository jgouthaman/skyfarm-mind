
-- 1. Add user_id owner column to studio_projects with default = auth.uid()
ALTER TABLE public.studio_projects
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.studio_projects
  ALTER COLUMN user_id SET DEFAULT auth.uid();

CREATE INDEX IF NOT EXISTS idx_studio_projects_user_id ON public.studio_projects(user_id);

-- 2. Helper: does the current user own (or admin) a given project?
CREATE OR REPLACE FUNCTION public.can_access_studio_project(_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.studio_projects p
    WHERE p.id = _project_id
      AND (p.user_id = auth.uid() OR public.is_mh_admin())
  );
$$;

GRANT EXECUTE ON FUNCTION public.can_access_studio_project(uuid) TO authenticated;

-- 3. Reset RLS policies on studio_projects
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='studio_projects' LOOP
    EXECUTE format('DROP POLICY %I ON public.studio_projects', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "studio_projects owner or admin select"
  ON public.studio_projects FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_mh_admin());

CREATE POLICY "studio_projects authenticated insert as self"
  ON public.studio_projects FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_mh_admin());

CREATE POLICY "studio_projects owner or admin update"
  ON public.studio_projects FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_mh_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_mh_admin());

CREATE POLICY "studio_projects owner or admin delete"
  ON public.studio_projects FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_mh_admin());

-- 4. Reset RLS for child tables to inherit ownership via project
DO $$
DECLARE t text;
DECLARE pol record;
BEGIN
  FOREACH t IN ARRAY ARRAY['studio_requirements','studio_designs','studio_components','studio_simulations','studio_reports'] LOOP
    FOR pol IN EXECUTE format('SELECT policyname FROM pg_policies WHERE schemaname=$1 AND tablename=$2') USING 'public', t LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', pol.policyname, t);
    END LOOP;
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.can_access_studio_project(project_id))', t||'_select', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.can_access_studio_project(project_id))', t||'_insert', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.can_access_studio_project(project_id)) WITH CHECK (public.can_access_studio_project(project_id))', t||'_update', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.can_access_studio_project(project_id))', t||'_delete', t);
  END LOOP;
END $$;
