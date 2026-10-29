import { useMemo, useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Bay 03 (Vehicle Design) result view for the Python backend's output: the
// final_aircraft_design.json (drives every visual here) and the matching
// .md report (shown as-is in the Report tab). Only the fields this view
// reads are typed; the JSON tab shows everything.

type Vec3 = [number, number, number];

export interface VehicleDesignOutput {
  design_id: string;
  aircraft_class: string;
  configuration: string;
  design_status: string;
  mission: { mission_type: string; payload_kg: number; cruise_speed_kmh: number; target_flight_time_min: number; target_range_km: number };
  requirement_traceability: {
    requirement: string;
    required_value: number;
    design_value: number;
    margin: number;
    limit: string;
    unit: string;
    status: string;
    provenance: string;
    source_module: string;
  }[];
  constraints: { max_allowable_mtow_kg: number; max_wingspan_m: number; battery_reserve_min_pct: number; min_endurance_min: number; min_range_km: number };
  mass_properties: {
    mtow_kg: number;
    empty_mass_kg: number;
    payload_mass_kg: number;
    battery_mass_kg: number;
    cg_x_m: number;
    forward_cg_limit_x_m: number;
    aft_cg_limit_x_m: number;
    cg_margin_m: number;
    component_breakdown: { name: string; mass_kg: number; x_cg_m: number; provenance: string }[];
    inertia: { status: string; reason: string | null };
  };
  aerodynamics: { cl_cruise: number; cl_max: number; cd0: number; cd_cruise: number; k_induced: number; lift_to_drag_cruise: number; lift_to_drag_max: number; stall_speed_clean_mps: number; reynolds_number_cruise: number; trim_alpha_cruise_deg: number };
  assumptions: { air_density_kg_m3: number; gravity_m_s2: number };
  geometry: {
    wing: { span_m: number; area_m2: number; aspect_ratio: number; root_chord_m: number; tip_chord_m: number; taper_ratio: number; mac_m: number; mac_le_x_m: number; sweep_deg: number; dihedral_deg: number; airfoil_root: string; airfoil_tip: string; spar_locations_chord_pct: number[] };
    fuselage: { length_m: number; max_width_m: number; max_height_m: number; fineness_ratio: number };
    tail: { tail_type: string; span_m: number; root_chord_m: number; tip_chord_m: number; airfoil: string; total_area_m2: number };
  };
  cad_handover: { mounting_coordinates: Record<string, Vec3>; component_envelopes: { component: string; location_m: Vec3 }[]; reference_datum: string; coordinate_system: { axis_conventions: string } };
  propulsion: { cruise_propulsion: { motor_model: string; motor_count: number; propeller_model: string; propeller_diameter_in: number; propeller_pitch_in: number; esc_model: string; esc_rating_a: number; cruise_power_electrical_w: number; cruise_thrust_per_motor_n: number; max_thrust_per_motor_n: number }; total_installed_power_w: number };
  battery: { pack_model: string; chemistry: string; cell_series_count: number; capacity_mah: number; energy_wh: number; voltage_nominal_v: number; mass_kg: number; max_continuous_current_a: number };
  energy: { energy_required_mission_wh: number; total_energy_stored_wh: number; energy_reserve_pct: number; cruise_energy_wh: number; avionics_energy_wh: number };
  electrical: { main_bus_voltage_v: number; avionics_bus_voltage_v: number; power_module: string };
  performance: { cruise_speed_kmh: number; cruise_speed_mps: number; endurance_min: number; range_km: number; max_speed_kmh: number; stall_speed_kmh: number; climb_rate_max_mps: number; service_ceiling_m: number; cruise_altitude_m: number };
  stability: { neutral_point_x_m: number; neutral_point_mac_pct: number; static_margin_mac_pct: number; c_m_alpha_per_rad: number; c_n_beta_per_rad: number; c_l_beta_per_rad: number; is_longitudinally_stable: boolean; is_directionally_stable: boolean; is_laterally_stable: boolean };
  controls: { trim_feasible: boolean; trim_elevator_cruise_deg: number; c_m_delta_e_per_rad: number };
  commercial_components: { category: string; role: string; manufacturer: string; model: string; part_number: string | null; quantity: number; mass_per_unit_kg: number; total_mass_kg: number; verification_status: string }[];
  avionics: Record<string, string>;
  manufacturing: Record<string, string>;
  installation: Record<string, string>;
  validation_status: { design_validated: boolean; flight_validated: boolean; physical_ground_validated: boolean; flight_status_note: string; status: string };
}

type Tab = "visual" | "report" | "json";

export function VehicleDesignReport({
  design,
  markdown,
  banner,
}: {
  design: VehicleDesignOutput;
  markdown: string;
  banner?: ReactNode;
}) {
  const [tab, setTab] = useState<Tab>("visual");
  const d = design;
  const v = d.validation_status;

  return (
    <div className="vdr">
      <style>{VDR_CSS}</style>
      {banner}
      <header className="vdr-head">
        <div className="vdr-head-main">
          <div className="vdr-kicker">Vehicle design · {d.mission.mission_type}</div>
          <div className="vdr-id">{d.design_id}</div>
          <div className="vdr-config">{d.configuration}</div>
          <div className="vdr-chips">
            <span className="vdr-chip">{d.aircraft_class.replace(/_/g, " ")}</span>
            <StatusChip ok={v.design_validated} label={v.design_validated ? "Design validated" : "Design not validated"} />
            <StatusChip ok={v.physical_ground_validated} label={v.physical_ground_validated ? "Ground validated" : "Not ground validated"} />
            <StatusChip ok={v.flight_validated} label={v.flight_validated ? "Flight validated" : "Not flight validated"} />
          </div>
        </div>
        <div className="vdr-downloads">
          <DownloadButton name={`${d.design_id}.md`} type="text/markdown" body={markdown} label="Download .md" />
          <DownloadButton name={`${d.design_id}.json`} type="application/json" body={JSON.stringify(d, null, 2)} label="Download .json" />
        </div>
      </header>
      {!v.flight_validated && <div className="vdr-note">⚠ {v.flight_status_note}</div>}

      <div className="vdr-tabs" role="tablist">
        {(
          [
            ["visual", "Visual"],
            ["report", "Report (.md)"],
            ["json", "Data (.json)"],
          ] as const
        ).map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className={`vdr-tab${tab === id ? " vdr-tab-on" : ""}`} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>

      {tab === "visual" && <VisualView d={d} />}
      {tab === "report" && (
        <div className="vdr-md">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{cleanMarkdown(markdown)}</ReactMarkdown>
        </div>
      )}
      {tab === "json" && (
        <div className="vdr-json">
          <JsonNode name="final_aircraft_design" value={d} depth={0} />
        </div>
      )}
    </div>
  );
}

// ── Visual tab ───────────────────────────────────────────────────────────

function VisualView({ d }: { d: VehicleDesignOutput }) {
  const checks = useMemo(() => consistencyChecks(d), [d]);
  const p = d.performance;
  return (
    <div className="vdr-visual">
      <div className="vdr-tiles">
        <Tile label="MTOW" value={fmt(d.mass_properties.mtow_kg, 2)} unit="kg" sub={`max ${d.constraints.max_allowable_mtow_kg} kg`} />
        <Tile label="Wingspan" value={fmt(d.geometry.wing.span_m, 2)} unit="m" sub={`max ${d.constraints.max_wingspan_m} m`} />
        <Tile label="Endurance" value={fmt(p.endurance_min, 0)} unit="min" sub={`at ${fmt(p.cruise_speed_kmh, 0)} km/h`} />
        <Tile label="Range" value={fmt(p.range_km, 0)} unit="km" />
        <Tile label="Cruise L/D" value={fmt(d.aerodynamics.lift_to_drag_cruise, 1)} sub={`max ${fmt(d.aerodynamics.lift_to_drag_max, 1)}`} />
        <Tile label="Static margin" value={fmt(d.stability.static_margin_mac_pct, 1)} unit="% MAC" />
      </div>

      <Section title="Mission requirements" note="Required vs sized, each on its own scale. The tick is the requirement.">
        <div className="vdr-reqs">
          {d.requirement_traceability.map((r) => (
            <RequirementRow key={r.requirement} r={r} />
          ))}
        </div>
      </Section>

      <div className="vdr-grid-2">
        <Section title="Layout · top view" note="Drawn to scale from the geometry and CAD handover. Nose up, datum at the nose apex.">
          <PlanView d={d} />
        </Section>
        <Section title="Balance · CG and neutral point" note="Along the fuselage (x, metres aft of the nose).">
          <BalanceStrip d={d} />
          <dl className="vdr-kv vdr-kv-tight">
            <KV k="CG" v={`${fmt(d.mass_properties.cg_x_m, 3)} m`} />
            <KV k="Allowed CG range" v={`${fmt(d.mass_properties.forward_cg_limit_x_m, 2)} – ${fmt(d.mass_properties.aft_cg_limit_x_m, 2)} m`} />
            <KV k="Neutral point" v={`${fmt(d.stability.neutral_point_x_m, 4)} m (${fmt(d.stability.neutral_point_mac_pct, 1)}% MAC)`} />
            <KV k="MAC" v={`${fmt(d.geometry.wing.mac_m, 3)} m, LE at ${fmt(d.geometry.wing.mac_le_x_m, 2)} m`} />
          </dl>
        </Section>
      </div>

      <Section title="Consistency checks" note="Recomputed in the browser from the JSON's own numbers -- not part of the backend output.">
        <ul className="vdr-checks">
          {checks.map((c) => (
            <li key={c.label} className={`vdr-check vdr-check-${c.ok ? "ok" : "warn"}`}>
              <span className="vdr-check-icon" aria-hidden>{c.ok ? "✓" : "⚠"}</span>
              <span className="vdr-check-label">{c.label}</span>
              <span className="vdr-check-detail">{c.detail}</span>
              <span className="vdr-check-status">{c.ok ? "Consistent" : "Check"}</span>
            </li>
          ))}
        </ul>
      </Section>

      <div className="vdr-grid-2">
        <Section title="Aerodynamics & wing">
          <dl className="vdr-kv">
            <KV k="Wing area / AR" v={`${fmt(d.geometry.wing.area_m2, 3)} m² · AR ${fmt(d.geometry.wing.aspect_ratio, 1)}`} />
            <KV k="Root / tip chord" v={`${fmt(d.geometry.wing.root_chord_m, 3)} / ${fmt(d.geometry.wing.tip_chord_m, 3)} m (taper ${fmt(d.geometry.wing.taper_ratio, 2)})`} />
            <KV k="Airfoils" v={`${d.geometry.wing.airfoil_root} / ${d.geometry.wing.airfoil_tip} · tail ${d.geometry.tail.airfoil}`} />
            <KV k="Dihedral / sweep" v={`${d.geometry.wing.dihedral_deg}° / ${d.geometry.wing.sweep_deg}°`} />
            <KV k="CL cruise / CL max" v={`${fmt(d.aerodynamics.cl_cruise, 2)} / ${fmt(d.aerodynamics.cl_max, 2)}`} />
            <KV k="CD0 / CD cruise" v={`${fmt(d.aerodynamics.cd0, 3)} / ${fmt(d.aerodynamics.cd_cruise, 3)}`} />
            <KV k="Stall speed" v={`${fmt(d.aerodynamics.stall_speed_clean_mps, 1)} m/s (${fmt(p.stall_speed_kmh, 0)} km/h)`} />
            <KV k="Reynolds (cruise)" v={d.aerodynamics.reynolds_number_cruise.toLocaleString()} />
          </dl>
        </Section>
        <Section title="Propulsion">
          <dl className="vdr-kv">
            <KV k="Motor" v={`${d.propulsion.cruise_propulsion.motor_model} × ${d.propulsion.cruise_propulsion.motor_count}`} />
            <KV k="Propeller" v={`${d.propulsion.cruise_propulsion.propeller_model} (${d.propulsion.cruise_propulsion.propeller_diameter_in}" × ${d.propulsion.cruise_propulsion.propeller_pitch_in}")`} />
            <KV k="ESC" v={`${d.propulsion.cruise_propulsion.esc_model} (${d.propulsion.cruise_propulsion.esc_rating_a} A)`} />
            <KV k="Cruise power" v={`${fmt(d.propulsion.cruise_propulsion.cruise_power_electrical_w, 0)} W electrical`} />
            <KV k="Thrust cruise / max" v={`${fmt(d.propulsion.cruise_propulsion.cruise_thrust_per_motor_n, 1)} / ${fmt(d.propulsion.cruise_propulsion.max_thrust_per_motor_n, 1)} N`} />
            <KV k="Installed power" v={`${fmt(d.propulsion.total_installed_power_w, 0)} W`} />
          </dl>
        </Section>
      </div>

      <div className="vdr-grid-2">
        <Section title="Energy & battery">
          <EnergyBar d={d} />
          <dl className="vdr-kv">
            <KV k="Battery" v={`${d.battery.pack_model} · ${d.battery.cell_series_count}S ${d.battery.chemistry}, ${d.battery.voltage_nominal_v} V`} />
            <KV k="Capacity / energy" v={`${d.battery.capacity_mah} mAh / ${fmt(d.battery.energy_wh, 1)} Wh`} />
            <KV k="Max continuous current" v={`${d.battery.max_continuous_current_a} A`} />
            <KV k="Bus voltage main / avionics" v={`${d.electrical.main_bus_voltage_v} V / ${d.electrical.avionics_bus_voltage_v} V`} />
          </dl>
        </Section>
        <Section title="Stability, control & trim">
          <ul className="vdr-checks vdr-checks-compact">
            <BoolRow ok={d.stability.is_longitudinally_stable} label="Longitudinal" detail={`Cmα ${d.stability.c_m_alpha_per_rad} /rad`} />
            <BoolRow ok={d.stability.is_directionally_stable} label="Directional" detail={`Cnβ ${d.stability.c_n_beta_per_rad} /rad`} />
            <BoolRow ok={d.stability.is_laterally_stable} label="Lateral" detail={`Clβ ${d.stability.c_l_beta_per_rad} /rad`} />
            <BoolRow ok={d.controls.trim_feasible} label="Trim" detail={`elevator ${d.controls.trim_elevator_cruise_deg}° at cruise, α ${d.aerodynamics.trim_alpha_cruise_deg}°`} />
          </ul>
        </Section>
      </div>

      <Section title="Mass breakdown" note={`Component masses, heaviest first. Sum ${fmt(sumMass(d), 3)} kg vs MTOW ${fmt(d.mass_properties.mtow_kg, 3)} kg.`}>
        <MassBars d={d} />
      </Section>

      <Section title={`Bill of materials (${d.commercial_components.length})`}>
        <div className="vdr-table-wrap">
          <table className="vdr-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Role</th>
                <th>Component</th>
                <th>Qty</th>
                <th className="vdr-num">Mass</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {d.commercial_components.map((c) => (
                <tr key={c.role}>
                  <td>{c.category}</td>
                  <td>{c.role}</td>
                  <td>
                    <b>{c.manufacturer}</b> {c.model.replace(`${c.manufacturer} `, "")}
                  </td>
                  <td>{c.quantity}</td>
                  <td className="vdr-num">{fmt(c.total_mass_kg, 3)} kg</td>
                  <td>
                    <StatusChip ok={c.verification_status.includes("VERIFIED")} label={c.verification_status.includes("VERIFIED") ? "Verified" : c.verification_status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Details title="Avionics">
        <RecordList rec={d.avionics} />
      </Details>
      <Details title="Manufacturing & installation">
        <RecordList rec={{ ...d.manufacturing, ...d.installation }} />
      </Details>
      <Details title="CAD handover">
        <dl className="vdr-kv">
          <KV k="Reference datum" v={d.cad_handover.reference_datum} />
          <KV k="Axes" v={d.cad_handover.coordinate_system.axis_conventions} />
          {Object.entries(d.cad_handover.mounting_coordinates).map(([k, xyz]) => (
            <KV key={k} k={humanize(k)} v={`[${xyz.map((n) => fmt(n, 3)).join(", ")}] m`} />
          ))}
          {d.cad_handover.component_envelopes.map((e) => (
            <KV key={e.component} k={`${humanize(e.component)} envelope`} v={`[${e.location_m.map((n) => fmt(n, 3)).join(", ")}] m`} />
          ))}
        </dl>
      </Details>
      <Details title="Simulation handover">
        <p className="vdr-muted">
          Inertia tensor: {d.mass_properties.inertia.status} -- {d.mass_properties.inertia.reason}
        </p>
        <p className="vdr-muted">The full polar, derivatives and trim conditions are in the Data (.json) tab under simulation_handover.</p>
      </Details>
    </div>
  );
}

function RequirementRow({ r }: { r: VehicleDesignOutput["requirement_traceability"][number] }) {
  const max = Math.max(r.required_value, r.design_value) * 1.15 || 1;
  const pass = r.status === "PASS";
  const tip = `${r.requirement}: required ${r.required_value} ${r.unit} (${r.limit}), sized ${r.design_value} ${r.unit}, margin ${signed(r.margin)} ${r.unit}. ${r.source_module}`;
  return (
    <div className="vdr-req" title={tip}>
      <div className="vdr-req-name">
        {r.requirement}
        <span className="vdr-req-limit">{r.limit === "MIN" ? "at least" : r.limit === "MAX" ? "at most" : "exactly"}</span>
      </div>
      <div className="vdr-req-track">
        <div className="vdr-req-fill" style={{ width: `${(r.design_value / max) * 100}%` }} />
        <div className="vdr-req-tick" style={{ left: `${(r.required_value / max) * 100}%` }} />
      </div>
      <div className="vdr-req-nums">
        <b>
          {r.design_value} {r.unit}
        </b>
        <span>
          need {r.required_value} · {signed(r.margin)}
        </span>
      </div>
      <StatusChip ok={pass} label={r.status} />
    </div>
  );
}

// Plan view: span across, fuselage x (aft) down the page.
function PlanView({ d }: { d: VehicleDesignOutput }) {
  const w = d.geometry.wing;
  const f = d.geometry.fuselage;
  const t = d.geometry.tail;
  const tailX = d.cad_handover.mounting_coordinates.tail_mount?.[0] ?? f.length_m - t.root_chord_m;
  const motorX = d.cad_handover.mounting_coordinates.cruise_motor?.[0] ?? 0.05;
  const propD = d.propulsion.cruise_propulsion.propeller_diameter_in * 0.0254;
  const S = 260; // px per metre
  const pad = 40;
  const halfSpan = w.span_m / 2;
  const length = Math.max(f.length_m, tailX + t.root_chord_m);
  const W = w.span_m * S + pad * 2;
  const H = (length + 0.12) * S + pad * 2;
  const X = (y: number) => pad + (y + halfSpan) * S; // spanwise -> svg x
  const Y = (x: number) => pad + 0.08 * S + x * S; // fuselage x -> svg y
  // Straight leading edge (0° sweep), so the root LE sits at the MAC LE.
  const le = w.mac_le_x_m;
  const wingPts = [
    [-halfSpan, le],
    [0, le],
    [halfSpan, le],
    [halfSpan, le + w.tip_chord_m],
    [0, le + w.root_chord_m],
    [-halfSpan, le + w.tip_chord_m],
  ];
  const hs = t.span_m / 2;
  const tailPts = [
    [-hs, tailX],
    [hs, tailX],
    [hs, tailX + t.tip_chord_m],
    [0, tailX + t.root_chord_m],
    [-hs, tailX + t.tip_chord_m],
  ];
  const poly = (pts: number[][]) => pts.map(([y, x]) => `${X(y)},${Y(x)}`).join(" ");
  const cg = d.mass_properties.cg_x_m;
  const np = d.stability.neutral_point_x_m;
  const spars = w.spar_locations_chord_pct.map((pct) => le + (pct / 100) * w.root_chord_m);

  return (
    <svg className="vdr-plan" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Top view: ${w.span_m} m span, ${f.length_m} m fuselage`}>
      {/* propeller disc (edge-on) */}
      <line x1={X(-propD / 2)} x2={X(propD / 2)} y1={Y(motorX) - 14} y2={Y(motorX) - 14} className="vdr-plan-prop">
        <title>{`Propeller ${d.propulsion.cruise_propulsion.propeller_model}, ${fmt(propD, 3)} m`}</title>
      </line>
      <polygon points={poly(wingPts)} className="vdr-plan-wing">
        <title>{`Wing: span ${w.span_m} m, area ${w.area_m2} m², root ${w.root_chord_m} m, tip ${w.tip_chord_m} m`}</title>
      </polygon>
      {spars.map((x, i) => (
        <line key={i} x1={X(-halfSpan)} x2={X(halfSpan)} y1={Y(x)} y2={Y(x)} className="vdr-plan-spar">
          <title>{`Spar at ${fmt(x, 3)} m (${w.spar_locations_chord_pct[i]}% chord)`}</title>
        </line>
      ))}
      <polygon points={poly(tailPts)} className="vdr-plan-wing">
        <title>{`Horizontal tail: span ${t.span_m} m, area ${t.total_area_m2} m²`}</title>
      </polygon>
      <rect x={X(-f.max_width_m / 2)} y={Y(0)} width={f.max_width_m * S} height={f.length_m * S} rx={f.max_width_m * S * 0.5} className="vdr-plan-fus">
        <title>{`Fuselage ${f.length_m} × ${f.max_width_m} × ${f.max_height_m} m`}</title>
      </rect>
      {/* fin, seen edge-on on the centreline */}
      <line x1={X(0)} x2={X(0)} y1={Y(tailX - 0.02)} y2={Y(tailX + t.root_chord_m)} className="vdr-plan-fin" />
      {/* CG and NP */}
      <g>
        <circle cx={X(0)} cy={Y(cg)} r={7} className="vdr-plan-cg" />
        <line x1={X(0) - 7} x2={X(0) + 7} y1={Y(cg)} y2={Y(cg)} className="vdr-plan-cg-cross" />
        <line x1={X(0)} x2={X(0)} y1={Y(cg) - 7} y2={Y(cg) + 7} className="vdr-plan-cg-cross" />
        <title>{`CG at ${cg} m`}</title>
      </g>
      <line x1={X(0) + 14} x2={X(halfSpan * 0.55)} y1={Y(cg)} y2={Y(cg)} className="vdr-plan-leader" />
      <text x={X(halfSpan * 0.55) + 4} y={Y(cg) - 4} className="vdr-plan-label">
        CG {fmt(cg, 3)} m
      </text>
      <path d={`M ${X(0) - 6} ${Y(np)} l 6 -6 l 6 6 l -6 6 z`} className="vdr-plan-np">
        <title>{`Neutral point at ${np} m`}</title>
      </path>
      <line x1={X(0) - 12} x2={X(-halfSpan * 0.55)} y1={Y(np)} y2={Y(np)} className="vdr-plan-leader" />
      <text x={X(-halfSpan * 0.55) - 4} y={Y(np) + 14} textAnchor="end" className="vdr-plan-label">
        NP {fmt(np, 3)} m
      </text>
      {/* span dimension */}
      <line x1={X(-halfSpan)} x2={X(halfSpan)} y1={H - 14} y2={H - 14} className="vdr-plan-dim" />
      <text x={X(0)} y={H - 20} textAnchor="middle" className="vdr-plan-label">
        span {fmt(w.span_m, 2)} m
      </text>
      <text x={X(halfSpan) - 4} y={Y(f.length_m)} textAnchor="end" className="vdr-plan-label vdr-plan-label-dim">
        fuselage {fmt(f.length_m, 2)} m
      </text>
    </svg>
  );
}

function BalanceStrip({ d }: { d: VehicleDesignOutput }) {
  const m = d.mass_properties;
  const np = d.stability.neutral_point_x_m;
  const env = d.cad_handover.component_envelopes;
  const xs = [m.forward_cg_limit_x_m, m.aft_cg_limit_x_m, m.cg_x_m, np, ...env.map((e) => e.location_m[0])];
  const lo = Math.floor((Math.min(...xs) - 0.03) * 20) / 20;
  const hi = Math.ceil((Math.max(...xs) + 0.03) * 20) / 20;
  const W = 520;
  const pad = 20;
  const sx = (x: number) => pad + ((x - lo) / (hi - lo)) * (W - pad * 2);
  const axisY = 70;
  const ticks: number[] = [];
  for (let x = lo; x <= hi + 1e-9; x += 0.05) ticks.push(Math.round(x * 100) / 100);
  return (
    <svg className="vdr-strip" viewBox={`0 0 ${W} 150`} role="img" aria-label="CG, neutral point and allowed CG range along the fuselage">
      <rect x={sx(m.forward_cg_limit_x_m)} y={axisY - 22} width={sx(m.aft_cg_limit_x_m) - sx(m.forward_cg_limit_x_m)} height={22} className="vdr-strip-band">
        <title>{`Allowed CG range ${m.forward_cg_limit_x_m}–${m.aft_cg_limit_x_m} m`}</title>
      </rect>
      <text x={sx(m.forward_cg_limit_x_m)} y={axisY - 28} className="vdr-plan-label vdr-plan-label-dim">
        allowed CG
      </text>
      <line x1={pad} x2={W - pad} y1={axisY} y2={axisY} className="vdr-strip-axis" />
      {ticks.map((x) => (
        <g key={x}>
          <line x1={sx(x)} x2={sx(x)} y1={axisY} y2={axisY + 5} className="vdr-strip-axis" />
          <text x={sx(x)} y={axisY + 18} textAnchor="middle" className="vdr-strip-tick">
            {x.toFixed(2)}
          </text>
        </g>
      ))}
      <g>
        <circle cx={sx(m.cg_x_m)} cy={axisY - 11} r={6} className="vdr-plan-cg" />
        <title>{`CG ${m.cg_x_m} m`}</title>
      </g>
      <path d={`M ${sx(np) - 6} ${axisY - 11} l 6 -6 l 6 6 l -6 6 z`} className="vdr-plan-np">
        <title>{`Neutral point ${np} m`}</title>
      </path>
      <line x1={sx(m.cg_x_m)} x2={sx(np)} y1={axisY - 34} y2={axisY - 34} className="vdr-strip-margin" />
      <text x={(sx(m.cg_x_m) + sx(np)) / 2} y={axisY - 40} textAnchor="middle" className="vdr-plan-label">
        static margin {fmt(d.stability.static_margin_mac_pct, 1)}%
      </text>
      {env.map((e, i) => (
        <g key={e.component}>
          <line x1={sx(e.location_m[0])} x2={sx(e.location_m[0])} y1={axisY + 24} y2={axisY + 34 + i * 14} className="vdr-plan-leader" />
          <rect x={sx(e.location_m[0]) - 3} y={axisY + 34 + i * 14 - 3} width={6} height={6} className="vdr-strip-env" />
          <text x={sx(e.location_m[0]) + 8} y={axisY + 38 + i * 14} className="vdr-strip-tick">
            {humanize(e.component)} {fmt(e.location_m[0], 2)}
          </text>
        </g>
      ))}
    </svg>
  );
}

function EnergyBar({ d }: { d: VehicleDesignOutput }) {
  const e = d.energy;
  const stored = e.total_energy_stored_wh || 1;
  const req = e.energy_required_mission_wh;
  const minReserve = d.constraints.battery_reserve_min_pct;
  return (
    <div className="vdr-energy" title={`Mission needs ${req} Wh of ${stored} Wh stored (${e.energy_reserve_pct}% reserve, minimum ${minReserve}%)`}>
      <div className="vdr-energy-track">
        <div className="vdr-energy-fill" style={{ width: `${(req / stored) * 100}%` }} />
        <div className="vdr-req-tick" style={{ left: `${100 - minReserve}%` }} />
      </div>
      <div className="vdr-energy-legend">
        <span>
          Mission <b>{fmt(req, 1)} Wh</b>
        </span>
        <span>
          Reserve <b>{fmt(e.energy_reserve_pct, 0)}%</b> (min {minReserve}%, tick)
        </span>
        <span>
          Stored <b>{fmt(stored, 1)} Wh</b>
        </span>
      </div>
    </div>
  );
}

function MassBars({ d }: { d: VehicleDesignOutput }) {
  const rows = [...d.mass_properties.component_breakdown].filter((c) => c.mass_kg > 0).sort((a, b) => b.mass_kg - a.mass_kg);
  const max = rows[0]?.mass_kg || 1;
  return (
    <div className="vdr-bars">
      {rows.map((c) => (
        <div key={c.name} className="vdr-bar-row" title={`${c.name}: ${c.mass_kg} kg at x ${c.x_cg_m} m (${c.provenance})`}>
          <span className="vdr-bar-name">{c.name}</span>
          <span className="vdr-bar-track">
            <span className="vdr-bar-fill" style={{ width: `${(c.mass_kg / max) * 100}%` }} />
          </span>
          <span className="vdr-bar-val">{fmt(c.mass_kg, 3)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Consistency checks (computed here, from the JSON alone) ──────────────

interface Check {
  label: string;
  ok: boolean;
  detail: string;
}

function sumMass(d: VehicleDesignOutput) {
  return d.mass_properties.component_breakdown.reduce((s, c) => s + c.mass_kg, 0);
}

function within(a: number, b: number, tol = 0.05) {
  return Math.abs(a - b) <= Math.abs(b) * tol + 1e-9;
}

function consistencyChecks(d: VehicleDesignOutput): Check[] {
  const m = d.mass_properties;
  const w = d.geometry.wing;
  const rho = d.assumptions.air_density_kg_m3;
  const g = d.assumptions.gravity_m_s2;
  const weightN = m.mtow_kg * g;
  const v = d.performance.cruise_speed_mps;
  const sum = sumMass(d);
  const momentCg = sum > 0 ? m.component_breakdown.reduce((s, c) => s + c.mass_kg * c.x_cg_m, 0) / sum : 0;
  const stall = Math.sqrt((2 * weightN) / (rho * w.area_m2 * d.aerodynamics.cl_max));
  const clCruise = weightN / (0.5 * rho * v * v * w.area_m2);
  const cruiseWh = d.propulsion.cruise_propulsion.cruise_power_electrical_w * (d.performance.endurance_min / 60);
  const rangeFromSpeed = d.performance.cruise_speed_kmh * (d.performance.endurance_min / 60);
  const usable = d.energy.total_energy_stored_wh * (1 - d.energy.energy_reserve_pct / 100);
  const sm = ((d.stability.neutral_point_x_m - m.cg_x_m) / w.mac_m) * 100;
  const ar = (w.span_m * w.span_m) / w.area_m2;
  return [
    { label: "Mass breakdown adds up to MTOW", ok: within(sum, m.mtow_kg), detail: `components sum to ${fmt(sum, 3)} kg, MTOW ${fmt(m.mtow_kg, 3)} kg` },
    { label: "Breakdown CG matches stated CG", ok: within(momentCg, m.cg_x_m, 0.1), detail: `mass-weighted x ${fmt(momentCg, 3)} m vs CG ${fmt(m.cg_x_m, 3)} m` },
    { label: "Battery mass agrees", ok: within(m.battery_mass_kg, d.battery.mass_kg, 0.02), detail: `mass properties ${m.battery_mass_kg} kg vs battery pack ${d.battery.mass_kg} kg` },
    { label: "CG inside allowed range", ok: m.cg_x_m >= m.forward_cg_limit_x_m && m.cg_x_m <= m.aft_cg_limit_x_m, detail: `${m.cg_x_m} m in ${m.forward_cg_limit_x_m}–${m.aft_cg_limit_x_m} m` },
    { label: "Static margin from NP and CG", ok: within(sm, d.stability.static_margin_mac_pct), detail: `(NP − CG) / MAC = ${fmt(sm, 1)}% vs ${d.stability.static_margin_mac_pct}%` },
    { label: "Aspect ratio from span and area", ok: within(ar, w.aspect_ratio), detail: `b²/S = ${fmt(ar, 2)} vs ${w.aspect_ratio}` },
    { label: "Stall speed from CL max", ok: within(stall, d.aerodynamics.stall_speed_clean_mps, 0.1), detail: `√(2W/ρSCLmax) = ${fmt(stall, 1)} m/s vs ${d.aerodynamics.stall_speed_clean_mps} m/s` },
    { label: "Cruise CL from weight and speed", ok: within(clCruise, d.aerodynamics.cl_cruise, 0.1), detail: `W/(qS) = ${fmt(clCruise, 2)} at ${fmt(v, 1)} m/s vs ${d.aerodynamics.cl_cruise}` },
    { label: "Cruise energy from power × time", ok: within(cruiseWh, d.energy.cruise_energy_wh, 0.1), detail: `${d.propulsion.cruise_propulsion.cruise_power_electrical_w} W × ${d.performance.endurance_min} min = ${fmt(cruiseWh, 1)} Wh vs ${d.energy.cruise_energy_wh} Wh` },
    { label: "Range from speed × endurance", ok: within(rangeFromSpeed, d.performance.range_km, 0.1), detail: `${d.performance.cruise_speed_kmh} km/h × ${d.performance.endurance_min} min = ${fmt(rangeFromSpeed, 1)} km vs ${d.performance.range_km} km` },
    { label: "Energy reserve covers the mission", ok: usable + 1e-6 >= d.energy.energy_required_mission_wh, detail: `usable ${fmt(usable, 1)} Wh vs needed ${d.energy.energy_required_mission_wh} Wh` },
    { label: "Main bus matches battery voltage", ok: within(d.electrical.main_bus_voltage_v, d.battery.voltage_nominal_v), detail: `bus ${d.electrical.main_bus_voltage_v} V vs ${d.battery.cell_series_count}S pack ${d.battery.voltage_nominal_v} V` },
    { label: "MTOW and span within limits", ok: m.mtow_kg <= d.constraints.max_allowable_mtow_kg && w.span_m <= d.constraints.max_wingspan_m, detail: `${m.mtow_kg} ≤ ${d.constraints.max_allowable_mtow_kg} kg, ${w.span_m} ≤ ${d.constraints.max_wingspan_m} m` },
  ];
}

// ── Small pieces ─────────────────────────────────────────────────────────

function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="vdr-section">
      <h4>{title}</h4>
      {note && <p className="vdr-section-note">{note}</p>}
      {children}
    </section>
  );
}

function Details({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="vdr-details">
      <summary>{title}</summary>
      <div className="vdr-details-body">{children}</div>
    </details>
  );
}

function Tile({ label, value, unit, sub }: { label: string; value: string; unit?: string; sub?: string }) {
  return (
    <div className="vdr-tile">
      <div className="vdr-tile-label">{label}</div>
      <div className="vdr-tile-value">
        {value}
        {unit && <span>{unit}</span>}
      </div>
      {sub && <div className="vdr-tile-sub">{sub}</div>}
    </div>
  );
}

function StatusChip({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`vdr-status vdr-status-${ok ? "ok" : "warn"}`}>
      <span aria-hidden>{ok ? "✓" : "⚠"}</span> {label}
    </span>
  );
}

function BoolRow({ ok, label, detail }: { ok: boolean; label: string; detail: string }) {
  return (
    <li className={`vdr-check vdr-check-${ok ? "ok" : "warn"}`}>
      <span className="vdr-check-icon" aria-hidden>{ok ? "✓" : "⚠"}</span>
      <span className="vdr-check-label">{label}</span>
      <span className="vdr-check-detail">{detail}</span>
      <span className="vdr-check-status">{ok ? "Stable" : "Check"}</span>
    </li>
  );
}

function KV({ k, v }: { k: string; v: ReactNode }) {
  return (
    <>
      <dt>{k}</dt>
      <dd>{v}</dd>
    </>
  );
}

function RecordList({ rec }: { rec: Record<string, unknown> }) {
  return (
    <dl className="vdr-kv">
      {Object.entries(rec)
        .filter(([k]) => k !== "status")
        .map(([k, val]) => (
          <KV key={k} k={humanize(k)} v={String(val ?? "—")} />
        ))}
    </dl>
  );
}

function DownloadButton({ name, type, body, label }: { name: string; type: string; body: string; label: string }) {
  function download() {
    const url = URL.createObjectURL(new Blob([body], { type }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <button type="button" className="vdr-dl" onClick={download}>
      ↓ {label}
    </button>
  );
}

function JsonNode({ name, value, depth }: { name: string; value: unknown; depth: number }) {
  if (value !== null && typeof value === "object") {
    const entries = Array.isArray(value) ? value.map((v, i) => [String(i), v] as const) : Object.entries(value as Record<string, unknown>);
    const status = !Array.isArray(value) ? (value as Record<string, unknown>).status : undefined;
    return (
      <details className="vdr-json-node" open={depth === 0}>
        <summary>
          <span className="vdr-json-key">{name}</span>
          <span className="vdr-json-meta">{Array.isArray(value) ? `[${entries.length}]` : `{${entries.length}}`}</span>
          {typeof status === "string" && <span className={`vdr-json-status vdr-json-status-${status === "VALID" ? "ok" : "warn"}`}>{status}</span>}
        </summary>
        <div className="vdr-json-children">
          {entries.map(([k, v]) => (
            <JsonNode key={k} name={k} value={v} depth={depth + 1} />
          ))}
        </div>
      </details>
    );
  }
  return (
    <div className="vdr-json-leaf">
      <span className="vdr-json-key">{name}</span>
      <span className={`vdr-json-val vdr-json-${value === null ? "null" : typeof value}`}>{value === null ? "null" : typeof value === "string" ? `"${value}"` : String(value)}</span>
    </div>
  );
}

// The .md uses GitHub alert syntax and inline TeX ($C_{m\alpha}$), which
// react-markdown doesn't render -- turn those into plain text.
function cleanMarkdown(md: string) {
  const greek: Record<string, string> = { alpha: "α", beta: "β", delta: "δ" };
  return md
    .replace(/^> \[!(IMPORTANT|NOTE|WARNING)\]\s*$/gm, "> **$1**")
    .replace(/\$([^$\n]+)\$/g, (_m, tex: string) => tex.replace(/\\(alpha|beta|delta)/g, (_g, n: string) => greek[n]).replace(/[_{}\\]/g, ""));
}

function humanize(k: string) {
  return k.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

function fmt(n: number, digits: number) {
  return Number.isFinite(n) ? n.toFixed(digits) : "—";
}

function signed(n: number) {
  return `${n >= 0 ? "+" : ""}${n}`;
}

const VDR_CSS = `
.vdr{ --vdr-ink:var(--hgr-a-paper,#12222F); --vdr-dim:var(--hgr-a-paper-dim,#4F6B80); --vdr-panel:var(--hgr-a-navy-panel,#F2F7FB); --vdr-panel-2:var(--hgr-a-navy-panel-2,#E4EEF7); --vdr-line:var(--hgr-a-hairline,rgba(62,124,166,.28)); --vdr-blue:var(--hgr-a-blue-bright,#1C74B8); --vdr-amber:var(--hgr-a-amber-bright,#B4690E); --vdr-good:#2E7D4F; --vdr-warn:#A35F00;
  display:flex; flex-direction:column; gap:14px; color:var(--vdr-ink); min-width:0; }
.vdr-banner{ font-family:'IBM Plex Mono',monospace; font-size:12px; color:var(--vdr-dim); background:var(--vdr-panel-2); border-left:3px solid var(--vdr-amber); padding:10px 14px; }
.vdr-head{ display:flex; justify-content:space-between; gap:16px; flex-wrap:wrap; padding:18px 20px; background:var(--vdr-panel); border:1px solid var(--vdr-line); border-top:3px solid var(--hgr-a-amber,#E8A33D); }
.vdr-kicker{ font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.12em; text-transform:uppercase; color:var(--vdr-amber); }
.vdr-id{ font-family:'Space Grotesk',sans-serif; font-size:24px; font-weight:600; margin:4px 0 2px; }
.vdr-config{ font-size:14px; color:var(--vdr-dim); }
.vdr-chips{ display:flex; flex-wrap:wrap; gap:8px; margin-top:12px; }
.vdr-chip{ font-family:'IBM Plex Mono',monospace; font-size:11px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; padding:4px 10px; background:var(--vdr-panel-2); border:1px solid var(--vdr-line); border-radius:2px; }
.vdr-status{ display:inline-flex; align-items:center; gap:5px; font-family:'IBM Plex Mono',monospace; font-size:11px; font-weight:700; padding:3px 9px; border-radius:2px; white-space:nowrap; }
.vdr-status-ok{ color:var(--vdr-good); background:#E6F4EC; border:1px solid #B9DEC8; }
.vdr-status-warn{ color:var(--vdr-warn); background:#FCF1E0; border:1px solid #EFD3A6; }
.vdr-downloads{ display:flex; flex-direction:column; gap:8px; align-items:flex-end; }
.vdr-dl{ font-family:'IBM Plex Mono',monospace; font-size:12px; color:var(--vdr-blue); background:#FFFFFF; border:1px solid var(--vdr-line); border-radius:2px; padding:7px 12px; cursor:pointer; }
.vdr-dl:hover{ background:var(--vdr-panel-2); }
.vdr-note{ font-size:13px; color:var(--vdr-warn); background:#FCF1E0; border:1px solid #EFD3A6; padding:9px 14px; }
.vdr-tabs{ display:flex; gap:2px; border-bottom:1px solid var(--vdr-line); }
.vdr-tab{ font-family:'IBM Plex Mono',monospace; font-size:12px; font-weight:700; letter-spacing:.04em; padding:10px 16px; border:none; background:none; color:var(--vdr-dim); cursor:pointer; border-bottom:3px solid transparent; margin-bottom:-1px; }
.vdr-tab-on{ color:var(--vdr-ink); border-bottom-color:var(--vdr-blue); }
.vdr-visual{ display:flex; flex-direction:column; gap:14px; }
.vdr-tiles{ display:grid; grid-template-columns:repeat(auto-fit,minmax(130px,1fr)); gap:10px; }
.vdr-tile{ background:var(--vdr-panel); border:1px solid var(--vdr-line); padding:12px 14px; }
.vdr-tile-label{ font-family:'IBM Plex Mono',monospace; font-size:10.5px; letter-spacing:.08em; text-transform:uppercase; color:var(--vdr-dim); }
.vdr-tile-value{ font-family:'Space Grotesk',sans-serif; font-size:26px; font-weight:600; margin-top:4px; font-variant-numeric:tabular-nums; }
.vdr-tile-value span{ font-size:13px; font-weight:500; color:var(--vdr-dim); margin-left:4px; }
.vdr-tile-sub{ font-size:12px; color:var(--vdr-dim); }
.vdr-section{ background:#FFFFFF; border:1px solid var(--vdr-line); padding:16px 18px; min-width:0; }
.vdr-section h4{ margin:0; font-family:'IBM Plex Mono',monospace; font-size:11.5px; letter-spacing:.08em; text-transform:uppercase; font-weight:700; }
.vdr-section-note{ margin:4px 0 0; font-size:12px; color:var(--vdr-dim); }
.vdr-section > :not(h4):not(.vdr-section-note){ margin-top:12px; }
.vdr-grid-2{ display:grid; grid-template-columns:repeat(auto-fit,minmax(320px,1fr)); gap:14px; }
.vdr-reqs{ display:flex; flex-direction:column; gap:10px; }
.vdr-req{ display:grid; grid-template-columns:minmax(120px,1fr) 2fr minmax(120px,auto) auto; gap:12px; align-items:center; }
.vdr-req-name{ font-size:13.5px; font-weight:600; display:flex; flex-direction:column; }
.vdr-req-limit{ font-size:11px; font-weight:400; color:var(--vdr-dim); }
.vdr-req-track,.vdr-energy-track,.vdr-bar-track{ position:relative; height:12px; background:var(--vdr-panel-2); border-radius:0 4px 4px 0; }
.vdr-req-fill,.vdr-energy-fill,.vdr-bar-fill{ position:absolute; left:0; top:0; bottom:0; background:var(--vdr-blue); border-radius:0 4px 4px 0; }
.vdr-bar-fill{ display:block; }
.vdr-req-tick{ position:absolute; top:-4px; bottom:-4px; width:2px; background:var(--vdr-ink); margin-left:-1px; }
.vdr-req-nums{ display:flex; flex-direction:column; font-size:12.5px; font-variant-numeric:tabular-nums; }
.vdr-req-nums span{ color:var(--vdr-dim); font-size:11.5px; }
.vdr-plan{ width:100%; height:auto; max-height:520px; display:block; }
.vdr-plan-wing{ fill:#D7E6F3; stroke:var(--vdr-blue); stroke-width:1.5; }
.vdr-plan-fus{ fill:#BBD3E8; stroke:var(--vdr-blue); stroke-width:1.5; }
.vdr-plan-fin{ stroke:var(--vdr-ink); stroke-width:3; }
.vdr-plan-prop{ stroke:var(--vdr-ink); stroke-width:3; stroke-linecap:round; }
.vdr-plan-spar{ stroke:var(--vdr-blue); stroke-width:1; stroke-dasharray:4 4; opacity:.7; }
.vdr-plan-cg{ fill:#FFFFFF; stroke:var(--vdr-amber); stroke-width:2.5; }
.vdr-plan-cg-cross{ stroke:var(--vdr-amber); stroke-width:1.5; }
.vdr-plan-np{ fill:var(--vdr-ink); }
.vdr-plan-leader{ stroke:var(--vdr-dim); stroke-width:1; }
.vdr-plan-dim{ stroke:var(--vdr-dim); stroke-width:1; marker-start:none; }
.vdr-plan-label{ font-family:'IBM Plex Mono',monospace; font-size:13px; fill:var(--vdr-ink); }
.vdr-plan-label-dim{ fill:var(--vdr-dim); font-size:12px; }
.vdr-strip{ width:100%; height:auto; display:block; }
.vdr-strip-band{ fill:#E6F4EC; stroke:#B9DEC8; }
.vdr-strip-axis{ stroke:var(--vdr-dim); stroke-width:1; }
.vdr-strip-tick{ font-family:'IBM Plex Mono',monospace; font-size:11px; fill:var(--vdr-dim); }
.vdr-strip-margin{ stroke:var(--vdr-ink); stroke-width:1.5; }
.vdr-strip-env{ fill:var(--vdr-dim); }
.vdr-kv{ display:grid; grid-template-columns:minmax(120px,auto) 1fr; gap:6px 14px; margin:0; font-size:13px; }
.vdr-kv dt{ color:var(--vdr-dim); }
.vdr-kv dd{ margin:0; font-variant-numeric:tabular-nums; }
.vdr-checks{ list-style:none; margin:0; padding:0; display:flex; flex-direction:column; }
.vdr-check{ display:grid; grid-template-columns:20px minmax(180px,1.1fr) 2fr auto; gap:10px; align-items:baseline; padding:8px 0; border-bottom:1px dashed var(--vdr-line); font-size:13px; }
.vdr-checks-compact .vdr-check{ grid-template-columns:20px minmax(90px,auto) 1fr auto; }
.vdr-check:last-child{ border-bottom:none; }
.vdr-check-icon{ font-weight:700; }
.vdr-check-ok .vdr-check-icon,.vdr-check-ok .vdr-check-status{ color:var(--vdr-good); }
.vdr-check-warn .vdr-check-icon,.vdr-check-warn .vdr-check-status{ color:var(--vdr-warn); }
.vdr-check-label{ font-weight:600; }
.vdr-check-detail{ color:var(--vdr-dim); font-family:'IBM Plex Mono',monospace; font-size:12px; }
.vdr-check-status{ font-family:'IBM Plex Mono',monospace; font-size:11px; font-weight:700; text-transform:uppercase; }
.vdr-energy{ display:flex; flex-direction:column; gap:8px; margin-bottom:12px; }
.vdr-energy-legend{ display:flex; justify-content:space-between; flex-wrap:wrap; gap:8px; font-size:12px; color:var(--vdr-dim); }
.vdr-energy-legend b{ color:var(--vdr-ink); }
.vdr-bars{ display:flex; flex-direction:column; gap:5px; }
.vdr-bar-row{ display:grid; grid-template-columns:140px 1fr 56px; gap:10px; align-items:center; font-size:12.5px; }
.vdr-bar-row:hover .vdr-bar-fill{ background:#145A90; }
.vdr-bar-track{ height:10px; background:none; }
.vdr-bar-val{ text-align:right; font-variant-numeric:tabular-nums; color:var(--vdr-dim); }
.vdr-table-wrap{ overflow-x:auto; }
.vdr-table{ width:100%; border-collapse:collapse; font-size:13px; }
.vdr-table th{ text-align:left; font-family:'IBM Plex Mono',monospace; font-size:10.5px; letter-spacing:.06em; text-transform:uppercase; color:var(--vdr-dim); padding:8px 10px; border-bottom:1px solid var(--vdr-line); }
.vdr-table td{ padding:9px 10px; border-bottom:1px dashed var(--vdr-line); }
.vdr-num{ text-align:right; font-variant-numeric:tabular-nums; }
.vdr-details{ background:#FFFFFF; border:1px solid var(--vdr-line); }
.vdr-details summary{ cursor:pointer; padding:12px 18px; font-family:'IBM Plex Mono',monospace; font-size:11.5px; letter-spacing:.08em; text-transform:uppercase; font-weight:700; background:var(--vdr-panel-2); }
.vdr-details-body{ padding:14px 18px; }
.vdr-muted{ margin:0 0 6px; font-size:13px; color:var(--vdr-dim); }
.vdr-md{ background:#FFFFFF; border:1px solid var(--vdr-line); padding:8px 24px 20px; font-size:14px; line-height:1.6; overflow-x:auto; }
.vdr-md h1{ font-family:'Space Grotesk',sans-serif; font-size:22px; margin:16px 0 8px; }
.vdr-md h2{ font-family:'Space Grotesk',sans-serif; font-size:17px; margin:22px 0 8px; padding-top:12px; border-top:1px solid var(--vdr-line); }
.vdr-md h3{ font-size:14px; margin:16px 0 6px; }
.vdr-md table{ border-collapse:collapse; font-size:12.5px; margin:8px 0; }
.vdr-md th,.vdr-md td{ border:1px solid var(--vdr-line); padding:5px 9px; text-align:left; }
.vdr-md th{ background:var(--vdr-panel-2); }
.vdr-md code{ font-family:'IBM Plex Mono',monospace; font-size:12.5px; background:var(--vdr-panel); padding:1px 5px; border-radius:2px; }
.vdr-md blockquote{ margin:10px 0; padding:8px 14px; border-left:3px solid var(--vdr-amber); background:#FCF1E0; }
.vdr-md blockquote p{ margin:0; }
.vdr-json{ background:#FFFFFF; border:1px solid var(--vdr-line); padding:12px 16px; font-family:'IBM Plex Mono',monospace; font-size:12.5px; overflow-x:auto; }
.vdr-json-node > summary{ cursor:pointer; padding:2px 0; list-style-position:outside; }
.vdr-json-children{ padding-left:18px; border-left:1px dashed var(--vdr-line); margin-left:4px; }
.vdr-json-leaf{ padding:2px 0 2px 14px; display:flex; gap:8px; }
.vdr-json-key{ color:var(--vdr-ink); font-weight:600; }
.vdr-json-key::after{ content:":"; font-weight:400; }
.vdr-json-meta{ color:var(--vdr-dim); margin-left:6px; }
.vdr-json-status{ margin-left:8px; font-size:10.5px; font-weight:700; padding:0 6px; border-radius:2px; }
.vdr-json-status-ok{ color:var(--vdr-good); background:#E6F4EC; }
.vdr-json-status-warn{ color:var(--vdr-warn); background:#FCF1E0; }
.vdr-json-string{ color:#1F6E43; }
.vdr-json-number{ color:var(--vdr-blue); }
.vdr-json-boolean{ color:var(--vdr-amber); }
.vdr-json-null{ color:var(--vdr-dim); font-style:italic; }
@media (max-width:640px){
  .vdr-req{ grid-template-columns:1fr auto; }
  .vdr-req-track{ grid-column:1 / -1; }
  .vdr-check{ grid-template-columns:20px 1fr auto; }
  .vdr-check-detail{ grid-column:2 / -1; }
  .vdr-bar-row{ grid-template-columns:100px 1fr 48px; }
  .vdr-downloads{ flex-direction:row; align-items:flex-start; }
}
`;
