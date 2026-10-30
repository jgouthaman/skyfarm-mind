import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { HANGAR_PUBLIC_HEAD_LINKS } from "@/styles/hangarPublicTheme";
import { SITE_URL } from "@/lib/seo";

export const Route = createFileRoute("/_layout/about")({
  head: () => ({
    meta: [
      { title: "About TorqWings — From mission requirements to validated UAV configurations" },
      { name: "description", content: "TorqWings automates the conceptual and preliminary design of unmanned aerial systems: fifteen discipline-specific agents for mission analysis, constraint sizing, propulsion, aerodynamics and structures." },
      { property: "og:title", content: "About TorqWings — From mission requirements to validated UAV configurations" },
      { property: "og:description", content: "Fifteen discipline-specific agents automate UAV conceptual and preliminary design. Every step is gated by hard constraints and traceable to its governing model." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE_URL}/about` },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/about` }, ...HANGAR_PUBLIC_HEAD_LINKS],
  }),
  component: AboutPage,
});

// Single-column hero. Colors are local to this page: the shared
// --hp-amber-bright is too pale for large text on white, so the headline's
// second line uses a darker burnt orange, and the buttons are navy filled /
// navy outlined rather than the shared amber/ghost pair.
const ABOUT_NAVY = "#0B1F33";
const ABOUT_ORANGE = "#B5530F";

function AboutPage() {
  return (
    <section id="about" className="hgr-pub-section" style={{ paddingTop: 128, borderBottom: "none" }}>
      <div className="hgr-pub-wrap">
        <span className="hgr-pub-badge hgr-pub-badge-dark" style={{ background: ABOUT_NAVY }}>About TorqWings</span>
        <h1 className="hgr-pub-h1" style={{ color: ABOUT_NAVY, fontWeight: 700, fontSize: "clamp(36px,6vw,64px)" }}>
          From mission requirements to <span style={{ color: ABOUT_ORANGE }}>validated UAV configurations.</span>
        </h1>
        <p className="hgr-pub-lead" style={{ fontSize: 18, maxWidth: 760, color: "#3D5266" }}>
          TorqWings automates the conceptual and preliminary design of unmanned aerial systems. Fifteen
          discipline-specific agents handle mission analysis, constraint sizing, propulsion matching,
          aerodynamics and structures. Each step is gated by hard constraints and traceable to the governing
          model or reference data.
        </p>
        <div className="hgr-pub-cta">
          <Link
            to="/contact"
            className="hgr-pub-btn"
            style={{ background: ABOUT_NAVY, color: "#FFFFFF", fontWeight: 600 }}
          >
            Request a technical briefing <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            to="/the-hangar"
            className="hgr-pub-btn"
            style={{ background: "#FFFFFF", color: ABOUT_NAVY, borderColor: ABOUT_NAVY, fontWeight: 600 }}
          >
            Enter The Hangar
          </Link>
        </div>
      </div>
    </section>
  );
}
