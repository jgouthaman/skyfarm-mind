-- Aircraft Design Agent (Bay 03) schema. Mirrors Hangar_concepts /
-- Hangar_concept_specs / Hangar_concept_runs shape and RLS pattern
-- (reference/the-hangar/AircraftDesignAgent.md, Section 6). Not
-- auto-applied to the live project (this repo's other Hangar_* tables
-- were confirmed to exist live with no corresponding tracked migration
-- -- run this manually in the Supabase SQL editor).
--
-- This schema is already live in Supabase (applied manually via the SQL
-- editor, same as Hangar_concept_agent's migration) -- confirmed directly
-- against the live project (table/column probes, and both RPCs called
-- live). This file is the tracked record matching reality, not a proposal
-- to be run -- same pattern as 20260828003904_hangar_concept_agent.sql.
--
-- Unlike Bay 02's get_latest_concept_spec, get_latest_aircraft_design_spec
-- returns setof rather than a single row -- confirmed live (an unmatched
-- id returns an empty set, not a row of nulls). AircraftDesignAgent.md
-- Section 6.2's own build note warned against adding a third speculative,
-- unused get_latest_X RPC -- this one was created deliberately, with the
-- setof signature, once real read logic needed it.

create table public."Hangar_aircraft_designs" (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  source_concept_id uuid not null references public."Hangar_concepts"(id),
  design_code text not null default upper(substr(replace(gen_random_uuid()::text,'-',''), 1, 20)),
  status text not null default 'draft' check (status in ('draft','processing','spec_ready','finalized','error')),
  confidence_score numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public."Hangar_aircraft_design_specs" (
  id uuid primary key default gen_random_uuid(),
  aircraft_design_id uuid not null references public."Hangar_aircraft_designs"(id),
  version int not null,
  geometry_parameters jsonb not null,     -- Stage 1 output
  component_selections jsonb not null,    -- Stage 2 output
  design_rationale text not null,         -- Stage 3 output
  confidence_score numeric not null,
  source_was_mock boolean not null default false,
  created_at timestamptz not null default now(),
  unique (aircraft_design_id, version)
);

create table public."Hangar_aircraft_design_runs" (
  id uuid primary key default gen_random_uuid(),
  aircraft_design_id uuid not null references public."Hangar_aircraft_designs"(id),
  agent_id text not null default 'AIRCRAFT_DESIGN_AGENT',
  stage text not null check (stage in ('geometry_generation','component_selection','output_generation','output_interface')),
  input_snapshot jsonb,
  output_snapshot jsonb,
  status text not null check (status in ('success','error')),
  error_message text,
  duration_ms int,
  created_at timestamptz not null default now()
);

create or replace function public.get_next_aircraft_design_spec_version(p_aircraft_design_id uuid)
returns int language sql stable
set search_path = ''
as $$
  select coalesce(max(version),0)+1 from public."Hangar_aircraft_design_specs" where aircraft_design_id = p_aircraft_design_id;
$$;

create or replace function public.get_latest_aircraft_design_spec(p_aircraft_design_id uuid)
returns setof public."Hangar_aircraft_design_specs"
language sql stable
set search_path = ''
as $$
  select * from public."Hangar_aircraft_design_specs"
  where aircraft_design_id = p_aircraft_design_id
  order by version desc
  limit 1;
$$;

alter table public."Hangar_aircraft_designs" enable row level security;
alter table public."Hangar_aircraft_design_specs" enable row level security;
alter table public."Hangar_aircraft_design_runs" enable row level security;

create policy "Users read/write their own aircraft designs" on public."Hangar_aircraft_designs"
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users read/write specs for their own aircraft designs" on public."Hangar_aircraft_design_specs"
  for all using (exists (select 1 from public."Hangar_aircraft_designs" d where d.id = aircraft_design_id and d.user_id = auth.uid()));

create policy "Users read/write runs for their own aircraft designs" on public."Hangar_aircraft_design_runs"
  for all using (exists (select 1 from public."Hangar_aircraft_designs" d where d.id = aircraft_design_id and d.user_id = auth.uid()));

create trigger set_hangar_aircraft_designs_updated_at
  before update on public."Hangar_aircraft_designs"
  for each row execute function public.set_hangar_updated_at();
