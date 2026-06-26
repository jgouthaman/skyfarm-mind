import { createFileRoute } from "@tanstack/react-router";
import { SectionWrapper } from "@/components/SectionWrapper";
import { Card } from "@/components/Card";
import { IconBubble } from "@/components/IconBubble";
import { PROBLEM_CARDS, SOLUTION_CARDS } from "@/constants/solutions.constants";

export const Route = createFileRoute("/_layout/solutions")({
  component: SolutionsPage,
});

function SolutionsPage() {
  return (
    <>
      <SectionWrapper id="problem" eyebrow="The problem" title="Industries need smarter aerial visibility">
        <p className="text-muted-foreground max-w-3xl">
          Many industries still depend on manual inspection, delayed field reporting, fragmented data collection,
          and expensive monitoring workflows. From farms to infrastructure sites, decision-makers need faster,
          safer, and more intelligent aerial insights.
        </p>
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {PROBLEM_CARDS.map((c) => (
            <Card key={c.text}>
              <IconBubble>{c.icon}</IconBubble>
              <p className="mt-4 font-medium">{c.text}</p>
            </Card>
          ))}
        </div>
      </SectionWrapper>

      <SectionWrapper id="solutions" eyebrow="The solution" title="Drones, data, and intelligence in one platform" muted>
        <p className="text-muted-foreground max-w-3xl">
          TorqWings combines aerospace engineering, custom UAV systems, aerial imaging, AI analytics, and
          domain-specific workflows to convert drone missions into actionable business intelligence.
        </p>
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {SOLUTION_CARDS.map((c) => (
            <Card key={c.text}>
              <IconBubble>{c.icon}</IconBubble>
              <h3 className="mt-4 text-lg font-semibold">{c.text}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{c.desc}</p>
            </Card>
          ))}
        </div>
      </SectionWrapper>
    </>
  );
}
