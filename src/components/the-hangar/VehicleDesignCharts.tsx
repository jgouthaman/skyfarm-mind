import { useMemo, useState, type PointerEvent as ReactPointerEvent } from "react";
import { isFixedWing, type VehicleDesignOutput } from "./VehicleDesignReport";

// Bay 03 report charts, all computed from the backend JSON alone:
//   DragPolarCharts  -- drag polar (CD vs CL) and L/D vs CL from cd0/k/CLmax
//   WeightBySystem   -- component masses grouped by system, vs MTOW and limit
//   MarginsPanel     -- each design limit and how much headroom is left
//   FlightEnvelope   -- stall / best L/D / cruise / max speed band, climb, ceiling
//   ProvenancePanel  -- which backend stage produced each tracked value
// Colours: one series blue for single-series marks; the reference
// categorical order (validated on white) for the six systems.

const INK = "var(--vdr-ink,#12222F)";
const DIM = "var(--vdr-dim,#4F6B80)";
const GRID = "#E3E8EE";
const AXIS = "#C3CCD6";
const SERIES = "#2a78d6";
const AMBER = "var(--vdr-amber,#B4690E)";

// ── 1. Drag polar & L/D ──────────────────────────────────────────────────

interface PolarPoint {
  cl: number;
  cd: number;
  ld: number;
  vKmh: number;
}

export function DragPolarCharts({ d }: { d: VehicleDesignOutput }) {
  const a = d.aerodynamics;
  const rho = d.assumptions.air_density_kg_m3;
  const weightN = d.mass_properties.mtow_kg * d.assumptions.gravity_m_s2;
  const S = d.geometry.wing.area_m2;
  const speedAt = (cl: number) => Math.sqrt((2 * weightN) / (rho * S * cl)) * 3.6;

  const pts = useMemo(() => {
    const out: PolarPoint[] = [];
    for (let cl = 0.05; cl <= a.cl_max + 1e-9; cl += 0.01) {
      const cd = a.cd0 + a.k_induced * cl * cl;
      out.push({ cl, cd, ld: cl / cd, vKmh: speedAt(cl) });
    }
    return out;
  }, [a.cd0, a.k_induced, a.cl_max, weightN, rho, S]);

  const clBest = Math.sqrt(a.cd0 / a.k_induced);
  const ldBestModel = 1 / (2 * Math.sqrt(a.cd0 * a.k_induced));
  const cruise = { cl: a.cl_cruise, cd: a.cd0 + a.k_induced * a.cl_cruise ** 2 };
  const [hover, setHover] = useState<PolarPoint | null>(null);

  const nearestByCl = (cl: number) => pts.reduce((b, p) => (Math.abs(p.cl - cl) < Math.abs(b.cl - cl) ? p : b), pts[0]);

  return (
    <div className="vdc-polar">
      <div className="vdc-grid-2">
        <MiniChart
          title="Drag polar"
          xLabel="Drag coefficient CD"
          yLabel="CL"
          xs={pts.map((p) => p.cd)}
          ys={pts.map((p) => p.cl)}
          xDomain={[0, niceMax(Math.max(...pts.map((p) => p.cd)))]}
          yDomain={[0, niceMax(a.cl_max)]}
          hoverIndex={hover ? pts.indexOf(hover) : -1}
          onHoverX={null}
          onHoverY={(cl) => setHover(nearestByCl(cl))}
          onLeave={() => setHover(null)}
          marks={[
            { x: cruise.cd, y: cruise.cl, kind: "cruise", label: `cruise CL ${a.cl_cruise}` },
            { x: a.cd0 + a.k_induced * clBest ** 2, y: clBest, kind: "best", label: `best L/D` },
          ]}
          xFmt={(v) => v.toFixed(3)}
          yFmt={(v) => v.toFixed(1)}
        />
        <MiniChart
          title="Lift-to-drag ratio"
          xLabel="Lift coefficient CL"
          yLabel="L/D"
          xs={pts.map((p) => p.cl)}
          ys={pts.map((p) => p.ld)}
          xDomain={[0, niceMax(a.cl_max)]}
          yDomain={[0, niceMax(ldBestModel * 1.1)]}
          hoverIndex={hover ? pts.indexOf(hover) : -1}
          onHoverX={(cl) => setHover(nearestByCl(cl))}
          onHoverY={null}
          onLeave={() => setHover(null)}
          marks={[
            { x: a.cl_cruise, y: a.cl_cruise / cruise.cd, kind: "cruise", label: `cruise ${fmt(a.cl_cruise / cruise.cd, 1)}` },
            { x: clBest, y: ldBestModel, kind: "best", label: `max ${fmt(ldBestModel, 1)}` },
          ]}
          xFmt={(v) => v.toFixed(1)}
          yFmt={(v) => v.toFixed(0)}
        />
      </div>
      <div className="vdc-readout" aria-live="polite">
        {hover ? (
          <>
            CL <b>{fmt(hover.cl, 2)}</b> · CD <b>{fmt(hover.cd, 4)}</b> · L/D <b>{fmt(hover.ld, 1)}</b> · level-flight speed{" "}
            <b>{fmt(hover.vKmh, 0)} km/h</b>
            {hover.cl >= a.cl_max - 0.005 && <> (stall)</>}
          </>
        ) : (
          <>
            Best L/D <b>{fmt(ldBestModel, 1)}</b> at CL {fmt(clBest, 2)} (~{fmt(speedAt(clBest), 0)} km/h) · cruise L/D{" "}
            <b>{fmt(a.cl_cruise / cruise.cd, 1)}</b> at CL {a.cl_cruise} · backend reports {a.lift_to_drag_cruise} / max {a.lift_to_drag_max}. Hover for any point.
          </>
        )}
      </div>
      <p className="vdc-note">
        Parabolic polar CD = CD0 + k·CL² with CD0 {a.cd0}, k {a.k_induced}; speeds at MTOW {d.mass_properties.mtow_kg} kg, wing area {S} m², ρ {rho}.
      </p>
    </div>
  );
}

interface Mark {
  x: number;
  y: number;
  kind: "cruise" | "best";
  label: string;
}

function MiniChart(props: {
  title: string;
  xLabel: string;
  yLabel: string;
  xs: number[];
  ys: number[];
  xDomain: [number, number];
  yDomain: [number, number];
  hoverIndex: number;
  onHoverX: ((x: number) => void) | null;
  onHoverY: ((y: number) => void) | null;
  onLeave: () => void;
  marks: Mark[];
  xFmt: (v: number) => string;
  yFmt: (v: number) => string;
}) {
  const Wd = 520;
  const Ht = 300;
  const m = { l: 44, r: 16, t: 26, b: 40 };
  const sx = (x: number) => m.l + ((x - props.xDomain[0]) / (props.xDomain[1] - props.xDomain[0])) * (Wd - m.l - m.r);
  const sy = (y: number) => Ht - m.b - ((y - props.yDomain[0]) / (props.yDomain[1] - props.yDomain[0])) * (Ht - m.t - m.b);
  const path = props.xs.map((x, i) => `${i ? "L" : "M"}${sx(x).toFixed(1)},${sy(props.ys[i]).toFixed(1)}`).join(" ");
  const xt = ticks(props.xDomain);
  const yt = ticks(props.yDomain);
  const h = props.hoverIndex >= 0 ? { x: props.xs[props.hoverIndex], y: props.ys[props.hoverIndex] } : null;

  function onMove(e: ReactPointerEvent<SVGSVGElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * Wd;
    const py = ((e.clientY - r.top) / r.height) * Ht;
    if (props.onHoverX) {
      props.onHoverX(props.xDomain[0] + ((px - m.l) / (Wd - m.l - m.r)) * (props.xDomain[1] - props.xDomain[0]));
    } else if (props.onHoverY) {
      props.onHoverY(props.yDomain[0] + ((Ht - m.b - py) / (Ht - m.t - m.b)) * (props.yDomain[1] - props.yDomain[0]));
    }
  }

  return (
    <figure className="vdc-fig">
      <figcaption>{props.title}</figcaption>
      <svg viewBox={`0 0 ${Wd} ${Ht}`} className="vdc-svg" role="img" aria-label={`${props.title}: ${props.yLabel} against ${props.xLabel}`} onPointerMove={onMove} onPointerLeave={props.onLeave}>
        {yt.map((v) => (
          <g key={`y${v}`}>
            <line x1={m.l} x2={Wd - m.r} y1={sy(v)} y2={sy(v)} stroke={GRID} />
            <text x={m.l - 6} y={sy(v) + 4} textAnchor="end" className="vdc-tick">
              {props.yFmt(v)}
            </text>
          </g>
        ))}
        {xt.map((v) => (
          <text key={`x${v}`} x={sx(v)} y={Ht - m.b + 15} textAnchor="middle" className="vdc-tick">
            {props.xFmt(v)}
          </text>
        ))}
        <line x1={m.l} x2={Wd - m.r} y1={Ht - m.b} y2={Ht - m.b} stroke={AXIS} />
        <text x={(m.l + Wd - m.r) / 2} y={Ht - 4} textAnchor="middle" className="vdc-axis-label">
          {props.xLabel}
        </text>
        <text x={m.l} y={12} textAnchor="middle" className="vdc-axis-label">
          {props.yLabel}
        </text>
        <path d={path} fill="none" stroke={SERIES} strokeWidth={2} strokeLinejoin="round" />
        {props.marks.map((mk) => (
          <g key={mk.kind}>
            {mk.kind === "cruise" ? (
              <circle cx={sx(mk.x)} cy={sy(mk.y)} r={5} fill="#FFFFFF" stroke={AMBER} strokeWidth={2.5} />
            ) : (
              <path d={`M ${sx(mk.x) - 5} ${sy(mk.y)} l 5 -5 l 5 5 l -5 5 z`} fill={INK} stroke="#FFFFFF" strokeWidth={1.5} />
            )}
            <text x={sx(mk.x) + 8} y={sy(mk.y) + (mk.kind === "best" ? -8 : 14)} className="vdc-mark-label">
              {mk.label}
            </text>
          </g>
        ))}
        {h && (
          <g pointerEvents="none">
            <line x1={sx(h.x)} x2={sx(h.x)} y1={m.t} y2={Ht - m.b} stroke={DIM} strokeDasharray="3 3" />
            <line x1={m.l} x2={Wd - m.r} y1={sy(h.y)} y2={sy(h.y)} stroke={DIM} strokeDasharray="3 3" />
            <circle cx={sx(h.x)} cy={sy(h.y)} r={4.5} fill={SERIES} stroke="#FFFFFF" strokeWidth={2} />
          </g>
        )}
      </svg>
    </figure>
  );
}

// ── 3. Weight by system ──────────────────────────────────────────────────

// Also used by VehicleModelView's component layers, so a part has the same
// colour in the 3D view as in Weight by system.
export const SYSTEMS: { name: string; color: string; match: RegExp }[] = [
  { name: "Structure", color: "#2a78d6", match: /wing|fuselage|tail|gear|fastener|paint|finish|boom|frame|structure/i },
  { name: "Propulsion", color: "#eb6834", match: /motor|propeller|esc/i },
  { name: "Energy", color: "#1baf7a", match: /battery/i },
  { name: "Avionics & wiring", color: "#eda100", match: /controller|gps|receiver|telemetry|power module|bec|servo|wiring|avionic|sensor/i },
  { name: "Payload", color: "#e87ba4", match: /payload/i },
  { name: "Margin & other", color: "#008300", match: /.*/ },
];

export function systemOf(componentName: string) {
  return SYSTEMS.find((s) => s.match.test(componentName)) ?? SYSTEMS[SYSTEMS.length - 1];
}

export function WeightBySystem({ d }: { d: VehicleDesignOutput }) {
  const mp = d.mass_properties;
  const groups = useMemo(() => {
    const g = SYSTEMS.map((s) => ({ ...s, kg: 0, parts: [] as string[] }));
    for (const c of mp.component_breakdown) {
      if (c.mass_kg <= 0) continue;
      const i = SYSTEMS.findIndex((s) => s.match.test(c.name));
      g[i].kg += c.mass_kg;
      g[i].parts.push(`${c.name} ${fmt(c.mass_kg, 3)}`);
    }
    return g.filter((x) => x.kg > 0);
  }, [mp.component_breakdown]);
  const total = groups.reduce((s, g) => s + g.kg, 0);
  const limit = d.constraints.max_allowable_mtow_kg > 0 ? d.constraints.max_allowable_mtow_kg : null;
  const max = Math.max(limit ?? 0, total, mp.mtow_kg) * 1.06;
  const [hot, setHot] = useState<string | null>(null);

  const at = (kg: number) => `${(kg / max) * 100}%`;
  let acc = 0;

  return (
    <div className="vdc-weight">
      <div className="vdc-wbar-wrap" role="img" aria-label={`Mass by system: ${groups.map((g) => `${g.name} ${fmt(g.kg, 2)} kg`).join(", ")}`}>
        <div className="vdc-wbar-ticks">
          <span className="vdc-wbar-tick" style={{ left: at(mp.mtow_kg) }}>MTOW {fmt(mp.mtow_kg, 2)} kg</span>
          {limit !== null && <span className="vdc-wbar-tick" style={{ left: at(limit) }}>limit {fmt(limit, 1)} kg</span>}
        </div>
        <div className="vdc-wbar">
          {groups.map((g, i) => {
            const left = at(acc);
            acc += g.kg;
            return (
              <span
                key={g.name}
                className={`vdc-wseg${i === groups.length - 1 ? " vdc-wseg-last" : ""}`}
                style={{ left, width: `calc(${at(g.kg)} - ${i === groups.length - 1 ? 0 : 2}px)`, background: g.color, opacity: hot && hot !== g.name ? 0.35 : 1 }}
                title={`${g.name}: ${fmt(g.kg, 3)} kg (${fmt((g.kg / total) * 100, 0)}%) -- ${g.parts.join(", ")}`}
                onPointerEnter={() => setHot(g.name)}
                onPointerLeave={() => setHot(null)}
              />
            );
          })}
          <span className="vdc-wline" style={{ left: at(mp.mtow_kg) }} />
          {limit !== null && <span className="vdc-wline" style={{ left: at(limit) }} />}
        </div>
        <div className="vdc-wbar-total" style={{ left: at(total) }}>
          components {fmt(total, 2)} kg
        </div>
      </div>
      <table className="vdc-table">
        <thead>
          <tr>
            <th>System</th>
            <th className="vdc-num">kg</th>
            <th className="vdc-num">Share</th>
            <th>Parts</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((g) => (
            <tr key={g.name} className={hot === g.name ? "vdc-row-hot" : undefined} onPointerEnter={() => setHot(g.name)} onPointerLeave={() => setHot(null)}>
              <td>
                <span className="vdc-swatch" style={{ background: g.color }} />
                {g.name}
              </td>
              <td className="vdc-num">{fmt(g.kg, 3)}</td>
              <td className="vdc-num">{fmt((g.kg / total) * 100, 0)}%</td>
              <td className="vdc-parts">{g.parts.map((p) => p.replace(/ [\d.]+$/, "")).join(", ")}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {Math.abs(total - mp.mtow_kg) > mp.mtow_kg * 0.05 && (
        <p className="vdc-flag">
          ⚠ The components add up to {fmt(total, 2)} kg but MTOW is stated as {fmt(mp.mtow_kg, 2)} kg
          {limit !== null && total > limit ? `, and the components alone exceed the ${limit} kg limit` : ""} -- worth checking in the backend.
        </p>
      )}
    </div>
  );
}

// ── 4. Margins at a glance ───────────────────────────────────────────────

interface MarginRow {
  label: string;
  value: number;
  limit: number;
  unit: string;
  // "max": must stay at or below the limit; "min": at or above it.
  sense: "max" | "min";
  digits: number;
}

export function MarginsPanel({ d }: { d: VehicleDesignOutput }) {
  const c = d.constraints;
  const fw = isFixedWing(d);
  // A limit of 0 means the backend didn't set one -- no row for it.
  const rows: MarginRow[] = [
    { label: "MTOW", value: d.mass_properties.mtow_kg, limit: c.max_allowable_mtow_kg, unit: "kg", sense: "max" as const, digits: 2 },
    ...(fw ? [{ label: "Wingspan", value: d.geometry.wing.span_m, limit: c.max_wingspan_m, unit: "m", sense: "max" as const, digits: 2 }] : []),
    { label: "Battery reserve", value: d.energy.energy_reserve_pct, limit: c.battery_reserve_min_pct, unit: "%", sense: "min" as const, digits: 0 },
    { label: "Endurance", value: d.performance.endurance_min, limit: c.min_endurance_min, unit: "min", sense: "min" as const, digits: 0 },
    { label: "Range", value: d.performance.range_km, limit: c.min_range_km, unit: "km", sense: "min" as const, digits: 1 },
  ].filter((r) => r.limit > 0);
  const mp = d.mass_properties;
  const hasCgRange = mp.forward_cg_limit_x_m > 0 && mp.aft_cg_limit_x_m > mp.forward_cg_limit_x_m;
  const cgOk = mp.cg_x_m >= mp.forward_cg_limit_x_m && mp.cg_x_m <= mp.aft_cg_limit_x_m;
  const fwd = mp.cg_x_m - mp.forward_cg_limit_x_m;
  const aft = mp.aft_cg_limit_x_m - mp.cg_x_m;

  return (
    <div className="vdc-margins">
      {rows.map((r) => {
        const ok = r.sense === "max" ? r.value <= r.limit : r.value >= r.limit;
        const head = r.sense === "max" ? r.limit - r.value : r.value - r.limit;
        const pct = (head / r.limit) * 100;
        const max = Math.max(r.value, r.limit) * 1.25 || 1;
        return (
          <div key={r.label} className="vdc-margin-row" title={`${r.label}: ${fmt(r.value, r.digits)} ${r.unit}, ${r.sense === "max" ? "limit" : "minimum"} ${r.limit} ${r.unit}`}>
            <div className="vdc-margin-name">
              {r.label}
              <span>{r.sense === "max" ? `max ${r.limit} ${r.unit}` : `min ${r.limit} ${r.unit}`}</span>
            </div>
            <div className="vdc-track">
              <div className="vdc-fill" style={{ width: `${(r.value / max) * 100}%` }} />
              <div className="vdc-limit" style={{ left: `${(r.limit / max) * 100}%` }} />
            </div>
            <div className="vdc-margin-val">
              <b>
                {fmt(r.value, r.digits)} {r.unit}
              </b>
              <span>
                {ok ? "headroom" : "short by"} {fmt(Math.abs(head), r.digits === 0 ? 0 : r.digits)} {r.unit === "%" ? "pts" : r.unit} ({fmt(Math.abs(pct), 0)}%)
              </span>
            </div>
            <span className={`vdc-status vdc-status-${ok ? "ok" : "warn"}`}>
              <span aria-hidden>{ok ? "✓" : "⚠"}</span> {ok ? "Within" : r.sense === "max" ? "Over" : "Under"}
            </span>
          </div>
        );
      })}
      {rows.length === 0 && !hasCgRange && <p className="vdc-note">The design sets no limits to compare against.</p>}
      {hasCgRange && (
      <div className="vdc-margin-row" title={`CG ${mp.cg_x_m} m, allowed ${mp.forward_cg_limit_x_m}–${mp.aft_cg_limit_x_m} m`}>
        <div className="vdc-margin-name">
          CG position
          <span>
            {mp.forward_cg_limit_x_m}–{mp.aft_cg_limit_x_m} m
          </span>
        </div>
        <div className="vdc-track vdc-track-range">
          {(() => {
            const lo = mp.forward_cg_limit_x_m - (mp.aft_cg_limit_x_m - mp.forward_cg_limit_x_m) * 0.6;
            const hi = mp.aft_cg_limit_x_m + (mp.aft_cg_limit_x_m - mp.forward_cg_limit_x_m) * 0.6;
            const at = (x: number) => `${((x - lo) / (hi - lo)) * 100}%`;
            return (
              <>
                <div className="vdc-range" style={{ left: at(mp.forward_cg_limit_x_m), width: `calc(${at(mp.aft_cg_limit_x_m)} - ${at(mp.forward_cg_limit_x_m)})` }} />
                <div className="vdc-cg-dot" style={{ left: at(mp.cg_x_m) }} />
              </>
            );
          })()}
        </div>
        <div className="vdc-margin-val">
          <b>{fmt(mp.cg_x_m, 3)} m</b>
          <span>
            {fmt(fwd * 1000, 0)} mm from fwd · {fmt(aft * 1000, 0)} mm from aft
          </span>
        </div>
        <span className={`vdc-status vdc-status-${cgOk ? "ok" : "warn"}`}>
          <span aria-hidden>{cgOk ? "✓" : "⚠"}</span> {cgOk ? "Within" : "Outside"}
        </span>
      </div>
      )}
      <p className="vdc-note">Bars show the design value; the black tick is the limit from the mission constraints.</p>
    </div>
  );
}

// ── 2. Flight envelope ───────────────────────────────────────────────────

interface SpeedMark {
  key: string;
  label: string;
  kmh: number;
  // limit: a speed bound (stall, max); op: where it flies (cruise, hover);
  // best: an optimum computed here from the polar.
  kind: "limit" | "op" | "best";
  from: string;
}

interface EnvelopeFinding {
  ok: boolean;
  text: string;
}

export function FlightEnvelope({ d }: { d: VehicleDesignOutput }) {
  const p = d.performance;
  const a = d.aerodynamics;
  const fw = isFixedWing(d);
  const [hot, setHot] = useState<string | null>(null);

  const { marks, findings } = useMemo(() => {
    const marks: SpeedMark[] = [];
    const findings: EnvelopeFinding[] = [];
    const stall = pos(p.stall_speed_kmh) ? p.stall_speed_kmh : pos(a?.stall_speed_clean_mps) ? a.stall_speed_clean_mps * 3.6 : 0;
    const rho = d.assumptions?.air_density_kg_m3;
    const S = d.geometry?.wing?.area_m2;
    const weightN = d.mass_properties.mtow_kg * (d.assumptions?.gravity_m_s2 || 9.81);
    const vAt = (cl: number) => Math.sqrt((2 * weightN) / (rho * S * cl)) * 3.6;
    const polar = fw && pos(a?.cd0) && pos(a?.k_induced) && pos(rho) && pos(S) && pos(weightN);

    if (!fw) marks.push({ key: "hover", label: "Hover", kmh: 0, kind: "op", from: "multirotor -- zero airspeed" });
    if (fw && stall) marks.push({ key: "stall", label: "Stall", kmh: stall, kind: "limit", from: "performance.stall_speed_kmh" });
    if (polar) {
      const vMd = vAt(Math.sqrt(a.cd0 / a.k_induced));
      const vMp = vAt(Math.sqrt((3 * a.cd0) / a.k_induced));
      marks.push({ key: "endurance", label: "Best endurance", kmh: vMp, kind: "best", from: "polar -- minimum power, CL = √(3·CD0/k)" });
      marks.push({ key: "ld", label: "Best L/D", kmh: vMd, kind: "best", from: "polar -- minimum drag, CL = √(CD0/k)" });
      if (stall) {
        findings.push(
          vMd >= stall
            ? { ok: true, text: `Best L/D (${fmt(vMd, 0)} km/h) is above stall -- the polar and stall speed agree.` }
            : { ok: false, text: `Best L/D works out at ${fmt(vMd, 0)} km/h, below the ${fmt(stall, 0)} km/h stall speed -- the polar (CD0, k) and CLmax / stall figures don't agree.` },
        );
      }
      if (stall && pos(a.cl_max)) {
        const vClmax = vAt(a.cl_max);
        if (Math.abs(vClmax - stall) > stall * 0.1) {
          findings.push({ ok: false, text: `CLmax ${a.cl_max} gives a stall speed of ${fmt(vClmax, 0)} km/h at MTOW, but the design states ${fmt(stall, 0)} km/h.` });
        }
      }
    }
    if (pos(p.cruise_speed_kmh)) marks.push({ key: "cruise", label: "Cruise", kmh: p.cruise_speed_kmh, kind: "op", from: "performance.cruise_speed_kmh" });
    if (pos(p.max_speed_kmh)) marks.push({ key: "max", label: "Max speed", kmh: p.max_speed_kmh, kind: "limit", from: "performance.max_speed_kmh" });

    if (fw && stall && pos(p.cruise_speed_kmh)) {
      const r = p.cruise_speed_kmh / stall;
      findings.push({ ok: r >= 1.3, text: `Cruise is ${fmt(r, 2)}× stall speed${r >= 1.3 ? "" : " -- under the usual 1.3× minimum"}.` });
    }
    if (pos(p.cruise_speed_kmh) && pos(p.max_speed_kmh)) {
      const head = (p.max_speed_kmh / p.cruise_speed_kmh - 1) * 100;
      findings.push(
        head >= 0
          ? { ok: true, text: `Max speed leaves ${fmt(head, 0)}% over cruise.` }
          : { ok: false, text: `Cruise (${fmt(p.cruise_speed_kmh, 0)} km/h) is above the max speed (${fmt(p.max_speed_kmh, 0)} km/h).` },
      );
    }
    marks.sort((x, y) => x.kmh - y.kmh);
    return { marks, findings };
  }, [d, fw]);

  if (marks.length < 2) return <p className="vdc-note">The design gives too few speeds to draw an envelope.</p>;

  const top = niceMax(Math.max(...marks.map((m) => m.kmh)) * 1.08);
  const at = (kmh: number) => `${(Math.max(0, kmh) / top) * 100}%`;
  const stall = marks.find((m) => m.key === "stall")?.kmh ?? 0;
  const maxV = marks.find((m) => m.key === "max")?.kmh ?? Math.max(...marks.map((m) => m.kmh));
  // Stack labels that would collide into rows (positions are % of the axis).
  const rowOf = new Map<string, number>();
  const lastInRow: number[] = [];
  for (const m of marks) {
    const x = (m.kmh / top) * 100;
    let r = lastInRow.findIndex((last) => x - last > 17);
    if (r < 0) r = lastInRow.length;
    lastInRow[r] = x;
    rowOf.set(m.key, r);
  }
  const rows = Math.max(1, lastInRow.length);
  const alt = p.cruise_altitude_m;
  const ceiling = p.service_ceiling_m;

  return (
    <div className="vdc-env">
      <div className="vdc-env-plot" style={{ paddingTop: rows * 20 + 6 }} role="img" aria-label={`Speed envelope: ${marks.map((m) => `${m.label} ${fmt(m.kmh, 0)} km/h`).join(", ")}`}>
        {marks.map((m) => (
          <span
            key={`l-${m.key}`}
            className={`vdc-env-label${hot === m.key ? " vdc-env-label-hot" : ""}`}
            style={{ left: at(m.kmh), top: (rowOf.get(m.key) ?? 0) * 20, transform: m.kmh / top < 0.06 ? "translateX(-6px)" : undefined }}
            onPointerEnter={() => setHot(m.key)}
            onPointerLeave={() => setHot(null)}
          >
            {m.label} <b>{fmt(m.kmh, 0)}</b>
          </span>
        ))}
        <div className="vdc-env-track">
          {stall > 0 && <div className="vdc-env-below" style={{ width: at(stall) }} title={`Below stall: under ${fmt(stall, 0)} km/h`} />}
          <div className="vdc-env-band" style={{ left: at(stall), width: `calc(${at(maxV)} - ${at(stall)})` }} title={`Flyable: ${fmt(stall, 0)}–${fmt(maxV, 0)} km/h`} />
          {marks.map((m) => (
            <span
              key={`m-${m.key}`}
              className={`vdc-env-mark vdc-env-${m.kind}${hot === m.key ? " vdc-env-mark-hot" : ""}`}
              style={{ left: at(m.kmh) }}
              title={`${m.label}: ${fmt(m.kmh, 0)} km/h (${fmt(m.kmh / 3.6, 1)} m/s) -- ${m.from}`}
              onPointerEnter={() => setHot(m.key)}
              onPointerLeave={() => setHot(null)}
            />
          ))}
        </div>
        <div className="vdc-env-axis">
          {ticks([0, top]).map((v) => (
            <span key={v} style={{ left: at(v) }}>
              {v}
            </span>
          ))}
        </div>
        <div className="vdc-env-unit">km/h</div>
      </div>

      <div className="vdc-env-alt">
        {pos(p.climb_rate_max_mps) && (
          <span>
            Max climb <b>{fmt(p.climb_rate_max_mps, 1)} m/s</b>
            {pos(alt) && <> · reaches cruise altitude {fmt(alt, 0)} m in about {fmt(alt / p.climb_rate_max_mps, 0)} s</>}
          </span>
        )}
        {pos(ceiling) && (
          <span>
            Service ceiling <b>{fmt(ceiling, 0)} m</b>
            {pos(alt) && <> · cruise altitude is {fmt((alt / ceiling) * 100, 0)}% of it</>}
          </span>
        )}
        {!fw && pos(p.hover_endurance_min) && (
          <span>
            Hover endurance <b>{fmt(p.hover_endurance_min, 0)} min</b>
          </span>
        )}
      </div>

      {findings.length > 0 && (
        <ul className="vdc-env-findings">
          {findings.map((f) => (
            <li key={f.text} className={f.ok ? "vdc-env-ok" : "vdc-env-warn"}>
              <span aria-hidden>{f.ok ? "✓" : "⚠"}</span> {f.text}
            </li>
          ))}
        </ul>
      )}

      <table className="vdc-table">
        <thead>
          <tr>
            <th>Point</th>
            <th className="vdc-num">km/h</th>
            <th className="vdc-num">m/s</th>
            <th>From</th>
          </tr>
        </thead>
        <tbody>
          {marks.map((m) => (
            <tr key={m.key} className={hot === m.key ? "vdc-row-hot" : undefined} onPointerEnter={() => setHot(m.key)} onPointerLeave={() => setHot(null)}>
              <td>
                <span className={`vdc-env-key vdc-env-${m.kind}`} />
                {m.label}
              </td>
              <td className="vdc-num">{fmt(m.kmh, 0)}</td>
              <td className="vdc-num">{fmt(m.kmh / 3.6, 1)}</td>
              <td className="vdc-parts">{m.kind === "best" ? `Computed here from the ${m.from}` : m.key === "hover" ? "Zero airspeed (multirotor hover)" : `Backend · ${m.from}`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── 7. Provenance ────────────────────────────────────────────────────────

interface ProvRow {
  key: string;
  stage: string;
  field: string;
  value: string;
  kind: string;
  check: { ok: boolean | null; text: string };
  note?: string;
}

// Where each provenance field lives in the design, when its name differs
// from the design key. Unlisted fields are found by key name.
const FIELD_PATHS: Record<string, string> = {
  empty_weight_kg: "mass_properties.empty_mass_kg",
  static_margin_pct: "stability.static_margin_mac_pct",
  wing_area_m2: "geometry.wing.area_m2",
  wingspan_m: "geometry.wing.span_m",
  cruise_power_w: "propulsion.cruise_propulsion.cruise_power_electrical_w",
};

const KIND_LABEL: [RegExp, string][] = [
  [/REQUIRE/i, "Requirement"],
  [/CALC/i, "Calculated"],
  [/DERIV/i, "Derived"],
  [/ASSUM|ESTIM|DEFAULT/i, "Assumed"],
  [/DEFER|PENDING|UNRESOLV/i, "Deferred"],
];

function kindLabel(k: string | undefined) {
  if (!k) return "Unstated";
  return KIND_LABEL.find(([re]) => re.test(k))?.[1] ?? humanize(k.toLowerCase());
}

function lookup(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), obj);
}

function findKey(obj: unknown, key: string, depth = 0): unknown {
  if (!obj || typeof obj !== "object" || depth > 4) return undefined;
  for (const [k, v] of Object.entries(obj)) {
    if (k === "provenance" || k === "requirement_traceability") continue;
    if (k === key && typeof v === "number") return v;
    const hit = findKey(v, key, depth + 1);
    if (hit !== undefined) return hit;
  }
  return undefined;
}

export function ProvenancePanel({ d }: { d: VehicleDesignOutput }) {
  const rows = useMemo(() => {
    const out: ProvRow[] = [];
    for (const [name, e] of Object.entries(d.provenance ?? {})) {
      if (!e || typeof e !== "object") continue;
      const unit = e.unit === "m2" ? "m²" : (e.unit ?? "");
      const actual = FIELD_PATHS[name] ? lookup(d, FIELD_PATHS[name]) : findKey(d, name);
      let check: ProvRow["check"] = { ok: null, text: "not found in the design" };
      if (typeof e.value === "number" && typeof actual === "number") {
        const same = Math.abs(actual - e.value) <= Math.max(1e-6, Math.abs(e.value) * 0.01);
        check = same ? { ok: true, text: "matches the design" } : { ok: false, text: `design says ${+actual.toFixed(4)} ${unit}` };
      } else if (e.value == null) {
        check = { ok: null, text: e.status ?? "no value" };
      }
      out.push({
        key: `f-${name}`,
        stage: e.source_module || "Unstated",
        field: humanize(e.field_name ?? name),
        value: e.value == null ? "—" : `${typeof e.value === "number" ? +e.value.toFixed(4) : e.value} ${unit}`.trim(),
        kind: kindLabel(e.provenance),
        check,
        note: e.reason ?? e.notes ?? undefined,
      });
    }
    for (const r of d.requirement_traceability ?? []) {
      const numeric = typeof r.required_value === "number";
      const sense = r.limit === "MIN" ? "≥" : r.limit === "MAX" ? "≤" : "=";
      out.push({
        key: `r-${r.requirement}`,
        stage: r.source_module || "Unstated",
        field: `${r.requirement} (requirement)`,
        value: numeric ? `${r.design_value} ${r.unit} · needs ${sense} ${r.required_value}` : String(r.design_value),
        kind: kindLabel(r.provenance),
        check: { ok: /PASS|VALID|RESOLVED/i.test(r.status) ? true : /DEFER/i.test(r.status) ? null : false, text: r.status },
      });
    }
    return out.sort((x, y) => x.stage.localeCompare(y.stage));
  }, [d]);

  const parts = d.mass_properties.component_breakdown ?? [];
  const partKinds = new Map<string, number>();
  for (const c of parts) partKinds.set(kindLabel(c.provenance), (partKinds.get(kindLabel(c.provenance)) ?? 0) + 1);
  const kinds = new Map<string, number>();
  for (const r of rows) kinds.set(r.kind, (kinds.get(r.kind) ?? 0) + 1);
  const stages = new Set(rows.map((r) => r.stage));
  const mismatches = rows.filter((r) => r.check.ok === false && r.key.startsWith("f-")).length;

  if (rows.length === 0) return <p className="vdc-note">This design carries no provenance records.</p>;

  return (
    <div className="vdc-prov">
      <p className="vdc-prov-sum">
        <b>{rows.length}</b> tracked values from <b>{stages.size}</b> backend stages ·{" "}
        {[...kinds].map(([k, n]) => `${n} ${k.toLowerCase()}`).join(", ")}
        {parts.length > 0 && <> · component masses: {[...partKinds].map(([k, n]) => `${n} ${k.toLowerCase()}`).join(", ")}</>}
      </p>
      {mismatches > 0 && <p className="vdc-flag">⚠ {mismatches} provenance value{mismatches > 1 ? "s differ" : " differs"} from the number the design itself reports -- worth checking in the backend.</p>}
      <div className="vdr-table-wrap">
        <table className="vdc-table">
          <thead>
            <tr>
              <th>Backend stage</th>
              <th>Value</th>
              <th className="vdc-num">Figure</th>
              <th>Kind</th>
              <th>Check</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.key} className={i > 0 && rows[i - 1].stage === r.stage ? "vdc-prov-cont" : undefined}>
                <td className="vdc-prov-stage">{i > 0 && rows[i - 1].stage === r.stage ? "" : r.stage}</td>
                <td>
                  {r.field}
                  {r.note && <div className="vdc-parts">{r.note}</div>}
                </td>
                <td className="vdc-num">{r.value}</td>
                <td>
                  <span className={`vdc-kind${r.kind === "Deferred" ? " vdc-kind-deferred" : r.kind === "Requirement" ? " vdc-kind-req" : ""}`}>{r.kind}</span>
                </td>
                <td className={r.check.ok === false ? "vdc-prov-bad" : "vdc-parts"}>
                  {r.check.ok === true ? "✓ " : r.check.ok === false ? "⚠ " : ""}
                  {r.check.text}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="vdc-note">From the backend's provenance and requirement-traceability records. Requirement = taken from the mission; calculated = sized by that stage; derived = follows from other values.</p>
    </div>
  );
}

// ── helpers ──────────────────────────────────────────────────────────────

function pos(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && v > 0;
}

function humanize(k: string) {
  const s = k.replace(/_/g, " ").replace(/\b(kg|m|m2|pct|w|mps|kmh)$/i, "").trim();
  return (s.charAt(0).toUpperCase() + s.slice(1)).replace(/\b(cg|mtow|esc|mac)\b/gi, (w) => w.toUpperCase());
}

function niceCeil(v: number) {
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}

// Round a maximum up to a tick step (about five ticks), not to the next decade.
function niceMax(v: number) {
  const step = niceCeil(v / 5);
  return Math.ceil(v / step - 1e-9) * step;
}

function ticks([lo, hi]: [number, number]) {
  const step = niceCeil((hi - lo) / 5);
  const out: number[] = [];
  for (let v = lo; v <= hi + step * 1e-6; v += step) out.push(Math.round(v / step) * step);
  return out;
}

function fmt(n: number, digits: number) {
  return Number.isFinite(n) ? n.toFixed(digits) : "—";
}

export const VDC_CSS = `
.vdc-grid-2{ display:grid; grid-template-columns:repeat(auto-fit,minmax(280px,1fr)); gap:12px; }
.vdc-fig{ margin:0; }
.vdc-fig figcaption{ font-family:'IBM Plex Mono',monospace; font-size:11px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:${DIM}; margin-bottom:4px; }
.vdc-svg{ width:100%; height:auto; display:block; touch-action:none; }
.vdc-tick{ font-family:'IBM Plex Mono',monospace; font-size:10.5px; fill:${DIM}; font-variant-numeric:tabular-nums; }
.vdc-axis-label{ font-family:'IBM Plex Mono',monospace; font-size:11px; fill:${DIM}; }
.vdc-mark-label{ font-family:'IBM Plex Mono',monospace; font-size:11px; fill:${INK}; }
.vdc-readout{ font-size:12.5px; color:${DIM}; min-height:1.6em; margin-top:6px; }
.vdc-readout b{ color:${INK}; font-variant-numeric:tabular-nums; }
.vdc-note{ margin:6px 0 0; font-size:11.5px; color:${DIM}; }
.vdc-flag{ margin:8px 0 0; font-size:12.5px; color:#A35F00; background:#FCF1E0; border:1px solid #EFD3A6; padding:7px 10px; }
.vdc-wbar-wrap{ position:relative; padding:22px 0 22px; }
.vdc-wbar-ticks{ position:absolute; top:0; left:0; right:0; height:18px; }
.vdc-wbar-tick{ position:absolute; transform:translateX(-50%); font-family:'IBM Plex Mono',monospace; font-size:11.5px; color:${INK}; white-space:nowrap; }
.vdc-wbar{ position:relative; height:22px; background:#EEF3F8; border-radius:0 4px 4px 0; }
.vdc-wseg{ position:absolute; top:0; bottom:0; transition:opacity .12s; }
.vdc-wseg-last{ border-radius:0 4px 4px 0; }
.vdc-wline{ position:absolute; top:-6px; bottom:-6px; width:2px; margin-left:-1px; background:${INK}; pointer-events:none; }
.vdc-wbar-total{ position:absolute; bottom:0; transform:translateX(-100%); font-family:'IBM Plex Mono',monospace; font-size:11px; color:${DIM}; white-space:nowrap; }
.vdc-table{ width:100%; border-collapse:collapse; font-size:12.5px; margin-top:8px; }
.vdc-table th{ text-align:left; font-family:'IBM Plex Mono',monospace; font-size:10.5px; letter-spacing:.06em; text-transform:uppercase; color:${DIM}; padding:6px 8px; border-bottom:1px solid ${AXIS}; }
.vdc-table td{ padding:6px 8px; border-bottom:1px dashed ${GRID}; vertical-align:top; }
.vdc-row-hot td{ background:#F2F7FB; }
.vdc-num{ text-align:right; font-variant-numeric:tabular-nums; white-space:nowrap; }
.vdc-parts{ color:${DIM}; font-size:12px; }
.vdc-swatch{ display:inline-block; width:10px; height:10px; border-radius:2px; margin-right:8px; vertical-align:-1px; }
.vdc-margins{ display:flex; flex-direction:column; gap:10px; }
.vdc-margin-row{ display:grid; grid-template-columns:minmax(120px,1fr) 2fr minmax(150px,auto) auto; gap:12px; align-items:center; }
.vdc-margin-name{ font-size:13.5px; font-weight:600; display:flex; flex-direction:column; }
.vdc-margin-name span{ font-size:11px; font-weight:400; color:${DIM}; }
.vdc-track{ position:relative; height:12px; background:#EEF3F8; border-radius:0 4px 4px 0; }
.vdc-fill{ position:absolute; left:0; top:0; bottom:0; background:${SERIES}; border-radius:0 4px 4px 0; }
.vdc-limit{ position:absolute; top:-5px; bottom:-5px; width:2px; margin-left:-1px; background:${INK}; }
.vdc-track-range{ border-radius:4px; }
.vdc-range{ position:absolute; top:0; bottom:0; background:#CFE5D8; border:1px solid #9CCBB0; border-radius:3px; }
.vdc-cg-dot{ position:absolute; top:50%; width:12px; height:12px; margin:-6px 0 0 -6px; border-radius:50%; background:#FFFFFF; border:2.5px solid ${AMBER}; box-sizing:border-box; }
.vdc-margin-val{ display:flex; flex-direction:column; font-size:12.5px; font-variant-numeric:tabular-nums; }
.vdc-margin-val span{ color:${DIM}; font-size:11.5px; }
.vdc-status{ display:inline-flex; align-items:center; gap:5px; font-family:'IBM Plex Mono',monospace; font-size:11px; font-weight:700; padding:3px 9px; border-radius:2px; white-space:nowrap; }
.vdc-status-ok{ color:#2E7D4F; background:#E6F4EC; border:1px solid #B9DEC8; }
.vdc-status-warn{ color:#A35F00; background:#FCF1E0; border:1px solid #EFD3A6; }
.vdc-env-plot{ position:relative; margin:0 24px 0 8px; }
.vdc-env-label{ position:absolute; transform:translateX(-50%); font-family:'IBM Plex Mono',monospace; font-size:11px; color:${DIM}; white-space:nowrap; cursor:default; }
.vdc-env-label b{ color:${INK}; font-variant-numeric:tabular-nums; }
.vdc-env-label-hot{ color:${INK}; }
.vdc-env-track{ position:relative; height:20px; background:#EEF3F8; border-radius:0 4px 4px 0; }
.vdc-env-below{ position:absolute; left:0; top:0; bottom:0; background:repeating-linear-gradient(135deg,#E3E8EE 0 4px,#F6F8FA 4px 8px); }
.vdc-env-band{ position:absolute; top:0; bottom:0; background:#CFE5D8; border:1px solid #9CCBB0; border-radius:3px; box-sizing:border-box; }
.vdc-env-mark{ position:absolute; top:50%; cursor:default; }
.vdc-env-limit{ width:2px; height:30px; margin:-15px 0 0 -1px; background:${INK}; }
.vdc-env-op{ width:12px; height:12px; margin:-6px 0 0 -6px; border-radius:50%; background:#FFFFFF; border:2.5px solid ${AMBER}; box-sizing:border-box; }
.vdc-env-best{ width:10px; height:10px; margin:-5px 0 0 -5px; background:${INK}; border:1.5px solid #FFFFFF; transform:rotate(45deg); }
.vdc-env-mark-hot{ outline:2px solid ${SERIES}; outline-offset:2px; }
.vdc-env-axis{ position:relative; height:18px; margin-top:6px; }
.vdc-env-axis span{ position:absolute; transform:translateX(-50%); font-family:'IBM Plex Mono',monospace; font-size:10.5px; color:${DIM}; font-variant-numeric:tabular-nums; }
.vdc-env-unit{ text-align:right; font-family:'IBM Plex Mono',monospace; font-size:11px; color:${DIM}; margin-right:-24px; }
.vdc-env-alt{ display:flex; flex-wrap:wrap; gap:6px 22px; font-size:12.5px; color:${DIM}; margin-top:8px; }
.vdc-env-alt b{ color:${INK}; font-variant-numeric:tabular-nums; }
.vdc-env-findings{ list-style:none; margin:10px 0 0; padding:0; display:flex; flex-direction:column; gap:4px; font-size:12.5px; }
.vdc-env-ok{ color:#2E7D4F; }
.vdc-env-warn{ color:#A35F00; }
.vdc-env-key{ display:inline-block; position:relative; vertical-align:-1px; margin-right:9px; }
.vdc-env-key.vdc-env-limit{ height:12px; margin-top:0; margin-left:4px; margin-right:12px; }
.vdc-env-key.vdc-env-op, .vdc-env-key.vdc-env-best{ margin-top:0; margin-left:0; }
.vdc-prov-sum{ margin:0 0 6px; font-size:12.5px; color:${DIM}; }
.vdc-prov-sum b{ color:${INK}; }
.vdc-prov-stage{ font-family:'IBM Plex Mono',monospace; font-size:11.5px; color:${INK}; word-break:break-word; }
.vdc-prov-cont td{ border-top:0; }
.vdc-prov-bad{ color:#A35F00; font-size:12px; }
.vdc-kind{ display:inline-block; font-family:'IBM Plex Mono',monospace; font-size:10.5px; padding:1px 7px; border:1px solid ${AXIS}; border-radius:2px; color:${DIM}; white-space:nowrap; }
.vdc-kind-req{ border-color:#9DBFE8; color:#1F5FA8; }
.vdc-kind-deferred{ color:#A35F00; background:#FCF1E0; border-color:#EFD3A6; }
@media (max-width:640px){
  .vdc-margin-row{ grid-template-columns:1fr auto; }
  .vdc-track{ grid-column:1 / -1; }
}
`;
