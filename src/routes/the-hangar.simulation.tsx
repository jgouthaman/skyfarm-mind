import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useHangarSession } from "@/lib/the-hangar/session";
import { supabase } from "@/integrations/supabase/client";
import type { CADDesignListEntry } from "@/lib/the-hangar/cadDesignAgentPipeline";
import type { Stage1Result } from "@/lib/the-hangar/simDesignAgentPipeline";
import type { FlightEnvelope, StabilityAssessment } from "@/lib/the-hangar/simDesignGeneration";

// ─────────────────────────────────────────────────────────────────────────
// The Hangar — Bay 05 (Simulation Orchestrator Agent) detail page, phase 1.
// New, self-contained page (no shared imports with the-hangar.cad-design.tsx
// or any other bay page, matching the welcome page's own "fully isolated"
// convention).
//
// Deliberately NOT a 4-item gated-stage tracker — same reasoning as Bay 04:
// this bay has exactly one real stage today (Flight Dynamics Assessment,
// which also produces the Stability Analysis output in the same call).
// Single spinner-or-idle-text pattern, no tracker header.
//
// source_was_mock is surfaced durably (live result, list row, past-
// simulation view) via MockSourceBadge, matching Bay 03/04's own
// convention — not transient like Bay 02. Hangar_Simulation_specs
// persists source_was_mock directly.
//
// SimulationListEntry's shape here is a local, page-owned type — not
// imported from a pipeline file the way CADDesignListEntry is. This bay's
// scope explicitly excluded touching simDesignAgentPipeline.ts, so the
// list-entry shape (and the route that produces it, api.hangar.simulations.ts)
// couldn't add the usual listSimulationsForUser export there. See that
// route file's own comment for the same note.
//
// risk_flags are rendered as visible, non-blocking advisory warnings —
// SimulationOrchestratorAgent.md leaves "gate-then-score eligibility for
// risk_flags" as an open question; nothing here disables the Save/Continue
// affordances based on their presence.
// ─────────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/the-hangar/simulation")({
  component: TheHangarSimulation,
});

interface SimulationListEntry {
  simulationId: string;
  simulationCode: string;
  sourceCadDesignId: string;
  status: string;
  createdAt: string;
  flightEnvelope: FlightEnvelope | null;
  stability: StabilityAssessment | null;
  performanceScore: number | null;
  riskFlags: string[] | null;
  confidenceScore: number | null;
  reasoningSummary: string | null;
  sourceWasMock: boolean | null;
}

interface FlowState {
  status: "idle" | "running" | "complete" | "error";
  result: Stage1Result | null;
  errorMessage: string | null;
}

const INITIAL_FLOW_STATE: FlowState = { status: "idle", result: null, errorMessage: null };

const SIMULATION_STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  processing: "Processing",
  spec_ready: "Spec Ready",
  finalized: "Finalized",
  error: "Error",
};

// Same fetch/auth/error-normalizing helper as every other bay page's
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

function TheHangarSimulation() {
  const ready = useHangarSession();

  const [flow, setFlow] = useState<FlowState>(INITIAL_FLOW_STATE);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [specReadyDesigns, setSpecReadyDesigns] = useState<CADDesignListEntry[] | null>(null);
  const [specReadyDesignsStatus, setSpecReadyDesignsStatus] = useState<
    "idle" | "loading" | "error"
  >("idle");
  const [designsExpanded, setDesignsExpanded] = useState(false);
  const [simulations, setSimulations] = useState<SimulationListEntry[] | null>(null);
  const [simulationsStatus, setSimulationsStatus] = useState<"idle" | "loading" | "error">("idle");
  const [simulationsExpanded, setSimulationsExpanded] = useState(false);
  const [selectedCADDesign, setSelectedCADDesign] = useState<CADDesignListEntry | null>(null);
  const [selectedSimulation, setSelectedSimulation] = useState<SimulationListEntry | null>(null);
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

  // "Your spec-ready CAD designs" — reuses /api/hangar/cad-designs (CAD
  // Agent's own list route, no status filter) and filters to spec_ready
  // client-side, same pattern Bay 04 used filtering aircraft designs to
  // spec_ready.
  async function fetchSpecReadyDesigns() {
    setSpecReadyDesignsStatus("loading");
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setSpecReadyDesignsStatus("error");
      return;
    }
    try {
      const res = await fetch("/api/hangar/cad-designs", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const all: CADDesignListEntry[] = await res.json();
      setSpecReadyDesigns(all.filter((d) => d.status === "spec_ready"));
      setSpecReadyDesignsStatus("idle");
    } catch {
      setSpecReadyDesignsStatus("error");
    }
  }

  useEffect(() => {
    if (currentUserEmail) fetchSpecReadyDesigns();
  }, [currentUserEmail]);

  // "Your simulations" — refetched whenever a simulation reaches spec_ready,
  // same refresh-trigger pattern as every other bay's own list.
  async function fetchSimulations() {
    setSimulationsStatus("loading");
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setSimulationsStatus("error");
      return;
    }
    try {
      const res = await fetch("/api/hangar/simulations", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSimulations(await res.json());
      setSimulationsStatus("idle");
    } catch {
      setSimulationsStatus("error");
    }
  }

  useEffect(() => {
    if (currentUserEmail) fetchSimulations();
  }, [currentUserEmail, flow.status]);

  function resetFlow() {
    setFlow(INITIAL_FLOW_STATE);
    setSelectedCADDesign(null);
    setSelectedSimulation(null);
  }

  function selectCADDesign(d: CADDesignListEntry) {
    resetFlow();
    setSelectedCADDesign(d);
    setPlanExpanded(true);
  }

  async function generateSimulation() {
    if (!selectedCADDesign) return;
    setFlow({ status: "running", result: null, errorMessage: null });
    const outcome = await callStageApi<Stage1Result>(
      "/api/hangar/process-simulation/flight-dynamics-assessment",
      { cadDesignId: selectedCADDesign.cadDesignId },
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
    <div className="hgr-s">
      <style>{HGR_SIMULATION_CSS}</style>

      <nav>
        <div className="hgr-s-wrap">
          <div className="hgr-s-crumbs">
            <Link to="/">TorqWings</Link>
            <span className="hgr-s-sep">/</span>
            <Link to="/the-hangar">The Hangar</Link>
            <span className="hgr-s-sep">/</span>
            <span className="hgr-s-cur">Bay 05 — Simulation Orchestrator Agent</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {currentUserEmail && (
              <span
                className="hgr-s-mono"
                style={{ fontSize: 12.5, color: "var(--hgr-s-paper-dim)" }}
              >
                Welcome, {currentUserEmail}
              </span>
            )}
            <Link to="/the-hangar/welcome" className="hgr-s-exit">
              ← Back to Hangar
            </Link>
            <Link to="/the-hangar" className="hgr-s-exit">
              Exit site
            </Link>
          </div>
        </div>
      </nav>

      <main>
        <div className="hgr-s-hero">
          <div className="hgr-s-doors">
            <div className="hgr-s-door hgr-s-door-left" />
            <div className="hgr-s-door hgr-s-door-right" />
          </div>
          <div className="hgr-s-wrap">
            <div className="hgr-s-status-row">
              <span className="hgr-s-badge hgr-s-badge-bay">BAY 05 OF 15</span>
            </div>
            <div className="hgr-s-hero-row">
              <h1>Simulation Orchestrator Agent</h1>
              <p className="hgr-s-lead">
                Takes a <b>spec-ready CAD design</b> from Bay 04 and estimates a flight envelope and
                stability classification — a deterministic performance/confidence score, not the
                model's own self-assessment.
              </p>
            </div>
          </div>
        </div>

        <section id="run-simulation">
          <div className="hgr-s-wrap">
            <div className="hgr-s-kicker">Run a simulation</div>
            <h2 className="hgr-s-sec-title">
              Turn a spec-ready CAD design into a flight assessment.
            </h2>
            <p className="hgr-s-sec-sub">
              Runs one real Claude Sonnet 5 call to estimate flight envelope and stability, then a
              deterministic scoring pass. There's no real physics/simulation engine (JSBSim/X-Plane)
              yet, so this is Claude reasoning about plausible flight performance, not a simulated
              engineering result. Risk flags are advisory only — nothing here is blocked by them.
            </p>

            {specReadyDesignsStatus === "error" && (
              <ListFetchError onRetry={fetchSpecReadyDesigns} />
            )}

            {specReadyDesignsStatus !== "error" &&
              specReadyDesigns &&
              specReadyDesigns.length > 0 &&
              !selectedSimulation && (
                <ListPanel
                  title={`Your spec-ready CAD designs (${specReadyDesigns.length})`}
                  expanded={designsExpanded}
                  onToggleExpanded={() => setDesignsExpanded((v) => !v)}
                >
                  {specReadyDesigns.map((d) => (
                    <button
                      key={d.cadDesignId}
                      type="button"
                      className="hgr-s-list-row"
                      onClick={() => selectCADDesign(d)}
                    >
                      <span className="hgr-s-list-row-code">{d.cadCode}</span>
                      <span className="hgr-s-list-row-type">
                        {d.bom ? `${d.bom.length} BOM entries` : "—"}
                      </span>
                      <span className="hgr-s-list-row-confidence">
                        {d.confidenceScore !== null
                          ? `${Math.round(d.confidenceScore * 100)}%`
                          : "—"}
                      </span>
                      <span className="hgr-s-list-row-date">
                        {new Date(d.createdAt).toLocaleDateString()}
                      </span>
                    </button>
                  ))}
                </ListPanel>
              )}

            {specReadyDesignsStatus !== "error" &&
              specReadyDesigns &&
              specReadyDesigns.length === 0 && (
                <p className="hgr-s-empty-hint">
                  No spec-ready CAD designs yet — generate one in{" "}
                  <Link to="/the-hangar/cad-design">CAD Agent</Link> first, then come back here to
                  run a simulation against it.
                </p>
              )}

            {simulationsStatus === "error" && <ListFetchError onRetry={fetchSimulations} />}

            {simulationsStatus !== "error" &&
              simulations &&
              simulations.length > 0 &&
              !selectedSimulation && (
                <ListPanel
                  title={`Your simulations (${simulations.length})`}
                  expanded={simulationsExpanded}
                  onToggleExpanded={() => setSimulationsExpanded((v) => !v)}
                >
                  {simulations.map((s) => (
                    <button
                      key={s.simulationId}
                      type="button"
                      className="hgr-s-list-row"
                      onClick={() => setSelectedSimulation(s)}
                    >
                      <span className="hgr-s-list-row-code">{s.simulationCode}</span>
                      <span className="hgr-s-list-row-type">
                        {s.stability ? `${s.stability.longitudinal} / ${s.stability.lateral}` : "—"}
                      </span>
                      <span className={`hgr-s-list-row-status hgr-s-list-row-status-${s.status}`}>
                        {SIMULATION_STATUS_LABEL[s.status] ?? s.status}
                      </span>
                      <MockSourceBadge show={s.sourceWasMock === true} compact />
                      <span className="hgr-s-list-row-confidence">
                        {s.confidenceScore !== null
                          ? `${Math.round(s.confidenceScore * 100)}%`
                          : "—"}
                      </span>
                      <span className="hgr-s-list-row-date">
                        {new Date(s.createdAt).toLocaleDateString()}
                      </span>
                    </button>
                  ))}
                </ListPanel>
              )}

            {selectedSimulation ? (
              <PastSimulationDetail
                simulation={selectedSimulation}
                onBack={() => setSelectedSimulation(null)}
              />
            ) : (
              <div className={isIdle ? "hgr-s-collapsible" : undefined}>
                {isIdle && (
                  <button
                    type="button"
                    className="hgr-s-collapsible-title"
                    onClick={() => setPlanExpanded((v) => !v)}
                    aria-expanded={planExpanded}
                  >
                    <span>Run a simulation</span>
                    <span className={`hgr-s-arrow${planExpanded ? " hgr-s-arrow-open" : ""}`}>
                      ▸
                    </span>
                  </button>
                )}
                {(!isIdle || planExpanded) && (
                  <div className={isIdle ? "hgr-s-collapsible-body" : undefined}>
                    {flow.status !== "complete" && (
                      <div className="hgr-s-process-grid">
                        <div>
                          {selectedCADDesign ? (
                            <div className="hgr-s-selected-spec">
                              <span className="hgr-s-selected-spec-label">Assessing</span>
                              <p>
                                <b>{selectedCADDesign.cadCode}</b> —{" "}
                                {selectedCADDesign.bom
                                  ? `${selectedCADDesign.bom.length} BOM entries`
                                  : "—"}
                              </p>
                              {flow.status !== "running" && (
                                <button
                                  type="button"
                                  className="hgr-s-btn hgr-s-btn-amber"
                                  onClick={generateSimulation}
                                >
                                  Run Simulation →
                                </button>
                              )}
                            </div>
                          ) : (
                            <p className="hgr-s-status-idle">
                              Select a spec-ready CAD design above to begin running a simulation.
                            </p>
                          )}
                          {flow.status === "error" && (
                            <StageErrorCard
                              title="Couldn't complete Flight Dynamics Assessment."
                              message={flow.errorMessage}
                              onRetry={generateSimulation}
                            />
                          )}
                        </div>

                        {/* No 4-item stage tracker here, deliberately — see the
                            file header comment. Just the one real stage's name
                            and a single spinner, matching every other bay's
                            own non-Stage-1 stages. */}
                        <div className="hgr-s-status-panel">
                          <div className="hgr-s-status-panel-title">Flight Dynamics Assessment</div>
                          {flow.status === "running" ? (
                            <div className="hgr-s-status-step hgr-s-status-step-active">
                              <span className="hgr-s-status-icon">
                                <span className="hgr-s-status-spinner" />
                              </span>
                              <span className="hgr-s-status-text">Processing…</span>
                            </div>
                          ) : flow.status === "error" ? (
                            <p className="hgr-s-status-idle">
                              Stopped — see the error below, then retry.
                            </p>
                          ) : (
                            <p className="hgr-s-status-idle">
                              Select a spec-ready CAD design, then run to begin.
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {flow.status === "complete" && flow.result && (
                      <SimulationResultView result={flow.result} onStartNew={resetFlow} />
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
    <div className="hgr-s-collapsible" style={{ marginBottom: 20 }}>
      <button
        type="button"
        className="hgr-s-collapsible-title"
        onClick={onToggleExpanded}
        aria-expanded={expanded}
      >
        <span>{title}</span>
        <span className={`hgr-s-arrow${expanded ? " hgr-s-arrow-open" : ""}`}>▸</span>
      </button>
      {expanded && <div className="hgr-s-list">{children}</div>}
    </div>
  );
}

// This bay launches with the list-fetch-error gap already closed —
// consistent with every prior bay page, not a Bay-05-only fix.
function ListFetchError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="hgr-s-list-fetch-error">
      <p>Couldn't load this list — check your connection and try again.</p>
      <button type="button" className="hgr-s-btn hgr-s-btn-ghost" onClick={onRetry}>
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
    <div className="hgr-s-error">
      <b>{title}</b>
      <p>{message}</p>
      <button type="button" className="hgr-s-btn hgr-s-btn-ghost" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}

// Same durable-badge convention as Bay 03/04's MockSourceBadge — fed from
// Hangar_Simulation_specs.source_was_mock directly, shown everywhere a
// simulation is ever displayed (live result, list row, past-simulation
// view), not just during the run that produced it.
function MockSourceBadge({ show, compact }: { show: boolean; compact?: boolean }) {
  if (!show) return null;
  return (
    <span className={`hgr-s-mock-badge${compact ? " hgr-s-mock-badge-compact" : ""}`}>
      ⚠ Source CAD design was mock-generated
    </span>
  );
}

function FlightEnvelopeFields({ flightEnvelope }: { flightEnvelope: FlightEnvelope }) {
  return (
    <div className="hgr-s-dash-fields">
      <DashField label="Max speed" value={`${flightEnvelope.maxSpeedKmh} km/h`} />
      <DashField label="Stall speed" value={`${flightEnvelope.stallSpeedKmh} km/h`} />
      <DashField label="Service ceiling" value={`${flightEnvelope.serviceCeilingM} m`} />
      <DashField label="Range" value={`${flightEnvelope.rangeKm} km`} />
      <DashField label="Endurance" value={`${flightEnvelope.enduranceMin} min`} />
    </div>
  );
}

function StabilityFields({ stability }: { stability: StabilityAssessment }) {
  return (
    <div>
      <div className="hgr-s-dash-fields" style={{ marginBottom: 14 }}>
        <DashField label="Longitudinal" value={stability.longitudinal} />
        <DashField label="Lateral" value={stability.lateral} />
      </div>
      <p className="hgr-s-dash-rationale">{stability.notes}</p>
    </div>
  );
}

function DashField({ label, value }: { label: string; value: string }) {
  return (
    <div className="hgr-s-dash-field">
      <div className="hgr-s-dash-field-label">{label}</div>
      <div className="hgr-s-dash-field-value">{value}</div>
    </div>
  );
}

// Advisory only, never blocking — SimulationOrchestratorAgent.md leaves
// "gate-then-score eligibility for risk_flags" as an open question; no
// button here is disabled based on this list's contents.
function RiskFlagsList({ riskFlags }: { riskFlags: string[] }) {
  if (riskFlags.length === 0) {
    return <p className="hgr-s-dash-empty">No risk flags.</p>;
  }
  return (
    <div className="hgr-s-risk-flags">
      <ul>
        {riskFlags.map((flag, i) => (
          <li key={i}>{flag}</li>
        ))}
      </ul>
    </div>
  );
}

// Live result view, shown immediately after Stage 1 completes. No Save-as-
// final / Edit-and-regenerate — finalizeSimulation doesn't exist yet (only
// Stage 1 is built), same reasoning as Bay 04's own CADResultView.
function SimulationResultView({
  result,
  onStartNew,
}: {
  result: Stage1Result;
  onStartNew: () => void;
}) {
  return (
    <div className="hgr-s-dash">
      <div className="hgr-s-dash-header">
        <div>
          <div className="hgr-s-dash-badge">Spec Ready</div>
          <h3>{result.simulationCode}</h3>
          <MockSourceBadge show={result.sourceWasMock} />
        </div>
        <div className="hgr-s-dash-confidence">
          <div className="hgr-s-dash-confidence-num">
            {Math.round(result.confidenceScore * 100)}%
          </div>
          <div className="hgr-s-dash-confidence-label">Confidence</div>
        </div>
      </div>

      <div className="hgr-s-dash-section">
        <h4>Flight Envelope</h4>
        <FlightEnvelopeFields flightEnvelope={result.flightEnvelope} />
      </div>

      <div className="hgr-s-dash-section">
        <h4>Stability</h4>
        <StabilityFields stability={result.stability} />
      </div>

      <div className="hgr-s-dash-section">
        <h4>Performance Score</h4>
        <DashField label="Performance" value={`${result.performanceScore} / 100`} />
      </div>

      <div className="hgr-s-dash-section">
        <h4>Risk Flags ({result.riskFlags.length})</h4>
        <RiskFlagsList riskFlags={result.riskFlags} />
      </div>

      <div className="hgr-s-dash-section">
        <h4>Reasoning Summary</h4>
        <p className="hgr-s-dash-rationale">{result.reasoningSummary}</p>
      </div>

      <div className="hgr-s-dash-actions">
        <button
          type="button"
          className="hgr-s-btn hgr-s-btn-ghost"
          disabled
          title="Bay 06 not yet built"
        >
          Continue to Manufacturing Agent →
        </button>
        <button type="button" className="hgr-s-btn hgr-s-btn-amber" onClick={onStartNew}>
          Start a new simulation
        </button>
      </div>
    </div>
  );
}

// Read-only view of a past simulation, opened from "Your simulations" —
// reuses the same field components so a historical simulation looks the
// same as one just generated. No actions besides going back, same
// reasoning as Bay 04's own PastCADDesignDetail.
function PastSimulationDetail({
  simulation,
  onBack,
}: {
  simulation: SimulationListEntry;
  onBack: () => void;
}) {
  const hasSpec = simulation.flightEnvelope !== null;
  return (
    <div className="hgr-s-dash">
      <div className="hgr-s-dash-header">
        <div>
          <div className="hgr-s-dash-badge">
            {SIMULATION_STATUS_LABEL[simulation.status] ?? simulation.status}
          </div>
          <h3>{simulation.simulationCode}</h3>
          <MockSourceBadge show={simulation.sourceWasMock === true} />
        </div>
        {simulation.confidenceScore !== null && (
          <div className="hgr-s-dash-confidence">
            <div className="hgr-s-dash-confidence-num">
              {Math.round(simulation.confidenceScore * 100)}%
            </div>
            <div className="hgr-s-dash-confidence-label">Confidence</div>
          </div>
        )}
      </div>
      {hasSpec ? (
        <>
          <div className="hgr-s-dash-section">
            <h4>Flight Envelope</h4>
            <FlightEnvelopeFields flightEnvelope={simulation.flightEnvelope!} />
          </div>
          <div className="hgr-s-dash-section">
            <h4>Stability</h4>
            <StabilityFields stability={simulation.stability!} />
          </div>
          <div className="hgr-s-dash-section">
            <h4>Performance Score</h4>
            <DashField label="Performance" value={`${simulation.performanceScore} / 100`} />
          </div>
          <div className="hgr-s-dash-section">
            <h4>Risk Flags ({simulation.riskFlags?.length ?? 0})</h4>
            <RiskFlagsList riskFlags={simulation.riskFlags ?? []} />
          </div>
          <div className="hgr-s-dash-section">
            <h4>Reasoning Summary</h4>
            <p className="hgr-s-dash-rationale">{simulation.reasoningSummary}</p>
          </div>
        </>
      ) : (
        <div className="hgr-s-dash-section">
          <p className="hgr-s-dash-empty">
            No spec was generated for this simulation — its status is "
            {SIMULATION_STATUS_LABEL[simulation.status] ?? simulation.status}".
          </p>
        </div>
      )}
      <div className="hgr-s-dash-actions">
        <button type="button" className="hgr-s-btn hgr-s-btn-ghost" onClick={onBack}>
          ← Back to Your simulations
        </button>
      </div>
    </div>
  );
}

const HGR_SIMULATION_CSS = `
.hgr-s{
  --hgr-s-navy-deep:#08131F; --hgr-s-navy-panel:#0F2136;
  --hgr-s-blue-line:#3E7CA6; --hgr-s-blue-bright:#6FB4E0;
  --hgr-s-amber:#E8A33D; --hgr-s-amber-bright:#F6C374;
  --hgr-s-paper:#ECEFF3; --hgr-s-paper-dim:#8FA5BB;
  --hgr-s-green:#5FBF8F; --hgr-s-red:#E0715A;
  --hgr-s-grid:rgba(111,180,224,0.08); --hgr-s-hairline:rgba(111,180,224,0.20);

  background:var(--hgr-s-navy-deep); color:var(--hgr-s-paper); font-family:'IBM Plex Sans', sans-serif;
  background-image:linear-gradient(var(--hgr-s-grid) 1px, transparent 1px), linear-gradient(90deg, var(--hgr-s-grid) 1px, transparent 1px);
  background-size:44px 44px;
  min-height:100vh;
}
.hgr-s *{ box-sizing:border-box; }
.hgr-s h1,.hgr-s h2,.hgr-s h3{ font-family:'Space Grotesk', sans-serif; font-weight:600; letter-spacing:-0.01em; margin:0; }
.hgr-s-mono{ font-family:'IBM Plex Mono', monospace; }
.hgr-s-wrap{ max-width:1180px; margin:0 auto; padding:0 32px; }
.hgr-s a{ color:inherit; }

.hgr-s nav{ border-bottom:1px solid var(--hgr-s-hairline); position:sticky; top:0; background:rgba(8,19,31,0.9); backdrop-filter:blur(8px); z-index:20; }
.hgr-s nav .hgr-s-wrap{ display:flex; align-items:center; justify-content:space-between; height:68px; }
.hgr-s-crumbs{ font-size:14px; color:var(--hgr-s-paper-dim); display:flex; align-items:center; gap:8px; }
.hgr-s-crumbs a{ text-decoration:none; color:var(--hgr-s-paper-dim); }
.hgr-s-crumbs a:hover{ color:var(--hgr-s-blue-bright); }
.hgr-s-sep{ color:var(--hgr-s-blue-line); }
.hgr-s-cur{ color:var(--hgr-s-paper); font-weight:500; }
.hgr-s-exit{ font-family:'IBM Plex Mono',monospace; font-size:12.5px; color:var(--hgr-s-paper-dim); text-decoration:none; border:1px solid var(--hgr-s-hairline); padding:8px 15px; border-radius:2px; }
.hgr-s-exit:hover{ color:var(--hgr-s-paper); border-color:var(--hgr-s-blue-bright); }

.hgr-s main{ padding-bottom:100px; }
.hgr-s-hero{ padding:56px 0 20px; border-bottom:1px solid var(--hgr-s-hairline); position:relative; overflow:hidden; }
.hgr-s-doors{ position:absolute; inset:0; z-index:5; display:flex; pointer-events:none; }
.hgr-s-door{ flex:1; background: repeating-linear-gradient(90deg, #0C1E30 0 78px, #08131F 78px 80px); position:relative; }
.hgr-s-door::after{ content:""; position:absolute; top:0; bottom:0; width:2px; background:var(--hgr-s-blue-line); opacity:.5; }
.hgr-s-door-left{ animation: hgr-s-openLeft 1.4s cubic-bezier(.77,0,.18,1) .3s forwards; }
.hgr-s-door-right{ animation: hgr-s-openRight 1.4s cubic-bezier(.77,0,.18,1) .3s forwards; }
.hgr-s-door-left::after{ right:0; }
.hgr-s-door-right::after{ left:0; }
@keyframes hgr-s-openLeft{ from{ transform:translateX(0);} to{ transform:translateX(-100%);} }
@keyframes hgr-s-openRight{ from{ transform:translateX(0);} to{ transform:translateX(100%);} }
@media (prefers-reduced-motion: reduce){ .hgr-s-doors{ display:none; } }
.hgr-s-status-row{ display:flex; align-items:center; gap:12px; margin-bottom:22px; flex-wrap:wrap; }
.hgr-s-badge{ font-family:'IBM Plex Mono',monospace; font-size:11.5px; letter-spacing:.1em; text-transform:uppercase; padding:6px 13px; border-radius:2px; display:inline-flex; align-items:center; gap:8px; }
.hgr-s-badge-bay{ color:var(--hgr-s-paper-dim); border:1px solid var(--hgr-s-hairline); }
.hgr-s-hero-row{ display:flex; align-items:center; gap:48px; flex-wrap:wrap; }
@media(max-width:760px){ .hgr-s-hero-row{ flex-direction:column; align-items:flex-start; gap:16px; } }
.hgr-s-hero h1{ font-size:clamp(34px,5vw,58px); margin:0; flex-shrink:0; }
.hgr-s-hero .hgr-s-lead{ color:var(--hgr-s-paper-dim); font-size:15.5px; max-width:480px; line-height:1.6; margin:0; flex:1; min-width:280px; }
.hgr-s-hero .hgr-s-lead b{ color:var(--hgr-s-paper); font-weight:600; }

.hgr-s section{ padding:60px 0; }
#run-simulation{ padding-top:32px; }
.hgr-s-kicker{ font-family:'IBM Plex Mono',monospace; font-size:12px; letter-spacing:.14em; text-transform:uppercase; color:var(--hgr-s-amber); margin-bottom:12px; }
.hgr-s-sec-title{ font-size:clamp(22px,2.6vw,30px); margin-bottom:10px; }
.hgr-s-sec-sub{ color:var(--hgr-s-paper-dim); font-size:14.5px; max-width:640px; margin-bottom:36px; }
.hgr-s-empty-hint{ color:var(--hgr-s-paper-dim); font-size:13.5px; margin-bottom:24px; }
.hgr-s-empty-hint a{ color:var(--hgr-s-blue-bright); }

.hgr-s-btn{ font-family:'IBM Plex Mono',monospace; font-size:13px; padding:12px 22px; border-radius:2px; display:inline-flex; align-items:center; gap:8px; text-decoration:none; border:1px solid transparent; cursor:pointer; background:none; }
.hgr-s-btn-ghost{ border:1px solid var(--hgr-s-hairline); color:var(--hgr-s-paper-dim); }
.hgr-s-btn-ghost:hover{ color:var(--hgr-s-paper); border-color:var(--hgr-s-blue-bright); }
.hgr-s-btn-amber{ background:var(--hgr-s-amber); color:var(--hgr-s-navy-deep); font-weight:600; }
.hgr-s-btn-amber:hover{ background:var(--hgr-s-amber-bright); }
.hgr-s-btn:disabled{ opacity:.4; cursor:not-allowed; }
.hgr-s-btn:disabled:hover{ color:var(--hgr-s-paper-dim); border-color:var(--hgr-s-hairline); }

/* ── Collapsible panels ── */
.hgr-s-collapsible{ border:1px solid var(--hgr-s-hairline); background:var(--hgr-s-navy-panel); border-radius:2px; margin-bottom:32px; }
.hgr-s-collapsible-title{ display:flex; align-items:center; justify-content:space-between; width:100%; font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.08em; text-transform:uppercase; color:var(--hgr-s-paper-dim); padding:14px 18px; border:none; background:none; cursor:pointer; }
.hgr-s-collapsible-title:hover{ color:var(--hgr-s-paper); }
.hgr-s-arrow{ display:inline-block; font-size:11px; transition:transform .15s; }
.hgr-s-arrow-open{ transform:rotate(90deg); }
.hgr-s-list{ max-height:260px; overflow-y:auto; border-top:1px solid var(--hgr-s-hairline); }
.hgr-s-list-row{ display:grid; grid-template-columns:1.2fr 1.6fr 0.7fr auto 0.7fr 1fr; align-items:center; gap:10px; width:100%; padding:12px 18px; border:none; border-bottom:1px dashed var(--hgr-s-hairline); background:none; cursor:pointer; text-align:left; font-family:'IBM Plex Sans',sans-serif; transition:background .15s; }
.hgr-s-list-row:last-child{ border-bottom:none; }
.hgr-s-list-row:hover{ background:rgba(111,180,224,.07); }
@media(max-width:820px){ .hgr-s-list-row{ grid-template-columns:1fr 1fr; row-gap:4px; } }
.hgr-s-list-row-code{ font-family:'IBM Plex Mono',monospace; font-size:11.5px; color:var(--hgr-s-blue-bright); }
.hgr-s-list-row-type{ font-size:13px; color:var(--hgr-s-paper); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.hgr-s-list-row-status{ font-family:'IBM Plex Mono',monospace; font-size:10px; letter-spacing:.05em; text-transform:uppercase; color:var(--hgr-s-paper-dim); border:1px solid var(--hgr-s-hairline); padding:3px 8px; border-radius:2px; justify-self:start; white-space:nowrap; }
.hgr-s-list-row-status-spec_ready{ color:var(--hgr-s-blue-bright); border-color:rgba(111,180,224,.4); }
.hgr-s-list-row-status-finalized{ color:var(--hgr-s-amber-bright); border-color:rgba(232,163,61,.4); }
.hgr-s-list-row-status-error{ color:var(--hgr-s-amber); border-color:rgba(232,163,61,.4); }
.hgr-s-list-row-confidence{ font-family:'IBM Plex Mono',monospace; font-size:12.5px; color:var(--hgr-s-paper-dim); }
.hgr-s-list-row-date{ font-family:'IBM Plex Mono',monospace; font-size:11.5px; color:var(--hgr-s-paper-dim); text-align:right; }

/* ── List-fetch error ── */
.hgr-s-list-fetch-error{ display:flex; align-items:center; justify-content:space-between; gap:16px; padding:14px 18px; margin-bottom:20px; border:1px solid rgba(232,163,61,.4); background:rgba(232,163,61,.08); border-radius:2px; }
.hgr-s-list-fetch-error p{ margin:0; color:var(--hgr-s-paper-dim); font-size:13.5px; }

/* ── Process grid + selected-spec / status panel ── */
.hgr-s-process-grid{ display:grid; grid-template-columns:1fr 320px; gap:32px; align-items:start; }
@media(max-width:820px){ .hgr-s-process-grid{ grid-template-columns:1fr; } }
.hgr-s-selected-spec{ max-width:640px; padding:14px 16px; border:1px solid rgba(111,180,224,.3); border-left:3px solid var(--hgr-s-blue-bright); background:rgba(111,180,224,.09); border-radius:2px; margin-bottom:20px; }
.hgr-s-selected-spec-label{ display:block; font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.08em; text-transform:uppercase; color:var(--hgr-s-blue-bright); margin-bottom:8px; }
.hgr-s-selected-spec p{ margin:0 0 14px; font-size:14px; color:var(--hgr-s-paper); line-height:1.6; }

.hgr-s-status-panel{ border:1px solid var(--hgr-s-hairline); background:var(--hgr-s-navy-panel); border-radius:2px; padding:20px; }
.hgr-s-status-panel-title{ font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.08em; text-transform:uppercase; color:var(--hgr-s-paper-dim); margin-bottom:16px; }
.hgr-s-status-idle{ color:var(--hgr-s-paper-dim); font-size:13px; line-height:1.6; margin:0; }
.hgr-s-status-step{ display:flex; align-items:flex-start; gap:10px; padding:9px 0; }
.hgr-s-status-icon{ width:18px; height:18px; flex-shrink:0; display:flex; align-items:center; justify-content:center; }
.hgr-s-status-spinner{ width:13px; height:13px; border-radius:50%; border:2px solid var(--hgr-s-hairline); border-top-color:var(--hgr-s-amber); animation:hgr-s-spin 0.8s linear infinite; }
.hgr-s-status-text{ font-size:12.5px; line-height:1.5; color:var(--hgr-s-paper-dim); }
.hgr-s-status-step-active .hgr-s-status-text{ color:var(--hgr-s-paper); }

/* ── Mock source badge (durable, matches Bay 03/04's convention) ── */
.hgr-s-mock-badge{ display:inline-flex; font-family:'IBM Plex Mono',monospace; font-size:10.5px; letter-spacing:.03em; color:var(--hgr-s-amber-bright); border:1px solid rgba(232,163,61,.4); background:rgba(232,163,61,.08); padding:4px 9px; border-radius:2px; margin-top:8px; }
.hgr-s-mock-badge-compact{ margin-top:0; font-size:9.5px; padding:2px 7px; justify-self:start; }

/* ── Error ── */
@keyframes hgr-s-spin{ to{ transform:rotate(360deg); } }
.hgr-s-error{ border:1px solid rgba(232,163,61,.4); background:rgba(232,163,61,.08); border-radius:2px; padding:20px 22px; max-width:640px; margin-top:20px; }
.hgr-s-error b{ color:var(--hgr-s-amber-bright); display:block; margin-bottom:6px; font-size:14px; }
.hgr-s-error p{ color:var(--hgr-s-paper-dim); font-size:13.5px; margin:0 0 16px; line-height:1.6; }

/* ── Dashboard / result views ── */
.hgr-s-dash{ border:1px solid var(--hgr-s-hairline); background:var(--hgr-s-navy-panel); }
.hgr-s-dash-header{ display:flex; align-items:flex-start; justify-content:space-between; gap:24px; padding:26px 28px; border-bottom:1px solid var(--hgr-s-hairline); flex-wrap:wrap; }
.hgr-s-dash-badge{ display:inline-block; font-family:'IBM Plex Mono',monospace; font-size:10.5px; letter-spacing:.08em; text-transform:uppercase; color:var(--hgr-s-blue-bright); border:1px solid rgba(111,180,224,.4); padding:4px 10px; border-radius:2px; margin-bottom:10px; }
.hgr-s-dash-header h3{ font-size:20px; margin-bottom:6px; }
.hgr-s-dash-confidence{ text-align:center; flex-shrink:0; }
.hgr-s-dash-confidence-num{ font-family:'Space Grotesk',sans-serif; font-size:32px; font-weight:700; color:var(--hgr-s-amber-bright); line-height:1; }
.hgr-s-dash-confidence-label{ font-family:'IBM Plex Mono',monospace; font-size:10px; letter-spacing:.08em; text-transform:uppercase; color:var(--hgr-s-paper-dim); }
.hgr-s-dash-section{ padding:24px 28px; border-bottom:1px solid var(--hgr-s-hairline); }
.hgr-s-dash-section:last-of-type{ border-bottom:none; }
.hgr-s-dash-section h4{ font-family:'Space Grotesk',sans-serif; font-size:14.5px; font-weight:600; margin-bottom:16px; }
.hgr-s-dash-empty{ color:var(--hgr-s-paper-dim); font-size:13px; margin:0; }
.hgr-s-dash-rationale{ color:var(--hgr-s-paper); font-size:14px; line-height:1.7; margin:0; }
.hgr-s-dash-fields{ display:grid; grid-template-columns:repeat(3,1fr); gap:20px; }
@media(max-width:700px){ .hgr-s-dash-fields{ grid-template-columns:1fr 1fr; } }
.hgr-s-dash-field-label{ font-family:'IBM Plex Mono',monospace; font-size:10.5px; letter-spacing:.06em; text-transform:uppercase; color:var(--hgr-s-paper-dim); margin-bottom:6px; }
.hgr-s-dash-field-value{ font-size:14px; }

/* ── Risk flags (advisory, non-blocking) ── */
.hgr-s-risk-flags{ border:1px solid rgba(232,163,61,.4); background:rgba(232,163,61,.08); border-radius:2px; padding:14px 16px; }
.hgr-s-risk-flags ul{ margin:0; padding-left:18px; color:var(--hgr-s-amber-bright); font-size:13px; line-height:1.7; }
`;
