-- Optimization Agent (Bay 08) schema. Mirrors Hangar_Structurals /
-- Hangar_Structural_specs / Hangar_Structural_runs shape and RLS pattern
-- field-for-field (20260903130000_hangar_structural_agent.sql), swapping in
-- this bay's own schema from OptimizationAgent.md Section 8. Deliberately
-- NOT following Bay 06's simplified combined-row shape
-- (20260903120000_hangar_cfd_agent.sql) -- OptimizationAgent.md Section 5
-- resolves in favor of the classic versioned parent/specs/runs split, since
-- re-running optimization reasoning after either upstream result changes
-- should produce a new version. Not auto-applied to the live project --
-- run manually in the Supabase SQL editor, same as every other Hangar_*
-- migration in this repo.

create table public."Hangar_Optimizations" (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  source_cfd_analysis_id uuid not null references public."Hangar_CFDAnalyses"(id),
  source_structural_id uuid not null references public."Hangar_Structurals"(id),
  optimization_code text not null default upper(substr(replace(gen_random_uuid()::text,'-',''), 1, 20)),
  status text not null default 'draft' check (status in ('draft','processing','spec_ready','finalized','error')),
  confidence_score numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public."Hangar_Optimization_specs" (
  id uuid primary key default gen_random_uuid(),
  optimization_id uuid not null references public."Hangar_Optimizations"(id),
  version int not null,
  objective_scores jsonb not null,
  trade_off_analysis text not null,
  recommended_adjustments jsonb not null default '[]'::jsonb,
  overall_optimization_score numeric,
  risk_flags jsonb not null default '[]'::jsonb,
  confidence_score numeric not null,
  reasoning_summary text,
  source_was_mock boolean not null default false,
  created_at timestamptz not null default now(),
  unique (optimization_id, version)
);

create table public."Hangar_Optimization_runs" (
  id uuid primary key default gen_random_uuid(),
  optimization_id uuid not null references public."Hangar_Optimizations"(id),
  agent_id text not null default 'OPTIMIZATION_AGENT',
  stage text not null check (stage in ('objective_formulation','optimization_execution','output_generation','output_interface')),
  input_snapshot jsonb,
  output_snapshot jsonb,
  status text not null check (status in ('success','error')),
  error_message text,
  duration_ms int,
  created_at timestamptz not null default now()
);

create or replace function public.get_next_optimization_spec_version(p_optimization_id uuid)
returns int language sql stable
set search_path = ''
as $$
  select coalesce(max(version),0)+1 from public."Hangar_Optimization_specs" where optimization_id = p_optimization_id;
$$;

alter table public."Hangar_Optimizations" enable row level security;
alter table public."Hangar_Optimization_specs" enable row level security;
alter table public."Hangar_Optimization_runs" enable row level security;

create policy "Users read/write their own optimizations" on public."Hangar_Optimizations"
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users read/write specs for their own optimizations" on public."Hangar_Optimization_specs"
  for all using (exists (select 1 from public."Hangar_Optimizations" o where o.id = optimization_id and o.user_id = auth.uid()));

create policy "Users read/write runs for their own optimizations" on public."Hangar_Optimization_runs"
  for all using (exists (select 1 from public."Hangar_Optimizations" o where o.id = optimization_id and o.user_id = auth.uid()));

create trigger set_hangar_optimizations_updated_at
  before update on public."Hangar_Optimizations"
  for each row execute function public.set_hangar_updated_at();
