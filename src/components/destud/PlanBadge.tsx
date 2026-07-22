import { C, MONO } from "./theme";
import type { DestudTier } from "@/lib/destud-auth";

const LABEL: Record<DestudTier, string> = {
  explorer: "Explorer",
  engineer: "Engineer",
};

export function PlanBadge({ tier }: { tier: DestudTier }) {
  const isEngineer = tier === "engineer";
  return (
    <span
      style={{
        font: `600 10px/1 ${MONO}`, letterSpacing: ".1em", textTransform: "uppercase",
        color: isEngineer ? "#0A0A0A" : C.amber,
        background: isEngineer ? C.amber : `${C.amber}1A`,
        border: `1px solid ${C.amber}44`,
        padding: "5px 9px", borderRadius: 999,
      }}
    >
      {LABEL[tier]}
    </span>
  );
}
