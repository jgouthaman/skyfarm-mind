-- Seed the industries lookup table with TorqWings verticals and allow
-- authenticated users to read it (it is reference data, not user-owned rows).

-- Enable RLS (safe to run even if already enabled)
ALTER TABLE public.industries ENABLE ROW LEVEL SECURITY;

-- Drop and recreate SELECT policy so this migration is idempotent
DROP POLICY IF EXISTS industries_select_authenticated ON public.industries;
CREATE POLICY industries_select_authenticated ON public.industries
  FOR SELECT TO authenticated USING (true);

-- Seed verticals; skip rows that already exist by slug (no unique constraint needed)
INSERT INTO public.industries (name, slug)
SELECT v.name, v.slug
FROM (VALUES
  ('AgriSky',       'agrisky'),
  ('InfraSky',      'infrasky'),
  ('GeoSky',        'geosky'),
  ('GuardSky',      'guardsky'),
  ('Labs',          'labs'),
  ('Academy',       'academy'),
  ('Design Studio', 'design-studio')
) AS v(name, slug)
WHERE NOT EXISTS (
  SELECT 1 FROM public.industries WHERE industries.slug = v.slug
);
