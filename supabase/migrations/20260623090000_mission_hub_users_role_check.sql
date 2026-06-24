-- Align mission_hub_users.role with the application's role model.
-- The table was created allowing ('super_admin','admin','viewer'), but the app
-- uses 'user' as the lowest role (matching profiles_role_check and the route
-- guards that check role = 'user'). Swap the constraint to accept 'user'.

ALTER TABLE public.mission_hub_users
  DROP CONSTRAINT IF EXISTS mission_hub_users_role_check;

ALTER TABLE public.mission_hub_users
  ADD CONSTRAINT mission_hub_users_role_check
  CHECK (role IN ('super_admin', 'admin', 'user'));
