import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { getVehicleType } from "@/constants/vehicleTypes.constants";
import type {
  VehicleTypeRecommendation, ActiveVehicleTypeSlug, Factor,
} from "@/lib/intelligence/vehicleTypeRecommender";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recommendation: VehicleTypeRecommendation;
}

// Each of the 3 active types has exactly one condition in gateSurvivors()
// that can ever remove it, so a static per-type sentence is accurate — no
// need to re-derive the numeric thresholds here.
const GATE_REASON: Record<ActiveVehicleTypeSlug, string> = {
  "fixed-wing": "this mission requires hovering, which fixed-wing can't do",
  "multirotor": "the mission range is beyond what a multirotor can realistically cover",
  "vtol-hybrid": "this mission is too short in both range and endurance to justify VTOL's added complexity",
};

const CONFIDENCE_COLOR: Record<"high" | "medium" | "low", string> = {
  high: "text-emerald-400",
  medium: "text-amber-400",
  low: "text-red-400",
};

function topFactors(factors: Factor[], n = 2): Factor[] {
  return [...factors].sort((a, b) => Math.abs(b.points) - Math.abs(a.points)).slice(0, n);
}

function buildConfidenceSentence(
  confidence: "high" | "medium" | "low",
  scoreGap: number | null,
  unsureCount: number,
): string {
  if (scoreGap === null) {
    return "Only one platform type survived your mission answers (hover requirement and range), so there was nothing left to compare it against — that's as confident as this recommendation gets.";
  }

  const pt = (n: number) => `${n} point${n === 1 ? "" : "s"}`;
  const gapClause = `the top two options scored within ${pt(scoreGap)} of each other`;
  const unsureClause = unsureCount > 0 ? `you were unsure about ${unsureCount} of 2 key questions` : null;

  if (confidence === "high") {
    return `The top option beat the runner-up by ${pt(scoreGap)}${
      unsureCount === 0 ? ", and you answered both key questions confidently" : ""
    } — that's enough separation for a confident recommendation.`;
  }
  if (confidence === "medium") {
    return `The top option is still favoured, but the runner-up wasn't far behind (a gap of ${pt(scoreGap)}) — worth comparing both before committing.`;
  }

  const sentence = unsureClause ? `${gapClause}, and ${unsureClause}` : gapClause;
  return `${sentence.charAt(0).toUpperCase()}${sentence.slice(1)} — that's not enough separation for a confident recommendation.`;
}

export function VehicleTypeReasonModal({ open, onOpenChange, recommendation }: Props) {
  const { confidence, confidenceExplanation, allResults, type: winnerType } = recommendation;
  if (!confidence) return null;

  const winnerLabel = getVehicleType(winnerType ?? "")?.label ?? winnerType ?? "";
  const sentence = buildConfidenceSentence(
    confidence,
    confidenceExplanation.scoreGap,
    confidenceExplanation.unsureCount,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-[#0f1524] border-white/15 text-white sm:rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-white">Why this recommendation?</DialogTitle>
          <DialogDescription className="sr-only">
            Detailed scoring breakdown behind this platform type recommendation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <section className="space-y-1.5">
            <p className={`text-[11px] uppercase tracking-widest font-medium ${CONFIDENCE_COLOR[confidence]}`}>
              Why {confidence} confidence
            </p>
            <p className="text-sm text-white/70 leading-relaxed">{sentence}</p>
          </section>

          <section className="space-y-2.5">
            <p className="text-[11px] uppercase tracking-widest text-white/30 font-medium">
              Why {winnerLabel} and not the others
            </p>
            <div className="space-y-2.5">
              {allResults.map((entry) => {
                const label = getVehicleType(entry.type)?.label ?? entry.type;
                const isWinner = entry.type === winnerType;
                return (
                  <div
                    key={entry.type}
                    className={`rounded-xl border p-3.5 space-y-1.5 ${
                      isWinner ? "border-blue-500/40 bg-blue-500/5" : "border-white/10 bg-white/[0.03]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-white">{label}</span>
                      {!entry.gated && (
                        <span className="text-xs text-white/40">Score: {entry.score}</span>
                      )}
                    </div>

                    {entry.gated ? (
                      <p className="text-xs text-red-400/80">
                        Ruled out — {GATE_REASON[entry.type]}
                      </p>
                    ) : entry.factors.length > 0 ? (
                      <ul className="space-y-0.5">
                        {topFactors(entry.factors).map((f, i) => (
                          <li
                            key={i}
                            className={`text-xs ${f.points >= 0 ? "text-emerald-400/80" : "text-red-400/80"}`}
                          >
                            {f.points >= 0 ? "+" : ""}{f.points} · {f.label}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-white/30">No scoring factors applied.</p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
