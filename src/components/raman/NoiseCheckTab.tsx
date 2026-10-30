import { useState } from "react";
import { ChevronDown, ChevronRight, Download, IndianRupee, Mail } from "lucide-react";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ramanApi, type EngagementBundle } from "@/lib/raman/ramanBrowserApi";
import type { RamanBreakdownPct, RamanInputs, RamanNoiseCheckResult } from "@/lib/raman/ramanTypes";
import { checkReportPdf, emailDraft } from "./ramanPdf";
import { formFromInputs, type InputForm } from "./InputsTab";
import { Btn, Card, ErrorNote, LockBadge, Stat, VerdictBanner, ViaProvider, fmt } from "./ui";

// Tab 2 -- Noise Check report (spec §0.2 Tab 2, §7). Everything shown is the
// stored engine result; only the summary paragraph is AI-written, tagged
// with the provider that wrote it ("via Claude" / "via Groq").

const SERIES: { key: keyof RamanBreakdownPct; label: string; color: string }[] = [
  { key: "tonal", label: "Rotor hum (tonal)", color: "var(--rmn-s1)" },
  { key: "interaction", label: "Interaction", color: "var(--rmn-s2)" },
  { key: "broadband", label: "Hiss (broadband)", color: "var(--rmn-s3)" },
  { key: "motor", label: "Motor", color: "var(--rmn-s4)" },
];

// Provenance keys a customer can supply on a new cycle -> Tab 1 field.
const ASSUMED_FIELDS: Record<string, string> = {
  prop_pitch_in: "Propeller pitch",
  arm_clearance_ratio: "Rotor-to-arm clearance",
  rotor_spacing_m: "Rotor spacing",
  altitude_agl_m: "Operating altitude",
  temperature_c: "Air temperature",
  humidity_pct: "Relative humidity",
  target_dba: "Noise target",
};

const AXIS = { fontSize: 11, fill: "#4F6B80" };

export function SourceSplit({ pct }: { pct: RamanBreakdownPct }) {
  return (
    <div>
      <div className="flex h-5 w-full overflow-hidden rounded" role="img" aria-label={SERIES.map((s) => `${s.label} ${pct[s.key]}%`).join(", ")}>
        {SERIES.map((s) =>
          pct[s.key] > 0 ? (
            <div
              key={s.key}
              title={`${s.label}: ${pct[s.key]}%`}
              style={{ width: `${pct[s.key]}%`, background: s.color, borderRight: "2px solid #fff" }}
            />
          ) : null,
        )}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: "var(--rmn-ink)" }}>
        {SERIES.map((s) => (
          <li key={s.key} className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} aria-hidden="true" />
            {s.label} <span className="rmn-num">{fmt(pct[s.key])}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PaymentPanel({ engagementId, stage, onDone }: { engagementId: string; stage: 1 | 2; onDone: () => void }) {
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const save = async (status: "paid" | "waived") => {
    setBusy(true);
    setError(null);
    try {
      await ramanApi.payment(engagementId, stage, { status, amount_inr: amount ? Number(amount) : null, reference });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="rounded-lg p-4" style={{ background: "#FFF7E8", border: "1px solid #F6C374" }}>
      <div className="flex items-center gap-2 font-semibold">
        <IndianRupee className="h-4 w-4" aria-hidden="true" /> Payment {stage} (placeholder)
      </div>
      <p className="rmn-label mt-1">Pricing and payment flow are specified separately. Record the payment here to unlock the next tabs.</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          Amount (INR)
          <input className="rmn-input mt-1" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
        <label className="text-sm">
          Reference
          <input className="rmn-input mt-1" value={reference} onChange={(e) => setReference(e.target.value)} />
        </label>
      </div>
      {error && <div className="mt-3"><ErrorNote>{error}</ErrorNote></div>}
      <div className="mt-3 flex gap-2">
        <Btn kind="navy" disabled={busy} onClick={() => save("paid")}>Mark paid</Btn>
        <Btn kind="ghost" disabled={busy} onClick={() => save("waived")} style={{ color: "var(--rmn-ink)" }}>Waive</Btn>
      </div>
    </div>
  );
}

export function NoiseCheckTab({
  bundle,
  onChanged,
  onGoTab,
  onNewCycle,
}: {
  bundle: EngagementBundle;
  onChanged: () => void;
  onGoTab: (tab: number) => void;
  onNewCycle: (prefill: InputForm, focus?: string) => void;
}) {
  const check = bundle.baseline!;
  const r = check.result as RamanNoiseCheckResult;
  const [state, setState] = useState<"hover" | "cruise">("hover");
  const [showAssumptions, setShowAssumptions] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [busy, setBusy] = useState(false);

  const levels = r.levels_by_distance.map((row) => ({ distance: row.distance_m, dba: state === "hover" ? row.hover_dba : row.cruise_dba }));
  const bpfBand = r.hover.spectrum.reduce((best, b) =>
    Math.abs(Math.log(b.band_hz / r.performance.bpf_hz)) < Math.abs(Math.log(best.band_hz / r.performance.bpf_hz)) ? b : best,
  ).band_hz;
  const assumedKeys = Object.entries(r.provenance).filter(([k, tag]) => (tag === "assumed" || tag === "none") && ASSUMED_FIELDS[k]);
  const canFix = bundle.engagement.status === "open";
  const paid2 = bundle.engagement.payment2_status !== "pending";

  const download = async () => {
    setBusy(true);
    try {
      if (!bundle.reports.some((rep) => rep.type === "check")) await ramanApi.report(bundle.engagement.id, "check");
      checkReportPdf(bundle).save(`Raman-Noise-Check-${bundle.vehicle?.name ?? "vehicle"}-v${bundle.engagement.cycle}.pdf`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const email = async () => {
    try {
      await navigator.clipboard.writeText(emailDraft(bundle, "check"));
      toast.success("Draft email copied -- paste it into your email and attach the PDF.");
    } catch {
      toast.error("Couldn't copy to the clipboard.");
    }
  };

  return (
    <div className="space-y-4">
      <VerdictBanner
        verdict={r.verdict}
        headline={r.headline}
        right={
          <div className="flex flex-wrap items-center gap-2">
            <LockBadge />
            <Btn kind="navy" onClick={download} disabled={busy}><Download className="h-4 w-4" /> Download PDF</Btn>
            <Btn kind="navy" onClick={email}><Mail className="h-4 w-4" /> Email to customer</Btn>
          </div>
        }
      />
      {r.warnings.length > 0 && <ErrorNote>{r.warnings.join(" ")}</ErrorNote>}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold">Noise by distance</h3>
            <span className="rmn-seg" role="group" aria-label="Flight state">
              {(["hover", "cruise"] as const).map((s) => (
                <button key={s} type="button" aria-pressed={state === s} onClick={() => setState(s)}>
                  {s === "hover" ? "Hover" : "Cruise"}
                </button>
              ))}
            </span>
          </div>
          <p className="rmn-label">{state === "hover" ? "Hover" : "Cruise"} level, dBA, by receiver distance{r.target_dba !== null ? ` · target ${r.target_dba} dBA at ${r.target_distance_m} m` : ""}</p>
          <div className="mt-2 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={levels} margin={{ top: 8, right: 16, bottom: 4, left: -8 }}>
                <CartesianGrid stroke="#E1E0D9" vertical={false} />
                <XAxis dataKey="distance" type="number" scale="log" domain={["dataMin", "dataMax"]} ticks={levels.map((l) => l.distance)} tick={AXIS} tickFormatter={(v) => `${v} m`} />
                <YAxis tick={AXIS} domain={["dataMin - 5", "dataMax + 5"]} tickFormatter={(v) => Math.round(v).toString()} />
                <Tooltip formatter={(v: number) => [`${v.toFixed(1)} dBA`, state === "hover" ? "Hover" : "Cruise"]} labelFormatter={(v) => `${v} m`} />
                {r.target_dba !== null && (
                  <ReferenceLine y={r.target_dba} stroke="#08131F" strokeDasharray="4 4" label={{ value: `target ${r.target_dba}`, position: "insideTopRight", fontSize: 11, fill: "#08131F" }} />
                )}
                <Line dataKey="dba" stroke="var(--rmn-s1)" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <table className="rmn-table mt-3">
            <thead>
              <tr><th>Distance</th><th>Hover (dBA)</th><th>Cruise (dBA)</th></tr>
            </thead>
            <tbody>
              {r.levels_by_distance.map((row) => (
                <tr key={row.distance_m}>
                  <td>{row.distance_m} m</td>
                  <td style={{ fontWeight: state === "hover" ? 600 : 400 }}>{fmt(row.hover_dba)}</td>
                  <td style={{ fontWeight: state === "cruise" ? 600 : 400 }}>{fmt(row.cruise_dba)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <div className="space-y-4">
          <Card>
            <h3 className="font-semibold">Where the noise comes from</h3>
            <p className="rmn-label mb-3">{state === "hover" ? "Hover" : "Cruise"}, share of sound energy at {r.target_distance_m} m</p>
            <SourceSplit pct={state === "hover" ? r.hover.breakdown_pct : r.cruise.breakdown_pct} />
          </Card>
          <Card>
            <h3 className="font-semibold">What's driving it</h3>
            <ul className="mt-2 space-y-1.5 text-sm">
              {r.drivers.map((d) => (
                <li key={d.code}>• {d.message}</li>
              ))}
            </ul>
            {check.summary_text && (
              <div className="mt-3 rounded-lg p-3 text-sm" style={{ background: "#F2F7FB" }}>
                <div className="mb-1"><ViaProvider provider={check.summary_provider ?? null} mock={!!check.summary_source_was_mock} /></div>
                {check.summary_text}
              </div>
            )}
          </Card>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Hover RPM" value={r.performance.hover_rpm} unit="rpm" />
            <Stat label="Tip speed" value={fmt(r.performance.tip_speed_ms)} unit="m/s" />
            <Stat label="Blade-pass freq." value={fmt(r.performance.bpf_hz)} unit="Hz" />
            <Stat label="Sound power" value={fmt(r.sound_power_lwa_db)} unit="dB LWA" />
          </div>
        </div>
      </div>

      <Card>
        <h3 className="font-semibold">1/3-octave spectrum (hover, {r.target_distance_m} m)</h3>
        <p className="rmn-label">A-weighted band level, dBA · blade-passing frequency {fmt(r.performance.bpf_hz)} Hz marked{r.hover.tonal_prominent ? " · tone is prominent" : ""} · bands below 0 dBA are inaudible and not drawn</p>
        <div className="mt-2 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={r.hover.spectrum} margin={{ top: 16, right: 8, bottom: 4, left: -8 }} barCategoryGap={2}>
              <CartesianGrid stroke="#E1E0D9" vertical={false} />
              <XAxis dataKey="band_hz" tick={AXIS} interval="preserveStartEnd" minTickGap={14}tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : `${v}`)} />
              <YAxis tick={AXIS} domain={[0, "dataMax + 5"]} allowDataOverflow tickFormatter={(v) => Math.round(v).toString()} />
              <Tooltip formatter={(v: number) => [`${v.toFixed(1)} dBA`, "Band level"]} labelFormatter={(v) => `${v} Hz band`} />
              <ReferenceLine x={bpfBand} stroke="#08131F" strokeDasharray="4 4" label={{ value: "BPF", position: "top", fontSize: 11, fill: "#08131F" }} />
              <Bar dataKey="spl_dba" fill="var(--rmn-s1)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <button type="button" className="flex w-full items-center justify-between" onClick={() => setShowAssumptions((s) => !s)} aria-expanded={showAssumptions}>
          <span className="rmn-ctitle">Assumptions and accuracy</span>
          {showAssumptions ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <p className="mt-1 text-sm">
          Confidence score <span className="rmn-num">{r.confidence_score.toFixed(2)}</span> · ±5 dB early-stage estimate, not a certified measurement.
        </p>
        {showAssumptions && (
          <div className="mt-3 space-y-3 text-sm">
            <ul className="space-y-1">
              {r.assumptions.map((a) => (
                <li key={a}>• {a}</li>
              ))}
            </ul>
            {assumedKeys.length > 0 && canFix && (
              <div>
                <div className="rmn-label mb-1">Know the real value? Start a new cycle with it:</div>
                <div className="flex flex-wrap gap-2">
                  {assumedKeys.map(([k]) => (
                    <Btn
                      key={k}
                      kind="ghost"
                      style={{ color: "var(--rmn-ink)" }}
                      onClick={() => onNewCycle(formFromInputs(check.inputs as RamanInputs), k)}
                    >
                      {ASSUMED_FIELDS[k]}
                    </Btn>
                  ))}
                </div>
              </div>
            )}
            <div className="rmn-label">Excluded sources: {r.excluded_sources.join("; ")}.</div>
            <div className="rmn-label">Models: {r.models.join(", ")} · engine {r.engine_version}</div>
          </div>
        )}
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold">Next step</h3>
            <p className="text-sm">Book a Raman Noise Fix to find out how to reduce it.</p>
          </div>
          {canFix && (
            <Btn kind="accent" onClick={() => (paid2 ? onGoTab(3) : setShowPayment(true))}>
              Noise Fix
            </Btn>
          )}
        </div>
        {showPayment && !paid2 && (
          <div className="mt-4">
            <PaymentPanel
              engagementId={bundle.engagement.id}
              stage={2}
              onDone={() => {
                onChanged();
                onGoTab(3);
              }}
            />
          </div>
        )}
      </Card>
    </div>
  );
}

export { PaymentPanel };
