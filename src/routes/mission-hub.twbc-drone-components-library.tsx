import { createFileRoute } from "@tanstack/react-router";
import { MissionHubShell, MhCard } from "@/components/mission-hub/Shell";

export const Route = createFileRoute("/mission-hub/twbc-drone-components-library")({
  component: ComponentsLibraryPage,
});

function ComponentsLibraryPage() {
  return (
    <MissionHubShell title="Components Library">
      <MhCard className="p-8 text-center">
        <div className="text-white text-lg mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500 }}>
          Components Library
        </div>
        <p className="text-[13px] text-white/50">Curated drone component catalogue with specs and sourcing. Coming soon.</p>
      </MhCard>
    </MissionHubShell>
  );
}
