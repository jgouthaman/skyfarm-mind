-- The Hangar landing page's "Request Early Access" lead-capture form
-- (Hero CTA, the-hangar.index.tsx). A public, unauthenticated form — same
-- shape as the existing public.contacts table (anon insert allowed, admin-
-- only read) — but scoped to its own Hangar_* table since it's specific to
-- this one CTA and has its own field set.
--
-- status is never sent by the client; the DB default ('Requested') is the
-- only value it can ever be written with, since there is no update policy
-- for anon/authenticated to later change it.
--
-- Not auto-applied to the live project -- run manually in the Supabase SQL
-- editor, same as every other Hangar_* migration in this repo.

-- The select policy below depends on public.is_mh_admin(), which is
-- defined in an earlier migration (20260617091417_...sql) that turned out
-- to not actually be applied to the live project. Redefined here,
-- idempotently (CREATE OR REPLACE, safe even if it does already exist
-- elsewhere with this same definition), so this migration doesn't silently
-- depend on that one having been run first.
create or replace function public.is_mh_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid() and role in ('super_admin','admin') and is_active = true
  );
$$;

create table public."Hangar_early_access" (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  email text not null,
  mobile_number text not null,
  profession text,
  company text,
  country text,
  status text not null default 'Requested' check (status in ('Requested', 'Contacted', 'Approved', 'Declined'))
);

alter table public."Hangar_early_access" enable row level security;

grant insert on public."Hangar_early_access" to anon, authenticated;
grant select, update, delete on public."Hangar_early_access" to authenticated;
grant all on public."Hangar_early_access" to service_role;

-- Anyone can submit the form; nobody (not even the submitter) can read,
-- edit, or delete rows back through the API -- only admins, and only for
-- reading. Status changes (Contacted/Approved/Declined) happen via the
-- service role, not through client-facing policies.
create policy "Hangar_early_access_insert_public"
  on public."Hangar_early_access"
  for insert
  to anon, authenticated
  with check (true);

create policy "Hangar_early_access_select_admin"
  on public."Hangar_early_access"
  for select
  to authenticated
  using (public.is_mh_admin());
