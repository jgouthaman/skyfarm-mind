import { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LessonShell } from "@/components/academy/lesson/LessonShell";
import { SlideDeck, type SlideDeckHandle } from "@/components/academy/lesson/SlideDeck";
import { QuickRefRail } from "@/components/academy/lesson/QuickRefRail";
import { ChapterNav } from "@/components/academy/lesson/ChapterNav";
import { MissionBrief } from "@/components/academy/lesson/MissionBrief";
import { academyCustomSlideComponents } from "@/components/academy/lesson/custom/registry";
import { lowReynoldsNumberAerodynamicsLesson as lesson } from "@/data/academy/lessons/low-reynolds-number-aerodynamics";

export const Route = createFileRoute("/academy/lesson-demo")({
  component: AcademyLessonDemoPage,
  // ?chapter=<slide id> — used by the quiz result screen's "Review: [chapter]"
  // links to land on this page and scroll straight to the relevant chapter.
  validateSearch: (search: Record<string, unknown>) => ({
    chapter: typeof search.chapter === "string" ? search.chapter : "",
  }),
});

// Reference wiring for the JSON-driven slide-deck lesson viewer — renders
// the ported "Low Reynolds Number Aerodynamics" section end to end, with a
// chapter sidebar (scrollspy), a mission brief, a chapter-aware quick
// reference rail, and a hand-off into the paired quiz demo.
function AcademyLessonDemoPage() {
  const navigate = useNavigate();
  const { chapter } = Route.useSearch();
  const [ready, setReady] = useState(false);
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const slideDeckRef = useRef<SlideDeckHandle>(null);

  useEffect(() => {
    if (!sessionStorage.getItem("academy_user")) {
      navigate({ to: "/academy" });
      return;
    }
    setReady(true);
  }, [navigate]);

  useEffect(() => {
    if (!ready || !chapter) return;
    // Wait a tick for the scroll deck's sections to be laid out before jumping.
    const id = window.setTimeout(() => slideDeckRef.current?.scrollToChapter(chapter), 50);
    return () => window.clearTimeout(id);
  }, [ready, chapter]);

  if (!ready) return null;

  const chapters = lesson.slides.map((slide) => ({ id: slide.id, label: slide.navTitle ?? slide.eyebrow }));
  const activeSlide = lesson.slides[activeChapterIndex];
  const quickRefData = activeSlide?.quickRef ?? lesson.quickRef;

  return (
    <LessonShell
      title={lesson.title}
      sectionIndex={lesson.sectionIndex}
      totalSections={lesson.totalSections}
      onBack={() => navigate({ to: "/academy/dashboard" })}
      sidebar={(
        <ChapterNav
          chapters={chapters}
          activeIndex={activeChapterIndex}
          onJump={(i) => slideDeckRef.current?.scrollToChapter(lesson.slides[i].id)}
        />
      )}
    >
      <div className="lv-lessoncol">
        {lesson.missionBrief && <MissionBrief text={lesson.missionBrief} />}
        <SlideDeck
          ref={slideDeckRef}
          layout="scroll"
          slides={lesson.slides}
          customComponents={academyCustomSlideComponents}
          onActiveChapterChange={setActiveChapterIndex}
          onComplete={() => navigate({ to: "/academy/quiz-demo" })}
          completeLabel="Take the quiz →"
        />
      </div>
      {quickRefData && <QuickRefRail data={quickRefData} />}
    </LessonShell>
  );
}
