import { DesignCard, type DesignSummary } from "./DesignCard";
import { C, SANS } from "./theme";

// Pure display — data comes from useDestudDesigns (src/lib/destud-designs.ts)
// so both dashboards share one fetch and can also derive the "designs this
// month" meter count from the same data instead of querying twice.
export function DesignsGrid({ designs }: { designs: DesignSummary[] | null }) {
  if (designs === null) {
    return <p style={{ font: `400 13px/1.5 ${SANS}`, color: C.mute }}>Loading designs…</p>;
  }
  if (designs.length === 0) {
    return <p style={{ font: `400 13px/1.5 ${SANS}`, color: C.mute }}>No designs yet — start your first mission.</p>;
  }
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
      {designs.map((d) => (
        <DesignCard key={d.id} design={d} />
      ))}
    </div>
  );
}
