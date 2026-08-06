import { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

// ─────────────────────────────────────────────────────────────────────────
// The Hangar — public landing page. Faithful port of the-hangar-landing-page.html
// (reference mockup) into React + TanStack Router. Fully isolated: no
// imports from destud-auth.ts, destud-designs.ts, or any /destud component.
//
// Flight Deck submit is the SAME placeholder credential check the mockup
// shipped with (h@gmail.com / 63589) — per explicit instruction, this stays
// a hardcoded client-side stub for today's demo, not real auth against
// destud_users. Session is tracked under sessionStorage key "hangar_session"
// — a distinct key from destud's "destud_user", so the two never interact.
// ─────────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/the-hangar/")({
  component: TheHangarLanding,
});

const STUB_EMAIL = "h@gmail.com";
const STUB_PASSWORD = "63589";

type FlightDeckStatus = "form" | "denied" | "success";

function TheHangarLanding() {
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<FlightDeckStatus>("form");
  const emailRef = useRef<HTMLInputElement>(null);

  function openFlightDeck() {
    setModalOpen(true);
    setStatus("form");
    setEmail("");
    setPassword("");
    setTimeout(() => emailRef.current?.focus(), 150);
  }

  function closeFlightDeck() {
    setModalOpen(false);
    setStatus("form");
  }

  function submitFlightDeck(e: React.FormEvent) {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.trim();
    if (normalizedEmail === STUB_EMAIL && normalizedPassword === STUB_PASSWORD) {
      setStatus("success");
      sessionStorage.setItem("hangar_session", "granted");
      setTimeout(() => navigate({ to: "/the-hangar/welcome" }), 1100);
    } else {
      setStatus("denied");
    }
  }

  useEffect(() => {
    if (!modalOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeFlightDeck();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [modalOpen]);

  return (
    <div className="hgr-landing">
      <style>{HGR_LANDING_CSS}</style>

      <nav>
        <div className="hgr-wrap">
          <div className="hgr-brand">
            <span className="hgr-torq">TORQWINGS</span><span className="hgr-sep">/</span><span className="hgr-hangar-word">The Hangar</span>
          </div>
          <div className="hgr-navlinks">
            <a href="#agents">Agents</a>
            <a href="#how">How it works</a>
            <a href="#stack">Stack</a>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <button
              type="button"
              className="hgr-btn hgr-btn-ghost"
              aria-label="Sign in to your TorqWings account"
              title="Sign in"
              onClick={openFlightDeck}
            >
              Flight Deck
            </button>
            <a href="#access" className="hgr-btn hgr-btn-amber">Request Access</a>
          </div>
        </div>
      </nav>

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
          <div className="hgr-eyebrow"><span className="hgr-dot" />Under construction — internal build</div>
          <h1>Fifteen specialist agents.<br />One <span className="hgr-accent">aerospace design engine.</span></h1>
          <p className="hgr-sub">The Hangar houses every AI agent TorqWings has built for autonomous aerial platform design — from mission definition through CFD, structural validation, and certification. Each one does a single job, gates before it scores, and hands off clean data to the next.</p>
          <div className="hgr-ctas">
            <a href="#access" className="hgr-btn hgr-btn-amber">Request Early Access</a>
            <a href="#agents" className="hgr-btn hgr-btn-ghost">See all 15 agents →</a>
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

      <section id="agents">
        <div className="hgr-wrap">
          <div className="hgr-section-head">
            <div className="hgr-kicker">The fleet</div>
            <h2>Fifteen bays. Fifteen specialists.</h2>
            <p>Each agent owns exactly one stage of the design lifecycle, reads from a shared memory layer, and writes its output where the next agent — human or machine — can pick it up.</p>
          </div>

          <div className="hgr-bay-group-label">Primary workflow — sequential</div>
          <div className="hgr-bays">
            <Bay num="BAY 01" title="Mission Agent" desc="Turns a mission brief into structured specs, constraints, and KPIs." />
            <Bay num="BAY 02" title="Concept Agent" desc="Generates and ranks concept options against benchmarks and trends." />
            <Bay num="BAY 03" title="Aircraft Design Agent" desc="Selects configuration and design parameters from rules and reference designs." />
            <Bay num="BAY 04" title="CAD Agent" desc="Builds CAD geometry and assemblies from validated design parameters." />
            <Bay num="BAY 05" title="Simulation Orchestrator" desc="Prepares the simulation plan and dispatches jobs to the solver agents." />
          </div>

          <div className="hgr-bay-group-label">Parallel stage — physics &amp; validation</div>
          <div className="hgr-bays">
            <Bay num="BAY 06" title="CFD Agent" desc="Runs fluid dynamics simulations — forces, coefficients, fields." />
            <Bay num="BAY 07" title="Structural Agent" desc="Runs FEA for stress, deformation, and safety factor." />
            <Bay num="BAY 08" title="Optimization Agent" desc="Searches the design space for Pareto-optimal candidates." />
            <Bay num="BAY 09" title="Validation Agent" desc="Checks results against the mission spec and issues pass or fail." />
          </div>

          <div className="hgr-bay-group-label">Downstream — build, comply, ship</div>
          <div className="hgr-bays">
            <Bay num="BAY 10" title="Materials Agent" desc="Recommends materials against requirements, environment, and constraints." />
            <Bay num="BAY 11" title="Manufacturing Agent" desc="Checks manufacturability and produces a build plan and BOM." />
            <Bay num="BAY 12" title="Certification Agent" desc="Maps the design against regulations and standards, flags gaps." />
            <Bay num="BAY 13" title="Documentation Agent" desc="Compiles final reports, drawings, and summary documentation." />
            <Bay num="BAY 14" title="Collaboration Agent" desc="Keeps teams synced on tasks, updates, and project comments." />
          </div>

          <div className="hgr-bay-group-label">Knowledge layer</div>
          <div className="hgr-bays" style={{ gridTemplateColumns: "1fr" }}>
            <Bay num="BAY 15" title="Knowledge Agent" desc="Answers questions and surfaces insight from every past project, rule, and outcome — the memory every other bay reads from and writes to." />
          </div>
        </div>
      </section>

      <section id="how" className="hgr-how">
        <div className="hgr-wrap">
          <div className="hgr-section-head">
            <div className="hgr-kicker">How it flows</div>
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

      <section id="stack">
        <div className="hgr-wrap">
          <div className="hgr-section-head">
            <div className="hgr-kicker">Open, not proprietary</div>
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

      <section className="hgr-cta" id="access">
        <div className="hgr-wrap">
          <div className="hgr-kicker" style={{ justifyContent: "center", display: "flex" }}>Early access</div>
          <h2>The Hangar is being built in the open, one bay at a time.</h2>
          <p>Currently rolling out behind DeStud. Get on the list for early access as each bay comes online.</p>
          <a href="mailto:support@torqwings.com?subject=The%20Hangar%20—%20Early%20Access" className="hgr-btn hgr-btn-amber">Request Early Access</a>
        </div>
      </section>

      <footer>
        <div className="hgr-wrap">
          <div className="hgr-f-brand">TORQWINGS <span style={{ color: "var(--hgr-blue-line)" }}>/</span> The Hangar</div>
          <div className="hgr-f-links">
            <a href="https://torqwings.com">torqwings.com</a>
            <a href="https://linkedin.com/company/torqwings">LinkedIn</a>
            <a href="https://instagram.com/torqwings.official">Instagram</a>
          </div>
          <div className="hgr-f-note">CHENNAI, IN — AEROSPACE INTELLIGENCE</div>
        </div>
      </footer>

      {/* ── Flight Deck modal ── */}
      <div
        className={`hgr-fd-overlay${modalOpen ? " open" : ""}`}
        aria-hidden={!modalOpen}
        onClick={(e) => { if (e.target === e.currentTarget) closeFlightDeck(); }}
      >
        <div className="hgr-fd-panel" role="dialog" aria-modal="true" aria-labelledby="fdTitle">
          <span className="hgr-corner hgr-corner-tl" /><span className="hgr-corner hgr-corner-tr" />
          <span className="hgr-corner hgr-corner-bl" /><span className="hgr-corner hgr-corner-br" />
          <button type="button" className="hgr-fd-close" onClick={closeFlightDeck} aria-label="Close">✕ CLOSE</button>

          {status !== "success" ? (
            <div>
              <div className="hgr-fd-eyebrow">Flight Deck</div>
              <h3 id="fdTitle">Enter the Hangar</h3>
              <p className="hgr-fd-sub">Sign in with your TorqWings clearance to reach your workspace.</p>

              <form onSubmit={submitFlightDeck}>
                <div className="hgr-fd-field">
                  <label htmlFor="fdEmail">Callsign (email)</label>
                  <input
                    ref={emailRef}
                    type="email" id="fdEmail" required placeholder="you@torqwings.com" autoComplete="username"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setStatus("form"); }}
                  />
                </div>
                <div className="hgr-fd-field">
                  <label htmlFor="fdPass">Access code</label>
                  <input
                    type="password" id="fdPass" required placeholder="••••••••" autoComplete="current-password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setStatus("form"); }}
                  />
                </div>
                {status === "denied" && (
                  <div style={{ color: "var(--hgr-amber)", fontSize: 12.5, fontFamily: "'IBM Plex Mono',monospace", marginBottom: 14 }}>
                    ACCESS DENIED — check callsign and access code.
                  </div>
                )}
                <button type="submit" className="hgr-btn hgr-btn-amber hgr-fd-submit">Enter The Hangar →</button>
              </form>

              <div className="hgr-fd-foot">New here? <a href="#access" onClick={closeFlightDeck}>Request early access</a></div>
            </div>
          ) : (
            <div className="hgr-fd-success" style={{ display: "block" }}>
              <div className="hgr-fd-success-badge">✓</div>
              <h3>Clearance granted</h3>
              <p>Taking you into the Hangar…</p>
            </div>
          )}
        </div>
      </div>
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

function FlowNode({ n, label }: { n: string; label: string }) {
  return (
    <div className="hgr-flow-node"><span className="hgr-flow-n">{n}</span>{label}</div>
  );
}

function FlowArrow() {
  return <div className="hgr-flow-arrow">→</div>;
}

const HGR_LANDING_CSS = `
.hgr-landing{
  --hgr-navy-deep:#0A1826;
  --hgr-navy-panel:#0F2136;
  --hgr-navy-panel-2:#132A44;
  --hgr-blue-line:#3E7CA6;
  --hgr-blue-bright:#6FB4E0;
  --hgr-amber:#E8A33D;
  --hgr-amber-bright:#F6C374;
  --hgr-paper:#ECEFF3;
  --hgr-paper-dim:#8FA5BB;
  --hgr-grid:rgba(111,180,224,0.10);
  --hgr-hairline:rgba(111,180,224,0.22);

  background:var(--hgr-navy-deep);
  color:var(--hgr-paper);
  font-family:'IBM Plex Sans', sans-serif;
  line-height:1.5;
  background-image:
    linear-gradient(var(--hgr-grid) 1px, transparent 1px),
    linear-gradient(90deg, var(--hgr-grid) 1px, transparent 1px);
  background-size: 48px 48px;
  min-height:100vh;
}
.hgr-landing *{ box-sizing:border-box; }
.hgr-landing h1,.hgr-landing h2,.hgr-landing h3{ font-family:'Space Grotesk', sans-serif; font-weight:600; letter-spacing:-0.01em; margin:0; }
.hgr-mono{ font-family:'IBM Plex Mono', monospace; }
.hgr-landing a{ color:inherit; }
.hgr-wrap{ max-width:1180px; margin:0 auto; padding:0 32px; }
.hgr-landing ::selection{ background:var(--hgr-amber); color:var(--hgr-navy-deep); }

@media (prefers-reduced-motion: reduce){
  .hgr-landing *{ animation-duration:0.001ms !important; animation-iteration-count:1 !important; transition-duration:0.001ms !important; }
}

.hgr-landing nav{
  position:sticky; top:0; z-index:50;
  background:rgba(10,24,38,0.88);
  backdrop-filter:blur(10px);
  border-bottom:1px solid var(--hgr-hairline);
}
.hgr-landing nav .hgr-wrap{ display:flex; align-items:center; justify-content:space-between; height:72px; }
.hgr-brand{ display:flex; align-items:center; gap:10px; font-size:15px; }
.hgr-torq{ color:var(--hgr-paper-dim); font-weight:500; }
.hgr-sep{ color:var(--hgr-blue-line); }
.hgr-hangar-word{ font-family:'Space Grotesk',sans-serif; font-weight:700; font-size:18px; letter-spacing:0.01em; }
.hgr-navlinks{ display:flex; align-items:center; gap:32px; font-size:14px; color:var(--hgr-paper-dim); }
.hgr-navlinks a{ text-decoration:none; transition:color .15s; }
.hgr-navlinks a:hover{ color:var(--hgr-blue-bright); }
.hgr-btn{
  display:inline-flex; align-items:center; gap:8px;
  padding:10px 20px; border-radius:2px;
  font-family:'IBM Plex Mono', monospace; font-size:13px; font-weight:500;
  text-decoration:none; border:1px solid transparent; cursor:pointer;
  transition:all .15s;
}
.hgr-btn-amber{ background:var(--hgr-amber); color:var(--hgr-navy-deep); }
.hgr-btn-amber:hover{ background:var(--hgr-amber-bright); }
.hgr-btn-ghost{ border-color:var(--hgr-hairline); color:var(--hgr-paper); background:transparent; }
.hgr-btn-ghost:hover{ border-color:var(--hgr-blue-bright); color:var(--hgr-blue-bright); }

.hgr-hero{ position:relative; overflow:hidden; padding-top:64px; }
.hgr-hero-inner{ position:relative; padding:96px 0 80px; text-align:center; }
.hgr-eyebrow{
  display:inline-flex; align-items:center; gap:10px;
  font-family:'IBM Plex Mono',monospace; font-size:12.5px; letter-spacing:0.14em;
  color:var(--hgr-amber); text-transform:uppercase; margin-bottom:28px;
  border:1px solid rgba(232,163,61,0.35); padding:6px 14px; border-radius:2px;
}
.hgr-eyebrow .hgr-dot{ width:6px; height:6px; border-radius:50%; background:var(--hgr-amber); }
.hgr-hero h1{
  font-size:clamp(40px, 6vw, 78px);
  line-height:1.03;
  max-width:920px; margin:0 auto 24px;
}
.hgr-hero h1 .hgr-accent{ color:var(--hgr-blue-bright); }
.hgr-sub{
  max-width:600px; margin:0 auto 40px; color:var(--hgr-paper-dim);
  font-size:18px; line-height:1.6;
}
.hgr-ctas{ display:flex; gap:16px; justify-content:center; flex-wrap:wrap; margin-bottom:64px;}

.hgr-doors{ position:absolute; inset:0; z-index:5; display:flex; pointer-events:none; }
.hgr-door{
  flex:1; background:
    repeating-linear-gradient(90deg, #0C1E30 0 78px, #0A1826 78px 80px);
  position:relative;
}
.hgr-door::after{
  content:""; position:absolute; top:0; bottom:0; width:2px; background:var(--hgr-blue-line); opacity:.5;
}
.hgr-door-left{ animation: hgr-openLeft 1.4s cubic-bezier(.77,0,.18,1) .3s forwards; }
.hgr-door-right{ animation: hgr-openRight 1.4s cubic-bezier(.77,0,.18,1) .3s forwards; }
.hgr-door-left::after{ right:0; }
.hgr-door-right::after{ left:0; }
@keyframes hgr-openLeft{ from{ transform:translateX(0);} to{ transform:translateX(-100%);} }
@keyframes hgr-openRight{ from{ transform:translateX(0);} to{ transform:translateX(100%);} }
@media (prefers-reduced-motion: reduce){ .hgr-doors{ display:none; } }

.hgr-bay-id{
  position:absolute; top:120px; right:6%; font-family:'IBM Plex Mono',monospace;
  font-size:12px; color:var(--hgr-paper-dim); text-align:right; line-height:1.7;
  display:none;
}
@media(min-width:900px){ .hgr-bay-id{ display:block; } }

.hgr-stats{ border-top:1px solid var(--hgr-hairline); border-bottom:1px solid var(--hgr-hairline); background:rgba(15,33,54,0.5); }
.hgr-stats .hgr-wrap{ display:grid; grid-template-columns:repeat(4,1fr); }
.hgr-stat{ padding:28px 24px; text-align:center; border-left:1px solid var(--hgr-hairline); }
.hgr-stat:first-child{ border-left:none; }
.hgr-stat .hgr-n{ font-family:'Space Grotesk',sans-serif; font-size:30px; font-weight:700; color:var(--hgr-blue-bright); }
.hgr-stat .hgr-l{ font-family:'IBM Plex Mono',monospace; font-size:11.5px; letter-spacing:.08em; text-transform:uppercase; color:var(--hgr-paper-dim); margin-top:6px; }
@media(max-width:760px){ .hgr-stats .hgr-wrap{ grid-template-columns:1fr 1fr; } .hgr-stat{ border-left:none; border-top:1px solid var(--hgr-hairline); } }

.hgr-landing section{ padding:100px 0; }
.hgr-section-head{ max-width:640px; margin-bottom:56px; }
.hgr-kicker{ font-family:'IBM Plex Mono',monospace; font-size:12px; letter-spacing:.14em; text-transform:uppercase; color:var(--hgr-amber); margin-bottom:14px; }
.hgr-section-head h2{ font-size:clamp(28px,3.4vw,42px); line-height:1.15; margin-bottom:16px; }
.hgr-section-head p{ color:var(--hgr-paper-dim); font-size:16.5px; }

.hgr-gate{ background:var(--hgr-navy-panel); border-top:1px solid var(--hgr-hairline); border-bottom:1px solid var(--hgr-hairline); }
.hgr-gate-grid{ display:grid; grid-template-columns:1fr 1fr; gap:64px; align-items:center; }
@media(max-width:860px){ .hgr-gate-grid{ grid-template-columns:1fr; } }
.hgr-gate-diagram{ border:1px solid var(--hgr-hairline); border-radius:2px; padding:32px; background:var(--hgr-navy-deep); }
.hgr-gate-step{ display:flex; align-items:center; gap:16px; padding:14px 0; border-bottom:1px dashed var(--hgr-hairline); }
.hgr-gate-step:last-child{ border-bottom:none; }
.hgr-gate-step .hgr-idx{ font-family:'IBM Plex Mono',monospace; color:var(--hgr-amber); font-size:13px; width:28px; flex-shrink:0; }
.hgr-gate-step .hgr-label{ font-size:14.5px; }
.hgr-gate-step .hgr-tag{ margin-left:auto; font-family:'IBM Plex Mono',monospace; font-size:10.5px; letter-spacing:.06em; padding:3px 8px; border:1px solid var(--hgr-hairline); border-radius:2px; color:var(--hgr-paper-dim); white-space:nowrap; }
.hgr-gate-step.hgr-pass .hgr-tag{ color:var(--hgr-blue-bright); border-color:rgba(111,180,224,.4); }
.hgr-gate-body h3{ font-size:22px; margin-bottom:14px; }
.hgr-gate-body p{ color:var(--hgr-paper-dim); margin-bottom:16px; font-size:15.5px; }
.hgr-gate-body ul{ list-style:none; padding:0; margin:0; }
.hgr-gate-body li{ display:flex; gap:10px; margin-bottom:10px; font-size:14.5px; color:var(--hgr-paper); }
.hgr-gate-body li::before{ content:"›"; color:var(--hgr-blue-line); flex-shrink:0; }

.hgr-bay-group-label{
  font-family:'IBM Plex Mono',monospace; font-size:12px; letter-spacing:.1em; text-transform:uppercase;
  color:var(--hgr-paper-dim); margin:48px 0 20px; display:flex; align-items:center; gap:12px;
}
.hgr-bay-group-label:first-of-type{ margin-top:0; }
.hgr-bay-group-label::after{ content:""; flex:1; height:1px; background:var(--hgr-hairline); }
.hgr-bays{ display:grid; grid-template-columns:repeat(3,1fr); gap:1px; background:var(--hgr-hairline); border:1px solid var(--hgr-hairline); }
@media(max-width:900px){ .hgr-bays{ grid-template-columns:repeat(2,1fr);} }
@media(max-width:600px){ .hgr-bays{ grid-template-columns:1fr;} }
.hgr-bay{ background:var(--hgr-navy-panel); padding:26px 24px; position:relative; transition:background .15s; }
.hgr-bay:hover{ background:var(--hgr-navy-panel-2); }
.hgr-bay-num{ font-family:'IBM Plex Mono',monospace; color:var(--hgr-amber); font-size:12px; letter-spacing:.06em; margin-bottom:10px; }
.hgr-bay h3{ font-size:17px; margin-bottom:10px; }
.hgr-bay p{ color:var(--hgr-paper-dim); font-size:14px; line-height:1.55; margin:0; }
.hgr-corner{ position:absolute; width:10px; height:10px; border:1px solid var(--hgr-blue-line); opacity:.6; }
.hgr-corner-tl{ top:8px; left:8px; border-right:none; border-bottom:none; }
.hgr-corner-br{ bottom:8px; right:8px; border-left:none; border-top:none; }

.hgr-how{ background:var(--hgr-navy-panel); border-top:1px solid var(--hgr-hairline); border-bottom:1px solid var(--hgr-hairline); }
.hgr-flow-wrap{ overflow-x:auto; padding-bottom:12px; }
.hgr-flow{ display:flex; align-items:center; gap:0; min-width:760px; }
.hgr-flow-node{
  background:var(--hgr-navy-panel); border:1px solid var(--hgr-hairline); border-radius:2px;
  padding:14px 16px; font-size:13px; text-align:center; width:130px; flex-shrink:0;
}
.hgr-flow-n{ font-family:'IBM Plex Mono',monospace; color:var(--hgr-amber); font-size:11px; display:block; margin-bottom:4px; }
.hgr-flow-arrow{ flex:0 0 28px; text-align:center; color:var(--hgr-blue-line); font-size:18px; }

.hgr-stack-list{ display:flex; flex-wrap:wrap; gap:10px; }
.hgr-chip{
  font-family:'IBM Plex Mono',monospace; font-size:12.5px; color:var(--hgr-paper-dim);
  border:1px solid var(--hgr-hairline); padding:8px 14px; border-radius:2px;
}

.hgr-cta{ text-align:center; border-top:1px solid var(--hgr-hairline); }
.hgr-cta h2{ font-size:clamp(28px,4vw,44px); max-width:680px; margin:0 auto 16px; }
.hgr-cta p{ color:var(--hgr-paper-dim); margin-bottom:36px; }

.hgr-landing footer{ border-top:1px solid var(--hgr-hairline); padding:40px 0; }
.hgr-landing footer .hgr-wrap{ display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px; }
.hgr-f-brand{ font-family:'Space Grotesk',sans-serif; font-weight:600; }
.hgr-f-links{ display:flex; gap:24px; font-size:13px; color:var(--hgr-paper-dim); }
.hgr-f-links a{ text-decoration:none; }
.hgr-f-note{ font-family:'IBM Plex Mono',monospace; font-size:11px; color:var(--hgr-paper-dim); }

.hgr-fd-overlay{
  position:fixed; inset:0; z-index:200;
  background:rgba(5,13,22,0.72); backdrop-filter:blur(6px);
  display:flex; align-items:center; justify-content:center;
  padding:24px;
  opacity:0; pointer-events:none;
  transition:opacity .2s ease;
}
.hgr-fd-overlay.open{ opacity:1; pointer-events:auto; }
.hgr-fd-panel{
  width:100%; max-width:420px;
  background:var(--hgr-navy-panel);
  border:1px solid var(--hgr-hairline);
  position:relative;
  padding:36px 32px 32px;
  transform:translateY(8px) scale(.98);
  transition:transform .2s ease;
}
.hgr-fd-overlay.open .hgr-fd-panel{ transform:translateY(0) scale(1); }
.hgr-fd-panel .hgr-corner{ width:14px; height:14px; }
.hgr-fd-panel .hgr-corner-tl{ top:-1px; left:-1px; }
.hgr-fd-panel .hgr-corner-tr{ top:-1px; right:-1px; border-left:none; border-right:1px solid var(--hgr-blue-line); border-bottom:none; }
.hgr-fd-panel .hgr-corner-bl{ bottom:-1px; left:-1px; border-right:none; border-bottom:1px solid var(--hgr-blue-line); border-top:none; }
.hgr-fd-panel .hgr-corner-br{ bottom:-1px; right:-1px; border-left:none; border-bottom:1px solid var(--hgr-blue-line); border-top:none; }
.hgr-fd-close{
  position:absolute; top:16px; right:16px;
  background:none; border:none; color:var(--hgr-paper-dim);
  font-family:'IBM Plex Mono',monospace; font-size:13px; cursor:pointer;
  padding:6px; line-height:1;
}
.hgr-fd-close:hover{ color:var(--hgr-paper); }
.hgr-fd-eyebrow{
  font-family:'IBM Plex Mono',monospace; font-size:11.5px; letter-spacing:.12em; text-transform:uppercase;
  color:var(--hgr-amber); margin-bottom:10px;
}
.hgr-fd-panel h3{ font-size:22px; margin-bottom:6px; }
.hgr-fd-sub{ color:var(--hgr-paper-dim); font-size:13.5px; margin-bottom:26px; }
.hgr-fd-field{ margin-bottom:18px; }
.hgr-fd-field label{
  display:block; font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.08em;
  text-transform:uppercase; color:var(--hgr-paper-dim); margin-bottom:8px;
}
.hgr-fd-field input{
  width:100%; background:var(--hgr-navy-deep); border:1px solid var(--hgr-hairline);
  color:var(--hgr-paper); font-family:'IBM Plex Sans',sans-serif; font-size:14.5px;
  padding:12px 14px; border-radius:2px; outline:none;
  transition:border-color .15s;
}
.hgr-fd-field input:focus{ border-color:var(--hgr-blue-bright); }
.hgr-fd-submit{ width:100%; justify-content:center; margin-top:6px; font-size:13.5px; padding:13px 20px; }
.hgr-fd-foot{ margin-top:20px; text-align:center; font-size:13px; color:var(--hgr-paper-dim); }
.hgr-fd-foot a{ color:var(--hgr-blue-bright); text-decoration:none; }
.hgr-fd-foot a:hover{ text-decoration:underline; }

.hgr-fd-success{ text-align:center; padding:12px 0 4px; }
.hgr-fd-success-badge{
  width:44px; height:44px; border-radius:50%; border:1px solid var(--hgr-blue-line);
  display:flex; align-items:center; justify-content:center; margin:0 auto 18px;
  color:var(--hgr-blue-bright); font-size:20px;
}
.hgr-fd-success h3{ font-size:19px; margin-bottom:8px; }
.hgr-fd-success p{ color:var(--hgr-paper-dim); font-size:13.5px; margin:0; }
`;
