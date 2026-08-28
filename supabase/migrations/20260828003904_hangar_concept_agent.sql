-- Concept Agent (Bay 02) schema. Mirrors Hangar_missions / Hangar_mission_specs /
-- Hangar_agent_runs shape and RLS pattern. Not auto-applied to the live project
-- (this repo's other Hangar_* tables were confirmed to exist live with no
-- corresponding tracked migration, and a tracked-but-unrelated RPC from an
-- earlier migration was confirmed absent live) -- run this manually in the
-- Supabase SQL editor.

create table public."Hangar_concepts" (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  source_mission_id uuid not null references public."Hangar_missions"(id),
  concept_code text not null default upper(substr(replace(gen_random_uuid()::text,'-',''), 1, 20)),
  status text not null default 'draft' check (status in ('draft','processing','spec_ready','finalized','error')),
  confidence_score numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public."Hangar_concept_specs" (
  id uuid primary key default gen_random_uuid(),
  concept_id uuid not null references public."Hangar_concepts"(id),
  version int not null,
  candidate_concepts jsonb not null,   -- Stage 1 output
  trade_off_notes jsonb not null,      -- Stage 2 output
  ranked_concepts jsonb not null,      -- Stage 3 output (final ranked list)
  confidence_score numeric not null,
  created_at timestamptz not null default now(),
  unique (concept_id, version)
);

create table public."Hangar_concept_runs" (
  id uuid primary key default gen_random_uuid(),
  concept_id uuid not null references public."Hangar_concepts"(id),
  agent_id text not null default 'CONCEPT_AGENT',
  stage text not null check (stage in ('concept_ideation','trade_off_reasoning','ranking_scoring','output_interface')),
  input_snapshot jsonb,
  output_snapshot jsonb,
  status text not null check (status in ('success','error')),
  error_message text,
  duration_ms int,
  created_at timestamptz not null default now()
);

create or replace function public.get_next_concept_spec_version(p_concept_id uuid)
returns int language sql stable
set search_path = ''
as $$
  select coalesce(max(version),0)+1 from public."Hangar_concept_specs" where concept_id = p_concept_id;
$$;

create or replace function public.get_latest_concept_spec(p_concept_id uuid)
returns public."Hangar_concept_specs"
language sql stable
set search_path = ''
as $$
  select * from public."Hangar_concept_specs"
  where concept_id = p_concept_id
  order by version desc
  limit 1;
$$;

alter table public."Hangar_concepts" enable row level security;
alter table public."Hangar_concept_specs" enable row level security;
alter table public."Hangar_concept_runs" enable row level security;

create policy "Users read/write their own concepts" on public."Hangar_concepts"
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users read/write specs for their own concepts" on public."Hangar_concept_specs"
  for all using (exists (select 1 from public."Hangar_concepts" c where c.id = concept_id and c.user_id = auth.uid()));

create policy "Users read/write runs for their own concepts" on public."Hangar_concept_runs"
  for all using (exists (select 1 from public."Hangar_concepts" c where c.id = concept_id and c.user_id = auth.uid()));

create trigger set_hangar_concepts_updated_at
  before update on public."Hangar_concepts"
  for each row execute function public.set_hangar_updated_at();