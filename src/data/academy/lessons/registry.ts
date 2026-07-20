import type { Lesson } from "@/lib/academy/lesson-schema";
import { lowReynoldsNumberAerodynamicsLesson } from "./low-reynolds-number-aerodynamics";
import { flowBehaviourAtLowReynoldsNumberLesson } from "./flow-behaviour-at-low-reynolds-number";
import { airfoilSelectionAtLowReynoldsNumberLesson } from "./airfoil-selection-at-low-reynolds-number";

export function normalizeSectionTitle(title: string): string {
  return title.trim().toLowerCase();
}

// Maps an academy_module_sections.title to a hand-authored slide-deck
// Lesson, so the module player renders the slide deck for that section
// instead of generating AI content for it. Module 1's first three content
// sections are authored here, all for the same reason: their AI-generated
// markdown was rendering tables as raw pipe text and duplicating the hero
// title.
export const authoredLessonsBySectionTitle: Record<string, Lesson> = {
  [normalizeSectionTitle("What is Reynolds Number?")]: lowReynoldsNumberAerodynamicsLesson,
  [normalizeSectionTitle("Flow Behaviour at Low Reynolds Number")]: flowBehaviourAtLowReynoldsNumberLesson,
  [normalizeSectionTitle("Airfoil Selection at Low Reynolds Number")]: airfoilSelectionAtLowReynoldsNumberLesson,
};
