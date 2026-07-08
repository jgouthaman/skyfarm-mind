import { createFileRoute } from "@tanstack/react-router";
import { SectionWrapper } from "@/components/SectionWrapper";
import { Card } from "@/components/Card";
import { IconBubble } from "@/components/IconBubble";
import {
  SCIENCE_PROBLEM_CARDS, SCIENCE_SOLUTION_CARDS,
  PROBLEM_CARDS, SOLUTION_CARDS,
} from "@/constants/solutions.constants";

export const Route = createFileRoute("/_layout/solutions")({
  component: SolutionsPage,
});

function SolutionsPage() {
  return (
    <>
      <SectionWrapper
        id="science-problem"
        eyebrow="The science problem"
        title="Aerial Platform Engineering Is Still Guesswork, Not Science"
      >
        <p className="text-muted-foreground max-w-3xl">
          Published research on UAV platform selection exists — decision science, weighted criteria models,
          regulatory frameworks. Almost none of it reaches the people actually specifying missions. Platform
          choices get made on vendor familiarity, not evidence.
        </p>
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {SCIENCE_PROBLEM_CARDS.map((c) => (
            <Card key={c.text}>
              <IconBubble>{c.icon}</IconBubble>
              <p className="mt-4 font-medium">{c.text}</p>
              <p className="mt-1.5 text-sm text-muted-foreground">{c.desc}</p>
            </Card>
          ))}
        </div>
      </SectionWrapper>

      <SectionWrapper id="problem" eyebrow="The problem" title="Industries Need Smarter Aerial Visibility" muted>
        <p className="text-muted-foreground max-w-3xl">
          Many industries still depend on manual inspection, delayed field reporting, fragmented data collection,
          and expensive monitoring workflows. From farms to infrastructure sites, decision-makers need faster,
          safer, and more intelligent aerial insights — built on platforms designed for the mission, not adapted
          from consumer hardware.
        </p>
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {PROBLEM_CARDS.map((c) => (
            <Card key={c.text}>
              <IconBubble>{c.icon}</IconBubble>
              <p className="mt-4 font-medium">{c.text}</p>
              <p className="mt-1.5 text-sm text-muted-foreground">{c.desc}</p>
            </Card>
          ))}
        </div>
      </SectionWrapper>

      <SectionWrapper
        id="science-solution"
        eyebrow="The science"
        title="An Engineering Studio, Not a Sales Configurator"
      >
        <p className="text-muted-foreground max-w-3xl">
          TorqWings codifies published aerospace decision science — gate-then-score selection models,
          regulatory-anchored thresholds, MCDM-informed weighting — into a Design Studio that shows its
          reasoning, not just its answer.
        </p>
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {SCIENCE_SOLUTION_CARDS.map((c) => (
            <Card key={c.text}>
              <IconBubble>{c.icon}</IconBubble>
              <h3 className="mt-4 text-lg font-semibold">{c.text}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{c.desc}</p>
            </Card>
          ))}
        </div>
      </SectionWrapper>

      <SectionWrapper id="solutions" eyebrow="The solution" title="Design. Simulate. Deploy. Intelligent." muted>
        <p className="text-muted-foreground max-w-3xl">
          TorqWings combines autonomous aerial platform design, AI-powered flight intelligence, and domain-specific
          engineering to convert mission requirements into deployable aerial systems — validated by simulation
          before a single component is ordered.
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
