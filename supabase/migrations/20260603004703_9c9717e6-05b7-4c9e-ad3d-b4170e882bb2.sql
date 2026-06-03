CREATE TABLE public.drones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  model TEXT,
  serial_no TEXT,
  capacity_litres NUMERIC,
  status TEXT NOT NULL DEFAULT 'available',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.drones TO anon, authenticated;
GRANT ALL ON public.drones TO service_role;

ALTER TABLE public.drones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "demo read drones" ON public.drones FOR SELECT USING (true);
CREATE POLICY "demo insert drones" ON public.drones FOR INSERT WITH CHECK (true);
CREATE POLICY "demo update drones" ON public.drones FOR UPDATE USING (true) WITH CHECK (true);

ALTER TABLE public.missions ADD COLUMN drone_id UUID REFERENCES public.drones(id);
ALTER TABLE public.missions ADD COLUMN scheduled_at TIMESTAMPTZ;