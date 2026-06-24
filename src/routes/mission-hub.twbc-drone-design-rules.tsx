import { createFileRoute } from "@tanstack/react-router";
import { MissionHubShell, MhCard } from "@/components/mission-hub/Shell";

export const Route = createFileRoute("/mission-hub/twbc-drone-design-rules")({
  component: DesignRulesPage,
});

function DesignRulesPage() {
  return (
    <MissionHubShell title="Design Rules">
      <MhCard className="p-8 text-center">
        <div className="text-white text-lg mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500 }}>
          Design Rules
        </div>
        <p className="text-[13px] text-white/50">Engineering constraints and design rule sets. Coming soon.</p>
      </MhCard>
    </MissionHubShell>
  );
}
