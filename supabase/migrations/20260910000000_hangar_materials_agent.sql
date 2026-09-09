-- Materials Agent (Bay 10) schema. Mirrors Hangar_Validations /
-- Hangar_Validation_specs / Hangar_Validation_runs shape and RLS pattern
-- field-for-field (20260909000000_hangar_validation_agent.sql), swapping
-- in this bay's own schema from MaterialsAgent.md Sections 10-10.4 and 14.
-- Same versioned parent/specs/runs split as every prior bay -- re-running
-- materials reasoning after the referenced validation result changes
-- should produce a new version.
--
-- Bay 10 fans in from Bay 09 only (single source), same as Bay 09 fans in
-- from Bay 08 only -- so there is a single source_validation_id foreign
-- key here, matching Bay 09's own source_optimization_id shape.
--
-- Not auto-applied to the live project -- run manually in the Supabase SQL
-- editor, same as every other Hangar_* migration in this repo.

create table public."Hangar_Materials" (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  source_validation_id uuid not null references public."Hangar_Validations"(id),
  materials_code text not null default upper(substr(replace(gen_random_uuid()::text,'-',''), 1, 20)),
  status text not null default 'draft' check (status in ('draft','processing','spec_ready','finalized','error')),
  confidence_score numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public."Hangar_Materials_specs" (
  id uuid primary key default gen_random_uuid(),
  materials_id uuid not null references public."Hangar_Materials"(id),
  version int not null,
  recommendations jsonb not null,
  rationale text not null,
  sourcing_risk_flags jsonb not null default '[]'::jsonb,
  confidence_score numeric not null,
  reasoning_summary text,
  source_was_mock boolean not null default false,
  created_at timestamptz not null default now(),
  unique (materials_id, version)
);

create table public."Hangar_Materials_runs" (
  id uuid primary key default gen_random_uuid(),
  materials_id uuid not null references public."Hangar_Materials"(id),
  agent_id text not null default 'MATERIALS_AGENT',
  stage text not null check (stage in ('requirement_mapping','material_selection','output_generation','output_interface')),
  input_snapshot jsonb,
  output_snapshot jsonb,
  status text not null check (status in ('success','error')),
  error_message text,
  duration_ms int,
  created_at timestamptz not null default now()
);

create or replace function public.get_next_materials_spec_version(p_materials_id uuid)
returns int language sql stable
set search_path = ''
as $$
  select coalesce(max(version),0)+1 from public."Hangar_Materials_specs" where materials_id = p_materials_id;
$$;

alter table public."Hangar_Materials" enable row level security;
alter table public."Hangar_Materials_specs" enable row level security;
alter table public."Hangar_Materials_runs" enable row level security;

create policy "Users read/write their own materials" on public."Hangar_Materials"
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users read/write specs for their own materials" on public."Hangar_Materials_specs"
  for all using (exists (select 1 from public."Hangar_Materials" m where m.id = materials_id and m.user_id = auth.uid()));

create policy "Users read/write runs for their own materials" on public."Hangar_Materials_runs"
  for all using (exists (select 1 from public."Hangar_Materials" m where m.id = materials_id and m.user_id = auth.uid()));

create trigger set_hangar_materials_updated_at
  before update on public."Hangar_Materials"
  for each row execute function public.set_hangar_updated_at();
