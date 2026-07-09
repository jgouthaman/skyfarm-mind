import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, ShieldCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FloatingCard } from "@/components/FloatingCard";
import { SectionBadge } from "@/components/SectionBadge";
import { gradientTextStyle } from "@/constants/styles.constants";
import heroImg from "@/assets/torqwings-hero.jpg";

export const Route = createFileRoute("/_layout/")({
  head: () => ({
    meta: [
      { property: "og:title", content: "TorqWings — Aerospace & Drone Intelligence" },
      { property: "og:description", content: "Custom UAV engineering and AI aerial analytics across agriculture, infrastructure, mapping, surveillance and R&D." },
      { property: "og:image", content: heroImg },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/" },
    ],
    links: [
      { rel: "canonical", href: "/" },
      { rel: "preload", as: "image", href: heroImg, fetchpriority: "high" },
    ],
    scripts: [
      { type: "application/ld+json", children: JSON.stringify({ "@context": "https://schema.org", "@type": "Organization", name: "TorqWings", url: "https://torqwings.com", logo: "https://torqwings.com/app-icon.png", description: "TorqWings builds AI-powered drone systems, custom UAVs, and aerial intelligence solutions." }) },
      { type: "application/ld+json", children: JSON.stringify({ "@context": "https://schema.org", "@type": "Service", name: "AgriSky", serviceType: "Agriculture Drone Intelligence", provider: { "@type": "Organization", name: "TorqWings" }, areaServed: { "@type": "AdministrativeArea", name: "Tamil Nadu, India" }, description: "Drone agriculture services in Tamil Nadu — crop health monitoring, NDVI mapping, irrigation insights, and precision farming for farms, FPOs and SHGs.", keywords: "drone agriculture Tamil Nadu, AgriSky, crop health drone, precision farming Chennai, agri drone services India" }) },
      { type: "application/ld+json", children: JSON.stringify({ "@context": "https://schema.org", "@type": "Service", name: "GuardSky", serviceType: "Aerial Surveillance & Early Fire Response", provider: { "@type": "Organization", name: "TorqWings" }, areaServed: { "@type": "Country", name: "India" }, description: "Drone-based surveillance, smoke and fire detection, and rapid first-response payload deployment for industrial sites, campuses and remote facilities.", keywords: "aerial surveillance drone India, fire detection drone, GuardSky, perimeter security UAV" }) },
      { type: "application/ld+json", children: JSON.stringify({ "@context": "https://schema.org", "@type": "Service", name: "InfraSky", serviceType: "Infrastructure & Industrial Drone Inspection", provider: { "@type": "Organization", name: "TorqWings" }, areaServed: { "@type": "AdministrativeArea", name: "Tamil Nadu, India" }, description: "UAV inspection in Chennai and across India for bridges, telecom towers, solar farms, roads and industrial assets — high-resolution imagery with AI defect detection.", keywords: "UAV inspection Chennai, drone inspection Tamil Nadu, InfraSky, solar farm drone inspection, telecom tower drone survey, bridge inspection drone India" }) },
      { type: "application/ld+json", children: JSON.stringify({ "@context": "https://schema.org", "@type": "EducationalOccupationalProgram", name: "TorqWings Academy", provider: { "@type": "Organization", name: "TorqWings" }, occupationalCategory: "Drone Pilot", areaServed: { "@type": "AdministrativeArea", name: "Tamil Nadu, India" }, description: "Drone pilot training and certification support in Tamil Nadu — agri-drone operations, mapping workflows, mission planning and safety procedures for students, farmers, SHGs and FPOs.", keywords: "drone pilot training Tamil Nadu, drone certification Chennai, agri drone training India, TorqWings Academy" }) },
      { type: "application/ld+json", children: JSON.stringify({ "@context": "https://schema.org", "@type": "LocalBusiness", name: "TorqWings", telephone: "+91 99402 63589", address: { "@type": "PostalAddress", addressCountry: "IN", addressLocality: "India" }, url: "https://torqwings.com", description: "TorqWings builds AI-powered drone systems, custom UAVs, and aerial intelligence solutions." }) },
    ],
  }),
  component: HeroPage,
});

const HERO_STATS = [
  { k: "17",   v: "Target Industries"     },
  { k: "AI",  v: "Analytics core" },
  { k: "R&D", v: "Custom platforms"    },
];

function HeroPage() {
  return (
    <section id="home" className="relative pt-28 lg:pt-36 pb-20 overflow-hidden bg-gradient-hero">
      <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" />
      <div className="mx-auto max-w-7xl px-5 lg:px-8 grid lg:grid-cols-12 gap-10 items-center relative">

        <div className="lg:col-span-6">
          <SectionBadge label="Aerospace · Autonomous Aerial Platforms · AI" />
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.05]">
            Engineering the future of{" "}
            <span className="bg-gradient-primary" style={gradientTextStyle}>
              aerial intelligence
            </span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-xl">
           AI-powered autonomous aerial platforms and aerial intelligence solutions for Agriculture, Infrastructure, Security, Logistics, Urban Surveillance, Aerospace Research and Industrial Applications.
          </p>
          <div className="mt-8">
            <Button asChild size="lg" className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow">
              <Link to="/solutions">Explore Solutions <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" /></Link>
            </Button>
          </div>
          <div className="mt-10 flex gap-8">
            {HERO_STATS.map((s) => (
              <div key={s.v}>
                <div className="text-[22px] font-display font-bold text-foreground">{s.k}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">{s.v}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-6 relative">
          <div className="relative rounded-3xl overflow-hidden shadow-soft border border-border/60">
            <img
              src={heroImg}
              alt="TorqWings drone with AI overlays across agriculture, infrastructure and solar terrain"
              width={1920} height={1080}
              fetchPriority="high" decoding="async"
              className="w-full h-auto"
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-background/60 via-transparent to-transparent" />
          </div>
          <FloatingCard
            className="absolute -left-4 top-8 hidden sm:block"
            icon={<Activity className="h-4 w-4 text-accent" aria-hidden="true" />}
            title="Crop Health" value="NDVI 0.78" tone="agri"
          />
          <FloatingCard
            className="absolute -right-4 bottom-10 hidden sm:block"
            icon={<ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />}
            title="Inspection" value="2 alerts"
          />
        </div>

      </div>
    </section>
  );
}
