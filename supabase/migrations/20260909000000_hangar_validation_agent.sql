-- Validation Agent (Bay 09) schema. Mirrors Hangar_Optimizations /
-- Hangar_Optimization_specs / Hangar_Optimization_runs shape and RLS
-- pattern field-for-field (20260907000000_hangar_optimization_agent.sql),
-- swapping in this bay's own schema from ValidationAgent.md Sections
-- 9-9.4 and 13. Same versioned parent/specs/runs split as Bay 07/08 --
-- re-running validation reasoning after the referenced optimization result
-- changes should produce a new version.
--
-- Difference from Bay 08's shape: Bay 09 fans in from ONE upstream source
-- (Bay 08 only), not two -- so there is a single source_optimization_id
-- foreign key here, not a pair like Bay 08's source_cfd_analysis_id /
-- source_structural_id. Gate rule VAL-001 (optimization_id must trace back
-- to the same source_cad_design_id chain as the referenced Bay 08 result)
-- is enforced at the application layer in validationRules.ts, not in SQL --
-- same as how Bay 08's OPT-003 lineage check is application-layer, not a
-- DB constraint.
--
-- Not auto-applied to the live project -- run manually in the Supabase SQL
-- editor, same as every other Hangar_* migration in this repo.

create table public."Hangar_Validations" (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  source_optimization_id uuid not null references public."Hangar_Optimizations"(id),
  validation_code text not null default upper(substr(replace(gen_random_uuid()::text,'-',''), 1, 20)),
  status text not null default 'draft' check (status in ('draft','processing','spec_ready','finalized','error')),
  confidence_score numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public."Hangar_Validation_specs" (
  id uuid primary key default gen_random_uuid(),
  validation_id uuid not null references public."Hangar_Validations"(id),
  version int not null,
  verdict text not null check (verdict in ('PASS','FAIL','CONDITIONAL')),
  compliance_matrix jsonb not null,
  non_conformances jsonb not null default '[]'::jsonb,
  readiness_score numeric,
  risk_flags jsonb not null default '[]'::jsonb,
  confidence_score numeric not null,
  reasoning_summary text,
  source_was_mock boolean not null default false,
  created_at timestamptz not null default now(),
  unique (validation_id, version)
);

create table public."Hangar_Validation_runs" (
  id uuid primary key default gen_random_uuid(),
  validation_id uuid not null references public."Hangar_Validations"(id),
  agent_id text not null default 'VALIDATION_AGENT',
  stage text not null check (stage in ('compliance_checking','validation_execution','output_generation','output_interface')),
  input_snapshot jsonb,
  output_snapshot jsonb,
  status text not null check (status in ('success','error')),
  error_message text,
  duration_ms int,
  created_at timestamptz not null default now()
);

create or replace function public.get_next_validation_spec_version(p_validation_id uuid)
returns int language sql stable
set search_path = ''
as $$
  select coalesce(max(version),0)+1 from public."Hangar_Validation_specs" where validation_id = p_validation_id;
$$;

alter table public."Hangar_Validations" enable row level security;
alter table public."Hangar_Validation_specs" enable row level security;
alter table public."Hangar_Validation_runs" enable row level security;

create policy "Users read/write their own validations" on public."Hangar_Validations"
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users read/write specs for their own validations" on public."Hangar_Validation_specs"
  for all using (exists (select 1 from public."Hangar_Validations" v where v.id = validation_id and v.user_id = auth.uid()));

create policy "Users read/write runs for their own validations" on public."Hangar_Validation_runs"
  for all using (exists (select 1 from public."Hangar_Validations" v where v.id = validation_id and v.user_id = auth.uid()));

create trigger set_hangar_validations_updated_at
  before update on public."Hangar_Validations"
  for each row execute function public.set_hangar_updated_at();
