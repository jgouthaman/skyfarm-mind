import { useState } from "react";
import { X } from "lucide-react";
import type { Quiz } from "@/lib/academy/quiz-schema";

export type QuizAnswers = Record<string, string>;

// Forward-only, one question at a time, self-contained: the card owns its
// own close/eyebrow/counter header and progress bar rather than relying on
// page-level chrome for progress. Once an option is picked it's locked in
// (no re-selecting, no back button) — immediate feedback shows on the
// option itself plus a one-line reasoning note before "Next question"
// becomes available.
export function QuizFlow({
  quiz, onFinish, onClose,
}: {
  quiz: Quiz;
  onFinish: (answers: QuizAnswers) => void;
  onClose: () => void;
}) {
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswers>({});
  const [selected, setSelected] = useState<string | null>(null);

  const question = quiz.questions[qIndex];
  const isLast = qIndex === quiz.questions.length - 1;
  const isCorrect = selected === question.correctOptionId;
  const selectedOption = selected ? question.options.find((o) => o.id === selected) ?? null : null;
  const correctOption = question.options.find((o) => o.id === question.correctOptionId) ?? null;
  const progressPct = ((qIndex + (selected ? 1 : 0)) / quiz.questions.length) * 100;

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
        <div className="lv-quiz-head">
          <button type="button" className="lv-quiz-close" onClick={onClose} aria-label="Close quiz">
            <X size={16} />
          </button>
          <p className="lv-quiz-eyebrow">Test Your Knowledge</p>
          <span className="lv-quiz-counter">Question {qIndex + 1} of {quiz.questions.length}</span>
        </div>
        <div className="lv-quiz-track">
          <span className="lv-quiz-track-fill" style={{ width: `${progressPct}%` }} />
        </div>

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
                <span className="lv-quiz-opt-dot">
                  {revealed && isOptCorrect && "✓"}
                  {revealed && isSelected && !isOptCorrect && "✕"}
                </span>
                <span>{opt.text}</span>
              </button>
            );
          })}
        </div>

        {selected && (
          <div className={`lv-quiz-reasoning ${isCorrect ? "lv-quiz-reasoning-ok" : "lv-quiz-reasoning-bad"}`}>
            <p>
              <strong>{isCorrect ? "Correct." : "Not quite."}</strong> {selectedOption?.reasoning}
            </p>
            {!isCorrect && correctOption && (
              <p className="lv-quiz-correct-answer">Correct answer: {correctOption.text}</p>
            )}
          </div>
        )}

        <button
          type="button"
          className="lv-btn lv-primary"
          style={{ width: "100%", marginTop: 16 }}
          disabled={!selected}
          onClick={next}
        >
          {isLast ? "See results →" : "Next question →"}
        </button>
      </div>
    </div>
  );
}
