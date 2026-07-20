import { useEffect, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import type { Quiz } from "@/lib/academy/quiz-schema";

export type QuizAnswers = Record<string, string>;

// Forward-only, one question at a time: once an option is picked it's
// locked in (no re-selecting, no back button) and immediate feedback shows
// on the option itself plus a reasoning line below, before "Next question"
// becomes available. Chrome (topbar + "Question N of M" progress bar) is
// owned by the caller via LessonShell, matching the lesson page's pattern —
// this component only renders the question card.
export function QuizFlow({
  quiz, onFinish, onQuestionChange,
}: {
  quiz: Quiz;
  onFinish: (answers: QuizAnswers) => void;
  onQuestionChange?: (index: number) => void;
}) {
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswers>({});
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => { onQuestionChange?.(qIndex); }, [qIndex, onQuestionChange]);

  const question = quiz.questions[qIndex];
  const isLast = qIndex === quiz.questions.length - 1;
  const isCorrect = selected === question.correctOptionId;
  const selectedOption = selected ? question.options.find((o) => o.id === selected) ?? null : null;
  const correctOption = question.options.find((o) => o.id === question.correctOptionId) ?? null;

  function selectOption(optionId: string) {
    if (selected) return;
    setSelected(optionId);
  }

  function next() {
    if (!selected) return;
    const updated = { ...answers, [question.id]: selected };
    setAnswers(updated);
    setSelected(null);
    if (isLast) onFinish(updated);
    else setQIndex((i) => i + 1);
  }

  return (
    <div className="lv-quiz-shell">
      <div className="lv-quiz-card">
        <p className="lv-quiz-eyebrow">{question.chapterTitle}</p>
        <p className="lv-quiz-question">{question.question}</p>

        <div className="lv-quiz-opts">
          {question.options.map((opt) => {
            const isSelected = opt.id === selected;
            const revealed = selected != null;
            const isOptCorrect = opt.id === question.correctOptionId;
            const cls = ["lv-quiz-opt"];
            if (revealed && isOptCorrect) cls.push("lv-quiz-correct");
            else if (revealed && isSelected) cls.push("lv-quiz-wrong");
            return (
              <button
                key={opt.id}
                type="button"
                className={cls.join(" ")}
                disabled={selected != null}
                onClick={() => selectOption(opt.id)}
              >
                <span className="lv-quiz-opt-text">{opt.text}</span>
                {revealed && isOptCorrect && <CheckCircle2 size={16} />}
                {revealed && isSelected && !isOptCorrect && <XCircle size={16} />}
              </button>
            );
          })}
        </div>

        {selected && (
          <div className={`lv-quiz-reasoning ${isCorrect ? "lv-quiz-reasoning-ok" : "lv-quiz-reasoning-bad"}`}>
            <p className="lv-h">{isCorrect ? "Correct" : "Not quite"}</p>
            <p>{selectedOption?.reasoning}</p>
            {!isCorrect && correctOption && (
              <p className="lv-quiz-correct-answer">Correct answer: {correctOption.text}</p>
            )}
          </div>
        )}

        <button
          type="button"
          className="lv-btn lv-primary"
          style={{ width: "100%", marginTop: 20 }}
          disabled={!selected}
          onClick={next}
        >
          {isLast ? "See results →" : "Next question →"}
        </button>
      </div>
    </div>
  );
}
