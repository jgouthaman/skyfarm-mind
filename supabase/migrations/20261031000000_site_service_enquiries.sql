-- Public /services page enquiry form (POST /api/services/enquiry).
--
-- RLS is on with no policies: anon/authenticated clients can't read or
-- write. Only the server route, using supabaseAdmin (service role), inserts.
--
-- Not auto-applied to the live project -- run manually in the Supabase SQL
-- editor, same as the Hangar_* migrations.

create table public."Site_Service_Enquiries" (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  organisation text not null,
  email text not null,
  service text not null,
  message text not null,
  status text not null default 'new'
);

alter table public."Site_Service_Enquiries" enable row level security;
