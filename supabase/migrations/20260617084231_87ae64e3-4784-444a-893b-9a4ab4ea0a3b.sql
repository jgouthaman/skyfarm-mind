
CREATE TABLE public.design_studio_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  organisation text,
  role text NOT NULL,
  location text NOT NULL,
  plan text NOT NULL,
  message text,
  source text NOT NULL DEFAULT 'website'
);

GRANT INSERT ON public.design_studio_leads TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.design_studio_leads TO authenticated;
GRANT ALL ON public.design_studio_leads TO service_role;

ALTER TABLE public.design_studio_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a design studio lead"
  ON public.design_studio_leads FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view design studio leads"
  ON public.design_studio_leads FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update design studio leads"
  ON public.design_studio_leads FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete design studio leads"
  ON public.design_studio_leads FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
