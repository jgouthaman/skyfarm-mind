-- Adds vehicle_type to the tables used by the Design Studio intelligence engine
-- and project records, for the new Step 0 (vehicle type selection) in the wizard.
-- Existing rows default to 'multirotor', the only vehicle type supported before
-- this change, so existing matching/query behaviour is unaffected.

ALTER TABLE public.design_rules
  ADD COLUMN IF NOT EXISTS vehicle_type text NOT NULL DEFAULT 'multirotor';

ALTER TABLE public.design_rules
  DROP CONSTRAINT IF EXISTS design_rules_vehicle_type_check;
ALTER TABLE public.design_rules
  ADD CONSTRAINT design_rules_vehicle_type_check
  CHECK (vehicle_type IN ('multirotor', 'fixed-wing', 'vtol-hybrid', 'cargo-heavy-lift'));

ALTER TABLE public.reference_designs
  ADD COLUMN IF NOT EXISTS vehicle_type text NOT NULL DEFAULT 'multirotor';

ALTER TABLE public.reference_designs
  DROP CONSTRAINT IF EXISTS reference_designs_vehicle_type_check;
ALTER TABLE public.reference_designs
  ADD CONSTRAINT reference_designs_vehicle_type_check
  CHECK (vehicle_type IN ('multirotor', 'fixed-wing', 'vtol-hybrid', 'cargo-heavy-lift'));

ALTER TABLE public.studio_projects
  ADD COLUMN IF NOT EXISTS vehicle_type text NOT NULL DEFAULT 'multirotor';

ALTER TABLE public.studio_projects
  DROP CONSTRAINT IF EXISTS studio_projects_vehicle_type_check;
ALTER TABLE public.studio_projects
  ADD CONSTRAINT studio_projects_vehicle_type_check
  CHECK (vehicle_type IN ('multirotor', 'fixed-wing', 'vtol-hybrid', 'cargo-heavy-lift'));
