// The ONE thing the browser still contributes to Stage 2 (Reasoning &
// Planning): the gap-fill wizard's answers (Stage 1 flagged payload/range/
// endurance as missing and the user supplied them). Those are genuine user
// input, but they're accepted only for these three known keys and only as
// positive finite numbers — everything else Stage 2 needs (extraction,
// structured fields, regulations) comes from Stage 1's stored record, not
// from the request. Kept in its own pure module (no DB, no LLM) so this
// whitelist — the one place request-supplied data enters Stage 2 — can be
// tested on its own (gapOverrides.manualtest.ts).
export const GAP_OVERRIDE_KEYS = ["payload_kg", "range_km", "endurance_min"] as const;

export function sanitizeGapOverrides(raw: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (typeof raw !== "object" || raw === null) return out;
  for (const key of GAP_OVERRIDE_KEYS) {
    const value = (raw as Record<string, unknown>)[key];
    if (typeof value === "number" && Number.isFinite(value) && value > 0) out[key] = value;
  }
  return out;
}
