import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { isFixedWing, type VehicleDesignOutput } from "./VehicleDesignReport";
import { systemOf } from "./VehicleDesignCharts";

// Bay 03 layout view: a light 3D model of the design built from the JSON's
// own geometry (fuselage, wing with taper/thickness/dihedral, tail, fin,
// propeller, CG/NP markers), drawn as shaded SVG polygons -- no 3D library.
// Top / Side / Front / 3D presets animate between each other; drag to rotate;
// Rotate spins it (and the propeller). Two optional layers: Components (the
// bays and motor as boxes at their CAD positions, fuselage see-through) and
// Mass points (every mass-breakdown entry at its CG, sized by mass) -- coloured
// by system exactly as in Weight by system.
//
// Aircraft frame (CAD handover): x aft from the nose, y to the right wingtip,
// z down. Everything below works in that frame until projection.

type V3 = [number, number, number];

interface Face {
  pts: V3[];
  color: string;
  label: string;
  // "shell" faces turn see-through while the Components layer is on.
  shell?: boolean;
}

interface ComponentBox {
  name: string;
  center: V3;
  size: V3;
  color: string;
  detail: string;
}

interface MassPoint {
  name: string;
  at: V3;
  kg: number;
  color: string;
  system: string;
  outside: boolean;
}

type ViewName = "top" | "side" | "front" | "iso";

// Camera yaw/pitch for each preset (see project()).
const VIEWS: Record<ViewName, { yaw: number; pitch: number; label: string }> = {
  top: { yaw: Math.PI, pitch: -Math.PI / 2, label: "Top" },
  side: { yaw: -Math.PI / 2, pitch: 0, label: "Side" },
  front: { yaw: 0, pitch: 0, label: "Front" },
  iso: { yaw: -0.78, pitch: -0.5, label: "3D" },
};

const COLORS = {
  fuselage: "#9FC0DD",
  wing: "#CFE0F0",
  tail: "#BCD4EA",
  prop: "#334A5E",
  disc: "#334A5E",
};

const W = 640;
const H = 420;

export function VehicleModelView({ d }: { d: VehicleDesignOutput }) {
  const model = useMemo(() => buildModel(d), [d]);
  const [cam, setCam] = useState({ yaw: VIEWS.iso.yaw, pitch: VIEWS.iso.pitch });
  const [view, setView] = useState<ViewName | "free">("iso");
  const [spinning, setSpinning] = useState(false);
  const [propAngle, setPropAngle] = useState(0.5);
  // Bumped to (re)start the animation loop for a preset tween.
  const [kick, setKick] = useState(0);
  const [showParts, setShowParts] = useState(false);
  const [showMass, setShowMass] = useState(false);
  const camRef = useRef(cam);
  camRef.current = cam;
  const tween = useRef<{ from: { yaw: number; pitch: number }; to: { yaw: number; pitch: number }; start: number } | null>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);

  // One animation loop drives preset tweens, auto-rotate and the propeller.
  useEffect(() => {
    if (!spinning && !tween.current) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = tween.current;
      if (t) {
        const k = Math.min(1, (now - t.start) / 550);
        const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        setCam({ yaw: t.from.yaw + (t.to.yaw - t.from.yaw) * e, pitch: t.from.pitch + (t.to.pitch - t.from.pitch) * e });
        if (k >= 1) tween.current = null;
      } else if (spinning) {
        setCam((c) => ({ ...c, yaw: c.yaw + dt * 0.7 }));
      }
      if (spinning) setPropAngle((a) => a + dt * 14);
      if (spinning || tween.current) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [spinning, kick]);

  function goTo(name: ViewName) {
    const target = VIEWS[name];
    const from = camRef.current;
    // Turn the short way round.
    let dy = (target.yaw - from.yaw) % (2 * Math.PI);
    if (dy > Math.PI) dy -= 2 * Math.PI;
    if (dy < -Math.PI) dy += 2 * Math.PI;
    tween.current = { from, to: { yaw: from.yaw + dy, pitch: target.pitch }, start: performance.now() };
    setSpinning(false);
    setView(name);
    setKick((k) => k + 1);
  }

  function onPointerDown(e: ReactPointerEvent<SVGSVGElement>) {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY };
    tween.current = null;
  }
  function onPointerMove(e: ReactPointerEvent<SVGSVGElement>) {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    drag.current = { x: e.clientX, y: e.clientY };
    setCam((c) => ({
      yaw: c.yaw - dx * 0.01,
      pitch: Math.max(-Math.PI / 2, Math.min(Math.PI / 2, c.pitch - dy * 0.01)),
    }));
    setView("free");
  }
  function onPointerUp() {
    drag.current = null;
  }

  const scene = useMemo(
    () => renderScene(model, cam.yaw, cam.pitch, propAngle, { parts: showParts, mass: showMass }),
    [model, cam, propAngle, showParts, showMass],
  );
  const outside = model.massPoints.filter((m) => m.outside);

  return (
    <div className="vmv">
      <style>{VMV_CSS}</style>
      <div className="vmv-toolbar" role="toolbar" aria-label="Model view">
        <div className="vmv-views">
          {(Object.keys(VIEWS) as ViewName[]).map((name) => (
            <button key={name} type="button" className={`vmv-btn${view === name ? " vmv-btn-on" : ""}`} aria-pressed={view === name} onClick={() => goTo(name)}>
              {VIEWS[name].label}
            </button>
          ))}
        </div>
        <div className="vmv-views" aria-label="Layers">
          <button type="button" className={`vmv-btn${showParts ? " vmv-btn-on" : ""}`} aria-pressed={showParts} onClick={() => setShowParts((v) => !v)}>
            Components
          </button>
          <button type="button" className={`vmv-btn${showMass ? " vmv-btn-on" : ""}`} aria-pressed={showMass} onClick={() => setShowMass((v) => !v)}>
            Mass points
          </button>
        </div>
        <button
          type="button"
          className={`vmv-btn${spinning ? " vmv-btn-on" : ""}`}
          aria-pressed={spinning}
          onClick={() => {
            tween.current = null;
            setSpinning((s) => !s);
            if (!spinning) setView("free");
          }}
        >
          {spinning ? "❚❚ Pause" : "⟳ Rotate"}
        </button>
      </div>

      <svg
        className="vmv-svg"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`${view === "free" ? "Rotated" : VIEWS[view].label} view of the aircraft (${d.aircraft_class.replace(/_/g, " ").toLowerCase()})`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {scene.polys.map((p, i) => (
          <polygon key={i} points={p.points} fill={p.fill} stroke={p.stroke} strokeWidth={0.6} strokeLinejoin="round" fillOpacity={p.opacity}>
            <title>{p.label}</title>
          </polygon>
        ))}
        {scene.points.map((pt) => (
          <circle key={pt.name} cx={pt.x} cy={pt.y} r={pt.r} fill={pt.color} stroke={pt.outside ? "#C0392B" : "#FFFFFF"} strokeWidth={pt.outside ? 2 : 1.5} fillOpacity={0.9}>
            <title>{pt.label}</title>
          </circle>
        ))}
        {/* CG and neutral point, drawn on top (x-ray) */}
        <g className="vmv-marker">
          <circle cx={scene.cg[0]} cy={scene.cg[1]} r={7} className="vmv-cg" />
          <line x1={scene.cg[0] - 7} x2={scene.cg[0] + 7} y1={scene.cg[1]} y2={scene.cg[1]} className="vmv-cg-x" />
          <line x1={scene.cg[0]} x2={scene.cg[0]} y1={scene.cg[1] - 7} y2={scene.cg[1] + 7} className="vmv-cg-x" />
          <title>{`CG at x ${d.mass_properties.cg_x_m} m`}</title>
        </g>
        {scene.np && (
          <path d={`M ${scene.np[0] - 6} ${scene.np[1]} l 6 -6 l 6 6 l -6 6 z`} className="vmv-np">
            <title>{`Neutral point at x ${d.stability.neutral_point_x_m} m`}</title>
          </path>
        )}
      </svg>

      <div className="vmv-foot">
        <span className="vmv-legend">
          <span className="vmv-key vmv-key-cg" /> CG {fmt(d.mass_properties.cg_x_m, 3)} m
        </span>
        {model.np && (
          <span className="vmv-legend">
            <span className="vmv-key vmv-key-np" /> NP {fmt(d.stability.neutral_point_x_m, 3)} m
          </span>
        )}
        <span>
          {model.np
            ? `span ${fmt(d.geometry.wing.span_m, 2)} m · fuselage ${fmt(d.geometry.fuselage.length_m, 2)} m`
            : `${model.props.length} rotors of ${fmt((model.props[0]?.radius ?? 0) * 2, 2)} m · ${fmt(model.length, 2)} m across the motor mounts`}
        </span>
        <span className="vmv-hint">Drag to rotate</span>
      </div>
      {(showParts || showMass) && (
        <div className="vmv-layer-legend">
          {showParts &&
            model.boxes.map((b) => (
              <span key={b.name} className="vmv-legend" title={b.detail}>
                <span className="vmv-swatch" style={{ background: b.color }} /> {b.name}
              </span>
            ))}
          {showMass && (
            <span className="vmv-legend">
              ● mass points, sized by kg{outside.length > 0 && <> · <b className="vmv-warn">{outside.length} outside the airframe</b> (red ring)</>}
            </span>
          )}
        </div>
      )}
      {showMass && outside.length > 0 && (
        <p className="vmv-outside">
          ⚠ The mass breakdown puts {outside.map((m) => `${m.name} (x ${fmt(m.at[0], 2)} m)`).join(", ")} beyond the {fmt(model.length, 2)} m airframe -- the
          breakdown positions don't match the geometry.
        </p>
      )}
    </div>
  );
}

// ── Model ────────────────────────────────────────────────────────────────

interface Model {
  faces: Face[];
  boxes: ComponentBox[];
  massPoints: MassPoint[];
  length: number;
  center: V3;
  radius: number;
  // Propeller discs: "x" faces forward (a tractor prop), "z" faces up (a rotor).
  props: { center: V3; radius: number; axis: "x" | "z" }[];
  cg: V3;
  np: V3 | null;
  // How far a mass point can sit from the airframe before it's flagged.
  outsideTest: (p: V3) => boolean;
}

function buildModel(d: VehicleDesignOutput): Model {
  const model = isFixedWing(d) ? buildFixedWing(d) : buildRotorcraft(d);
  // Mass points: every breakdown entry at its stated CG.
  model.massPoints = d.mass_properties.component_breakdown
    .filter((c) => c.mass_kg > 0)
    .map((c) => {
      const sys = systemOf(c.name);
      const at: V3 = [c.x_cg_m, c.y_cg_m ?? 0, c.z_cg_m ?? 0];
      return { name: c.name, at, kg: c.mass_kg, color: sys.color, system: sys.name, outside: model.outsideTest(at) };
    });
  return model;
}

function fitSphere(points: V3[]): { center: V3; radius: number } {
  const min = [0, 1, 2].map((k) => Math.min(...points.map((p) => p[k])));
  const max = [0, 1, 2].map((k) => Math.max(...points.map((p) => p[k])));
  const center: V3 = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
  const radius = Math.max(0.05, ...points.map((p) => Math.hypot(p[0] - center[0], p[1] - center[1], p[2] - center[2])));
  return { center, radius };
}

function boxFaces(center: V3, size: V3, color: string, label: string, shell = false): Face[] {
  const [cx, cy, cz] = center;
  const [sx, sy, sz] = size.map((v) => v / 2);
  const v = (i: number, j: number, k: number): V3 => [cx + i * sx, cy + j * sy, cz + k * sz];
  return [
    [v(-1, -1, -1), v(1, -1, -1), v(1, 1, -1), v(-1, 1, -1)],
    [v(-1, -1, 1), v(-1, 1, 1), v(1, 1, 1), v(1, -1, 1)],
    [v(-1, -1, -1), v(-1, 1, -1), v(-1, 1, 1), v(-1, -1, 1)],
    [v(1, -1, -1), v(1, -1, 1), v(1, 1, 1), v(1, 1, -1)],
    [v(-1, -1, -1), v(-1, -1, 1), v(1, -1, 1), v(1, -1, -1)],
    [v(-1, 1, -1), v(1, 1, -1), v(1, 1, 1), v(-1, 1, 1)],
  ].map((pts) => ({ pts, color, label, shell }));
}

// Multirotor: body at the centre, an arm to each CAD motor mount, motor pods
// and rotor discs sized from the lift propellers.
function buildRotorcraft(d: VehicleDesignOutput): Model {
  const mc = d.cad_handover.mounting_coordinates ?? {};
  const lp = d.propulsion.lift_propulsion;
  let mounts = Object.entries(mc)
    .filter(([k, v]) => /motor/i.test(k) && Array.isArray(v))
    .map(([, v]) => [v[0], v[1], v[2] ?? 0] as V3);
  if (mounts.length < 2) {
    const n = Math.max(3, lp?.motor_count ?? d.geometry.multirotor_frame?.arm_count ?? 4);
    const r = d.geometry.multirotor_frame?.arm_length_m && d.geometry.multirotor_frame.arm_length_m > 0 ? d.geometry.multirotor_frame.arm_length_m : 0.3;
    mounts = Array.from({ length: n }, (_, i) => {
      const a = Math.PI / n + (i / n) * Math.PI * 2;
      return [Math.cos(a) * r, Math.sin(a) * r, 0] as V3;
    });
  }
  const cx = mounts.reduce((s, m) => s + m[0], 0) / mounts.length;
  const cy = mounts.reduce((s, m) => s + m[1], 0) / mounts.length;
  const reach = Math.max(...mounts.map((m) => Math.hypot(m[0] - cx, m[1] - cy)));
  const rotorR = lp?.propeller_diameter_in && lp.propeller_diameter_in > 0 ? (lp.propeller_diameter_in * 0.0254) / 2 : reach * 0.55;
  const f = d.geometry.fuselage;
  const bodySize: V3 =
    f.length_m > 0 && f.max_width_m > 0 && f.max_height_m > 0 ? [f.length_m, f.max_width_m, f.max_height_m] : [reach * 0.5, reach * 0.42, reach * 0.16];
  const faces: Face[] = [...boxFaces([cx, cy, 0], bodySize, COLORS.fuselage, `Central body ${bodySize.map((v) => fmt(v, 2)).join(" × ")} m`, true)];

  // Arms: flat bars from the body to each mount.
  const armW = Math.max(0.012, reach * 0.06);
  const armH = armW * 0.7;
  for (const m of mounts) {
    const dx = m[0] - cx;
    const dy = m[1] - cy;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const nx = -uy * (armW / 2);
    const ny = ux * (armW / 2);
    const a0: V3 = [cx, cy, 0];
    const corner = (base: V3, sx: number, sz: number): V3 => [base[0] + nx * sx, base[1] + ny * sx, base[2] + (armH / 2) * sz];
    const b = [corner(a0, -1, -1), corner(a0, 1, -1), corner(m, 1, -1), corner(m, -1, -1)];
    const t = [corner(a0, -1, 1), corner(a0, 1, 1), corner(m, 1, 1), corner(m, -1, 1)];
    const label = `Arm to rotor at [${m.map((v) => fmt(v, 2)).join(", ")}] m`;
    faces.push({ pts: b, color: COLORS.tail, label }, { pts: [...t].reverse(), color: COLORS.tail, label });
    faces.push({ pts: [b[0], b[3], t[3], t[0]], color: COLORS.tail, label }, { pts: [b[1], t[1], t[2], b[2]], color: COLORS.tail, label });
    // motor pod
    faces.push(...boxFaces([m[0], m[1], -armH], [armW * 1.6, armW * 1.6, armW * 1.8], COLORS.prop, `Motor at [${m.map((v) => fmt(v, 2)).join(", ")}] m`));
  }

  const props = mounts.map((m) => ({ center: [m[0], m[1], -armH - armW * 1.2] as V3, radius: rotorR, axis: "z" as const }));
  const boxes: ComponentBox[] = Object.entries(mc)
    .filter(([k, v]) => !/motor|propeller/i.test(k) && Array.isArray(v))
    .map(([k, v]) => ({
      name: k.replace(/([a-z])([A-Z])/g, "$1 $2"),
      center: [v[0], v[1], v[2] ?? 0] as V3,
      size: [reach * 0.18, reach * 0.14, reach * 0.08] as V3,
      color: systemOf(k).color,
      detail: `${k} mount at [${v.map((n) => fmt(n, 3)).join(", ")}] m`,
    }));
  for (const [i, m] of mounts.entries()) {
    boxes.push({ name: `Motor ${i + 1}`, center: [m[0], m[1], -armH], size: [armW * 2, armW * 2, armW * 2], color: systemOf("Motor").color, detail: `Motor mount at [${m.map((v) => fmt(v, 3)).join(", ")}] m` });
  }

  const all = faces.flatMap((fc) => fc.pts);
  for (const pr of props) all.push([pr.center[0] + pr.radius, pr.center[1], pr.center[2]], [pr.center[0] - pr.radius, pr.center[1], pr.center[2]], [pr.center[0], pr.center[1] + pr.radius, pr.center[2]], [pr.center[0], pr.center[1] - pr.radius, pr.center[2]]);
  const { center, radius } = fitSphere(all);
  const mp = d.mass_properties as { cg_x_m: number; cg_y_m?: number; cg_z_m?: number };
  return {
    faces,
    boxes,
    massPoints: [],
    length: reach * 2,
    center,
    radius,
    props,
    cg: [mp.cg_x_m, mp.cg_y_m ?? 0, mp.cg_z_m ?? 0],
    np: null,
    outsideTest: (p) => Math.hypot(p[0] - cx, p[1] - cy) > reach * 1.3,
  };
}

function buildFixedWing(d: VehicleDesignOutput): Model {
  const w = d.geometry.wing;
  const f = d.geometry.fuselage;
  const t = d.geometry.tail;
  const mc = d.cad_handover.mounting_coordinates;
  const faces: Face[] = [];
  const L = f.length_m;
  const halfW = f.max_width_m / 2;
  const halfH = f.max_height_m / 2;

  // Fuselage: elliptical sections lofted along x, rounded nose, tapered tail.
  const radiusAt = (u: number) => {
    if (u < 0.18) return 0.25 + 0.75 * Math.sqrt(u / 0.18);
    if (u > 0.55) return 1 - ((u - 0.55) / 0.45) * 0.7;
    return 1;
  };
  const STATIONS = 14;
  const AROUND = 14;
  const rings: V3[][] = [];
  for (let i = 0; i <= STATIONS; i++) {
    const u = i / STATIONS;
    const r = radiusAt(u);
    // tail boom rises toward the top of the fuselage, as on most designs
    const zc = u > 0.55 ? -((u - 0.55) / 0.45) * halfH * 0.45 : 0;
    const ring: V3[] = [];
    for (let j = 0; j < AROUND; j++) {
      const a = (j / AROUND) * Math.PI * 2;
      ring.push([u * L, Math.cos(a) * halfW * r, zc + Math.sin(a) * halfH * r]);
    }
    rings.push(ring);
  }
  for (let i = 0; i < STATIONS; i++) {
    for (let j = 0; j < AROUND; j++) {
      const k = (j + 1) % AROUND;
      faces.push({ pts: [rings[i][j], rings[i][k], rings[i + 1][k], rings[i + 1][j]], color: COLORS.fuselage, label: `Fuselage ${f.length_m} × ${f.max_width_m} × ${f.max_height_m} m`, shell: true });
    }
  }
  faces.push({ pts: [...rings[STATIONS]].reverse(), color: COLORS.fuselage, label: "Fuselage tail cap", shell: true });
  faces.push({ pts: rings[0], color: COLORS.fuselage, label: "Nose", shell: true });

  // Wing: two tapered panels with thickness and dihedral; high/mid/low from the configuration text.
  const cfg = d.configuration.toLowerCase();
  const wingZ = cfg.includes("low wing") ? halfH * 0.75 : cfg.includes("mid wing") ? 0 : -halfH * 0.85;
  const thick = nacaThickness(w.airfoil_root);
  const dihedral = (w.dihedral_deg * Math.PI) / 180;
  const sweep = Math.tan((w.sweep_deg * Math.PI) / 180);
  const le = w.mac_le_x_m;
  pushLiftingSurface(faces, {
    rootLeX: le,
    rootChord: w.root_chord_m,
    tipChord: w.tip_chord_m,
    halfSpan: w.span_m / 2,
    z: wingZ,
    sweepTan: sweep,
    tipRise: Math.tan(dihedral) * (w.span_m / 2),
    thickness: thick,
    color: COLORS.wing,
    label: `Wing: span ${w.span_m} m, area ${w.area_m2} m², ${w.airfoil_root}, dihedral ${w.dihedral_deg}°`,
  });

  // Horizontal tail at the tail mount.
  const tailX = mc.tail_mount?.[0] ?? L - t.root_chord_m;
  const tailTopZ = -halfH * 0.45 - halfH * radiusAt(Math.min(1, tailX / L)) * 0.6;
  pushLiftingSurface(faces, {
    rootLeX: tailX,
    rootChord: t.root_chord_m,
    tipChord: t.tip_chord_m,
    halfSpan: t.span_m / 2,
    z: tailTopZ,
    sweepTan: 0.15,
    tipRise: 0,
    thickness: nacaThickness(t.airfoil),
    color: COLORS.tail,
    label: `Horizontal tail: span ${t.span_m} m, ${t.airfoil}`,
  });

  // Vertical fin: height from its projected area; trailing edge aligned with the tailplane.
  const finArea = t.projected_vertical_area_m2 ?? t.total_area_m2 * 0.5;
  const finRoot = t.root_chord_m * 1.1;
  const finTip = t.tip_chord_m * 0.8;
  const finH = finArea / ((finRoot + finTip) / 2);
  const finTE = tailX + t.root_chord_m;
  const finRootZ = tailTopZ;
  const ft = finRoot * 0.04;
  const fin: V3[] = [
    [finTE - finRoot, 0, finRootZ],
    [finTE, 0, finRootZ],
    [finTE, 0, finRootZ - finH],
    [finTE - finTip, 0, finRootZ - finH],
  ];
  faces.push({ pts: fin.map(([x, , z]) => [x, -ft, z] as V3), color: COLORS.tail, label: `Vertical fin, about ${fmt(finH, 2)} m tall` });
  faces.push({ pts: fin.map(([x, , z]) => [x, ft, z] as V3).reverse(), color: COLORS.tail, label: "Vertical fin" });
  faces.push({ pts: [[finTE - finRoot, -ft, finRootZ], [finTE - finTip, -ft, finRootZ - finH], [finTE - finTip, ft, finRootZ - finH], [finTE - finRoot, ft, finRootZ]], color: COLORS.tail, label: "Fin leading edge" });

  // Propeller just ahead of the nose (tractor), sized from the BOM.
  const propR = (d.propulsion.cruise_propulsion.propeller_diameter_in * 0.0254) / 2;
  const propX = Math.min(0, (mc.cruise_motor?.[0] ?? 0.05) - 0.07);

  // Components layer: bays at their CAD envelope positions (sized from the
  // fuselage bay dimensions when the envelope has none), plus the motor.
  const bayDims: Record<string, V3 | undefined> = {
    battery: f.battery_bay_dimensions_m,
    payload: f.payload_bay_dimensions_m,
    avionics: f.avionics_bay_dimensions_m,
  };
  const boxes: ComponentBox[] = d.cad_handover.component_envelopes
    .filter((e) => Array.isArray(e.location_m))
    .map((e) => {
      const kind = (e.component ?? e.component_name ?? "component").toLowerCase();
      const dims = e.dimensions_m ?? bayDims[kind];
      const size = (Array.isArray(dims) && dims.length === 3 ? dims : [0.08, 0.08, 0.05]) as V3;
      const name = kind.charAt(0).toUpperCase() + kind.slice(1).replace(/_/g, " ");
      const at = e.location_m as V3;
      return {
        name,
        center: at,
        size,
        color: systemOf(kind === "battery" ? "Energy Battery" : kind).color,
        detail: `${name} bay ${size.map((v) => fmt(v, 2)).join(" × ")} m at [${at.map((v) => fmt(v, 2)).join(", ")}] m`,
      };
    });
  if (mc.cruise_motor) {
    boxes.push({
      name: "Motor",
      center: mc.cruise_motor,
      size: [0.05, 0.04, 0.04],
      color: systemOf("Motor").color,
      detail: `${d.propulsion.cruise_propulsion.motor_model} mount at [${mc.cruise_motor.map((v) => fmt(v, 2)).join(", ")}] m`,
    });
  }

  const length = Math.max(L, tailX + t.root_chord_m);
  const all = faces.flatMap((fc) => fc.pts);
  all.push([propX, propR, 0], [propX, -propR, 0], [propX, 0, propR], [propX, 0, -propR]);
  const { center, radius } = fitSphere(all);

  return {
    faces,
    boxes,
    massPoints: [],
    length,
    center,
    radius,
    props: [{ center: [propX, 0, 0], radius: propR, axis: "x" }],
    cg: [d.mass_properties.cg_x_m, 0, 0],
    np: [d.stability.neutral_point_x_m, 0, 0],
    outsideTest: (p) => p[0] < -0.05 || p[0] > length + 0.02,
  };
}

function pushLiftingSurface(
  faces: Face[],
  s: { rootLeX: number; rootChord: number; tipChord: number; halfSpan: number; z: number; sweepTan: number; tipRise: number; thickness: number; color: string; label: string },
) {
  const tipLe = s.rootLeX + s.sweepTan * s.halfSpan;
  for (const side of [-1, 1]) {
    const y = side * s.halfSpan;
    const tr = (s.thickness * s.rootChord) / 2;
    const tt = (s.thickness * s.tipChord) / 2;
    const tipZ = s.z - s.tipRise;
    // root/tip, leading/trailing, top/bottom
    const rLT: V3 = [s.rootLeX, 0, s.z - tr];
    const rTT: V3 = [s.rootLeX + s.rootChord, 0, s.z - tr * 0.2];
    const rLB: V3 = [s.rootLeX, 0, s.z + tr];
    const rTB: V3 = [s.rootLeX + s.rootChord, 0, s.z + tr * 0.2];
    const tLT: V3 = [tipLe, y, tipZ - tt];
    const tTT: V3 = [tipLe + s.tipChord, y, tipZ - tt * 0.2];
    const tLB: V3 = [tipLe, y, tipZ + tt];
    const tTB: V3 = [tipLe + s.tipChord, y, tipZ + tt * 0.2];
    faces.push({ pts: [rLT, rTT, tTT, tLT], color: s.color, label: s.label });
    faces.push({ pts: [rLB, tLB, tTB, rTB], color: s.color, label: s.label });
    faces.push({ pts: [rLT, tLT, tLB, rLB], color: s.color, label: s.label });
    faces.push({ pts: [rTT, rTB, tTB, tTT], color: s.color, label: s.label });
    faces.push({ pts: [tLT, tTT, tTB, tLB], color: s.color, label: s.label });
  }
}

function nacaThickness(airfoil: string | undefined): number {
  const m = /naca\s*(\d{4})/i.exec(airfoil ?? "");
  return m ? Number(m[1].slice(2)) / 100 : 0.12;
}

// ── Projection & shading ─────────────────────────────────────────────────

// Aircraft frame -> camera. Display axes: right = +y, up = -z, back = +x.
// Yaw turns about the vertical, pitch tips the view up/down; screen x is
// mirrored so the presets read like drawings (nose up in Top, nose left in Side).
function project(p: V3, c: V3, yaw: number, pitch: number, scale: number): V3 {
  const px = p[1] - c[1];
  const py = -(p[2] - c[2]);
  const pz = p[0] - c[0];
  const x1 = px * Math.cos(yaw) + pz * Math.sin(yaw);
  const z1 = -px * Math.sin(yaw) + pz * Math.cos(yaw);
  const y2 = py * Math.cos(pitch) - z1 * Math.sin(pitch);
  const z2 = py * Math.sin(pitch) + z1 * Math.cos(pitch);
  return [W / 2 - x1 * scale, H / 2 - y2 * scale, z2];
}

interface ScenePoly {
  points: string;
  fill: string;
  stroke: string;
  opacity: number;
  label: string;
  depth: number;
}

function renderScene(m: Model, yaw: number, pitch: number, propAngle: number, layers: { parts: boolean; mass: boolean }) {
  // Zoom out to keep stray mass points in frame while that layer is on.
  const reach = layers.mass
    ? Math.max(m.radius, ...m.massPoints.map((p) => Math.hypot(p.at[0] - m.center[0], p.at[1] - m.center[1], p.at[2] - m.center[2]) + 0.03))
    : m.radius;
  const scale = (Math.min(W, H) / 2 - 18) / reach;
  const polys: ScenePoly[] = [];
  const light = normalize([-0.35, -0.55, -0.75]);

  const add = (pts: V3[], color: string, label: string, opacity = 1) => {
    const pr = pts.map((p) => project(p, m.center, yaw, pitch, scale));
    const n = normalize(cross(sub(pr[1], pr[0]), sub(pr[2], pr[0])));
    const b = 0.62 + 0.38 * Math.abs(dot(n, light));
    polys.push({
      points: pr.map((q) => `${q[0].toFixed(1)},${q[1].toFixed(1)}`).join(" "),
      fill: shade(color, b),
      stroke: shade(color, b * 0.72),
      opacity,
      label,
      depth: pr.reduce((s, q) => s + q[2], 0) / pr.length,
    });
  };

  for (const f of m.faces) add(f.pts, f.color, f.label, layers.parts && f.shell ? 0.18 : 1);

  if (layers.parts) {
    for (const b of m.boxes) {
      const [cx, cy, cz] = b.center;
      const [sx, sy, sz] = b.size.map((v) => v / 2);
      const v = (i: number, j: number, k: number): V3 => [cx + i * sx, cy + j * sy, cz + k * sz];
      const quads: V3[][] = [
        [v(-1, -1, -1), v(1, -1, -1), v(1, 1, -1), v(-1, 1, -1)],
        [v(-1, -1, 1), v(-1, 1, 1), v(1, 1, 1), v(1, -1, 1)],
        [v(-1, -1, -1), v(-1, 1, -1), v(-1, 1, 1), v(-1, -1, 1)],
        [v(1, -1, -1), v(1, -1, 1), v(1, 1, 1), v(1, 1, -1)],
        [v(-1, -1, -1), v(-1, -1, 1), v(1, -1, 1), v(1, -1, -1)],
        [v(-1, 1, -1), v(1, 1, -1), v(1, 1, 1), v(-1, 1, 1)],
      ];
      for (const q of quads) add(q, b.color, b.detail, 0.92);
    }
  }

  // Propellers: faint disc plus two blades each. A tractor prop spins in the
  // y-z plane, a rotor in the x-y plane; neighbouring rotors counter-rotate.
  m.props.forEach((pr, idx) => {
    const { center: pc, radius: r } = pr;
    // (u, v) in the disc's plane -> aircraft frame
    const at = (u: number, v: number): V3 => (pr.axis === "x" ? [pc[0], pc[1] + u, pc[2] + v] : [pc[0] + u, pc[1] + v, pc[2]]);
    const disc: V3[] = Array.from({ length: 24 }, (_, i) => {
      const a = (i / 24) * Math.PI * 2;
      return at(Math.cos(a) * r, Math.sin(a) * r);
    });
    add(disc, COLORS.disc, pr.axis === "x" ? "Propeller disc" : `Rotor ${idx + 1} disc, ${fmt(r * 2, 2)} m`, 0.12);
    const spin = pr.axis === "z" && idx % 2 === 1 ? -propAngle : propAngle;
    for (const k of [0, Math.PI]) {
      const a = spin + k + idx * 0.7;
      const bw = r * 0.09;
      const dir: [number, number] = [Math.cos(a), Math.sin(a)];
      const nrm: [number, number] = [-dir[1], dir[0]];
      add(
        [
          at(nrm[0] * bw * 0.5, nrm[1] * bw * 0.5),
          at(dir[0] * r + nrm[0] * bw * 0.3, dir[1] * r + nrm[1] * bw * 0.3),
          at(dir[0] * r - nrm[0] * bw * 0.3, dir[1] * r - nrm[1] * bw * 0.3),
          at(-nrm[0] * bw * 0.5, -nrm[1] * bw * 0.5),
        ],
        COLORS.prop,
        "Propeller blade",
      );
    }
  });

  polys.sort((a, b) => b.depth - a.depth);

  const points = layers.mass
    ? m.massPoints
        .map((p) => {
          const q = project(p.at, m.center, yaw, pitch, scale);
          return {
            name: p.name,
            x: q[0],
            y: q[1],
            depth: q[2],
            r: 3 + Math.sqrt(p.kg) * 7,
            color: p.color,
            outside: p.outside,
            label: `${p.name} (${p.system}): ${fmt(p.kg, 3)} kg at x ${fmt(p.at[0], 3)} m${p.outside ? " -- outside the airframe" : ""}`,
          };
        })
        .sort((a, b) => b.depth - a.depth)
    : [];
  return {
    polys,
    points,
    cg: project(m.cg, m.center, yaw, pitch, scale),
    np: m.np ? project(m.np, m.center, yaw, pitch, scale) : null,
  };
}

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
function normalize(v: V3): V3 {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}

function shade(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (s: number) => Math.max(0, Math.min(255, Math.round(((n >> s) & 255) * k)));
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}

function fmt(n: number, digits: number) {
  return Number.isFinite(n) ? n.toFixed(digits) : "—";
}

const VMV_CSS = `
.vmv{ display:flex; flex-direction:column; gap:8px; }
.vmv-toolbar{ display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap; }
.vmv-views{ display:inline-flex; border:1px solid var(--vdr-line,rgba(62,124,166,.28)); border-radius:2px; overflow:hidden; }
.vmv-btn{ font-family:'IBM Plex Mono',monospace; font-size:12px; font-weight:700; padding:6px 12px; border:none; background:#FFFFFF; color:var(--vdr-dim,#4F6B80); cursor:pointer; }
.vmv-views .vmv-btn + .vmv-btn{ border-left:1px solid var(--vdr-line,rgba(62,124,166,.28)); }
.vmv-toolbar > .vmv-btn{ border:1px solid var(--vdr-line,rgba(62,124,166,.28)); border-radius:2px; }
.vmv-btn:hover{ background:var(--vdr-panel-2,#E4EEF7); }
.vmv-btn-on{ background:var(--vdr-blue,#1C74B8); color:#FFFFFF; }
.vmv-btn-on:hover{ background:#145A90; }
.vmv-svg{ width:100%; height:auto; display:block; background:linear-gradient(#F7FAFD,#EAF1F8); border:1px solid var(--vdr-line,rgba(62,124,166,.28)); cursor:grab; touch-action:none; user-select:none; }
.vmv-svg:active{ cursor:grabbing; }
.vmv-cg{ fill:#FFFFFF; stroke:var(--vdr-amber,#B4690E); stroke-width:2.5; }
.vmv-cg-x{ stroke:var(--vdr-amber,#B4690E); stroke-width:1.5; }
.vmv-np{ fill:var(--vdr-ink,#12222F); }
.vmv-foot{ display:flex; flex-wrap:wrap; gap:6px 16px; align-items:center; font-family:'IBM Plex Mono',monospace; font-size:11.5px; color:var(--vdr-dim,#4F6B80); }
.vmv-legend{ display:inline-flex; align-items:center; gap:6px; color:var(--vdr-ink,#12222F); }
.vmv-key{ display:inline-block; width:10px; height:10px; }
.vmv-key-cg{ border:2.5px solid var(--vdr-amber,#B4690E); border-radius:50%; background:#FFFFFF; }
.vmv-key-np{ background:var(--vdr-ink,#12222F); transform:rotate(45deg); width:8px; height:8px; }
.vmv-hint{ margin-left:auto; }
.vmv-layer-legend{ display:flex; flex-wrap:wrap; gap:6px 16px; font-family:'IBM Plex Mono',monospace; font-size:11.5px; color:var(--vdr-dim,#4F6B80); }
.vmv-swatch{ display:inline-block; width:10px; height:10px; border-radius:2px; }
.vmv-warn{ color:#A35F00; }
.vmv-outside{ margin:0; font-size:12px; color:#A35F00; background:#FCF1E0; border:1px solid #EFD3A6; padding:7px 10px; }
`;
