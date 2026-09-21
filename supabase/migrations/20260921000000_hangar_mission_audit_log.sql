-- Mission Agent (Bay 01) user-action audit log -- MissionAgent.md Section 9.1
-- "Audit Trail": Hangar_agent_runs already records what the AGENT did per
-- stage; this records what the USER did to a mission (created it, generated a
-- spec, confirmed it as final), one row per action.
--
-- Written server-side only, best-effort (missionPersistence.ts's
-- logMissionAudit swallows its own failure), so the app keeps working before
-- this is applied -- audit rows just aren't recorded until it is.
--
-- Not auto-applied to the live project -- run manually in the Supabase SQL
-- editor, same as every other Hangar_* migration in this repo.

create table public."Hangar_mission_audit" (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public."Hangar_missions"(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  action text not null check (action in ('mission_created','spec_generated','mission_finalized')),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index "Hangar_mission_audit_mission_idx"
  on public."Hangar_mission_audit" (mission_id, created_at);

alter table public."Hangar_mission_audit" enable row level security;

-- Users can read the trail for their own missions. There is deliberately no
-- insert/update/delete policy: writes happen only through the service role
-- (supabaseAdmin), so a signed-in user can't add, edit or erase entries.
create policy "Users view audit rows for their own missions"
  on public."Hangar_mission_audit"
  for select
  using (user_id = auth.uid());
