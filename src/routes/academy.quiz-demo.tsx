import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LessonShell } from "@/components/academy/lesson/LessonShell";
import { QuizFlow, type QuizAnswers } from "@/components/academy/quiz/QuizFlow";
import { QuizResult } from "@/components/academy/quiz/QuizResult";
import { lowReynoldsNumberAerodynamicsQuiz as quiz } from "@/data/academy/quizzes/low-reynolds-number-aerodynamics-quiz";

export const Route = createFileRoute("/academy/quiz-demo")({
  component: AcademyQuizDemoPage,
});

// Reference wiring for the chapter-linked quiz demo — paired with
// lesson-demo.tsx's "Low Reynolds Number Aerodynamics" lesson. Reuses
// LessonShell for the topbar + "Question N of M" progress bar/dots, same as
// the lesson page, so both views share one progress visual language.
function AcademyQuizDemoPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [phase, setPhase] = useState<"quiz" | "result">("quiz");
  const [questionIndex, setQuestionIndex] = useState(0);
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
    setQuestionIndex(0);
    setPhase("quiz");
    setAttempt((a) => a + 1);
  }

  function handleReviewChapter(chapterId: string) {
    navigate({ to: "/academy/lesson-demo", search: { chapter: chapterId } });
  }

  function handleContinue() {
    navigate({ to: "/academy/dashboard" });
  }

  const sectionIndex = phase === "quiz" ? questionIndex + 1 : quiz.questions.length;

  return (
    <LessonShell
      title={quiz.title}
      sectionIndex={sectionIndex}
      totalSections={quiz.questions.length}
      onBack={() => navigate({ to: "/academy/lesson-demo", search: { chapter: "" } })}
    >
      {phase === "quiz" ? (
        <QuizFlow key={attempt} quiz={quiz} onFinish={handleFinish} onQuestionChange={setQuestionIndex} />
      ) : (
        <QuizResult
          quiz={quiz}
          answers={answers}
          onRetry={handleRetry}
          onContinue={handleContinue}
          onReviewChapter={handleReviewChapter}
        />
      )}
    </LessonShell>
  );
}
