import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useHangarSession } from "@/lib/the-hangar/session";
import { supabase } from "@/integrations/supabase/client";
import type { CADDesignListEntry } from "@/lib/the-hangar/cadDesignAgentPipeline";
import type { Stage1Result, StructuralListEntry } from "@/lib/the-hangar/structuralAgentPipeline";
import type { MeshMaterial, LoadCase, StressResults } from "@/lib/the-hangar/structuralGeneration";

// ─────────────────────────────────────────────────────────────────────────
// The Hangar — Bay 07 (Structural Agent) detail page, phase 1. New,
// self-contained page (no shared imports with the-hangar.simulation.tsx or
// any other bay page, matching the welcome page's own "fully isolated"
// convention).
//
// Deliberately NOT a multi-item gated-stage tracker — same reasoning as
// Bay 04/05/06: this bay has exactly one real stage today (Structural
// Assessment, folding StructuralAgent.md Sections 7.1-7.3 into a single
// call — see structuralAgentPipeline.ts's own header comment). Single
// spinner-or-idle-text pattern, no tracker header.
//
// StructuralListEntry is imported from structuralAgentPipeline.ts directly
// (not redefined locally) — unlike the-hangar.simulation.tsx's own
// SimulationListEntry, which stayed local only because that bay's task
// explicitly excluded touching simDesignAgentPipeline.ts at the time. That
// constraint doesn't apply to a brand-new bay, so this follows CAD/CFD's
// own (current, non-workaround) pattern of importing the list-entry type.
//
// source_was_mock is surfaced durably (live result, list row, past-
// analysis view) via MockSourceBadge, matching Bay 03/04/05's own
// convention — not transient like Bay 02. Hangar_Structural_specs persists
// source_was_mock directly.
//
// risk_flags are rendered as visible, non-blocking advisory warnings, same
// as Bay 05's own RiskFlagsList — StructuralAgent.md leaves "gate-then-
// score eligibility for risk_flags/safety margins" as an open question;
// nothing here disables the Save/Continue affordances based on their
// presence.
// ─────────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/the-hangar/structural")({
  component: TheHangarStructural,
});

interface FlowState {
  status: "idle" | "running" | "complete" | "error";
  result: Stage1Result | null;
  errorMessage: string | null;
}

const INITIAL_FLOW_STATE: FlowState = { status: "idle", result: null, errorMessage: null };

const STRUCTURAL_STATUS_LABEL: Record<string, string> = {
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

function TheHangarStructural() {
  const ready = useHangarSession();

  const [flow, setFlow] = useState<FlowState>(INITIAL_FLOW_STATE);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [specReadyDesigns, setSpecReadyDesigns] = useState<CADDesignListEntry[] | null>(null);
  const [specReadyDesignsStatus, setSpecReadyDesignsStatus] = useState<
    "idle" | "loading" | "error"
  >("idle");
  const [designsExpanded, setDesignsExpanded] = useState(false);
  const [structurals, setStructurals] = useState<StructuralListEntry[] | null>(null);
  const [structuralsStatus, setStructuralsStatus] = useState<"idle" | "loading" | "error">("idle");
  const [structuralsExpanded, setStructuralsExpanded] = useState(false);
  const [selectedCADDesign, setSelectedCADDesign] = useState<CADDesignListEntry | null>(null);
  const [selectedStructural, setSelectedStructural] = useState<StructuralListEntry | null>(null);
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
  // client-side, same pattern Bay 05/06 used.
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

  // "Your structural analyses" — refetched whenever an analysis reaches
  // spec_ready, same refresh-trigger pattern as every other bay's own list.
  async function fetchStructurals() {
    setStructuralsStatus("loading");
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setStructuralsStatus("error");
      return;
    }
    try {
      const res = await fetch("/api/hangar/structurals", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setStructurals(await res.json());
      setStructuralsStatus("idle");
    } catch {
      setStructuralsStatus("error");
    }
  }

  useEffect(() => {
    if (currentUserEmail) fetchStructurals();
  }, [currentUserEmail, flow.status]);

  function resetFlow() {
    setFlow(INITIAL_FLOW_STATE);
    setSelectedCADDesign(null);
    setSelectedStructural(null);
  }

  function selectCADDesign(d: CADDesignListEntry) {
    resetFlow();
    setSelectedCADDesign(d);
    setPlanExpanded(true);
  }

  async function generateStructuralAnalysis() {
    if (!selectedCADDesign) return;
    setFlow({ status: "running", result: null, errorMessage: null });
    const outcome = await callStageApi<Stage1Result>(
      "/api/hangar/process-structural/structural-assessment",
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
    <div className="hgr-t">
      <style>{HGR_STRUCTURAL_CSS}</style>

      <nav>
        <div className="hgr-t-wrap">
          <div className="hgr-t-crumbs">
            <Link to="/">TorqWings</Link>
            <span className="hgr-t-sep">/</span>
            <Link to="/the-hangar">The Hangar</Link>
            <span className="hgr-t-sep">/</span>
            <span className="hgr-t-cur">Bay 07 — Structural Agent</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {currentUserEmail && (
              <span
                className="hgr-t-mono"
                style={{ fontSize: 12.5, color: "var(--hgr-t-paper-dim)" }}
              >
                Welcome, {currentUserEmail}
              </span>
            )}
            <Link to="/the-hangar/welcome" className="hgr-t-exit">
              ← Back to Hangar
            </Link>
            <Link to="/the-hangar" className="hgr-t-exit">
              Exit site
            </Link>
          </div>
        </div>
      </nav>

      <main>
        <div className="hgr-t-hero">
          <div className="hgr-t-doors">
            <div className="hgr-t-door hgr-t-door-left" />
            <div className="hgr-t-door hgr-t-door-right" />
          </div>
          <div className="hgr-t-wrap">
            <div className="hgr-t-status-row">
              <span className="hgr-t-badge hgr-t-badge-bay">BAY 07 OF 15</span>
            </div>
            <div className="hgr-t-hero-row">
              <h1>Structural Agent</h1>
              <p className="hgr-t-lead">
                Takes a <b>spec-ready CAD design</b> from Bay 04 and estimates mesh/material setup,
                load cases, stress results, and a safety factor — a deterministic confidence score,
                not the model's own self-assessment.
              </p>
            </div>
          </div>
        </div>

        <section id="run-structural-assessment">
          <div className="hgr-t-wrap">
            <div className="hgr-t-kicker">Run a structural assessment</div>
            <h2 className="hgr-t-sec-title">
              Turn a spec-ready CAD design into a structural estimate.
            </h2>
            <p className="hgr-t-sec-sub">
              Runs one real Claude Sonnet 5 call to estimate mesh/material assignment, load cases,
              stress results, and safety factor, then a deterministic confidence pass. There's no
              real FEA solver (CalculiX/Code_Aster/Abaqus) yet and no real Materials DB, so this is
              Claude reasoning about plausible structural behavior using approximated material
              allowables, not a simulated engineering result. Risk flags are advisory only — nothing
              here is blocked by them.
            </p>

            {specReadyDesignsStatus === "error" && (
              <ListFetchError onRetry={fetchSpecReadyDesigns} />
            )}

            {specReadyDesignsStatus !== "error" &&
              specReadyDesigns &&
              specReadyDesigns.length > 0 &&
              !selectedStructural && (
                <ListPanel
                  title={`Your spec-ready CAD designs (${specReadyDesigns.length})`}
                  expanded={designsExpanded}
                  onToggleExpanded={() => setDesignsExpanded((v) => !v)}
                >
                  {specReadyDesigns.map((d) => (
                    <button
                      key={d.cadDesignId}
                      type="button"
                      className="hgr-t-list-row"
                      onClick={() => selectCADDesign(d)}
                    >
                      <span className="hgr-t-list-row-code">{d.cadCode}</span>
                      <span className="hgr-t-list-row-type">
                        {d.bom ? `${d.bom.length} BOM entries` : "—"}
                      </span>
                      <span className="hgr-t-list-row-confidence">
                        {d.confidenceScore !== null
                          ? `${Math.round(d.confidenceScore * 100)}%`
                          : "—"}
                      </span>
                      <span className="hgr-t-list-row-date">
                        {new Date(d.createdAt).toLocaleDateString()}
                      </span>
                    </button>
                  ))}
                </ListPanel>
              )}

            {specReadyDesignsStatus !== "error" &&
              specReadyDesigns &&
              specReadyDesigns.length === 0 && (
                <p className="hgr-t-empty-hint">
                  No spec-ready CAD designs yet — generate one in{" "}
                  <Link to="/the-hangar/cad-design">CAD Agent</Link> first, then come back here to
                  run a structural assessment against it.
                </p>
              )}

            {structuralsStatus === "error" && <ListFetchError onRetry={fetchStructurals} />}

            {structuralsStatus !== "error" &&
              structurals &&
              structurals.length > 0 &&
              !selectedStructural && (
                <ListPanel
                  title={`Your structural analyses (${structurals.length})`}
                  expanded={structuralsExpanded}
                  onToggleExpanded={() => setStructuralsExpanded((v) => !v)}
                >
                  {structurals.map((s) => (
                    <button
                      key={s.structuralId}
                      type="button"
                      className="hgr-t-list-row"
                      onClick={() => setSelectedStructural(s)}
                    >
                      <span className="hgr-t-list-row-code">{s.structuralCode}</span>
                      <span className="hgr-t-list-row-type">
                        {s.safetyFactor !== null ? `SF ${s.safetyFactor}` : "—"}
                      </span>
                      <span className={`hgr-t-list-row-status hgr-t-list-row-status-${s.status}`}>
                        {STRUCTURAL_STATUS_LABEL[s.status] ?? s.status}
                      </span>
                      <MockSourceBadge show={s.sourceWasMock === true} compact />
                      <span className="hgr-t-list-row-confidence">
                        {s.confidenceScore !== null
                          ? `${Math.round(s.confidenceScore * 100)}%`
                          : "—"}
                      </span>
                      <span className="hgr-t-list-row-date">
                        {new Date(s.createdAt).toLocaleDateString()}
                      </span>
                    </button>
                  ))}
                </ListPanel>
              )}

            {selectedStructural ? (
              <PastStructuralDetail
                structural={selectedStructural}
                onBack={() => setSelectedStructural(null)}
              />
            ) : (
              <div className={isIdle ? "hgr-t-collapsible" : undefined}>
                {isIdle && (
                  <button
                    type="button"
                    className="hgr-t-collapsible-title"
                    onClick={() => setPlanExpanded((v) => !v)}
                    aria-expanded={planExpanded}
                  >
                    <span>Run a structural assessment</span>
                    <span className={`hgr-t-arrow${planExpanded ? " hgr-t-arrow-open" : ""}`}>
                      ▸
                    </span>
                  </button>
                )}
                {(!isIdle || planExpanded) && (
                  <div className={isIdle ? "hgr-t-collapsible-body" : undefined}>
                    {flow.status !== "complete" && (
                      <div className="hgr-t-process-grid">
                        <div>
                          {selectedCADDesign ? (
                            <div className="hgr-t-selected-spec">
                              <span className="hgr-t-selected-spec-label">Assessing</span>
                              <p>
                                <b>{selectedCADDesign.cadCode}</b> —{" "}
                                {selectedCADDesign.bom
                                  ? `${selectedCADDesign.bom.length} BOM entries`
                                  : "—"}
                              </p>
                              {flow.status !== "running" && (
                                <button
                                  type="button"
                                  className="hgr-t-btn hgr-t-btn-amber"
                                  onClick={generateStructuralAnalysis}
                                >
                                  Run Structural Assessment →
                                </button>
                              )}
                            </div>
                          ) : (
                            <p className="hgr-t-status-idle">
                              Select a spec-ready CAD design above to begin running a structural
                              assessment.
                            </p>
                          )}
                          {flow.status === "error" && (
                            <StageErrorCard
                              title="Couldn't complete Structural Assessment."
                              message={flow.errorMessage}
                              onRetry={generateStructuralAnalysis}
                            />
                          )}
                        </div>

                        {/* No multi-item stage tracker here, deliberately —
                            see the file header comment. Just the one real
                            stage's name and a single spinner. */}
                        <div className="hgr-t-status-panel">
                          <div className="hgr-t-status-panel-title">Structural Assessment</div>
                          {flow.status === "running" ? (
                            <div className="hgr-t-status-step hgr-t-status-step-active">
                              <span className="hgr-t-status-icon">
                                <span className="hgr-t-status-spinner" />
                              </span>
                              <span className="hgr-t-status-text">Processing…</span>
                            </div>
                          ) : flow.status === "error" ? (
                            <p className="hgr-t-status-idle">
                              Stopped — see the error below, then retry.
                            </p>
                          ) : (
                            <p className="hgr-t-status-idle">
                              Select a spec-ready CAD design, then run to begin.
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {flow.status === "complete" && flow.result && (
                      <StructuralResultView result={flow.result} onStartNew={resetFlow} />
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
    <div className="hgr-t-collapsible" style={{ marginBottom: 20 }}>
      <button
        type="button"
        className="hgr-t-collapsible-title"
        onClick={onToggleExpanded}
        aria-expanded={expanded}
      >
        <span>{title}</span>
        <span className={`hgr-t-arrow${expanded ? " hgr-t-arrow-open" : ""}`}>▸</span>
      </button>
      {expanded && <div className="hgr-t-list">{children}</div>}
    </div>
  );
}

function ListFetchError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="hgr-t-list-fetch-error">
      <p>Couldn't load this list — check your connection and try again.</p>
      <button type="button" className="hgr-t-btn hgr-t-btn-ghost" onClick={onRetry}>
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
    <div className="hgr-t-error">
      <b>{title}</b>
      <p>{message}</p>
      <button type="button" className="hgr-t-btn hgr-t-btn-ghost" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}

// Same durable-badge convention as Bay 03/04/05's MockSourceBadge — fed
// from Hangar_Structural_specs.source_was_mock directly, shown everywhere
// an analysis is ever displayed (live result, list row, past-analysis
// view), not just during the run that produced it.
function MockSourceBadge({ show, compact }: { show: boolean; compact?: boolean }) {
  if (!show) return null;
  return (
    <span className={`hgr-t-mock-badge${compact ? " hgr-t-mock-badge-compact" : ""}`}>
      ⚠ Source CAD design was mock-generated
    </span>
  );
}

function MeshMaterialFields({ meshMaterial }: { meshMaterial: MeshMaterial }) {
  return (
    <div className="hgr-t-dash-fields">
      <DashField label="Element type" value={meshMaterial.elementType || "—"} />
      <DashField label="Material" value={meshMaterial.materialAssigned || "—"} />
      <DashField label="Modulus" value={`${meshMaterial.modulusGpa} GPa`} />
      <DashField label="Yield strength" value={`${meshMaterial.yieldStrengthMpa} MPa`} />
    </div>
  );
}

function LoadCasesList({ loadCases }: { loadCases: LoadCase[] }) {
  if (loadCases.length === 0) {
    return <p className="hgr-t-dash-empty">No load cases were generated.</p>;
  }
  return (
    <ul className="hgr-t-load-cases">
      {loadCases.map((lc, i) => (
        <li key={i}>
          <span className="hgr-t-load-case-tag">{lc.case}</span> {lc.description}
        </li>
      ))}
    </ul>
  );
}

function StressResultsFields({ stressResults }: { stressResults: StressResults }) {
  return (
    <div>
      <div className="hgr-t-dash-fields" style={{ marginBottom: 14 }}>
        <DashField label="Von Mises max" value={`${stressResults.vonMisesMaxMpa} MPa`} />
        <DashField label="Max displacement" value={`${stressResults.maxDisplacementMm} mm`} />
      </div>
      {stressResults.criticalLocations.length > 0 ? (
        <ul className="hgr-t-critical-locations">
          {stressResults.criticalLocations.map((loc, i) => (
            <li key={i}>{loc}</li>
          ))}
        </ul>
      ) : (
        <p className="hgr-t-dash-empty">No critical locations flagged.</p>
      )}
    </div>
  );
}

function DashField({ label, value }: { label: string; value: string }) {
  return (
    <div className="hgr-t-dash-field">
      <div className="hgr-t-dash-field-label">{label}</div>
      <div className="hgr-t-dash-field-value">{value}</div>
    </div>
  );
}

// Advisory only, never blocking — StructuralAgent.md's Open Questions
// section leaves "gate-then-score eligibility for risk_flags" unresolved;
// no button here is disabled based on this list's contents.
function RiskFlagsList({ riskFlags }: { riskFlags: string[] }) {
  if (riskFlags.length === 0) {
    return <p className="hgr-t-dash-empty">No risk flags.</p>;
  }
  return (
    <div className="hgr-t-risk-flags">
      <ul>
        {riskFlags.map((flag, i) => (
          <li key={i}>{flag}</li>
        ))}
      </ul>
    </div>
  );
}

// Live result view, shown immediately after the stage completes. No
// Save-as-final / Edit-and-regenerate — no finalize stage exists, same
// reasoning as Bay 04/05/06's own result views.
function StructuralResultView({
  result,
  onStartNew,
}: {
  result: Stage1Result;
  onStartNew: () => void;
}) {
  return (
    <div className="hgr-t-dash">
      <div className="hgr-t-dash-header">
        <div>
          <div className="hgr-t-dash-badge">Spec Ready</div>
          <h3>{result.structuralCode}</h3>
          <MockSourceBadge show={result.sourceWasMock} />
        </div>
        <div className="hgr-t-dash-confidence">
          <div className="hgr-t-dash-confidence-num">
            {Math.round(result.confidenceScore * 100)}%
          </div>
          <div className="hgr-t-dash-confidence-label">Confidence</div>
        </div>
      </div>

      <div className="hgr-t-dash-section">
        <h4>Mesh & Material</h4>
        <MeshMaterialFields meshMaterial={result.meshMaterial} />
      </div>

      <div className="hgr-t-dash-section">
        <h4>Load Cases ({result.loadCases.length})</h4>
        <LoadCasesList loadCases={result.loadCases} />
      </div>

      <div className="hgr-t-dash-section">
        <h4>Stress Results</h4>
        <StressResultsFields stressResults={result.stressResults} />
      </div>

      <div className="hgr-t-dash-section">
        <h4>Safety Factor</h4>
        <DashField label="Safety factor" value={`${result.safetyFactor}`} />
        <div style={{ marginTop: 12 }}>
          <DashField label="Convergence" value={result.convergenceStatus} />
        </div>
      </div>

      <div className="hgr-t-dash-section">
        <h4>Risk Flags ({result.riskFlags.length})</h4>
        <RiskFlagsList riskFlags={result.riskFlags} />
      </div>

      <div className="hgr-t-dash-section">
        <h4>Reasoning Summary</h4>
        <p className="hgr-t-dash-rationale">{result.reasoningSummary}</p>
      </div>

      <div className="hgr-t-dash-actions">
        <button
          type="button"
          className="hgr-t-btn hgr-t-btn-ghost"
          disabled
          title="Bay 09 not yet built"
        >
          Continue to Optimization Agent →
        </button>
        <button type="button" className="hgr-t-btn hgr-t-btn-amber" onClick={onStartNew}>
          Start a new structural assessment
        </button>
      </div>
    </div>
  );
}

// Read-only view of a past analysis, opened from "Your structural
// analyses" — reuses the same field components so a historical analysis
// looks the same as one just generated. No actions besides going back,
// same reasoning as Bay 04/05/06's own past-detail views.
function PastStructuralDetail({
  structural,
  onBack,
}: {
  structural: StructuralListEntry;
  onBack: () => void;
}) {
  const hasSpec = structural.meshMaterial !== null;
  return (
    <div className="hgr-t-dash">
      <div className="hgr-t-dash-header">
        <div>
          <div className="hgr-t-dash-badge">
            {STRUCTURAL_STATUS_LABEL[structural.status] ?? structural.status}
          </div>
          <h3>{structural.structuralCode}</h3>
          <MockSourceBadge show={structural.sourceWasMock === true} />
        </div>
        {structural.confidenceScore !== null && (
          <div className="hgr-t-dash-confidence">
            <div className="hgr-t-dash-confidence-num">
              {Math.round(structural.confidenceScore * 100)}%
            </div>
            <div className="hgr-t-dash-confidence-label">Confidence</div>
          </div>
        )}
      </div>
      {hasSpec ? (
        <>
          <div className="hgr-t-dash-section">
            <h4>Mesh & Material</h4>
            <MeshMaterialFields meshMaterial={structural.meshMaterial!} />
          </div>
          <div className="hgr-t-dash-section">
            <h4>Load Cases ({structural.loadCases?.length ?? 0})</h4>
            <LoadCasesList loadCases={structural.loadCases ?? []} />
          </div>
          <div className="hgr-t-dash-section">
            <h4>Stress Results</h4>
            <StressResultsFields stressResults={structural.stressResults!} />
          </div>
          <div className="hgr-t-dash-section">
            <h4>Safety Factor</h4>
            <DashField label="Safety factor" value={`${structural.safetyFactor}`} />
            <div style={{ marginTop: 12 }}>
              <DashField label="Convergence" value={structural.convergenceStatus ?? "—"} />
            </div>
          </div>
          <div className="hgr-t-dash-section">
            <h4>Risk Flags ({structural.riskFlags?.length ?? 0})</h4>
            <RiskFlagsList riskFlags={structural.riskFlags ?? []} />
          </div>
          <div className="hgr-t-dash-section">
            <h4>Reasoning Summary</h4>
            <p className="hgr-t-dash-rationale">{structural.reasoningSummary}</p>
          </div>
        </>
      ) : (
        <div className="hgr-t-dash-section">
          <p className="hgr-t-dash-empty">
            No spec was generated for this analysis — its status is "
            {STRUCTURAL_STATUS_LABEL[structural.status] ?? structural.status}".
          </p>
        </div>
      )}
      <div className="hgr-t-dash-actions">
        <button type="button" className="hgr-t-btn hgr-t-btn-ghost" onClick={onBack}>
          ← Back to Your structural analyses
        </button>
      </div>
    </div>
  );
}

const HGR_STRUCTURAL_CSS = `
.hgr-t{
  --hgr-t-navy-deep:#08131F; --hgr-t-navy-panel:#0F2136;
  --hgr-t-blue-line:#3E7CA6; --hgr-t-blue-bright:#6FB4E0;
  --hgr-t-amber:#E8A33D; --hgr-t-amber-bright:#F6C374;
  --hgr-t-paper:#ECEFF3; --hgr-t-paper-dim:#8FA5BB;
  --hgr-t-green:#5FBF8F; --hgr-t-red:#E0715A;
  --hgr-t-grid:rgba(111,180,224,0.08); --hgr-t-hairline:rgba(111,180,224,0.20);

  background:var(--hgr-t-navy-deep); color:var(--hgr-t-paper); font-family:'IBM Plex Sans', sans-serif;
  background-image:linear-gradient(var(--hgr-t-grid) 1px, transparent 1px), linear-gradient(90deg, var(--hgr-t-grid) 1px, transparent 1px);
  background-size:44px 44px;
  min-height:100vh;
}
.hgr-t *{ box-sizing:border-box; }
.hgr-t h1,.hgr-t h2,.hgr-t h3{ font-family:'Space Grotesk', sans-serif; font-weight:600; letter-spacing:-0.01em; margin:0; }
.hgr-t-mono{ font-family:'IBM Plex Mono', monospace; }
.hgr-t-wrap{ max-width:1180px; margin:0 auto; padding:0 32px; }
.hgr-t a{ color:inherit; }

.hgr-t nav{ border-bottom:1px solid var(--hgr-t-hairline); position:sticky; top:0; background:rgba(8,19,31,0.9); backdrop-filter:blur(8px); z-index:20; }
.hgr-t nav .hgr-t-wrap{ display:flex; align-items:center; justify-content:space-between; height:68px; }
.hgr-t-crumbs{ font-size:14px; color:var(--hgr-t-paper-dim); display:flex; align-items:center; gap:8px; }
.hgr-t-crumbs a{ text-decoration:none; color:var(--hgr-t-paper-dim); }
.hgr-t-crumbs a:hover{ color:var(--hgr-t-blue-bright); }
.hgr-t-sep{ color:var(--hgr-t-blue-line); }
.hgr-t-cur{ color:var(--hgr-t-paper); font-weight:500; }
.hgr-t-exit{ font-family:'IBM Plex Mono',monospace; font-size:12.5px; color:var(--hgr-t-paper-dim); text-decoration:none; border:1px solid var(--hgr-t-hairline); padding:8px 15px; border-radius:2px; }
.hgr-t-exit:hover{ color:var(--hgr-t-paper); border-color:var(--hgr-t-blue-bright); }

.hgr-t main{ padding-bottom:100px; }
.hgr-t-hero{ padding:56px 0 20px; border-bottom:1px solid var(--hgr-t-hairline); position:relative; overflow:hidden; }
.hgr-t-doors{ position:absolute; inset:0; z-index:5; display:flex; pointer-events:none; }
.hgr-t-door{ flex:1; background: repeating-linear-gradient(90deg, #0C1E30 0 78px, #08131F 78px 80px); position:relative; }
.hgr-t-door::after{ content:""; position:absolute; top:0; bottom:0; width:2px; background:var(--hgr-t-blue-line); opacity:.5; }
.hgr-t-door-left{ animation: hgr-t-openLeft 1.4s cubic-bezier(.77,0,.18,1) .3s forwards; }
.hgr-t-door-right{ animation: hgr-t-openRight 1.4s cubic-bezier(.77,0,.18,1) .3s forwards; }
.hgr-t-door-left::after{ right:0; }
.hgr-t-door-right::after{ left:0; }
@keyframes hgr-t-openLeft{ from{ transform:translateX(0);} to{ transform:translateX(-100%);} }
@keyframes hgr-t-openRight{ from{ transform:translateX(0);} to{ transform:translateX(100%);} }
@media (prefers-reduced-motion: reduce){ .hgr-t-doors{ display:none; } }
.hgr-t-status-row{ display:flex; align-items:center; gap:12px; margin-bottom:22px; flex-wrap:wrap; }
.hgr-t-badge{ font-family:'IBM Plex Mono',monospace; font-size:11.5px; letter-spacing:.1em; text-transform:uppercase; padding:6px 13px; border-radius:2px; display:inline-flex; align-items:center; gap:8px; }
.hgr-t-badge-bay{ color:var(--hgr-t-paper-dim); border:1px solid var(--hgr-t-hairline); }
.hgr-t-hero-row{ display:flex; align-items:center; gap:48px; flex-wrap:wrap; }
@media(max-width:760px){ .hgr-t-hero-row{ flex-direction:column; align-items:flex-start; gap:16px; } }
.hgr-t-hero h1{ font-size:clamp(34px,5vw,58px); margin:0; flex-shrink:0; }
.hgr-t-hero .hgr-t-lead{ color:var(--hgr-t-paper-dim); font-size:15.5px; max-width:480px; line-height:1.6; margin:0; flex:1; min-width:280px; }
.hgr-t-hero .hgr-t-lead b{ color:var(--hgr-t-paper); font-weight:600; }

.hgr-t section{ padding:60px 0; }
#run-structural-assessment{ padding-top:32px; }
.hgr-t-kicker{ font-family:'IBM Plex Mono',monospace; font-size:12px; letter-spacing:.14em; text-transform:uppercase; color:var(--hgr-t-amber); margin-bottom:12px; }
.hgr-t-sec-title{ font-size:clamp(22px,2.6vw,30px); margin-bottom:10px; }
.hgr-t-sec-sub{ color:var(--hgr-t-paper-dim); font-size:14.5px; max-width:640px; margin-bottom:36px; }
.hgr-t-empty-hint{ color:var(--hgr-t-paper-dim); font-size:13.5px; margin-bottom:24px; }
.hgr-t-empty-hint a{ color:var(--hgr-t-blue-bright); }

.hgr-t-btn{ font-family:'IBM Plex Mono',monospace; font-size:13px; padding:12px 22px; border-radius:2px; display:inline-flex; align-items:center; gap:8px; text-decoration:none; border:1px solid transparent; cursor:pointer; background:none; }
.hgr-t-btn-ghost{ border:1px solid var(--hgr-t-hairline); color:var(--hgr-t-paper-dim); }
.hgr-t-btn-ghost:hover{ color:var(--hgr-t-paper); border-color:var(--hgr-t-blue-bright); }
.hgr-t-btn-amber{ background:var(--hgr-t-amber); color:var(--hgr-t-navy-deep); font-weight:600; }
.hgr-t-btn-amber:hover{ background:var(--hgr-t-amber-bright); }
.hgr-t-btn:disabled{ opacity:.4; cursor:not-allowed; }
.hgr-t-btn:disabled:hover{ color:var(--hgr-t-paper-dim); border-color:var(--hgr-t-hairline); }

/* ── Collapsible panels ── */
.hgr-t-collapsible{ border:1px solid var(--hgr-t-hairline); background:var(--hgr-t-navy-panel); border-radius:2px; margin-bottom:32px; }
.hgr-t-collapsible-title{ display:flex; align-items:center; justify-content:space-between; width:100%; font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.08em; text-transform:uppercase; color:var(--hgr-t-paper-dim); padding:14px 18px; border:none; background:none; cursor:pointer; }
.hgr-t-collapsible-title:hover{ color:var(--hgr-t-paper); }
.hgr-t-arrow{ display:inline-block; font-size:11px; transition:transform .15s; }
.hgr-t-arrow-open{ transform:rotate(90deg); }
.hgr-t-list{ max-height:260px; overflow-y:auto; border-top:1px solid var(--hgr-t-hairline); }
.hgr-t-list-row{ display:grid; grid-template-columns:1.2fr 1.6fr 0.7fr auto 0.7fr 1fr; align-items:center; gap:10px; width:100%; padding:12px 18px; border:none; border-bottom:1px dashed var(--hgr-t-hairline); background:none; cursor:pointer; text-align:left; font-family:'IBM Plex Sans',sans-serif; transition:background .15s; }
.hgr-t-list-row:last-child{ border-bottom:none; }
.hgr-t-list-row:hover{ background:rgba(111,180,224,.07); }
@media(max-width:820px){ .hgr-t-list-row{ grid-template-columns:1fr 1fr; row-gap:4px; } }
.hgr-t-list-row-code{ font-family:'IBM Plex Mono',monospace; font-size:11.5px; color:var(--hgr-t-blue-bright); }
.hgr-t-list-row-type{ font-size:13px; color:var(--hgr-t-paper); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.hgr-t-list-row-status{ font-family:'IBM Plex Mono',monospace; font-size:10px; letter-spacing:.05em; text-transform:uppercase; color:var(--hgr-t-paper-dim); border:1px solid var(--hgr-t-hairline); padding:3px 8px; border-radius:2px; justify-self:start; white-space:nowrap; }
.hgr-t-list-row-status-spec_ready{ color:var(--hgr-t-blue-bright); border-color:rgba(111,180,224,.4); }
.hgr-t-list-row-status-finalized{ color:var(--hgr-t-amber-bright); border-color:rgba(232,163,61,.4); }
.hgr-t-list-row-status-error{ color:var(--hgr-t-amber); border-color:rgba(232,163,61,.4); }
.hgr-t-list-row-confidence{ font-family:'IBM Plex Mono',monospace; font-size:12.5px; color:var(--hgr-t-paper-dim); }
.hgr-t-list-row-date{ font-family:'IBM Plex Mono',monospace; font-size:11.5px; color:var(--hgr-t-paper-dim); text-align:right; }

/* ── List-fetch error ── */
.hgr-t-list-fetch-error{ display:flex; align-items:center; justify-content:space-between; gap:16px; padding:14px 18px; margin-bottom:20px; border:1px solid rgba(232,163,61,.4); background:rgba(232,163,61,.08); border-radius:2px; }
.hgr-t-list-fetch-error p{ margin:0; color:var(--hgr-t-paper-dim); font-size:13.5px; }

/* ── Process grid + selected-spec / status panel ── */
.hgr-t-process-grid{ display:grid; grid-template-columns:1fr 320px; gap:32px; align-items:start; }
@media(max-width:820px){ .hgr-t-process-grid{ grid-template-columns:1fr; } }
.hgr-t-selected-spec{ max-width:640px; padding:14px 16px; border:1px solid rgba(111,180,224,.3); border-left:3px solid var(--hgr-t-blue-bright); background:rgba(111,180,224,.09); border-radius:2px; margin-bottom:20px; }
.hgr-t-selected-spec-label{ display:block; font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.08em; text-transform:uppercase; color:var(--hgr-t-blue-bright); margin-bottom:8px; }
.hgr-t-selected-spec p{ margin:0 0 14px; font-size:14px; color:var(--hgr-t-paper); line-height:1.6; }

.hgr-t-status-panel{ border:1px solid var(--hgr-t-hairline); background:var(--hgr-t-navy-panel); border-radius:2px; padding:20px; }
.hgr-t-status-panel-title{ font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.08em; text-transform:uppercase; color:var(--hgr-t-paper-dim); margin-bottom:16px; }
.hgr-t-status-idle{ color:var(--hgr-t-paper-dim); font-size:13px; line-height:1.6; margin:0; }
.hgr-t-status-step{ display:flex; align-items:flex-start; gap:10px; padding:9px 0; }
.hgr-t-status-icon{ width:18px; height:18px; flex-shrink:0; display:flex; align-items:center; justify-content:center; }
.hgr-t-status-spinner{ width:13px; height:13px; border-radius:50%; border:2px solid var(--hgr-t-hairline); border-top-color:var(--hgr-t-amber); animation:hgr-t-spin 0.8s linear infinite; }
.hgr-t-status-text{ font-size:12.5px; line-height:1.5; color:var(--hgr-t-paper-dim); }
.hgr-t-status-step-active .hgr-t-status-text{ color:var(--hgr-t-paper); }

/* ── Mock source badge (durable, matches Bay 03/04/05's convention) ── */
.hgr-t-mock-badge{ display:inline-flex; font-family:'IBM Plex Mono',monospace; font-size:10.5px; letter-spacing:.03em; color:var(--hgr-t-amber-bright); border:1px solid rgba(232,163,61,.4); background:rgba(232,163,61,.08); padding:4px 9px; border-radius:2px; margin-top:8px; }
.hgr-t-mock-badge-compact{ margin-top:0; font-size:9.5px; padding:2px 7px; justify-self:start; }

/* ── Error ── */
@keyframes hgr-t-spin{ to{ transform:rotate(360deg); } }
.hgr-t-error{ border:1px solid rgba(232,163,61,.4); background:rgba(232,163,61,.08); border-radius:2px; padding:20px 22px; max-width:640px; margin-top:20px; }
.hgr-t-error b{ color:var(--hgr-t-amber-bright); display:block; margin-bottom:6px; font-size:14px; }
.hgr-t-error p{ color:var(--hgr-t-paper-dim); font-size:13.5px; margin:0 0 16px; line-height:1.6; }

/* ── Dashboard / result views ── */
.hgr-t-dash{ border:1px solid var(--hgr-t-hairline); background:var(--hgr-t-navy-panel); }
.hgr-t-dash-header{ display:flex; align-items:flex-start; justify-content:space-between; gap:24px; padding:26px 28px; border-bottom:1px solid var(--hgr-t-hairline); flex-wrap:wrap; }
.hgr-t-dash-badge{ display:inline-block; font-family:'IBM Plex Mono',monospace; font-size:10.5px; letter-spacing:.08em; text-transform:uppercase; color:var(--hgr-t-blue-bright); border:1px solid rgba(111,180,224,.4); padding:4px 10px; border-radius:2px; margin-bottom:10px; }
.hgr-t-dash-header h3{ font-size:20px; margin-bottom:6px; }
.hgr-t-dash-confidence{ text-align:center; flex-shrink:0; }
.hgr-t-dash-confidence-num{ font-family:'Space Grotesk',sans-serif; font-size:32px; font-weight:700; color:var(--hgr-t-amber-bright); line-height:1; }
.hgr-t-dash-confidence-label{ font-family:'IBM Plex Mono',monospace; font-size:10px; letter-spacing:.08em; text-transform:uppercase; color:var(--hgr-t-paper-dim); }
.hgr-t-dash-section{ padding:24px 28px; border-bottom:1px solid var(--hgr-t-hairline); }
.hgr-t-dash-section:last-of-type{ border-bottom:none; }
.hgr-t-dash-section h4{ font-family:'Space Grotesk',sans-serif; font-size:14.5px; font-weight:600; margin-bottom:16px; }
.hgr-t-dash-empty{ color:var(--hgr-t-paper-dim); font-size:13px; margin:0; }
.hgr-t-dash-rationale{ color:var(--hgr-t-paper); font-size:14px; line-height:1.7; margin:0; }
.hgr-t-dash-fields{ display:grid; grid-template-columns:repeat(3,1fr); gap:20px; }
@media(max-width:700px){ .hgr-t-dash-fields{ grid-template-columns:1fr 1fr; } }
.hgr-t-dash-field-label{ font-family:'IBM Plex Mono',monospace; font-size:10.5px; letter-spacing:.06em; text-transform:uppercase; color:var(--hgr-t-paper-dim); margin-bottom:6px; }
.hgr-t-dash-field-value{ font-size:14px; }

/* ── Load cases ── */
.hgr-t-load-cases{ margin:0; padding-left:18px; color:var(--hgr-t-paper); font-size:13px; line-height:1.9; }
.hgr-t-load-case-tag{ font-family:'IBM Plex Mono',monospace; font-size:10.5px; letter-spacing:.04em; text-transform:uppercase; color:var(--hgr-t-blue-bright); }

/* ── Critical locations ── */
.hgr-t-critical-locations{ margin:0; padding-left:18px; color:var(--hgr-t-paper-dim); font-size:13px; line-height:1.7; }

/* ── Risk flags (advisory, non-blocking) ── */
.hgr-t-risk-flags{ border:1px solid rgba(232,163,61,.4); background:rgba(232,163,61,.08); border-radius:2px; padding:14px 16px; }
.hgr-t-risk-flags ul{ margin:0; padding-left:18px; color:var(--hgr-t-amber-bright); font-size:13px; line-height:1.7; }
`;
