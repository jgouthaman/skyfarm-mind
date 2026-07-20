// Shared progress/grid logic for the module player. This is the same
// frontier rule the old stacked-list page used (sections before the first
// incomplete one are done, the first incomplete one is current, everything
// after is locked) — factored out so the grid page and the lesson/quiz
// routes compute identical lock state instead of each re-deriving it.
import type { AcademyModuleSection } from "@/lib/academy-auth";

export interface SectionState {
  section: AcademyModuleSection;
  index: number;
  isComplete: boolean;
  isCurrent: boolean;
  isLocked: boolean;
}

export function computeSectionStates(
  sections: AcademyModuleSection[],
  completedIds: Set<string>,
): SectionState[] {
  const firstIncomplete = sections.findIndex((s) => !completedIds.has(s.id));
  const frontier = firstIncomplete === -1 ? sections.length : firstIncomplete;
  return sections.map((section, index) => ({
    section,
    index,
    isComplete: completedIds.has(section.id),
    isCurrent: index === frontier,
    isLocked: index > frontier,
  }));
}

export function nextContentLabel(sections: AcademyModuleSection[], index: number): string {
  const next = sections[index + 1];
  if (!next) return "Continue";
  if (next.section_type === "quiz") return "Continue to Quiz";
  if (next.section_type === "final_test") return "Continue to Final Assessment";
  return "Continue";
}

export interface ModuleGridRow {
  rowIndex: number;
  lesson: SectionState | null;
  quiz: SectionState | null;
}

export interface ModuleGrid {
  rows: ModuleGridRow[];
  finalTest: SectionState | null;
}

// Lesson/quiz cells are paired by grid position (1st content section next to
// 1st quiz section, etc.) — that's purely a layout pairing. Lock state for
// each cell still comes from its own position in the linear order_index
// sequence above, so a quiz can be locked even while it sits next to an
// already-unlocked lesson.
export function buildModuleGrid(states: SectionState[]): ModuleGrid {
  const lessons = states.filter((s) => s.section.section_type === "content");
  const quizzes = states.filter((s) => s.section.section_type === "quiz");
  const finalTest = states.find((s) => s.section.section_type === "final_test") ?? null;
  const rowCount = Math.max(lessons.length, quizzes.length);
  const rows: ModuleGridRow[] = Array.from({ length: rowCount }, (_, i) => ({
    rowIndex: i,
    lesson: lessons[i] ?? null,
    quiz: quizzes[i] ?? null,
  }));
  return { rows, finalTest };
}

export type PairStatus = "locked" | "current" | "complete";

// Composes the pair's card-level accent from its two children's states
// (lesson always precedes its quiz in order_index) instead of tracking a
// separate "pair" state: locked while the lesson hasn't been reached yet,
// complete once both sides are done, current for everything in between —
// including "lesson done, quiz not reached/finished yet".
export function pairStatus(lesson: SectionState | null, quiz: SectionState | null): PairStatus {
  const primary = lesson ?? quiz;
  if (!primary || primary.isLocked) return "locked";
  const lessonDone = lesson ? lesson.isComplete : true;
  const quizDone = quiz ? quiz.isComplete : true;
  return lessonDone && quizDone ? "complete" : "current";
}
