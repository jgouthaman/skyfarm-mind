-- Lightweight sign-in check for the public /destud page, mirroring
-- verify_academy_user: matches name+email against destud_users (the
-- "confirmed access" table populated by convert_destud_waitlist_entry) and
-- returns a small identity object, or null if there's no match. Gated on
-- status = 'converted' since that's the status the conversion RPC always
-- sets — an admin flipping a row away from 'converted' effectively revokes
-- access. SECURITY DEFINER + anon EXECUTE because this page has no real
-- Supabase Auth session (same reasoning as academy sign-in).
create or replace function public.verify_destud_user(p_name text, p_email text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object('id', id, 'full_name', full_name, 'email', email, 'plan', plan)
  from public.destud_users
  where lower(email) = lower(trim(p_email))
    and lower(full_name) = lower(trim(p_name))
    and status = 'converted'
  order by created_at asc
  limit 1;
$$;

revoke all on function public.verify_destud_user(text, text) from public;
grant execute on function public.verify_destud_user(text, text) to anon, authenticated;
