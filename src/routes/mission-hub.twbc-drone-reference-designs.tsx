import { createFileRoute } from "@tanstack/react-router";
import { MissionHubShell, MhCard } from "@/components/mission-hub/Shell";

export const Route = createFileRoute("/mission-hub/twbc-drone-reference-designs")({
  component: ReferenceDesignsPage,
});

function ReferenceDesignsPage() {
  return (
    <MissionHubShell title="Reference Designs">
      <MhCard className="p-8 text-center">
        <div className="text-white text-lg mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500 }}>
          Reference Designs
        </div>
        <p className="text-[13px] text-white/50">Industry reference drone architectures. Coming soon.</p>
      </MhCard>
    </MissionHubShell>
  );
}
