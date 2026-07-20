// JSON schema for the hand-authored, chapter-linked quiz demo — parallel to
// lesson-schema.ts. Distinct from the two existing quiz shapes in the app:
// GeneratedQuestion (AI-generated per attempt, one explanation string, no
// fixed chapter identity) and the inline SlideBlock "quickCheck" (single
// question embedded in its own chapter, no explanation at all). Neither
// carries per-option reasoning or a chapter reference, which this needs for
// the result screen's "Review: [chapter]" links.

export interface QuizAnswerOption {
  id: string;
  text: string;
  /** Shown once this option is selected — explains why it's right or wrong. */
  reasoning: string;
}

export interface QuizQuestion {
  id: string;
  /** Matching Slide.id in the paired Lesson — powers "Review: [chapter]" on the result screen. */
  chapterId: string;
  chapterTitle: string;
  question: string;
  /** 2-4 word summary for the condensed result row, e.g. "the force ratio". */
  shortLabel: string;
  options: QuizAnswerOption[];
  correctOptionId: string;
}

export interface Quiz {
  id: string;
  /** Lesson.id this quiz pairs with. */
  lessonId: string;
  title: string;
  /** Absolute number of correct answers required to pass — not a percentage,
   *  matching the existing QUIZ_PASS_MARK/PASS_MARK convention elsewhere in academy. */
  passThreshold: number;
  questions: QuizQuestion[];
}
