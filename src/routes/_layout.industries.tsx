import { createFileRoute, Link } from "@tanstack/react-router";
import { Rocket, ArrowRight } from "lucide-react";
import { SectionWrapper } from "@/components/SectionWrapper";
import { VerticalCard } from "@/components/VerticalCard";
import { VERTICALS } from "@/constants/verticals.constants";

export const Route = createFileRoute("/_layout/industries")({
  component: IndustriesPage,
});

// This grid shows the actual industry verticals only — TorqWings Labs (R&D)
// and TorqWings Academy (Training) have their own dedicated nav entries and
// pages, they just don't get a card here.
const INDUSTRY_CARDS = VERTICALS.filter(
  (v) => v.title !== "TorqWings Labs" && v.title !== "TorqWings Academy",
);

function IndustriesPage() {
  return (
    <SectionWrapper id="verticals" eyebrow="Industries" title="Built for multiple industries">
      <p className="text-muted-foreground max-w-3xl">
        Four focused service lines, one unified aerospace and AI platform underneath.
      </p>

      <div className="mt-10 rounded-2xl p-6 md:p-8 bg-gradient-primary text-primary-foreground shadow-soft flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="flex items-start gap-4">
          <Rocket className="h-6 w-6 shrink-0" aria-hidden="true" />
          <div>
            <h3 className="text-xl font-display font-semibold">One platform. Many missions.</h3>
            <p className="mt-2 text-sm opacity-90 max-w-2xl">
              Every vertical shares the same modular autonomous aerial platform, data, and AI stack — engineered once, deployed everywhere.
            </p>
          </div>
        </div>
        <Link
          to="/technology"
          className="inline-flex items-center gap-1.5 text-sm font-medium hover:gap-2.5 transition-all shrink-0"
        >
          See the stack <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-5">
        {INDUSTRY_CARDS.map((v) => (
          <VerticalCard key={v.title} {...v} />
        ))}
      </div>
    </SectionWrapper>
  );
}
