import type { Lesson } from "@/lib/academy/lesson-schema";
import { lowReynoldsNumberAerodynamicsLesson } from "./low-reynolds-number-aerodynamics";
import { flowBehaviourAtLowReynoldsNumberLesson } from "./flow-behaviour-at-low-reynolds-number";
import { airfoilSelectionAtLowReynoldsNumberLesson } from "./airfoil-selection-at-low-reynolds-number";
import { propellerRotorAerodynamicsAtLowReLesson } from "./propeller-rotor-aerodynamics-at-low-re";
import { designImplicationsForAutonomousPlatformsLesson } from "./design-implications-for-autonomous-platforms";
import { whyStructuresDontScaleDownSimplyLesson } from "./why-structures-dont-scale-down-simply";
import { materialBehaviorAtSmallScaleLesson } from "./material-behavior-at-small-scale";
import { structuralMemberDesignLesson } from "./structural-member-design";
import { landingGearImpactStructuresLesson } from "./landing-gear-impact-structures";
import { designImplicationsMiniaturizedAirframesLesson } from "./design-implications-miniaturized-airframes";

export function normalizeSectionTitle(title: string): string {
  return title.trim().toLowerCase();
}

// Maps an academy_module_sections.title to a hand-authored slide-deck
// Lesson, so the module player renders the slide deck for that section
// instead of generating AI content for it.
//
// Module 1 ("Low Reynolds Number Aerodynamics") — first five content
// sections, authored because their AI-generated markdown was rendering
// tables as raw pipe text and duplicating the hero title.
// propellerRotorAerodynamicsAtLowReLesson's last three chapters and
// designImplicationsForAutonomousPlatformsLesson's closing checklist
// chapter were authored from standard references/synthesis rather than
// supplied source text — see each file's header comment for what to
// double-check.
//
// Module 2 ("Miniaturized Structural Design") — all five content sections
// were fully authored from standard structural-engineering references (no
// source text was supplied for this module at all). Its DB section rows
// are seeded by supabase/migrations/20260721000000_academy_module2_
// structural_design_sections.sql — that migration must be applied for
// these titles to exist in academy_module_sections in the first place.
export const authoredLessonsBySectionTitle: Record<string, Lesson> = {
  [normalizeSectionTitle("What is Reynolds Number?")]: lowReynoldsNumberAerodynamicsLesson,
  [normalizeSectionTitle("Flow Behaviour at Low Reynolds Number")]: flowBehaviourAtLowReynoldsNumberLesson,
  [normalizeSectionTitle("Airfoil Selection at Low Reynolds Number")]: airfoilSelectionAtLowReynoldsNumberLesson,
  [normalizeSectionTitle("Propeller & Rotor Aerodynamics at Low Re")]: propellerRotorAerodynamicsAtLowReLesson,
  [normalizeSectionTitle("Design Implications for Autonomous Platforms")]: designImplicationsForAutonomousPlatformsLesson,
  [normalizeSectionTitle("Why Structures Don't Scale Down Simply")]: whyStructuresDontScaleDownSimplyLesson,
  [normalizeSectionTitle("Material Behavior at Small Scale")]: materialBehaviorAtSmallScaleLesson,
  [normalizeSectionTitle("Structural Member Design: Spars, Skins & Load Paths")]: structuralMemberDesignLesson,
  [normalizeSectionTitle("Landing Gear & Impact Structures for Small UAVs")]: landingGearImpactStructuresLesson,
  [normalizeSectionTitle("Design Implications for Miniaturized Airframes")]: designImplicationsMiniaturizedAirframesLesson,
};
