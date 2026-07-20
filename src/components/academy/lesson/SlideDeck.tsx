import {
  forwardRef, useEffect, useImperativeHandle, useRef, useState, type ComponentType,
} from "react";
import type { Slide } from "@/lib/academy/lesson-schema";
import { BlockRenderer } from "./BlockRenderer";
import { SlideNav } from "./SlideNav";

const SWIPE_THRESHOLD_PX = 50;

export interface SlideDeckHandle {
  /** Scrolls to (scroll layout) or jumps to (paginated layout) the chapter with this slide id. */
  scrollToChapter: (slideId: string) => void;
}

interface SlideDeckProps {
  slides: Slide[];
  customComponents?: Record<string, ComponentType<{ props?: Record<string, unknown> }>>;
  onComplete: () => void;
  completeLabel?: string;
  /** "paginated" (default, unchanged behavior) shows one chapter at a time with prev/next.
   *  "scroll" stacks every chapter in one scrollable column for sidebar scrollspy navigation. */
  layout?: "paginated" | "scroll";
  /** Scroll layout only — fires whenever the chapter currently in view changes. */
  onActiveChapterChange?: (index: number) => void;
}

export const SlideDeck = forwardRef<SlideDeckHandle, SlideDeckProps>(function SlideDeck({
  slides, customComponents, onComplete, completeLabel = "Next section →",
  layout = "paginated", onActiveChapterChange,
}, ref) {
  if (layout === "scroll") {
    return (
      <ScrollSlideDeck
        ref={ref}
        slides={slides}
        customComponents={customComponents}
        onComplete={onComplete}
        completeLabel={completeLabel}
        onActiveChapterChange={onActiveChapterChange}
      />
    );
  }
  return (
    <PaginatedSlideDeck
      ref={ref}
      slides={slides}
      customComponents={customComponents}
      onComplete={onComplete}
      completeLabel={completeLabel}
    />
  );
});

const PaginatedSlideDeck = forwardRef<SlideDeckHandle, Omit<SlideDeckProps, "layout" | "onActiveChapterChange">>(
  function PaginatedSlideDeck({ slides, customComponents, onComplete, completeLabel = "Next section →" }, ref) {
    const [index, setIndex] = useState(0);
    const touchX = useRef<number | null>(null);
    const isLast = index === slides.length - 1;

    const goTo = (i: number) => setIndex(Math.max(0, Math.min(slides.length - 1, i)));
    const goNext = () => { if (isLast) onComplete(); else goTo(index + 1); };
    const goBack = () => goTo(index - 1);

    useImperativeHandle(ref, () => ({
      scrollToChapter: (slideId: string) => {
        const i = slides.findIndex((s) => s.id === slideId);
        if (i !== -1) goTo(i);
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }), [slides]);

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
  },
);

// Continuous-scroll layout: every chapter stacked in one column. An
// IntersectionObserver drives which chapter counts as "active" (the classic
// scrollspy band — a section becomes active once its top has crossed ~20%
// down the viewport, and stops counting once it's scrolled past ~70% up),
// which the parent mirrors into the ChapterNav sidebar highlight.
const ScrollSlideDeck = forwardRef<SlideDeckHandle, Omit<SlideDeckProps, "layout">>(
  function ScrollSlideDeck({ slides, customComponents, onComplete, completeLabel = "Continue", onActiveChapterChange }, ref) {
    const sectionRefs = useRef<(HTMLElement | null)[]>([]);
    const [activeIndex, setActiveIndex] = useState(0);

    useImperativeHandle(ref, () => ({
      scrollToChapter: (slideId: string) => {
        const i = slides.findIndex((s) => s.id === slideId);
        sectionRefs.current[i]?.scrollIntoView({ behavior: "smooth", block: "start" });
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }), [slides]);

    useEffect(() => {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const i = sectionRefs.current.findIndex((el) => el === entry.target);
            if (i !== -1) setActiveIndex(i);
          });
        },
        { rootMargin: "-15% 0px -70% 0px", threshold: 0 },
      );
      sectionRefs.current.forEach((el) => el && observer.observe(el));
      return () => observer.disconnect();
    }, [slides]);

    useEffect(() => { onActiveChapterChange?.(activeIndex); }, [activeIndex, onActiveChapterChange]);

    return (
      <div className="lv-slidewrap lv-scrolldeck">
        {slides.map((slide, i) => (
          <section
            key={slide.id}
            id={`chapter-${slide.id}`}
            ref={(el) => { sectionRefs.current[i] = el; }}
            className="lv-slide lv-active lv-scrollchapter"
          >
            <div className="lv-meta">
              <p className="lv-eyebrow">{slide.eyebrow}</p>
              {slide.readTime && <span className="lv-readtime">🕑 {slide.readTime}</span>}
            </div>
            {slide.blocks.map((block, bi) => (
              <BlockRenderer key={bi} block={block} customComponents={customComponents} />
            ))}
          </section>
        ))}

        <div className="lv-scrolldeck-complete">
          <button type="button" className="lv-btn lv-primary" onClick={onComplete}>
            {completeLabel}
          </button>
        </div>
      </div>
    );
  },
);
