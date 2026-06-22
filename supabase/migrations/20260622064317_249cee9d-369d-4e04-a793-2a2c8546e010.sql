UPDATE public.profiles SET phone = NULL WHERE phone = '';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, phone, full_name, email, role)
  VALUES (
    NEW.id,
    NULLIF(COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone, ''), ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'user')
  )
  ON CONFLICT (user_id) DO UPDATE
    SET email = COALESCE(EXCLUDED.email, public.profiles.email),
        full_name = COALESCE(NULLIF(EXCLUDED.full_name,''), public.profiles.full_name);
  RETURN NEW;
END;
$function$;