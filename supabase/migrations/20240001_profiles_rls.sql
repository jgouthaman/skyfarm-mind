-- Profile RLS policy: ensure a user can always read their own profile row.
-- This backs the Mission Hub login flow, which selects the signed-in user's
-- profile immediately after authentication to confirm the account is set up.
-- Idempotent: safe to re-run.

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Security-definer helper: is the current user an active Mission Hub admin?
-- Defined here so this migration is self-contained even if applied in isolation.
CREATE OR REPLACE FUNCTION public.is_mh_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin')
      AND is_active = true
  );
$$;

-- Authenticated users may read their own profile; admins may read all profiles.
DROP POLICY IF EXISTS "profiles_select_self_or_admin" ON public.profiles;
CREATE POLICY "profiles_select_self_or_admin" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_mh_admin());
