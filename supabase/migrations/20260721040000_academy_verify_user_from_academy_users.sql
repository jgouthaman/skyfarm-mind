-- Replaces the previously untracked verify_academy_user RPC with an explicit,
-- version-controlled implementation that looks up the signed-in person
-- directly in academy_users (not enrollments/academy_courses via some other
-- untracked path). Academy students carry no Supabase Auth session (sign-in
-- only checks name+email and caches the result in sessionStorage — see
-- src/lib/academy-auth.ts / src/routes/academy.index.tsx), so this must stay
-- SECURITY DEFINER and grant EXECUTE to anon.
--
-- academy_users has one row per (person, course) enrollment: course_id is a
-- single nullable uuid, not a list (see enroll_waitlist_user in migration
-- 20260721010000, which inserts one fresh academy_users row per waitlist
-- enrollment). A person enrolled in multiple courses therefore has multiple
-- rows sharing the same name/email. This function collects ALL of that
-- person's active rows and returns every enrolled course, using the
-- earliest-enrolled row's id as the session-level user id (matches prior
-- behavior for the common single-course case; per-course progress tracking
-- against academy_users.id for multi-course learners is a separate,
-- unresolved concern beyond the scope of this fix).
create or replace function public.verify_academy_user(p_name text, p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  select jsonb_build_object(
    'id', (array_agg(au.id order by au.activated_at asc))[1],
    'full_name', (array_agg(au.full_name order by au.activated_at asc))[1],
    'email', (array_agg(au.email order by au.activated_at asc))[1],
    'courses', coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', c.id,
          'slug', c.slug,
          'title', c.title,
          'level', c.level,
          'hours', c.hours,
          'price', c.price,
          'enrolled_at', au.activated_at,
          'status', au.status
        ) order by au.activated_at asc
      ) filter (where c.id is not null),
      '[]'::jsonb
    )
  )
  into v_result
  from public.academy_users au
  left join public.academy_courses c on c.id = au.course_id
  where lower(au.email) = lower(trim(p_email))
    and lower(au.full_name) = lower(trim(p_name))
    and au.status = 'active';

  if v_result is null or (v_result ->> 'id') is null then
    return null;
  end if;

  return v_result;
end;
$$;

revoke all on function public.verify_academy_user(text, text) from public;
grant execute on function public.verify_academy_user(text, text) to anon, authenticated;
