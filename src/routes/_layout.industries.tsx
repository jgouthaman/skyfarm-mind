import { createFileRoute, Link } from "@tanstack/react-router";
import { Rocket, ArrowRight } from "lucide-react";
import { SectionWrapper } from "@/components/SectionWrapper";
import { VerticalCard } from "@/components/VerticalCard";
import { VERTICALS } from "@/constants/verticals.constants";
import { OG_IMAGE_URL, absoluteUrl } from "@/lib/siteConfig";

// Found while auditing every public route for the SEO fix — see the same
// note in _layout.agrisky.tsx.
const TITLE = "Industries | Aerial Intelligence for Every Sector | TorqWings";
const DESCRIPTION = "Four focused service lines, one unified aerospace and AI platform underneath — built for agriculture, infrastructure, mapping and surveillance.";

export const Route = createFileRoute("/_layout/industries")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:image", content: OG_IMAGE_URL },
      { property: "og:type", content: "website" },
      { property: "og:url", content: absoluteUrl("/industries") },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
      { name: "twitter:image", content: OG_IMAGE_URL },
    ],
    links: [{ rel: "canonical", href: absoluteUrl("/industries") }],
  }),
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
            <h2 className="text-xl font-display font-semibold">One platform. Many missions.</h2>
            <p className="mt-2 text-sm opacity-90 max-w-2xl">
              Every vertical shares the same modular autonomous aerial platform, data, and AI stack — engineered once, deployed everywhere.
            </p>
          </div>
        </div>
        <Link
          to="/the-hangar"
          className="inline-flex items-center gap-1.5 text-sm font-medium hover:gap-2.5 transition-all shrink-0"
        >
          See the stack in The Hangar <ArrowRight className="h-4 w-4" aria-hidden="true" />
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
