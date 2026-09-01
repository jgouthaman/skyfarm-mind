import { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useHangarSession } from "@/lib/the-hangar/session";
import { supabase } from "@/integrations/supabase/client";

// ─────────────────────────────────────────────────────────────────────────
// The Hangar — agent console welcome page. Faithful port of welcome.html
// (reference mockup, see reference/the-hangar/welcome.html): 15-bay SVG
// circuit, hover/click info panel, "Run Mission Sequence" animation, and
// Bay 01's click-through to /the-hangar/mission. Fully isolated — no
// imports from destud-auth.ts or any /destud file.
//
// Mission Agent (bay 1) is the only bay with status:'online' (LIVE badge)
// AND the only bay with an `href` (click-through, underline, amber hover
// ring, CTA button). These are two independent flags — status drives the
// LIVE badge, href drives all the "linkable" affordances — kept separate
// because a future bay could in principle go LIVE before it gets a
// dedicated page, or vice versa. Today only Mission Agent has both.
//
// Adding the next bay's page (Concept Agent): add `href` to that node's
// data. Nothing else changes — the underline, hover ring, badge arrow, and
// info-panel CTA button all key off `href` being present, matching the
// mockup's own stated pattern.
// ─────────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/the-hangar/welcome")({
  component: TheHangarWelcome,
});

interface NodeData {
  id: number;
  x: number;
  y: number;
  bay: string;
  name: string;
  title: string;
  status: "online" | "design";
  hub?: boolean;
  r?: number;
  href?: string;
  desc: string;
  inp: string;
  tools: string;
  out: string;
}

const NODES: NodeData[] = [
  {
    id: 1,
    x: 90,
    y: 140,
    bay: "01",
    name: "Mission",
    title: "Mission Agent",
    status: "online",
    href: "/the-hangar/mission",
    desc: "Turns a mission brief into a structured spec — payload, range, endurance, constraints and KPIs the rest of the fleet builds against.",
    inp: "Chat, docs, forms",
    tools: "LLM, RAG, rule engine",
    out: "Mission spec (JSON)",
  },
  {
    id: 2,
    x: 270,
    y: 140,
    bay: "02",
    name: "Concept",
    title: "Concept Agent",
    status: "online",
    href: "/the-hangar/concept",
    desc: "Generates and ranks concept options against benchmarks, trends and design preferences before anything is committed to.",
    inp: "Mission spec",
    tools: "LLM, knowledge graph",
    out: "Ranked concept options",
  },
  {
    id: 3,
    x: 450,
    y: 140,
    bay: "03",
    name: "Aircraft Design",
    title: "Aircraft Design Agent",
    status: "online",
    href: "/the-hangar/aircraft-design",
    desc: "Selects configuration and design parameters — gate-then-score against rules and reference designs, never a guess.",
    inp: "Concept",
    tools: "Claude Sonnet 5, rule engine",
    out: "Aircraft geometry preview",
  },
  {
    id: 4,
    x: 630,
    y: 140,
    bay: "04",
    name: "CAD",
    title: "CAD Agent",
    status: "online",
    href: "/the-hangar/cad-design",
    desc: "Builds real CAD geometry and assemblies from the validated design parameters — the first fully physical output.",
    inp: "Aircraft design",
    tools: "Claude Sonnet 5, rule engine",
    out: "CAD model & assembly",
  },
  {
    id: 5,
    x: 810,
    y: 140,
    bay: "05",
    name: "Sim Orchestrator",
    title: "Simulation Orchestrator",
    status: "design",
    desc: "Assesses flight envelope, stability, and performance risk from the CAD design � LLM reasoning bounded by vertical design rules.",
    inp: "CAD model",
    tools: "Claude Sonnet 5, rule engine",
    out: "Simulation result: flight envelope, stability, risk flags",
  },
  {
    id: 6,
    x: 720,
    y: 300,
    bay: "06",
    name: "CFD",
    title: "CFD Agent",
    status: "design",
    desc: "Runs computational fluid dynamics — forces, coefficients, fields — against the candidate geometry.",
    inp: "CAD geometry, sim plan",
    tools: "OpenFOAM, SALOME",
    out: "CFD results",
  },
  {
    id: 7,
    x: 900,
    y: 300,
    bay: "07",
    name: "Structural",
    title: "Structural Agent",
    status: "design",
    desc: "Runs FEA for stress, deformation and safety factor against loads and boundary conditions.",
    inp: "CAD geometry, loads",
    tools: "CalculiX, Code_Aster",
    out: "FEA results",
  },
  {
    id: 8,
    x: 810,
    y: 420,
    bay: "08",
    name: "Optimization",
    title: "Optimization Agent",
    status: "design",
    desc: "Searches the design space across CFD and structural results for Pareto-optimal candidates.",
    inp: "CFD + FEA results",
    tools: "Optuna, PyGMO, surrogate models",
    out: "Optimized designs (Pareto set)",
  },
  {
    id: 9,
    x: 810,
    y: 540,
    bay: "09",
    name: "Validation",
    title: "Validation Agent",
    status: "design",
    desc: "Checks the optimized design against the original mission spec and rules — issues a pass or fail, with reasons.",
    inp: "Results, mission spec, rules",
    tools: "Rule engine, LLM reasoning",
    out: "Validation report (pass/fail)",
  },
  {
    id: 10,
    x: 150,
    y: 640,
    bay: "10",
    name: "Materials",
    title: "Materials Agent",
    status: "design",
    desc: "Recommends materials against requirements, operating environment and constraints, with justification.",
    inp: "Requirements, environment",
    tools: "Materials DB, RAG",
    out: "Material recommendations",
  },
  {
    id: 11,
    x: 365,
    y: 640,
    bay: "11",
    name: "Manufacturing",
    title: "Manufacturing Agent",
    status: "design",
    desc: "Checks manufacturability against the CAD model and produces a build plan and bill of materials.",
    inp: "CAD model",
    tools: "DFM rule engine, cost models",
    out: "DFM report & manufacturing plan",
  },
  {
    id: 12,
    x: 580,
    y: 640,
    bay: "12",
    name: "Certification",
    title: "Certification Agent",
    status: "design",
    desc: "Maps the design against applicable regulations and standards and flags compliance gaps early.",
    inp: "Design data, regulations",
    tools: "Regulations DB, RAG, LLM",
    out: "Compliance checklist",
  },
  {
    id: 13,
    x: 795,
    y: 640,
    bay: "13",
    name: "Documentation",
    title: "Documentation Agent",
    status: "design",
    desc: "Compiles final reports, drawings and summary documentation from every upstream agent's output.",
    inp: "All design data",
    tools: "LLM, template engine",
    out: "Reports, SLR, drawings",
  },
  {
    id: 14,
    x: 1010,
    y: 640,
    bay: "14",
    name: "Collaboration",
    title: "Collaboration Agent",
    status: "design",
    desc: "Keeps the team synced — tasks, agent updates, comments and notifications, all in one feed.",
    inp: "Tasks, agent updates",
    tools: "Task manager API, webhooks",
    out: "Collaboration feed",
  },
  {
    id: 15,
    x: 1100,
    y: 340,
    bay: "15",
    name: "Knowledge",
    title: "Knowledge Agent",
    status: "design",
    hub: true,
    r: 44,
    desc: "The memory every other bay reads from and writes to — past projects, rules, standards and outcomes, always on.",
    inp: "Natural-language queries",
    tools: "Knowledge graph, vector DB, RAG + LLM",
    out: "Answers & insight",
  },
];

const HUB_LINES = ["M1100,340 L124,140", "M1100,340 L810,540", "M1100,340 L795,640"];

const LEAD_LINES: { id: string; d: string }[] = [
  { id: "ln-1-2", d: "M124,140 H236" },
  { id: "ln-2-3", d: "M304,140 H416" },
  { id: "ln-3-4", d: "M484,140 H596" },
  { id: "ln-4-5", d: "M664,140 H776" },
  { id: "ln-5-6", d: "M792,168 V220 H720 V266" },
  { id: "ln-5-7", d: "M828,168 V220 H900 V266" },
  { id: "ln-6-8", d: "M720,334 V376 H810 V386" },
  { id: "ln-7-8", d: "M900,334 V376 H810 V386" },
  { id: "ln-8-9", d: "M810,454 V506" },
  { id: "ln-9-10", d: "M810,574 V596 H150 V606" },
  { id: "ln-9-11", d: "M810,574 V596 H365 V606" },
  { id: "ln-9-12", d: "M810,574 V596 H580 V606" },
  { id: "ln-9-13", d: "M810,574 V596 H795 V606" },
  { id: "ln-9-14", d: "M810,574 V596 H1010 V606" },
];

interface Stage {
  lines: string[];
  nodes: number[];
  text: string;
}

const STAGES: Stage[] = [
  { lines: [], nodes: [1], text: "BAY 01 — Mission Agent — parsing mission brief…" },
  { lines: ["ln-1-2"], nodes: [2], text: "BAY 02 — Concept Agent — generating trade studies…" },
  {
    lines: ["ln-2-3"],
    nodes: [3],
    text: "BAY 03 — Aircraft Design Agent — gating and scoring configurations…",
  },
  { lines: ["ln-3-4"], nodes: [4], text: "BAY 04 — CAD Agent — building geometry & assembly…" },
  {
    lines: ["ln-4-5"],
    nodes: [5],
    text: "BAY 05 — Simulation Orchestrator — preparing simulation plan…",
  },
  {
    lines: ["ln-5-6", "ln-5-7"],
    nodes: [6, 7],
    text: "BAY 06 / 07 — CFD + Structural — running in parallel…",
  },
  {
    lines: ["ln-6-8", "ln-7-8"],
    nodes: [8],
    text: "BAY 08 — Optimization Agent — searching for Pareto-optimal designs…",
  },
  {
    lines: ["ln-8-9"],
    nodes: [9],
    text: "BAY 09 — Validation Agent — checking result against mission spec…",
  },
  {
    lines: ["ln-9-10", "ln-9-11", "ln-9-12", "ln-9-13", "ln-9-14"],
    nodes: [10, 11, 12, 13, 14],
    text: "BAY 10–14 — Materials, Manufacturing, Certification, Documentation, Collaboration…",
  },
  {
    lines: [],
    nodes: [15],
    text: "BAY 15 — Knowledge Agent — outcome written to shared memory. Sequence complete.",
  },
];

type DynamicStatus = "idle" | "active" | "seen";

function TheHangarWelcome() {
  const ready = useHangarSession();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<NodeData | null>(null);
  const [nodeStatus, setNodeStatus] = useState<Record<number, DynamicStatus>>({});
  const [drawnLines, setDrawnLines] = useState<Set<string>>(new Set());
  const [liveText, setLiveText] = useState("Idle — click a bay, or run the sequence.");
  const [running, setRunning] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const timeouts = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(
    () => () => {
      timeouts.current.forEach(clearTimeout);
    },
    [],
  );

  // Same real Supabase session Flight Deck's sign-in creates (session.ts's
  // own useHangarSession guard above only checks the sessionStorage flag,
  // not this) — read here purely to show who's signed in.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setCurrentUserEmail(data.session?.user.email ?? null);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUserEmail(session?.user.email ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (!ready) return null;

  // Hover/focus — preview only, for every bay, unchanged regardless of href.
  function preview(n: NodeData) {
    setSelected(n);
  }

  // Click/Enter/Space — navigates if the bay has an href, otherwise falls
  // back to the same preview behavior. Mirrors the mockup's activate().
  function activate(n: NodeData) {
    if (n.href) {
      navigate({
        to: n.href as
          | "/the-hangar/mission"
          | "/the-hangar/concept"
          | "/the-hangar/aircraft-design"
          | "/the-hangar/cad-design",
      });
    } else {
      setSelected(n);
    }
  }

  function resetDiagram() {
    setDrawnLines(new Set());
    setNodeStatus({});
  }

  // "Exit Hangar" is a full logout, not just navigation — clears both the
  // real Supabase session and the hangar_session flag, so /the-hangar shows
  // "Flight Deck" again afterward instead of "Welcome, {email}".
  async function exitHangar() {
    await supabase.auth.signOut();
    sessionStorage.removeItem("hangar_session");
    navigate({ to: "/the-hangar" });
  }

  function runSequence() {
    if (running) return;
    setRunning(true);
    resetDiagram();

    let t = 0;
    STAGES.forEach((stage, idx) => {
      const id1 = setTimeout(() => {
        setLiveText(stage.text);
        if (stage.lines.length > 0) {
          setDrawnLines((prev) => new Set([...prev, ...stage.lines]));
        }
        stage.nodes.forEach((nid) => {
          if (nid === 1) return; // Mission Agent stays permanently 'online', never animated
          setNodeStatus((prev) => ({ ...prev, [nid]: "active" }));
          const id2 = setTimeout(() => {
            setNodeStatus((prev) => ({ ...prev, [nid]: "seen" }));
          }, 650);
          timeouts.current.push(id2);
        });
        if (idx === STAGES.length - 1) {
          const id3 = setTimeout(() => setRunning(false), 900);
          timeouts.current.push(id3);
        }
      }, t);
      timeouts.current.push(id1);
      t += stage.text.indexOf("06 / 07") > -1 || stage.text.indexOf("10") > -1 ? 1000 : 750;
    });
  }

  function nodeCircleClassName(n: NodeData): string {
    let cls = "hgr-w-node-circle";
    if (n.hub) cls += " hgr-w-hub";
    if (n.href) cls += " hgr-w-linkable";
    if (n.id === 1) cls += " hgr-w-online";
    else {
      const s = nodeStatus[n.id];
      if (s === "active") cls += " hgr-w-active";
      else if (s === "seen") cls += " hgr-w-seen";
    }
    return cls;
  }

  return (
    <div className="hgr-w">
      <style>{HGR_WELCOME_CSS}</style>

      <nav>
        <div className="hgr-w-wrap">
          <div className="hgr-w-brand">
            <span className="hgr-w-torq">TORQWINGS</span>
            <span className="hgr-w-sep">/</span>
            <span className="hgr-w-hangar-word">The Hangar</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {currentUserEmail && (
              <span
                className="hgr-w-mono"
                style={{ fontSize: 12.5, color: "var(--hgr-w-paper-dim)" }}
              >
                Welcome, {currentUserEmail}
              </span>
            )}
            <button type="button" className="hgr-w-exit" onClick={exitHangar}>
              Exit Hangar
            </button>
          </div>
        </div>
      </nav>

      <main>
        <div className="hgr-w-wrap">
          <div className="hgr-w-head-row">
            <div className="hgr-w-doors">
              <div className="hgr-w-door hgr-w-door-left" />
              <div className="hgr-w-door hgr-w-door-right" />
            </div>
            <div>
              <div className="hgr-w-eyebrow">
                <span className="hgr-w-dot" />
                Flight Deck — clearance granted
              </div>
              <h1>
                Welcome to <span>The Hangar</span>.
              </h1>
              <p className="hgr-w-lead">
                This is the live circuit — how a mission actually moves through all 15 agents. Hover
                any bay to read what it does, or run the sequence to watch it happen.
              </p>
            </div>
            <div className="hgr-w-runbar">
              <button
                className="hgr-w-btn hgr-w-btn-amber"
                disabled={running}
                onClick={runSequence}
              >
                ▶ Run Mission Sequence
              </button>
            </div>
          </div>

          <div className="hgr-w-rig">
            <div className="hgr-w-diagram-pane">
              <svg
                viewBox="0 0 1200 720"
                xmlns="http://www.w3.org/2000/svg"
                role="img"
                aria-label="The Hangar agent pipeline diagram"
              >
                {HUB_LINES.map((d, i) => (
                  <path key={i} className="hgr-w-hub-line" d={d} />
                ))}
                {LEAD_LINES.map((line) => (
                  <path
                    key={line.id}
                    className={`hgr-w-lead-line${drawnLines.has(line.id) ? " drawn" : ""}`}
                    d={line.d}
                  />
                ))}
                <g>
                  {NODES.map((n) => {
                    const r = n.r || 30;
                    return (
                      <g
                        key={n.id}
                        className={`hgr-w-node-g${n.href ? " hgr-w-linkable" : ""}`}
                        tabIndex={0}
                        role="button"
                        aria-label={n.title}
                        onMouseEnter={() => preview(n)}
                        onFocus={() => preview(n)}
                        onClick={() => activate(n)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            activate(n);
                          }
                        }}
                      >
                        <circle cx={n.x} cy={n.y} r={r} className={nodeCircleClassName(n)} />
                        <text x={n.x} y={n.y - (n.hub ? 2 : 1)} className="hgr-w-node-num">
                          {"B" + n.bay}
                        </text>
                        {n.status === "online" && (
                          <rect
                            x={n.x - 25}
                            y={n.y + 4}
                            width={50}
                            height={17}
                            rx={8.5}
                            className="hgr-w-live-pill"
                          />
                        )}
                        <text
                          x={n.x}
                          y={n.y + 14}
                          className={`hgr-w-status-badge ${n.status === "online" ? "hgr-w-online-badge" : "hgr-w-design-badge"}`}
                        >
                          {n.status === "online" ? "LIVE" + (n.href ? " ↗" : "") : ""}
                        </text>
                        <text x={n.x} y={n.y + r + 20} className="hgr-w-node-label">
                          {n.name}
                        </text>
                      </g>
                    );
                  })}
                </g>
              </svg>
              <div className="hgr-w-live-line hgr-w-mono">
                <span className="hgr-w-caret" />
                <span>{liveText}</span>
              </div>
            </div>

            <div className="hgr-w-info-pane">
              {!selected ? (
                <div className="hgr-w-info-empty">
                  <span className="hgr-w-hint">→ Select a bay</span>
                  Every agent in The Hangar reads and writes through a shared memory layer — hover
                  or tap any bay in the circuit to see what it does, what it reads, and what it
                  produces.
                </div>
              ) : (
                <div className="hgr-w-info-content show">
                  <span
                    className={`hgr-w-info-tag ${selected.status === "online" ? "hgr-w-online-tag" : "hgr-w-design-tag"}`}
                  >
                    {selected.status === "online" ? "LIVE NOW" : "IN DESIGN"}
                  </span>
                  <span className="hgr-w-bay-tag">{"BAY " + selected.bay}</span>
                  <h3>{selected.title}</h3>
                  <p>{selected.desc}</p>
                  <div className="hgr-w-info-meta">
                    <div>
                      <span>Reads</span>
                      <span>{selected.inp}</span>
                    </div>
                    <div>
                      <span>Tools</span>
                      <span>{selected.tools}</span>
                    </div>
                    <div>
                      <span>Writes</span>
                      <span>{selected.out}</span>
                    </div>
                  </div>
                  {selected.href && (
                    <Link
                      to={
                        selected.href as
                          | "/the-hangar/mission"
                          | "/the-hangar/concept"
                          | "/the-hangar/aircraft-design"
                          | "/the-hangar/cad-design"
                      }
                      className="hgr-w-btn hgr-w-btn-amber"
                      style={{ justifyContent: "center", marginTop: 18, textDecoration: "none" }}
                    >
                      {"Open " + selected.title + " →"}
                    </Link>
                  )}
                </div>
              )}
              <div className="hgr-w-foot-note">
                Mission Agent is running against real logic today. Every other bay is shown exactly
                as it's designed — it goes live here the moment it ships.
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

const HGR_WELCOME_CSS = `
.hgr-w{
  --hgr-w-navy-deep:#08131F;
  --hgr-w-navy-panel:#0F2136;
  --hgr-w-navy-panel-2:#132A44;
  --hgr-w-blue-line:#3E7CA6;
  --hgr-w-blue-bright:#6FB4E0;
  --hgr-w-amber:#E8A33D;
  --hgr-w-amber-bright:#F6C374;
  --hgr-w-paper:#ECEFF3;
  --hgr-w-paper-dim:#8FA5BB;
  --hgr-w-grid:rgba(111,180,224,0.08);
  --hgr-w-hairline:rgba(111,180,224,0.20);
  --hgr-w-green:#5FBF8F;
  --hgr-w-green-bright:#9CF0C4;
  --hgr-w-idle-line:rgba(111,180,224,0.28);
  --hgr-w-idle-node:#16324E;

  background:var(--hgr-w-navy-deep); color:var(--hgr-w-paper);
  font-family:'IBM Plex Sans', sans-serif; min-height:100vh;
  background-image:
    linear-gradient(var(--hgr-w-grid) 1px, transparent 1px),
    linear-gradient(90deg, var(--hgr-w-grid) 1px, transparent 1px);
  background-size:44px 44px;
}
.hgr-w *{ box-sizing:border-box; }
.hgr-w h1,.hgr-w h2,.hgr-w h3{ font-family:'Space Grotesk', sans-serif; font-weight:600; letter-spacing:-0.01em; margin:0; }
.hgr-w-mono{ font-family:'IBM Plex Mono', monospace; }
.hgr-w-wrap{ max-width:1280px; margin:0 auto; padding:0 32px; }

.hgr-w nav{ border-bottom:1px solid var(--hgr-w-hairline); position:sticky; top:0; background:rgba(8,19,31,0.85); backdrop-filter:blur(8px); z-index:20; }
.hgr-w nav .hgr-w-wrap{ display:flex; align-items:center; justify-content:space-between; height:70px; }
.hgr-w-brand{ font-size:15px; }
.hgr-w-torq{ color:var(--hgr-w-paper-dim); font-weight:500; }
.hgr-w-sep{ color:var(--hgr-w-blue-line); }
.hgr-w-hangar-word{ font-family:'Space Grotesk',sans-serif; font-weight:700; font-size:18px; }
.hgr-w-exit{ font-family:'IBM Plex Mono',monospace; font-size:12.5px; color:var(--hgr-w-paper-dim); text-decoration:none; border:1px solid var(--hgr-w-hairline); padding:9px 16px; border-radius:2px; transition:.15s; background:none; cursor:pointer; }
.hgr-w-exit:hover{ color:var(--hgr-w-paper); border-color:var(--hgr-w-blue-bright); }

.hgr-w main{ padding:56px 0 90px; }
.hgr-w-eyebrow{
  font-family:'IBM Plex Mono',monospace; font-size:12px; letter-spacing:.14em; text-transform:uppercase;
  color:var(--hgr-w-amber); margin-bottom:14px; display:flex; align-items:center; gap:10px;
}
.hgr-w-eyebrow .hgr-w-dot{ width:6px; height:6px; border-radius:50%; background:var(--hgr-w-green); box-shadow:0 0 8px var(--hgr-w-green); }
.hgr-w-head-row{ display:flex; justify-content:space-between; align-items:flex-end; gap:32px; flex-wrap:wrap; margin-bottom:36px; position:relative; overflow:hidden; }
.hgr-w-doors{ position:absolute; inset:0; z-index:5; display:flex; pointer-events:none; }
.hgr-w-door{ flex:1; background: repeating-linear-gradient(90deg, #0C1E30 0 78px, #08131F 78px 80px); position:relative; }
.hgr-w-door::after{ content:""; position:absolute; top:0; bottom:0; width:2px; background:var(--hgr-w-blue-line); opacity:.5; }
.hgr-w-door-left{ animation: hgr-w-openLeft 1.4s cubic-bezier(.77,0,.18,1) .3s forwards; }
.hgr-w-door-right{ animation: hgr-w-openRight 1.4s cubic-bezier(.77,0,.18,1) .3s forwards; }
.hgr-w-door-left::after{ right:0; }
.hgr-w-door-right::after{ left:0; }
@keyframes hgr-w-openLeft{ from{ transform:translateX(0);} to{ transform:translateX(-100%);} }
@keyframes hgr-w-openRight{ from{ transform:translateX(0);} to{ transform:translateX(100%);} }
@media (prefers-reduced-motion: reduce){ .hgr-w-doors{ display:none; } }
.hgr-w main h1{ font-size:clamp(28px,4vw,44px); margin-bottom:10px; }
.hgr-w main h1 span{ color:var(--hgr-w-blue-bright); }
.hgr-w-lead{ color:var(--hgr-w-paper-dim); font-size:15.5px; max-width:480px; }

.hgr-w-runbar{ display:flex; align-items:center; gap:14px; flex-shrink:0; }
.hgr-w-btn{ font-family:'IBM Plex Mono',monospace; font-size:13px; font-weight:500; border-radius:2px; padding:11px 20px; cursor:pointer; border:1px solid transparent; display:inline-flex; align-items:center; gap:8px; }
.hgr-w-btn-amber{ background:var(--hgr-w-amber); color:var(--hgr-w-navy-deep); }
.hgr-w-btn-amber:hover:not(:disabled){ background:var(--hgr-w-amber-bright); }
.hgr-w-btn-amber:disabled{ opacity:.5; cursor:default; }

.hgr-w-rig{
  display:grid; grid-template-columns:1fr 300px; gap:0;
  border:1px solid var(--hgr-w-hairline); background:var(--hgr-w-navy-panel);
}
@media(max-width:900px){ .hgr-w-rig{ grid-template-columns:1fr; } }

.hgr-w-diagram-pane{ position:relative; overflow:hidden; }
.hgr-w-diagram-pane svg{ width:100%; height:auto; display:block; }

.hgr-w-node-circle{ fill:var(--hgr-w-idle-node); stroke:var(--hgr-w-idle-line); stroke-width:1.5; transition:fill .3s, stroke .3s, filter .3s; cursor:pointer; }
.hgr-w-node-circle.hgr-w-hub{ fill:#0C2338; stroke:var(--hgr-w-blue-line); stroke-width:1.5; stroke-dasharray:3 3; }
.hgr-w-node-circle.hgr-w-active{ fill:#1B3A57; stroke:var(--hgr-w-amber); filter:drop-shadow(0 0 10px rgba(232,163,61,0.65)); }
.hgr-w-node-circle.hgr-w-online{ fill:#123B2E; stroke:var(--hgr-w-green); filter:drop-shadow(0 0 10px rgba(95,191,143,0.55)); }
.hgr-w-node-circle.hgr-w-linkable{ cursor:pointer; }
.hgr-w-node-g.hgr-w-linkable:hover .hgr-w-node-circle.hgr-w-online{ stroke:var(--hgr-w-amber-bright); filter:drop-shadow(0 0 14px rgba(246,195,116,0.65)); }
.hgr-w-node-g.hgr-w-linkable .hgr-w-node-label{ text-decoration:underline; text-decoration-color:rgba(111,180,224,0.35); text-underline-offset:3px; }
.hgr-w-node-g.hgr-w-linkable:hover .hgr-w-node-label{ text-decoration-color:var(--hgr-w-amber-bright); }
.hgr-w-node-circle.hgr-w-seen{ fill:#16324E; stroke:var(--hgr-w-blue-bright); }
.hgr-w-node-g{ outline:none; }
.hgr-w-node-g:focus .hgr-w-node-circle{ stroke:var(--hgr-w-amber-bright); stroke-width:2.5; }
.hgr-w-node-num{ font-family:'IBM Plex Mono',monospace; fill:var(--hgr-w-paper-dim); font-size:11px; text-anchor:middle; pointer-events:none; }
.hgr-w-node-circle.hgr-w-active + .hgr-w-node-num, .hgr-w-node-circle.hgr-w-online + .hgr-w-node-num, .hgr-w-node-circle.hgr-w-seen + .hgr-w-node-num{ fill:var(--hgr-w-paper); }
.hgr-w-node-label{ font-family:'IBM Plex Sans',sans-serif; fill:var(--hgr-w-paper-dim); font-size:12.5px; text-anchor:middle; pointer-events:none; }
.hgr-w-node-g:hover .hgr-w-node-circle:not(.hgr-w-hub){ stroke:var(--hgr-w-blue-bright); }
.hgr-w-node-g:hover .hgr-w-node-label{ fill:var(--hgr-w-paper); }

.hgr-w-lead-line{ fill:none; stroke:var(--hgr-w-idle-line); stroke-width:1.6; transition:stroke .4s, stroke-width .4s; }
.hgr-w-lead-line.drawn{ stroke:var(--hgr-w-blue-bright); stroke-width:2.2; }
.hgr-w-hub-line{ fill:none; stroke:var(--hgr-w-blue-line); stroke-width:1; stroke-dasharray:2 5; opacity:.5; }

.hgr-w-status-badge{ font-family:'IBM Plex Mono',monospace; font-size:9.5px; text-anchor:middle; letter-spacing:.05em; }
.hgr-w-online-badge{ fill:var(--hgr-w-green-bright); font-size:10.5px; font-weight:700; }
.hgr-w-design-badge{ fill:var(--hgr-w-paper-dim); opacity:.7; }
.hgr-w-live-pill{
  fill:rgba(18,59,46,0.92); stroke:var(--hgr-w-green); stroke-width:1.2;
  filter:drop-shadow(0 0 6px rgba(95,191,143,0.75)); pointer-events:none;
}

.hgr-w-live-line{
  padding:12px 20px; border-top:1px solid var(--hgr-w-hairline);
  font-family:'IBM Plex Mono',monospace; font-size:12.5px; color:var(--hgr-w-blue-bright);
  min-height:44px; display:flex; align-items:center; gap:10px;
}
.hgr-w-live-line .hgr-w-caret{ width:7px; height:14px; background:var(--hgr-w-blue-bright); animation:hgr-w-blink 1s step-end infinite; flex-shrink:0; }
@keyframes hgr-w-blink{ 50%{ opacity:0; } }

.hgr-w-info-pane{ border-left:1px solid var(--hgr-w-hairline); padding:26px 24px; display:flex; flex-direction:column; }
@media(max-width:900px){ .hgr-w-info-pane{ border-left:none; border-top:1px solid var(--hgr-w-hairline); } }
.hgr-w-info-empty{ color:var(--hgr-w-paper-dim); font-size:13.5px; line-height:1.7; }
.hgr-w-info-empty .hgr-w-hint{ font-family:'IBM Plex Mono',monospace; font-size:11px; color:var(--hgr-w-blue-bright); text-transform:uppercase; letter-spacing:.08em; margin-bottom:12px; display:block; }
.hgr-w-info-tag{ font-family:'IBM Plex Mono',monospace; font-size:10.5px; letter-spacing:.08em; text-transform:uppercase; padding:4px 10px; border-radius:2px; display:inline-block; margin-bottom:14px; }
.hgr-w-online-tag{ color:var(--hgr-w-green); border:1px solid rgba(95,191,143,.4); }
.hgr-w-design-tag{ color:var(--hgr-w-paper-dim); border:1px solid var(--hgr-w-hairline); }
.hgr-w-info-pane h3{ font-size:19px; margin-bottom:10px; }
.hgr-w-bay-tag{ font-family:'IBM Plex Mono',monospace; font-size:11px; color:var(--hgr-w-amber); display:block; margin-bottom:6px; }
.hgr-w-info-pane p{ color:var(--hgr-w-paper-dim); font-size:13.5px; line-height:1.65; margin-bottom:16px; }
.hgr-w-info-meta{ font-size:12px; color:var(--hgr-w-paper-dim); border-top:1px dashed var(--hgr-w-hairline); padding-top:14px; }
.hgr-w-info-meta div{ display:flex; justify-content:space-between; padding:5px 0; gap:10px; }
.hgr-w-info-meta span:first-child{ font-family:'IBM Plex Mono',monospace; text-transform:uppercase; letter-spacing:.06em; font-size:10.5px; color:#5F7A93; flex-shrink:0; }
.hgr-w-info-meta span:last-child{ text-align:right; }

.hgr-w-foot-note{ margin-top:22px; color:#5F7A93; font-size:12px; line-height:1.6; }
`;
