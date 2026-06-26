import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { SectionWrapper } from "@/components/SectionWrapper";
import { Card } from "@/components/Card";
import { IconBubble } from "@/components/IconBubble";
import { PILOT_PROGRAMS, TEAM_CAPABILITIES } from "@/constants/solutions.constants";

export const Route = createFileRoute("/_layout/pilots")({
  component: PilotsPage,
});

function PilotsPage() {
  return (
    <>
      <SectionWrapper id="pilots" eyebrow="Work with us" title="Pilot programs and partnerships" muted>
        <p className="text-muted-foreground max-w-3xl">
          TorqWings is building pilot programs with agriculture farms, infrastructure owners, drone operators,
          academic institutions, FPOs, and industry partners.
        </p>
        <div className="mt-10 grid md:grid-cols-3 gap-5">
          {PILOT_PROGRAMS.map((p) => (
            <Card key={p.title}>
              <div className="flex items-center justify-between">
                <IconBubble tone={p.tone}>{p.icon}</IconBubble>
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{p.tag}</span>
              </div>
              <h3 className="mt-4 text-lg font-semibold">{p.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{p.desc}</p>
              <Link
                to="/contact"
                className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:gap-2.5 transition-all"
              >
                Apply for pilot <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Card>
          ))}
        </div>
      </SectionWrapper>

      <SectionWrapper id="team" eyebrow="Team" title="Built by aerospace and software engineering minds">
        <p className="text-muted-foreground max-w-3xl">
          TorqWings brings together aerospace engineers, software engineering, AI, drone systems, and
          field-domain expertise to build practical aerial intelligence solutions for real-world industries.
        </p>
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {TEAM_CAPABILITIES.map((c) => (
            <Card key={c.text} className="flex-row items-center gap-4 flex">
              <IconBubble>{c.icon}</IconBubble>
              <p className="font-medium">{c.text}</p>
            </Card>
          ))}
        </div>
      </SectionWrapper>
    </>
  );
}
