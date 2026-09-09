-- Documentation Agent (Bay 13) schema. Mirrors Hangar_Certifications /
-- Hangar_Certification_specs / Hangar_Certification_runs shape and RLS
-- pattern field-for-field (20260912000000_hangar_certification_agent.sql),
-- swapping in this bay's own schema from DocumentationAgent.md Sections
-- 13-13.4 and 17. Same versioned parent/specs/runs split as every prior
-- bay.
--
-- Bay 13 fans in from Bay 09 only (single source), same as Bay 10/11/12 --
-- source_validation_id foreign key, matching their own shape. Bay 13 is a
-- SIBLING of Bay 10/11/12, not downstream of any of them.
--
-- Not auto-applied to the live project -- run manually in the Supabase SQL
-- editor, same as every other Hangar_* migration in this repo.

create table public."Hangar_Documentations" (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  source_validation_id uuid not null references public."Hangar_Validations"(id),
  documentation_code text not null default upper(substr(replace(gen_random_uuid()::text,'-',''), 1, 20)),
  status text not null default 'draft' check (status in ('draft','processing','spec_ready','finalized','error')),
  confidence_score numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public."Hangar_Documentation_specs" (
  id uuid primary key default gen_random_uuid(),
  documentation_id uuid not null references public."Hangar_Documentations"(id),
  version int not null,
  report text not null,
  slr jsonb not null default '[]'::jsonb,
  completeness_flags jsonb not null default '[]'::jsonb,
  confidence_score numeric not null,
  reasoning_summary text,
  source_was_mock boolean not null default false,
  created_at timestamptz not null default now(),
  unique (documentation_id, version)
);

create table public."Hangar_Documentation_runs" (
  id uuid primary key default gen_random_uuid(),
  documentation_id uuid not null references public."Hangar_Documentations"(id),
  agent_id text not null default 'DOCUMENTATION_AGENT',
  stage text not null check (stage in ('content_compilation','report_structuring','output_generation','output_interface')),
  input_snapshot jsonb,
  output_snapshot jsonb,
  status text not null check (status in ('success','error')),
  error_message text,
  duration_ms int,
  created_at timestamptz not null default now()
);

create or replace function public.get_next_documentation_spec_version(p_documentation_id uuid)
returns int language sql stable
set search_path = ''
as $$
  select coalesce(max(version),0)+1 from public."Hangar_Documentation_specs" where documentation_id = p_documentation_id;
$$;

alter table public."Hangar_Documentations" enable row level security;
alter table public."Hangar_Documentation_specs" enable row level security;
alter table public."Hangar_Documentation_runs" enable row level security;

create policy "Users read/write their own documentations" on public."Hangar_Documentations"
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users read/write specs for their own documentations" on public."Hangar_Documentation_specs"
  for all using (exists (select 1 from public."Hangar_Documentations" d where d.id = documentation_id and d.user_id = auth.uid()));

create policy "Users read/write runs for their own documentations" on public."Hangar_Documentation_runs"
  for all using (exists (select 1 from public."Hangar_Documentations" d where d.id = documentation_id and d.user_id = auth.uid()));

create trigger set_hangar_documentations_updated_at
  before update on public."Hangar_Documentations"
  for each row execute function public.set_hangar_updated_at();
