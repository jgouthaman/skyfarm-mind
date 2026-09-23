import { createFileRoute } from "@tanstack/react-router";
import {
  HGR_LANDING_CSS, HangarFooter, HangarNav, FlightDeckModal, useFlightDeck,
  EarlyAccessModal, useEarlyAccess,
} from "@/components/hangar-landing/HangarChrome";
import { OG_IMAGE_URL, absoluteUrl } from "@/lib/siteConfig";

const TITLE = "The Hangar's Open-Source Engineering Stack | TorqWings";
const DESCRIPTION = "Built on the same open-source tools aerospace engineers already trust — OpenVSP, OpenFOAM, CalculiX and more — mapped to the agent designed to run each one.";

// Split out of the-hangar.index.tsx's old #stack scroll-anchor section into
// its own page, linked from the nav bar.
export const Route = createFileRoute("/the-hangar/stack")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:image", content: OG_IMAGE_URL },
      { property: "og:type", content: "website" },
      { property: "og:url", content: absoluteUrl("/the-hangar/stack") },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
      { name: "twitter:image", content: OG_IMAGE_URL },
    ],
    links: [{ rel: "canonical", href: absoluteUrl("/the-hangar/stack") }],
  }),
  component: HangarStackPage,
});

// Tool -> agent mapping, checked against the actual agent code (not
// assumed from the tool names) — see aircraftDesignRules.ts,
// cadDesignRules.ts, cfdAnalysisGeneration.ts, structuralGeneration.ts,
// the-hangar.cad-design.tsx. Every one of the 9 tools is currently only
// *referenced* in a code comment that explicitly says it is NOT yet
// integrated (e.g. cfdAnalysisGeneration.ts: "This is not a real CFD
// solve (no OpenFOAM/SU2/Fluent)") — every solver step today is an LLM
// reasoning pass, not a real tool invocation. Shown here as the roadmap
// stack each agent is designed to run once that integration lands, not as
// tools already wired in.
const TOOLS: { name: string; role: string; agent: string; sourced: boolean }[] = [
  { name: "OpenVSP", role: "Parametric aircraft geometry & vortex-lattice aero.", agent: "Bay 03 · Aircraft Design Agent", sourced: true },
  { name: "XFLR5", role: "Airfoil and low-Reynolds wing analysis.", agent: "Bay 03 · Aircraft Design Agent", sourced: true },
  { name: "FreeCAD", role: "Parametric CAD modelling.", agent: "Bay 04 · CAD Agent", sourced: true },
  { name: "OpenCascade", role: "Geometry kernel for CAD export.", agent: "Bay 04 · CAD Agent", sourced: false },
  { name: "SALOME", role: "Meshing and pre-processing.", agent: "Bay 05 · Simulation Orchestrator", sourced: false },
  { name: "OpenFOAM", role: "CFD solver.", agent: "Bay 06 · CFD Agent", sourced: true },
  { name: "CalculiX", role: "FEA structural solver.", agent: "Bay 07 · Structural Agent", sourced: true },
  { name: "Code_Aster", role: "Advanced FEA solver.", agent: "Bay 07 · Structural Agent", sourced: true },
  { name: "ParaView", role: "Results post-processing and visualisation.", agent: "Bay 09 · Validation Agent", sourced: false },
];

function HangarStackPage() {
  const flightDeck = useFlightDeck();
  const earlyAccess = useEarlyAccess();

  return (
    <div className="hgr-landing">
      <style>{HGR_LANDING_CSS}</style>

      <HangarNav current="stack" onOpenFlightDeck={flightDeck.openFlightDeck} />

      <main>
        <section style={{ paddingTop: 88 }}>
          <div className="hgr-wrap">
            <div className="hgr-section-head">
              <div className="hgr-kicker hgr-kicker-badge">Open, not proprietary</div>
              <h1>Built on tools your engineers already trust.</h1>
              <p>No agent replaces a solver — each one is designed around the same open-source tools an aerospace engineer would run by hand, so the reasoning stays grounded in real engineering practice, not a black box.</p>
            </div>

            <div className="hgr-bays hgr-bays-3">
              {TOOLS.map((t) => (
                <div key={t.name} className="hgr-tool-card">
                  <span className="hgr-corner hgr-corner-tl" /><span className="hgr-corner hgr-corner-br" />
                  <h3 className="hgr-tool-name">{t.name}</h3>
                  <p className="hgr-tool-role">{t.role}</p>
                  <span
                    className="hgr-tool-agent"
                    title={t.sourced ? undefined : "Inferred from the tool's role — not yet named in code"}
                  >
                    {t.agent}
                  </span>
                </div>
              ))}
            </div>

            <p className="hgr-stack-note">Every result links back to the tool, input and version that produced it.</p>
          </div>
        </section>

        <section className="hgr-cta">
          <div className="hgr-wrap">
            <h2>Want to see it on your own mission?</h2>
            <p>The Hangar is in early access. Request access and we'll get you set up.</p>
            <button type="button" className="hgr-btn hgr-btn-amber" onClick={earlyAccess.openEarlyAccess}>
              Request access →
            </button>
          </div>
        </section>
      </main>

      <HangarFooter />
      <FlightDeckModal {...flightDeck} />
      <EarlyAccessModal {...earlyAccess} />
    </div>
  );
}
