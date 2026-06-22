DROP POLICY IF EXISTS "Admins can view design studio leads" ON public.design_studio_leads;
DROP POLICY IF EXISTS "Admins can update design studio leads" ON public.design_studio_leads;
DROP POLICY IF EXISTS "Admins can delete design studio leads" ON public.design_studio_leads;

CREATE POLICY "MH admins can view design studio leads"
  ON public.design_studio_leads FOR SELECT TO authenticated
  USING (public.is_mh_admin() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "MH admins can update design studio leads"
  ON public.design_studio_leads FOR UPDATE TO authenticated
  USING (public.is_mh_admin() OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.is_mh_admin() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "MH admins can delete design studio leads"
  ON public.design_studio_leads FOR DELETE TO authenticated
  USING (public.is_mh_admin() OR public.has_role(auth.uid(), 'admin'::app_role));