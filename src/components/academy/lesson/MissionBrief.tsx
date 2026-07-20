import { Target } from "lucide-react";
import type { RichText } from "@/lib/academy/lesson-schema";
import { RichTextView } from "./BlockRenderer";

// Top-of-lesson banner summarizing what the learner will be able to do by
// the end — visually distinct (blue-tinted) from the five CalloutBlock
// variants, since it's a lesson-level field rather than a content block.
export function MissionBrief({ text }: { text: RichText }) {
  return (
    <div className="lv-missionbrief">
      <div className="lv-ico"><Target size={20} /></div>
      <div>
        <p className="lv-h">Mission brief</p>
        <p><RichTextView nodes={text} /></p>
      </div>
    </div>
  );
}
