import { createFileRoute } from "@tanstack/react-router";
import { MissionHubShell, MhCard } from "@/components/mission-hub/Shell";

export const Route = createFileRoute("/mission-hub/twbc-drone-approval")({
  component: ApprovalPage,
});

function ApprovalPage() {
  return (
    <MissionHubShell title="Approval">
      <MhCard className="p-8 text-center">
        <div className="text-white text-lg mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500 }}>
          Approval
        </div>
        <p className="text-[13px] text-white/50">Design review and approval workflow management. Coming soon.</p>
      </MhCard>
    </MissionHubShell>
  );
}
