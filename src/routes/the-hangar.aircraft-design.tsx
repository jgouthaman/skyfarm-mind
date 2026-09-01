import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useHangarSession } from "@/lib/the-hangar/session";
import { supabase } from "@/integrations/supabase/client";
import type { ConceptListEntry } from "@/lib/the-hangar/conceptAgentPipeline";
import type {
  Stage1Result,
  AircraftDesignListEntry,
} from "@/lib/the-hangar/aircraftDesignAgentPipeline";
import type {
  GeometryParameters,
  ComponentSelection,
} from "@/lib/the-hangar/aircraftDesignGeneration";

// ─────────────────────────────────────────────────────────────────────────
// The Hangar — Bay 03 (Aircraft Design Agent) detail page, phase 1. New,
// self-contained page (no shared imports with the-hangar.mission.tsx or
// the-hangar.concept.tsx, matching the welcome page's own "fully isolated"
// convention for each bay).
//
// Deliberately NOT a 4-item gated-stage tracker the way Mission Agent and
// Concept Agent's pages are — Bay 03 has exactly one real stage today
// (Geometry Generation). A tracker with 3 permanently-blank boxes would
// misrepresent what this bay actually does. This page uses the same
// single-spinner "Processing…" pattern Bay 01/02's own non-Stage-1 stages
// already use, with no tracker header at all.
//
// Intentional divergence from Concept Agent: source_was_mock is surfaced
// durably (live result, list row, past-design view) via MockSourceBadge,
// not just transiently the way Concept Agent's MockBadge is (see
// AircraftDesignAgent.md Section 3.e's documented gap — Hangar_concept_specs
// has no mock column at all, so Concept Agent's own indicator disappears
// the moment you leave the live run). Hangar_aircraft_design_specs DOES
// persist source_was_mock, so this bay can — and does — do better.
// ─────────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/the-hangar/aircraft-design")({
  component: TheHangarAircraftDesign,
});

interface FlowState {
  status: "idle" | "running" | "complete" | "error";
  result: Stage1Result | null;
  errorMessage: string | null;
}

const INITIAL_FLOW_STATE: FlowState = { status: "idle", result: null, errorMessage: null };

const AIRCRAFT_DESIGN_STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  processing: "Processing",
  spec_ready: "Spec Ready",
  finalized: "Finalized",
  error: "Error",
};

// Same fetch/auth/error-normalizing helper as the-hangar.concept.tsx's
// callStageApi, duplicated rather than shared — this page's own isolation
// convention.
async function callStageApi<TResult>(
  path: string,
  body: unknown,
): Promise<{ ok: true; data: TResult } | { ok: false; error: string }> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) {
    return {
      ok: false,
      error:
        "No signed-in TorqWings session found. Sign in with a real TorqWings account first, then retry.",
    };
  }
  try {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) {
      return { ok: false, error: json.error ?? `Request failed (HTTP ${res.status}).` };
    }
    return { ok: true, data: json as TResult };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : "Unexpected error — check your connection and try again.",
    };
  }
}

function TheHangarAircraftDesign() {
  const ready = useHangarSession();

  const [flow, setFlow] = useState<FlowState>(INITIAL_FLOW_STATE);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [finalizedConcepts, setFinalizedConcepts] = useState<ConceptListEntry[] | null>(null);
  const [finalizedConceptsStatus, setFinalizedConceptsStatus] = useState<
    "idle" | "loading" | "error"
  >("idle");
  const [conceptsExpanded, setConceptsExpanded] = useState(false);
  const [designs, setDesigns] = useState<AircraftDesignListEntry[] | null>(null);
  const [designsStatus, setDesignsStatus] = useState<"idle" | "loading" | "error">("idle");
  const [designsExpanded, setDesignsExpanded] = useState(false);
  const [selectedConcept, setSelectedConcept] = useState<ConceptListEntry | null>(null);
  const [selectedDesign, setSelectedDesign] = useState<AircraftDesignListEntry | null>(null);
  const [planExpanded, setPlanExpanded] = useState(false);

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

  // "Your finalized concepts" — reuses /api/hangar/concepts (Concept
  // Agent's own list route, no status filter) and filters to finalized
  // client-side, rather than adding a server-side ?status= filter the way
  // Mission Agent's list route has — keeps this pass self-contained to
  // this one new page. Extracted into a named function (not inline in the
  // effect) so a Retry button can re-invoke it on failure, same pattern
  // just retrofitted into Mission Agent's and Concept Agent's own lists.
  async function fetchFinalizedConcepts() {
    setFinalizedConceptsStatus("loading");
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setFinalizedConceptsStatus("error");
      return;
    }
    try {
      const res = await fetch("/api/hangar/concepts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const all: ConceptListEntry[] = await res.json();
      setFinalizedConcepts(all.filter((c) => c.status === "finalized"));
      setFinalizedConceptsStatus("idle");
    } catch {
      setFinalizedConceptsStatus("error");
    }
  }

  useEffect(() => {
    if (currentUserEmail) fetchFinalizedConcepts();
  }, [currentUserEmail]);

  // "Your aircraft designs" — refetched whenever a design reaches
  // spec_ready, same refresh-trigger pattern as Concept Agent's "Your
  // concepts" / Mission Agent's "Your missions".
  async function fetchAircraftDesigns() {
    setDesignsStatus("loading");
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setDesignsStatus("error");
      return;
    }
    try {
      const res = await fetch("/api/hangar/aircraft-designs", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setDesigns(await res.json());
      setDesignsStatus("idle");
    } catch {
      setDesignsStatus("error");
    }
  }

  useEffect(() => {
    if (currentUserEmail) fetchAircraftDesigns();
  }, [currentUserEmail, flow.status]);

  function resetFlow() {
    setFlow(INITIAL_FLOW_STATE);
    setSelectedConcept(null);
    setSelectedDesign(null);
  }

  function selectFinalizedConcept(c: ConceptListEntry) {
    resetFlow();
    setSelectedConcept(c);
    setPlanExpanded(true);
  }

  async function generateDesign() {
    if (!selectedConcept) return;
    setFlow({ status: "running", result: null, errorMessage: null });
    const outcome = await callStageApi<Stage1Result>(
      "/api/hangar/process-aircraft-design/geometry-generation",
      {
        conceptId: selectedConcept.conceptId,
      },
    );
    if (!outcome.ok) {
      setFlow({ status: "error", result: null, errorMessage: outcome.error });
      return;
    }
    setFlow({ status: "complete", result: outcome.data, errorMessage: null });
  }

  if (!ready) return null;

  const isIdle = flow.status === "idle";

  return (
    <div className="hgr-a">
      <style>{HGR_AIRCRAFT_DESIGN_CSS}</style>

      <nav>
        <div className="hgr-a-wrap">
          <div className="hgr-a-crumbs">
            <Link to="/">TorqWings</Link>
            <span className="hgr-a-sep">/</span>
            <Link to="/the-hangar">The Hangar</Link>
            <span className="hgr-a-sep">/</span>
            <span className="hgr-a-cur">Bay 03 — Aircraft Design Agent</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {currentUserEmail && (
              <span
                className="hgr-a-mono"
                style={{ fontSize: 12.5, color: "var(--hgr-a-paper-dim)" }}
              >
                Welcome, {currentUserEmail}
              </span>
            )}
            <Link to="/the-hangar/welcome" className="hgr-a-exit">
              ← Back to Hangar
            </Link>
            <Link to="/the-hangar" className="hgr-a-exit">
              Exit site
            </Link>
          </div>
        </div>
      </nav>

      <main>
        <div className="hgr-a-hero">
          <div className="hgr-a-doors">
            <div className="hgr-a-door hgr-a-door-left" />
            <div className="hgr-a-door hgr-a-door-right" />
          </div>
          <div className="hgr-a-wrap">
            <div className="hgr-a-status-row">
              <span className="hgr-a-badge hgr-a-badge-bay">BAY 03 OF 15</span>
            </div>
            <div className="hgr-a-hero-row">
              <h1>Aircraft Design Agent</h1>
              <p className="hgr-a-lead">
                Takes a <b>finalized concept</b> from Bay 02, gates it against hard constraints, and
                generates geometry parameters and a component selection — never a guess for anything
                the gate has already ruled out.
              </p>
            </div>
          </div>
        </div>

        <section id="generate-design">
          <div className="hgr-a-wrap">
            <div className="hgr-a-kicker">Generate a design</div>
            <h2 className="hgr-a-sec-title">Turn a finalized concept into gated geometry.</h2>
            <p className="hgr-a-sec-sub">
              Runs one real Claude Sonnet 5 call, after a deterministic hard-constraint gate has
              already ruled out anything infeasible — the LLM only reasons about a concept that
              already passed. There's no real airfoil database or OpenVSP/XFLR5 integration yet, so
              this is Claude reasoning about plausible geometry, not a simulated engineering result.
            </p>

            {finalizedConceptsStatus === "error" && (
              <ListFetchError onRetry={fetchFinalizedConcepts} />
            )}

            {finalizedConceptsStatus !== "error" &&
              finalizedConcepts &&
              finalizedConcepts.length > 0 &&
              !selectedDesign && (
                <ListPanel
                  title={`Your finalized concepts (${finalizedConcepts.length})`}
                  expanded={conceptsExpanded}
                  onToggleExpanded={() => setConceptsExpanded((v) => !v)}
                >
                  {finalizedConcepts.map((c) => (
                    <button
                      key={c.conceptId}
                      type="button"
                      className="hgr-a-list-row"
                      onClick={() => selectFinalizedConcept(c)}
                    >
                      <span className="hgr-a-list-row-code">{c.conceptCode}</span>
                      <span className="hgr-a-list-row-type">
                        {c.rankedConcepts?.[0]?.conceptName ?? "—"}
                      </span>
                      <span className="hgr-a-list-row-confidence">
                        {c.confidenceScore !== null
                          ? `${Math.round(c.confidenceScore * 100)}%`
                          : "—"}
                      </span>
                      <span className="hgr-a-list-row-date">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </span>
                    </button>
                  ))}
                </ListPanel>
              )}

            {finalizedConceptsStatus !== "error" &&
              finalizedConcepts &&
              finalizedConcepts.length === 0 && (
                <p className="hgr-a-empty-hint">
                  No finalized concepts yet — finalize one in{" "}
                  <Link to="/the-hangar/concept">Concept Agent</Link> first, then come back here to
                  generate a design from it.
                </p>
              )}

            {designsStatus === "error" && <ListFetchError onRetry={fetchAircraftDesigns} />}

            {designsStatus !== "error" && designs && designs.length > 0 && !selectedDesign && (
              <ListPanel
                title={`Your aircraft designs (${designs.length})`}
                expanded={designsExpanded}
                onToggleExpanded={() => setDesignsExpanded((v) => !v)}
              >
                {designs.map((d) => (
                  <button
                    key={d.aircraftDesignId}
                    type="button"
                    className="hgr-a-list-row"
                    onClick={() => setSelectedDesign(d)}
                  >
                    <span className="hgr-a-list-row-code">{d.designCode}</span>
                    <span className="hgr-a-list-row-type">
                      {d.geometryParameters?.vehicleClass ?? "—"}
                    </span>
                    <span className={`hgr-a-list-row-status hgr-a-list-row-status-${d.status}`}>
                      {AIRCRAFT_DESIGN_STATUS_LABEL[d.status] ?? d.status}
                    </span>
                    <MockSourceBadge show={d.sourceWasMock === true} compact />
                    <span className="hgr-a-list-row-confidence">
                      {d.confidenceScore !== null ? `${Math.round(d.confidenceScore * 100)}%` : "—"}
                    </span>
                    <span className="hgr-a-list-row-date">
                      {new Date(d.createdAt).toLocaleDateString()}
                    </span>
                  </button>
                ))}
              </ListPanel>
            )}

            {selectedDesign ? (
              <PastDesignDetail design={selectedDesign} onBack={() => setSelectedDesign(null)} />
            ) : (
              <div className={isIdle ? "hgr-a-collapsible" : undefined}>
                {isIdle && (
                  <button
                    type="button"
                    className="hgr-a-collapsible-title"
                    onClick={() => setPlanExpanded((v) => !v)}
                    aria-expanded={planExpanded}
                  >
                    <span>Generate a design</span>
                    <span className={`hgr-a-arrow${planExpanded ? " hgr-a-arrow-open" : ""}`}>
                      ▸
                    </span>
                  </button>
                )}
                {(!isIdle || planExpanded) && (
                  <div className={isIdle ? "hgr-a-collapsible-body" : undefined}>
                    {flow.status !== "complete" && (
                      <div className="hgr-a-process-grid">
                        <div>
                          {selectedConcept ? (
                            <div className="hgr-a-selected-spec">
                              <span className="hgr-a-selected-spec-label">Generating from</span>
                              <p>
                                <b>{selectedConcept.conceptCode}</b> —{" "}
                                {selectedConcept.rankedConcepts?.[0]?.conceptName ?? "—"}
                              </p>
                              {flow.status !== "running" && (
                                <button
                                  type="button"
                                  className="hgr-a-btn hgr-a-btn-amber"
                                  onClick={generateDesign}
                                >
                                  Generate Design →
                                </button>
                              )}
                            </div>
                          ) : (
                            <p className="hgr-a-status-idle">
                              Select a finalized concept above to begin generating a design.
                            </p>
                          )}
                          {flow.status === "error" && (
                            <StageErrorCard
                              title="Couldn't complete Geometry Generation."
                              message={flow.errorMessage}
                              onRetry={generateDesign}
                            />
                          )}
                        </div>

                        {/* No 4-item stage tracker here, deliberately — see the
                            file header comment. Just the one real stage's name
                            and a single spinner, matching how Bay 01/02's own
                            non-Stage-1 stages already look. */}
                        <div className="hgr-a-status-panel">
                          <div className="hgr-a-status-panel-title">Geometry Generation</div>
                          {flow.status === "running" ? (
                            <div className="hgr-a-status-step hgr-a-status-step-active">
                              <span className="hgr-a-status-icon">
                                <span className="hgr-a-status-spinner" />
                              </span>
                              <span className="hgr-a-status-text">Processing…</span>
                            </div>
                          ) : flow.status === "error" ? (
                            <p className="hgr-a-status-idle">
                              Stopped — see the error below, then retry.
                            </p>
                          ) : (
                            <p className="hgr-a-status-idle">
                              Select a finalized concept, then generate to begin.
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {flow.status === "complete" && flow.result && (
                      <GeometryResultView result={flow.result} onStartNew={resetFlow} />
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function ListPanel({
  title,
  expanded,
  onToggleExpanded,
  children,
}: {
  title: string;
  expanded: boolean;
  onToggleExpanded: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="hgr-a-collapsible" style={{ marginBottom: 20 }}>
      <button
        type="button"
        className="hgr-a-collapsible-title"
        onClick={onToggleExpanded}
        aria-expanded={expanded}
      >
        <span>{title}</span>
        <span className={`hgr-a-arrow${expanded ? " hgr-a-arrow-open" : ""}`}>▸</span>
      </button>
      {expanded && <div className="hgr-a-list">{children}</div>}
    </div>
  );
}

// This bay launches with the list-fetch-error gap already closed —
// Mission Agent's and Concept Agent's own list panels were retrofitted
// with the same ListFetchError pattern in a separate, prior commit, so
// this isn't a Bay-03-only fix.
function ListFetchError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="hgr-a-list-fetch-error">
      <p>Couldn't load this list — check your connection and try again.</p>
      <button type="button" className="hgr-a-btn hgr-a-btn-ghost" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}

function StageErrorCard({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string | null;
  onRetry: () => void;
}) {
  return (
    <div className="hgr-a-error">
      <b>{title}</b>
      <p>{message}</p>
      <button type="button" className="hgr-a-btn hgr-a-btn-ghost" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}

// Intentional divergence from Concept Agent's MockBadge (the-hangar.concept.tsx)
// — that one only renders on live findings cards mid-run and is never
// persisted (AircraftDesignAgent.md Section 3.e: Hangar_concept_specs has
// no mock column at all). Hangar_aircraft_design_specs DOES persist
// source_was_mock, so this badge is fed from that real column and shown
// everywhere a design is ever displayed — live result, list row, and the
// read-only past-design view — not just during the run that produced it.
// This is a deliberate improvement, not a bug that Bay 02 doesn't do the same.
function MockSourceBadge({ show, compact }: { show: boolean; compact?: boolean }) {
  if (!show) return null;
  return (
    <span className={`hgr-a-mock-badge${compact ? " hgr-a-mock-badge-compact" : ""}`}>
      ⚠ Source concept was mock-generated
    </span>
  );
}

function GeometryParametersGrid({ geometry }: { geometry: GeometryParameters }) {
  return (
    <div className="hgr-a-dash-fields">
      <DashField label="Vehicle class" value={geometry.vehicleClass} />
      <DashField label="Wingspan" value={`${geometry.wingspan_m} m`} />
      <DashField label="Fuselage length" value={`${geometry.fuselageLength_m} m`} />
      <DashField label="Wing area" value={`${geometry.wingArea_m2} m²`} />
      <DashField label="Aspect ratio" value={`${geometry.aspectRatio}`} />
    </div>
  );
}

function DashField({ label, value }: { label: string; value: string }) {
  return (
    <div className="hgr-a-dash-field">
      <div className="hgr-a-dash-field-label">{label}</div>
      <div className="hgr-a-dash-field-value">{value}</div>
    </div>
  );
}

function ComponentSelectionsList({ components }: { components: ComponentSelection[] }) {
  if (components.length === 0) {
    return <p className="hgr-a-dash-empty">No component selections were generated.</p>;
  }
  return (
    <div className="hgr-a-component-list">
      {components.map((c, i) => (
        <div key={i} className="hgr-a-component-card">
          <div className="hgr-a-component-category">{c.category}</div>
          <div className="hgr-a-component-selection">{c.selection}</div>
          <p className="hgr-a-component-rationale">{c.rationale}</p>
        </div>
      ))}
    </div>
  );
}

// Live result view, shown immediately after Stage 1 completes. No Save-as-
// final / Edit-and-regenerate here — finalizeAircraftDesign doesn't exist
// yet (only Stage 1 is built), so this deliberately doesn't invent a
// button that would call a nonexistent endpoint.
function GeometryResultView({
  result,
  onStartNew,
}: {
  result: Stage1Result;
  onStartNew: () => void;
}) {
  return (
    <div className="hgr-a-dash">
      <div className="hgr-a-dash-header">
        <div>
          <div className="hgr-a-dash-badge">Spec Ready</div>
          <h3>{result.designCode}</h3>
          <MockSourceBadge show={result.sourceWasMock} />
        </div>
        <div className="hgr-a-dash-confidence">
          <div className="hgr-a-dash-confidence-num">
            {Math.round(result.confidenceScore * 100)}%
          </div>
          <div className="hgr-a-dash-confidence-label">Confidence</div>
        </div>
      </div>

      <div className="hgr-a-dash-section">
        <h4>Geometry Parameters</h4>
        <GeometryParametersGrid geometry={result.geometryParameters} />
      </div>

      <div className="hgr-a-dash-section">
        <h4>Component Selections ({result.componentSelections.length})</h4>
        <ComponentSelectionsList components={result.componentSelections} />
      </div>

      <div className="hgr-a-dash-section">
        <h4>Design Rationale</h4>
        <p className="hgr-a-dash-rationale">{result.designRationale}</p>
      </div>

      <div className="hgr-a-dash-actions">
        <button
          type="button"
          className="hgr-a-btn hgr-a-btn-ghost"
          disabled
          title="Bay 04 not yet built"
        >
          Continue to CAD Agent →
        </button>
        <button type="button" className="hgr-a-btn hgr-a-btn-amber" onClick={onStartNew}>
          Start a new design
        </button>
      </div>
    </div>
  );
}

// Read-only view of a past design, opened from "Your aircraft designs" —
// reuses GeometryParametersGrid/ComponentSelectionsList so a historical
// design looks the same as one just generated. No actions besides going
// back, same reasoning as Concept Agent's PastConceptDetail.
function PastDesignDetail({
  design,
  onBack,
}: {
  design: AircraftDesignListEntry;
  onBack: () => void;
}) {
  const hasSpec = design.geometryParameters !== null;
  return (
    <div className="hgr-a-dash">
      <div className="hgr-a-dash-header">
        <div>
          <div className="hgr-a-dash-badge">
            {AIRCRAFT_DESIGN_STATUS_LABEL[design.status] ?? design.status}
          </div>
          <h3>{design.designCode}</h3>
          <MockSourceBadge show={design.sourceWasMock === true} />
        </div>
        {design.confidenceScore !== null && (
          <div className="hgr-a-dash-confidence">
            <div className="hgr-a-dash-confidence-num">
              {Math.round(design.confidenceScore * 100)}%
            </div>
            <div className="hgr-a-dash-confidence-label">Confidence</div>
          </div>
        )}
      </div>
      {hasSpec ? (
        <>
          <div className="hgr-a-dash-section">
            <h4>Geometry Parameters</h4>
            <GeometryParametersGrid geometry={design.geometryParameters!} />
          </div>
          <div className="hgr-a-dash-section">
            <h4>Component Selections ({design.componentSelections?.length ?? 0})</h4>
            <ComponentSelectionsList components={design.componentSelections ?? []} />
          </div>
          <div className="hgr-a-dash-section">
            <h4>Design Rationale</h4>
            <p className="hgr-a-dash-rationale">{design.designRationale}</p>
          </div>
        </>
      ) : (
        <div className="hgr-a-dash-section">
          <p className="hgr-a-dash-empty">
            No spec was generated for this design — its status is "
            {AIRCRAFT_DESIGN_STATUS_LABEL[design.status] ?? design.status}".
          </p>
        </div>
      )}
      <div className="hgr-a-dash-actions">
        <button type="button" className="hgr-a-btn hgr-a-btn-ghost" onClick={onBack}>
          ← Back to Your aircraft designs
        </button>
      </div>
    </div>
  );
}

const HGR_AIRCRAFT_DESIGN_CSS = `
.hgr-a{
  --hgr-a-navy-deep:#08131F; --hgr-a-navy-panel:#0F2136;
  --hgr-a-blue-line:#3E7CA6; --hgr-a-blue-bright:#6FB4E0;
  --hgr-a-amber:#E8A33D; --hgr-a-amber-bright:#F6C374;
  --hgr-a-paper:#ECEFF3; --hgr-a-paper-dim:#8FA5BB;
  --hgr-a-green:#5FBF8F; --hgr-a-red:#E0715A;
  --hgr-a-grid:rgba(111,180,224,0.08); --hgr-a-hairline:rgba(111,180,224,0.20);

  background:var(--hgr-a-navy-deep); color:var(--hgr-a-paper); font-family:'IBM Plex Sans', sans-serif;
  background-image:linear-gradient(var(--hgr-a-grid) 1px, transparent 1px), linear-gradient(90deg, var(--hgr-a-grid) 1px, transparent 1px);
  background-size:44px 44px;
  min-height:100vh;
}
.hgr-a *{ box-sizing:border-box; }
.hgr-a h1,.hgr-a h2,.hgr-a h3{ font-family:'Space Grotesk', sans-serif; font-weight:600; letter-spacing:-0.01em; margin:0; }
.hgr-a-mono{ font-family:'IBM Plex Mono', monospace; }
.hgr-a-wrap{ max-width:1180px; margin:0 auto; padding:0 32px; }
.hgr-a a{ color:inherit; }

.hgr-a nav{ border-bottom:1px solid var(--hgr-a-hairline); position:sticky; top:0; background:rgba(8,19,31,0.9); backdrop-filter:blur(8px); z-index:20; }
.hgr-a nav .hgr-a-wrap{ display:flex; align-items:center; justify-content:space-between; height:68px; }
.hgr-a-crumbs{ font-size:14px; color:var(--hgr-a-paper-dim); display:flex; align-items:center; gap:8px; }
.hgr-a-crumbs a{ text-decoration:none; color:var(--hgr-a-paper-dim); }
.hgr-a-crumbs a:hover{ color:var(--hgr-a-blue-bright); }
.hgr-a-sep{ color:var(--hgr-a-blue-line); }
.hgr-a-cur{ color:var(--hgr-a-paper); font-weight:500; }
.hgr-a-exit{ font-family:'IBM Plex Mono',monospace; font-size:12.5px; color:var(--hgr-a-paper-dim); text-decoration:none; border:1px solid var(--hgr-a-hairline); padding:8px 15px; border-radius:2px; }
.hgr-a-exit:hover{ color:var(--hgr-a-paper); border-color:var(--hgr-a-blue-bright); }

.hgr-a main{ padding-bottom:100px; }
.hgr-a-hero{ padding:56px 0 20px; border-bottom:1px solid var(--hgr-a-hairline); position:relative; overflow:hidden; }
.hgr-a-doors{ position:absolute; inset:0; z-index:5; display:flex; pointer-events:none; }
.hgr-a-door{ flex:1; background: repeating-linear-gradient(90deg, #0C1E30 0 78px, #08131F 78px 80px); position:relative; }
.hgr-a-door::after{ content:""; position:absolute; top:0; bottom:0; width:2px; background:var(--hgr-a-blue-line); opacity:.5; }
.hgr-a-door-left{ animation: hgr-a-openLeft 1.4s cubic-bezier(.77,0,.18,1) .3s forwards; }
.hgr-a-door-right{ animation: hgr-a-openRight 1.4s cubic-bezier(.77,0,.18,1) .3s forwards; }
.hgr-a-door-left::after{ right:0; }
.hgr-a-door-right::after{ left:0; }
@keyframes hgr-a-openLeft{ from{ transform:translateX(0);} to{ transform:translateX(-100%);} }
@keyframes hgr-a-openRight{ from{ transform:translateX(0);} to{ transform:translateX(100%);} }
@media (prefers-reduced-motion: reduce){ .hgr-a-doors{ display:none; } }
.hgr-a-status-row{ display:flex; align-items:center; gap:12px; margin-bottom:22px; flex-wrap:wrap; }
.hgr-a-badge{ font-family:'IBM Plex Mono',monospace; font-size:11.5px; letter-spacing:.1em; text-transform:uppercase; padding:6px 13px; border-radius:2px; display:inline-flex; align-items:center; gap:8px; }
.hgr-a-badge-bay{ color:var(--hgr-a-paper-dim); border:1px solid var(--hgr-a-hairline); }
.hgr-a-hero-row{ display:flex; align-items:center; gap:48px; flex-wrap:wrap; }
@media(max-width:760px){ .hgr-a-hero-row{ flex-direction:column; align-items:flex-start; gap:16px; } }
.hgr-a-hero h1{ font-size:clamp(34px,5vw,58px); margin:0; flex-shrink:0; }
.hgr-a-hero .hgr-a-lead{ color:var(--hgr-a-paper-dim); font-size:15.5px; max-width:480px; line-height:1.6; margin:0; flex:1; min-width:280px; }
.hgr-a-hero .hgr-a-lead b{ color:var(--hgr-a-paper); font-weight:600; }

.hgr-a section{ padding:60px 0; }
#generate-design{ padding-top:32px; }
.hgr-a-kicker{ font-family:'IBM Plex Mono',monospace; font-size:12px; letter-spacing:.14em; text-transform:uppercase; color:var(--hgr-a-amber); margin-bottom:12px; }
.hgr-a-sec-title{ font-size:clamp(22px,2.6vw,30px); margin-bottom:10px; }
.hgr-a-sec-sub{ color:var(--hgr-a-paper-dim); font-size:14.5px; max-width:640px; margin-bottom:36px; }
.hgr-a-empty-hint{ color:var(--hgr-a-paper-dim); font-size:13.5px; margin-bottom:24px; }
.hgr-a-empty-hint a{ color:var(--hgr-a-blue-bright); }

.hgr-a-btn{ font-family:'IBM Plex Mono',monospace; font-size:13px; padding:12px 22px; border-radius:2px; display:inline-flex; align-items:center; gap:8px; text-decoration:none; border:1px solid transparent; cursor:pointer; background:none; }
.hgr-a-btn-ghost{ border:1px solid var(--hgr-a-hairline); color:var(--hgr-a-paper-dim); }
.hgr-a-btn-ghost:hover{ color:var(--hgr-a-paper); border-color:var(--hgr-a-blue-bright); }
.hgr-a-btn-amber{ background:var(--hgr-a-amber); color:var(--hgr-a-navy-deep); font-weight:600; }
.hgr-a-btn-amber:hover{ background:var(--hgr-a-amber-bright); }
.hgr-a-btn:disabled{ opacity:.4; cursor:not-allowed; }
.hgr-a-btn:disabled:hover{ color:var(--hgr-a-paper-dim); border-color:var(--hgr-a-hairline); }

/* ── Collapsible panels ── */
.hgr-a-collapsible{ border:1px solid var(--hgr-a-hairline); background:var(--hgr-a-navy-panel); border-radius:2px; margin-bottom:32px; }
.hgr-a-collapsible-title{ display:flex; align-items:center; justify-content:space-between; width:100%; font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.08em; text-transform:uppercase; color:var(--hgr-a-paper-dim); padding:14px 18px; border:none; background:none; cursor:pointer; }
.hgr-a-collapsible-title:hover{ color:var(--hgr-a-paper); }
.hgr-a-arrow{ display:inline-block; font-size:11px; transition:transform .15s; }
.hgr-a-arrow-open{ transform:rotate(90deg); }
.hgr-a-list{ max-height:260px; overflow-y:auto; border-top:1px solid var(--hgr-a-hairline); }
.hgr-a-list-row{ display:grid; grid-template-columns:1.2fr 1.6fr 0.7fr auto 0.7fr 1fr; align-items:center; gap:10px; width:100%; padding:12px 18px; border:none; border-bottom:1px dashed var(--hgr-a-hairline); background:none; cursor:pointer; text-align:left; font-family:'IBM Plex Sans',sans-serif; transition:background .15s; }
.hgr-a-list-row:last-child{ border-bottom:none; }
.hgr-a-list-row:hover{ background:rgba(111,180,224,.07); }
@media(max-width:820px){ .hgr-a-list-row{ grid-template-columns:1fr 1fr; row-gap:4px; } }
.hgr-a-list-row-code{ font-family:'IBM Plex Mono',monospace; font-size:11.5px; color:var(--hgr-a-blue-bright); }
.hgr-a-list-row-type{ font-size:13px; color:var(--hgr-a-paper); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.hgr-a-list-row-status{ font-family:'IBM Plex Mono',monospace; font-size:10px; letter-spacing:.05em; text-transform:uppercase; color:var(--hgr-a-paper-dim); border:1px solid var(--hgr-a-hairline); padding:3px 8px; border-radius:2px; justify-self:start; white-space:nowrap; }
.hgr-a-list-row-status-spec_ready{ color:var(--hgr-a-blue-bright); border-color:rgba(111,180,224,.4); }
.hgr-a-list-row-status-finalized{ color:var(--hgr-a-amber-bright); border-color:rgba(232,163,61,.4); }
.hgr-a-list-row-status-error{ color:var(--hgr-a-amber); border-color:rgba(232,163,61,.4); }
.hgr-a-list-row-confidence{ font-family:'IBM Plex Mono',monospace; font-size:12.5px; color:var(--hgr-a-paper-dim); }
.hgr-a-list-row-date{ font-family:'IBM Plex Mono',monospace; font-size:11.5px; color:var(--hgr-a-paper-dim); text-align:right; }

/* ── List-fetch error ── */
.hgr-a-list-fetch-error{ display:flex; align-items:center; justify-content:space-between; gap:16px; padding:14px 18px; margin-bottom:20px; border:1px solid rgba(232,163,61,.4); background:rgba(232,163,61,.08); border-radius:2px; }
.hgr-a-list-fetch-error p{ margin:0; color:var(--hgr-a-paper-dim); font-size:13.5px; }

/* ── Process grid + selected-concept / status panel ── */
.hgr-a-process-grid{ display:grid; grid-template-columns:1fr 320px; gap:32px; align-items:start; }
@media(max-width:820px){ .hgr-a-process-grid{ grid-template-columns:1fr; } }
.hgr-a-selected-spec{ max-width:640px; padding:14px 16px; border:1px solid rgba(111,180,224,.3); border-left:3px solid var(--hgr-a-blue-bright); background:rgba(111,180,224,.09); border-radius:2px; margin-bottom:20px; }
.hgr-a-selected-spec-label{ display:block; font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.08em; text-transform:uppercase; color:var(--hgr-a-blue-bright); margin-bottom:8px; }
.hgr-a-selected-spec p{ margin:0 0 14px; font-size:14px; color:var(--hgr-a-paper); line-height:1.6; }

.hgr-a-status-panel{ border:1px solid var(--hgr-a-hairline); background:var(--hgr-a-navy-panel); border-radius:2px; padding:20px; }
.hgr-a-status-panel-title{ font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.08em; text-transform:uppercase; color:var(--hgr-a-paper-dim); margin-bottom:16px; }
.hgr-a-status-idle{ color:var(--hgr-a-paper-dim); font-size:13px; line-height:1.6; margin:0; }
.hgr-a-status-step{ display:flex; align-items:flex-start; gap:10px; padding:9px 0; }
.hgr-a-status-icon{ width:18px; height:18px; flex-shrink:0; display:flex; align-items:center; justify-content:center; }
.hgr-a-status-spinner{ width:13px; height:13px; border-radius:50%; border:2px solid var(--hgr-a-hairline); border-top-color:var(--hgr-a-amber); animation:hgr-a-spin 0.8s linear infinite; }
.hgr-a-status-text{ font-size:12.5px; line-height:1.5; color:var(--hgr-a-paper-dim); }
.hgr-a-status-step-active .hgr-a-status-text{ color:var(--hgr-a-paper); }

/* ── Mock source badge (durable, deliberate divergence from Bay 02) ── */
.hgr-a-mock-badge{ display:inline-flex; font-family:'IBM Plex Mono',monospace; font-size:10.5px; letter-spacing:.03em; color:var(--hgr-a-amber-bright); border:1px solid rgba(232,163,61,.4); background:rgba(232,163,61,.08); padding:4px 9px; border-radius:2px; margin-top:8px; }
.hgr-a-mock-badge-compact{ margin-top:0; font-size:9.5px; padding:2px 7px; justify-self:start; }

/* ── Error ── */
@keyframes hgr-a-spin{ to{ transform:rotate(360deg); } }
.hgr-a-error{ border:1px solid rgba(232,163,61,.4); background:rgba(232,163,61,.08); border-radius:2px; padding:20px 22px; max-width:640px; margin-top:20px; }
.hgr-a-error b{ color:var(--hgr-a-amber-bright); display:block; margin-bottom:6px; font-size:14px; }
.hgr-a-error p{ color:var(--hgr-a-paper-dim); font-size:13.5px; margin:0 0 16px; line-height:1.6; }

/* ── Dashboard / result views ── */
.hgr-a-dash{ border:1px solid var(--hgr-a-hairline); background:var(--hgr-a-navy-panel); }
.hgr-a-dash-header{ display:flex; align-items:flex-start; justify-content:space-between; gap:24px; padding:26px 28px; border-bottom:1px solid var(--hgr-a-hairline); flex-wrap:wrap; }
.hgr-a-dash-badge{ display:inline-block; font-family:'IBM Plex Mono',monospace; font-size:10.5px; letter-spacing:.08em; text-transform:uppercase; color:var(--hgr-a-blue-bright); border:1px solid rgba(111,180,224,.4); padding:4px 10px; border-radius:2px; margin-bottom:10px; }
.hgr-a-dash-header h3{ font-size:20px; margin-bottom:6px; }
.hgr-a-dash-confidence{ text-align:center; flex-shrink:0; }
.hgr-a-dash-confidence-num{ font-family:'Space Grotesk',sans-serif; font-size:32px; font-weight:700; color:var(--hgr-a-amber-bright); line-height:1; }
.hgr-a-dash-confidence-label{ font-family:'IBM Plex Mono',monospace; font-size:10px; letter-spacing:.08em; text-transform:uppercase; color:var(--hgr-a-paper-dim); }
.hgr-a-dash-section{ padding:24px 28px; border-bottom:1px solid var(--hgr-a-hairline); }
.hgr-a-dash-section:last-of-type{ border-bottom:none; }
.hgr-a-dash-section h4{ font-family:'Space Grotesk',sans-serif; font-size:14.5px; font-weight:600; margin-bottom:16px; }
.hgr-a-dash-empty{ color:var(--hgr-a-paper-dim); font-size:13px; margin:0; }
.hgr-a-dash-rationale{ color:var(--hgr-a-paper); font-size:14px; line-height:1.7; margin:0; }
.hgr-a-dash-actions{ display:flex; flex-wrap:wrap; gap:12px; padding:24px 28px; }
.hgr-a-dash-fields{ display:grid; grid-template-columns:repeat(3,1fr); gap:20px; }
@media(max-width:700px){ .hgr-a-dash-fields{ grid-template-columns:1fr 1fr; } }
.hgr-a-dash-field-label{ font-family:'IBM Plex Mono',monospace; font-size:10.5px; letter-spacing:.06em; text-transform:uppercase; color:var(--hgr-a-paper-dim); margin-bottom:6px; }
.hgr-a-dash-field-value{ font-size:14px; }

/* ── Component selections ── */
.hgr-a-component-list{ display:flex; flex-direction:column; gap:12px; }
.hgr-a-component-card{ padding:14px 16px; background:var(--hgr-a-navy-deep); border:1px solid var(--hgr-a-hairline); border-radius:2px; }
.hgr-a-component-category{ font-family:'IBM Plex Mono',monospace; font-size:10.5px; letter-spacing:.06em; text-transform:uppercase; color:var(--hgr-a-amber); margin-bottom:6px; }
.hgr-a-component-selection{ font-size:14px; font-weight:600; margin-bottom:6px; }
.hgr-a-component-rationale{ color:var(--hgr-a-paper-dim); font-size:12.5px; line-height:1.6; margin:0; }
`;
