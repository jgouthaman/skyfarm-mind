import { C, MONO, SANS } from "./theme";

// cap === null renders as an "unlimited" state instead of a progress bar.
export function Meter({
  label, used, cap, unlimitedLabel = "Unlimited",
}: { label: string; used: number; cap: number | null; unlimitedLabel?: string }) {
  const pct = cap ? Math.min(100, Math.round((used / cap) * 100)) : 0;
  const atCap = cap != null && used >= cap;
  return (
    <div style={{ border: `1px solid ${C.line}`, borderRadius: 12, background: C.panel, padding: "16px 18px" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
        <span style={{ font: `500 12px/1.3 ${SANS}`, color: C.mute }}>{label}</span>
        <span style={{ font: `600 13px/1 ${MONO}`, color: C.text, whiteSpace: "nowrap" }}>
          {cap == null ? unlimitedLabel : `${used} / ${cap}`}
        </span>
      </div>
      {cap != null && (
        <div style={{ marginTop: 10, height: 6, borderRadius: 3, background: C.line, overflow: "hidden" }}>
          <div
            style={{
              width: `${pct}%`, height: "100%", borderRadius: 3, transition: "width .3s",
              background: atCap ? C.red : C.amber,
            }}
          />
        </div>
      )}
    </div>
  );
}
