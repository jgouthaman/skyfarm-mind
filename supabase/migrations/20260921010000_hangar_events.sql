-- Mission Agent (Bay 01) event publish -- MissionAgent.md Section 4.4.3.
-- Stage 4 inserts one `mission.spec_ready` row here each time it persists a
-- spec version. The row carries only {mission_id, version}; a consumer fetches
-- the spec itself from Hangar_mission_specs.
--
-- Nothing consumes these yet (Concept Agent still reads
-- Hangar_missions.status = 'finalized' directly), so this is the publish side
-- only. The insert is best-effort (missionPersistence.ts's publishMissionEvent
-- never throws), so the app keeps working before this is applied -- events just
-- aren't recorded until it is.
--
-- Realtime is NOT enabled here. The spec proposed Supabase Realtime as the
-- bus, but the app runs on Vercel serverless functions, which can't hold a
-- subscription open. A consumer should poll pending rows (the partial index
-- below is for that) or be triggered by a webhook. If you later want Realtime
-- for a long-lived consumer, run:
--   alter publication supabase_realtime add table public."Hangar_events";
--
-- Not auto-applied to the live project -- run manually in the Supabase SQL
-- editor, same as every other Hangar_* migration in this repo.

create table public."Hangar_events" (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,                        -- e.g. 'mission.spec_ready'
  mission_id uuid not null references public."Hangar_missions"(id) on delete cascade,
  payload jsonb not null check (payload ? 'version'),  -- minimal: {mission_id, version}
  status text not null default 'pending'
    check (status in ('pending','consumed','error')),
  published_at timestamptz not null default now(),
  consumed_at timestamptz null,
  consumed_by text null                            -- e.g. 'CONCEPT_AGENT'
);

-- One event per (type, mission, spec version): publishing the same version
-- twice (e.g. a retried Stage 4) is a no-op instead of a duplicate event.
create unique index "Hangar_events_dedupe_idx"
  on public."Hangar_events" (event_type, mission_id, ((payload->>'version')));

-- What a polling consumer reads: unconsumed events of one type, oldest first.
create index "Hangar_events_pending_idx"
  on public."Hangar_events" (event_type, published_at)
  where status = 'pending';

alter table public."Hangar_events" enable row level security;

-- Users can read events on their own missions. Publish (insert) and consume
-- (update) are service-role only -- there is deliberately no insert/update/
-- delete policy, same write pattern as Hangar_mission_specs and
-- Hangar_agent_runs.
create policy "Users view events on their own missions"
  on public."Hangar_events"
  for select
  using (mission_id in (select id from public."Hangar_missions" where user_id = auth.uid()));
