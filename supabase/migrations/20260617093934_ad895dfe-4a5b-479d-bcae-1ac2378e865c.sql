ALTER TABLE public.user_verticals DROP CONSTRAINT IF EXISTS user_verticals_vertical_check;
ALTER TABLE public.user_verticals ADD CONSTRAINT user_verticals_vertical_check
  CHECK (vertical IN ('agrisky','infrasky','geosky','guardsky','labs','academy','design-studio'));