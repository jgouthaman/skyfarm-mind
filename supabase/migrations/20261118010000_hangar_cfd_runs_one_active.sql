-- CFD Agent (Bay 06): at most one active solver run per CFD analysis.
-- CFDRUN-003 (cfdRunRules.ts) already blocks a new run while one is
-- queued/dispatched/meshing/solving/postprocessing, but two requests can
-- both pass that check before either inserts. This partial unique index
-- makes the database reject the second insert with 23505, which
-- cfdRunPipeline.ts turns into the same 409 as CFDRUN-003.
--
-- Finished runs (completed/failed/cancelled) are outside the predicate, so
-- any number of them can exist per cfd_id.
--
-- Already applied to the live project by hand in the Supabase SQL editor;
-- "if not exists" makes re-running this file a no-op as long as the index
-- name matches.

create unique index if not exists "Hangar_CFD_runs_one_active_per_cfd_idx"
  on public."Hangar_CFD_runs" (cfd_id)
  where status in ('queued','dispatched','meshing','solving','postprocessing');
