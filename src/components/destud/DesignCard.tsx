import { C, DISPLAY, MONO, SANS } from "./theme";

export interface DesignSummary {
  id: string;
  project_name: string;
  vertical: string | null;
  purpose: string | null;
  status: string | null;
  updated_at: string;
  created_at: string;
}

export function DesignCard({ design }: { design: DesignSummary }) {
  return (
    <div
      style={{
        textAlign: "left", border: `1px solid ${C.line}`, borderRadius: 12, background: C.panel,
        padding: "16px 18px",
      }}
    >
      <div style={{ font: `600 15px/1.3 ${DISPLAY}`, color: C.text }}>
        {design.project_name || "Untitled mission"}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
        {design.vertical && (
          <span
            style={{
              font: `600 10px/1 ${MONO}`, letterSpacing: ".06em", textTransform: "uppercase",
              color: C.amber, background: `${C.amber}1A`, border: `1px solid ${C.amber}33`,
              padding: "4px 7px", borderRadius: 5,
            }}
          >
            {design.vertical}
          </span>
        )}
        {design.status && (
          <span style={{ font: `500 11px/1 ${SANS}`, color: C.mute }}>{design.status}</span>
        )}
      </div>
      <div style={{ font: `500 11px/1 ${MONO}`, color: C.faint, marginTop: 10 }}>
        Updated {new Date(design.updated_at).toLocaleDateString()}
      </div>
    </div>
  );
}
