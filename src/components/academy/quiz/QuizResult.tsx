import { CheckCircle2, RotateCcw, XCircle } from "lucide-react";
import type { Quiz } from "@/lib/academy/quiz-schema";
import type { QuizAnswers } from "./QuizFlow";

// Correct answers collapse to a single line; incorrect ones expand with your
// answer, the correct answer, the reasoning, and a "Review: [chapter]" link
// that hands off to the lesson page (via the chapterId carried on each
// QuizQuestion) so the learner can re-read exactly the section they missed.
export function QuizResult({
  quiz, answers, onRetry, onContinue, onReviewChapter,
}: {
  quiz: Quiz;
  answers: QuizAnswers;
  onRetry: () => void;
  onContinue: () => void;
  onReviewChapter: (chapterId: string) => void;
}) {
  const total = quiz.questions.length;
  const score = quiz.questions.reduce((acc, q) => acc + (answers[q.id] === q.correctOptionId ? 1 : 0), 0);
  const passed = score >= quiz.passThreshold;
  const scorePct = total > 0 ? (score / total) * 100 : 0;

  return (
    <div className="lv-result-shell">
      <div className={`lv-result-score ${passed ? "lv-result-pass" : "lv-result-fail"}`}>
        <div className="lv-result-score-num">{score} / {total}</div>
        <div className="lv-result-score-label">
          {passed ? "Passed" : `Needs ${quiz.passThreshold} of ${total} to pass`}
        </div>
        <div className="lv-result-score-track">
          <span className="lv-result-score-fill" style={{ width: `${scorePct}%` }} />
        </div>
      </div>

      <div className="lv-result-list">
        {quiz.questions.map((q) => {
          const selectedId = answers[q.id];
          const selectedOption = q.options.find((o) => o.id === selectedId) ?? null;
          const correctOption = q.options.find((o) => o.id === q.correctOptionId) ?? null;
          const correct = selectedId === q.correctOptionId;

          if (correct) {
            return (
              <div key={q.id} className="lv-result-item lv-result-correct">
                <div className="lv-result-item-head">
                  <CheckCircle2 size={16} className="lv-result-item-icon" />
                  <div>
                    <p className="lv-result-item-q">{q.question}</p>
                    <p className="lv-result-item-answer">Your answer: {selectedOption?.text}</p>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div key={q.id} className="lv-result-item lv-result-wrong">
              <div className="lv-result-item-head">
                <XCircle size={16} className="lv-result-item-icon" />
                <div>
                  <p className="lv-result-item-q">{q.question}</p>
                </div>
              </div>
              <div className="lv-result-item-body">
                <dl>
                  <div>
                    <dt>Your answer</dt>
                    <dd>{selectedOption?.text ?? "—"}</dd>
                  </div>
                  <div>
                    <dt>Correct answer</dt>
                    <dd>{correctOption?.text}</dd>
                  </div>
                  <div>
                    <dt>Why</dt>
                    <dd>{correctOption?.reasoning}</dd>
                  </div>
                </dl>
                <button
                  type="button"
                  className="lv-result-review-link"
                  onClick={() => onReviewChapter(q.chapterId)}
                >
                  Review: {q.chapterTitle} →
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="lv-result-actions">
        <button type="button" className="lv-btn" onClick={onRetry}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
            <RotateCcw size={14} /> Retry quiz
          </span>
        </button>
        <button
          type="button"
          className="lv-btn lv-primary"
          disabled={!passed}
          onClick={onContinue}
        >
          Continue to next lesson →
        </button>
      </div>
    </div>
  );
}
