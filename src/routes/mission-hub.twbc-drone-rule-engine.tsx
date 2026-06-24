import { createFileRoute } from "@tanstack/react-router";
import { MissionHubShell, MhCard } from "@/components/mission-hub/Shell";

export const Route = createFileRoute("/mission-hub/twbc-drone-rule-engine")({
  component: RuleEnginePage,
});

function RuleEnginePage() {
  return (
    <MissionHubShell title="Rule Engine">
      <MhCard className="p-8 text-center">
        <div className="text-white text-lg mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500 }}>
          Rule Engine
        </div>
        <p className="text-[13px] text-white/50">Automated design rule evaluation and constraint checking. Coming soon.</p>
      </MhCard>
    </MissionHubShell>
  );
}
