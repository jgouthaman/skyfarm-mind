-- The Hangar landing page's "Request Early Access" lead-capture form
-- (Hero CTA, the-hangar.index.tsx). A public, unauthenticated form — anon
-- insert allowed, nothing else — scoped to its own Hangar_* table since
-- it's specific to this one CTA and has its own field set.
--
-- status is never sent by the client; the DB default ('Requested') is the
-- only value it can ever be written with, since there is no update policy
-- for anon/authenticated to later change it.
--
-- No admin-only SELECT policy here (unlike public.contacts' pattern) --
-- this project's public.is_mh_admin()/public.profiles admin-check
-- infrastructure turned out to not actually exist on the live database
-- (confirmed: 42883 function does not exist, then 42P01 relation
-- public.profiles does not exist), so this migration doesn't depend on
-- it. With RLS on and no SELECT policy for anon/authenticated, only the
-- service role (which bypasses RLS entirely, e.g. via supabaseAdmin in a
-- server route) can read rows back -- sufficient for now, since reading
-- these leads isn't part of what's been asked for yet.
--
-- Not auto-applied to the live project -- run manually in the Supabase SQL
-- editor, same as every other Hangar_* migration in this repo.

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
grant all on public."Hangar_early_access" to service_role;

create policy "Hangar_early_access_insert_public"
  on public."Hangar_early_access"
  for insert
  to anon, authenticated
  with check (true);
