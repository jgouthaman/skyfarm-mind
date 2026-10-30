-- Raman Agent (Bay 16) -- UAV noise assessment beta, Mission Hub admins only.
-- Tables per RamanAgent.md Part B. Not auto-applied to the live project --
-- run manually in the Supabase SQL editor, same as every other migration here.
--
-- All app reads/writes go through supabaseAdmin (service role bypasses RLS).
-- RLS still allows Mission Hub admins select/insert/update from the browser,
-- which the live agent-run view needs for Realtime on raman_agent_steps.
-- No delete policies: nothing in the beta deletes rows from the browser.
--
-- Decisions beyond the Part B column list (also noted in RamanAgent.md):
--   raman_agent_runs.stop_requested  -- the stop flag fix-runs/:id/stop sets
--   raman_agent_runs.ranked_options  -- the agent's 3-5 ranked options
--   raman_agent_runs.error_message   -- why a run is 'failed' (never silent)
--   raman_reports.certificate_code   -- filled by trigger from a sequence:
--                                       RNC-<issue year>-<NNNN>, NNNN global

-- ── Admin check ──────────────────────────────────────────────────────────
-- Same gate as Mission Hub: an active admin/super_admin row in
-- mission_hub_users. App code matches on id, older RLS on auth_user_id;
-- accept either. Plain invoker function (no SECURITY DEFINER): the caller
-- can already read their own mission_hub_users row (mhu_select_self_or_admin).
create or replace function public.raman_is_admin()
returns boolean language sql stable
set search_path = ''
as $$
  select exists (
    select 1 from public.mission_hub_users
    where (id = auth.uid() or auth_user_id = auth.uid())
      and role in ('admin', 'super_admin')
      and status = 'active'
  );
$$;

-- ── Tables ───────────────────────────────────────────────────────────────

create table public.raman_customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text,
  email text,
  phone text,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.raman_vehicles (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.raman_customers(id) on delete cascade,
  name text not null,
  vehicle_type text not null default 'multirotor' check (vehicle_type in ('multirotor','vtol','fixed_wing')),
  layout text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.raman_engagements (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.raman_vehicles(id) on delete cascade,
  cycle int not null check (cycle >= 1),
  status text not null default 'open' check (status in ('open','closed')),
  furthest_tab int not null default 1 check (furthest_tab between 1 and 5),
  payment1_status text not null default 'pending' check (payment1_status in ('pending','paid','waived')),
  payment2_status text not null default 'pending' check (payment2_status in ('pending','paid','waived')),
  before_dba numeric,
  after_dba numeric,
  target_dba numeric,
  target_distance_m numeric,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (vehicle_id, cycle)
);

create table public.raman_noise_checks (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references public.raman_engagements(id) on delete cascade,
  kind text not null check (kind in ('baseline','fix_prediction')),
  inputs jsonb not null,
  provenance jsonb,
  result jsonb not null,
  verdict text check (verdict in ('PASS','WARN','FAIL','INFO')),
  headline text,
  hover_dba numeric,
  confidence_score numeric,
  engine_version text,
  summary_text text,
  summary_source_was_mock boolean,
  issued_at timestamptz not null default now(),
  frozen boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.raman_agent_runs (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references public.raman_engagements(id) on delete cascade,
  goal jsonb not null,
  status text not null default 'running' check (status in ('running','completed','stopped','failed')),
  stop_requested boolean not null default false,
  stop_reason text,
  error_message text,
  model text,
  source_was_mock boolean not null default false,
  ranked_options jsonb,
  recommended_design jsonb,
  locked_design jsonb,
  locked_result jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.raman_agent_steps (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.raman_agent_runs(id) on delete cascade,
  iteration int not null check (iteration >= 1),
  reasoning text,
  action jsonb,
  result jsonb,
  predicted_dba numeric,
  delta_db numeric,
  tradeoffs jsonb,
  feasible boolean,
  created_at timestamptz not null default now(),
  unique (run_id, iteration)
);

create table public.raman_propellers (
  id uuid primary key default gen_random_uuid(),
  brand text not null,
  model text not null,
  diameter_in numeric,
  pitch_in numeric,
  blade_count int,
  chord_075_over_r numeric,
  geometry jsonb,
  performance jsonb,
  source_url text,
  status text not null default 'unverified' check (status in ('unverified','verified','rejected')),
  verified_by uuid references auth.users(id) on delete set null,
  verified_at timestamptz,
  loaded_via text not null default 'manual' check (loaded_via in ('manual','llm')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.raman_reports (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references public.raman_engagements(id) on delete cascade,
  type text not null check (type in ('check','final','certificate')),
  certificate_code text unique check (certificate_code ~ '^RNC-[0-9]{4}-[0-9]{4,}$'),
  storage_path text,
  issued_at timestamptz not null default now(),
  issued_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.raman_payments (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references public.raman_engagements(id) on delete cascade,
  stage int not null check (stage in (1, 2)),
  amount_inr numeric,
  status text not null default 'pending' check (status in ('pending','paid','waived')),
  reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (engagement_id, stage)
);

-- ── FK indexes ───────────────────────────────────────────────────────────
-- raman_engagements.vehicle_id, raman_agent_steps.run_id and
-- raman_payments.engagement_id are already the leading column of their
-- unique constraints, so those indexes cover them.
create index raman_customers_created_by_idx on public.raman_customers (created_by);
create index raman_vehicles_customer_id_idx on public.raman_vehicles (customer_id);
create index raman_noise_checks_engagement_id_idx on public.raman_noise_checks (engagement_id);
create index raman_agent_runs_engagement_id_idx on public.raman_agent_runs (engagement_id);
create index raman_propellers_verified_by_idx on public.raman_propellers (verified_by);
create index raman_reports_engagement_id_idx on public.raman_reports (engagement_id);
create index raman_reports_issued_by_idx on public.raman_reports (issued_by);

-- ── Certificate codes ────────────────────────────────────────────────────
create sequence public.raman_certificate_seq;

create or replace function public.raman_set_certificate_code()
returns trigger language plpgsql
set search_path = ''
as $$
begin
  if new.type = 'certificate' and new.certificate_code is null then
    new.certificate_code := 'RNC-' || to_char(new.issued_at, 'YYYY') || '-'
      || lpad(nextval('public.raman_certificate_seq')::text, 4, '0');
  end if;
  return new;
end;
$$;

create trigger raman_reports_certificate_code
  before insert on public.raman_reports
  for each row execute function public.raman_set_certificate_code();

-- ── updated_at triggers (shared Hangar helper) ───────────────────────────
create trigger set_raman_customers_updated_at before update on public.raman_customers
  for each row execute function public.set_hangar_updated_at();
create trigger set_raman_vehicles_updated_at before update on public.raman_vehicles
  for each row execute function public.set_hangar_updated_at();
create trigger set_raman_engagements_updated_at before update on public.raman_engagements
  for each row execute function public.set_hangar_updated_at();
create trigger set_raman_noise_checks_updated_at before update on public.raman_noise_checks
  for each row execute function public.set_hangar_updated_at();
create trigger set_raman_agent_runs_updated_at before update on public.raman_agent_runs
  for each row execute function public.set_hangar_updated_at();
create trigger set_raman_propellers_updated_at before update on public.raman_propellers
  for each row execute function public.set_hangar_updated_at();
create trigger set_raman_reports_updated_at before update on public.raman_reports
  for each row execute function public.set_hangar_updated_at();
create trigger set_raman_payments_updated_at before update on public.raman_payments
  for each row execute function public.set_hangar_updated_at();

-- ── RLS: Mission Hub admins select/insert/update ─────────────────────────
do $$
declare
  t text;
begin
  foreach t in array array[
    'raman_customers', 'raman_vehicles', 'raman_engagements', 'raman_noise_checks',
    'raman_agent_runs', 'raman_agent_steps', 'raman_propellers', 'raman_reports', 'raman_payments'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('grant select, insert, update on public.%I to authenticated', t);
    execute format('drop policy if exists "MH admins select" on public.%I', t);
    execute format('create policy "MH admins select" on public.%I for select to authenticated using (public.raman_is_admin())', t);
    execute format('drop policy if exists "MH admins insert" on public.%I', t);
    execute format('create policy "MH admins insert" on public.%I for insert to authenticated with check (public.raman_is_admin())', t);
    execute format('drop policy if exists "MH admins update" on public.%I', t);
    execute format('create policy "MH admins update" on public.%I for update to authenticated using (public.raman_is_admin()) with check (public.raman_is_admin())', t);
  end loop;
end;
$$;

-- ── Realtime for the live agent-run view ─────────────────────────────────
alter publication supabase_realtime add table public.raman_agent_steps;
