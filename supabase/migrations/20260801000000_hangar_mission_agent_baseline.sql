-- Mission Agent (Bay 01) core schema -- BASELINE.
--
-- These five tables were originally created by hand in the Supabase SQL editor
-- and had no migration file, so a fresh environment could not be rebuilt. This
-- file reconstructs them from the LIVE schema (dumped from the running project
-- on 2026-09-22), not from MissionAgent.md Section 10 -- the two differ (e.g.
-- Hangar_agent_runs.stage holds 'input_processing', not '2.1_input_processing').
--
-- Idempotent: every statement is `if not exists`, `or replace`, or
-- drop-then-create, so it is a NO-OP on the existing project and builds the
-- schema on a fresh one. It is numbered to sort BEFORE the other Hangar_*
-- migrations, which reference Hangar_missions.
--
-- Known weaknesses are reproduced here on purpose (the point of a baseline is
-- to match production), and are fixed separately in
-- 20260922000000_hangar_mission_agent_hardening.sql:
--   * owner_all_hangar_missions lets a user write their own mission rows
--   * get_next_mission_spec_version is callable by any API key holder
--
-- Not auto-applied to the live project -- run manually in the Supabase SQL
-- editor if you want it recorded there (it changes nothing), same as every
-- other Hangar_* migration in this repo.

-- ── Tables ───────────────────────────────────────────────────────────────

create table if not exists public."Hangar_missions" (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  mission_code text,
  status text not null default 'draft',
  source_types_used text[] default '{}'::text[],
  confidence_score numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint "Hangar_missions_pkey" primary key (id),
  constraint "Hangar_missions_mission_code_key" unique (mission_code),
  constraint "Hangar_missions_user_id_fkey" foreign key (user_id) references auth.users(id),
  constraint "Hangar_missions_status_check"
    check (status in ('draft','processing','spec_ready','finalized','error'))
);

create table if not exists public."Hangar_mission_specs" (
  id uuid not null default gen_random_uuid(),
  mission_id uuid not null,
  version integer not null default 1,
  mission_specs jsonb not null,
  constraints jsonb not null default '[]'::jsonb,
  kpis jsonb not null default '[]'::jsonb,
  summary text,
  confidence_score numeric,
  created_at timestamptz not null default now(),
  constraint "Hangar_mission_specs_pkey" primary key (id),
  constraint "Hangar_mission_specs_mission_id_fkey"
    foreign key (mission_id) references public."Hangar_missions"(id) on delete cascade,
  constraint hangar_mission_specs_mission_version_uniq unique (mission_id, version)
);

create table if not exists public."Hangar_agent_runs" (
  id uuid not null default gen_random_uuid(),
  mission_id uuid not null,
  agent_id text not null default 'MISSION_AGENT',
  stage text not null,
  input_snapshot jsonb,
  output_snapshot jsonb,
  status text not null,
  error_message text,
  duration_ms integer,
  created_at timestamptz not null default now(),
  constraint "Hangar_agent_runs_pkey" primary key (id),
  constraint "Hangar_agent_runs_mission_id_fkey"
    foreign key (mission_id) references public."Hangar_missions"(id) on delete cascade,
  constraint "Hangar_agent_runs_stage_check"
    check (stage in ('input_processing','reasoning_planning','output_generation','output_interface')),
  constraint "Hangar_agent_runs_status_check" check (status in ('success','error'))
);

-- Reference catalogs (read-only lookups for the regulations / market-data sources).
create table if not exists public."Hangar_regulations_catalog" (
  code text not null,
  name text not null,
  region text not null,
  description text,
  active boolean not null default true,
  constraint "Hangar_regulations_catalog_pkey" primary key (code)
);

create table if not exists public."Hangar_market_data_catalog" (
  id uuid not null default gen_random_uuid(),
  name text not null,
  description text,
  data_source text,
  active boolean not null default true,
  constraint "Hangar_market_data_catalog_pkey" primary key (id)
);

-- ── Functions and triggers ───────────────────────────────────────────────

-- mission_code = first 8 chars of the user id + YY HH24 MI SS + 2 random chars.
create or replace function public.generate_hangar_mission_code()
returns trigger
language plpgsql
set search_path to ''
as $function$
begin
  new.mission_code := upper(left(new.user_id::text, 8))
    || to_char(now(), 'YY') || to_char(now(), 'HH24') || to_char(now(), 'MI') || to_char(now(), 'SS')
    || upper(substr(md5(random()::text), 1, 2));
  return new;
end;
$function$;

create or replace function public.set_hangar_updated_at()
returns trigger
language plpgsql
set search_path to ''
as $function$
begin
  new.updated_at := now();
  return new;
end;
$function$;

-- Next spec version for a mission (1 when it has none). Called by the server
-- through the service role when it persists a spec.
create or replace function public.get_next_mission_spec_version(p_mission_id uuid)
returns integer
language sql
security definer
set search_path to ''
as $function$
  select coalesce(max(version), 0) + 1
  from public."Hangar_mission_specs"
  where mission_id = p_mission_id;
$function$;

drop trigger if exists trg_generate_hangar_mission_code on public."Hangar_missions";
create trigger trg_generate_hangar_mission_code
  before insert on public."Hangar_missions"
  for each row execute function public.generate_hangar_mission_code();

drop trigger if exists trg_set_hangar_updated_at on public."Hangar_missions";
create trigger trg_set_hangar_updated_at
  before update on public."Hangar_missions"
  for each row execute function public.set_hangar_updated_at();

-- ── Row level security ───────────────────────────────────────────────────

alter table public."Hangar_missions" enable row level security;
alter table public."Hangar_mission_specs" enable row level security;
alter table public."Hangar_agent_runs" enable row level security;
alter table public."Hangar_regulations_catalog" enable row level security;
alter table public."Hangar_market_data_catalog" enable row level security;

drop policy if exists owner_all_hangar_missions on public."Hangar_missions";
create policy owner_all_hangar_missions on public."Hangar_missions"
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists owner_select_hangar_mission_specs on public."Hangar_mission_specs";
create policy owner_select_hangar_mission_specs on public."Hangar_mission_specs"
  for select
  using (mission_id in (select id from public."Hangar_missions" where user_id = auth.uid()));

drop policy if exists owner_select_hangar_agent_runs on public."Hangar_agent_runs";
create policy owner_select_hangar_agent_runs on public."Hangar_agent_runs"
  for select
  using (mission_id in (select id from public."Hangar_missions" where user_id = auth.uid()));

drop policy if exists public_select_hangar_regulations_catalog on public."Hangar_regulations_catalog";
create policy public_select_hangar_regulations_catalog on public."Hangar_regulations_catalog"
  for select
  using (true);

drop policy if exists public_select_hangar_market_data_catalog on public."Hangar_market_data_catalog";
create policy public_select_hangar_market_data_catalog on public."Hangar_market_data_catalog"
  for select
  using (true);

-- ── Reference data ───────────────────────────────────────────────────────
-- The regulations catalog as it stands in the live project (the Regulations
-- source and Stage 2's regulation-derived constraints depend on it). The
-- market-data catalog is empty there and is left empty here.

insert into public."Hangar_regulations_catalog" (code, name, region, description, active) values
  ('FAR_107',     'FAR Part 107',       'United States',            null, true),
  ('EASA_SORA',   'EASA SORA',          'European Union',           null, true),
  ('DGCA_CAR_S3', 'DGCA CAR Section 3', 'India',                    null, true),
  ('MIL_STD_810', 'MIL-STD-810',        'United States (Military)', null, true)
on conflict (code) do nothing;
