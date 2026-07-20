import type { RichText } from "@/lib/academy/lesson-schema";
import { RichTextView } from "./BlockRenderer";

// Compact one-line banner at the top of the lesson summarizing what the
// learner will be able to do by the end — visually distinct (blue-tinted)
// from the five CalloutBlock variants, since it's a lesson-level field
// rather than a content block.
export function MissionBrief({ text }: { text: RichText }) {
  return (
    <p className="lv-missionbrief">
      <span className="lv-h">Mission brief:</span>
      <span><RichTextView nodes={text} /></span>
    </p>
  );
}
