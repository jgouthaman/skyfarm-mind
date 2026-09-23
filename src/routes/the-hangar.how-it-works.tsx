import { createFileRoute } from "@tanstack/react-router";
import {
  HGR_LANDING_CSS, HangarFooter, HangarNav, FlightDeckModal, useFlightDeck,
  EarlyAccessModal, useEarlyAccess,
} from "@/components/hangar-landing/HangarChrome";

// Split out of the-hangar.index.tsx's old #how scroll-anchor section into
// its own page, linked from the nav bar. Bay names, numbers and grouping
// here match the-hangar.agents.tsx exactly (that page is the source of
// truth): 01-05 sequential, 06+07 parallel, 08+09 sequential
// (Optimization consumes both 06/07 outputs; Validation follows
// Optimization — neither is "parallel"), 10-13 sequential, 14/15
// cross-cutting.
export const Route = createFileRoute("/the-hangar/how-it-works")({
  component: HangarHowItWorksPage,
});

// Illustrative only — no seeded/saved example run exists in the database
// to pull real values from (checked supabase/migrations for seed data;
// none found). Labeled as such in the UI rather than presented as a real
// result.
const WORKED_EXAMPLE = [
  { stage: "01 Mission", output: "40 km corridor survey, 1.2 kg payload, 20% battery reserve, endurance target derived." },
  { stage: "02 Concept", output: "Fixed-wing selected over multirotor and VTOL — best endurance-to-payload fit for the range." },
  { stage: "03 Aircraft Design", output: "Wingspan, aspect ratio, and cruise speed set to meet the endurance target within the payload limit." },
  { stage: "04 CAD", output: "Geometry and mass properties generated from the selected configuration." },
  { stage: "06–07 CFD / Structural", output: "Lift/drag estimated; structural safety factor checked against the airframe loads." },
  { stage: "09 Validation", output: "Design passes against the mission spec — cleared for materials and build planning." },
];

function HangarHowItWorksPage() {
  const flightDeck = useFlightDeck();
  const earlyAccess = useEarlyAccess();

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
              <p>Agents 1 through 5 run in sequence to prepare geometry and a simulation plan. CFD and Structural run in parallel, Optimization combines their results, and Validation checks the outcome. If it doesn't pass, the loop goes back to Optimization, not back to square one. Once validated, the design moves downstream to materials, manufacturing, certification and documentation.</p>
            </div>

            <div className="hgr-flow-wrap">
              <div className="hgr-flow-diagram">
                <div className="hgr-flow-chain">
                  <div className="hgr-flow-row">
                    <FlowNode n="01" label="Mission" />
                    <FlowArrow />
                    <FlowNode n="02" label="Concept" />
                    <FlowArrow />
                    <FlowNode n="03" label="Aircraft Design" />
                    <FlowArrow />
                    <FlowNode n="04" label="CAD" />
                    <FlowArrow />
                    <FlowNode n="05" label="Simulation" />
                  </div>

                  <div className="hgr-flow-chain-tail">
                    <div className="hgr-flow-down" aria-hidden="true">↓</div>

                    <div className="hgr-flow-parallel-wrap">
                      <div className="hgr-flow-parallel-pair">
                        <FlowNode n="06" label="CFD" />
                        <FlowNode n="07" label="Structural" />
                      </div>
                    </div>

                    <div className="hgr-flow-down" aria-hidden="true">↓</div>

                    <FlowNode n="08" label="Optimization" />

                    <div className="hgr-flow-return">
                      <ReturnArrow />
                      Fail → re-optimise
                    </div>

                    <div className="hgr-flow-down" aria-hidden="true">↓</div>

                    <FlowNode n="09" label="Validation" />
                  </div>
                </div>

                <div className="hgr-flow-down" aria-hidden="true">↓</div>

                <div className="hgr-flow-row">
                  <FlowNode n="10" label="Materials" />
                  <FlowArrow />
                  <FlowNode n="11" label="Manufacturing" />
                  <FlowArrow />
                  <FlowNode n="12" label="Certification" />
                  <FlowArrow />
                  <FlowNode n="13" label="Documentation" />
                </div>

                <div className="hgr-flow-rail">
                  <div className="hgr-flow-rail-label"><b>14 Bernoulli</b> — physics checks at every stage</div>
                  <div className="hgr-flow-rail-label"><b>15 Knowledge</b> — shared memory across all bays</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section style={{ textAlign: "center" }}>
          <div className="hgr-wrap">
            <div className="hgr-kicker hgr-kicker-badge" style={{ marginBottom: 24 }}>Worked example</div>
            <h2 style={{ marginBottom: 32 }}>One sentence in. A validated design out.</h2>

            <div className="hgr-worked-quote">
              <p>"Survey 40 km of highway corridor in one flight, carrying a 1.2 kg mapping payload, with 20% battery reserve."</p>
            </div>

            <div className="hgr-worked-list">
              {WORKED_EXAMPLE.map((row) => (
                <div key={row.stage} className="hgr-worked-row">
                  <div className="hgr-worked-row-stage">{row.stage}</div>
                  <div className="hgr-worked-row-output">{row.output}</div>
                </div>
              ))}
            </div>
            <div className="hgr-illustrative-note">Illustrative example — not a saved run</div>
          </div>
        </section>

        <section className="hgr-cta">
          <div className="hgr-wrap">
            <h2>Want to run your own mission?</h2>
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

function FlowNode({ n, label }: { n: string; label: string }) {
  return (
    <div className="hgr-flow-node"><span className="hgr-flow-n">{n}</span>{label}</div>
  );
}

function FlowArrow() {
  return <div className="hgr-flow-arrow">→</div>;
}

function ReturnArrow() {
  return (
    <svg width="22" height="16" viewBox="0 0 22 16" aria-hidden="true">
      <path d="M18 3 C18 12, 3 12, 3 3" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M3 3 L3 7 M3 3 L7 5" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}
