// Mission Agent event publish — MissionAgent.md Section 4.4.3. Pure pieces
// only (event names, the row to insert, how an insert error is classified), so
// they can be tested without a database; the actual insert is
// missionPersistence.ts's publishMissionEvent.
//
// One event type today, `mission.spec_ready`: Stage 4 has persisted a spec
// version. The event is deliberately minimal — {mission_id, version} — and a
// consumer fetches the actual spec from Hangar_mission_specs by mission_id
// (Section 4.4.3: two copies of the spec could silently drift apart).
//
// Note `spec_ready` means "a draft spec exists", not "a human confirmed it".
// A consumer that must only act on confirmed specs still has to check
// Hangar_missions.status = 'finalized' (Section 17).

export const MISSION_SPEC_READY = "mission.spec_ready";

export type MissionEventType = typeof MISSION_SPEC_READY;

export interface MissionEventDraft {
  event_type: MissionEventType;
  payload: { mission_id: string; version: number };
}

export function buildSpecReadyEvent(missionId: string, version: number): MissionEventDraft {
  return { event_type: MISSION_SPEC_READY, payload: { mission_id: missionId, version } };
}

// What Stage 4 records in its Hangar_agent_runs row instead of a stub.
export type EventPublishResult =
  | { status: "published"; eventType: MissionEventType; eventId: string }
  // The same (type, mission, version) was already published — the table's
  // unique index makes a repeat a no-op, which is the point, not a failure.
  | { status: "duplicate"; eventType: MissionEventType }
  | { status: "failed"; eventType: MissionEventType; reason: string };

// Postgres unique_violation. supabase-js surfaces it as error.code "23505";
// the message check covers a client/wrapper that drops the code.
export function classifyPublishError(error: {
  message: string;
  code?: string;
}): "duplicate" | "failed" {
  if (error.code === "23505" || /duplicate key value|unique constraint/i.test(error.message)) {
    return "duplicate";
  }
  return "failed";
}
