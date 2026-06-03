
-- =========================
-- AGRISKY TABLES
-- =========================

CREATE TABLE public.agrisky_farms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  farmer text,
  location text,
  size_acres numeric,
  crop text,
  service_needed text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agrisky_farms TO anon, authenticated;
GRANT ALL ON public.agrisky_farms TO service_role;
ALTER TABLE public.agrisky_farms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "demo read agrisky_farms" ON public.agrisky_farms FOR SELECT USING (true);
CREATE POLICY "demo insert agrisky_farms" ON public.agrisky_farms FOR INSERT WITH CHECK (true);
CREATE POLICY "demo update agrisky_farms" ON public.agrisky_farms FOR UPDATE USING (true) WITH CHECK (true);

CREATE TABLE public.agrisky_pilots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agrisky_pilots TO anon, authenticated;
GRANT ALL ON public.agrisky_pilots TO service_role;
ALTER TABLE public.agrisky_pilots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "demo read agrisky_pilots" ON public.agrisky_pilots FOR SELECT USING (true);
CREATE POLICY "demo insert agrisky_pilots" ON public.agrisky_pilots FOR INSERT WITH CHECK (true);
CREATE POLICY "demo update agrisky_pilots" ON public.agrisky_pilots FOR UPDATE USING (true) WITH CHECK (true);

CREATE TABLE public.agrisky_drones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  model text,
  serial_no text,
  capacity_litres numeric,
  status text NOT NULL DEFAULT 'available',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agrisky_drones TO anon, authenticated;
GRANT ALL ON public.agrisky_drones TO service_role;
ALTER TABLE public.agrisky_drones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "demo read agrisky_drones" ON public.agrisky_drones FOR SELECT USING (true);
CREATE POLICY "demo insert agrisky_drones" ON public.agrisky_drones FOR INSERT WITH CHECK (true);
CREATE POLICY "demo update agrisky_drones" ON public.agrisky_drones FOR UPDATE USING (true) WITH CHECK (true);

CREATE TABLE public.agrisky_missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES public.agrisky_farms(id) ON DELETE CASCADE,
  pilot_id uuid REFERENCES public.agrisky_pilots(id) ON DELETE SET NULL,
  drone_id uuid REFERENCES public.agrisky_drones(id) ON DELETE SET NULL,
  service text NOT NULL,
  status text NOT NULL DEFAULT 'assigned',
  notes text,
  scheduled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agrisky_missions TO anon, authenticated;
GRANT ALL ON public.agrisky_missions TO service_role;
ALTER TABLE public.agrisky_missions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "demo read agrisky_missions" ON public.agrisky_missions FOR SELECT USING (true);
CREATE POLICY "demo insert agrisky_missions" ON public.agrisky_missions FOR INSERT WITH CHECK (true);
CREATE POLICY "demo update agrisky_missions" ON public.agrisky_missions FOR UPDATE USING (true) WITH CHECK (true);

CREATE TABLE public.agrisky_field_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id uuid REFERENCES public.agrisky_missions(id) ON DELETE SET NULL,
  farm_id uuid REFERENCES public.agrisky_farms(id) ON DELETE SET NULL,
  pilot_id uuid REFERENCES public.agrisky_pilots(id) ON DELETE SET NULL,
  image_url text NOT NULL,
  caption text,
  lat numeric,
  lng numeric,
  captured_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agrisky_field_uploads TO anon, authenticated;
GRANT ALL ON public.agrisky_field_uploads TO service_role;
ALTER TABLE public.agrisky_field_uploads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "demo read agrisky_field_uploads" ON public.agrisky_field_uploads FOR SELECT USING (true);
CREATE POLICY "demo insert agrisky_field_uploads" ON public.agrisky_field_uploads FOR INSERT WITH CHECK (true);

-- =========================
-- DESIGN STUDIO TABLES
-- =========================

CREATE TABLE public.studio_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name text NOT NULL,
  vertical text NOT NULL,
  purpose text,
  user_type text,
  status text NOT NULL DEFAULT 'Draft',
  risk_level text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.studio_projects TO anon, authenticated;
GRANT ALL ON public.studio_projects TO service_role;
ALTER TABLE public.studio_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "demo read studio_projects" ON public.studio_projects FOR SELECT USING (true);
CREATE POLICY "demo insert studio_projects" ON public.studio_projects FOR INSERT WITH CHECK (true);
CREATE POLICY "demo update studio_projects" ON public.studio_projects FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "demo delete studio_projects" ON public.studio_projects FOR DELETE USING (true);

CREATE TABLE public.studio_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.studio_projects(id) ON DELETE CASCADE,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.studio_requirements TO anon, authenticated;
GRANT ALL ON public.studio_requirements TO service_role;
ALTER TABLE public.studio_requirements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "demo read studio_requirements" ON public.studio_requirements FOR SELECT USING (true);
CREATE POLICY "demo insert studio_requirements" ON public.studio_requirements FOR INSERT WITH CHECK (true);
CREATE POLICY "demo update studio_requirements" ON public.studio_requirements FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "demo delete studio_requirements" ON public.studio_requirements FOR DELETE USING (true);

CREATE TABLE public.studio_designs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.studio_projects(id) ON DELETE CASCADE,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.studio_designs TO anon, authenticated;
GRANT ALL ON public.studio_designs TO service_role;
ALTER TABLE public.studio_designs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "demo read studio_designs" ON public.studio_designs FOR SELECT USING (true);
CREATE POLICY "demo insert studio_designs" ON public.studio_designs FOR INSERT WITH CHECK (true);
CREATE POLICY "demo update studio_designs" ON public.studio_designs FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "demo delete studio_designs" ON public.studio_designs FOR DELETE USING (true);

CREATE TABLE public.studio_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.studio_projects(id) ON DELETE CASCADE,
  payload jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.studio_components TO anon, authenticated;
GRANT ALL ON public.studio_components TO service_role;
ALTER TABLE public.studio_components ENABLE ROW LEVEL SECURITY;
CREATE POLICY "demo read studio_components" ON public.studio_components FOR SELECT USING (true);
CREATE POLICY "demo insert studio_components" ON public.studio_components FOR INSERT WITH CHECK (true);
CREATE POLICY "demo update studio_components" ON public.studio_components FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "demo delete studio_components" ON public.studio_components FOR DELETE USING (true);

CREATE TABLE public.studio_simulations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.studio_projects(id) ON DELETE CASCADE,
  label text,
  inputs jsonb NOT NULL DEFAULT '{}'::jsonb,
  outcome jsonb NOT NULL DEFAULT '{}'::jsonb,
  risk_level text,
  finalized boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.studio_simulations TO anon, authenticated;
GRANT ALL ON public.studio_simulations TO service_role;
ALTER TABLE public.studio_simulations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "demo read studio_simulations" ON public.studio_simulations FOR SELECT USING (true);
CREATE POLICY "demo insert studio_simulations" ON public.studio_simulations FOR INSERT WITH CHECK (true);
CREATE POLICY "demo update studio_simulations" ON public.studio_simulations FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "demo delete studio_simulations" ON public.studio_simulations FOR DELETE USING (true);

CREATE INDEX idx_studio_simulations_project ON public.studio_simulations(project_id, created_at DESC);

CREATE TABLE public.studio_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.studio_projects(id) ON DELETE CASCADE,
  title text,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.studio_reports TO anon, authenticated;
GRANT ALL ON public.studio_reports TO service_role;
ALTER TABLE public.studio_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "demo read studio_reports" ON public.studio_reports FOR SELECT USING (true);
CREATE POLICY "demo insert studio_reports" ON public.studio_reports FOR INSERT WITH CHECK (true);
CREATE POLICY "demo delete studio_reports" ON public.studio_reports FOR DELETE USING (true);
