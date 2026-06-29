import { createFileRoute, Link } from "@tanstack/react-router";
import { Rocket, ArrowRight } from "lucide-react";
import { SectionWrapper } from "@/components/SectionWrapper";
import { VerticalCard } from "@/components/VerticalCard";
import { VERTICALS } from "@/constants/verticals.constants";

export const Route = createFileRoute("/_layout/industries")({
  component: IndustriesPage,
});

function IndustriesPage() {
  return (
    <SectionWrapper id="verticals" eyebrow="Industries" title="Built for multiple industries">
      <p className="text-muted-foreground max-w-3xl">
        Six focused service lines, one unified aerospace and AI platform underneath.
      </p>
      <div className="mt-10 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {VERTICALS.map((v) => (
          <VerticalCard key={v.title} {...v} />
        ))}

        <div className="rounded-2xl p-6 bg-gradient-primary text-primary-foreground shadow-soft flex flex-col justify-between">
          <div>
            <Rocket className="h-6 w-6" aria-hidden="true" />
            <h3 className="mt-4 text-xl font-display font-semibold">One platform. Many missions.</h3>
            <p className="mt-2 text-sm opacity-90">
              Every vertical shares the same modular autonomous aerial platform, data, and AI stack — engineered once, deployed everywhere.
            </p>
          </div>
          <Link
            to="/technology"
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium hover:gap-2.5 transition-all"
          >
            See the stack <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </SectionWrapper>
  );
}
