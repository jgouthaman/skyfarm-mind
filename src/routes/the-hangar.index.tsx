import { createFileRoute } from "@tanstack/react-router";
import {
  HGR_LANDING_CSS, HangarFooter, HangarNav, FlightDeckModal, useFlightDeck,
  EarlyAccessModal, useEarlyAccess,
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
  const earlyAccess = useEarlyAccess();

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
              <button type="button" className="hgr-btn hgr-btn-amber" onClick={earlyAccess.openEarlyAccess}>Request Early Access</button>
              <a href="/the-hangar/agents" className="hgr-btn hgr-btn-ghost">See all 15 agents →</a>
            </div>
          </div>
        </header>

        <div className="hgr-stats">
          <div className="hgr-wrap">
            <div className="hgr-stat"><div className="hgr-n">15</div><div className="hgr-l">Specialist Agents</div></div>
            <div className="hgr-stat"><div className="hgr-n">9</div><div className="hgr-l">Open-Source Tools</div></div>
            <div className="hgr-stat"><div className="hgr-n">0</div><div className="hgr-l">Black Boxes</div></div>
            <div className="hgr-stat"><div className="hgr-n">1</div><div className="hgr-l">Shared Memory Layer</div></div>
          </div>
        </div>
      </main>

      <HangarFooter />
      <FlightDeckModal {...flightDeck} />
      <EarlyAccessModal {...earlyAccess} />
    </div>
  );
}
