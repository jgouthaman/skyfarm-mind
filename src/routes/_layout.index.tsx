import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import heroImg from "@/assets/torqwings-hero-hangar.png";
import { HANGAR_PUBLIC_HEAD_LINKS } from "@/styles/hangarPublicTheme";
import PlatformSection from "@/components/PlatformSection";
import { SITE_URL, OG_IMAGE_URL, absoluteUrl } from "@/lib/siteConfig";

const TITLE = "TorqWings | AI Aerospace Design for UAVs, VTOL & Drones";
const DESCRIPTION = "From mission brief to certified airframe. AI-driven design, simulation and validation for fixed-wing, VTOL, multirotor and stealth platforms. Built in Chennai.";

export const Route = createFileRoute("/_layout/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:image", content: OG_IMAGE_URL },
      { property: "og:type", content: "website" },
      { property: "og:url", content: SITE_URL },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
      { name: "twitter:image", content: OG_IMAGE_URL },
    ],
    links: [
      { rel: "canonical", href: SITE_URL },
      { rel: "preload", as: "image", href: heroImg, fetchpriority: "high" },
      ...HANGAR_PUBLIC_HEAD_LINKS,
    ],
    scripts: [
      { type: "application/ld+json", children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "TorqWings",
        url: SITE_URL,
        logo: absoluteUrl("/app-icon.png"),
        description: DESCRIPTION,
        address: { "@type": "PostalAddress", addressLocality: "Chennai", addressRegion: "Tamil Nadu", addressCountry: "IN" },
        email: "support@torqwings.com",
        sameAs: ["https://www.linkedin.com/company/torqwings", "https://www.instagram.com/torqwings.official"],
      }) },
      { type: "application/ld+json", children: JSON.stringify({ "@context": "https://schema.org", "@type": "Service", name: "AgriSky", serviceType: "Agriculture Drone Intelligence", provider: { "@type": "Organization", name: "TorqWings" }, areaServed: { "@type": "AdministrativeArea", name: "Tamil Nadu, India" }, description: "Drone agriculture services in Tamil Nadu — crop health monitoring, NDVI mapping, irrigation insights, and precision farming for farms, FPOs and SHGs.", keywords: "drone agriculture Tamil Nadu, AgriSky, crop health drone, precision farming Chennai, agri drone services India" }) },
      { type: "application/ld+json", children: JSON.stringify({ "@context": "https://schema.org", "@type": "Service", name: "GuardSky", serviceType: "Aerial Surveillance & Early Fire Response", provider: { "@type": "Organization", name: "TorqWings" }, areaServed: { "@type": "Country", name: "India" }, description: "Drone-based surveillance, smoke and fire detection, and rapid first-response payload deployment for industrial sites, campuses and remote facilities.", keywords: "aerial surveillance drone India, fire detection drone, GuardSky, perimeter security UAV" }) },
      { type: "application/ld+json", children: JSON.stringify({ "@context": "https://schema.org", "@type": "Service", name: "InfraSky", serviceType: "Infrastructure & Industrial Drone Inspection", provider: { "@type": "Organization", name: "TorqWings" }, areaServed: { "@type": "AdministrativeArea", name: "Tamil Nadu, India" }, description: "UAV inspection in Chennai and across India for bridges, telecom towers, solar farms, roads and industrial assets — high-resolution imagery with AI defect detection.", keywords: "UAV inspection Chennai, drone inspection Tamil Nadu, InfraSky, solar farm drone inspection, telecom tower drone survey, bridge inspection drone India" }) },
      { type: "application/ld+json", children: JSON.stringify({ "@context": "https://schema.org", "@type": "EducationalOccupationalProgram", name: "TorqWings Academy", provider: { "@type": "Organization", name: "TorqWings" }, occupationalCategory: "Drone Pilot", areaServed: { "@type": "AdministrativeArea", name: "Tamil Nadu, India" }, description: "Drone pilot training and certification support in Tamil Nadu — agri-drone operations, mapping workflows, mission planning and safety procedures for students, farmers, SHGs and FPOs.", keywords: "drone pilot training Tamil Nadu, drone certification Chennai, agri drone training India, TorqWings Academy" }) },
      { type: "application/ld+json", children: JSON.stringify({ "@context": "https://schema.org", "@type": "LocalBusiness", name: "TorqWings", telephone: "+91 99402 63589", address: { "@type": "PostalAddress", addressLocality: "Chennai", addressRegion: "Tamil Nadu", addressCountry: "IN" }, url: SITE_URL, description: DESCRIPTION }) },
    ],
  }),
  component: HeroPage,
});

const HERO_STATS = [
  { k: "15", v: "Specialist Agents"                 },
  { k: "4",  v: "Platform Classes"                  },
  { k: "1",  v: "Mission-to-Certification Pipeline" },
];

// Same navy/amber aerospace look as The Hangar (theme shared via
// hangarPublicTheme.ts, injected once by _layout.tsx for the whole public
// site — Navbar, Footer, and every page nested here).
function HeroPage() {
  return (
    <>
    <section id="home" className="hgr-pub-section" style={{ paddingTop: 128 }}>
      <div className="hgr-pub-wrap">
        <div className="grid lg:grid-cols-2 gap-12 items-center">

          <div>
            <span className="hgr-pub-badge hgr-pub-badge-dark">Aerospace · Autonomous Aerial Platforms · AI</span>
            <h1 className="hgr-pub-h1">
              Engineering the future of{" "}
              <span className="hgr-pub-amber">aerial intelligence</span>
            </h1>
            <p className="hgr-pub-lead">
              TorqWings turns a mission brief into a validated aircraft design. Fixed‑wing, VTOL,
              multirotor or stealth, it moves through concept, CFD, structures, optimisation and
              certification in one connected workflow, built for the world's fast-growing drone and
              defence ecosystem.
            </p>
            <div className="hgr-pub-cta">
              <Link to="/the-hangar" className="hgr-pub-btn hgr-pub-btn-amber">
                Enter The Hangar <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link to="/about" className="hgr-pub-btn hgr-pub-btn-ghost">
                About TorqWings
              </Link>
            </div>
            <div className="hgr-pub-stats" style={{ marginTop: 44 }}>
              {HERO_STATS.map((s) => (
                <div key={s.v}>
                  <div className="hgr-pub-stat-k">{s.k}</div>
                  <div className="hgr-pub-stat-v">{s.v}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="hgr-pub-media">
            <div className="hgr-pub-frame hgr-pub-frame-flat">
              <img
                src={heroImg}
                alt="Schematic illustration of The Hangar's aircraft design pipeline — mission, concept, CAD, simulation, CFD, structural, optimization, validation, materials, manufacturing, certification, documentation and knowledge stages arranged in an orbit around fixed-wing and multirotor aircraft renderings, with live telemetry readouts"
                width={1440} height={1080}
                fetchPriority="high" decoding="async"
              />
            </div>
          </div>

        </div>
      </div>
    </section>
    <PlatformSection />
    </>
  );
}
