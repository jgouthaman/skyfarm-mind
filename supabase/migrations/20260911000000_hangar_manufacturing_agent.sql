-- Manufacturing Agent (Bay 11) schema. Mirrors Hangar_Materials /
-- Hangar_Materials_specs / Hangar_Materials_runs shape and RLS pattern
-- field-for-field (20260910000000_hangar_materials_agent.sql), swapping
-- in this bay's own schema from ManufacturingAgent.md Sections 11-11.4
-- and 15. Same versioned parent/specs/runs split as every prior bay --
-- re-running manufacturing reasoning after the referenced validation
-- result changes should produce a new version.
--
-- Bay 11 fans in from Bay 09 only (single source), same as Bay 10 -- so
-- there is a single source_validation_id foreign key here, matching Bay
-- 10's own shape. Bay 11 is a SIBLING of Bay 10, not downstream of it --
-- both reference Hangar_Validations directly, not each other.
--
-- Not auto-applied to the live project -- run manually in the Supabase SQL
-- editor, same as every other Hangar_* migration in this repo.

create table public."Hangar_Manufacturings" (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  source_validation_id uuid not null references public."Hangar_Validations"(id),
  manufacturing_code text not null default upper(substr(replace(gen_random_uuid()::text,'-',''), 1, 20)),
  status text not null default 'draft' check (status in ('draft','processing','spec_ready','finalized','error')),
  confidence_score numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public."Hangar_Manufacturing_specs" (
  id uuid primary key default gen_random_uuid(),
  manufacturing_id uuid not null references public."Hangar_Manufacturings"(id),
  version int not null,
  dfm_report jsonb not null,
  build_plan jsonb not null,
  bill_of_materials jsonb not null default '[]'::jsonb,
  confidence_score numeric not null,
  reasoning_summary text,
  source_was_mock boolean not null default false,
  created_at timestamptz not null default now(),
  unique (manufacturing_id, version)
);

create table public."Hangar_Manufacturing_runs" (
  id uuid primary key default gen_random_uuid(),
  manufacturing_id uuid not null references public."Hangar_Manufacturings"(id),
  agent_id text not null default 'MANUFACTURING_AGENT',
  stage text not null check (stage in ('manufacturability_review','build_planning','output_generation','output_interface')),
  input_snapshot jsonb,
  output_snapshot jsonb,
  status text not null check (status in ('success','error')),
  error_message text,
  duration_ms int,
  created_at timestamptz not null default now()
);

create or replace function public.get_next_manufacturing_spec_version(p_manufacturing_id uuid)
returns int language sql stable
set search_path = ''
as $$
  select coalesce(max(version),0)+1 from public."Hangar_Manufacturing_specs" where manufacturing_id = p_manufacturing_id;
$$;

alter table public."Hangar_Manufacturings" enable row level security;
alter table public."Hangar_Manufacturing_specs" enable row level security;
alter table public."Hangar_Manufacturing_runs" enable row level security;

create policy "Users read/write their own manufacturings" on public."Hangar_Manufacturings"
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users read/write specs for their own manufacturings" on public."Hangar_Manufacturing_specs"
  for all using (exists (select 1 from public."Hangar_Manufacturings" mf where mf.id = manufacturing_id and mf.user_id = auth.uid()));

create policy "Users read/write runs for their own manufacturings" on public."Hangar_Manufacturing_runs"
  for all using (exists (select 1 from public."Hangar_Manufacturings" mf where mf.id = manufacturing_id and mf.user_id = auth.uid()));

create trigger set_hangar_manufacturings_updated_at
  before update on public."Hangar_Manufacturings"
  for each row execute function public.set_hangar_updated_at();
