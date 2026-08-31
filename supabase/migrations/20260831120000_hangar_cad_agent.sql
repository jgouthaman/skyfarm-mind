-- CAD Agent (Bay 04) schema. Mirrors Hangar_aircraft_designs /
-- Hangar_aircraft_design_specs / Hangar_aircraft_design_runs shape and RLS
-- pattern (reference/the-hangar/CADAgent.md). Not auto-applied to the live
-- project -- run this manually in the Supabase SQL editor, same as every
-- other Hangar_* migration in this repo.
--
-- Table names follow CADAgent.md Section 5's literal naming
-- (Hangar_CADDesigns), not the snake_case Bay 02/03 convention -- kept as
-- specified rather than silently renamed.
--
-- No get_latest_cad_design_spec RPC this pass -- nothing downstream needs
-- it yet (Bay 05 doesn't exist). AircraftDesignAgent.md's own build note
-- warned against adding a speculative, unused get_latest_X RPC; the same
-- restraint applies here. get_next_cad_design_spec_version is the only RPC,
-- since every persist needs it.

create table public."Hangar_CADDesigns" (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  source_aircraft_design_id uuid not null references public."Hangar_aircraft_designs"(id),
  cad_code text not null default upper(substr(replace(gen_random_uuid()::text,'-',''), 1, 20)),
  status text not null default 'draft' check (status in ('draft','processing','spec_ready','finalized','error')),
  confidence_score numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public."Hangar_CADDesign_specs" (
  id uuid primary key default gen_random_uuid(),
  cad_design_id uuid not null references public."Hangar_CADDesigns"(id),
  version int not null,
  model_files jsonb not null,          -- structured STEP/IGES metadata, not real files
  bom jsonb not null,                  -- [{ part, qty, material }]
  mass_properties jsonb not null,      -- { weight_kg, cg: { x, y, z } }
  interference_clear boolean not null,
  dfm_flags jsonb not null default '[]'::jsonb,
  design_rationale text not null,
  confidence_score numeric not null,
  source_was_mock boolean not null default false,
  created_at timestamptz not null default now(),
  unique (cad_design_id, version)
);

create table public."Hangar_CADDesign_runs" (
  id uuid primary key default gen_random_uuid(),
  cad_design_id uuid not null references public."Hangar_CADDesigns"(id),
  agent_id text not null default 'CAD_AGENT',
  stage text not null check (stage in ('model_generation','design_validation','output_generation','output_interface')),
  input_snapshot jsonb,
  output_snapshot jsonb,
  status text not null check (status in ('success','error')),
  error_message text,
  duration_ms int,
  created_at timestamptz not null default now()
);

create or replace function public.get_next_cad_design_spec_version(p_cad_design_id uuid)
returns int language sql stable
set search_path = ''
as $$
  select coalesce(max(version),0)+1 from public."Hangar_CADDesign_specs" where cad_design_id = p_cad_design_id;
$$;

alter table public."Hangar_CADDesigns" enable row level security;
alter table public."Hangar_CADDesign_specs" enable row level security;
alter table public."Hangar_CADDesign_runs" enable row level security;

create policy "Users read/write their own CAD designs" on public."Hangar_CADDesigns"
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users read/write specs for their own CAD designs" on public."Hangar_CADDesign_specs"
  for all using (exists (select 1 from public."Hangar_CADDesigns" d where d.id = cad_design_id and d.user_id = auth.uid()));

create policy "Users read/write runs for their own CAD designs" on public."Hangar_CADDesign_runs"
  for all using (exists (select 1 from public."Hangar_CADDesigns" d where d.id = cad_design_id and d.user_id = auth.uid()));

create trigger set_hangar_cad_designs_updated_at
  before update on public."Hangar_CADDesigns"
  for each row execute function public.set_hangar_updated_at();
