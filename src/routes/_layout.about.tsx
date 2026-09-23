import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { HANGAR_PUBLIC_HEAD_LINKS } from "@/styles/hangarPublicTheme";

export const Route = createFileRoute("/_layout/about")({
  head: () => ({
    meta: [
      { title: "About TorqWings — Built by engineers. Flown for India." },
      { name: "description", content: "TorqWings builds The Hangar — fifteen specialist AI agents that turn a mission brief into a simulation-validated, flyable aerial platform. Gate-then-score, not guesswork." },
      { property: "og:title", content: "About TorqWings — Built by engineers. Flown for India." },
      { property: "og:description", content: "TorqWings builds The Hangar — fifteen specialist AI agents that turn a mission brief into a simulation-validated, flyable aerial platform." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/about" },
    ],
    links: [{ rel: "canonical", href: "/about" }, ...HANGAR_PUBLIC_HEAD_LINKS],
  }),
  component: AboutPage,
});

// Same section wrapper/grid as _layout.contact.tsx, verbatim — no custom
// padding/minHeight tuning of its own, so the two pages' fold and footer
// position line up by construction. Content rewritten around The Hangar
// itself (the platform's own vision, copy and stats — see
// the-hangar.index.tsx) rather than the old general-company story.
function AboutPage() {
  return (
    <section id="about" className="hgr-pub-section" style={{ paddingTop: 128, borderBottom: "none" }}>
      <div className="hgr-pub-wrap">
        <div className="grid lg:grid-cols-12 gap-10 items-start">

          <div className="lg:col-span-5">
            <span className="hgr-pub-badge hgr-pub-badge-dark">Our Story</span>
            <h1 className="hgr-pub-h1">
              Five engineers. One <span className="hgr-pub-amber">aerospace design engine</span>.
            </h1>
            <p className="hgr-pub-lead">
              We graduated into an industry that still designs autonomous aerial platforms on vendor
              familiarity, not evidence — so we built The Hangar: fifteen specialist AI agents that turn a
              mission brief into a simulation-validated, flyable design. Every one does a single job, gates
              before it scores, and hands off clean data to the next.
            </p>
            <div className="hgr-pub-cta">
              <Link to="/the-hangar" className="hgr-pub-btn hgr-pub-btn-amber">
                Enter The Hangar <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>

          <div className="lg:col-span-7 hgr-pub-form-panel">
            <div className="hgr-pub-grid hgr-pub-grid-2">
              {[
                { k: "15", v: "Specialist Agents"      },
                { k: "9",  v: "Open-Source Tools"       },
                { k: "0",  v: "Black Boxes"             },
                { k: "1",  v: "Shared Memory Layer"     },
              ].map((s) => (
                <div key={s.v}>
                  <div className="hgr-pub-stat-k">{s.k}</div>
                  <div className="hgr-pub-stat-v" style={{ marginTop: 4 }}>{s.v}</div>
                </div>
              ))}
            </div>
            <p className="hgr-pub-sub" style={{ marginTop: 24, maxWidth: "none" }}>
              The Hangar never scores a design until it has already survived the hard constraints — payload,
              endurance, range, weight, cost. What comes out the other side is ranked, not guessed: every
              recommendation carries a confidence signal, and every step is traceable back to the rule or
              reference that produced it.
            </p>
          </div>

        </div>
      </div>
    </section>
  );
}
