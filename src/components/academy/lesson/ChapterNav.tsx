// Sticky left sidebar for continuous-scroll lessons: lists each chapter,
// highlights whichever one SlideDeck's scrollspy says is active, and shows
// a thin "N of M chapters" progress bar underneath (reusing the same
// .lv-track/.lv-fill visual as the top-level lesson progress bar).
export interface ChapterNavItem {
  id: string;
  label: string;
}

export function ChapterNav({
  chapters, activeIndex, onJump,
}: {
  chapters: ChapterNavItem[];
  activeIndex: number;
  onJump: (index: number) => void;
}) {
  const progressPct = chapters.length > 1 ? (activeIndex / (chapters.length - 1)) * 100 : chapters.length === 1 ? 100 : 0;

  return (
    <nav className="lv-chapternav" aria-label="Lesson chapters">
      <div className="lv-chapternav-list">
        {chapters.map((chapter, i) => (
          <button
            key={chapter.id}
            type="button"
            className={`lv-chapternav-item${i === activeIndex ? " lv-active" : ""}`}
            aria-current={i === activeIndex ? "true" : undefined}
            onClick={() => onJump(i)}
          >
            <span className="lv-chapternav-num">{String(i + 1).padStart(2, "0")}</span>
            <span className="lv-chapternav-label">{chapter.label}</span>
          </button>
        ))}
      </div>

      <div className="lv-chapternav-progress">
        <div className="lv-chapternav-progress-label">
          {Math.min(activeIndex + 1, chapters.length)} of {chapters.length} chapters
        </div>
        <div className="lv-track">
          <span className="lv-fill" style={{ width: `${progressPct}%` }} />
        </div>
      </div>
    </nav>
  );
}
