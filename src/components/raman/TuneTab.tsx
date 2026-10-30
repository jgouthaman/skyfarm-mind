import { useEffect, useMemo, useRef, useState } from "react";
import { Lock } from "lucide-react";
import { ramanApi, type EngagementBundle } from "@/lib/raman/ramanBrowserApi";
import type {
  RamanDesignChanges,
  RamanEvaluateResult,
  RamanFixPredictionResult,
  RamanLeverRangesResult,
  RamanNoiseCheckResult,
} from "@/lib/raman/ramanTypes";
import { DecibelGauge } from "./DecibelGauge";
import { changeLines } from "./ramanPdf";
import { Btn, Card, ErrorNote, LockBadge, Stat, VerdictPill, fmt, signed } from "./ui";

// Tab 4 -- Agentic Noise Fix (spec §0.2 Tab 4 simulation screen). Starts
// from the agent's recommendation (or the option chosen in Tab 3); every
// slider move re-runs the engine on the whole combined design (debounced
// ~150 ms), so trade-offs are never fixed per-option values. Lock this
// design freezes it as the official prediction for Tab 5.

type LeverKey = "prop_diameter_in" | "blade_count" | "hover_rpm" | "rotor_spacing_m" | "arm_clearance_ratio";
const LEVERS: { key: LeverKey; label: string; unit: string }[] = [
  { key: "prop_diameter_in", label: "Propeller diameter", unit: "in" },
  { key: "blade_count", label: "Blade count", unit: "" },
  { key: "hover_rpm", label: "Hover RPM", unit: "rpm" },
  { key: "rotor_spacing_m", label: "Rotor spacing", unit: "m" },
  { key: "arm_clearance_ratio", label: "Rotor-to-arm clearance", unit: "× D" },
];
const DEBOUNCE_MS = 150;

export function TuneTab({
  bundle,
  seed,
  runId,
  onLocked,
}: {
  bundle: EngagementBundle;
  seed: RamanDesignChanges | null;
  runId: string | null;
  onLocked: () => void;
}) {
  const baseline = bundle.baseline!.result as RamanNoiseCheckResult;
  const locked = bundle.fix_prediction;
  const run = bundle.runs.find((r) => r.id === runId) ?? bundle.runs.filter((r) => r.status !== "running").at(-1) ?? null;
  const start = seed ?? run?.recommended_design ?? {};

  const [ranges, setRanges] = useState<RamanLeverRangesResult["levers"] | null>(run?.goal.lever_ranges ?? null);
  const [values, setValues] = useState<Partial<Record<LeverKey, number>>>(() => ({ ...start }) as Partial<Record<LeverKey, number>>);
  const [rpmTouched, setRpmTouched] = useState(start.hover_rpm !== undefined);
  const [result, setResult] = useState<RamanEvaluateResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const seq = useRef(0);

  useEffect(() => {
    if (ranges || locked) return;
    ramanApi.leverRanges(bundle.engagement.id).then((r) => setRanges(r.levers)).catch((e) => setError(String(e?.message ?? e)));
  }, [bundle.engagement.id, ranges, locked]);

  // The changes sent to the engine: levers that differ from the original
  // vehicle; hover RPM only once it has been set deliberately (otherwise
  // the engine derives it from thrust).
  const changes = useMemo<RamanDesignChanges>(() => {
    const out: RamanDesignChanges = {};
    if (!ranges) return out;
    for (const l of LEVERS) {
      const v = values[l.key];
      if (v === undefined) continue;
      if (l.key === "hover_rpm") {
        if (rpmTouched) out.hover_rpm = v;
      } else if (v !== ranges[l.key].current) {
        out[l.key] = v;
      }
    }
    return out;
  }, [values, ranges, rpmTouched]);

  useEffect(() => {
    if (locked || !ranges) return;
    const id = ++seq.current;
    const t = setTimeout(() => {
      ramanApi
        .evaluate(bundle.engagement.id, changes)
        .then((r) => {
          if (id === seq.current) {
            setResult(r);
            setError(null);
          }
        })
        .catch((e) => id === seq.current && setError(e instanceof Error ? e.message : String(e)));
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [bundle.engagement.id, changes, locked, ranges]);

  const lock = async () => {
    if (!run) return;
    setBusy(true);
    setError(null);
    try {
      await ramanApi.lockRun(run.id, changes);
      onLocked();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  // ── Already locked: frozen view ──
  if (locked) {
    const r = locked.result as RamanFixPredictionResult;
    const lockedChanges = (locked.inputs as { changes: RamanDesignChanges }).changes;
    return (
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold">Locked design</h3>
          <LockBadge label="Locked · frozen" />
        </div>
        <div className="mt-3 grid gap-4 lg:grid-cols-2">
          <DecibelGauge value={r.predicted_dba} target={r.target_dba} caption={`Predicted hover at ${r.target_distance_m} m`} />
          <div className="space-y-3">
            <p className="text-sm font-medium">{locked.headline}</p>
            <ul className="space-y-1 text-sm">
              {changeLines(lockedChanges, baseline).map((l) => (
                <li key={l}>• {l}</li>
              ))}
            </ul>
            <div className="grid grid-cols-2 gap-2">
              <Stat label="Added mass" value={signed(r.tradeoffs.added_mass_g, 0)} unit="g" />
              <Stat label="Flight time" value={signed(r.tradeoffs.flight_time_change_pct)} unit="%" />
              <Stat label="Efficiency" value={signed(r.tradeoffs.efficiency_change_pct)} unit="%" />
              <Stat label="Thrust-to-weight" value={r.tradeoffs.thrust_to_weight} />
            </div>
          </div>
        </div>
      </Card>
    );
  }

  if (!run) {
    return <Card><p className="text-sm">Run Noise Fix in Tab 3 first; its recommendation is the starting point here.</p></Card>;
  }

  const display = (k: LeverKey): number | null => {
    if (k === "hover_rpm" && !rpmTouched) return result?.design.hover_rpm ?? ranges?.hover_rpm.current ?? null;
    return values[k] ?? ranges?.[k].current ?? null;
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <Card>
          <DecibelGauge
            value={result?.predicted_dba ?? null}
            target={run.goal.target_dba}
            caption={`Predicted hover at ${baseline.target_distance_m} m · before ${fmt(baseline.hover.lamax_dba)} dBA`}
          />
          {result && (
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-sm">
              <VerdictPill verdict={result.verdict} />
              <span className="rmn-num">{fmt(-result.delta_db)} dB quieter</span>
              <span className="rmn-label">(10 dB sounds about half as loud · ±5 dB)</span>
            </div>
          )}
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Added mass" value={signed(result?.tradeoffs.added_mass_g, 0)} unit="g" />
            <Stat label="Flight time" value={signed(result?.tradeoffs.flight_time_change_pct)} unit="%" tone={(result?.tradeoffs.flight_time_change_pct ?? 0) < 0 ? "bad" : undefined} />
            <Stat label="Efficiency" value={signed(result?.tradeoffs.efficiency_change_pct)} unit="%" />
            <Stat label="Thrust-to-weight" value={result?.tradeoffs.thrust_to_weight ?? "--"} />
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold">Tune the design</h3>
          <p className="rmn-label">Each move re-runs the engine on the whole design. Ranges are realistic for this vehicle.</p>
          <div className="mt-4 space-y-4">
            {ranges &&
              LEVERS.map((l) => {
                const range = ranges[l.key];
                const v = display(l.key);
                return (
                  <div key={l.key}>
                    <div className="flex justify-between text-sm">
                      <label htmlFor={`tune-${l.key}`}>{l.label}</label>
                      <span className="rmn-num">{v ?? "--"} {l.unit}{l.key === "hover_rpm" && !rpmTouched ? " (derived)" : ""}</span>
                    </div>
                    <input
                      id={`tune-${l.key}`}
                      type="range"
                      className="rmn-slider"
                      min={range.min}
                      max={range.max}
                      step={range.step}
                      value={v ?? range.min}
                      onChange={(e) => {
                        if (l.key === "hover_rpm") setRpmTouched(true);
                        setValues((s) => ({ ...s, [l.key]: Number(e.target.value) }));
                      }}
                    />
                    <div className="flex justify-between text-[11px]" style={{ color: "var(--rmn-dim)" }}>
                      <span>{range.min}</span>
                      <span>{range.max}</span>
                    </div>
                  </div>
                );
              })}
          </div>
          {rpmTouched && (
            <Btn kind="ghost" className="mt-3" style={{ color: "var(--rmn-ink)" }} onClick={() => { setRpmTouched(false); setValues((s) => { const { hover_rpm: _, ...rest } = s; return rest; }); }}>
              Let the engine derive hover RPM
            </Btn>
          )}
        </Card>
      </div>

      {result && result.warnings.length > 0 && <ErrorNote>{result.warnings.join(" ")}</ErrorNote>}
      {result && !result.feasible && <ErrorNote>This design is not feasible -- it can't be locked.</ErrorNote>}
      {error && <ErrorNote>{error}</ErrorNote>}

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm">
            <div className="font-medium">Changes: {changeLines(changes, baseline).join("; ") || "none yet"}</div>
            <div className="rmn-label">Locking freezes this combination as the official prediction for the final report.</div>
          </div>
          <Btn kind="accent" onClick={lock} disabled={busy || !result || !result.feasible || Object.keys(changes).length === 0 || bundle.engagement.status !== "open"}>
            <Lock className="h-4 w-4" /> {busy ? "Locking…" : "Lock this design"}
          </Btn>
        </div>
      </Card>
    </div>
  );
}
