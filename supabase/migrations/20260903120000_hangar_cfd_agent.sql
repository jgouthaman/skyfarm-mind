-- CFD Agent (Bay 06) schema. Mirrors the *naming convention* established by
-- Bay 04's migration (Hangar_<Entity>s / Hangar_<Entity>_specs /
-- Hangar_<Entity>_runs, RLS pattern), per CFDAgent.md Section 5 — but the
-- *semantic role* of the tables is deliberately different from every prior
-- bay, per the spec's own explicit resolution (Section 5/10):
--   - Hangar_CFDAnalyses holds the structured OUTPUT directly (forces,
--     coefficients, flow_fields, design_rationale) plus the parent
--     status row combined — unlike Hangar_CADDesigns (a lightweight
--     parent/status row only) whose output lives in a separate,
--     versioned Hangar_CADDesign_specs table.
--   - Hangar_CFDAnalysis_inputs holds INPUT config (solver settings,
--     boundary conditions). Named "_inputs," not "_specs" like every other
--     bay's own _specs table, specifically because every other bay's
--     "_specs" table holds versioned OUTPUT — reusing that suffix here for
--     an INPUT table would silently invert the convention every other bay
--     relies on. Renamed from Hangar_CFDAnalysis_specs before this
--     migration was ever applied (see CFDAgent.md Section 12).
-- Direct consequence: no get_next_..._version RPC exists in this migration
-- — neither table is described as versioned in CFDAgent.md, so there's
-- nothing for a version-generating RPC to serve (unlike every other bay's
-- migration, which adds one because its own _specs table is versioned).
-- Not auto-applied to the live project -- run this manually in the
-- Supabase SQL editor, same as every other Hangar_* migration in this repo.

create table public."Hangar_CFDAnalyses" (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  source_cad_design_id uuid not null references public."Hangar_CADDesigns"(id),
  cfd_code text not null default upper(substr(replace(gen_random_uuid()::text,'-',''), 1, 20)),
  status text not null default 'draft' check (status in ('draft','processing','spec_ready','finalized','error')),
  -- Nullable: this row is created in 'draft' status before any output
  -- exists (same create-then-update lifecycle every other bay's parent
  -- row follows), then these columns are filled in by the same update
  -- that flips status to 'spec_ready'. CFDAgent.md Section 7's proposed
  -- output schema.
  forces jsonb,
  coefficients jsonb,
  flow_fields jsonb,
  design_rationale text,
  confidence_score numeric,
  source_was_mock boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public."Hangar_CFDAnalysis_inputs" (
  id uuid primary key default gen_random_uuid(),
  cfd_analysis_id uuid not null references public."Hangar_CFDAnalyses"(id),
  -- Input config (CFDAgent.md Section 2) -- solver type/turbulence model
  -- and boundary conditions (inlet/outlet, walls, symmetry). "User input /
  -- defaults" per the spec; left nullable at the schema level since
  -- default-filling is an application-layer concern, not enforced here.
  solver_type text,
  turbulence_model text,
  boundary_conditions jsonb,
  created_at timestamptz not null default now()
);

create table public."Hangar_CFDAnalysis_runs" (
  id uuid primary key default gen_random_uuid(),
  cfd_analysis_id uuid not null references public."Hangar_CFDAnalyses"(id),
  agent_id text not null default 'CFD_AGENT',
  stage text not null check (stage in ('mesh_generation','solver_setup_execution','output_generation','output_interface')),
  input_snapshot jsonb,
  output_snapshot jsonb,
  status text not null check (status in ('success','error')),
  error_message text,
  duration_ms int,
  created_at timestamptz not null default now()
);

alter table public."Hangar_CFDAnalyses" enable row level security;
alter table public."Hangar_CFDAnalysis_inputs" enable row level security;
alter table public."Hangar_CFDAnalysis_runs" enable row level security;

create policy "Users read/write their own CFD analyses" on public."Hangar_CFDAnalyses"
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users read/write inputs for their own CFD analyses" on public."Hangar_CFDAnalysis_inputs"
  for all using (exists (select 1 from public."Hangar_CFDAnalyses" a where a.id = cfd_analysis_id and a.user_id = auth.uid()));

create policy "Users read/write runs for their own CFD analyses" on public."Hangar_CFDAnalysis_runs"
  for all using (exists (select 1 from public."Hangar_CFDAnalyses" a where a.id = cfd_analysis_id and a.user_id = auth.uid()));

create trigger set_hangar_cfd_analyses_updated_at
  before update on public."Hangar_CFDAnalyses"
  for each row execute function public.set_hangar_updated_at();
