import type { Lesson } from "@/lib/academy/lesson-schema";
import { lowReynoldsNumberAerodynamicsLesson } from "./low-reynolds-number-aerodynamics";

export function normalizeSectionTitle(title: string): string {
  return title.trim().toLowerCase();
}

// Maps an academy_module_sections.title to a hand-authored slide-deck
// Lesson. The real "Low Reynolds Number Aerodynamics" module's first
// content section is titled "What is Reynolds Number?" — its topic_brief
// covers exactly the formula/intuition/regime/worked-example content this
// lesson ports from the design template, so the module player renders the
// slide deck for that section instead of generating AI content for it.
export const authoredLessonsBySectionTitle: Record<string, Lesson> = {
  [normalizeSectionTitle("What is Reynolds Number?")]: lowReynoldsNumberAerodynamicsLesson,
};
