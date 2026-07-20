import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Plane } from "lucide-react";
import { QuizFlow, type QuizAnswers } from "@/components/academy/quiz/QuizFlow";
import { QuizResult } from "@/components/academy/quiz/QuizResult";
import { lowReynoldsNumberAerodynamicsQuiz as quiz } from "@/data/academy/quizzes/low-reynolds-number-aerodynamics-quiz";
import "@/components/academy/lesson/lesson.css";

export const Route = createFileRoute("/academy/quiz-demo")({
  component: AcademyQuizDemoPage,
});

// Reference wiring for the chapter-linked quiz demo — paired with
// lesson-demo.tsx's "Low Reynolds Number Aerodynamics" lesson. QuizFlow and
// QuizResult are self-contained compact widgets with their own header/
// progress, so this page only needs a thin topbar around them rather than
// LessonShell's full progress chrome.
function AcademyQuizDemoPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [phase, setPhase] = useState<"quiz" | "result">("quiz");
  const [answers, setAnswers] = useState<QuizAnswers>({});
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!sessionStorage.getItem("academy_user")) {
      navigate({ to: "/academy" });
      return;
    }
    setReady(true);
  }, [navigate]);

  if (!ready) return null;

  function handleFinish(finalAnswers: QuizAnswers) {
    setAnswers(finalAnswers);
    setPhase("result");
  }

  function handleRetry() {
    setAnswers({});
    setPhase("quiz");
    setAttempt((a) => a + 1);
  }

  function handleClose() {
    navigate({ to: "/academy/lesson-demo", search: { chapter: "" } });
  }

  function handleReviewChapter(chapterId: string) {
    navigate({ to: "/academy/lesson-demo", search: { chapter: chapterId } });
  }

  function handleContinue() {
    navigate({ to: "/academy/dashboard" });
  }

  return (
    <div className="lesson-viewer">
      <header className="lv-topbar">
        <button className="lv-back" onClick={handleClose} aria-label="Back">
          <ArrowLeft size={16} />
        </button>
        <span className="lv-brandmark"><Plane size={13} /></span>
        <span className="lv-brand">TorqWings Academy</span>
      </header>

      {phase === "quiz" ? (
        <QuizFlow key={attempt} quiz={quiz} onFinish={handleFinish} onClose={handleClose} />
      ) : (
        <QuizResult
          quiz={quiz}
          answers={answers}
          onRetry={handleRetry}
          onContinue={handleContinue}
          onReviewChapter={handleReviewChapter}
        />
      )}
    </div>
  );
}
