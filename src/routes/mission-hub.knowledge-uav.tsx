import { createFileRoute } from "@tanstack/react-router";
import { MissionHubShell, MhCard } from "@/components/mission-hub/Shell";

export const Route = createFileRoute("/mission-hub/knowledge-uav")({
  component: UAVPage,
});

function UAVPage() {
  return (
    <MissionHubShell title="UAV">
      <MhCard className="p-8 text-center">
        <div className="text-white text-lg mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500 }}>
          UAV Knowledge Center
        </div>
        <p className="text-[13px] text-white/50">
          Unmanned aerial vehicle guides, regulations, and operational resources. Coming soon.
        </p>
      </MhCard>
    </MissionHubShell>
  );
}
