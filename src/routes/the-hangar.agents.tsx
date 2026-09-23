import { Fragment } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  HGR_LANDING_CSS, HangarFooter, HangarNav, FlightDeckModal, useFlightDeck,
  EarlyAccessModal, useEarlyAccess,
} from "@/components/hangar-landing/HangarChrome";

// The Hangar's fleet — split out of the-hangar.index.tsx's old #agents
// scroll-anchor section into its own page, linked from the nav bar.
export const Route = createFileRoute("/the-hangar/agents")({
  component: HangarAgentsPage,
});

type BayDatum = { num: string; title: string; desc: string };
type BayGroup = { label: string; note?: string; bays: BayDatum[] };

// Column count for each group's grid is derived from bays.length (see
// render below, className={`hgr-bays hgr-bays-${g.bays.length}`}) rather
// than hard-coded per section — a group's card count and its layout can
// never drift apart.
const BAY_GROUPS: BayGroup[] = [
  {
    label: "Primary workflow — sequential",
    bays: [
      { num: "BAY 01", title: "Mission Agent", desc: "Turns a mission brief into structured specs, constraints, and KPIs." },
      { num: "BAY 02", title: "Concept Agent", desc: "Generates and ranks concept options against benchmarks and trends." },
      { num: "BAY 03", title: "Aircraft Design Agent", desc: "Selects configuration and design parameters from rules and reference designs." },
      { num: "BAY 04", title: "CAD Agent", desc: "Builds CAD geometry and assemblies from validated design parameters." },
      { num: "BAY 05", title: "Simulation Orchestrator", desc: "Prepares the simulation plan and dispatches jobs to the solver agents." },
    ],
  },
  {
    // Only CFD and Structural actually run in parallel — Optimization
    // consumes both of their outputs, and Validation follows Optimization,
    // so those two are their own sequential group below, not lumped in
    // with the parallel pair.
    label: "Parallel analysis — CFD ‖ Structures",
    bays: [
      { num: "BAY 06", title: "CFD Agent", desc: "Runs fluid dynamics simulations — forces, coefficients, fields." },
      { num: "BAY 07", title: "Structural Agent", desc: "Runs FEA for stress, deformation, and safety factor." },
    ],
  },
  {
    label: "Refine & verify — sequential",
    bays: [
      { num: "BAY 08", title: "Optimization Agent", desc: "Searches the design space for Pareto-optimal candidates." },
      { num: "BAY 09", title: "Validation Agent", desc: "Checks results against the mission spec and issues pass or fail." },
    ],
  },
  {
    label: "Downstream — build, comply, ship",
    bays: [
      { num: "BAY 10", title: "Materials Agent", desc: "Recommends materials against requirements, environment, and constraints." },
      { num: "BAY 11", title: "Manufacturing Agent", desc: "Checks manufacturability and produces a build plan and BOM." },
      { num: "BAY 12", title: "Certification Agent", desc: "Maps the design against regulations and standards, flags gaps." },
      { num: "BAY 13", title: "Documentation Agent", desc: "Compiles final reports, drawings, and summary documentation." },
    ],
  },
  {
    label: "Cross-cutting — physics validation service",
    note: "Validates output across every stage above",
    bays: [
      { num: "BAY 14", title: "Bernoulli Agent", desc: "Validates output from across the pipeline against conservation laws, dimensional consistency, and aerospace empiricals before it moves downstream." },
    ],
  },
  {
    label: "Knowledge layer",
    bays: [
      { num: "BAY 15", title: "Knowledge Agent", desc: "Answers questions and surfaces insight from every past project, rule, and outcome — the memory every other bay reads from and writes to." },
    ],
  },
];

// A connector renders directly after the group at this index (0-based) --
// Primary→Parallel, Parallel→Refine, Refine→Downstream. None before
// Cross-cutting or Knowledge layer.
const CONNECTOR_AFTER_INDEX = new Set([0, 1, 2]);

function HangarAgentsPage() {
  const flightDeck = useFlightDeck();
  const earlyAccess = useEarlyAccess();

  return (
    <div className="hgr-landing">
      <style>{HGR_LANDING_CSS}</style>

      <HangarNav current="agents" onOpenFlightDeck={flightDeck.openFlightDeck} />

      <main>
        <div className="hgr-wrap hgr-page-header">
          <div className="hgr-live-badge">
            <span className="hgr-live-dot" aria-hidden="true" />
            All 15 bays live
          </div>
          <div className="hgr-kicker hgr-kicker-badge">The fleet</div>
        </div>
        <section style={{ paddingTop: 24 }}>
          <div className="hgr-wrap">
            <div className="hgr-section-head">
              <h2>Fifteen bays. Fifteen specialist agents.</h2>
              <p>Each agent owns exactly one stage of the design lifecycle, reads from a shared memory layer, and writes its output where the next agent — human or machine — can pick it up.</p>
            </div>

            {/* Fragment (not a wrapping div) keeps each label and its grid
                as direct siblings of every other group's, same as before —
                .hgr-bay-group-label:first-of-type only clears the top
                margin on the very first one if they all share one parent. */}
            {BAY_GROUPS.map((g, i) => (
              <Fragment key={g.label}>
                <div className="hgr-bay-group-label">{g.label}</div>
                {g.note && <div className="hgr-group-note">{g.note}</div>}
                <div className={`hgr-bays hgr-bays-${g.bays.length}`}>
                  {g.bays.map((b) => (
                    <Bay key={b.num} num={b.num} title={b.title} desc={b.desc} />
                  ))}
                </div>
                {CONNECTOR_AFTER_INDEX.has(i) && <FlowConnector />}
              </Fragment>
            ))}
          </div>
        </section>

        <section className="hgr-cta">
          <div className="hgr-wrap">
            <h2>Want to put these agents to work?</h2>
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

function Bay({ num, title, desc }: { num: string; title: string; desc: string }) {
  return (
    <div className="hgr-bay">
      <span className="hgr-corner hgr-corner-tl" /><span className="hgr-corner hgr-corner-br" />
      <div className="hgr-bay-num">{num}</div>
      <h3>{title}</h3>
      <p>{desc}</p>
    </div>
  );
}

function FlowConnector() {
  return (
    <div className="hgr-flow-connector" aria-hidden="true">
      <div className="hgr-flow-connector-wrap">
        <div className="hgr-flow-connector-line" />
        <div className="hgr-flow-connector-chevron" />
      </div>
    </div>
  );
}
