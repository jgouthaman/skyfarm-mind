import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useHangarSession } from "@/lib/the-hangar/session";
import { supabase } from "@/integrations/supabase/client";

// ─────────────────────────────────────────────────────────────────────────
// The Hangar — Bay 01 (Mission Agent) detail page. Faithful port of
// mission-agent.html (reference mockup, see reference/the-hangar/mission-agent.html).
// Fully isolated — no imports from destud-auth.ts or any /destud file.
// Auth-gated the same way /the-hangar/welcome is, via the shared (Hangar-only)
// useHangarSession hook — redirects to /the-hangar if there's no session.
// ─────────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/the-hangar/mission")({
  component: TheHangarMission,
});

interface StageItem {
  label: string;
  desc: string;
}

interface Stage {
  num: string;
  title: string;
  items: StageItem[];
}

const STAGES: Stage[] = [
  {
    num: "01 · INPUT PROCESSING",
    title: "Understand the brief",
    items: [
      { label: "Intent understanding", desc: "LLM parses free-form input" },
      { label: "Entity extraction", desc: "Mission, constraints, KPIs" },
      { label: "Context retrieval", desc: "RAG against Knowledge Base" },
      { label: "Validation & normalization", desc: "Rules engine" },
    ],
  },
  {
    num: "02 · REASONING & PLANNING",
    title: "Decompose the mission",
    items: [
      { label: "Mission decomposition", desc: "LLM + prompt templates" },
      { label: "Constraint identification", desc: "Domain rules + LLM" },
      { label: "KPI derivation", desc: "Performance, cost, safety" },
      { label: "Trade-off prioritization", desc: "Heuristic / multi-criteria" },
    ],
  },
  {
    num: "03 · OUTPUT GENERATION",
    title: "Structure the spec",
    items: [
      { label: "Mission specification", desc: "Structured JSON" },
      { label: "Constraints list", desc: "Structured" },
      { label: "KPIs & targets", desc: "Structured" },
      { label: "Mission summary", desc: "Natural language" },
    ],
  },
  {
    num: "04 · OUTPUT INTERFACE",
    title: "Hand off downstream",
    items: [
      { label: "Structured data API", desc: "JSON" },
      { label: "Dashboard view", desc: "Mission overview UI" },
      { label: "Export", desc: "PDF / DOCX / Excel" },
      { label: "Event publish", desc: "To shared event bus" },
    ],
  },
];

const TOOLS_USED = [
  "LLM (GPT-4o / Llama 3)",
  "RAG / Vector Search",
  "Rules Engine",
  "Knowledge Graph",
  "Document Parser",
  "Calculator",
  "Prompt Templates",
];
const READS_WRITES = [
  "Mission DB — write",
  "Projects DB — read/write",
  "Knowledge Base — read",
  "Concept DB — read",
  "Regulations DB — read",
  "Audit / Logs DB — write",
];

// Status reflects what's actually built and wired, updated in step with the
// build per this page's own stated policy ("updated as each piece actually
// ships, not before") — not all "Done" just because the page now has a form.
const CHECKLIST = [
  {
    title: "Input intake",
    desc: "Natural-language brief + regulation selection, wired to the real API",
    done: true,
  },
  {
    title: "LLM reasoning & decomposition",
    desc: "Mission decomposition, constraint identification, KPI derivation",
    done: true,
  },
  {
    title: "Structured output + Mission DB write",
    desc: "Validated JSON spec persisted to Hangar_mission_specs",
    done: true,
  },
  {
    title: "Handoff to Concept Agent",
    desc: "Downstream bay reads the spec and starts generating options — Bay 02 isn't built yet",
    done: false,
  },
];

// ── Live intake form + Dashboard View (Section 13.1) ──

interface RegulationOption {
  code: string;
  name: string;
  region: string;
}

interface MissionSpecsView {
  domain: string;
  vertical: string | null;
  vehicleClass: string | null;
  missionType: string;
  phase: string;
  operatingEnvironment: string | null;
}

interface ConstraintView {
  name: string;
  value: string;
  sources: string[];
}

interface KpiView {
  name: string;
  target: string;
  unit: string;
  priority: "critical" | number;
}

interface MissionResult {
  missionId: string;
  missionCode: string;
  missionSpecs: MissionSpecsView;
  constraints: ConstraintView[];
  kpis: KpiView[];
  summary: string;
  confidenceScore: number;
  validationFlags: string[];
}

type SubmitStatus = "idle" | "loading" | "success" | "error";

// Section 4.4.1: the API is genuinely synchronous — one request, one
// response, no server-sent progress. These labels are a UX pacing device
// only (advanced on a timer while the request is in flight), not real
// per-stage telemetry — the dashboard only ever renders once the actual
// response comes back.
const PROGRESS_LABELS = [
  "Stage 2.1 — parsing brief, extracting intent & entities…",
  "Stage 2.2 — decomposing mission, identifying constraints & KPIs…",
  "Stage 2.3 — assembling spec, generating summary…",
  "Stage 2.4 — persisting mission spec…",
];

type RegulationsQueryResult = Promise<{
  data: RegulationOption[] | null;
  error: { message: string } | null;
}>;

async function fetchActiveRegulations(): RegulationsQueryResult {
  const db = supabase as unknown as {
    from: (table: string) => {
      select: (columns: string) => {
        eq: (column: string, value: boolean) => RegulationsQueryResult;
      };
    };
  };
  return db.from("Hangar_regulations_catalog").select("code,name,region").eq("active", true);
}

function TheHangarMission() {
  const ready = useHangarSession();

  // All hooks called unconditionally, before the `!ready` early return below
  // — useHangarSession's own redirect-in-progress render still needs these
  // declared in the same order every time (rules of hooks).
  const [briefText, setBriefText] = useState("");
  const [regulations, setRegulations] = useState<RegulationOption[]>([]);
  const [selectedRegulations, setSelectedRegulations] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<MissionResult | null>(null);
  const [progressLabel, setProgressLabel] = useState(PROGRESS_LABELS[0]);
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchActiveRegulations().then(({ data }) => {
      if (!cancelled && data) setRegulations(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(
    () => () => {
      if (progressTimer.current) clearInterval(progressTimer.current);
    },
    [],
  );

  function toggleRegulation(code: string) {
    setSelectedRegulations((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  function resetForSameOrNewMission() {
    setStatus("idle");
    setResult(null);
    setErrorMessage(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!briefText.trim() || status === "loading") return;

    setStatus("loading");
    setErrorMessage(null);
    setResult(null);

    let stageIdx = 0;
    setProgressLabel(PROGRESS_LABELS[0]);
    progressTimer.current = setInterval(() => {
      stageIdx = Math.min(stageIdx + 1, PROGRESS_LABELS.length - 1);
      setProgressLabel(PROGRESS_LABELS[stageIdx]);
    }, 4000);

    try {
      // The API requires a real Supabase session (Section 12's input schema
      // has no user_id field by design — identity comes from the caller's
      // session, Section 10.2). Flight Deck's current sign-in is a
      // client-side stub (sessionStorage flag only, per this page's own
      // session.ts) and does not create one — this only succeeds today if
      // the browser already holds a real Supabase session from elsewhere in
      // the app. Surfaced honestly rather than silently failing.
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        setStatus("error");
        setErrorMessage(
          "No signed-in TorqWings session found. Flight Deck's current sign-in is a temporary demo stub and doesn't create a real account session — sign in with a real TorqWings account elsewhere in the app first, then retry.",
        );
        return;
      }

      const sources: { source_type: string; raw_input: Record<string, unknown> }[] = [
        { source_type: "natural_language", raw_input: { text: briefText.trim() } },
      ];
      if (selectedRegulations.size > 0) {
        sources.push({
          source_type: "regulations",
          raw_input: { regulation_codes: [...selectedRegulations] },
        });
      }

      const res = await fetch("/api/hangar/process-mission", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ sources }),
      });
      const json = await res.json();

      if (!res.ok) {
        setStatus("error");
        // Section 12.1 / missionInputValidation.ts: a 400 here is the
        // real, expected "nothing usable in this brief" rejection, not a
        // generic failure — json.error already carries that exact reason,
        // same message either way, no special-casing needed to make it
        // readable.
        setErrorMessage(json.error ?? `Request failed (HTTP ${res.status}).`);
        return;
      }

      setResult({
        missionId: json.mission_id,
        missionCode: json.mission_code,
        missionSpecs: json.mission_specs,
        constraints: json.constraints,
        kpis: json.kpis,
        summary: json.summary,
        confidenceScore: json.confidence_score,
        validationFlags: json.validation_flags ?? [],
      });
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Unexpected error — check your connection and try again.",
      );
    } finally {
      if (progressTimer.current) clearInterval(progressTimer.current);
    }
  }

  if (!ready) return null;

  return (
    <div className="hgr-m">
      <style>{HGR_MISSION_CSS}</style>

      <nav>
        <div className="hgr-m-wrap">
          <div className="hgr-m-crumbs">
            <Link to="/">TorqWings</Link>
            <span className="hgr-m-sep">/</span>
            <Link to="/the-hangar/welcome">The Hangar</Link>
            <span className="hgr-m-sep">/</span>
            <span className="hgr-m-cur">Bay 01 — Mission Agent</span>
          </div>
          <Link to="/the-hangar/welcome" className="hgr-m-exit">
            ← Back to Hangar
          </Link>
        </div>
      </nav>

      <main>
        <div className="hgr-m-hero">
          <div className="hgr-m-wrap">
            <div className="hgr-m-status-row">
              <span className="hgr-m-badge hgr-m-badge-dev">
                <span className="hgr-m-dot" />
                In development — build started today
              </span>
              <span className="hgr-m-badge hgr-m-badge-bay">BAY 01 OF 15</span>
            </div>
            <h1>Mission Agent</h1>
            <p className="hgr-m-lead">
              The first agent every mission passes through. It takes a brief in plain language and
              turns it into a <b>structured, gate-ready spec</b> — payload, range, endurance,
              constraints, KPIs — that Concept Agent and everything downstream builds against.
            </p>
          </div>
        </div>

        <section>
          <div className="hgr-m-wrap">
            <div className="hgr-m-kicker">Where it sits</div>
            <h2 className="hgr-m-sec-title">First bay in the pipeline.</h2>
            <p className="hgr-m-sec-sub">
              Mission Agent has no upstream agent — it's the entry point. Its output is the one
              thing every other bay in The Hangar can trace itself back to.
            </p>

            <div className="hgr-m-placement">
              <div className="hgr-m-p-node hgr-m-here">
                <div className="hgr-m-b">BAY 01</div>
                <div className="hgr-m-n">Mission Agent</div>
                <div className="hgr-m-s">You are here</div>
              </div>
              <div className="hgr-m-p-arrow">→</div>
              <div className="hgr-m-p-node">
                <div className="hgr-m-b">BAY 02</div>
                <div className="hgr-m-n">Concept Agent</div>
                <div className="hgr-m-s">Next in line</div>
              </div>
              <div className="hgr-m-p-arrow">→</div>
              <div className="hgr-m-p-node">
                <div className="hgr-m-b">BAY 03</div>
                <div className="hgr-m-n">Aircraft Design</div>
                <div className="hgr-m-s">In design</div>
              </div>

              <div className="hgr-m-p-hub">
                <div className="hgr-m-circ">B15</div>
                <div className="hgr-m-n">
                  Reads &amp; writes
                  <br />
                  Knowledge Agent
                </div>
              </div>
            </div>

            <Link to="/the-hangar/welcome" className="hgr-m-see-all">
              See the full 15-bay circuit →
            </Link>
          </div>
        </section>

        <section>
          <div className="hgr-m-wrap">
            <div className="hgr-m-kicker">How it works</div>
            <h2 className="hgr-m-sec-title">Brief in, structured spec out.</h2>
            <p className="hgr-m-sec-sub">
              Four internal stages — this is the actual architecture being built today, not a
              simplified version of it.
            </p>

            <div className="hgr-m-stages">
              {STAGES.map((stage) => (
                <div key={stage.num} className="hgr-m-stage">
                  <div className="hgr-m-stage-num">{stage.num}</div>
                  <h4>{stage.title}</h4>
                  <ul>
                    {stage.items.map((item) => (
                      <li key={item.label}>
                        <b>{item.label}</b>
                        {item.desc}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section>
          <div className="hgr-m-wrap">
            <div className="hgr-m-kicker">Tools &amp; memory</div>
            <h2 className="hgr-m-sec-title">What it reaches for.</h2>
            <p className="hgr-m-sec-sub">
              Nothing exotic — the same categories every other bay in The Hangar uses, scoped to
              mission definition.
            </p>

            <div className="hgr-m-chip-groups">
              <div className="hgr-m-chip-group">
                <h4>Tools used</h4>
                <div className="hgr-m-chips">
                  {TOOLS_USED.map((chip) => (
                    <span key={chip} className="hgr-m-chip">
                      {chip}
                    </span>
                  ))}
                </div>
              </div>
              <div className="hgr-m-chip-group">
                <h4>Reads / writes</h4>
                <div className="hgr-m-chips">
                  {READS_WRITES.map((chip) => (
                    <span key={chip} className="hgr-m-chip">
                      {chip}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="process-mission">
          <div className="hgr-m-wrap">
            <div className="hgr-m-kicker">Process a mission</div>
            <h2 className="hgr-m-sec-title">Turn a brief into a structured spec, live.</h2>
            <p className="hgr-m-sec-sub">
              Runs the real Stage 2.1 → 2.4 pipeline — intent extraction, decomposition,
              constraint/KPI derivation, spec assembly, and persistence. Several sequential LLM
              calls, so this can take a while.
            </p>

            {status !== "success" && (
              <form className="hgr-m-intake" onSubmit={handleSubmit}>
                <div className="hgr-m-field">
                  <label htmlFor="hgrBrief">Mission brief</label>
                  <textarea
                    id="hgrBrief"
                    rows={5}
                    placeholder="e.g. Need a drone for crop monitoring over 200 hectares, budget under ₹5 lakh, must operate in Tamil Nadu."
                    value={briefText}
                    onChange={(e) => setBriefText(e.target.value)}
                    disabled={status === "loading"}
                  />
                </div>

                {regulations.length > 0 && (
                  <div className="hgr-m-field">
                    <label>Applicable regulations (optional)</label>
                    <div className="hgr-m-reg-list">
                      {regulations.map((r) => (
                        <label key={r.code} className="hgr-m-reg-item">
                          <input
                            type="checkbox"
                            checked={selectedRegulations.has(r.code)}
                            onChange={() => toggleRegulation(r.code)}
                            disabled={status === "loading"}
                          />
                          <span>
                            {r.name} <em>({r.region})</em>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className="hgr-m-btn hgr-m-btn-amber"
                  disabled={status === "loading" || !briefText.trim()}
                >
                  {status === "loading" ? "Processing…" : "Process Mission →"}
                </button>
              </form>
            )}

            {status === "loading" && (
              <div className="hgr-m-progress">
                <div className="hgr-m-progress-spinner" />
                <span>{progressLabel}</span>
              </div>
            )}

            {status === "error" && (
              <div className="hgr-m-error">
                <b>Couldn't process this mission.</b>
                <p>{errorMessage}</p>
                <button
                  type="button"
                  className="hgr-m-btn hgr-m-btn-ghost"
                  onClick={resetForSameOrNewMission}
                >
                  Try again
                </button>
              </div>
            )}

            {status === "success" && result && (
              <MissionDashboard
                result={result}
                onStartNew={() => {
                  resetForSameOrNewMission();
                  setBriefText("");
                  setSelectedRegulations(new Set());
                }}
              />
            )}
          </div>
        </section>

        <section style={{ borderBottom: "none" }}>
          <div className="hgr-m-wrap">
            <div className="hgr-m-kicker">Build progress</div>
            <h2 className="hgr-m-sec-title">What's real today.</h2>
            <p className="hgr-m-sec-sub">
              Honest status — updated as each piece actually ships, not before.
            </p>

            <div className="hgr-m-checklist">
              {CHECKLIST.map((item) => (
                <div key={item.title} className="hgr-m-cl-item">
                  <div className={`hgr-m-cl-box${item.done ? " hgr-m-cl-box-done" : ""}`}>
                    {item.done ? "✓" : ""}
                  </div>
                  <div className="hgr-m-cl-txt">
                    <b>{item.title}</b>
                    <span>{item.desc}</span>
                  </div>
                  <div className={`hgr-m-cl-tag${item.done ? " hgr-m-cl-tag-done" : ""}`}>
                    {item.done ? "Done" : "Not started"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="hgr-m-foot-cta">
          <div className="hgr-m-wrap">
            <h2>Bay 01 goes live the moment this checklist clears.</h2>
            <p>
              This page updates in step with the build — check back as items move from Not Started
              to Done.
            </p>
            <Link to="/the-hangar/welcome" className="hgr-m-btn hgr-m-btn-ghost">
              ← Back to The Hangar
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

// Dashboard View — MissionAgent.md Section 13.1's 7 sections, in reading
// order: header strip, summary, spec, constraints, KPIs, validation notes
// (if any), actions.
function MissionDashboard({
  result,
  onStartNew,
}: {
  result: MissionResult;
  onStartNew: () => void;
}) {
  const criticalKpis = result.kpis.filter((k) => k.priority === "critical");
  const rankedKpis = result.kpis
    .filter((k) => k.priority !== "critical")
    .sort((a, b) => (a.priority as number) - (b.priority as number));
  const orderedKpis = [...criticalKpis, ...rankedKpis];

  return (
    <div className="hgr-m-dash">
      {/* 1. Header strip */}
      <div className="hgr-m-dash-header">
        <div>
          <div className="hgr-m-dash-badge">Spec Ready</div>
          <h3>{result.missionSpecs.missionType}</h3>
          <div className="hgr-m-dash-id">{result.missionCode}</div>
        </div>
        <div className="hgr-m-dash-confidence">
          <div className="hgr-m-dash-confidence-num">
            {Math.round(result.confidenceScore * 100)}%
          </div>
          <div className="hgr-m-dash-confidence-label">Confidence</div>
        </div>
      </div>

      {/* 2. Mission Summary */}
      <div className="hgr-m-dash-section">
        <h4>Mission Summary</h4>
        <p className="hgr-m-dash-summary">{result.summary}</p>
      </div>

      {/* 3. Mission Specification */}
      <div className="hgr-m-dash-section">
        <h4>Mission Specification</h4>
        <div className="hgr-m-dash-fields">
          <DashField label="Domain" value={result.missionSpecs.domain} />
          <DashField label="Vertical" value={result.missionSpecs.vertical} />
          <DashField label="Vehicle Class" value={result.missionSpecs.vehicleClass} />
          <DashField label="Mission Type" value={result.missionSpecs.missionType} />
          <DashField label="Phase" value={result.missionSpecs.phase} />
          <DashField
            label="Operating Environment"
            value={result.missionSpecs.operatingEnvironment}
          />
        </div>
      </div>

      {/* 4. Constraints */}
      <div className="hgr-m-dash-section">
        <h4>Constraints ({result.constraints.length})</h4>
        {result.constraints.length === 0 ? (
          <p className="hgr-m-dash-empty">No constraints identified.</p>
        ) : (
          <div className="hgr-m-dash-constraints">
            {result.constraints.map((c, i) => (
              <div key={i} className="hgr-m-dash-constraint">
                <div className="hgr-m-dash-constraint-main">
                  <b>{c.name}</b>: {c.value}
                </div>
                <div className="hgr-m-dash-tags">
                  {c.sources.map((s) => (
                    <span key={s} className="hgr-m-dash-tag">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. KPIs & Targets */}
      <div className="hgr-m-dash-section">
        <h4>KPIs &amp; Targets ({result.kpis.length})</h4>
        {result.kpis.length === 0 ? (
          <p className="hgr-m-dash-empty">No KPIs derived.</p>
        ) : (
          <div className="hgr-m-dash-kpis">
            {orderedKpis.map((k, i) => (
              <div
                key={i}
                className={`hgr-m-dash-kpi${k.priority === "critical" ? " hgr-m-dash-kpi-critical" : ""}`}
              >
                <div className="hgr-m-dash-kpi-name">{k.name}</div>
                <div className="hgr-m-dash-kpi-target">
                  {k.target} {k.unit}
                </div>
                <div className="hgr-m-dash-kpi-priority">
                  {k.priority === "critical" ? "CRITICAL" : `#${k.priority}`}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 6. Validation flags (if any) */}
      {result.validationFlags.length > 0 && (
        <div className="hgr-m-dash-section">
          <h4>Validation Notes ({result.validationFlags.length})</h4>
          <ul className="hgr-m-dash-flags">
            {result.validationFlags.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 7. Actions */}
      <div className="hgr-m-dash-actions">
        <button
          type="button"
          className="hgr-m-btn hgr-m-btn-ghost"
          disabled
          title="Not wired yet — no finalize endpoint built in this phase (Section 13.2)"
        >
          Save as final
        </button>
        <button
          type="button"
          className="hgr-m-btn hgr-m-btn-ghost"
          disabled
          title="Not wired yet — versioning (Section 13.2) not built in this phase"
        >
          Edit and regenerate
        </button>
        <button
          type="button"
          className="hgr-m-btn hgr-m-btn-ghost"
          disabled
          title="Bay 02 not yet built"
        >
          Continue to Concept Agent →
        </button>
        <button type="button" className="hgr-m-btn hgr-m-btn-amber" onClick={onStartNew}>
          Start a new mission
        </button>
      </div>
    </div>
  );
}

function DashField({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="hgr-m-dash-field">
      <div className="hgr-m-dash-field-label">{label}</div>
      <div className="hgr-m-dash-field-value">{value ?? "—"}</div>
    </div>
  );
}

const HGR_MISSION_CSS = `
.hgr-m{
  --hgr-m-navy-deep:#08131F; --hgr-m-navy-panel:#0F2136; --hgr-m-navy-panel-2:#132A44;
  --hgr-m-blue-line:#3E7CA6; --hgr-m-blue-bright:#6FB4E0;
  --hgr-m-amber:#E8A33D; --hgr-m-amber-bright:#F6C374;
  --hgr-m-paper:#ECEFF3; --hgr-m-paper-dim:#8FA5BB;
  --hgr-m-grid:rgba(111,180,224,0.08); --hgr-m-hairline:rgba(111,180,224,0.20);

  background:var(--hgr-m-navy-deep); color:var(--hgr-m-paper); font-family:'IBM Plex Sans', sans-serif;
  background-image:linear-gradient(var(--hgr-m-grid) 1px, transparent 1px), linear-gradient(90deg, var(--hgr-m-grid) 1px, transparent 1px);
  background-size:44px 44px;
  min-height:100vh;
}
.hgr-m *{ box-sizing:border-box; }
.hgr-m h1,.hgr-m h2,.hgr-m h3{ font-family:'Space Grotesk', sans-serif; font-weight:600; letter-spacing:-0.01em; margin:0; }
.hgr-m-mono{ font-family:'IBM Plex Mono', monospace; }
.hgr-m-wrap{ max-width:1180px; margin:0 auto; padding:0 32px; }
.hgr-m a{ color:inherit; }

.hgr-m nav{ border-bottom:1px solid var(--hgr-m-hairline); position:sticky; top:0; background:rgba(8,19,31,0.9); backdrop-filter:blur(8px); z-index:20; }
.hgr-m nav .hgr-m-wrap{ display:flex; align-items:center; justify-content:space-between; height:68px; }
.hgr-m-crumbs{ font-size:14px; color:var(--hgr-m-paper-dim); display:flex; align-items:center; gap:8px; }
.hgr-m-crumbs a{ text-decoration:none; color:var(--hgr-m-paper-dim); }
.hgr-m-crumbs a:hover{ color:var(--hgr-m-blue-bright); }
.hgr-m-sep{ color:var(--hgr-m-blue-line); }
.hgr-m-cur{ color:var(--hgr-m-paper); font-weight:500; }
.hgr-m-exit{ font-family:'IBM Plex Mono',monospace; font-size:12.5px; color:var(--hgr-m-paper-dim); text-decoration:none; border:1px solid var(--hgr-m-hairline); padding:8px 15px; border-radius:2px; }
.hgr-m-exit:hover{ color:var(--hgr-m-paper); border-color:var(--hgr-m-blue-bright); }

.hgr-m main{ padding-bottom:100px; }

.hgr-m-hero{ padding:64px 0 44px; border-bottom:1px solid var(--hgr-m-hairline); }
.hgr-m-status-row{ display:flex; align-items:center; gap:12px; margin-bottom:22px; flex-wrap:wrap; }
.hgr-m-badge{
  font-family:'IBM Plex Mono',monospace; font-size:11.5px; letter-spacing:.1em; text-transform:uppercase;
  padding:6px 13px; border-radius:2px; display:inline-flex; align-items:center; gap:8px;
}
.hgr-m-badge-dev{ color:var(--hgr-m-amber); border:1px solid rgba(232,163,61,.4); }
.hgr-m-badge-dev .hgr-m-dot{ width:6px; height:6px; border-radius:50%; background:var(--hgr-m-amber); animation:hgr-m-pulse 1.6s ease-in-out infinite; }
@keyframes hgr-m-pulse{ 0%,100%{ opacity:1; } 50%{ opacity:.3; } }
.hgr-m-badge-bay{ color:var(--hgr-m-paper-dim); border:1px solid var(--hgr-m-hairline); }

.hgr-m-hero h1{ font-size:clamp(34px,5vw,58px); margin-bottom:14px; }
.hgr-m-hero .hgr-m-lead{ color:var(--hgr-m-paper-dim); font-size:16.5px; max-width:600px; line-height:1.65; margin-bottom:8px; }
.hgr-m-hero .hgr-m-lead b{ color:var(--hgr-m-paper); font-weight:600; }

.hgr-m section{ padding:60px 0; border-bottom:1px solid var(--hgr-m-hairline); }
.hgr-m-kicker{ font-family:'IBM Plex Mono',monospace; font-size:12px; letter-spacing:.14em; text-transform:uppercase; color:var(--hgr-m-amber); margin-bottom:12px; }
.hgr-m-sec-title{ font-size:clamp(22px,2.6vw,30px); margin-bottom:10px; }
.hgr-m-sec-sub{ color:var(--hgr-m-paper-dim); font-size:14.5px; max-width:600px; margin-bottom:36px; }

.hgr-m-placement{ display:flex; align-items:center; gap:0; overflow-x:auto; padding-bottom:8px; }
.hgr-m-p-node{
  flex-shrink:0; width:150px; text-align:center; padding:20px 14px; border-radius:2px;
  border:1px solid var(--hgr-m-hairline); background:var(--hgr-m-navy-panel);
}
.hgr-m-p-node.hgr-m-here{ border-color:var(--hgr-m-amber); background:#1B3A57; box-shadow:0 0 18px rgba(232,163,61,0.25); }
.hgr-m-p-node .hgr-m-b{ font-family:'IBM Plex Mono',monospace; font-size:10.5px; color:var(--hgr-m-paper-dim); margin-bottom:6px; }
.hgr-m-p-node.hgr-m-here .hgr-m-b{ color:var(--hgr-m-amber); }
.hgr-m-p-node .hgr-m-n{ font-size:14px; font-weight:500; }
.hgr-m-p-node .hgr-m-s{ font-family:'IBM Plex Mono',monospace; font-size:9.5px; text-transform:uppercase; margin-top:8px; color:var(--hgr-m-paper-dim); }
.hgr-m-p-node.hgr-m-here .hgr-m-s{ color:var(--hgr-m-amber); }
.hgr-m-p-arrow{ flex-shrink:0; width:40px; text-align:center; color:var(--hgr-m-blue-line); font-size:18px; }
.hgr-m-p-hub{ flex-shrink:0; margin-left:24px; padding-left:24px; border-left:1px dashed var(--hgr-m-hairline); text-align:center; width:130px; }
.hgr-m-p-hub .hgr-m-circ{ width:56px; height:56px; border-radius:50%; border:1px dashed var(--hgr-m-blue-line); display:flex; align-items:center; justify-content:center; margin:0 auto 8px; font-family:'IBM Plex Mono',monospace; font-size:10px; color:var(--hgr-m-blue-bright); }
.hgr-m-p-hub .hgr-m-n{ font-size:12.5px; color:var(--hgr-m-paper-dim); }
.hgr-m-see-all{ margin-top:24px; font-family:'IBM Plex Mono',monospace; font-size:12.5px; color:var(--hgr-m-blue-bright); text-decoration:none; display:inline-flex; align-items:center; gap:6px; }
.hgr-m-see-all:hover{ text-decoration:underline; }

.hgr-m-stages{ display:grid; grid-template-columns:repeat(4,1fr); gap:1px; background:var(--hgr-m-hairline); border:1px solid var(--hgr-m-hairline); }
@media(max-width:900px){ .hgr-m-stages{ grid-template-columns:1fr 1fr; } }
@media(max-width:560px){ .hgr-m-stages{ grid-template-columns:1fr; } }
.hgr-m-stage{ background:var(--hgr-m-navy-panel); padding:24px 22px; position:relative; }
.hgr-m-stage-num{ font-family:'IBM Plex Mono',monospace; color:var(--hgr-m-amber); font-size:11px; margin-bottom:10px; }
.hgr-m-stage h4{ font-family:'Space Grotesk',sans-serif; font-size:15.5px; font-weight:600; margin-bottom:14px; }
.hgr-m-stage ul{ list-style:none; margin:0; padding:0; }
.hgr-m-stage li{ font-size:13px; color:var(--hgr-m-paper-dim); padding:6px 0; border-top:1px dashed var(--hgr-m-hairline); }
.hgr-m-stage li:first-child{ border-top:none; }
.hgr-m-stage li b{ color:var(--hgr-m-paper); font-weight:500; display:block; margin-bottom:1px; }

.hgr-m-chip-groups{ display:grid; grid-template-columns:1fr 1fr; gap:40px; }
@media(max-width:760px){ .hgr-m-chip-groups{ grid-template-columns:1fr; } }
.hgr-m-chip-group h4{ font-family:'IBM Plex Mono',monospace; font-size:11.5px; letter-spacing:.08em; text-transform:uppercase; color:var(--hgr-m-paper-dim); margin-bottom:14px; }
.hgr-m-chips{ display:flex; flex-wrap:wrap; gap:9px; }
.hgr-m-chip{ font-family:'IBM Plex Mono',monospace; font-size:12.5px; color:var(--hgr-m-paper-dim); border:1px solid var(--hgr-m-hairline); padding:7px 13px; border-radius:2px; }

.hgr-m-contract{ display:grid; grid-template-columns:1fr 1fr; gap:1px; background:var(--hgr-m-hairline); border:1px solid var(--hgr-m-hairline); }
@media(max-width:760px){ .hgr-m-contract{ grid-template-columns:1fr; } }
.hgr-m-contract-panel{ background:var(--hgr-m-navy-panel); }
.hgr-m-contract-panel .hgr-m-ch{ padding:14px 20px; border-bottom:1px solid var(--hgr-m-hairline); font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.08em; text-transform:uppercase; color:var(--hgr-m-paper-dim); }
.hgr-m-contract-panel pre{ padding:20px; font-family:'IBM Plex Mono',monospace; font-size:12px; line-height:1.7; color:var(--hgr-m-blue-bright); overflow-x:auto; white-space:pre; margin:0; }
.hgr-m-k{ color:var(--hgr-m-paper-dim); }
.hgr-m-v{ color:var(--hgr-m-amber-bright); }

.hgr-m-checklist{ border:1px solid var(--hgr-m-hairline); background:var(--hgr-m-navy-panel); }
.hgr-m-cl-item{ display:flex; align-items:center; gap:16px; padding:18px 22px; border-bottom:1px dashed var(--hgr-m-hairline); }
.hgr-m-cl-item:last-child{ border-bottom:none; }
.hgr-m-cl-box{ width:20px; height:20px; border:1.5px solid var(--hgr-m-hairline); border-radius:3px; flex-shrink:0; }
.hgr-m-cl-txt b{ font-weight:500; display:block; font-size:14px; margin-bottom:2px; }
.hgr-m-cl-txt span{ font-size:12.5px; color:var(--hgr-m-paper-dim); }
.hgr-m-cl-tag{ margin-left:auto; font-family:'IBM Plex Mono',monospace; font-size:10px; letter-spacing:.06em; text-transform:uppercase; color:var(--hgr-m-paper-dim); flex-shrink:0; }

.hgr-m-foot-cta{ text-align:center; padding:70px 0 0; border-bottom:none; }
.hgr-m-foot-cta h2{ font-size:clamp(24px,3vw,34px); margin-bottom:14px; }
.hgr-m-foot-cta p{ color:var(--hgr-m-paper-dim); max-width:480px; margin:0 auto 30px; font-size:14.5px; }
.hgr-m-btn{ font-family:'IBM Plex Mono',monospace; font-size:13px; padding:12px 22px; border-radius:2px; display:inline-flex; align-items:center; gap:8px; text-decoration:none; border:1px solid transparent; cursor:pointer; background:none; }
.hgr-m-btn-ghost{ border:1px solid var(--hgr-m-hairline); color:var(--hgr-m-paper-dim); }
.hgr-m-btn-ghost:hover{ color:var(--hgr-m-paper); border-color:var(--hgr-m-blue-bright); }
.hgr-m-btn-amber{ background:var(--hgr-m-amber); color:var(--hgr-m-navy-deep); font-weight:600; }
.hgr-m-btn-amber:hover{ background:var(--hgr-m-amber-bright); }
.hgr-m-btn:disabled{ opacity:.4; cursor:not-allowed; }
.hgr-m-btn:disabled:hover{ color:var(--hgr-m-paper-dim); border-color:var(--hgr-m-hairline); }

.hgr-m-cl-box-done{ border-color:var(--hgr-m-blue-bright); background:rgba(111,180,224,0.15); color:var(--hgr-m-blue-bright); display:flex; align-items:center; justify-content:center; font-size:12px; }
.hgr-m-cl-tag-done{ color:var(--hgr-m-blue-bright); }

/* ── Intake form ── */
.hgr-m-intake{ max-width:640px; }
.hgr-m-field{ margin-bottom:22px; }
.hgr-m-field label{ display:block; font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.08em; text-transform:uppercase; color:var(--hgr-m-paper-dim); margin-bottom:10px; }
.hgr-m-field textarea{
  width:100%; background:var(--hgr-m-navy-panel); border:1px solid var(--hgr-m-hairline);
  color:var(--hgr-m-paper); font-family:'IBM Plex Sans',sans-serif; font-size:14.5px; line-height:1.6;
  padding:14px 16px; border-radius:2px; outline:none; resize:vertical; transition:border-color .15s;
}
.hgr-m-field textarea:focus{ border-color:var(--hgr-m-blue-bright); }
.hgr-m-field textarea:disabled{ opacity:.5; }
.hgr-m-reg-list{ display:flex; flex-direction:column; gap:10px; }
.hgr-m-reg-item{ display:flex; align-items:center; gap:10px; font-size:13.5px; color:var(--hgr-m-paper); cursor:pointer; }
.hgr-m-reg-item em{ color:var(--hgr-m-paper-dim); font-style:normal; }
.hgr-m-reg-item input{ accent-color:var(--hgr-m-amber); width:16px; height:16px; }

/* ── Loading / error ── */
.hgr-m-progress{ display:flex; align-items:center; gap:14px; padding:22px 0; color:var(--hgr-m-paper-dim); font-family:'IBM Plex Mono',monospace; font-size:13px; }
.hgr-m-progress-spinner{
  width:18px; height:18px; border-radius:50%; border:2px solid var(--hgr-m-hairline); border-top-color:var(--hgr-m-amber);
  animation:hgr-m-spin 0.8s linear infinite; flex-shrink:0;
}
@keyframes hgr-m-spin{ to{ transform:rotate(360deg); } }
.hgr-m-error{
  border:1px solid rgba(232,163,61,.4); background:rgba(232,163,61,.08); border-radius:2px;
  padding:20px 22px; max-width:640px;
}
.hgr-m-error b{ color:var(--hgr-m-amber-bright); display:block; margin-bottom:6px; font-size:14px; }
.hgr-m-error p{ color:var(--hgr-m-paper-dim); font-size:13.5px; margin:0 0 16px; line-height:1.6; }

/* ── Dashboard View (Section 13.1) ── */
.hgr-m-dash{ border:1px solid var(--hgr-m-hairline); background:var(--hgr-m-navy-panel); }
.hgr-m-dash-header{ display:flex; align-items:flex-start; justify-content:space-between; gap:24px; padding:26px 28px; border-bottom:1px solid var(--hgr-m-hairline); flex-wrap:wrap; }
.hgr-m-dash-badge{
  display:inline-block; font-family:'IBM Plex Mono',monospace; font-size:10.5px; letter-spacing:.08em; text-transform:uppercase;
  color:var(--hgr-m-blue-bright); border:1px solid rgba(111,180,224,.4); padding:4px 10px; border-radius:2px; margin-bottom:10px;
}
.hgr-m-dash-header h3{ font-size:20px; margin-bottom:6px; }
.hgr-m-dash-id{ font-family:'IBM Plex Mono',monospace; font-size:11.5px; color:var(--hgr-m-paper-dim); }
.hgr-m-dash-confidence{ text-align:center; flex-shrink:0; }
.hgr-m-dash-confidence-num{ font-family:'Space Grotesk',sans-serif; font-size:32px; font-weight:700; color:var(--hgr-m-amber-bright); line-height:1; }
.hgr-m-dash-confidence-label{ font-family:'IBM Plex Mono',monospace; font-size:10px; letter-spacing:.08em; text-transform:uppercase; color:var(--hgr-m-paper-dim); margin-top:6px; }
.hgr-m-dash-section{ padding:24px 28px; border-bottom:1px solid var(--hgr-m-hairline); }
.hgr-m-dash-section:last-of-type{ border-bottom:none; }
.hgr-m-dash-section h4{ font-family:'Space Grotesk',sans-serif; font-size:14.5px; font-weight:600; margin-bottom:16px; }
.hgr-m-dash-summary{ color:var(--hgr-m-paper); font-size:14.5px; line-height:1.7; margin:0; }
.hgr-m-dash-empty{ color:var(--hgr-m-paper-dim); font-size:13px; margin:0; }
.hgr-m-dash-fields{ display:grid; grid-template-columns:repeat(3,1fr); gap:20px; }
@media(max-width:700px){ .hgr-m-dash-fields{ grid-template-columns:1fr 1fr; } }
.hgr-m-dash-field-label{ font-family:'IBM Plex Mono',monospace; font-size:10.5px; letter-spacing:.06em; text-transform:uppercase; color:var(--hgr-m-paper-dim); margin-bottom:6px; }
.hgr-m-dash-field-value{ font-size:14px; }
.hgr-m-dash-constraints{ display:flex; flex-direction:column; gap:14px; }
.hgr-m-dash-constraint{ padding:14px 16px; background:var(--hgr-m-navy-deep); border:1px solid var(--hgr-m-hairline); border-radius:2px; }
.hgr-m-dash-constraint-main{ font-size:13.5px; margin-bottom:8px; }
.hgr-m-dash-tags{ display:flex; flex-wrap:wrap; gap:6px; }
.hgr-m-dash-tag{ font-family:'IBM Plex Mono',monospace; font-size:10.5px; color:var(--hgr-m-blue-bright); border:1px solid rgba(111,180,224,.35); padding:3px 9px; border-radius:2px; }
.hgr-m-dash-kpis{ display:grid; grid-template-columns:repeat(3,1fr); gap:1px; background:var(--hgr-m-hairline); border:1px solid var(--hgr-m-hairline); }
@media(max-width:760px){ .hgr-m-dash-kpis{ grid-template-columns:1fr 1fr; } }
@media(max-width:480px){ .hgr-m-dash-kpis{ grid-template-columns:1fr; } }
.hgr-m-dash-kpi{ background:var(--hgr-m-navy-deep); padding:16px 18px; }
.hgr-m-dash-kpi-critical{ background:#2A2013; box-shadow:inset 0 0 0 1px rgba(232,163,61,.4); }
.hgr-m-dash-kpi-name{ font-size:12.5px; color:var(--hgr-m-paper-dim); margin-bottom:6px; }
.hgr-m-dash-kpi-target{ font-family:'Space Grotesk',sans-serif; font-size:17px; font-weight:600; margin-bottom:8px; }
.hgr-m-dash-kpi-priority{ font-family:'IBM Plex Mono',monospace; font-size:10px; letter-spacing:.06em; color:var(--hgr-m-paper-dim); }
.hgr-m-dash-kpi-critical .hgr-m-dash-kpi-priority{ color:var(--hgr-m-amber-bright); }
.hgr-m-dash-flags{ margin:0; padding-left:20px; color:var(--hgr-m-paper-dim); font-size:13px; line-height:1.9; }
.hgr-m-dash-actions{ display:flex; flex-wrap:wrap; gap:12px; padding:24px 28px; }
`;
