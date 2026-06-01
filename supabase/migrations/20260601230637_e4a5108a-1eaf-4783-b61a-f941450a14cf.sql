
-- Pilots
CREATE TABLE public.pilots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pilots TO anon, authenticated;
GRANT ALL ON public.pilots TO service_role;
ALTER TABLE public.pilots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "demo read pilots" ON public.pilots FOR SELECT USING (true);
CREATE POLICY "demo insert pilots" ON public.pilots FOR INSERT WITH CHECK (true);
CREATE POLICY "demo update pilots" ON public.pilots FOR UPDATE USING (true) WITH CHECK (true);

-- Farms
CREATE TABLE public.farms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  farmer text,
  location text,
  size_acres numeric,
  crop text,
  service_needed text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.farms TO anon, authenticated;
GRANT ALL ON public.farms TO service_role;
ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "demo read farms" ON public.farms FOR SELECT USING (true);
CREATE POLICY "demo insert farms" ON public.farms FOR INSERT WITH CHECK (true);
CREATE POLICY "demo update farms" ON public.farms FOR UPDATE USING (true) WITH CHECK (true);

-- Missions
CREATE TABLE public.missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  pilot_id uuid REFERENCES public.pilots(id) ON DELETE SET NULL,
  service text NOT NULL,
  status text NOT NULL DEFAULT 'assigned',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX missions_farm_idx ON public.missions(farm_id);
CREATE INDEX missions_pilot_idx ON public.missions(pilot_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.missions TO anon, authenticated;
GRANT ALL ON public.missions TO service_role;
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "demo read missions" ON public.missions FOR SELECT USING (true);
CREATE POLICY "demo insert missions" ON public.missions FOR INSERT WITH CHECK (true);
CREATE POLICY "demo update missions" ON public.missions FOR UPDATE USING (true) WITH CHECK (true);

-- Field uploads (photos pushed from pilot phone)
CREATE TABLE public.field_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id uuid REFERENCES public.missions(id) ON DELETE SET NULL,
  farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE,
  pilot_id uuid REFERENCES public.pilots(id) ON DELETE SET NULL,
  image_url text NOT NULL,
  caption text,
  lat numeric,
  lng numeric,
  captured_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX field_uploads_farm_idx ON public.field_uploads(farm_id);
CREATE INDEX field_uploads_mission_idx ON public.field_uploads(mission_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.field_uploads TO anon, authenticated;
GRANT ALL ON public.field_uploads TO service_role;
ALTER TABLE public.field_uploads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "demo read field_uploads" ON public.field_uploads FOR SELECT USING (true);
CREATE POLICY "demo insert field_uploads" ON public.field_uploads FOR INSERT WITH CHECK (true);

-- Realtime so Control Center sees uploads instantly
ALTER PUBLICATION supabase_realtime ADD TABLE public.field_uploads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.missions;

-- Public storage bucket for field photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('field-uploads', 'field-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: public read, anon upload (demo)
CREATE POLICY "Public read field-uploads"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'field-uploads');

CREATE POLICY "Anyone can upload field-uploads"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'field-uploads');
