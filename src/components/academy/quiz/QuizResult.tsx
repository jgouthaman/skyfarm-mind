import { useState } from "react";
import {
  BookOpen, CheckCircle2, ChevronDown, ChevronUp, RotateCcw, XCircle,
} from "lucide-react";
import type { Quiz } from "@/lib/academy/quiz-schema";
import type { QuizAnswers } from "./QuizFlow";

// Correct answers collapse to a single line. Incorrect ones show a compact
// line plus an always-visible "Review: [chapter]" link (via the chapterId
// carried on each QuizQuestion, handing off to the lesson page), and can be
// expanded for the full your-answer/correct-answer/reasoning detail.
export function QuizResult({
  quiz, answers, onRetry, onContinue, onReviewChapter,
}: {
  quiz: Quiz;
  answers: QuizAnswers;
  onRetry: () => void;
  onContinue: () => void;
  onReviewChapter: (chapterId: string) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const total = quiz.questions.length;
  const score = quiz.questions.reduce((acc, q) => acc + (answers[q.id] === q.correctOptionId ? 1 : 0), 0);
  const passed = score >= quiz.passThreshold;
  const scorePct = total > 0 ? (score / total) * 100 : 0;

  return (
    <div className="lv-result-shell">
      <div className={`lv-result-score ${passed ? "lv-result-pass" : "lv-result-fail"}`}>
        <p className="lv-result-score-label">{passed ? "Quiz complete — passed" : "Quiz complete"}</p>
        <div className="lv-result-score-num">{score} of {total} correct</div>
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
          const expanded = expandedId === q.id;

          if (correct) {
            return (
              <div key={q.id} className="lv-result-item lv-result-correct">
                <div className="lv-result-item-head">
                  <CheckCircle2 size={15} className="lv-result-item-icon" />
                  <span className="lv-result-item-line">{q.chapterTitle} · {q.shortLabel} — correct</span>
                </div>
              </div>
            );
          }

          return (
            <div key={q.id} className="lv-result-item lv-result-wrong">
              <button
                type="button"
                className="lv-result-item-head"
                style={{ width: "100%", background: "transparent", border: "none", font: "inherit", textAlign: "left", cursor: "pointer" }}
                onClick={() => setExpandedId(expanded ? null : q.id)}
                aria-expanded={expanded}
              >
                <XCircle size={15} className="lv-result-item-icon" />
                <span className="lv-result-item-line">{q.chapterTitle} · {q.shortLabel} — incorrect</span>
                {expanded ? <ChevronUp size={14} className="lv-result-item-expand" /> : <ChevronDown size={14} className="lv-result-item-expand" />}
              </button>

              <button type="button" className="lv-result-review-inline" onClick={() => onReviewChapter(q.chapterId)}>
                <BookOpen size={13} /> Review: {q.chapterTitle}
              </button>

              {expanded && (
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
                </div>
              )}
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
        <button type="button" className="lv-btn lv-primary" disabled={!passed} onClick={onContinue}>
          Continue →
        </button>
      </div>
    </div>
  );
}
