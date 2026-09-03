-- Structural Agent (Bay 07) schema. Mirrors Hangar_Simulations /
-- Hangar_Simulation_specs / Hangar_Simulation_runs shape and RLS pattern
-- field-for-field (20260901121500_hangar_simulation_orchestrator_agent.sql),
-- swapping in this bay's own schema from StructuralAgent.md Section 7. Not
-- auto-applied to the live project -- run manually in the Supabase SQL
-- editor, same as every other Hangar_* migration in this repo.

create table public."Hangar_Structurals" (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  source_cad_design_id uuid not null references public."Hangar_CADDesigns"(id),
  structural_code text not null default upper(substr(replace(gen_random_uuid()::text,'-',''), 1, 20)),
  status text not null default 'draft' check (status in ('draft','processing','spec_ready','finalized','error')),
  confidence_score numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public."Hangar_Structural_specs" (
  id uuid primary key default gen_random_uuid(),
  structural_id uuid not null references public."Hangar_Structurals"(id),
  version int not null,
  mesh_material jsonb not null,
  load_cases jsonb not null default '[]'::jsonb,
  stress_results jsonb not null,
  safety_factor numeric,
  convergence_status text,
  risk_flags jsonb not null default '[]'::jsonb,
  confidence_score numeric not null,
  reasoning_summary text,
  source_was_mock boolean not null default false,
  created_at timestamptz not null default now(),
  unique (structural_id, version)
);

create table public."Hangar_Structural_runs" (
  id uuid primary key default gen_random_uuid(),
  structural_id uuid not null references public."Hangar_Structurals"(id),
  agent_id text not null default 'STRUCTURAL_AGENT',
  stage text not null check (stage in ('mesh_material_setup','solver_setup_execution','output_generation','output_interface')),
  input_snapshot jsonb,
  output_snapshot jsonb,
  status text not null check (status in ('success','error')),
  error_message text,
  duration_ms int,
  created_at timestamptz not null default now()
);

create or replace function public.get_next_structural_spec_version(p_structural_id uuid)
returns int language sql stable
set search_path = ''
as $$
  select coalesce(max(version),0)+1 from public."Hangar_Structural_specs" where structural_id = p_structural_id;
$$;

alter table public."Hangar_Structurals" enable row level security;
alter table public."Hangar_Structural_specs" enable row level security;
alter table public."Hangar_Structural_runs" enable row level security;

create policy "Users read/write their own structurals" on public."Hangar_Structurals"
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users read/write specs for their own structurals" on public."Hangar_Structural_specs"
  for all using (exists (select 1 from public."Hangar_Structurals" s where s.id = structural_id and s.user_id = auth.uid()));

create policy "Users read/write runs for their own structurals" on public."Hangar_Structural_runs"
  for all using (exists (select 1 from public."Hangar_Structurals" s where s.id = structural_id and s.user_id = auth.uid()));

create trigger set_hangar_structurals_updated_at
  before update on public."Hangar_Structurals"
  for each row execute function public.set_hangar_updated_at();
