import { createFileRoute } from "@tanstack/react-router";
import { MissionHubShell, MhCard } from "@/components/mission-hub/Shell";

export const Route = createFileRoute("/mission-hub/twbc-drone-feedback")({
  component: FeedbackPage,
});

function FeedbackPage() {
  return (
    <MissionHubShell title="Feedback">
      <MhCard className="p-8 text-center">
        <div className="text-white text-lg mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500 }}>
          Feedback
        </div>
        <p className="text-[13px] text-white/50">Collect and track design feedback and iteration notes. Coming soon.</p>
      </MhCard>
    </MissionHubShell>
  );
}
