-- Simulation Orchestrator Agent (Bay 05) schema. Mirrors Hangar_CADDesigns /
-- Hangar_CADDesign_specs / Hangar_CADDesign_runs shape and RLS pattern
-- (reference/the-hangar/SimulationOrchestratorAgent.md). Not auto-applied
-- to the live project -- run manually in the Supabase SQL editor, same as
-- every other Hangar_* migration in this repo.
--
-- Replaces an earlier flat Hangar_SimulationRuns table that didn't match
-- the established parent/specs/runs convention -- dropped before this ran.

create table public."Hangar_Simulations" (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  source_cad_design_id uuid not null references public."Hangar_CADDesigns"(id),
  simulation_code text not null default upper(substr(replace(gen_random_uuid()::text,'-',''), 1, 20)),
  status text not null default 'draft' check (status in ('draft','processing','spec_ready','finalized','error')),
  confidence_score numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public."Hangar_Simulation_specs" (
  id uuid primary key default gen_random_uuid(),
  simulation_id uuid not null references public."Hangar_Simulations"(id),
  version int not null,
  flight_envelope jsonb not null,
  stability jsonb not null,
  performance_score numeric,
  risk_flags jsonb not null default '[]'::jsonb,
  confidence_score numeric not null,
  reasoning_summary text,
  source_was_mock boolean not null default false,
  created_at timestamptz not null default now(),
  unique (simulation_id, version)
);

create table public."Hangar_Simulation_runs" (
  id uuid primary key default gen_random_uuid(),
  simulation_id uuid not null references public."Hangar_Simulations"(id),
  agent_id text not null default 'SIMULATION_ORCHESTRATOR_AGENT',
  stage text not null check (stage in ('flight_dynamics_assessment','stability_analysis','output_generation','output_interface')),
  input_snapshot jsonb,
  output_snapshot jsonb,
  status text not null check (status in ('success','error')),
  error_message text,
  duration_ms int,
  created_at timestamptz not null default now()
);

create or replace function public.get_next_simulation_spec_version(p_simulation_id uuid)
returns int language sql stable
set search_path = ''
as $$
  select coalesce(max(version),0)+1 from public."Hangar_Simulation_specs" where simulation_id = p_simulation_id;
$$;

alter table public."Hangar_Simulations" enable row level security;
alter table public."Hangar_Simulation_specs" enable row level security;
alter table public."Hangar_Simulation_runs" enable row level security;

create policy "Users read/write their own simulations" on public."Hangar_Simulations"
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users read/write specs for their own simulations" on public."Hangar_Simulation_specs"
  for all using (exists (select 1 from public."Hangar_Simulations" s where s.id = simulation_id and s.user_id = auth.uid()));

create policy "Users read/write runs for their own simulations" on public."Hangar_Simulation_runs"
  for all using (exists (select 1 from public."Hangar_Simulations" s where s.id = simulation_id and s.user_id = auth.uid()));

create trigger set_hangar_simulations_updated_at
  before update on public."Hangar_Simulations"
  for each row execute function public.set_hangar_updated_at();
