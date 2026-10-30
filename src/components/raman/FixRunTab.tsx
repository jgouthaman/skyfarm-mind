import { useCallback, useEffect, useRef, useState } from "react";
import { Brain, Play, RotateCcw, Square, StepForward, Wrench } from "lucide-react";
import { ramanApi, type EngagementBundle } from "@/lib/raman/ramanBrowserApi";
import type { RamanAgentRunRow, RamanAgentStepRow } from "@/lib/raman/ramanPersistence";
import type { RamanDesignChanges, RamanNoiseCheckResult, RamanRankedOption } from "@/lib/raman/ramanTypes";
import { DecibelGauge } from "./DecibelGauge";
import { changeLines } from "./ramanPdf";
import { Btn, Card, ErrorNote, FallbackBadge, Stat, ViaProvider, fmt, providerOfModel, signed, type AiProvider } from "./ui";

// Tab 3 -- Fix options / live agent run (spec §0.4 "Live agent run").
// The server decides every move (ramanAgentLoop.ts); this view only drives
// the run one iteration per request and plays the saved steps back at
// ~1 s each. Auto runs straight through; Step advances on Next. Step mode
// changes the viewing pace only, never the agent's decisions. Every frame
// is a real saved step.

const LEVERS: { key: "prop_diameter_in" | "blade_count" | "hover_rpm" | "rotor_spacing_m" | "arm_clearance_ratio"; label: string; unit: string }[] = [
  { key: "prop_diameter_in", label: "Propeller diameter", unit: "in" },
  { key: "blade_count", label: "Blade count", unit: "" },
  { key: "hover_rpm", label: "Hover RPM", unit: "rpm" },
  { key: "rotor_spacing_m", label: "Rotor spacing", unit: "m" },
  { key: "arm_clearance_ratio", label: "Arm clearance", unit: "× D" },
];

const FRAME_MS = 1000;

function stepLine(s: RamanAgentStepRow, baseline: RamanNoiseCheckResult): string {
  const change = changeLines(s.action ?? {}, baseline).join("; ") || "no change";
  if (!s.result) return `Iteration ${s.iteration}: ${change}. Engine rejected this change.`;
  const t = s.tradeoffs;
  return `Iteration ${s.iteration}: ${change}. Result ${fmt(s.predicted_dba)} dBA, ${fmt(-(s.delta_db ?? 0))} dB saved, ${signed(t?.added_mass_g, 0)} g${s.feasible ? "" : " (not feasible)"}.`;
}

function OptionCard({ o, recommended, onTune }: { o: RamanRankedOption; recommended: boolean; onTune: () => void }) {
  return (
    <div className="rounded-lg p-4" style={{ border: recommended ? "2px solid var(--rmn-accent)" : "1px solid var(--rmn-hair)" }}>
      <div className="flex items-center justify-between gap-2">
        <span className="rmn-mono text-xs" style={{ color: "var(--rmn-dim)" }}>Option {o.rank} · iteration {o.iteration}</span>
        {recommended && (
          <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: "var(--rmn-accent)", color: "var(--rmn-accent-ink)" }}>Recommended</span>
        )}
      </div>
      <p className="mt-1 text-sm font-medium">{o.summary}</p>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="dB saved (10 m hover)" value={fmt(o.delta_db === null ? null : -o.delta_db)} unit="dB" tone="good" />
        <Stat label="Added mass" value={signed(o.tradeoffs?.added_mass_g, 0)} unit="g" />
        <Stat label="Flight time" value={signed(o.tradeoffs?.flight_time_change_pct)} unit="%" tone={(o.tradeoffs?.flight_time_change_pct ?? 0) < 0 ? "bad" : "good"} />
        <Stat label="Effort" value={o.effort} />
      </div>
      <Btn kind="navy" className="mt-3" onClick={onTune}><Wrench className="h-4 w-4" /> Tune this in Tab 4</Btn>
    </div>
  );
}

export function FixRunTab({
  bundle,
  onChanged,
  onTune,
}: {
  bundle: EngagementBundle;
  onChanged: () => void;
  onTune: (changes: RamanDesignChanges, runId: string) => void;
}) {
  const baseline = bundle.baseline!.result as RamanNoiseCheckResult;
  const [run, setRun] = useState<RamanAgentRunRow | null>(() => bundle.runs.at(-1) ?? null);
  const [steps, setSteps] = useState<RamanAgentStepRow[]>([]);
  const [shown, setShown] = useState(0);
  const [mode, setMode] = useState<"auto" | "step">("auto");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const driving = useRef(false);
  const mounted = useRef(true);
  const [goal, setGoal] = useState({
    target_dba: String(bundle.engagement.target_dba ?? baseline.target_dba ?? ""),
    max_added_mass_g: "150",
    min_flight_time_change_pct: "-10",
    max_iterations: "8",
  });

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Drive a running run: one server iteration per request until done.
  const drive = useCallback(
    async (runId: string) => {
      if (driving.current) return;
      driving.current = true;
      setError(null);
      try {
        while (mounted.current) {
          const res = await ramanApi.stepRun(runId);
          if (!mounted.current) break;
          setRun(res.run);
          if (res.step) setSteps((prev) => (prev.some((s) => s.iteration === res.step!.iteration) ? prev : [...prev, res.step!]));
          if (res.done) {
            onChanged();
            break;
          }
        }
      } catch (err) {
        if (mounted.current) setError(err instanceof Error ? err.message : String(err));
      } finally {
        driving.current = false;
      }
    },
    [onChanged],
  );

  // Load saved steps for the latest run; resume driving if it's still running.
  useEffect(() => {
    if (!run) return;
    let cancelled = false;
    ramanApi
      .steps(run.id)
      .then((res) => {
        if (cancelled) return;
        setSteps(res.steps);
        setRun(res.run);
        if (res.run.status === "running") {
          setShown(res.steps.length);
          void drive(res.run.id);
        } else {
          setShown(res.steps.length);
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run?.id]);

  // Auto playback: reveal the next saved step every ~1 s.
  useEffect(() => {
    if (mode !== "auto" || shown >= steps.length) return;
    const t = setTimeout(() => setShown((n) => Math.min(n + 1, steps.length)), FRAME_MS);
    return () => clearTimeout(t);
  }, [mode, shown, steps.length]);

  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      const g = Object.fromEntries(Object.entries(goal).map(([k, v]) => [k, v.trim() === "" ? null : Number(v)]));
      const created = await ramanApi.startRun(bundle.engagement.id, g);
      setSteps([]);
      setShown(0);
      setRun(created);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const stop = async () => {
    if (!run) return;
    try {
      setRun(await ramanApi.stopRun(run.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const open = bundle.engagement.status === "open";
  const locked = !!bundle.fix_prediction;

  // ── No run yet: goal and constraints ──
  if (!run) {
    const field = (k: keyof typeof goal, label: string, unit: string) => (
      <label className="text-sm" key={k}>
        {label}
        <div className="mt-1 flex items-center gap-2">
          <input className="rmn-input" inputMode="decimal" value={goal[k]} onChange={(e) => setGoal((s) => ({ ...s, [k]: e.target.value }))} />
          <span className="rmn-label whitespace-nowrap">{unit}</span>
        </div>
      </label>
    );
    return (
      <Card>
        <h3 className="text-lg font-semibold">Noise Fix</h3>
        <p className="rmn-label">The agent tries design changes one at a time, learns from each engine result, and stops when the target is met or no further gain is possible.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {field("target_dba", `Target at ${baseline.target_distance_m} m (hover)`, "dBA")}
          {field("max_added_mass_g", "Max added mass", "g")}
          {field("min_flight_time_change_pct", "Min flight-time change", "%")}
          {field("max_iterations", "Max iterations (≤ 8)", "")}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="rmn-seg" role="group" aria-label="Playback">
            <button type="button" aria-pressed={mode === "auto"} onClick={() => setMode("auto")}>Auto</button>
            <button type="button" aria-pressed={mode === "step"} onClick={() => setMode("step")}>Step</button>
          </span>
          <Btn kind="accent" onClick={start} disabled={busy || !open || locked}>
            <Play className="h-4 w-4" /> Start Noise Fix
          </Btn>
        </div>
        {error && <div className="mt-3"><ErrorNote>{error}</ErrorNote></div>}
      </Card>
    );
  }

  const running = run.status === "running";
  const visible = steps.slice(0, shown);
  const frame = visible.at(-1) ?? null;
  const levers = run.goal.lever_ranges;
  const target = run.goal.target_dba;
  const playbackDone = shown >= steps.length && !running;
  const options = run.ranked_options ?? [];
  const usedProviders = [...new Set(steps.map((s) => providerOfModel(s.model)).filter((p): p is AiProvider => p !== null))];
  const recommendedIteration =options.find((o) => JSON.stringify(o.changes) === JSON.stringify(run.recommended_design))?.iteration;

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold">Live agent run</h3>
            {/* Every provider that decided a step (primary, plus the secondary if it stepped in). */}
            {usedProviders.map((p) => (
              <ViaProvider key={p} provider={p} />
            ))}
            {usedProviders.length === 0 && !run.source_was_mock && <ViaProvider provider={providerOfModel(run.model)} />}
            {run.source_was_mock && <FallbackBadge />}
            <span className="rmn-mono text-xs" style={{ color: "var(--rmn-dim)" }}>
              {running ? "running" : run.status} · {steps.length} iteration{steps.length === 1 ? "" : "s"} · {run.model}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {mode === "step" && shown < steps.length && (
              <Btn kind="navy" onClick={() => setShown((n) => n + 1)}><StepForward className="h-4 w-4" /> Next</Btn>
            )}
            {running ? (
              <Btn kind="danger" onClick={stop} disabled={run.stop_requested}>
                <Square className="h-4 w-4" /> {run.stop_requested ? "Stopping…" : "Stop"}
              </Btn>
            ) : (
              <>
                <span className="rmn-seg" role="group" aria-label="Playback">
                  <button type="button" aria-pressed={mode === "auto"} onClick={() => setMode("auto")}>Auto</button>
                  <button type="button" aria-pressed={mode === "step"} onClick={() => setMode("step")}>Step</button>
                </span>
                <Btn kind="ghost" style={{ color: "var(--rmn-ink)" }} onClick={() => setShown(0)}><RotateCcw className="h-4 w-4" /> Replay</Btn>
              </>
            )}
          </div>
        </div>
        {run.source_was_mock && run.error_message && <div className="mt-3"><ErrorNote>{run.error_message}</ErrorNote></div>}
        {error && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <ErrorNote>{error}</ErrorNote>
            {running && <Btn kind="navy" onClick={() => drive(run.id)}>Resume</Btn>}
          </div>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <Card>
          <DecibelGauge
            value={frame?.predicted_dba ?? baseline.hover.lamax_dba}
            target={target}
            caption={frame ? `Iteration ${frame.iteration} · hover at ${baseline.target_distance_m} m` : `Baseline · hover at ${baseline.target_distance_m} m`}
          />
          <div className="mt-3 grid grid-cols-3 gap-2">
            <Stat label="Added mass" value={signed(frame?.tradeoffs?.added_mass_g ?? 0, 0)} unit="g" />
            <Stat label="Flight time" value={signed(frame?.tradeoffs?.flight_time_change_pct ?? 0)} unit="%" />
            <Stat label="Efficiency" value={signed(frame?.tradeoffs?.efficiency_change_pct ?? 0)} unit="%" />
          </div>
          {frame && frame.feasible === false && <div className="mt-2"><ErrorNote>Not feasible: {frame.result?.warnings.join(" ") || "the engine rejected this change"}</ErrorNote></div>}
          <div className="mt-4 space-y-3" aria-label="Design levers (moved by the agent)">
            {levers &&
              LEVERS.map((l) => {
                const range = levers[l.key];
                const v = (frame?.result?.design[l.key] as number | null | undefined) ?? range.current;
                return (
                  <div key={l.key}>
                    <div className="flex justify-between text-xs">
                      <span>{l.label}</span>
                      <span className="rmn-num">{v ?? "--"} {l.unit}</span>
                    </div>
                    <input type="range" className="rmn-slider" min={range.min} max={range.max} step={range.step} value={v ?? range.min} readOnly disabled aria-label={l.label} style={{ transition: "all 600ms" }} />
                  </div>
                );
              })}
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold">Decision log</h3>
          <ol className="mt-3 space-y-3">
            {visible.length === 0 && <li className="rmn-label">{running ? "The agent is planning its first experiment…" : "No iterations."}</li>}
            {visible.map((s) => (
              <li key={s.iteration} className="space-y-1.5">
                <div className="rounded-lg p-3 text-sm" style={{ background: "#F2F7FB" }}>
                  <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold" style={{ color: "var(--rmn-dim)" }}>
                    <Brain className="h-3.5 w-3.5" aria-hidden="true" /> Reasoning · iteration {s.iteration}
                    <span className="ml-auto">
                      {providerOfModel(s.model) ? <ViaProvider provider={providerOfModel(s.model)} /> : <FallbackBadge />}
                    </span>
                  </div>
                  {s.reasoning}
                </div>
                <div className="rounded-lg p-3 text-sm" style={{ border: "1px solid var(--rmn-hair)" }}>
                  <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold" style={{ color: "var(--rmn-dim)" }}>
                    <Wrench className="h-3.5 w-3.5" aria-hidden="true" /> Action
                  </div>
                  {stepLine(s, baseline)}
                </div>
              </li>
            ))}
            {running && shown >= steps.length && steps.length > 0 && <li className="rmn-label">Working on the next iteration…</li>}
          </ol>
        </Card>
      </div>

      {playbackDone && (
        <Card>
          <h3 className="text-lg font-semibold">Fix options</h3>
          {run.stop_reason && <p className="mt-1 text-sm">{run.stop_reason.replace(/^[a-z_]+: /, "")}</p>}
          {options.length === 0 ? (
            <p className="rmn-label mt-2">No design met the constraints. Try a new run with different constraints.</p>
          ) : (
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              {options.map((o) => (
                <OptionCard key={o.iteration} o={o} recommended={o.iteration === recommendedIteration} onTune={() => onTune(o.changes, run.id)} />
              ))}
            </div>
          )}
          {!locked && open && (
            <Btn kind="ghost" className="mt-4" style={{ color: "var(--rmn-ink)" }} onClick={() => setRun(null)}>
              Start another run
            </Btn>
          )}
        </Card>
      )}
    </div>
  );
}
