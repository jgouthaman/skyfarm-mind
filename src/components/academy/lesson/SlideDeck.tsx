import { useEffect, useRef, useState, type ComponentType } from "react";
import type { Slide } from "@/lib/academy/lesson-schema";
import { BlockRenderer } from "./BlockRenderer";
import { SlideNav } from "./SlideNav";

const SWIPE_THRESHOLD_PX = 50;

export function SlideDeck({
  slides, customComponents, onComplete, completeLabel = "Next section →",
}: {
  slides: Slide[];
  customComponents?: Record<string, ComponentType<{ props?: Record<string, unknown> }>>;
  onComplete: () => void;
  completeLabel?: string;
}) {
  const [index, setIndex] = useState(0);
  const touchX = useRef<number | null>(null);
  const isLast = index === slides.length - 1;

  const goTo = (i: number) => setIndex(Math.max(0, Math.min(slides.length - 1, i)));
  const goNext = () => { if (isLast) onComplete(); else goTo(index + 1); };
  const goBack = () => goTo(index - 1);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowRight") { e.preventDefault(); goNext(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); goBack(); }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, isLast, slides.length]);

  function onTouchStart(e: React.TouchEvent) {
    touchX.current = e.touches[0].clientX;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > SWIPE_THRESHOLD_PX) { dx < 0 ? goNext() : goBack(); }
    touchX.current = null;
  }

  return (
    <div className="lv-slidewrap">
      <div className="lv-slides" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {slides.map((slide, i) => (
          <section key={slide.id} className={`lv-slide${i === index ? " lv-active" : ""}`}>
            <div className="lv-meta">
              <p className="lv-eyebrow">{slide.eyebrow}</p>
              {slide.readTime && <span className="lv-readtime">🕑 {slide.readTime}</span>}
            </div>
            {slide.blocks.map((block, bi) => (
              <BlockRenderer key={bi} block={block} customComponents={customComponents} />
            ))}
          </section>
        ))}
      </div>

      <SlideNav
        index={index}
        total={slides.length}
        onBack={goBack}
        onNext={goNext}
        onJump={goTo}
        nextLabel={isLast ? completeLabel : "Next →"}
      />
    </div>
  );
}
