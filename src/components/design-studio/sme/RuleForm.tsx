import { useState, useEffect, Children, cloneElement, isValidElement } from "react";
import type { ReactNode, CSSProperties, ReactElement, ChangeEvent } from "react";
import {
  VERTICALS,
  PURPOSE_OPTIONS,
  TERRAIN_OPTIONS,
  WIND_OPTIONS,
  AUTOMATION_OPTIONS,
  BUDGET_OPTIONS,
} from "@/lib/design-studio/constants";
import {
  DRONE_TYPE_OPTIONS,
  GPS_OPTIONS,
  DRONE_TYPE_HINTS,
  EMPTY_RULE,
  type DesignRuleInsert,
} from "@/lib/design-studio/sme-types";

interface Props {
  engineerName: string;
  initial?:     DesignRuleInsert;
  onSave:       (rule: DesignRuleInsert) => Promise<void>;
  saving:       boolean;
  isEditing:    boolean;
}

const INP =
  "w-full h-9 rounded-lg px-3 text-sm text-white bg-white/[0.08] " +
  "border border-white/[0.12] placeholder-white/30 focus:outline-none " +
  "focus:border-white/30 transition-colors";

const SEL_CLS =
  "w-full h-9 rounded-lg px-3 text-sm text-white bg-[#151f35] " +
  "border border-white/[0.12] focus:outline-none focus:border-white/30 " +
  "transition-colors appearance-none cursor-pointer";

const LBL = "block text-[12px] text-white/50 mb-1";

// Solid dark style applied to the <select> and cloned into every <option>
// so the browser's native dropdown popup renders dark text on dark background.
const OPT: CSSProperties = { backgroundColor: "#151f35", color: "white" };

function Sel({
  value,
  onChange,
  children,
}: {
  value: string | number;
  onChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  children: ReactNode;
}) {
  return (
    <select className={SEL_CLS} value={value} onChange={onChange} style={OPT}>
      {Children.map(children, (child) =>
        isValidElement(child)
          ? cloneElement(child as ReactElement<{ style?: CSSProperties }>, { style: OPT })
          : child,
      )}
    </select>
  );
}

function F({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className={LBL}>{label}</label>
      {children}
    </div>
  );
}

export function RuleForm({ engineerName, initial, onSave, saving, isEditing }: Props) {
  const [form, setForm]           = useState<DesignRuleInsert>(initial ?? EMPTY_RULE);
  const [flagInput, setFlagInput] = useState("");
  const [error, setError]         = useState("");

  const patch = (p: Partial<DesignRuleInsert>) => setForm(f => ({ ...f, ...p }));

  useEffect(() => { setForm(initial ?? EMPTY_RULE); }, [initial]);

  const initials = engineerName
    .split(" ")
    .map(w => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="space-y-4">

      {/* Identity strip */}
      <div className="bg-white/5 border border-white/[0.08] rounded-xl px-5 py-3 flex items-center gap-4">
        <div className="bg-[#378ADD]/20 text-[#378ADD] w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0">
          {initials}
        </div>
        <div className="min-w-0">
          <div className="text-sm text-white font-medium">{engineerName}</div>
          <div className="text-[12px] text-white/40">
            Submitting as · knowledge auto-attributed to your profile
          </div>
        </div>
        <div className="ml-auto shrink-0">
          <F label="Your confidence">
            <Sel value={form.confidence_level ?? 5} onChange={e => patch({ confidence_level: +e.target.value })}>
              <option value={1}>1 – Uncertain</option>
              <option value={2}>2 – Low</option>
              <option value={3}>3 – Medium</option>
              <option value={4}>4 – High</option>
              <option value={5}>5 – Expert</option>
            </Sel>
          </F>
        </div>
      </div>

      {/* Block 1 */}
      <div className="bg-[#0d1729] border border-white/[0.07] rounded-xl p-5">
        <p className="text-[11px] uppercase tracking-widest text-white/40 font-medium mb-4">
          BLOCK 1 — What drone type is this rule for?
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <F label="Drone vertical">
            <Sel
              value={form.vertical}
              onChange={e => {
                const v = e.target.value;
                patch({
                  vertical: v,
                  purpose: (PURPOSE_OPTIONS as Record<string, string[]>)[v]?.[0] ?? "",
                });
              }}
            >
              {VERTICALS.map(v => <option key={v} value={v}>{v}</option>)}
            </Sel>
          </F>

          <F label="Drone purpose">
            <Sel value={form.purpose} onChange={e => patch({ purpose: e.target.value })}>
              {((PURPOSE_OPTIONS as Record<string, string[]>)[form.vertical] ?? []).map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </Sel>
          </F>

          <F label="Drone type">
            <Sel value={form.drone_type ?? ""} onChange={e => patch({ drone_type: e.target.value || null })}>
              <option value="">Select drone type</option>
              {DRONE_TYPE_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
            </Sel>
          </F>

          {form.drone_type && DRONE_TYPE_HINTS[form.drone_type] && (
            <div className="col-span-full bg-white/5 border border-white/[0.08] rounded-xl p-4 text-[12px] text-white/50 flex items-start gap-2">
              <span className="text-[#378ADD] mt-0.5">ⓘ</span>
              {DRONE_TYPE_HINTS[form.drone_type]}
            </div>
          )}
        </div>
      </div>

      {/* Block 2 */}
      <div className="bg-[#0b1520] border border-white/[0.07] rounded-xl p-5">
        <p className="text-[11px] uppercase tracking-widest text-white/40 font-medium mb-4">
          BLOCK 2 — When does this drone type apply? (mission conditions)
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <span className="col-span-full text-[11px] text-white/25 uppercase tracking-wider">
            Mission parameters
          </span>
          <F label="Min payload (kg)">
            <input type="number" className={INP} placeholder="e.g. 8"
              value={form.payload_min_kg ?? ""}
              onChange={e => patch({ payload_min_kg: e.target.value ? +e.target.value : null })} />
          </F>
          <F label="Max payload (kg)">
            <input type="number" className={INP} placeholder="e.g. 15"
              value={form.payload_max_kg ?? ""}
              onChange={e => patch({ payload_max_kg: e.target.value ? +e.target.value : null })} />
          </F>
          <F label="Min flight time (min)">
            <input type="number" className={INP} placeholder="e.g. 20"
              value={form.flight_time_min ?? ""}
              onChange={e => patch({ flight_time_min: e.target.value ? +e.target.value : null })} />
          </F>

          <span className="col-span-full text-[11px] text-white/25 uppercase tracking-wider mt-3">
            Environment
          </span>
          <F label="Terrain">
            <Sel value={form.terrain ?? ""} onChange={e => patch({ terrain: e.target.value || null })}>
              <option value="">Any</option>
              {TERRAIN_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
            </Sel>
          </F>
          <F label="Wind condition">
            <Sel value={form.wind_condition ?? ""} onChange={e => patch({ wind_condition: e.target.value || null })}>
              <option value="">Any</option>
              {WIND_OPTIONS.map(w => <option key={w} value={w}>{w}</option>)}
            </Sel>
          </F>

          <span className="col-span-full text-[11px] text-white/25 uppercase tracking-wider mt-3">
            Operations
          </span>
          <F label="Automation level">
            <Sel value={form.automation_level ?? ""} onChange={e => patch({ automation_level: e.target.value || null })}>
              <option value="">Any</option>
              {AUTOMATION_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
            </Sel>
          </F>
          <F label="Budget range">
            <Sel value={form.budget_range ?? ""} onChange={e => patch({ budget_range: e.target.value || null })}>
              <option value="">Any</option>
              {BUDGET_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
            </Sel>
          </F>
        </div>
      </div>

      {/* Block 3 */}
      <div className="bg-[#111c2e] border border-white/[0.07] rounded-xl p-5">
        <p className="text-[11px] uppercase tracking-widest text-white/40 font-medium mb-4">
          BLOCK 3 — Recommended components for above conditions
        </p>

        {/* Structure */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
          <span className="col-span-full text-[11px] text-white/25 uppercase tracking-wider">
            Structure
          </span>
          <F label="Frame size">
            <input type="text" className={INP} placeholder="e.g. 960mm"
              value={form.frame_size ?? ""}
              onChange={e => patch({ frame_size: e.target.value || null })} />
          </F>
          <F label="Motor class">
            <input type="text" className={INP} placeholder="e.g. Heavy-lift agricultural"
              value={form.motor_class ?? ""}
              onChange={e => patch({ motor_class: e.target.value || null })} />
          </F>
          <F label="ESC rating">
            <input type="text" className={INP} placeholder="e.g. 80A"
              value={form.esc_rating ?? ""}
              onChange={e => patch({ esc_rating: e.target.value || null })} />
          </F>
        </div>

        {/* Power & Navigation */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <span className="col-span-full text-[11px] text-white/25 uppercase tracking-wider mt-3">
            Power &amp; Navigation
          </span>
          <F label="Propeller size">
            <input type="text" className={INP} placeholder="e.g. 15 inch"
              value={form.propeller_size ?? ""}
              onChange={e => patch({ propeller_size: e.target.value || null })} />
          </F>
          <F label="Battery">
            <input type="text" className={INP} placeholder="e.g. 12S 22000mAh"
              value={form.battery ?? ""}
              onChange={e => patch({ battery: e.target.value || null })} />
          </F>
          <F label="Flight controller">
            <input type="text" className={INP} placeholder="e.g. Pixhawk 6C"
              value={form.flight_controller ?? ""}
              onChange={e => patch({ flight_controller: e.target.value || null })} />
          </F>
          <F label="GPS type">
            <Sel value={form.gps_type ?? ""} onChange={e => patch({ gps_type: e.target.value || null })}>
              <option value="">Select GPS</option>
              {GPS_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
            </Sel>
          </F>
        </div>

        {/* Payload & Cost */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <span className="col-span-full text-[11px] text-white/25 uppercase tracking-wider mt-3">
            Payload &amp; Cost
          </span>
          <F label="Payload system">
            <input type="text" className={INP} placeholder="e.g. Pressurised spray tank"
              value={form.payload_system ?? ""}
              onChange={e => patch({ payload_system: e.target.value || null })} />
          </F>
          <F label="Risk level">
            <Sel value={form.risk_level ?? "Safe"} onChange={e => patch({ risk_level: e.target.value })}>
              <option value="Safe">Safe</option>
              <option value="Warning">Warning</option>
              <option value="Unsafe">Unsafe</option>
            </Sel>
          </F>
          <F label="Min cost (₹)">
            <input type="number" className={INP} placeholder="e.g. 150000"
              value={form.cost_min_inr ?? ""}
              onChange={e => patch({ cost_min_inr: e.target.value ? +e.target.value : null })} />
          </F>
          <F label="Max cost (₹)">
            <input type="number" className={INP} placeholder="e.g. 250000"
              value={form.cost_max_inr ?? ""}
              onChange={e => patch({ cost_max_inr: e.target.value ? +e.target.value : null })} />
          </F>
        </div>
      </div>

      {/* Engineering notes & risk flags */}
      <div className="bg-[#14180f] border border-white/[0.07] rounded-xl p-5">
        <p className="text-[11px] uppercase tracking-widest text-white/40 font-medium mb-4">
          Engineering notes &amp; risk flags
        </p>
        <textarea
          className="w-full bg-white/[0.08] border border-white/[0.12] rounded-xl p-3 text-sm text-white placeholder-white/30 resize-none focus:outline-none focus:border-white/30 transition-colors"
          rows={3}
          placeholder="Explain why this configuration works for the above conditions. Include trade-offs, cautions, or field observations."
          value={form.engineering_notes ?? ""}
          onChange={e => patch({ engineering_notes: e.target.value || null })}
        />
        <div className="mt-3">
          <div className="flex flex-wrap gap-2 mb-2">
            {(form.risk_flags ?? []).map((flag, i) => (
              <span
                key={i}
                className="bg-red-500/15 border border-red-500/30 text-red-300 text-[12px] rounded-full px-3 py-1 inline-flex items-center gap-1.5"
              >
                {flag}
                <button
                  type="button"
                  onClick={() => patch({ risk_flags: form.risk_flags?.filter((_, j) => j !== i) })}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <input
            className={INP}
            placeholder="Type a risk flag and press Enter"
            value={flagInput}
            onChange={e => setFlagInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && flagInput.trim()) {
                e.preventDefault();
                patch({ risk_flags: [...(form.risk_flags ?? []), flagInput.trim()] });
                setFlagInput("");
              }
            }}
          />
        </div>
      </div>

      {/* Save bar */}
      <div className="border-t border-white/[0.08] pt-4 mt-2 flex items-center justify-between gap-4">
        <span className="text-[12px] text-white/40">
          Saving as: {engineerName} · {form.vertical} · {form.purpose}
        </span>
        {error && <span className="text-red-400 text-[12px]">{error}</span>}
        <button
          type="button"
          disabled={saving}
          onClick={async () => {
            if (!form.drone_type) {
              setError("Please select a drone type before saving.");
              return;
            }
            if (!form.purpose) {
              setError("Please select a purpose before saving.");
              return;
            }
            setError("");
            await onSave({ ...form, engineer_name: engineerName });
          }}
          className="bg-[#378ADD] text-white h-10 px-8 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity shrink-0"
        >
          {saving ? "Saving…" : isEditing ? "Update Rule" : "Save Rule"}
        </button>
      </div>
    </div>
  );
}
