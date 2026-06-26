-- Fix "infinite recursion detected in policy for relation mission_hub_users" (42P17).
-- The recursion happens when a policy ON mission_hub_users runs a SELECT against
-- mission_hub_users to check the caller's role. The fix is a SECURITY DEFINER
-- helper (which bypasses RLS, so it does not re-trigger the policy) plus simple,
-- non-recursive self-access policies.

ALTER TABLE public.mission_hub_users ENABLE ROW LEVEL SECURITY;

-- Non-recursive admin check. SECURITY DEFINER runs as the function owner and
-- bypasses RLS on mission_hub_users, so it never re-enters the policy.
CREATE OR REPLACE FUNCTION public.is_mhu_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.mission_hub_users
    WHERE id = auth.uid()
      AND role IN ('super_admin', 'admin')
      AND status = 'active'
  );
$$;

-- Drop every existing policy on the table (at least one of them recurses).
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'mission_hub_users'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.mission_hub_users', pol.policyname);
  END LOOP;
END $$;

-- Recreate clean, non-recursive policies.
-- A user can always read/update their own row; admins can read/manage all.
-- (Server-side writes use the service role and bypass RLS regardless.)
CREATE POLICY mhu_select_self_or_admin ON public.mission_hub_users
  FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.is_mhu_admin());

CREATE POLICY mhu_insert_admin ON public.mission_hub_users
  FOR INSERT TO authenticated
  WITH CHECK (public.is_mhu_admin());

CREATE POLICY mhu_update_self_or_admin ON public.mission_hub_users
  FOR UPDATE TO authenticated
  USING (auth.uid() = id OR public.is_mhu_admin())
  WITH CHECK (auth.uid() = id OR public.is_mhu_admin());

CREATE POLICY mhu_delete_admin ON public.mission_hub_users
  FOR DELETE TO authenticated
  USING (public.is_mhu_admin());
