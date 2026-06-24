import { createFileRoute } from "@tanstack/react-router";
import { MissionHubShell, MhCard } from "@/components/mission-hub/Shell";

export const Route = createFileRoute("/mission-hub/twbc-drone-similarity-search")({
  component: SimilaritySearchPage,
});

function SimilaritySearchPage() {
  return (
    <MissionHubShell title="Similarity Search">
      <MhCard className="p-8 text-center">
        <div className="text-white text-lg mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500 }}>
          Similarity Search
        </div>
        <p className="text-[13px] text-white/50">Find similar drone designs using vector-based semantic search. Coming soon.</p>
      </MhCard>
    </MissionHubShell>
  );
}
