
-- 1. Extend profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS notification_prefs jsonb NOT NULL DEFAULT '{"new_lead": true, "new_contact": true}'::jsonb;

ALTER TABLE public.profiles ALTER COLUMN phone DROP NOT NULL;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'profiles_role_check') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('super_admin','admin','user'));
  END IF;
END $$;

-- Backfill email from auth.users
UPDATE public.profiles p SET email = u.email FROM auth.users u WHERE p.user_id = u.id AND p.email IS NULL;

-- 2. Security-definer helpers (avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_mh_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role IN ('super_admin','admin') AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_mh_super_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role = 'super_admin' AND is_active = true
  );
$$;

-- 3. Tighten profiles RLS
DROP POLICY IF EXISTS "Authenticated read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;

CREATE POLICY "profiles_select_self_or_admin" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_mh_admin());

CREATE POLICY "profiles_insert_admin" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (public.is_mh_admin());

CREATE POLICY "profiles_update_self_or_admin" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.is_mh_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_mh_admin());

CREATE POLICY "profiles_delete_super_admin" ON public.profiles
  FOR DELETE TO authenticated
  USING (public.is_mh_super_admin());

-- 4. user_verticals
CREATE TABLE IF NOT EXISTS public.user_verticals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vertical text NOT NULL CHECK (vertical IN ('agrisky','infrasky','geosky','guardsky','labs','academy')),
  mapped_at timestamptz NOT NULL DEFAULT now(),
  mapped_by uuid,
  UNIQUE(user_id, vertical)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_verticals TO authenticated;
GRANT ALL ON public.user_verticals TO service_role;
ALTER TABLE public.user_verticals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "uv_select_self_or_admin" ON public.user_verticals
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_mh_admin());
CREATE POLICY "uv_insert_admin" ON public.user_verticals
  FOR INSERT TO authenticated WITH CHECK (public.is_mh_admin());
CREATE POLICY "uv_update_admin" ON public.user_verticals
  FOR UPDATE TO authenticated USING (public.is_mh_admin());
CREATE POLICY "uv_delete_admin" ON public.user_verticals
  FOR DELETE TO authenticated USING (public.is_mh_admin());

-- 5. design_studio_leads status
ALTER TABLE public.design_studio_leads
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'new';
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'design_studio_leads_status_check') THEN
    ALTER TABLE public.design_studio_leads ADD CONSTRAINT design_studio_leads_status_check
      CHECK (status IN ('new','contacted','converted','not_interested'));
  END IF;
END $$;

-- 6. contacts table
CREATE TABLE IF NOT EXISTS public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  name text NOT NULL,
  phone text,
  email text,
  organisation text,
  location text,
  vertical_interest text,
  message text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','replied','in_progress','closed'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contacts TO authenticated;
GRANT INSERT ON public.contacts TO anon;
GRANT ALL ON public.contacts TO service_role;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contacts_insert_public" ON public.contacts
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "contacts_select_admin" ON public.contacts
  FOR SELECT TO authenticated USING (public.is_mh_admin());
CREATE POLICY "contacts_update_admin" ON public.contacts
  FOR UPDATE TO authenticated USING (public.is_mh_admin());
CREATE POLICY "contacts_delete_admin" ON public.contacts
  FOR DELETE TO authenticated USING (public.is_mh_admin());

-- 7. Update new-user trigger to capture email and default role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, phone, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'user')
  )
  ON CONFLICT (user_id) DO UPDATE
    SET email = COALESCE(EXCLUDED.email, public.profiles.email),
        full_name = COALESCE(NULLIF(EXCLUDED.full_name,''), public.profiles.full_name);
  RETURN NEW;
END;
$$;

-- Ensure trigger exists
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
    CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;
