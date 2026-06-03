CREATE TABLE public.studio_verticals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  sort_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.studio_verticals TO anon, authenticated;
GRANT ALL ON public.studio_verticals TO service_role;
ALTER TABLE public.studio_verticals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "demo read studio_verticals" ON public.studio_verticals FOR SELECT USING (true);

CREATE TABLE public.studio_purposes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  sort_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.studio_purposes TO anon, authenticated;
GRANT ALL ON public.studio_purposes TO service_role;
ALTER TABLE public.studio_purposes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "demo read studio_purposes" ON public.studio_purposes FOR SELECT USING (true);

CREATE TABLE public.studio_user_types (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  sort_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.studio_user_types TO anon, authenticated;
GRANT ALL ON public.studio_user_types TO service_role;
ALTER TABLE public.studio_user_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "demo read studio_user_types" ON public.studio_user_types FOR SELECT USING (true);

INSERT INTO public.studio_verticals (name, sort_order) VALUES
  ('AgriSky', 1), ('GuardSky', 2), ('DeliverySky', 3), ('TrainSky', 4), ('Custom Drone Lab', 5);

INSERT INTO public.studio_purposes (name, sort_order) VALUES
  ('Agriculture spraying', 1),
  ('Farm aerial survey', 2),
  ('Crop monitoring', 3),
  ('Surveillance', 4),
  ('Fire detection', 5),
  ('Fire extinguisher ball dropping', 6),
  ('Payload delivery', 7),
  ('Training drone', 8),
  ('Custom research drone', 9);

INSERT INTO public.studio_user_types (name, sort_order) VALUES
  ('Farmer', 1),
  ('Drone Pilot', 2),
  ('Student', 3),
  ('Trainer', 4),
  ('Enterprise client', 5),
  ('Investor demo', 6),
  ('Internal R&D', 7);
