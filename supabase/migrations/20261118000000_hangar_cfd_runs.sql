-- CFD Agent (Bay 06) solver runs. One row per real CFD job dispatched for a
-- Hangar_CFDAnalyses row (20260903120000_hangar_cfd_agent.sql): status and
-- progress as the GCP job moves through meshing -> solving ->
-- postprocessing, its case setup, mesh quality, residual history, final
-- force coefficients and the storage paths of its artifacts.
--
-- Separate from Hangar_CFDAnalysis_runs, which stays the per-stage agent
-- audit log (one row per stage, success/error) like every other bay's
-- *_runs table; this table tracks a long-running solver job and is updated
-- many times while it runs. Follows Bay 08's Hangar_Optimization_runs
-- (20260907000000_hangar_optimization_agent.sql) for naming, the parent
-- foreign key and the shared updated_at trigger.
--
-- Access: users can read and create runs for their own CFD analyses only.
-- There is no update or delete policy, so only the service role (the server
-- and the GCP worker, which bypass RLS) can change a run once it exists.
--
-- Realtime is on so the Bay 06 page can follow status, progress and
-- residuals live (RLS still applies to what each subscriber receives).
--
-- Creates no new functions: reuses public.set_hangar_updated_at() from
-- 20260801000000_hangar_mission_agent_baseline.sql (search_path = '').
-- Not auto-applied to the live project -- run manually in the Supabase SQL
-- editor, same as every other Hangar_* migration in this repo.

create table public."Hangar_CFD_runs" (
  id uuid primary key default gen_random_uuid(),
  cfd_id uuid not null references public."Hangar_CFDAnalyses"(id),
  user_id uuid not null references auth.users(id),
  status text not null default 'queued'
    check (status in ('queued','dispatched','meshing','solving','postprocessing','completed','failed','cancelled')),
  progress_pct integer default 0 check (progress_pct between 0 and 100),
  case_setup jsonb,                        -- solver, turbulence model, velocity, boundary conditions
  solver text,
  turbulence_model text,
  mesh_stats jsonb,                        -- cell count, checkMesh quality results
  residuals jsonb default '[]'::jsonb,     -- [{iteration, Ux, Uy, Uz, p, k, omega}]
  results jsonb,                           -- {cl, cd, cm, lift_n, drag_n}
  artifacts jsonb,                         -- storage paths: contour images, VTK, logs
  error_message text,
  gcp_execution_id text,
  is_stub boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  started_at timestamptz,
  completed_at timestamptz
);

create index "Hangar_CFD_runs_cfd_created_idx"
  on public."Hangar_CFD_runs" (cfd_id, created_at desc);

create index "Hangar_CFD_runs_status_idx"
  on public."Hangar_CFD_runs" (status);

create trigger set_hangar_cfd_runs_updated_at
  before update on public."Hangar_CFD_runs"
  for each row execute function public.set_hangar_updated_at();

alter table public."Hangar_CFD_runs" enable row level security;

create policy "Users read their own CFD runs" on public."Hangar_CFD_runs"
  for select to authenticated
  using (auth.uid() = user_id);

-- Insert only as yourself, and only against a CFD analysis you own.
create policy "Users create CFD runs for their own CFD analyses" on public."Hangar_CFD_runs"
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (select 1 from public."Hangar_CFDAnalyses" a where a.id = cfd_id and a.user_id = auth.uid())
  );

alter publication supabase_realtime add table public."Hangar_CFD_runs";
