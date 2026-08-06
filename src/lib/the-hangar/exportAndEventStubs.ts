// Stage 2.4, components #3 and #4 (MissionAgent.md Section 4.4.1) — Export
// and Event Publish. Both are no-ops, deliberately: "specified now, built
// when needed" — same documented-not-built treatment the doc already gives
// RAG (Section 4.1.1). Callers log whatever these return into the same
// "output_interface" Hangar_agent_runs row (the schema's stage check
// constraint only allows the four named stages — there's no separate row
// type for these two), so there's a durable record of what's stubbed
// rather than a silent gap.

export interface StubResult {
  status: "stubbed";
  reason: string;
}

// Section 4.4.2 — Export (PDF/DOCX/Excel). Deferred to v2. When built, it
// should reuse Section 13.1's Dashboard View content as the source of
// truth (same 7 sections, reformatted) rather than re-deriving formatting
// independently — the doc is explicit that the two must not drift apart.
// TODO(v2): generate PDF/DOCX/Excel per Section 4.4.2's content spec.
export function stubExport(): StubResult {
  return {
    status: "stubbed",
    reason: "Export (PDF/DOCX/Excel) is v2 per Section 4.4.2 — not implemented",
  };
}

export interface EventStubResult extends StubResult {
  eventType: string;
}

// Section 4.4.3 — Event Publish. No queue, no bus, no consumer exists yet
// (Concept Agent / Bay 02 isn't built). The doc's own words: "'Event
// Publish' today is nothing more than the Hangar_agent_runs log row every
// stage already writes" — this stub's entire job is to be visible in that
// row, not to actually publish anywhere.
// TODO(when Concept Agent exists): create the Hangar_events table (schema
// documented in Section 4.4.3, deliberately not part of this migration)
// and wire Supabase Realtime as the bus.
export function stubEventPublish(): EventStubResult {
  return {
    status: "stubbed",
    reason: "No queue/bus/consumer exists yet (Concept Agent not built) — per Section 4.4.3",
    eventType: "mission.spec_ready",
  };
}
