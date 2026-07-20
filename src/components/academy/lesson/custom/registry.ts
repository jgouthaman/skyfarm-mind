import type { ComponentType } from "react";
import { ReynoldsFormulaCalculator } from "./ReynoldsFormulaCalculator";

// Maps a slide's `{ type: "custom", component: "<key>" }` block to the
// lesson-specific interactive component that renders it. Add new
// hand-built slide components here as they're authored.
export const academyCustomSlideComponents: Record<string, ComponentType<{ props?: Record<string, unknown> }>> = {
  ReynoldsFormulaCalculator,
};
