import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useHangarSession } from "@/lib/the-hangar/session";
import { DesignGuidanceFooter } from "@/components/the-hangar/DesignGuidanceFooter";
import { supabase } from "@/integrations/supabase/client";
import type { AircraftDesignListEntry } from "@/lib/the-hangar/aircraftDesignAgentPipeline";
import type { Stage1Result, CADDesignListEntry } from "@/lib/the-hangar/cadDesignAgentPipeline";
import type { CADModelFiles, BomEntry, MassProperties } from "@/lib/the-hangar/cadDesignGeneration";

// ─────────────────────────────────────────────────────────────────────────
// The Hangar — Bay 04 (CAD Agent) detail page, phase 1. New, self-contained
// page (no shared imports with the-hangar.aircraft-design.tsx or any other
// bay page, matching the welcome page's own "fully isolated" convention).
//
// Look and feel match Bay 03 (Vehicle Design): the light hangar theme, the
// live "AI" badge in the status row, input and output lists side by side
// (one open at a time, folded once a design is picked), and an inline
// spinner in the "Generating from" box instead of a separate status panel.
//
// Deliberately NOT a 4-item gated-stage tracker — same reasoning as Bay 03:
// this bay has exactly one real stage today (Model Generation).
//
// source_was_mock is surfaced durably (live result, list row, past-design
// view) via MockSourceBadge, matching Bay 03's own convention — not
// transient like Bay 02. Hangar_CADDesign_specs persists source_was_mock
// directly.
// ─────────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/the-hangar/cad-design")({
  component: TheHangarCADDesign,
});

interface FlowState {
  status: "idle" | "running" | "complete" | "error";
  result: Stage1Result | null;
  errorMessage: string | null;
}

const INITIAL_FLOW_STATE: FlowState = { status: "idle", result: null, errorMessage: null };

const CAD_DESIGN_STATUS_LABEL: Record<string, string> = {
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

function TheHangarCADDesign() {
  const ready = useHangarSession();
  const navigate = useNavigate();

  const [flow, setFlow] = useState<FlowState>(INITIAL_FLOW_STATE);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [specReadyDesigns, setSpecReadyDesigns] = useState<AircraftDesignListEntry[] | null>(null);
  const [specReadyDesignsStatus, setSpecReadyDesignsStatus] = useState<
    "idle" | "loading" | "error"
  >("idle");
  const [designsExpanded, setDesignsExpanded] = useState(false);
  const [cadDesigns, setCADDesigns] = useState<CADDesignListEntry[] | null>(null);
  const [cadDesignsStatus, setCADDesignsStatus] = useState<"idle" | "loading" | "error">("idle");
  const [cadDesignsExpanded, setCADDesignsExpanded] = useState(false);
  const [selectedAircraftDesign, setSelectedAircraftDesign] =
    useState<AircraftDesignListEntry | null>(null);
  const [selectedCADDesign, setSelectedCADDesign] = useState<CADDesignListEntry | null>(null);
  const [planExpanded, setPlanExpanded] = useState(false);
  const [llmStatus, setLlmStatus] = useState<"checking" | "live" | "offline">("checking");
  const [llmProvider, setLlmProvider] = useState<"anthropic" | "groq" | null>(null);

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

  // "AI" indicator -- same live check (and provider order) every Hangar bay uses.
  useEffect(() => {
    let cancelled = false;
    async function checkLlmStatus() {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return;
      try {
        const res = await fetch("/api/hangar/llm-status", { headers: { Authorization: `Bearer ${token}` } });
        const json = await res.json();
        if (!cancelled) {
          setLlmStatus(res.ok && json.live ? "live" : "offline");
          setLlmProvider(res.ok && json.live ? json.provider ?? null : null);
        }
      } catch {
        if (!cancelled) {
          setLlmStatus("offline");
          setLlmProvider(null);
        }
      }
    }
    checkLlmStatus();
    const interval = setInterval(checkLlmStatus, 60000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // "Your spec-ready aircraft designs" — reuses /api/hangar/aircraft-designs
  // (Aircraft Design Agent's own list route, no status filter) and filters
  // to spec_ready client-side, same pattern Bay 03 used filtering concepts
  // to finalized. Designs saved from Bay 03's Vehicle Design output are
  // "finalized" and are offered too.
  async function fetchSpecReadyDesigns() {
    setSpecReadyDesignsStatus("loading");
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setSpecReadyDesignsStatus("error");
      return;
    }
    try {
      const res = await fetch("/api/hangar/aircraft-designs", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const all: AircraftDesignListEntry[] = await res.json();
      setSpecReadyDesigns(all.filter((d) => d.status === "spec_ready" || d.status === "finalized"));
      setSpecReadyDesignsStatus("idle");
    } catch {
      setSpecReadyDesignsStatus("error");
    }
  }

  useEffect(() => {
    if (currentUserEmail) fetchSpecReadyDesigns();
  }, [currentUserEmail]);

  // "Your CAD designs" — refetched whenever a design reaches spec_ready,
  // same refresh-trigger pattern as every other bay's own list.
  async function fetchCADDesigns() {
    setCADDesignsStatus("loading");
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setCADDesignsStatus("error");
      return;
    }
    try {
      const res = await fetch("/api/hangar/cad-designs", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setCADDesigns(await res.json());
      setCADDesignsStatus("idle");
    } catch {
      setCADDesignsStatus("error");
    }
  }

  useEffect(() => {
    if (currentUserEmail) fetchCADDesigns();
  }, [currentUserEmail, flow.status]);

  function resetFlow() {
    setFlow(INITIAL_FLOW_STATE);
    setSelectedAircraftDesign(null);
    setSelectedCADDesign(null);
  }

  function selectAircraftDesign(d: AircraftDesignListEntry) {
    resetFlow();
    setSelectedAircraftDesign(d);
    setPlanExpanded(true);
    // The pick is made -- fold both lists so the Generate button is in view.
    setDesignsExpanded(false);
    setCADDesignsExpanded(false);
  }

  async function generateCADModel() {
    if (!selectedAircraftDesign) return;
    setFlow({ status: "running", result: null, errorMessage: null });
    const outcome = await callStageApi<Stage1Result>(
      "/api/hangar/process-cad-design/model-generation",
      {
        aircraftDesignId: selectedAircraftDesign.aircraftDesignId,
      },
    );
    if (!outcome.ok) {
      setFlow({ status: "error", result: null, errorMessage: outcome.error });
      return;
    }
    setFlow({ status: "complete", result: outcome.data, errorMessage: null });
    // Straight on to the STEP output viewer. Phase 1 has one sample STEP
    // output (agile_recon fixtures) until the Cloud Run STEP converter
    // writes one per design; `from` lets the viewer say it's the sample.
    navigate({
      to: "/the-hangar/cad-outputs",
      search: { designId: "agile_recon", from: selectedAircraftDesign.designCode },
    });
  }

  if (!ready) return null;

  const isIdle = flow.status === "idle";

  return (
    <div className="hgr-d">
      <style>{HGR_CAD_DESIGN_CSS}</style>

      <nav>
        <div className="hgr-d-wrap">
          <div className="hgr-d-crumbs">
            <Link to="/">TorqWings</Link>
            <span className="hgr-d-sep">/</span>
            <Link to="/the-hangar">The Hangar</Link>
            <span className="hgr-d-sep">/</span>
            <span className="hgr-d-cur">Bay 04 — CAD Agent</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {currentUserEmail && (
              <span
                className="hgr-d-mono"
                style={{ fontSize: 12.5, color: "var(--hgr-d-paper-dim)" }}
              >
                Welcome, {currentUserEmail}
              </span>
            )}
            <Link to="/the-hangar/welcome" className="hgr-d-exit">
              ← Back to Hangar
            </Link>
            <Link to="/the-hangar" className="hgr-d-exit">
              Exit site
            </Link>
          </div>
        </div>
      </nav>

      <main>
        <div className="hgr-d-hero">
          <div className="hgr-d-doors">
            <div className="hgr-d-door hgr-d-door-left" />
            <div className="hgr-d-door hgr-d-door-right" />
          </div>
          <div className="hgr-d-wrap">
            <div className="hgr-d-status-row">
              <span className="hgr-d-badge hgr-d-badge-bay">BAY 04 OF 15</span>
              <span
                className={`hgr-d-badge hgr-d-badge-ai hgr-d-badge-ai-${llmStatus}`}
                title={
                  llmStatus === "checking"
                    ? "Checking the AI providers…"
                    : llmStatus === "live"
                      ? llmProvider === "groq"
                        ? "Live — answering via Groq (gpt-oss-120b), per the AI Providers order in Mission Hub"
                        : "Live — connected to Anthropic (Claude Sonnet 5)"
                      : "Offline — not connected to Anthropic or Groq. CAD model generation will fall back to mock output."
                }
              >
                <span className="hgr-d-badge-ai-dot" />
                AI
                {llmStatus === "live" && llmProvider === "anthropic" && (
                  <span className="hgr-d-badge-ai-model">
                    <svg viewBox="0 0 16 16" width="10" height="10" aria-hidden="true">
                      <path d="M8 0 L9.4 6.6 L16 8 L9.4 9.4 L8 16 L6.6 9.4 L0 8 L6.6 6.6 Z" fill="currentColor" />
                    </svg>
                    Claude
                  </span>
                )}
                {llmStatus === "live" && llmProvider === "groq" && (
                  <span className="hgr-d-badge-ai-model hgr-d-badge-ai-model-fallback">
                    <svg viewBox="0 0 16 16" width="10" height="10" aria-hidden="true">
                      <path d="M9 0 L2 9 L7 9 L6 16 L14 6 L9 6 Z" fill="currentColor" />
                    </svg>
                    Groq
                  </span>
                )}
              </span>
            </div>
            <div className="hgr-d-hero-row">
              <h1>CAD Agent</h1>
              <p className="hgr-d-lead">
                Takes a <b>Design Ready vehicle design</b> from Bay 03 and generates structured CAD
                model data — model file metadata, a bill of materials, mass properties, and
                deterministic manufacturability/interference validation.
              </p>
            </div>
          </div>
        </div>

        <section id="generate-cad-model">
          <div className="hgr-d-wrap">

            {/* Input and output side by side, as on Bay 03: the Design Ready
                vehicle designs a CAD model can be generated from, and the CAD
                designs already generated. Only one is open at a time. */}
            {!selectedCADDesign && (
              <div className="hgr-d-lists">
                <div className="hgr-d-lists-col">
            {specReadyDesignsStatus === "error" && (
              <ListFetchError onRetry={fetchSpecReadyDesigns} />
            )}

            {specReadyDesignsStatus !== "error" &&
              specReadyDesigns &&
              specReadyDesigns.length > 0 && (
                <ListPanel
                  title={`Your Design Ready vehicle designs (${specReadyDesigns.length})`}
                  expanded={designsExpanded}
                  onToggleExpanded={() => {
                    setDesignsExpanded(!designsExpanded);
                    setCADDesignsExpanded(false);
                  }}
                >
                  {specReadyDesigns.map((d) => (
                    <button
                      key={d.aircraftDesignId}
                      type="button"
                      className="hgr-d-list-row"
                      onClick={() => selectAircraftDesign(d)}
                    >
                      <span className="hgr-d-list-row-code">{d.designCode}</span>
                      <span className="hgr-d-list-row-type">
                        {d.geometryParameters?.vehicleClass ?? "—"}
                      </span>
                      <span className="hgr-d-list-row-confidence">
                        {d.confidenceScore !== null
                          ? `${Math.round(d.confidenceScore * 100)}%`
                          : "—"}
                      </span>
                      <span className="hgr-d-list-row-date">
                        {new Date(d.createdAt).toLocaleDateString()}
                      </span>
                    </button>
                  ))}
                </ListPanel>
              )}

            {specReadyDesignsStatus !== "error" &&
              specReadyDesigns &&
              specReadyDesigns.length === 0 && (
                <p className="hgr-d-empty-hint">
                  No Design Ready vehicle designs yet — generate one in{" "}
                  <Link to="/the-hangar/aircraft-design">Vehicle Design Agent</Link> first, then
                  come back here to build a CAD model from it.
                </p>
              )}

                </div>
                <div className="hgr-d-lists-col">
            {cadDesignsStatus === "error" && <ListFetchError onRetry={fetchCADDesigns} />}

            {cadDesignsStatus !== "error" &&
              cadDesigns &&
              cadDesigns.length > 0 && (
                <ListPanel
                  title={`Your CAD designs (${cadDesigns.length})`}
                  expanded={cadDesignsExpanded}
                  onToggleExpanded={() => {
                    setCADDesignsExpanded(!cadDesignsExpanded);
                    setDesignsExpanded(false);
                  }}
                >
                  {cadDesigns.map((d) => (
                    <button
                      key={d.cadDesignId}
                      type="button"
                      className="hgr-d-list-row"
                      onClick={() => {
                        setSelectedCADDesign(d);
                        setCADDesignsExpanded(false);
                      }}
                    >
                      <span className="hgr-d-list-row-code">{d.cadCode}</span>
                      <span className="hgr-d-list-row-type">
                        {d.bom ? `${d.bom.length} BOM entries` : "—"}
                      </span>
                      <span className={`hgr-d-list-row-status hgr-d-list-row-status-${d.status}`}>
                        {CAD_DESIGN_STATUS_LABEL[d.status] ?? d.status}
                      </span>
                      <MockSourceBadge show={d.sourceWasMock === true} compact />
                      <span className="hgr-d-list-row-confidence">
                        {d.confidenceScore !== null
                          ? `${Math.round(d.confidenceScore * 100)}%`
                          : "—"}
                      </span>
                      <span className="hgr-d-list-row-date">
                        {new Date(d.createdAt).toLocaleDateString()}
                      </span>
                    </button>
                  ))}
                </ListPanel>
              )}
                </div>
              </div>
            )}

            {selectedCADDesign ? (
              <PastCADDesignDetail
                design={selectedCADDesign}
                onBack={() => setSelectedCADDesign(null)}
              />
            ) : (
              (!isIdle || planExpanded) && (
                <div>
                  {flow.status !== "complete" && (
                    <div className="hgr-d-process-grid">
                      {selectedAircraftDesign ? (
                        <div className="hgr-d-selected-spec">
                          <span className="hgr-d-selected-spec-label">Generating from</span>
                          <p>
                            <b>{selectedAircraftDesign.designCode}</b> —{" "}
                            {selectedAircraftDesign.geometryParameters?.vehicleClass ?? "—"}
                          </p>
                          {/* What this output is: one AI call plus rule-based
                              checks, not a CAD engine (yet). */}
                          <p className="hgr-d-status-idle">
                            One TorqWings AI call, then a deterministic validation pass (interference /
                            DFM-DFA / tolerance stack-up). There's no CAD engine (FreeCAD/OpenSCAD)
                            integration yet, so this is AI reasoning about plausible CAD data plus
                            rule-based checks, not a simulated engineering result.
                          </p>
                          {flow.status === "running" ? (
                            <div className="hgr-d-running" role="status">
                              <span className="hgr-d-status-spinner" />
                              Generating the CAD model -- one TorqWings AI call, usually a few seconds…
                            </div>
                          ) : (
                            <div className="hgr-d-btn-row">
                              <button
                                type="button"
                                className="hgr-d-btn hgr-d-btn-amber"
                                onClick={generateCADModel}
                              >
                                Generate CAD Model →
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="hgr-d-status-idle">
                          Select a Design Ready vehicle design above to begin generating a CAD model.
                        </p>
                      )}
                      {flow.status === "error" && (
                        <StageErrorCard
                          title="Couldn't complete Model Generation."
                          message={flow.errorMessage}
                          onRetry={generateCADModel}
                        />
                      )}
                    </div>
                  )}

                  {flow.status === "complete" && flow.result && (
                    <CADResultView result={flow.result} onStartNew={resetFlow} />
                  )}
                </div>
              )
            )}
          </div>
        </section>
      </main>

      <DesignGuidanceFooter />
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
    <div className="hgr-d-collapsible" style={{ marginBottom: 20 }}>
      <button
        type="button"
        className="hgr-d-collapsible-title"
        onClick={onToggleExpanded}
        aria-expanded={expanded}
      >
        <span>{title}</span>
        <span className={`hgr-d-arrow${expanded ? " hgr-d-arrow-open" : ""}`}>▸</span>
      </button>
      {expanded && <div className="hgr-d-list">{children}</div>}
    </div>
  );
}

// This bay launches with the list-fetch-error gap already closed —
// consistent with every prior bay page, not a Bay-04-only fix.
function ListFetchError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="hgr-d-list-fetch-error">
      <p>Couldn't load this list — check your connection and try again.</p>
      <button type="button" className="hgr-d-btn hgr-d-btn-ghost" onClick={onRetry}>
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
    <div className="hgr-d-error">
      <b>{title}</b>
      <p>{message}</p>
      <button type="button" className="hgr-d-btn hgr-d-btn-ghost" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}

// Same durable-badge convention as Bay 03's MockSourceBadge — fed from
// Hangar_CADDesign_specs.source_was_mock directly, shown everywhere a
// design is ever displayed (live result, list row, past-design view), not
// just during the run that produced it.
function MockSourceBadge({ show, compact }: { show: boolean; compact?: boolean }) {
  if (!show) return null;
  return (
    <span className={`hgr-d-mock-badge${compact ? " hgr-d-mock-badge-compact" : ""}`}>
      ⚠ Source vehicle design was mock-generated
    </span>
  );
}

function ModelFilesFields({ modelFiles }: { modelFiles: CADModelFiles }) {
  return (
    <div className="hgr-d-dash-fields">
      <DashField label="STEP" value={modelFiles.step || "—"} />
      <DashField label="IGES" value={modelFiles.iges || "—"} />
    </div>
  );
}

function MassPropertiesFields({ massProperties }: { massProperties: MassProperties }) {
  return (
    <div className="hgr-d-dash-fields">
      <DashField label="Weight" value={`${massProperties.weightKg} kg`} />
      <DashField
        label="Center of gravity"
        value={`(${massProperties.cg.x}, ${massProperties.cg.y}, ${massProperties.cg.z})`}
      />
    </div>
  );
}

function DashField({ label, value }: { label: string; value: string }) {
  return (
    <div className="hgr-d-dash-field">
      <div className="hgr-d-dash-field-label">{label}</div>
      <div className="hgr-d-dash-field-value">{value}</div>
    </div>
  );
}

function BomTable({ bom }: { bom: BomEntry[] }) {
  if (bom.length === 0) {
    return <p className="hgr-d-dash-empty">No BOM entries were generated.</p>;
  }
  return (
    <div className="hgr-d-bom-table">
      <div className="hgr-d-bom-row hgr-d-bom-header">
        <span>Part</span>
        <span>Qty</span>
        <span>Material</span>
      </div>
      {bom.map((entry, i) => (
        <div key={i} className="hgr-d-bom-row">
          <span>{entry.part}</span>
          <span>{entry.qty}</span>
          <span>{entry.material || "—"}</span>
        </div>
      ))}
    </div>
  );
}

function ValidationSummary({
  interferenceClear,
  dfmFlags,
}: {
  interferenceClear: boolean;
  dfmFlags: string[];
}) {
  return (
    <div>
      <div
        className={`hgr-d-interference-badge${interferenceClear ? "" : " hgr-d-interference-flagged"}`}
      >
        {interferenceClear ? "Interference clear" : "Interference flagged"}
      </div>
      {dfmFlags.length > 0 ? (
        <ul className="hgr-d-dfm-list">
          {dfmFlags.map((flag, i) => (
            <li key={i}>{flag}</li>
          ))}
        </ul>
      ) : (
        <p className="hgr-d-dash-empty">No DFM/DFA flags.</p>
      )}
    </div>
  );
}

// Live result view, shown immediately after Stage 1 completes. No Save-as-
// final / Edit-and-regenerate — finalizeCADDesign doesn't exist yet (only
// Stage 1 is built), same reasoning as Bay 03's own GeometryResultView.
function CADResultView({ result, onStartNew }: { result: Stage1Result; onStartNew: () => void }) {
  return (
    <div className="hgr-d-dash">
      <div className="hgr-d-dash-header">
        <div>
          <div className="hgr-d-dash-badge">Spec Ready</div>
          <h3>{result.cadCode}</h3>
          <MockSourceBadge show={result.sourceWasMock} />
        </div>
        <div className="hgr-d-dash-confidence">
          <div className="hgr-d-dash-confidence-num">
            {Math.round(result.confidenceScore * 100)}%
          </div>
          <div className="hgr-d-dash-confidence-label">Confidence</div>
          <Link
            to="/the-hangar/bernoulli"
            search={{ source: "cad", missionId: "", sourceId: result.cadDesignId }}
            className="hgr-d-dash-bernoulli-link"
            title="Sanity-check this design's origin mission spec against conservation laws and aerospace empiricals."
          >
            Ask Bernoulli →
          </Link>
        </div>
      </div>

      <div className="hgr-d-dash-section">
        <h4>Model Files</h4>
        <ModelFilesFields modelFiles={result.modelFiles} />
      </div>

      <div className="hgr-d-dash-section">
        <h4>Bill of Materials ({result.bom.length})</h4>
        <BomTable bom={result.bom} />
      </div>

      <div className="hgr-d-dash-section">
        <h4>Mass Properties</h4>
        <MassPropertiesFields massProperties={result.massProperties} />
      </div>

      <div className="hgr-d-dash-section">
        <h4>Validation</h4>
        <ValidationSummary
          interferenceClear={result.interferenceClear}
          dfmFlags={result.dfmFlags}
        />
      </div>

      <div className="hgr-d-dash-section">
        <h4>Design Rationale</h4>
        <p className="hgr-d-dash-rationale">{result.designRationale}</p>
      </div>

      <div className="hgr-d-dash-actions">
        <button
          type="button"
          className="hgr-d-btn hgr-d-btn-ghost"
          disabled
          title="Bay 05 not yet built"
        >
          Continue to Simulation Orchestrator →
        </button>
        <button type="button" className="hgr-d-btn hgr-d-btn-amber" onClick={onStartNew}>
          Start a new CAD model
        </button>
      </div>
    </div>
  );
}

// Read-only view of a past design, opened from "Your CAD designs" — reuses
// the same field/table components so a historical design looks the same as
// one just generated. No actions besides going back, same reasoning as
// Bay 03's own PastDesignDetail.
function PastCADDesignDetail({
  design,
  onBack,
}: {
  design: CADDesignListEntry;
  onBack: () => void;
}) {
  const hasSpec = design.modelFiles !== null;
  return (
    <div className="hgr-d-dash">
      <div className="hgr-d-dash-header">
        <div>
          <div className="hgr-d-dash-badge">
            {CAD_DESIGN_STATUS_LABEL[design.status] ?? design.status}
          </div>
          <h3>{design.cadCode}</h3>
          <MockSourceBadge show={design.sourceWasMock === true} />
        </div>
        {design.confidenceScore !== null && (
          <div className="hgr-d-dash-confidence">
            <div className="hgr-d-dash-confidence-num">
              {Math.round(design.confidenceScore * 100)}%
            </div>
            <div className="hgr-d-dash-confidence-label">Confidence</div>
            {hasSpec && (
              <Link
                to="/the-hangar/bernoulli"
                search={{ source: "cad", missionId: "", sourceId: design.cadDesignId }}
                className="hgr-d-dash-bernoulli-link"
                title="Sanity-check this design's origin mission spec against conservation laws and aerospace empiricals."
              >
                Ask Bernoulli →
              </Link>
            )}
          </div>
        )}
      </div>
      {hasSpec ? (
        <>
          <div className="hgr-d-dash-section">
            <h4>Model Files</h4>
            <ModelFilesFields modelFiles={design.modelFiles!} />
          </div>
          <div className="hgr-d-dash-section">
            <h4>Bill of Materials ({design.bom?.length ?? 0})</h4>
            <BomTable bom={design.bom ?? []} />
          </div>
          <div className="hgr-d-dash-section">
            <h4>Mass Properties</h4>
            <MassPropertiesFields massProperties={design.massProperties!} />
          </div>
          <div className="hgr-d-dash-section">
            <h4>Validation</h4>
            <ValidationSummary
              interferenceClear={design.interferenceClear === true}
              dfmFlags={design.dfmFlags ?? []}
            />
          </div>
          <div className="hgr-d-dash-section">
            <h4>Design Rationale</h4>
            <p className="hgr-d-dash-rationale">{design.designRationale}</p>
          </div>
        </>
      ) : (
        <div className="hgr-d-dash-section">
          <p className="hgr-d-dash-empty">
            No spec was generated for this design — its status is "
            {CAD_DESIGN_STATUS_LABEL[design.status] ?? design.status}".
          </p>
        </div>
      )}
      <div className="hgr-d-dash-actions">
        <button type="button" className="hgr-d-btn hgr-d-btn-ghost" onClick={onBack}>
          ← Back to Your CAD designs
        </button>
      </div>
    </div>
  );
}

const HGR_CAD_DESIGN_CSS = `
.hgr-d{
  /* Same light theme as Bay 03 (the-hangar.aircraft-design.tsx) and the
     /the-hangar/agents page: white page, blue grid, light panels, dark
     text, amber-bright darkened since it's only used as text. */
  --hgr-d-navy-deep:#FFFFFF; --hgr-d-navy-panel:#F2F7FB; --hgr-d-navy-panel-2:#E4EEF7;
  --hgr-d-blue-line:#3E7CA6; --hgr-d-blue-bright:#1C74B8;
  --hgr-d-amber:#E8A33D; --hgr-d-amber-bright:#B4690E;
  --hgr-d-paper:#12222F; --hgr-d-paper-dim:#4F6B80; --hgr-d-ink:#0A1826;
  --hgr-d-green:#2E8B57; --hgr-d-red:#C0392B;
  --hgr-d-bernoulli:#7A5BD6; --hgr-d-bernoulli-bright:#6A4BC4;
  --hgr-d-grid:rgba(62,124,166,0.14); --hgr-d-hairline:rgba(62,124,166,0.28);

  background:var(--hgr-d-navy-deep); color:var(--hgr-d-paper); font-family:'IBM Plex Sans', sans-serif;
  background-image:linear-gradient(var(--hgr-d-grid) 1px, transparent 1px), linear-gradient(90deg, var(--hgr-d-grid) 1px, transparent 1px);
  background-size:44px 44px;
  min-height:100vh;
}
.hgr-d *{ box-sizing:border-box; }
.hgr-d h1,.hgr-d h2,.hgr-d h3{ font-family:'Space Grotesk', sans-serif; font-weight:600; letter-spacing:-0.01em; margin:0; }
.hgr-d-mono{ font-family:'IBM Plex Mono', monospace; }
.hgr-d-wrap{ max-width:1180px; margin:0 auto; padding:0 32px; }
.hgr-d a{ color:inherit; }

.hgr-d nav{ border-bottom:1px solid var(--hgr-d-hairline); position:sticky; top:0; background:rgba(10,24,38,0.92); backdrop-filter:blur(10px); z-index:20;
  /* Dark nav strip on the light page, same as Bay 03 and the agents page. */
  color:var(--hgr-d-paper);
  --hgr-d-paper:#ECEFF3; --hgr-d-paper-dim:#8FA5BB; --hgr-d-blue-bright:#6FB4E0; --hgr-d-hairline:rgba(111,180,224,0.22); }
.hgr-d nav .hgr-d-wrap{ display:flex; align-items:center; justify-content:space-between; height:68px; }
.hgr-d-crumbs{ font-size:14px; color:var(--hgr-d-paper-dim); display:flex; align-items:center; gap:8px; }
.hgr-d-crumbs a{ text-decoration:none; color:var(--hgr-d-paper-dim); }
.hgr-d-crumbs a:hover{ color:var(--hgr-d-blue-bright); }
.hgr-d-sep{ color:var(--hgr-d-blue-line); }
.hgr-d-cur{ color:var(--hgr-d-paper); font-weight:500; }
.hgr-d-exit{ font-family:'IBM Plex Mono',monospace; font-size:12.5px; color:var(--hgr-d-paper-dim); text-decoration:none; border:1px solid var(--hgr-d-hairline); padding:8px 15px; border-radius:2px; }
.hgr-d-exit:hover{ color:var(--hgr-d-paper); border-color:var(--hgr-d-blue-bright); }

.hgr-d main{ padding-bottom:100px; }
.hgr-d-hero{ padding:56px 0 20px; border-bottom:1px solid var(--hgr-d-blue-line); position:relative; overflow:hidden; }
.hgr-d-doors{ position:absolute; inset:0; z-index:5; display:flex; pointer-events:none; }
.hgr-d-door{ flex:1; background: repeating-linear-gradient(90deg, #0C1E30 0 78px, #08131F 78px 80px); position:relative; }
.hgr-d-door::after{ content:""; position:absolute; top:0; bottom:0; width:2px; background:var(--hgr-d-blue-line); opacity:.5; }
.hgr-d-door-left{ animation: hgr-d-openLeft 1.4s cubic-bezier(.77,0,.18,1) .3s forwards; }
.hgr-d-door-right{ animation: hgr-d-openRight 1.4s cubic-bezier(.77,0,.18,1) .3s forwards; }
.hgr-d-door-left::after{ right:0; }
.hgr-d-door-right::after{ left:0; }
@keyframes hgr-d-openLeft{ from{ transform:translateX(0);} to{ transform:translateX(-100%);} }
@keyframes hgr-d-openRight{ from{ transform:translateX(0);} to{ transform:translateX(100%);} }
@media (prefers-reduced-motion: reduce){ .hgr-d-doors{ display:none; } }
.hgr-d-status-row{ display:flex; align-items:center; gap:12px; margin-bottom:22px; flex-wrap:wrap; }
.hgr-d-badge{ font-family:'IBM Plex Mono',monospace; font-size:11.5px; letter-spacing:.1em; text-transform:uppercase; padding:6px 13px; border-radius:2px; display:inline-flex; align-items:center; gap:8px; }
.hgr-d-badge-bay{ color:var(--hgr-d-paper); font-weight:700; border:1px solid var(--hgr-d-blue-line); background:var(--hgr-d-navy-panel-2); }
.hgr-d-badge-ai{ font-weight:700; }
.hgr-d-badge-ai-dot{ width:7px; height:7px; border-radius:50%; flex-shrink:0; }
.hgr-d-badge-ai-checking{ color:var(--hgr-d-paper); border:1px solid var(--hgr-d-blue-line); background:var(--hgr-d-navy-panel-2); }
.hgr-d-badge-ai-checking .hgr-d-badge-ai-dot{ background:var(--hgr-d-paper-dim); }
.hgr-d-badge-ai-live{ color:#166534; border:1px solid #16A34A; background:#DCFCE7; }
.hgr-d-badge-ai-live .hgr-d-badge-ai-dot{ background:#16A34A; box-shadow:0 0 6px rgba(22,163,74,.7); animation:hgr-d-ai-pulse 2s ease-in-out infinite; }
.hgr-d-badge-ai-offline{ color:var(--hgr-d-amber-bright); border:1px solid var(--hgr-d-amber); background:#FDF3E3; }
.hgr-d-badge-ai-offline .hgr-d-badge-ai-dot{ background:var(--hgr-d-amber); box-shadow:0 0 6px rgba(232,163,61,.6); }
.hgr-d-badge-ai-model{ display:inline-flex; align-items:center; gap:3px; margin-left:6px; padding-left:6px; border-left:1px solid rgba(22,101,52,.35); font-weight:600; }
.hgr-d-badge-ai-model-fallback{ border-left-color:rgba(180,105,14,.4); color:var(--hgr-d-amber-bright); }
@keyframes hgr-d-ai-pulse{ 0%,100%{ opacity:1; } 50%{ opacity:.4; } }
.hgr-d-hero-row{ display:flex; align-items:center; gap:48px; flex-wrap:wrap; }
@media(max-width:760px){ .hgr-d-hero-row{ flex-direction:column; align-items:flex-start; gap:16px; } }
.hgr-d-hero h1{ font-size:clamp(34px,5vw,58px); margin:0; flex-shrink:0; }
.hgr-d-hero .hgr-d-lead{ color:var(--hgr-d-paper-dim); font-size:15.5px; max-width:480px; line-height:1.6; margin:0; flex:1; min-width:280px; }
.hgr-d-hero .hgr-d-lead b{ color:var(--hgr-d-paper); font-weight:600; }

.hgr-d section{ padding:60px 0; }
#generate-cad-model{ padding-top:32px; }
.hgr-d-empty-hint{ color:var(--hgr-d-paper-dim); font-size:13.5px; margin-bottom:24px; }
.hgr-d-empty-hint a{ color:var(--hgr-d-blue-bright); }

.hgr-d-btn{ font-family:'IBM Plex Mono',monospace; font-size:13px; padding:12px 22px; border-radius:2px; display:inline-flex; align-items:center; gap:8px; text-decoration:none; border:1px solid transparent; cursor:pointer; background:none; }
.hgr-d-btn-ghost{ border:1px solid var(--hgr-d-hairline); color:var(--hgr-d-paper-dim); }
.hgr-d-btn-ghost:hover{ color:var(--hgr-d-paper); border-color:var(--hgr-d-blue-bright); }
.hgr-d-btn-amber{ background:var(--hgr-d-amber); color:var(--hgr-d-ink); font-weight:600; }
.hgr-d-btn-amber:hover{ background:#F6C374; }
.hgr-d-btn:disabled{ opacity:.4; cursor:not-allowed; }
.hgr-d-btn:disabled:hover{ color:var(--hgr-d-paper-dim); border-color:var(--hgr-d-hairline); }
.hgr-d-btn-row{ display:flex; gap:12px; flex-wrap:wrap; }

/* ── Collapsible list panels ── */
.hgr-d-collapsible{ border:1px solid var(--hgr-d-hairline); background:var(--hgr-d-navy-panel); border-radius:2px; margin-bottom:32px; }
.hgr-d-collapsible-title{ display:flex; align-items:center; justify-content:space-between; width:100%; font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.08em; text-transform:uppercase; font-weight:700; color:var(--hgr-d-paper); padding:14px 18px; border:none; background:var(--hgr-d-navy-panel-2); border-left:3px solid var(--hgr-d-blue-bright); cursor:pointer; }
.hgr-d-collapsible-title:hover{ color:var(--hgr-d-blue-bright); }
.hgr-d-arrow{ display:inline-block; font-size:11px; transition:transform .15s; }
.hgr-d-arrow-open{ transform:rotate(90deg); }
.hgr-d-list{ max-height:260px; overflow-y:auto; border-top:1px solid var(--hgr-d-hairline); }
.hgr-d-list-row{ display:grid; grid-template-columns:1.2fr 1.6fr 0.7fr auto 0.7fr 1fr; align-items:center; gap:10px; width:100%; padding:12px 18px; border:none; border-bottom:1px dashed var(--hgr-d-hairline); background:none; cursor:pointer; text-align:left; font-family:'IBM Plex Sans',sans-serif; transition:background .15s; }
.hgr-d-list-row:last-child{ border-bottom:none; }
.hgr-d-list-row:hover{ background:rgba(111,180,224,.07); }
@media(max-width:820px){ .hgr-d-list-row{ grid-template-columns:1fr 1fr; row-gap:4px; } }
.hgr-d-list-row-code{ font-family:'IBM Plex Mono',monospace; font-size:11.5px; color:var(--hgr-d-blue-bright); }
.hgr-d-list-row-type{ font-size:13px; color:var(--hgr-d-paper); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.hgr-d-list-row-status{ font-family:'IBM Plex Mono',monospace; font-size:10px; letter-spacing:.05em; text-transform:uppercase; color:var(--hgr-d-paper-dim); border:1px solid var(--hgr-d-hairline); padding:3px 8px; border-radius:2px; justify-self:start; white-space:nowrap; }
.hgr-d-list-row-status-spec_ready{ color:var(--hgr-d-blue-bright); border-color:rgba(111,180,224,.4); }
.hgr-d-list-row-status-finalized{ color:var(--hgr-d-amber-bright); border-color:rgba(232,163,61,.4); }
.hgr-d-list-row-status-error{ color:var(--hgr-d-amber); border-color:rgba(232,163,61,.4); }
.hgr-d-list-row-confidence{ font-family:'IBM Plex Mono',monospace; font-size:12.5px; color:var(--hgr-d-paper-dim); }
.hgr-d-list-row-date{ font-family:'IBM Plex Mono',monospace; font-size:11.5px; color:var(--hgr-d-paper-dim); text-align:right; }

/* ── Side-by-side lists (as on Bay 03) ── */
.hgr-d-lists{ display:grid; grid-template-columns:1fr 1fr; gap:20px; align-items:start; margin-bottom:12px; }
@media(max-width:900px){ .hgr-d-lists{ grid-template-columns:1fr; } }
.hgr-d-lists-col{ min-width:0; }
/* Half-width columns: rows wrap instead of squeezing six fixed columns. */
.hgr-d-lists .hgr-d-list-row{ display:flex; flex-wrap:wrap; align-items:center; gap:6px 12px; }
.hgr-d-lists .hgr-d-list-row-type{ flex:1 1 140px; }
.hgr-d-lists .hgr-d-list-row-date{ margin-left:auto; }
.hgr-d-running{ display:flex; align-items:center; gap:10px; font-size:13px; font-weight:600; color:var(--hgr-d-paper); }

/* ── List-fetch error ── */
.hgr-d-list-fetch-error{ display:flex; align-items:center; justify-content:space-between; gap:16px; padding:14px 18px; margin-bottom:20px; border:1px solid rgba(232,163,61,.4); background:rgba(232,163,61,.08); border-radius:2px; }
.hgr-d-list-fetch-error p{ margin:0; color:var(--hgr-d-paper-dim); font-size:13.5px; }

/* ── Selected design + running state ── */
.hgr-d-process-grid{ display:block; min-width:0; }
.hgr-d-selected-spec{ padding:14px 16px; border:1px solid rgba(111,180,224,.3); border-left:3px solid var(--hgr-d-blue-bright); background:rgba(111,180,224,.09); border-radius:2px; margin-bottom:20px; }
.hgr-d-selected-spec-label{ display:block; font-family:'IBM Plex Mono',monospace; font-size:11px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:var(--hgr-d-blue-bright); margin-bottom:8px; }
.hgr-d-selected-spec p{ margin:0 0 14px; font-size:14px; color:var(--hgr-d-paper); line-height:1.6; }
.hgr-d-selected-spec p.hgr-d-status-idle{ font-size:13px; color:var(--hgr-d-paper-dim); }
.hgr-d-status-idle{ color:var(--hgr-d-paper-dim); font-size:13px; line-height:1.6; margin:0; }
.hgr-d-status-spinner{ width:13px; height:13px; border-radius:50%; border:2px solid var(--hgr-d-hairline); border-top-color:var(--hgr-d-amber); animation:hgr-d-spin 0.8s linear infinite; flex-shrink:0; }

/* ── Mock source badge (durable, matches Bay 03's convention) ── */
.hgr-d-mock-badge{ display:inline-flex; font-family:'IBM Plex Mono',monospace; font-size:10.5px; letter-spacing:.03em; color:var(--hgr-d-amber-bright); border:1px solid rgba(232,163,61,.4); background:rgba(232,163,61,.08); padding:4px 9px; border-radius:2px; margin-top:8px; }
.hgr-d-mock-badge-compact{ margin-top:0; font-size:9.5px; padding:2px 7px; justify-self:start; }

/* ── Error ── */
@keyframes hgr-d-spin{ to{ transform:rotate(360deg); } }
.hgr-d-error{ border:1px solid rgba(232,163,61,.4); background:rgba(232,163,61,.08); border-radius:2px; padding:20px 22px; max-width:640px; margin-top:20px; }
.hgr-d-error b{ color:var(--hgr-d-amber-bright); display:block; margin-bottom:6px; font-size:14px; }
.hgr-d-error p{ color:var(--hgr-d-paper-dim); font-size:13.5px; margin:0 0 16px; line-height:1.6; }

/* ── Dashboard / result views ── */
.hgr-d-dash{ border:1px solid var(--hgr-d-hairline); background:var(--hgr-d-navy-panel); }
.hgr-d-dash-header{ display:flex; align-items:flex-start; justify-content:space-between; gap:24px; padding:26px 28px; border-bottom:1px solid var(--hgr-d-hairline); flex-wrap:wrap; }
.hgr-d-dash-badge{ display:inline-block; font-family:'IBM Plex Mono',monospace; font-size:10.5px; letter-spacing:.08em; text-transform:uppercase; color:var(--hgr-d-blue-bright); border:1px solid rgba(111,180,224,.4); padding:4px 10px; border-radius:2px; margin-bottom:10px; }
.hgr-d-dash-header h3{ font-size:20px; margin-bottom:6px; }
.hgr-d-dash-confidence{ text-align:center; flex-shrink:0; }
.hgr-d-dash-confidence-num{ font-family:'Space Grotesk',sans-serif; font-size:32px; font-weight:700; color:var(--hgr-d-amber-bright); line-height:1; }
.hgr-d-dash-confidence-label{ font-family:'IBM Plex Mono',monospace; font-size:10px; letter-spacing:.08em; text-transform:uppercase; color:var(--hgr-d-paper-dim); }
/* Same "Ask Bernoulli" button as Bay 01/02/03. */
.hgr-d-dash-bernoulli-link{
  display:inline-flex; align-items:center; gap:6px; margin-top:10px; font-family:'IBM Plex Mono',monospace;
  font-size:12.5px; font-weight:700; color:#FFFFFF; text-decoration:none;
  background:var(--hgr-d-bernoulli); border:1px solid var(--hgr-d-bernoulli); border-radius:2px;
  padding:9px 16px; white-space:nowrap; box-shadow:0 0 10px rgba(122,91,214,.35);
  transition:background .2s, box-shadow .2s;
}
.hgr-d-dash-bernoulli-link:hover{ background:var(--hgr-d-bernoulli-bright); border-color:var(--hgr-d-bernoulli-bright); }
.hgr-d-dash-section{ padding:24px 28px; border-bottom:1px solid var(--hgr-d-hairline); }
.hgr-d-dash-section:last-of-type{ border-bottom:none; }
.hgr-d-dash-section h4{ font-family:'Space Grotesk',sans-serif; font-size:14.5px; font-weight:600; margin-bottom:16px; }
.hgr-d-dash-empty{ color:var(--hgr-d-paper-dim); font-size:13px; margin:0; }
.hgr-d-dash-rationale{ color:var(--hgr-d-paper); font-size:14px; line-height:1.7; margin:0; }
.hgr-d-dash-actions{ display:flex; flex-wrap:wrap; gap:12px; padding:24px 28px; }
.hgr-d-dash-fields{ display:grid; grid-template-columns:repeat(3,1fr); gap:20px; }
@media(max-width:700px){ .hgr-d-dash-fields{ grid-template-columns:1fr 1fr; } }
.hgr-d-dash-field-label{ font-family:'IBM Plex Mono',monospace; font-size:10.5px; letter-spacing:.06em; text-transform:uppercase; color:var(--hgr-d-paper-dim); margin-bottom:6px; }
.hgr-d-dash-field-value{ font-size:14px; }

/* ── BOM table ── */
.hgr-d-bom-table{ display:flex; flex-direction:column; border:1px solid var(--hgr-d-hairline); border-radius:2px; overflow:hidden; background:var(--hgr-d-navy-deep); }
.hgr-d-bom-row{ display:grid; grid-template-columns:2fr 0.6fr 1.4fr; gap:12px; padding:10px 14px; font-size:13px; border-bottom:1px dashed var(--hgr-d-hairline); }
.hgr-d-bom-row:last-child{ border-bottom:none; }
.hgr-d-bom-header{ font-family:'IBM Plex Mono',monospace; font-size:10.5px; letter-spacing:.06em; text-transform:uppercase; font-weight:700; color:var(--hgr-d-paper); background:var(--hgr-d-navy-panel-2); border-bottom:1px solid var(--hgr-d-hairline); }

/* ── Validation ── */
.hgr-d-interference-badge{ display:inline-flex; font-family:'IBM Plex Mono',monospace; font-size:11px; font-weight:700; letter-spacing:.05em; text-transform:uppercase; color:#2E7D4F; border:1px solid #B9DEC8; background:#E6F4EC; padding:5px 11px; border-radius:2px; margin-bottom:12px; }
.hgr-d-interference-flagged{ color:#B03A2E; border-color:#F1C1BB; background:#FBE9E7; }
.hgr-d-dfm-list{ margin:0; padding-left:18px; color:var(--hgr-d-paper-dim); font-size:13px; line-height:1.7; }
`;
