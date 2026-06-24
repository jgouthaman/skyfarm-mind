import { createFileRoute } from "@tanstack/react-router";
import { MissionHubShell, MhCard } from "@/components/mission-hub/Shell";

export const Route = createFileRoute("/mission-hub/twbc-drone-reasoning-api")({
  component: ReasoningApiPage,
});

function ReasoningApiPage() {
  return (
    <MissionHubShell title="Reasoning API">
      <MhCard className="p-8 text-center">
        <div className="text-white text-lg mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500 }}>
          Reasoning API
        </div>
        <p className="text-[13px] text-white/50">AI-driven design reasoning and recommendation API layer. Coming soon.</p>
      </MhCard>
    </MissionHubShell>
  );
}
