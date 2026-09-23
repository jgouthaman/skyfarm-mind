import { createFileRoute } from "@tanstack/react-router";
import {
  HGR_LANDING_CSS, HangarFooter, HangarNav, FlightDeckModal, useFlightDeck,
} from "@/components/hangar-landing/HangarChrome";

// Split out of the-hangar.index.tsx's old #stack scroll-anchor section into
// its own page, linked from the nav bar.
export const Route = createFileRoute("/the-hangar/stack")({
  component: HangarStackPage,
});

function HangarStackPage() {
  const flightDeck = useFlightDeck();

  return (
    <div className="hgr-landing">
      <style>{HGR_LANDING_CSS}</style>

      <HangarNav current="stack" onOpenFlightDeck={flightDeck.openFlightDeck} />

      <main>
        <section style={{ paddingTop: 88 }}>
          <div className="hgr-wrap">
            <div className="hgr-section-head">
              <div className="hgr-kicker hgr-kicker-badge">Open, not proprietary</div>
              <h2>Built on tools your engineers already trust.</h2>
              <p>No agent replaces a solver — each one operates the same open-source tools an aerospace engineer would run by hand, just faster and with full traceability.</p>
            </div>
            <div className="hgr-stack-list">
              {["OpenVSP", "XFLR5", "FreeCAD", "OpenCascade", "SALOME", "OpenFOAM", "CalculiX", "Code_Aster", "ParaView"].map((chip) => (
                <span key={chip} className="hgr-chip">{chip}</span>
              ))}
            </div>
          </div>
        </section>
      </main>

      <HangarFooter />
      <FlightDeckModal {...flightDeck} />
    </div>
  );
}
