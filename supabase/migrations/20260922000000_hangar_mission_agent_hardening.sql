-- Mission Agent (Bay 01) hardening -- two access gaps found in the live schema
-- dump on 2026-09-22, plus one index. Unlike the baseline this DOES change the
-- live project, so read it before running it.
--
-- The app itself is unaffected by all three: it reads and writes these tables
-- only from server code through the service role, which bypasses RLS and is
-- granted execute on the function explicitly below. No browser code touches
-- these tables (the Mission page uses the browser client only to read the
-- login session).
--
-- Idempotent; safe to run twice.
--
-- Not auto-applied to the live project -- run manually in the Supabase SQL
-- editor, same as every other Hangar_* migration in this repo.

-- 1. A user could write their own mission rows directly.
--
-- owner_all_hangar_missions is FOR ALL, so with an ordinary login token a user
-- could bypass the API and, through Supabase's REST endpoint, set their own
-- mission's status to 'finalized' with no spec behind it (Concept Agent trusts
-- that status), edit its confidence_score, or delete it (which cascades to its
-- specs and run log). Everything the server checks -- stage order, ownership,
-- "Save as final needs a spec" -- was skippable from the outside.
--
-- Users keep read access to their own missions. All writes go through the
-- server (service role), exactly as the code already does.
drop policy if exists owner_all_hangar_missions on public."Hangar_missions";
drop policy if exists owner_select_hangar_missions on public."Hangar_missions";
create policy owner_select_hangar_missions on public."Hangar_missions"
  for select
  using (auth.uid() = user_id);

-- 2. get_next_mission_spec_version is SECURITY DEFINER and, by Supabase's
--    default privileges, executable by anon and authenticated -- so anyone with
--    the public API key could call it for any mission id and learn whether that
--    mission has specs (1 = none yet, higher = it does). Only the server needs it.
revoke execute on function public.get_next_mission_spec_version(uuid) from public, anon, authenticated;
grant execute on function public.get_next_mission_spec_version(uuid) to service_role;

-- 3. The pipeline looks up runs by (mission_id, stage) on every stage call
--    (each stage reads the previous stage's stored result) and by mission_id
--    for usage. Hangar_agent_runs had no index beyond its primary key.
create index if not exists "Hangar_agent_runs_mission_stage_idx"
  on public."Hangar_agent_runs" (mission_id, stage);
