-- Certification Agent (Bay 12) schema. Mirrors Hangar_Manufacturings /
-- Hangar_Manufacturing_specs / Hangar_Manufacturing_runs shape and RLS
-- pattern field-for-field (20260911000000_hangar_manufacturing_agent.sql),
-- swapping in this bay's own schema from CertificationAgent.md Sections
-- 12-12.4 and 16. Same versioned parent/specs/runs split as every prior
-- bay.
--
-- Bay 12 fans in from Bay 09 only (single source), same as Bay 10/11 --
-- source_validation_id foreign key, matching their own shape. Bay 12 is a
-- SIBLING of Bay 10/11/13, not downstream of any of them -- all reference
-- Hangar_Validations directly. Unlike Bay 10/11, Bay 12 needs no deeper
-- upstream hop (structural/CAD) -- it works entirely off Bay 09's own
-- compliance matrix and non-conformances, per CertificationAgent.md's own
-- "deliberately scoped one level up from Bay 09" note.
--
-- Not auto-applied to the live project -- run manually in the Supabase SQL
-- editor, same as every other Hangar_* migration in this repo.

create table public."Hangar_Certifications" (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  source_validation_id uuid not null references public."Hangar_Validations"(id),
  certification_code text not null default upper(substr(replace(gen_random_uuid()::text,'-',''), 1, 20)),
  status text not null default 'draft' check (status in ('draft','processing','spec_ready','finalized','error')),
  confidence_score numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public."Hangar_Certification_specs" (
  id uuid primary key default gen_random_uuid(),
  certification_id uuid not null references public."Hangar_Certifications"(id),
  version int not null,
  checklist jsonb not null,
  gap_report jsonb not null default '[]'::jsonb,
  certification_readiness text not null check (certification_readiness in ('READY','GAPS_OPEN','BLOCKED')),
  confidence_score numeric not null,
  reasoning_summary text,
  source_was_mock boolean not null default false,
  created_at timestamptz not null default now(),
  unique (certification_id, version)
);

create table public."Hangar_Certification_runs" (
  id uuid primary key default gen_random_uuid(),
  certification_id uuid not null references public."Hangar_Certifications"(id),
  agent_id text not null default 'CERTIFICATION_AGENT',
  stage text not null check (stage in ('regulatory_mapping','gap_analysis','output_generation','output_interface')),
  input_snapshot jsonb,
  output_snapshot jsonb,
  status text not null check (status in ('success','error')),
  error_message text,
  duration_ms int,
  created_at timestamptz not null default now()
);

create or replace function public.get_next_certification_spec_version(p_certification_id uuid)
returns int language sql stable
set search_path = ''
as $$
  select coalesce(max(version),0)+1 from public."Hangar_Certification_specs" where certification_id = p_certification_id;
$$;

alter table public."Hangar_Certifications" enable row level security;
alter table public."Hangar_Certification_specs" enable row level security;
alter table public."Hangar_Certification_runs" enable row level security;

create policy "Users read/write their own certifications" on public."Hangar_Certifications"
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users read/write specs for their own certifications" on public."Hangar_Certification_specs"
  for all using (exists (select 1 from public."Hangar_Certifications" c where c.id = certification_id and c.user_id = auth.uid()));

create policy "Users read/write runs for their own certifications" on public."Hangar_Certification_runs"
  for all using (exists (select 1 from public."Hangar_Certifications" c where c.id = certification_id and c.user_id = auth.uid()));

create trigger set_hangar_certifications_updated_at
  before update on public."Hangar_Certifications"
  for each row execute function public.set_hangar_updated_at();
