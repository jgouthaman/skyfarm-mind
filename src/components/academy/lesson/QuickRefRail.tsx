import { useState } from "react";
import { BookOpen, Download, X } from "lucide-react";
import type { QuickRefData } from "@/lib/academy/lesson-schema";

// Sticky right-rail panel on wide viewports. Below the lesson shell's
// 1080px breakpoint there's no room for a third grid column, so instead of
// disappearing this collapses into a toggleable slide-in drawer (a floating
// button opens the same content as an overlay panel).
export function QuickRefRail({ data, onDownload }: { data: QuickRefData; onDownload?: () => void }) {
  const [open, setOpen] = useState(false);

  const card = (
    <div className="lv-card">
      <div className="lv-cap">Quick reference</div>
      <div className="lv-formula-line">{data.formula}</div>
      <dl>
        {data.facts.map((fact, i) => (
          <div key={i}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>
        ))}
      </dl>
      {data.highlightValue && (
        <>
          <div className="lv-divider" />
          <div className="lv-re-val">{data.highlightValue}</div>
          {data.highlightLabel && <div className="lv-re-lbl">{data.highlightLabel}</div>}
        </>
      )}
      {onDownload && (
        <button className="lv-btn" style={{ width: "100%", marginTop: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }} onClick={onDownload}>
          <Download size={14} /> Download cheat sheet
        </button>
      )}
    </div>
  );

  return (
    <>
      <aside className="lv-quickref">{card}</aside>

      <button type="button" className="lv-quickref-fab" onClick={() => setOpen(true)} aria-label="Open quick reference">
        <BookOpen size={18} />
      </button>

      {open && (
        <div className="lv-quickref-drawer-backdrop" onClick={() => setOpen(false)}>
          <div className="lv-quickref-drawer" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="lv-quickref-drawer-close"
              onClick={() => setOpen(false)}
              aria-label="Close quick reference"
            >
              <X size={16} />
            </button>
            {card}
          </div>
        </div>
      )}
    </>
  );
}
