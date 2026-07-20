import type { ReactNode } from "react";
import { ArrowLeft, Plane } from "lucide-react";
import "./lesson.css";

export function LessonShell({
  title, sectionIndex, totalSections, onBack, children, sidebar,
}: {
  title: string;
  sectionIndex: number;
  totalSections: number;
  onBack: () => void;
  children: ReactNode;
  /** Optional left sidebar (e.g. ChapterNav) — adds a third grid column ahead of the content. */
  sidebar?: ReactNode;
}) {
  const progressPct = totalSections > 1 ? ((sectionIndex - 1) / (totalSections - 1)) * 100 : 0;

  return (
    <div className="lesson-viewer">
      <header className="lv-topbar">
        <button className="lv-back" onClick={onBack} aria-label="Back">
          <ArrowLeft size={18} />
        </button>
        <span className="lv-brandmark"><Plane size={15} /></span>
        <span className="lv-brand">TorqWings Academy</span>
      </header>

      <div className="lv-progress">
        <div className="lv-progress-label">
          {title} · Section {sectionIndex} of {totalSections}
        </div>
        <div className="lv-track">
          <span className="lv-fill" style={{ width: `${progressPct}%` }} />
        </div>
        <div className="lv-dots">
          {Array.from({ length: totalSections }, (_, i) => {
            const n = i + 1;
            const cls = n === sectionIndex ? "lv-now" : n < sectionIndex ? "lv-done" : undefined;
            return <i key={i} className={cls} />;
          })}
        </div>
      </div>

      <div className={`lv-shell${sidebar ? " lv-with-sidebar" : ""}`}>
        {sidebar}
        {children}
      </div>
    </div>
  );
}
