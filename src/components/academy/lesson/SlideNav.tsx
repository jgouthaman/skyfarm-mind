export function SlideNav({
  index, total, onBack, onNext, onJump, nextLabel = "Next →", backDisabled,
}: {
  index: number;
  total: number;
  onBack: () => void;
  onNext: () => void;
  onJump: (i: number) => void;
  nextLabel?: string;
  backDisabled?: boolean;
}) {
  return (
    <div className="lv-slidenav">
      <button className="lv-btn" onClick={onBack} disabled={backDisabled ?? index === 0}>
        ← Back
      </button>
      <div className="lv-slidedots">
        {Array.from({ length: total }, (_, i) => (
          <button
            key={i}
            className={i === index ? "lv-active" : undefined}
            aria-label={`Go to slide ${i + 1}`}
            onClick={() => onJump(i)}
          />
        ))}
      </div>
      <button className="lv-btn lv-primary" onClick={onNext}>{nextLabel}</button>
    </div>
  );
}
