import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { ramanApi, RamanApiError, type EngagementBundle } from "@/lib/raman/ramanBrowserApi";
import type { RamanPropellerRow } from "@/lib/raman/ramanPersistence";
import type { RamanInputs } from "@/lib/raman/ramanTypes";
import { Btn, Card, ErrorNote, LockBadge } from "./ui";

// Tab 1 -- Vehicle inputs (spec §0, §0.2). Six required inputs with units
// and hints; everything else folded under "Optional". Generate Report stays
// disabled until the six are valid. Payload keys are exactly the engine's.

export type InputForm = Record<string, string>;

interface FieldDef {
  key: string;
  label: string;
  unit?: string;
  hint: string;
}

const REQUIRED: FieldDef[] = [
  { key: "take_off_mass_kg", label: "Take-off mass", unit: "kg", hint: "All-up weight including battery and payload" },
  { key: "rotor_count", label: "Number of rotors", unit: "count", hint: "4 for a quad, 6 for a hexa, 8 for an octo" },
  { key: "prop_diameter", label: "Propeller diameter", hint: "Tip-to-tip size, e.g. 13 in" },
  { key: "blade_count", label: "Blades per propeller", unit: "count", hint: "Usually 2 or 3" },
  { key: "motor_kv", label: "Motor KV", unit: "rpm/V", hint: "From the motor label or datasheet" },
  { key: "battery", label: "Battery", hint: "Cell count (S) or pack voltage" },
  { key: "cruise_speed", label: "Cruise speed", hint: "Typical forward speed in flight" },
];

const OPTIONAL: FieldDef[] = [
  { key: "prop_pitch_in", label: "Propeller pitch", unit: "in", hint: "Second number of the prop size, e.g. 4.4 in 13x4.4" },
  { key: "hover_rpm", label: "Hover RPM", unit: "rpm", hint: "If measured; otherwise derived from weight" },
  { key: "target_dba", label: "Noise target", unit: "dBA", hint: "Customer, regulation or Mission spec target" },
  { key: "target_distance_m", label: "Target distance", unit: "m", hint: "Distance the target applies at (default 10 m)" },
  { key: "rotor_spacing_m", label: "Rotor spacing", unit: "m", hint: "Centre-to-centre distance between adjacent rotors" },
  { key: "arm_clearance_ratio", label: "Rotor-to-arm clearance", unit: "× diameter", hint: "Gap between propeller plane and arm, as a fraction of diameter" },
  { key: "altitude_agl_m", label: "Operating altitude", unit: "m AGL", hint: "Typical flight height (default 30 m)" },
  { key: "temperature_c", label: "Air temperature", unit: "°C", hint: "Default 30 °C" },
  { key: "humidity_pct", label: "Relative humidity", unit: "%", hint: "Default 70 %" },
];

const ENVIRONMENTS = [
  { value: "", label: "Not specified" },
  { value: "rural", label: "Rural" },
  { value: "suburban", label: "Suburban" },
  { value: "urban", label: "Urban" },
  { value: "near_people", label: "Near people" },
];

// Engine field name -> form field, for inline errors.
const ERROR_FIELD: Record<string, string> = { battery_voltage: "battery", battery_cells: "battery" };

const isPos = (s: string | undefined) => s !== undefined && s.trim() !== "" && Number.isFinite(Number(s)) && Number(s) > 0;

export function defaultForm(): InputForm {
  return { prop_diameter_unit: "in", cruise_speed_unit: "m/s", battery_mode: "cells", target_distance_m: "10" };
}

// Saved engine inputs -> form strings (for a new cycle prefilled from the last one).
export function formFromInputs(inputs: Partial<RamanInputs>): InputForm {
  const f = defaultForm();
  for (const [k, v] of Object.entries(inputs)) {
    if (v === undefined || v === null || k === "vehicle_type") continue;
    f[k] = String(v);
  }
  if (inputs.battery_voltage !== undefined) {
    f.battery_mode = "volts";
    f.battery = String(inputs.battery_voltage);
  } else if (inputs.battery_cells !== undefined) {
    f.battery = String(inputs.battery_cells);
  }
  return f;
}

function toPayload(f: InputForm): Partial<RamanInputs> {
  const out: Record<string, unknown> = {
    prop_diameter_unit: f.prop_diameter_unit,
    cruise_speed_unit: f.cruise_speed_unit,
  };
  for (const d of [...REQUIRED, ...OPTIONAL]) {
    if (d.key === "battery") continue;
    const v = f[d.key];
    if (v !== undefined && v.trim() !== "") out[d.key] = Number(v);
  }
  if (isPos(f.battery)) out[f.battery_mode === "volts" ? "battery_voltage" : "battery_cells"] = Number(f.battery);
  if (f.environment) out.environment = f.environment;
  if (f.chord_075_over_r) out.chord_075_over_r = Number(f.chord_075_over_r);
  return out as Partial<RamanInputs>;
}

function Seg<T extends string>({ value, options, onChange, label }: { value: T; options: { v: T; l: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <span className="rmn-seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.v} type="button" aria-pressed={value === o.v} onClick={() => onChange(o.v)}>
          {o.l}
        </button>
      ))}
    </span>
  );
}

export function InputsTab({
  bundle,
  initial,
  focusField,
  onIssued,
  onNewCycle,
}: {
  bundle: EngagementBundle;
  initial: InputForm | null;
  focusField: string | null;
  onIssued: () => void;
  onNewCycle: (prefill: InputForm, focus?: string) => void;
}) {
  const issued = bundle.baseline;
  const frozen = !!issued || bundle.engagement.status === "closed";
  const [form, setForm] = useState<InputForm>(() =>
    issued ? formFromInputs(issued.inputs as RamanInputs) : (initial ?? defaultForm()),
  );
  const [showOptional, setShowOptional] = useState(() => !!focusField && OPTIONAL.some((d) => d.key === focusField));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [props, setProps] = useState<RamanPropellerRow[]>([]);
  const focusRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    ramanApi.propellers(undefined, "verified").then(setProps).catch(() => setProps([]));
  }, []);
  useEffect(() => {
    focusRef.current?.focus();
  }, []);

  const set = (k: string, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => {
      const { [k]: _, ...rest } = e;
      return rest;
    });
  };

  const requiredValid = useMemo(() => REQUIRED.every((d) => isPos(form[d.key])), [form]);

  const submit = async () => {
    setBusy(true);
    setError(null);
    setErrors({});
    try {
      await ramanApi.noiseCheck(bundle.engagement.id, toPayload(form));
      onIssued();
    } catch (err) {
      if (err instanceof RamanApiError && err.fields.length) {
        const map: Record<string, string> = {};
        for (const f of err.fields) map[ERROR_FIELD[f.field] ?? f.field] = f.message;
        setErrors(map);
        if (map.vehicle_type) setError(`Vehicle type: ${map.vehicle_type}`);
        if (Object.keys(map).some((k) => OPTIONAL.some((d) => d.key === k))) setShowOptional(true);
      } else {
        setError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setBusy(false);
    }
  };

  const pickProp = (id: string) => {
    const p = props.find((x) => x.id === id);
    if (!p) return;
    setForm((f) => ({
      ...f,
      propeller_id: p.id,
      ...(p.diameter_in !== null ? { prop_diameter: String(p.diameter_in), prop_diameter_unit: "in" } : {}),
      ...(p.pitch_in !== null ? { prop_pitch_in: String(p.pitch_in) } : {}),
      ...(p.blade_count !== null ? { blade_count: String(p.blade_count) } : {}),
      ...(p.chord_075_over_r !== null ? { chord_075_over_r: String(p.chord_075_over_r) } : { chord_075_over_r: "" }),
    }));
  };

  const field = (d: FieldDef) => {
    const id = `rmn-${d.key}`;
    const err = errors[d.key];
    const unitControl =
      d.key === "prop_diameter" ? (
        <Seg label="Diameter unit" value={form.prop_diameter_unit as "in" | "m"} options={[{ v: "in", l: "in" }, { v: "m", l: "m" }]} onChange={(v) => set("prop_diameter_unit", v)} />
      ) : d.key === "cruise_speed" ? (
        <Seg label="Speed unit" value={form.cruise_speed_unit as "m/s" | "km/h"} options={[{ v: "m/s", l: "m/s" }, { v: "km/h", l: "km/h" }]} onChange={(v) => set("cruise_speed_unit", v)} />
      ) : d.key === "battery" ? (
        <Seg label="Battery unit" value={form.battery_mode as "cells" | "volts"} options={[{ v: "cells", l: "cells (S)" }, { v: "volts", l: "volts" }]} onChange={(v) => set("battery_mode", v)} />
      ) : (
        d.unit && <span className="rmn-label whitespace-nowrap">{d.unit}</span>
      );
    return (
      <div key={d.key}>
        <label htmlFor={id} className="rmn-flabel">{d.label}</label>
        <div className="mt-1 flex items-center gap-2">
          <input
            id={id}
            ref={focusField === d.key ? focusRef : undefined}
            className="rmn-input"
            inputMode="decimal"
            value={form[d.key] ?? ""}
            onChange={(e) => set(d.key, e.target.value)}
            disabled={frozen}
            aria-invalid={!!err}
            aria-describedby={`${id}-hint`}
          />
          {!frozen && unitControl}
          {frozen && <span className="rmn-label whitespace-nowrap">{d.key === "prop_diameter" ? form.prop_diameter_unit : d.key === "cruise_speed" ? form.cruise_speed_unit : d.key === "battery" ? (form.battery_mode === "volts" ? "V" : "cells") : d.unit}</span>}
        </div>
        <div id={`${id}-hint`} className="mt-1 text-xs" style={{ color: err ? "var(--rmn-fail-ink)" : "var(--rmn-dim)" }}>
          {err ? `${d.label} ${err}` : d.hint}
        </div>
      </div>
    );
  };

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-semibold">Vehicle inputs</h3>
          <p className="rmn-label">Six inputs from the call. Everything else is defaulted and marked assumed in the report.</p>
        </div>
        {frozen && (
          <div className="flex items-center gap-2">
            <LockBadge />
            {bundle.engagement.status === "open" && (
              <Btn kind="ghost" onClick={() => onNewCycle(form)} style={{ color: "var(--rmn-ink)" }}>
                Change inputs (new cycle)
              </Btn>
            )}
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{REQUIRED.map(field)}</div>

      <button
        type="button"
        className="mt-5 flex items-center gap-1 text-sm font-medium"
        style={{ color: "var(--rmn-ink)" }}
        onClick={() => setShowOptional((s) => !s)}
        aria-expanded={showOptional}
      >
        {showOptional ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />} Optional (propeller, target, environment, layout)
      </button>

      {showOptional && (
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label htmlFor="rmn-prop" className="rmn-flabel">Propeller brand / model</label>
            <select id="rmn-prop" className="rmn-input mt-1" value={form.propeller_id ?? ""} onChange={(e) => pickProp(e.target.value)} disabled={frozen}>
              <option value="">{props.length ? "Choose a verified propeller" : "No verified propellers yet"}</option>
              {props.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.brand} {p.model}
                  {p.diameter_in ? ` (${p.diameter_in}x${p.pitch_in ?? "?"} in, ${p.blade_count ?? "?"} blades)` : ""}
                </option>
              ))}
            </select>
            <div className="mt-1 text-xs" style={{ color: "var(--rmn-dim)" }}>Fills diameter, pitch, blades and chord from the propeller DB</div>
          </div>
          <div>
            <label htmlFor="rmn-env" className="rmn-flabel">Operating environment</label>
            <select id="rmn-env" className="rmn-input mt-1" value={form.environment ?? ""} onChange={(e) => set("environment", e.target.value)} disabled={frozen}>
              {ENVIRONMENTS.map((e) => (
                <option key={e.value} value={e.value}>{e.label}</option>
              ))}
            </select>
            <div className="mt-1 text-xs" style={{ color: "var(--rmn-dim)" }}>Sets the background level for the tone test</div>
          </div>
          {OPTIONAL.map(field)}
        </div>
      )}

      {error && <div className="mt-4"><ErrorNote>{error}</ErrorNote></div>}

      {!frozen && (
        <div className="mt-5 flex items-center gap-3">
          <Btn kind="accent" onClick={submit} disabled={!requiredValid || busy}>
            {busy ? "Generating…" : "Generate Report"}
          </Btn>
          {!requiredValid && <span className="rmn-label">Fill in all six inputs to generate the report.</span>}
        </div>
      )}
    </Card>
  );
}
