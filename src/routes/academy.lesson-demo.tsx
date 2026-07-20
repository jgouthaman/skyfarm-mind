import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LessonShell } from "@/components/academy/lesson/LessonShell";
import { SlideDeck } from "@/components/academy/lesson/SlideDeck";
import { QuickRefRail } from "@/components/academy/lesson/QuickRefRail";
import { academyCustomSlideComponents } from "@/components/academy/lesson/custom/registry";
import { lowReynoldsNumberAerodynamicsLesson as lesson } from "@/data/academy/lessons/low-reynolds-number-aerodynamics";

export const Route = createFileRoute("/academy/lesson-demo")({
  component: AcademyLessonDemoPage,
});

// Reference wiring for the JSON-driven slide-deck lesson viewer — renders
// the ported "Low Reynolds Number Aerodynamics" section end to end.
function AcademyLessonDemoPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!sessionStorage.getItem("academy_user")) {
      navigate({ to: "/academy" });
      return;
    }
    setReady(true);
  }, [navigate]);

  if (!ready) return null;

  return (
    <LessonShell
      title={lesson.title}
      sectionIndex={lesson.sectionIndex}
      totalSections={lesson.totalSections}
      onBack={() => navigate({ to: "/academy/dashboard" })}
    >
      <SlideDeck
        slides={lesson.slides}
        customComponents={academyCustomSlideComponents}
        onComplete={() => navigate({ to: "/academy/dashboard" })}
      />
      {lesson.quickRef && <QuickRefRail data={lesson.quickRef} />}
    </LessonShell>
  );
}
