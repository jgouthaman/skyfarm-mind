
-- Copy data preserving IDs (skip rows already present, in case of re-run)
INSERT INTO public.agrisky_farms (id, name, farmer, location, size_acres, crop, service_needed, created_at)
SELECT id, name, farmer, location, size_acres, crop, service_needed, created_at FROM public.farms
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.agrisky_pilots (id, name, phone, status, created_at)
SELECT id, name, phone, status, created_at FROM public.pilots
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.agrisky_drones (id, name, model, serial_no, capacity_litres, status, notes, created_at)
SELECT id, name, model, serial_no, capacity_litres, status, notes, created_at FROM public.drones
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.agrisky_missions (id, farm_id, pilot_id, drone_id, service, status, notes, scheduled_at, created_at)
SELECT id, farm_id, pilot_id, drone_id, service, status, notes, scheduled_at, created_at FROM public.missions
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.agrisky_field_uploads (id, mission_id, farm_id, pilot_id, image_url, caption, lat, lng, captured_at, created_at)
SELECT id, mission_id, farm_id, pilot_id, image_url, caption, lat, lng, captured_at, created_at FROM public.field_uploads
ON CONFLICT (id) DO NOTHING;

-- Drop legacy tables
DROP TABLE IF EXISTS public.field_uploads CASCADE;
DROP TABLE IF EXISTS public.missions CASCADE;
DROP TABLE IF EXISTS public.drones CASCADE;
DROP TABLE IF EXISTS public.farms CASCADE;
DROP TABLE IF EXISTS public.pilots CASCADE;
