import { createFileRoute } from "@tanstack/react-router";
import { MissionHubShell, MhCard } from "@/components/mission-hub/Shell";

export const Route = createFileRoute("/mission-hub/twbc-drone-design-score")({
  component: DesignScorePage,
});

function DesignScorePage() {
  return (
    <MissionHubShell title="Design Score">
      <MhCard className="p-8 text-center">
        <div className="text-white text-lg mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500 }}>
          Design Score
        </div>
        <p className="text-[13px] text-white/50">Automated quality and safety scoring for drone designs. Coming soon.</p>
      </MhCard>
    </MissionHubShell>
  );
}
