import { useEffect, useState, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useHangarSession } from "@/lib/the-hangar/session";
import { supabase } from "@/integrations/supabase/client";
import type { ConceptListEntry } from "@/lib/the-hangar/conceptAgentPipeline";
import type { MissionListEntry } from "@/lib/the-hangar/missionAgentPipeline";
import type { AircraftDesignUsage } from "@/lib/the-hangar/aircraftDesignAgentPipeline";
import { describeInrCost, estimateCostUsd, formatCostInr } from "@/lib/the-hangar/missionUsage";
import type {
  Stage1Result,
  AircraftDesignListEntry,
} from "@/lib/the-hangar/aircraftDesignAgentPipeline";
import type {
  GeometryParameters,
  ComponentSelection,
} from "@/lib/the-hangar/aircraftDesignTypes";
import { VehicleDesignReport, type VehicleDesignOutput } from "@/components/the-hangar/VehicleDesignReport";
import { DesignGuidanceFooter } from "@/components/the-hangar/DesignGuidanceFooter";

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
  spec_ready: "Design Ready",
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
  const [llmStatus, setLlmStatus] = useState<"checking" | "live" | "offline">("checking");
  const [llmProvider, setLlmProvider] = useState<"anthropic" | "groq" | null>(null);
  // Finalized missions, so the source-concept panel can show the mission a
  // concept was built from (code, type, KPIs) without leaving the page.
  const [missions, setMissions] = useState<MissionListEntry[] | null>(null);
  // Source-concept side panel next to the design being viewed; closed again
  // on any navigation (new run, back, another design).
  const [sourcePanelOpen, setSourcePanelOpen] = useState(false);
  // Which source the side panel shows: the Bay 02 concept or the Bay 01 mission.
  const [sourcePanelKind, setSourcePanelKind] = useState<SourceKind>("concept");
  // v1's generation is archived (lib/the-hangar/archive/vehicle-design-v1).
  // Generate Design now loads the Python backend's output for the concept
  // from the TorqWings GCP server (torqwings/bay3/<concept code>/).
  const [report, setReport] = useState<DesignFilesState>({ status: "idle" });
  // Save of the design on screen: Mission -> Concept -> Design, for Bay 04.
  const [save, setSave] = useState<SaveState>({ status: "idle" });
  // Latest Bernoulli review of this concept's vehicle design (advisory --
  // it never blocks Save); "none" when it hasn't been reviewed yet.
  const [bern, setBern] = useState<BernoulliBrief | "none" | null>(null);
  const reportPreview = report.status !== "idle";

  // Clicking the open source again closes it; clicking the other switches.
  function toggleSourcePanel(kind: SourceKind) {
    if (sourcePanelOpen && sourcePanelKind === kind) {
      setSourcePanelOpen(false);
      return;
    }
    setSourcePanelKind(kind);
    setSourcePanelOpen(true);
  }

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

  useEffect(() => {
    if (!currentUserEmail) return;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return;
      try {
        const res = await fetch("/api/hangar/missions?status=finalized", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setMissions(await res.json());
      } catch {
        // the panel just shows the mission id instead
      }
    })();
  }, [currentUserEmail]);

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
    setSourcePanelOpen(false);
    setReport({ status: "idle" });
  }

  function selectFinalizedConcept(c: ConceptListEntry) {
    resetFlow();
    setSelectedConcept(c);
    setPlanExpanded(true);
    // The pick is made -- fold both lists so the Generate button is in view.
    setConceptsExpanded(false);
    setDesignsExpanded(false);
  }

  // Generate Design: run VehicleDesign.py on the GCP server for this concept
  // (it creates Bay3/<concept code>/), then load whatever it put there.
  async function generateDesign() {
    if (!selectedConcept) return;
    setReport({ status: "running" });
    setSave({ status: "idle" });
    setBern(null);
    const outcome = await callStageApi<VehicleDesignRun>("/api/hangar/vehicle-design/run", {
      conceptId: selectedConcept.conceptId,
    });
    if (!outcome.ok) {
      setReport({ status: "error", message: outcome.error });
      return;
    }
    await loadDesignFiles(outcome.data);
  }

  async function saveDesign() {
    if (!selectedConcept) return;
    setSave({ status: "saving" });
    const outcome = await callStageApi<SavedDesign>("/api/hangar/vehicle-design/save", {
      conceptId: selectedConcept.conceptId,
    });
    if (!outcome.ok) {
      setSave({ status: "error", message: outcome.error });
      return;
    }
    setSave({ status: "saved", result: outcome.data });
    fetchAircraftDesigns();
  }

  async function fetchBernoulliBrief(c: ConceptListEntry) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;
    try {
      const res = await fetch(
        `/api/hangar/bernoulli-review?missionId=${encodeURIComponent(c.sourceMissionId)}&conceptId=${encodeURIComponent(c.conceptId)}&bay=vehicle_design`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) return;
      const json = await res.json();
      setBern(json ? { verdict: json.verdict, designRef: json.designRef ?? null, reviewCode: json.reviewCode, createdAt: json.createdAt } : "none");
    } catch {
      // the verdict is a convenience; Save works without it
    }
  }

  // Reads the concept's design files (no re-run) -- also behind Reload/Retry.
  async function loadDesignFiles(run: VehicleDesignRun | null = null) {
    if (!selectedConcept) return;
    setReport({ status: "loading", run });
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    try {
      const res = await fetch(
        `/api/hangar/vehicle-design-files?conceptId=${encodeURIComponent(selectedConcept.conceptId)}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      if (json.found) {
        setReport({ status: "ready", design: json.design, markdown: json.markdown ?? "", location: json.location, run });
        fetchBernoulliBrief(selectedConcept);
      } else {
        setReport({ status: "missing", location: json.location, run });
      }
    } catch (err) {
      setReport({ status: "error", message: err instanceof Error ? err.message : String(err) });
    }
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
            <span className="hgr-a-cur">Bay 03 — Vehicle Design Agent</span>
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
              <span
                className={`hgr-a-badge hgr-a-badge-ai hgr-a-badge-ai-${llmStatus}`}
                title={
                  llmStatus === "checking"
                    ? "Checking the AI providers…"
                    : llmStatus === "live"
                      ? llmProvider === "groq"
                        ? "Live — answering via Groq (gpt-oss-120b), per the AI Providers order in Mission Hub"
                        : "Live — connected to Anthropic (Claude Sonnet 5)"
                      : "Offline — not connected to Anthropic or Groq. Geometry generation will fall back to mock output."
                }
              >
                <span className="hgr-a-badge-ai-dot" />
                AI
                {llmStatus === "live" && llmProvider === "anthropic" && (
                  <span className="hgr-a-badge-ai-model">
                    <svg viewBox="0 0 16 16" width="10" height="10" aria-hidden="true">
                      <path d="M8 0 L9.4 6.6 L16 8 L9.4 9.4 L8 16 L6.6 9.4 L0 8 L6.6 6.6 Z" fill="currentColor" />
                    </svg>
                    Claude
                  </span>
                )}
                {llmStatus === "live" && llmProvider === "groq" && (
                  <span className="hgr-a-badge-ai-model hgr-a-badge-ai-model-fallback">
                    <svg viewBox="0 0 16 16" width="10" height="10" aria-hidden="true">
                      <path d="M9 0 L2 9 L7 9 L6 16 L14 6 L9 6 Z" fill="currentColor" />
                    </svg>
                    Groq
                  </span>
                )}
              </span>
            </div>
            <div className="hgr-a-hero-row">
              <h1>Vehicle Design Agent</h1>
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

            {/* Input and output side by side: the finalized concepts a design
                can be generated from, and the designs already generated. Only
                one is open at a time. */}
            {!selectedDesign && (
              <div className="hgr-a-lists">
                <div className="hgr-a-lists-col">
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
                  onToggleExpanded={() => {
                    setConceptsExpanded(!conceptsExpanded);
                    setDesignsExpanded(false);
                  }}
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
                        {c.selectedConceptName ?? c.rankedConcepts?.[0]?.conceptName ?? "—"}
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

                </div>
                <div className="hgr-a-lists-col">
            {designsStatus === "error" && <ListFetchError onRetry={fetchAircraftDesigns} />}

            {designsStatus !== "error" && designs && designs.length > 0 && !selectedDesign && (
              <ListPanel
                title={`Your vehicle designs (${designs.length})`}
                expanded={designsExpanded}
                onToggleExpanded={() => {
                  setDesignsExpanded(!designsExpanded);
                  setConceptsExpanded(false);
                }}
              >
                {designs.map((d) => (
                  <button
                    key={d.aircraftDesignId}
                    type="button"
                    className="hgr-a-list-row"
                    onClick={() => {
                      setSelectedDesign(d);
                      setSourcePanelOpen(false);
                      setDesignsExpanded(false);
                    }}
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

                </div>
              </div>
            )}

            {selectedDesign ? (
              <>
                <RunTitle
                  code={selectedDesign.designCode}
                  title={conceptName(finalizedConcepts, selectedDesign.sourceConceptId) ?? selectedDesign.geometryParameters?.vehicleClass ?? "Vehicle design"}
                  generatedAt={selectedDesign.createdAt}
                />
                <UsageDetails usage={selectedDesign.usage} durationMs={null} />
                <SourceConceptSplit
                  open={sourcePanelOpen}
                  kind={sourcePanelKind}
                  conceptId={selectedDesign.sourceConceptId}
                  concepts={finalizedConcepts}
                  missions={missions}
                  onClose={() => setSourcePanelOpen(false)}
                >
                  <PastDesignDetail
                    design={selectedDesign}
                    concepts={finalizedConcepts}
                    missions={missions}
                    sourceOpen={sourcePanelOpen}
                    sourceKind={sourcePanelKind}
                    onToggleSource={toggleSourcePanel}
                    onBack={() => {
                      setSelectedDesign(null);
                      setSourcePanelOpen(false);
                    }}
                  />
                </SourceConceptSplit>
              </>
            ) : (
              <div>
                {(!isIdle || planExpanded) && (
                  <div>
                    {flow.status !== "complete" && (
                      <SourceConceptSplit
                        open={sourcePanelOpen && !!selectedConcept}
                        kind={sourcePanelKind}
                        conceptId={selectedConcept?.conceptId ?? null}
                        concepts={finalizedConcepts}
                        missions={missions}
                        onClose={() => setSourcePanelOpen(false)}
                      >
                      <div className="hgr-a-process-grid">
                        <div>
                          {selectedConcept ? (
                            <div className="hgr-a-selected-spec">
                              <span className="hgr-a-selected-spec-label">Generating from</span>
                              <SourceConceptTrace
                                conceptId={selectedConcept.conceptId}
                                concepts={finalizedConcepts}
                                missions={missions}
                                open={sourcePanelOpen}
                                kind={sourcePanelKind}
                                onToggle={toggleSourcePanel}
                              />
                              {flow.status === "running" && (
                                <div className="hgr-a-running" role="status">
                                  <span className="hgr-a-status-spinner" />
                                  Generating the design -- one TorqWings AI call, usually a few seconds…
                                </div>
                              )}
                              {flow.status !== "running" && !reportPreview && (
                                <div className="hgr-a-btn-row">
                                  <button
                                    type="button"
                                    className="hgr-a-btn hgr-a-btn-amber"
                                    onClick={generateDesign}
                                  >
                                    Generate Design →
                                  </button>
                                </div>
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
                          {report.status === "running" && (
                            <div className="hgr-a-running" role="status">
                              <span className="hgr-a-status-spinner" />
                              Running VehicleDesign.py on the GCP server…
                            </div>
                          )}
                          {report.status === "loading" && (
                            <div className="hgr-a-running" role="status">
                              <span className="hgr-a-status-spinner" />
                              Fetching the design files from the GCP server…
                            </div>
                          )}
                          {report.status === "missing" && (
                            <div className="hgr-a-files-note">
                              {report.run && (
                                <>
                                  ✓ VehicleDesign.py ran and {report.run.created ? "created" : "found"} the folder{" "}
                                  <code>Bay3/{report.run.conceptCode}/</code>
                                  {report.run.files.length > 0 && <> (contains {report.run.files.join(", ")})</>}.<br />
                                </>
                              )}
                              No design files for this concept yet -- expecting <b>{report.location.files.join(" and ")}</b> in{" "}
                              <code>{report.location.server}/{report.location.folder}/</code>.{" "}
                              <button type="button" className="hgr-a-link-btn" onClick={() => loadDesignFiles(report.run)}>Check again</button>
                            </div>
                          )}
                          {report.status === "error" && (
                            <StageErrorCard title="Generate Design didn't complete on the GCP server." message={report.message} onRetry={generateDesign} />
                          )}
                          {report.status === "ready" && selectedConcept && (
                            <div className="hgr-a-save-bar" role="status">
                              {save.status === "saved" ? (
                                <>
                                  <span className="hgr-a-save-ok">✓ {save.result.alreadySaved ? "Already saved" : "Saved"}</span>
                                  <span className="hgr-a-save-chain">
                                    Mission <b>{save.result.missionCode}</b> → Concept <b>{save.result.conceptCode}</b> → Design{" "}
                                    <b>{save.result.designCode}</b>
                                    <span className="hgr-a-save-src"> ({save.result.sourceDesignId})</span>
                                  </span>
                                  <Link to="/the-hangar/cad-design" className="hgr-a-btn hgr-a-btn-amber">
                                    Continue to CAD (Bay 04) →
                                  </Link>
                                </>
                              ) : (
                                <>
                                  <span className="hgr-a-save-chain">
                                    Save this design to link it <b>Mission → Concept → Design</b> and hand its JSON to CAD (Bay 04).
                                  </span>
                                  <button type="button" className="hgr-a-btn hgr-a-btn-amber" disabled={save.status === "saving"} onClick={saveDesign}>
                                    {save.status === "saving" ? "Saving…" : "Save design"}
                                  </button>
                                </>
                              )}
                              {save.status === "error" && <span className="hgr-a-save-err">{save.message}</span>}
                              <BernoulliBriefRow
                                brief={bern}
                                currentDesignId={typeof report.design.design_id === "string" ? report.design.design_id : null}
                                concept={selectedConcept}
                              />
                            </div>
                          )}
                          {report.status === "ready" && selectedConcept && (
                            <VehicleDesignReport
                              design={report.design}
                              markdown={report.markdown}
                              banner={
                                <div className="vdr-banner">
                                  Loaded from <code>{report.location.server}/{report.location.folder}/</code>
                                  {report.location.updated && <> · updated {new Date(report.location.updated).toLocaleString()}</>}.{" "}
                                  <button type="button" className="hgr-a-link-btn" onClick={() => loadDesignFiles(report.run)}>Reload</button>{" · "}
                                  <button type="button" className="hgr-a-link-btn" onClick={() => setReport({ status: "idle" })}>
                                    Close
                                  </button>
                                </div>
                              }
                            />
                          )}
                        </div>

                      </div>
                      </SourceConceptSplit>
                    )}

                    {flow.status === "complete" && flow.result && (
                      <>
                        <RunTitle
                          code={flow.result.designCode}
                          title={selectedConcept?.selectedConceptName ?? selectedConcept?.rankedConcepts?.[0]?.conceptName ?? flow.result.geometryParameters.vehicleClass}
                          generatedAt={new Date().toISOString()}
                        />
                        <UsageDetails usage={flow.result.usage} durationMs={flow.result.durationMs} />
                        <SourceConceptSplit
                          open={sourcePanelOpen}
                          kind={sourcePanelKind}
                          conceptId={selectedConcept?.conceptId ?? null}
                          concepts={finalizedConcepts}
                          missions={missions}
                          onClose={() => setSourcePanelOpen(false)}
                        >
                          <GeometryResultView
                            result={flow.result}
                            sourceMissionId={selectedConcept?.sourceMissionId ?? null}
                            sourceConceptId={selectedConcept?.conceptId ?? null}
                            concepts={finalizedConcepts}
                            missions={missions}
                            sourceOpen={sourcePanelOpen}
                            sourceKind={sourcePanelKind}
                            onToggleSource={toggleSourcePanel}
                            onStartNew={resetFlow}
                          />
                        </SourceConceptSplit>
                      </>
                    )}
                  </div>
                )}
              </div>
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
  children: ReactNode;
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

// The concept a run carries forward: the user's saved choice in Bay 02, or
// its rank-1 concept by default.
function rankedName(c: ConceptListEntry): string | null {
  return c.rankedConcepts?.find((r) => r.rank === 1)?.conceptName ?? c.rankedConcepts?.[0]?.conceptName ?? null;
}
function chosenRanked(c: ConceptListEntry) {
  const name = c.selectedConceptName ?? rankedName(c);
  return c.rankedConcepts?.find((r) => r.conceptName === name) ?? null;
}

function conceptName(concepts: ConceptListEntry[] | null, conceptId: string): string | null {
  const c = concepts?.find((x) => x.conceptId === conceptId);
  return c?.selectedConceptName ?? c?.rankedConcepts?.[0]?.conceptName ?? null;
}

// A finished design's title: its code and its source concept's name, with
// the generated date -- in place of the old in-card heading, same layout as
// Bay 01/02.
function RunTitle({ code, title, generatedAt }: { code: string; title: string; generatedAt: string | null }) {
  return (
    <div className="hgr-a-run-title">
      <span className="hgr-a-run-title-code">{code}</span>
      <h3>{title}</h3>
      {generatedAt && (
        <span className="hgr-a-run-title-date">
          Generated {new Date(generatedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
        </span>
      )}
    </div>
  );
}

// Collapsible "Requests & tokens", closed by default with the totals in its
// header -- same section Bay 01/02 show. Bay 03 has one stage, one AI call.
function UsageDetails({ usage, durationMs }: { usage: AircraftDesignUsage | null; durationMs: number | null }) {
  const input = usage?.inputTokens ?? 0;
  const output = usage?.outputTokens ?? 0;
  const requests = usage?.requests ?? 0;
  const cost = estimateCostUsd(input, output);
  return (
    <details className="hgr-a-usage-details">
      <summary title="LLM requests and tokens. Cost is an estimate in INR at a fixed USD rate, not a bill.">
        <span className="hgr-a-usage-details-label">Requests &amp; tokens</span>
        <span className="hgr-a-usage-details-totals">
          {usage ? `${requests} req · ${(input + output).toLocaleString()} tokens · ~${formatCostInr(cost)}` : "not recorded for this design"}
        </span>
      </summary>
      <div className="hgr-a-telemetry">
        <div className="hgr-a-telemetry-item">
          <span className="hgr-a-telemetry-num">{requests}</span>
          <span className="hgr-a-telemetry-label">Requests</span>
        </div>
        <div className="hgr-a-telemetry-item">
          <span className="hgr-a-telemetry-num">{input.toLocaleString()}</span>
          <span className="hgr-a-telemetry-label">Input tokens</span>
        </div>
        <div className="hgr-a-telemetry-item">
          <span className="hgr-a-telemetry-num">{output.toLocaleString()}</span>
          <span className="hgr-a-telemetry-label">Output tokens</span>
        </div>
        <div className="hgr-a-telemetry-item" title={describeInrCost(cost)}>
          <span className="hgr-a-telemetry-num">~{formatCostInr(cost)}</span>
          <span className="hgr-a-telemetry-label">Est. cost</span>
        </div>
        <div className="hgr-a-telemetry-item">
          <span className="hgr-a-telemetry-num">
            {durationMs !== null ? (durationMs < 1000 ? `${durationMs}ms` : `${(durationMs / 1000).toFixed(1)}s`) : "—"}
          </span>
          <span className="hgr-a-telemetry-label">Time taken</span>
        </div>
      </div>
      <table className="hgr-a-usage-table">
        <thead>
          <tr>
            <th>Stage</th>
            <th className="hgr-a-usage-num">Requests</th>
            <th className="hgr-a-usage-num">Tokens</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              Geometry Generation
              {usage?.provider && <span className="hgr-a-usage-provider">{usage.provider === "groq" ? "Groq" : "Claude"}</span>}
            </td>
            <td className="hgr-a-usage-num">{requests}</td>
            <td className="hgr-a-usage-num">
              {(input + output).toLocaleString()}
              {usage && (
                <span className="hgr-a-usage-split">
                  {" "}
                  in {input.toLocaleString()} · out {output.toLocaleString()}
                </span>
              )}
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={2}>Estimated cost</td>
            <td className="hgr-a-usage-num" title={describeInrCost(cost)}>
              ~{formatCostInr(cost)}
            </td>
          </tr>
        </tfoot>
      </table>
    </details>
  );
}

type SourceKind = "concept" | "mission";

interface DesignFilesLocation {
  server: string;
  folder: string;
  files: string[];
  updated?: string | null;
}

interface BernoulliBrief {
  verdict: "PASS" | "WARN" | "FAIL";
  designRef: string | null;
  reviewCode: string;
  createdAt: string;
}

// The design's latest Bernoulli review, on the Save bar. Advisory: a FAIL is
// shown loudly but never blocks Save.
function BernoulliBriefRow({ brief, currentDesignId, concept }: { brief: BernoulliBrief | "none" | null; currentDesignId: string | null; concept: ConceptListEntry }) {
  const stale = brief && brief !== "none" && brief.designRef && currentDesignId && brief.designRef !== currentDesignId;
  return (
    <span className="hgr-a-bern-row">
      {brief === null ? (
        <span className="hgr-a-save-src">Checking for a Bernoulli review…</span>
      ) : brief === "none" ? (
        <span className="hgr-a-save-src">Not reviewed by Bernoulli yet.</span>
      ) : (
        <>
          <span className={`hgr-a-bern-chip hgr-a-bern-chip-${brief.verdict}`}>Bernoulli {brief.verdict}</span>
          <span className="hgr-a-save-src">
            {brief.reviewCode} · {new Date(brief.createdAt).toLocaleString()}
            {stale ? ` · for an older design (${brief.designRef})` : ""}
            {brief.verdict === "FAIL" && !stale ? " · a hard-gate check failed -- review before handing to CAD" : ""}
          </span>
        </>
      )}
      <Link
        to="/the-hangar/bernoulli"
        search={{ source: "aircraft-design", missionId: concept.sourceMissionId, sourceId: concept.conceptId }}
        className="hgr-a-dash-bernoulli-link"
      >
        {brief && brief !== "none" && !stale ? "Open Bernoulli report →" : "Ask Bernoulli →"}
      </Link>
    </span>
  );
}

// What Save returns (api.hangar.vehicle-design.save.ts).
interface SavedDesign {
  aircraftDesignId: string;
  designCode: string;
  conceptCode: string;
  missionCode: string;
  sourceDesignId: string;
  alreadySaved: boolean;
  bernoulliVerdict: "PASS" | "WARN" | "FAIL" | null;
}

type SaveState =
  | { status: "idle" | "saving" }
  | { status: "saved"; result: SavedDesign }
  | { status: "error"; message: string };

// What VehicleDesign.py reported back (api.hangar.vehicle-design.run.ts).
interface VehicleDesignRun {
  conceptCode: string;
  folder: string;
  created: boolean;
  files: string[];
}

type DesignFilesState =
  | { status: "idle" }
  | { status: "running" }
  | { status: "loading"; run: VehicleDesignRun | null }
  | { status: "ready"; design: VehicleDesignOutput; markdown: string; location: DesignFilesLocation; run: VehicleDesignRun | null }
  | { status: "missing"; location: DesignFilesLocation; run: VehicleDesignRun | null }
  | { status: "error"; message: string };

// "Generated from concept ... · from mission ..." -- the trace back to the
// Bay 02 concept and Bay 01 mission a design was built from. Each part opens
// its own details beside the design.
function SourceConceptTrace({
  conceptId,
  concepts,
  missions,
  open,
  kind,
  onToggle,
}: {
  conceptId: string | null;
  concepts: ConceptListEntry[] | null;
  missions?: MissionListEntry[] | null;
  open: boolean;
  kind: SourceKind;
  onToggle: (kind: SourceKind) => void;
}) {
  if (!conceptId) return null;
  const c = concepts?.find((x) => x.conceptId === conceptId) ?? null;
  const m = c ? (missions?.find((x) => x.missionId === c.sourceMissionId) ?? null) : null;
  const conceptOpen = open && kind === "concept";
  const missionOpen = open && kind === "mission";
  return (
    <div className="hgr-a-source-trace-row">
      <button
        type="button"
        className={`hgr-a-source-trace${conceptOpen ? " hgr-a-source-trace-open" : ""}`}
        onClick={() => onToggle("concept")}
        aria-expanded={conceptOpen}
        title={conceptOpen ? "Hide the source concept" : "Show the source concept beside this design"}
      >
        <span className="hgr-a-source-trace-label">Generated from concept</span>
        {c ? (
          <>
            <b>{c.conceptCode}</b>
            <span>{c.selectedConceptName ?? c.rankedConcepts?.[0]?.conceptName ?? "—"}</span>
            {c.confidenceScore !== null && <span>{Math.round(c.confidenceScore * 100)}% confidence</span>}
          </>
        ) : (
          <b title={conceptId}>{conceptId.slice(0, 8)}…</b>
        )}
        <span className="hgr-a-source-trace-link">{conceptOpen ? "Hide ◂" : "View concept ▸"}</span>
      </button>
      {c && (
        <button
          type="button"
          className={`hgr-a-source-trace${missionOpen ? " hgr-a-source-trace-open" : ""}`}
          onClick={() => onToggle("mission")}
          aria-expanded={missionOpen}
          title={missionOpen ? "Hide the source mission" : "Show the source mission beside this design"}
        >
          <span className="hgr-a-source-trace-label">from mission</span>
          {m ? (
            <>
              <b>{m.missionCode}</b>
              <span>{m.missionSpecs?.missionType ?? "—"}</span>
            </>
          ) : (
            <b title={c.sourceMissionId}>{c.sourceMissionId.slice(0, 8)}…</b>
          )}
          <span className="hgr-a-source-trace-link">{missionOpen ? "Hide ◂" : "View mission ▸"}</span>
        </button>
      )}
    </div>
  );
}

// The source mission as Bay 02 shows it: brief as submitted, spec fields,
// summary, KPIs and constraints.
function SourceMissionPanel({ mission, missionId, onClose }: { mission: MissionListEntry | null; missionId: string; onClose: () => void }) {
  const f = mission?.missionSpecs;
  return (
    <aside className="hgr-a-source-panel" aria-label="Source mission">
      <div className="hgr-a-source-panel-head">
        <div>
          <div className="hgr-a-source-panel-kicker">Source mission · Bay 01</div>
          <div className="hgr-a-source-panel-code">{mission?.missionCode ?? `${missionId.slice(0, 8)}…`}</div>
          {mission?.confidenceScore != null && (
            <div className="hgr-a-source-panel-kicker">{Math.round(mission.confidenceScore * 100)}% confidence</div>
          )}
        </div>
        <button type="button" className="hgr-a-source-panel-close" onClick={onClose} aria-label="Close source mission">
          ✕
        </button>
      </div>
      {!mission ? (
        <p className="hgr-a-dash-empty">This mission isn't in your finalized missions anymore, so its details can't be shown here.</p>
      ) : (
        <>
          {mission.briefText && (
            <section className="hgr-a-source-panel-section">
              <h5>Brief as submitted</h5>
              <p className="hgr-a-source-panel-brief">{mission.briefText}</p>
            </section>
          )}
          {f && (
            <section className="hgr-a-source-panel-section">
              <h5>Mission spec</h5>
              <ul>
                {(
                  [
                    ["Domain", f.domain],
                    ["Vertical", f.vertical],
                    ["Vehicle class", f.vehicleClass],
                    ["Mission type", f.missionType],
                    ["Phase", f.phase],
                    ["Operating environment", f.operatingEnvironment],
                  ] as const
                ).map(([label, value]) => (
                  <li key={label}>
                    <span>{label}</span>
                    <b>{value || "—"}</b>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {mission.summary && (
            <section className="hgr-a-source-panel-section">
              <h5>Summary</h5>
              <p>{mission.summary}</p>
            </section>
          )}
          {mission.kpis && mission.kpis.length > 0 && (
            <section className="hgr-a-source-panel-section">
              <h5>KPIs ({mission.kpis.length})</h5>
              <ul>
                {mission.kpis.map((k) => (
                  <li key={k.name}>
                    <span>{k.name}</span>
                    <b>
                      {k.target} {k.unit}
                    </b>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {mission.constraints && mission.constraints.length > 0 && (
            <section className="hgr-a-source-panel-section">
              <h5>Constraints ({mission.constraints.length})</h5>
              <ul>
                {mission.constraints.map((k) => (
                  <li key={k.name}>
                    <span>{k.name}</span>
                    <b>{k.value}</b>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
      <Link to="/the-hangar/mission" className="hgr-a-source-panel-open">
        Open in Bay 01 →
      </Link>
    </aside>
  );
}

function SourceConceptSplit({
  open,
  kind = "concept",
  conceptId,
  concepts,
  missions,
  onClose,
  children,
}: {
  open: boolean;
  kind?: SourceKind;
  conceptId: string | null;
  concepts: ConceptListEntry[] | null;
  missions: MissionListEntry[] | null;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open || !conceptId) return <>{children}</>;
  const c = concepts?.find((x) => x.conceptId === conceptId) ?? null;
  const m = c ? (missions?.find((x) => x.missionId === c.sourceMissionId) ?? null) : null;
  if (kind === "mission" && c) {
    return (
      <div className="hgr-a-split">
        <div className="hgr-a-split-main">{children}</div>
        <SourceMissionPanel mission={m} missionId={c.sourceMissionId} onClose={onClose} />
      </div>
    );
  }
  return (
    <div className="hgr-a-split">
      <div className="hgr-a-split-main">{children}</div>
      <aside className="hgr-a-source-panel" aria-label="Source concept">
        <div className="hgr-a-source-panel-head">
          <div>
            <div className="hgr-a-source-panel-kicker">Source concept · Bay 02</div>
            <div className="hgr-a-source-panel-code">{c?.conceptCode ?? `${conceptId.slice(0, 8)}…`}</div>
          </div>
          <button type="button" className="hgr-a-source-panel-close" onClick={onClose} aria-label="Close source concept">
            ✕
          </button>
        </div>
        {!c ? (
          <p className="hgr-a-dash-empty">This concept isn't in your finalized concepts anymore, so its details can't be shown here.</p>
        ) : (
          <>
            {c.rankedConcepts && c.rankedConcepts.length > 0 && (
              <section className="hgr-a-source-panel-section">
                <h5>Ranked concepts ({c.rankedConcepts.length})</h5>
                <ul>
                  {[...c.rankedConcepts]
                    .sort((a, b) => a.rank - b.rank)
                    .map((r) => (
                      <li key={r.conceptName}>
                        <span>
                          #{r.rank} {r.conceptName}
                          {r.conceptName === (c.selectedConceptName ?? rankedName(c)) && <em> · used for this design</em>}
                        </span>
                        <b>
                          {r.constraintFit} · {r.fitScore}/10
                        </b>
                      </li>
                    ))}
                </ul>
              </section>
            )}
            {chosenRanked(c)?.description && (
              <section className="hgr-a-source-panel-section">
                <h5>Chosen concept</h5>
                <p>{chosenRanked(c)!.description}</p>
              </section>
            )}
            <section className="hgr-a-source-panel-section">
              <h5>Built from mission</h5>
              {m ? (
                <>
                  <p>
                    <b>{m.missionCode}</b> -- {m.missionSpecs?.missionType ?? "—"}
                  </p>
                  {m.kpis && m.kpis.length > 0 && (
                    <ul>
                      {m.kpis.map((k) => (
                        <li key={k.name}>
                          <span>{k.name}</span>
                          <b>
                            {k.target} {k.unit}
                          </b>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : (
                <p title={c.sourceMissionId}>{c.sourceMissionId.slice(0, 8)}…</p>
              )}
            </section>
          </>
        )}
        <Link to="/the-hangar/concept" className="hgr-a-source-panel-open">
          Open in Bay 02 →
        </Link>
      </aside>
    </div>
  );
}

// Live result view, shown immediately after Stage 1 completes. No Save-as-
// final / Edit-and-regenerate here — finalizeAircraftDesign doesn't exist
// yet (only Stage 1 is built), so this deliberately doesn't invent a
// button that would call a nonexistent endpoint.
function GeometryResultView({
  result,
  sourceMissionId,
  sourceConceptId,
  concepts,
  missions,
  sourceOpen,
  sourceKind,
  onToggleSource,
  onStartNew,
}: {
  result: Stage1Result;
  sourceMissionId: string | null;
  sourceConceptId: string | null;
  concepts: ConceptListEntry[] | null;
  missions: MissionListEntry[] | null;
  sourceOpen: boolean;
  sourceKind: SourceKind;
  onToggleSource: (kind: SourceKind) => void;
  onStartNew: () => void;
}) {
  return (
    <div className="hgr-a-dash">
      {/* Code, name and date are in the title above (RunTitle). */}
      <div className="hgr-a-dash-header">
        <div>
          <div className="hgr-a-dash-badge">Design Ready</div>
          <MockSourceBadge show={result.sourceWasMock} />
          <SourceConceptTrace conceptId={sourceConceptId} concepts={concepts} missions={missions} open={sourceOpen} kind={sourceKind} onToggle={onToggleSource} />
        </div>
        <div className="hgr-a-dash-confidence">
          <div className="hgr-a-dash-confidence-num">
            {Math.round(result.confidenceScore * 100)}%
          </div>
          <div className="hgr-a-dash-confidence-label">Confidence</div>
          {sourceMissionId && (
            <Link
              to="/the-hangar/bernoulli"
              search={{ source: "aircraft-design", missionId: sourceMissionId, sourceId: "" }}
              className="hgr-a-dash-bernoulli-link"
              title="Sanity-check this design's origin mission spec against conservation laws and aerospace empiricals."
            >
              Ask Bernoulli →
            </Link>
          )}
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
// The mission a saved design traces to: recorded on the design, else via its concept.
function missionCodeFor(design: AircraftDesignListEntry, concepts: ConceptListEntry[] | null, missions: MissionListEntry[] | null) {
  const missionId = design.sourceMissionId ?? concepts?.find((c) => c.conceptId === design.sourceConceptId)?.sourceMissionId ?? null;
  if (!missionId) return "—";
  return missions?.find((m) => m.missionId === missionId)?.missionCode ?? missionId.slice(0, 8);
}

function PastDesignDetail({
  design,
  concepts,
  missions,
  sourceOpen,
  sourceKind,
  onToggleSource,
  onBack,
}: {
  design: AircraftDesignListEntry;
  concepts: ConceptListEntry[] | null;
  missions: MissionListEntry[] | null;
  sourceOpen: boolean;
  sourceKind: SourceKind;
  onToggleSource: (kind: SourceKind) => void;
  onBack: () => void;
}) {
  const hasSpec = design.geometryParameters !== null;
  return (
    <div className="hgr-a-dash">
      {/* Code, name and date are in the title above (RunTitle). */}
      <div className="hgr-a-dash-header">
        <div>
          <div className="hgr-a-dash-badge">
            {AIRCRAFT_DESIGN_STATUS_LABEL[design.status] ?? design.status}
          </div>
          <MockSourceBadge show={design.sourceWasMock === true} />
          <SourceConceptTrace conceptId={design.sourceConceptId} concepts={concepts} missions={missions} open={sourceOpen} kind={sourceKind} onToggle={onToggleSource} />
        </div>
        {design.confidenceScore !== null && (
          <div className="hgr-a-dash-confidence">
            <div className="hgr-a-dash-confidence-num">
              {Math.round(design.confidenceScore * 100)}%
            </div>
            <div className="hgr-a-dash-confidence-label">Confidence</div>
            {hasSpec && (
              <Link
                to="/the-hangar/bernoulli"
                search={{
                  source: "aircraft-design",
                  missionId: design.sourceMissionId ?? concepts?.find((c) => c.conceptId === design.sourceConceptId)?.sourceMissionId ?? "",
                  sourceId: design.sourceConceptId,
                }}
                className="hgr-a-dash-bernoulli-link"
                title="Sanity-check this design's origin mission spec against conservation laws and aerospace empiricals."
              >
                Ask Bernoulli →
              </Link>
            )}
          </div>
        )}
      </div>
      {design.designOutput ? (
        // Saved from the Vehicle Design backend: the full report, as on Generate.
        <>
          <div className="hgr-a-save-bar">
            <span className="hgr-a-save-ok">✓ Saved</span>
            <span className="hgr-a-save-chain">
              Mission <b>{missionCodeFor(design, concepts, missions)}</b> → Concept{" "}
              <b>{concepts?.find((c) => c.conceptId === design.sourceConceptId)?.conceptCode ?? design.sourceConceptId.slice(0, 8)}</b> → Design{" "}
              <b>{design.designCode}</b>
              {design.sourceDesignId && <span className="hgr-a-save-src"> ({design.sourceDesignId})</span>}
              {design.bernoulliVerdict && (
                <span className={`hgr-a-bern-chip hgr-a-bern-chip-${design.bernoulliVerdict}`}>Bernoulli {design.bernoulliVerdict} at save</span>
              )}
            </span>
            <Link to="/the-hangar/cad-design" className="hgr-a-btn hgr-a-btn-amber">
              Continue to CAD (Bay 04) →
            </Link>
          </div>
          <VehicleDesignReport
            design={design.designOutput as unknown as VehicleDesignOutput}
            markdown={design.designMarkdown ?? ""}
            banner={design.sourceLocation ? <div className="vdr-banner">Saved copy of <code>{design.sourceLocation}</code></div> : undefined}
          />
        </>
      ) : hasSpec ? (
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
          ← Back to Your vehicle designs
        </button>
      </div>
    </div>
  );
}

const HGR_AIRCRAFT_DESIGN_CSS = `
.hgr-a{
  /* Light theme matching /the-hangar/agents -- same token swap as Bay 01/02:
     white page, blue grid, light panels, dark text, amber-bright darkened
     since it's only used as text. */
  --hgr-a-navy-deep:#FFFFFF; --hgr-a-navy-panel:#F2F7FB; --hgr-a-navy-panel-2:#E4EEF7;
  --hgr-a-blue-line:#3E7CA6; --hgr-a-blue-bright:#1C74B8;
  --hgr-a-amber:#E8A33D; --hgr-a-amber-bright:#B4690E;
  --hgr-a-paper:#12222F; --hgr-a-paper-dim:#4F6B80; --hgr-a-ink:#0A1826;
  --hgr-a-green:#2E8B57; --hgr-a-red:#C0392B;
  --hgr-a-bernoulli:#7A5BD6; --hgr-a-bernoulli-bright:#6A4BC4;
  --hgr-a-grid:rgba(62,124,166,0.14); --hgr-a-hairline:rgba(62,124,166,0.28);

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

.hgr-a nav{ border-bottom:1px solid var(--hgr-a-hairline); position:sticky; top:0; background:rgba(10,24,38,0.92); backdrop-filter:blur(10px); z-index:20;
  /* Dark nav strip on the light page, same as the agents page's nav. */
  color:var(--hgr-a-paper);
  --hgr-a-paper:#ECEFF3; --hgr-a-paper-dim:#8FA5BB; --hgr-a-blue-bright:#6FB4E0; --hgr-a-hairline:rgba(111,180,224,0.22); }
.hgr-a nav .hgr-a-wrap{ display:flex; align-items:center; justify-content:space-between; height:68px; }
.hgr-a-crumbs{ font-size:14px; color:var(--hgr-a-paper-dim); display:flex; align-items:center; gap:8px; }
.hgr-a-crumbs a{ text-decoration:none; color:var(--hgr-a-paper-dim); }
.hgr-a-crumbs a:hover{ color:var(--hgr-a-blue-bright); }
.hgr-a-sep{ color:var(--hgr-a-blue-line); }
.hgr-a-cur{ color:var(--hgr-a-paper); font-weight:500; }
.hgr-a-exit{ font-family:'IBM Plex Mono',monospace; font-size:12.5px; color:var(--hgr-a-paper-dim); text-decoration:none; border:1px solid var(--hgr-a-hairline); padding:8px 15px; border-radius:2px; }
.hgr-a-exit:hover{ color:var(--hgr-a-paper); border-color:var(--hgr-a-blue-bright); }

.hgr-a main{ padding-bottom:100px; }
.hgr-a-hero{ padding:56px 0 20px; border-bottom:1px solid var(--hgr-a-blue-line); position:relative; overflow:hidden; }
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
.hgr-a-badge-bay{ color:var(--hgr-a-paper); font-weight:700; border:1px solid var(--hgr-a-blue-line); background:var(--hgr-a-navy-panel-2); }
.hgr-a-badge-ai{ font-weight:700; }
.hgr-a-badge-ai-dot{ width:7px; height:7px; border-radius:50%; flex-shrink:0; }
.hgr-a-badge-ai-checking{ color:var(--hgr-a-paper); border:1px solid var(--hgr-a-blue-line); background:var(--hgr-a-navy-panel-2); }
.hgr-a-badge-ai-checking .hgr-a-badge-ai-dot{ background:var(--hgr-a-paper-dim); }
.hgr-a-badge-ai-live{ color:#166534; border:1px solid #16A34A; background:#DCFCE7; }
.hgr-a-badge-ai-live .hgr-a-badge-ai-dot{ background:#16A34A; box-shadow:0 0 6px rgba(22,163,74,.7); animation:hgr-a-ai-pulse 2s ease-in-out infinite; }
.hgr-a-badge-ai-offline{ color:var(--hgr-a-amber-bright); border:1px solid var(--hgr-a-amber); background:#FDF3E3; }
.hgr-a-badge-ai-offline .hgr-a-badge-ai-dot{ background:var(--hgr-a-amber); box-shadow:0 0 6px rgba(232,163,61,.6); }
.hgr-a-badge-ai-model{ display:inline-flex; align-items:center; gap:3px; margin-left:6px; padding-left:6px; border-left:1px solid rgba(22,101,52,.35); font-weight:600; }
.hgr-a-badge-ai-model-fallback{ border-left-color:rgba(180,105,14,.4); color:var(--hgr-a-amber-bright); }
@keyframes hgr-a-ai-pulse{ 0%,100%{ opacity:1; } 50%{ opacity:.4; } }
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
.hgr-a-btn-amber{ background:var(--hgr-a-amber); color:var(--hgr-a-ink); font-weight:600; }
.hgr-a-btn-amber:hover{ background:#F6C374; }
.hgr-a-btn:disabled{ opacity:.4; cursor:not-allowed; }
.hgr-a-btn:disabled:hover{ color:var(--hgr-a-paper-dim); border-color:var(--hgr-a-hairline); }

/* ── Collapsible panels ── */
.hgr-a-collapsible{ border:1px solid var(--hgr-a-hairline); background:var(--hgr-a-navy-panel); border-radius:2px; margin-bottom:32px; }
.hgr-a-collapsible-title{ display:flex; align-items:center; justify-content:space-between; width:100%; font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.08em; text-transform:uppercase; font-weight:700; color:var(--hgr-a-paper); padding:14px 18px; border:none; background:var(--hgr-a-navy-panel-2); border-left:3px solid var(--hgr-a-blue-bright); cursor:pointer; }
.hgr-a-collapsible-title:hover{ color:var(--hgr-a-blue-bright); }
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

/* ── Side-by-side lists ── */
.hgr-a-lists{ display:grid; grid-template-columns:1fr 1fr; gap:20px; align-items:start; margin-bottom:12px; }
@media(max-width:900px){ .hgr-a-lists{ grid-template-columns:1fr; } }
.hgr-a-lists-col{ min-width:0; }
/* Half-width columns: rows wrap instead of squeezing six fixed columns. */
.hgr-a-lists .hgr-a-list-row{ display:flex; flex-wrap:wrap; align-items:center; gap:6px 12px; }
.hgr-a-lists .hgr-a-list-row-type{ flex:1 1 140px; }
.hgr-a-lists .hgr-a-list-row-date{ margin-left:auto; }
.hgr-a-running{ display:flex; align-items:center; gap:10px; font-size:13px; font-weight:600; color:var(--hgr-a-paper); }

/* ── List-fetch error ── */
.hgr-a-list-fetch-error{ display:flex; align-items:center; justify-content:space-between; gap:16px; padding:14px 18px; margin-bottom:20px; border:1px solid rgba(232,163,61,.4); background:rgba(232,163,61,.08); border-radius:2px; }
.hgr-a-list-fetch-error p{ margin:0; color:var(--hgr-a-paper-dim); font-size:13.5px; }

/* ── Process grid + selected-concept / status panel ── */
.hgr-a-process-grid{ display:block; }
.hgr-a-selected-spec{ padding:14px 16px; border:1px solid rgba(111,180,224,.3); border-left:3px solid var(--hgr-a-blue-bright); background:rgba(111,180,224,.09); border-radius:2px; margin-bottom:20px; }
.hgr-a-selected-spec-label{ display:block; font-family:'IBM Plex Mono',monospace; font-size:11px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:var(--hgr-a-blue-bright); margin-bottom:8px; }
.hgr-a-selected-spec p{ margin:0 0 14px; font-size:14px; color:var(--hgr-a-paper); line-height:1.6; }

.hgr-a-status-panel{ border:1px solid var(--hgr-a-hairline); background:var(--hgr-a-navy-panel); border-radius:2px; padding:0 20px 20px; }
.hgr-a-status-panel-title{ font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.08em; text-transform:uppercase; margin:0 -20px 16px;
  font-weight:700; color:var(--hgr-a-paper); background:var(--hgr-a-navy-panel-2); line-height:1.2; padding:12px 14px;
  border-left:3px solid var(--hgr-a-blue-bright); border-top:3px solid var(--hgr-a-amber); }
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
/* Same "Ask Bernoulli" button as Bay 01/02. */
.hgr-a-dash-bernoulli-link{
  display:inline-flex; align-items:center; gap:6px; margin-top:10px; font-family:'IBM Plex Mono',monospace;
  font-size:12.5px; font-weight:700; color:#FFFFFF; text-decoration:none;
  background:var(--hgr-a-bernoulli); border:1px solid var(--hgr-a-bernoulli); border-radius:2px;
  padding:9px 16px; white-space:nowrap; box-shadow:0 0 10px rgba(122,91,214,.35);
  transition:background .2s, box-shadow .2s;
}
.hgr-a-dash-bernoulli-link:hover{ background:var(--hgr-a-bernoulli-bright); border-color:var(--hgr-a-bernoulli-bright); }

/* ── Finished design: title, Requests & tokens, source-concept trace + panel ── */
.hgr-a-run-title{ display:flex; align-items:baseline; flex-wrap:wrap; gap:6px 14px; margin-bottom:16px; padding-bottom:12px; border-bottom:1px solid var(--hgr-a-blue-line); }
.hgr-a-run-title-code{ font-family:'IBM Plex Mono',monospace; font-size:13px; font-weight:700; letter-spacing:.04em; color:var(--hgr-a-blue-bright); }
.hgr-a-run-title h3{ font-size:clamp(20px,2.4vw,26px); margin:0; color:var(--hgr-a-paper); }
.hgr-a-run-title-date{ margin-left:auto; font-family:'IBM Plex Mono',monospace; font-size:11.5px; color:var(--hgr-a-paper-dim); }
.hgr-a-usage-details{ margin:0 0 20px; border:1px solid var(--hgr-a-hairline); border-radius:2px; background:var(--hgr-a-navy-panel); }
.hgr-a-usage-details > summary{ display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; padding:11px 16px; cursor:pointer; list-style:none; background:var(--hgr-a-navy-panel-2); border-left:3px solid var(--hgr-a-blue-bright); }
.hgr-a-usage-details > summary::-webkit-details-marker{ display:none; }
.hgr-a-usage-details-label{ font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.08em; text-transform:uppercase; font-weight:700; color:var(--hgr-a-paper); }
.hgr-a-usage-details-label::before{ content:"▸ "; }
.hgr-a-usage-details[open] .hgr-a-usage-details-label::before{ content:"▾ "; }
.hgr-a-usage-details-totals{ font-family:'IBM Plex Mono',monospace; font-size:12px; color:var(--hgr-a-paper-dim); }
.hgr-a-telemetry{ display:flex; flex-wrap:wrap; gap:1px; background:var(--hgr-a-hairline); border-top:1px solid var(--hgr-a-hairline); }
.hgr-a-telemetry-item{ flex:1; min-width:110px; background:var(--hgr-a-navy-deep); padding:12px 16px; display:flex; flex-direction:column; gap:2px; }
.hgr-a-telemetry-num{ font-family:'Space Grotesk',sans-serif; font-size:17px; font-weight:600; }
.hgr-a-telemetry-label{ font-family:'IBM Plex Mono',monospace; font-size:10px; letter-spacing:.06em; text-transform:uppercase; color:var(--hgr-a-paper-dim); }
.hgr-a-usage-table{ width:100%; border-collapse:collapse; background:var(--hgr-a-navy-deep); border-top:1px solid var(--hgr-a-hairline); font-size:13px; }
.hgr-a-usage-table th, .hgr-a-usage-table td{ padding:9px 16px; text-align:left; border-bottom:1px solid var(--hgr-a-hairline); }
.hgr-a-usage-table th{ font-family:'IBM Plex Mono',monospace; font-size:10px; letter-spacing:.06em; text-transform:uppercase; color:var(--hgr-a-paper-dim); font-weight:400; }
.hgr-a-usage-table tfoot td{ border-bottom:0; font-weight:600; }
.hgr-a-usage-table .hgr-a-usage-num{ text-align:right; font-variant-numeric:tabular-nums; }
.hgr-a-usage-split{ font-family:'IBM Plex Mono',monospace; font-size:10.5px; color:var(--hgr-a-paper-dim); }
.hgr-a-usage-provider{ margin-left:8px; font-family:'IBM Plex Mono',monospace; font-size:10px; color:#166534; border:1px solid rgba(22,101,52,.35); padding:1px 5px; border-radius:2px; }
.hgr-a-save-bar{ margin:14px 0; display:flex; align-items:center; gap:12px 16px; flex-wrap:wrap; padding:12px 16px; background:var(--hgr-a-navy-panel-2); border-left:3px solid var(--hgr-a-amber); font-size:13px; }
.hgr-a-save-chain{ flex:1; min-width:240px; line-height:1.6; }
.hgr-a-save-chain b{ font-family:'IBM Plex Mono',monospace; font-size:12.5px; }
.hgr-a-save-src{ color:var(--hgr-a-paper-dim); font-family:'IBM Plex Mono',monospace; font-size:11.5px; }
.hgr-a-save-ok{ font-family:'IBM Plex Mono',monospace; font-size:12px; font-weight:700; color:var(--hgr-a-green); }
.hgr-a-bern-row{ flex-basis:100%; display:flex; align-items:center; gap:10px; flex-wrap:wrap; padding-top:8px; border-top:1px dashed var(--hgr-a-hairline); }
.hgr-a-bern-chip{ font-family:'IBM Plex Mono',monospace; font-size:11px; font-weight:700; letter-spacing:.04em; padding:3px 9px; border-radius:2px; margin-left:8px; }
.hgr-a-bern-row .hgr-a-bern-chip{ margin-left:0; }
.hgr-a-bern-chip-PASS{ color:#2E7D4F; background:#E6F4EC; border:1px solid #B9DEC8; }
.hgr-a-bern-chip-WARN{ color:#A35F00; background:#FCF1E0; border:1px solid #EFD3A6; }
.hgr-a-bern-chip-FAIL{ color:#B03A2E; background:#FBE9E7; border:1px solid #F1C1BB; }
.hgr-a-save-err{ flex-basis:100%; color:var(--hgr-a-red); font-size:12.5px; }
.hgr-a-files-note{ margin-top:14px; font-size:13px; line-height:1.6; color:var(--hgr-a-paper); background:var(--hgr-a-navy-panel-2); border-left:3px solid var(--hgr-a-amber); padding:12px 16px; }
.hgr-a-files-note code{ font-family:'IBM Plex Mono',monospace; font-size:12px; }
.hgr-a-link-btn{ background:none; border:none; padding:0; color:var(--hgr-a-blue-bright); font:inherit; text-decoration:underline; cursor:pointer; }
.hgr-a-process-grid{ min-width:0; }
.hgr-a-source-trace-row{ display:flex; flex-wrap:wrap; gap:8px; align-items:stretch; }
.hgr-a-source-panel-brief{ white-space:pre-wrap; }
.hgr-a-source-trace{ display:flex; align-items:center; flex-wrap:wrap; gap:6px 12px; width:100%; margin-top:12px; padding:8px 12px; font-family:'IBM Plex Sans',sans-serif; font-size:12.5px; text-align:left; color:var(--hgr-a-paper-dim); background:var(--hgr-a-navy-panel-2); border:1px solid transparent; border-left:3px solid var(--hgr-a-blue-bright); border-radius:2px; cursor:pointer; }
.hgr-a-source-trace:hover{ border-color:var(--hgr-a-blue-line); border-left-color:var(--hgr-a-blue-bright); }
.hgr-a-source-trace-open{ background:#FDF3E3; border-left-color:var(--hgr-a-amber); }
.hgr-a-source-trace-label{ font-family:'IBM Plex Mono',monospace; font-size:10.5px; letter-spacing:.08em; text-transform:uppercase; font-weight:700; color:var(--hgr-a-paper); }
.hgr-a-source-trace b{ font-family:'IBM Plex Mono',monospace; color:var(--hgr-a-blue-bright); }
.hgr-a-source-trace-mission{ color:var(--hgr-a-paper-dim); }
.hgr-a-source-trace-mission b{ margin-right:4px; }
.hgr-a-source-trace-link{ margin-left:auto; font-family:'IBM Plex Mono',monospace; font-size:11.5px; font-weight:700; color:var(--hgr-a-blue-bright); }
.hgr-a-split{ display:grid; grid-template-columns:minmax(0,1fr) 360px; gap:20px; align-items:start; }
.hgr-a-split-main{ min-width:0; }
@media(max-width:980px){ .hgr-a-split{ grid-template-columns:1fr; } }
.hgr-a-source-panel{ position:sticky; top:84px; max-height:calc(100vh - 100px); overflow-y:auto; background:var(--hgr-a-navy-panel); border:1px solid var(--hgr-a-hairline); border-top:3px solid var(--hgr-a-amber); border-radius:2px; padding:0 18px 18px; animation:hgr-a-panel-in .25s ease both; }
@keyframes hgr-a-panel-in{ from{ opacity:0; transform:translateX(24px); } to{ opacity:1; transform:none; } }
@media(max-width:980px){ .hgr-a-source-panel{ position:static; max-height:none; } }
.hgr-a-source-panel-head{ display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin:0 -18px 14px; padding:12px 18px; background:var(--hgr-a-navy-panel-2); border-left:3px solid var(--hgr-a-blue-bright); }
.hgr-a-source-panel-kicker{ font-family:'IBM Plex Mono',monospace; font-size:10.5px; letter-spacing:.08em; text-transform:uppercase; font-weight:700; color:var(--hgr-a-paper); }
.hgr-a-source-panel-code{ font-family:'IBM Plex Mono',monospace; font-size:13px; font-weight:700; color:var(--hgr-a-blue-bright); margin-top:4px; word-break:break-all; }
.hgr-a-source-panel-close{ background:none; border:1px solid var(--hgr-a-hairline); color:var(--hgr-a-paper-dim); width:26px; height:26px; border-radius:2px; cursor:pointer; flex-shrink:0; }
.hgr-a-source-panel-section{ border-top:1px dashed var(--hgr-a-hairline); padding:12px 0 4px; }
.hgr-a-source-panel-section:first-of-type{ border-top:none; padding-top:0; }
.hgr-a-source-panel-section h5{ margin:0 0 8px; font-family:'IBM Plex Mono',monospace; font-size:10.5px; letter-spacing:.08em; text-transform:uppercase; font-weight:700; color:var(--hgr-a-paper); }
.hgr-a-source-panel-section p{ margin:0 0 6px; font-size:12.5px; line-height:1.6; color:var(--hgr-a-paper-dim); }
.hgr-a-source-panel-section ul{ list-style:none; margin:0; padding:0; }
.hgr-a-source-panel-section li{ display:flex; justify-content:space-between; gap:10px; padding:4px 0; font-size:12.5px; color:var(--hgr-a-paper-dim); }
.hgr-a-source-panel-section li b{ color:var(--hgr-a-paper); font-weight:600; text-align:right; }
.hgr-a-source-panel-section li em{ font-style:normal; color:var(--hgr-a-amber-bright); }
.hgr-a-source-panel-open{ display:inline-block; margin-top:14px; font-family:'IBM Plex Mono',monospace; font-size:12px; font-weight:700; color:var(--hgr-a-blue-bright); text-decoration:none; }
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

.hgr-a-btn-row{ display:flex; gap:12px; flex-wrap:wrap; }
`;
