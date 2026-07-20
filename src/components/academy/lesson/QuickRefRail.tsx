import { Download } from "lucide-react";
import type { QuickRefData } from "@/lib/academy/lesson-schema";

export function QuickRefRail({ data, onDownload }: { data: QuickRefData; onDownload?: () => void }) {
  return (
    <aside className="lv-quickref">
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
    </aside>
  );
}
