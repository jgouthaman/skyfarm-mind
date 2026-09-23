import { createFileRoute } from "@tanstack/react-router";
import {
  HGR_LANDING_CSS, HangarFooter, HangarNav, FlightDeckModal, useFlightDeck,
} from "@/components/hangar-landing/HangarChrome";

// ─────────────────────────────────────────────────────────────────────────
// The Hangar — public landing/home page. Was previously one long scrolling
// page (Hero → Stats → Gate → Agents → How it works → Stack → Footer) with
// the Agents/How it works/Stack sections reached by #anchor scroll; those
// three are now their own routes (the-hangar.agents.tsx,
// the-hangar.how-it-works.tsx, the-hangar.stack.tsx), linked from the nav
// bar as real pages instead. This page keeps the Hero, the stat strip, and
// the "why gate-then-score" pitch — the home page's own content.
// ─────────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/the-hangar/")({
  component: TheHangarLanding,
});

function TheHangarLanding() {
  const flightDeck = useFlightDeck();

  return (
    <div className="hgr-landing">
      <style>{HGR_LANDING_CSS}</style>

      <HangarNav current="home" onOpenFlightDeck={flightDeck.openFlightDeck} />

      <main>
        <header className="hgr-hero">
          <div className="hgr-doors">
            <div className="hgr-door hgr-door-left" />
            <div className="hgr-door hgr-door-right" />
          </div>
          <div className="hgr-bay-id hgr-mono">
            HANGAR STATUS: PRE-FLIGHT<br />
            UNITS ONLINE: 15 / 15<br />
            BUILD: TORQWINGS
          </div>
          <div className="hgr-wrap hgr-hero-inner">
            <h1>Fifteen specialist agents.<br />One <span className="hgr-accent">aerospace design engine.</span></h1>
            <p className="hgr-sub">The Hangar houses every AI agent TorqWings has built for autonomous aerial platform design — from mission definition through CFD, structural validation, and certification. Each one does a single job, gates before it scores, and hands off clean data to the next.</p>
            <div className="hgr-ctas">
              <a href="#access" className="hgr-btn hgr-btn-amber">Request Early Access</a>
              <a href="/the-hangar/agents" className="hgr-btn hgr-btn-ghost">See all 15 agents →</a>
            </div>
          </div>
        </header>

        <div className="hgr-stats">
          <div className="hgr-wrap">
            <div className="hgr-stat"><div className="hgr-n">15</div><div className="hgr-l">Specialist Agents</div></div>
            <div className="hgr-stat"><div className="hgr-n">9</div><div className="hgr-l">Open-Source Solvers</div></div>
            <div className="hgr-stat"><div className="hgr-n">0</div><div className="hgr-l">Black Boxes</div></div>
            <div className="hgr-stat"><div className="hgr-n">1</div><div className="hgr-l">Shared Memory Layer</div></div>
          </div>
        </div>

        <section className="hgr-gate">
          <div className="hgr-wrap hgr-gate-grid">
            <div className="hgr-gate-body">
              <div className="hgr-kicker">Why gate-then-score</div>
              <h2>Every design earns its ranking. None are assumed.</h2>
              <p>Aerospace and defense teams don't trust a model that hands them a number with no explanation. So The Hangar never scores anything until it's already survived the hard constraints — payload, endurance, range, weight, cost. What comes out the other side is ranked, not guessed.</p>
              <ul>
                <li>Hard constraints eliminate infeasible designs first</li>
                <li>Survivors are scored across a multi-criteria model</li>
                <li>Every recommendation carries a confidence signal</li>
                <li>Every step is traceable back to the rule or reference that produced it</li>
              </ul>
            </div>
            <div className="hgr-gate-diagram">
              <div className="hgr-gate-step"><span className="hgr-idx hgr-mono">01</span><span className="hgr-label">Mission constraints applied</span><span className="hgr-tag">GATE</span></div>
              <div className="hgr-gate-step"><span className="hgr-idx hgr-mono">02</span><span className="hgr-label">Infeasible configurations removed</span><span className="hgr-tag">GATE</span></div>
              <div className="hgr-gate-step hgr-pass"><span className="hgr-idx hgr-mono">03</span><span className="hgr-label">Survivors scored, six factors</span><span className="hgr-tag">SCORE</span></div>
              <div className="hgr-gate-step hgr-pass"><span className="hgr-idx hgr-mono">04</span><span className="hgr-label">Confidence signal attached</span><span className="hgr-tag">SCORE</span></div>
              <div className="hgr-gate-step hgr-pass"><span className="hgr-idx hgr-mono">05</span><span className="hgr-label">Ranked output to next agent</span><span className="hgr-tag">PASS →</span></div>
            </div>
          </div>
        </section>
      </main>

      <HangarFooter />
      <FlightDeckModal {...flightDeck} />
    </div>
  );
}
