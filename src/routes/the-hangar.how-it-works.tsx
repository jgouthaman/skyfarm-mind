import { createFileRoute } from "@tanstack/react-router";
import {
  HGR_LANDING_CSS, HangarFooter, HangarNav, FlightDeckModal, useFlightDeck,
} from "@/components/hangar-landing/HangarChrome";

// Split out of the-hangar.index.tsx's old #how scroll-anchor section into
// its own page, linked from the nav bar.
export const Route = createFileRoute("/the-hangar/how-it-works")({
  component: HangarHowItWorksPage,
});

function HangarHowItWorksPage() {
  const flightDeck = useFlightDeck();

  return (
    <div className="hgr-landing">
      <style>{HGR_LANDING_CSS}</style>

      <HangarNav current="how" onOpenFlightDeck={flightDeck.openFlightDeck} />

      <main>
        <section className="hgr-how" style={{ paddingTop: 88 }}>
          <div className="hgr-wrap">
            <div className="hgr-section-head">
              <div className="hgr-kicker hgr-kicker-badge">How it flows</div>
              <h2>From a sentence to a validated design.</h2>
              <p>Agents 1 through 5 run in sequence to prepare geometry and a simulation plan. Agents 6 through 8 run in parallel. Results feed Validation — if it doesn't pass, the loop sends it back to Optimization, not back to square one.</p>
            </div>
            <div className="hgr-flow-wrap">
              <div className="hgr-flow">
                <FlowNode n="01" label="Mission" />
                <FlowArrow />
                <FlowNode n="02" label="Concept" />
                <FlowArrow />
                <FlowNode n="03" label="Aircraft Design" />
                <FlowArrow />
                <FlowNode n="04" label="CAD" />
                <FlowArrow />
                <FlowNode n="05" label="Simulation" />
                <FlowArrow />
                <FlowNode n="06–08" label="CFD / Structural / Optimization" />
                <FlowArrow />
                <FlowNode n="09" label="Validation" />
              </div>
            </div>
          </div>
        </section>
      </main>

      <HangarFooter />
      <FlightDeckModal {...flightDeck} />
    </div>
  );
}

function FlowNode({ n, label }: { n: string; label: string }) {
  return (
    <div className="hgr-flow-node"><span className="hgr-flow-n">{n}</span>{label}</div>
  );
}

function FlowArrow() {
  return <div className="hgr-flow-arrow">→</div>;
}
