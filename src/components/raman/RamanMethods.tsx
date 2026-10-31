import { useEffect, useRef, useState } from "react";

// "Methods & formulas" for Ask Raman: a header link that opens a popup
// listing every formula, rule and algorithm the Noise Check and Noise Fix
// use, with references. Written from the code -- keep it in step with
// th-gcp-service/agents/raman/raman_engine.py (ENGINE_VERSION below) and
// src/lib/raman/ramanAgentLoop.ts when either changes.

const ENGINE_VERSION = "raman-s1-0.1.0";

interface Ref {
  label: string;
  href: string;
}

interface Item {
  name: string;
  formula?: string;
  note?: string;
}

interface Section {
  id: string;
  title: string;
  summary: string;
  items: Item[];
  refs?: Ref[];
}

const REF = {
  gutin: {
    label: "Gutin (1936), On the Sound Field of a Rotating Propeller — NACA TM-1195",
    href: "https://ntrs.nasa.gov/citations/20030068996",
  },
  bpm: {
    label: "Brooks, Pope & Marcolini (1989), Airfoil Self-Noise and Prediction — NASA RP-1218",
    href: "https://ntrs.nasa.gov/citations/19890016302",
  },
  iso9613: {
    label: "ISO 9613-1:1993 — Absorption of sound by the atmosphere",
    href: "https://www.iso.org/standard/17426.html",
  },
  iso1996: {
    label: "ISO 1996-2:2017 — Determination of sound pressure levels (tonal audibility)",
    href: "https://www.iso.org/standard/59766.html",
  },
  iec61672: {
    label: "IEC 61672-1:2013 — Sound level meters (A-weighting)",
    href: "https://webstore.iec.ch/publication/5708",
  },
  dlmf: { label: "NIST DLMF §10.9 — Bessel's integral", href: "https://dlmf.nist.gov/10.9" },
} satisfies Record<string, Ref>;

const SECTIONS: Section[] = [
  {
    id: "inputs",
    title: "1 · Inputs and assumed values",
    summary:
      "Six required inputs (take-off mass, rotor count, propeller diameter, blade count, motor KV, battery voltage or cells, cruise speed). Anything optional that isn't given is assumed, listed on the report, and lowers the confidence score.",
    items: [
      { name: "Battery voltage from cells", formula: "V = cells × 3.7 V" },
      {
        name: "Propeller pitch",
        formula: "pitch / D = 0.45  (if not given; else pitch_in × 0.0254 / D, clamped 0.2–1.2)",
      },
      { name: "Body drag area", formula: "f = 0.03 × m^(2/3)  m²   (m = take-off mass, kg)" },
      {
        name: "Other defaults",
        formula:
          "figure of merit FM = 0.60 · chord at 0.75R = 0.12 R · blade angle of attack α = 4°\nmotor + ESC efficiency η = 0.80 · rotor-to-arm clearance = 0.10 D · motor pole pairs = 7\nair 30 °C, 70 % RH · altitude 30 m AGL · soft ground · target distance 10 m",
      },
      {
        name: "Units",
        note: "Propeller diameter in inches is converted with 1 in = 0.0254 m; cruise speed in km/h is divided by 3.6.",
      },
    ],
  },
  {
    id: "air",
    title: "2 · Air properties",
    summary: "Standard sea-level pressure at the given air temperature t (°C), T = t + 273.15 K.",
    items: [
      { name: "Density", formula: "ρ = 101 325 / (287.05 × T)   kg/m³" },
      { name: "Speed of sound", formula: "c = 331.3 × √(1 + t / 273.15)   m/s" },
      { name: "Kinematic viscosity", formula: "ν = 1.46×10⁻⁵ × (T / 288.15)^1.7   m²/s" },
    ],
  },
  {
    id: "performance",
    title: "3 · Rotor performance — momentum theory + empirical thrust coefficient",
    summary:
      "Finds the hover and cruise RPM, power and torque each rotor needs to carry the vehicle.",
    items: [
      {
        name: "Thrust per rotor (hover)",
        formula: "T = m g / N      g = 9.80665 m/s², N = rotor count",
      },
      {
        name: "Static thrust coefficient (empirical fit)",
        formula: "C_T = clamp(0.24 × pitch/D, 0.06, 0.16) × (B / 2)^0.75      T = C_T ρ n² D⁴",
      },
      {
        name: "Hover speed",
        formula: "n = √( T / (C_T ρ D⁴) )  rev/s      RPM = 60 n      Ω = 2π n",
      },
      {
        name: "If hover RPM is given",
        formula: "C_T = T / (ρ n² D⁴)      implied pitch/D = C_T / (B/2)^0.75 / 0.24",
      },
      { name: "Induced velocity (actuator disk)", formula: "v_i = √( T / (2 ρ A) )      A = π R²" },
      {
        name: "Shaft power and torque",
        formula: "P = T v_i / FM      Q = P / Ω      hover electrical power = N P / η",
      },
      {
        name: "Tip speed, tip Mach, blade-passing frequency",
        formula: "V_tip = Ω R      M_tip = Ω R / c      BPF = B n",
      },
      { name: "Disk loading", formula: "DL = T / A   N/m²" },
      {
        name: "Thrust margin",
        formula: "RPM_max = KV × V × 0.85      T/W = C_T ρ (RPM_max/60)² D⁴ × N / (m g)",
      },
      {
        name: "Cruise drag and tilt",
        formula: "D_p = ½ ρ V² f      T_c = √(W² + D_p²) / N      tilt = atan(D_p / W)",
      },
      {
        name: "Forward-flight induced velocity (Glauert), 30 fixed-point iterations",
        formula:
          "v_i ← T_c / ( 2 ρ A √(V² + v_i²) )\nP_c = T_c v_i / FM + D_p V / N      advancing tip Mach = (Ω_c R + V) / c",
      },
    ],
  },
  {
    id: "tonal",
    title: "4 · Tonal noise — Gutin steady loading and torque",
    summary:
      "Rotor hum at the blade-passing frequency and its harmonics, from the steady thrust and torque on the blades.",
    items: [
      {
        name: "Harmonic m = 1 … 10 at distance r, angle θ from the thrust axis",
        formula:
          "f_m = m B Ω / 2π      R_e = 0.8 R\np_m = m B Ω / (2√2 π c r) × | −T cos θ + Q c / (Ω R_e²) | × | J_mB( m B (Ω R_e + V) / c × sin θ ) |\nSPL_m = 20 log₁₀( p_m / 2×10⁻⁵ Pa )",
      },
      {
        name: "Bessel function (Bessel's integral, trapezoid rule, 256 steps)",
        formula: "J_n(x) = (1/π) ∫₀^π cos( n τ − x sin τ ) dτ",
      },
    ],
    refs: [REF.gutin, REF.dlmf],
  },
  {
    id: "unsteady",
    title: "5 · Interaction tones — unsteady loading (empirical, low confidence)",
    summary:
      "Pulsing tones from blades passing close to arms or other rotors, modelled as a compact fluctuating-thrust dipole. Provisionally calibrated; flagged as the least certain part of the model.",
    items: [
      {
        name: "Fluctuating thrust fraction",
        formula: "ε₀ = clamp( 0.030 × √(0.10 / clearance), 0.002, 0.08 )      clearance = gap / D",
      },
      {
        name: "Harmonic m = 1 … 15",
        formula: "F_m = T ε₀ (m B / 2)^(−1.2)      p_m = m B Ω F_m |cos θ| / (4√2 π c r)",
      },
      {
        name: "Split into hum vs interaction",
        formula: "interaction share = max(0, 1 − clearance / 0.10)",
        note: "At nominal clearance (0.10 D) these tones count as ordinary rotor hum; only the excess from a tighter gap is reported as interaction.",
      },
    ],
  },
  {
    id: "broadband",
    title: "6 · Broadband noise — Brooks–Pope–Marcolini (BPM)",
    summary:
      "The hiss from turbulent air over the blade edges and the blade-tip vortex, summed blade by blade.",
    items: [
      {
        name: "Blade split into 8 segments from 0.2R to 0.95R",
        formula:
          "chord(r) = c₀.₇₅ × (1.15 − 0.2 r/R)      U = √( (Ω r)² + ½ V² )      M = U / c      Re_c = U chord / ν",
      },
      {
        name: "Turbulent boundary layer – trailing edge (untripped)",
        formula:
          "δ*₀ = chord × 10^(3.0187 − 1.5397 log Re_c + 0.1059 (log Re_c)²)\npressure, suction and separation sides: SPL = 10 log(δ* M⁵ L / r²) + A or B spectral shape + K₁ / K₂ amplitude terms\nSt₁ = 0.02 M^−0.6 (BPM eqs. for δ*, St₂, K₁, ΔK₁, K₂ and the A/B shape functions)",
      },
      {
        name: "Tip vortex (rounded tip)",
        formula:
          "l = 0.008 α chord      M_max = M (1 + 0.036 α)\nSPL = 10 log( M² M_max³ l² / r² ) − 30.5 (log St + 0.3)² + 126      St = f l / U_max",
      },
      {
        name: "Sum",
        formula: "segments and blades added as energy (incoherent), directivity D_h = 1",
        note: "Angle of attack α = 4° in Spiral 1.",
      },
    ],
    refs: [REF.bpm],
  },
  {
    id: "motor",
    title: "7 · Motor whine (empirical)",
    summary: "Electromagnetic tone from the motor, scaled with shaft power.",
    items: [
      {
        name: "Sound power and level",
        formula: "L_WA = 10 log₁₀(P_shaft) + 45      L_p = L_WA − 20 log₁₀ r − 11",
      },
      {
        name: "Frequencies",
        formula:
          "f_e = (RPM / 60) × pole pairs      harmonics 1, 2, 3 with energy weights 0.5, 0.3, 0.2",
      },
    ],
  },
  {
    id: "propagation",
    title: "8 · Propagation, weighting and directivity",
    summary:
      "How the source sound reaches a listener, and how it is weighted to match human hearing.",
    items: [
      { name: "Spreading", formula: "spherical (1/r in pressure) inside each source model" },
      {
        name: "Air absorption (ISO 9613-1, pure tone), per metre",
        formula:
          "h = RH × 10^C × (p_r/p_a)      C = −6.8346 (273.16/T)^1.261 + 4.6151\nf_rO = (p_a/p_r)(24 + 4.04×10⁴ h (0.02 + h)/(0.391 + h))\nf_rN = (p_a/p_r)(T/T₀)^−½ (9 + 280 h e^(−4.170((T/T₀)^−⅓ − 1)))\nα = 8.686 f² [ 1.84×10⁻¹¹ (p_r/p_a)(T/T₀)^½ + (T/T₀)^−5/2 ( 0.01275 e^(−2239.1/T)/(f_rO + f²/f_rO) + 0.1068 e^(−3352/T)/(f_rN + f²/f_rN) ) ]   dB/m",
      },
      { name: "Ground", formula: "+3 dB hard ground · +1.5 dB soft ground · 0 dB none" },
      { name: "Several rotors", formula: "+10 log₁₀ N  (rotors added as energy)" },
      {
        name: "A-weighting (IEC 61672)",
        formula:
          "R_A(f) = 12194² f⁴ / ( (f² + 20.6²) √((f² + 107.7²)(f² + 737.9²)) (f² + 12194²) )      A(f) = 20 log₁₀ R_A(f) + 2.00",
      },
      {
        name: "Bands",
        formula:
          "24 one-third-octave bands, 50 Hz – 10 kHz; a tone goes to the band with the nearest centre (log scale)",
      },
      {
        name: "Worst direction",
        formula: "θ = 95°, 105°, … 175° below the rotor; the loudest total is reported",
      },
      { name: "Decibel addition", formula: "L_total = 10 log₁₀ Σ 10^(Lᵢ/10)" },
    ],
    refs: [REF.iso9613, REF.iec61672],
  },
  {
    id: "metrics",
    title: "9 · Reported levels",
    summary: "What the Noise Check shows.",
    items: [
      {
        name: "Hover and cruise level",
        formula: "L_Amax at the target distance, worst direction (dBA)",
      },
      { name: "Levels by distance", formula: "1.5 m, 10 m, 30 m, 60 m, 100 m (hover and cruise)" },
      { name: "Sound power", formula: "L_WA = L_A(10 m, free field) + 20 log₁₀ 10 + 11" },
      {
        name: "Flyover SEL at operating altitude h",
        formula: "SEL = L_A(h) + 10 log₁₀( π h / V )      (constant speed, spherical spreading)",
      },
      {
        name: "Source breakdown",
        formula:
          "share of tonal, interaction, broadband and motor = each source's energy / total energy",
      },
    ],
  },
  {
    id: "prominence",
    title: "10 · Tonal prominence (ISO 1996-2 one-third-octave test)",
    summary: "Whether the hum stands out from the sound around it, which makes it more annoying.",
    items: [
      {
        name: "Test at the BPF band k",
        formula: "ΔL = L_k − ½ (L_k−1 + L_k+1)      neighbours floored at the background level",
      },
      {
        name: "Thresholds",
        formula: "prominent if ΔL ≥ 15 dB (≤ 125 Hz) · ≥ 8 dB (160–400 Hz) · ≥ 5 dB (above 400 Hz)",
      },
      {
        name: "Background",
        formula:
          "rural 35 · suburban 45 · urban 55 · near people 45 dBA, spread evenly across bands (A-weighted)",
      },
    ],
    refs: [REF.iso1996],
  },
  {
    id: "verdict",
    title: "11 · Verdict, drivers, confidence and warnings",
    summary: "Fixed rules on top of the computed numbers.",
    items: [
      {
        name: "Verdict",
        formula:
          "PASS  level ≤ target (WARN instead if the hum is prominent)\nWARN  target < level ≤ target + 5 dB\nFAIL  level > target + 5 dB\nINFO  no target given      overall = worse of hover and cruise",
      },
      {
        name: "Top 3 drivers (by weight)",
        formula:
          "tonal ≥ 50 % · tip Mach ≥ 0.40 · interaction ≥ 25 % · broadband ≥ 40 %\ndisk loading ≥ 150 N/m² · motor ≥ 15 % · tonal prominence",
      },
      {
        name: "Confidence score",
        formula:
          "0.70 − 0.04 for each assumed: pitch, chord, arm clearance, figure of merit, drag area\n+ 0.05 if hover RPM was given      clamped to 0.30 – 0.75",
      },
      {
        name: "Warnings",
        formula:
          "T/W < 1 (can't hover) · T/W < 1.6 (low margin) · tip Mach > 0.6 · D > 0.98 × rotor spacing (overlap)",
      },
      {
        name: "Accuracy",
        note: "About ±5 dB until validated against published measurements (Spiral 2). Not a measured or certified value.",
      },
    ],
  },
  {
    id: "whatif",
    title: "12 · Noise Fix what-if engine",
    summary: "Each design change is recomputed in full by the same engine, with its trade-offs.",
    items: [
      {
        name: "Levers",
        formula:
          "propeller diameter · blade count · hover RPM (or tip speed) · rotor spacing · rotor-to-arm clearance",
      },
      {
        name: "Lever ranges",
        formula:
          "D: 0.8 – 1.35 × current (≤ 0.95 × spacing) · blades 2 – 6 · RPM 0.6 × hover – RPM_max\nspacing 1.02 D – 2.5 D · clearance 0.05 – 0.50",
      },
      {
        name: "Propeller mass model",
        formula:
          "m_prop = 0.14 × D_in² × (B / 2)  grams per propeller; added mass changes take-off mass",
      },
      {
        name: "Kept constant",
        formula:
          "pitch / D when the diameter changes      RPM from tip speed: RPM = V_tip / (π D) × 60",
      },
      {
        name: "Trade-offs",
        formula:
          "power change = P_new / P_base − 1      flight-time change = P_base / P_new − 1\nefficiency = mass (g) / hover power (W)",
      },
      {
        name: "Feasibility",
        formula: "rejected if: implied pitch/D > 1.0 · T/W < 1 · propellers overlap",
      },
    ],
  },
  {
    id: "agent",
    title: "13 · Noise Fix agent loop",
    summary:
      "The AI agent picks each experiment; every number it sees comes from the engine above. One iteration per step; a run survives a dropped connection.",
    items: [
      { name: "Tools", formula: "evaluate_design(changes) · get_lever_ranges()" },
      {
        name: "A design counts only if",
        formula:
          "quieter than the baseline (Δ < 0) · feasible · added mass ≤ limit · flight-time change ≥ limit",
      },
      {
        name: "Stop rules (checked before every iteration)",
        formula:
          "target met with all constraints · iteration limit reached\nno gain ≥ 0.5 dB over the last 2 iterations · stopped by the user",
      },
      {
        name: 'Fallback planner (when no AI provider answers; marked "not agentic")',
        formula:
          "start from the best design so far and raise one lever at a time:\npropeller +1 in → blades +1 → clearance × 1.5 (at least +0.05) → spacing × 1.1\nskip anything already tried; drop a lever that broke a constraint or gained < 0.3 dB",
      },
      {
        name: "Ranking",
        formula:
          "up to 5 options, quietest first, constraints met      effort: easy (RPM/blades) · medium (diameter) · hard (spacing/clearance)",
      },
    ],
  },
];

export function RamanMethodsLink() {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button type="button" className="rmn-methods-link" onClick={() => setOpen(true)}>
        ƒ Methods &amp; formulas
      </button>
      {open && (
        <div
          className="rmn-methods-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            className="rmn-methods-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="rmnMethodsTitle"
          >
            <div className="rmn-methods-head">
              <div>
                <div className="rmn-methods-kicker">Ask Raman · engine {ENGINE_VERSION}</div>
                <h2 id="rmnMethodsTitle">Methods, formulas and algorithms</h2>
                <p>
                  Every number in the Noise Check and Noise Fix comes from these deterministic
                  models (no AI in the maths). The AI only writes summaries and chooses which design
                  change to try next.
                </p>
              </div>
              <button
                ref={closeRef}
                type="button"
                className="rmn-methods-close"
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                ✕ CLOSE
              </button>
            </div>

            <nav className="rmn-methods-toc" aria-label="Sections">
              {SECTIONS.map((s) => (
                <a key={s.id} href={`#rmn-m-${s.id}`}>
                  {s.title.replace(/ — .*/, "")}
                </a>
              ))}
            </nav>

            {SECTIONS.map((s) => (
              <section key={s.id} id={`rmn-m-${s.id}`} className="rmn-methods-sect">
                <h3>{s.title}</h3>
                <p className="rmn-methods-sum">{s.summary}</p>
                <dl>
                  {s.items.map((it) => (
                    <div key={it.name} className="rmn-methods-item">
                      <dt>{it.name}</dt>
                      {it.formula && (
                        <dd>
                          <code>{it.formula}</code>
                        </dd>
                      )}
                      {it.note && <dd className="rmn-methods-note">{it.note}</dd>}
                    </div>
                  ))}
                </dl>
                {s.refs && (
                  <div className="rmn-methods-refs">
                    Reference{s.refs.length > 1 ? "s" : ""}:{" "}
                    {s.refs.map((r, i) => (
                      <span key={r.href}>
                        {i > 0 && " · "}
                        <a href={r.href} target="_blank" rel="noopener noreferrer">
                          {r.label} ↗
                        </a>
                      </span>
                    ))}
                  </div>
                )}
              </section>
            ))}

            <section className="rmn-methods-sect">
              <h3>All references</h3>
              <ul className="rmn-methods-reflist">
                {Object.values(REF).map((r) => (
                  <li key={r.href}>
                    <a href={r.href} target="_blank" rel="noopener noreferrer">
                      {r.label} ↗
                    </a>
                  </li>
                ))}
                <li>
                  Momentum (actuator-disk) theory and Glauert's forward-flight inflow — standard
                  rotor aerodynamics texts.
                </li>
              </ul>
              <p className="rmn-methods-note">
                Not modelled in Spiral 1: engine/exhaust noise, VTOL transition and fixed-wing
                modes, laminar vortex-shedding tones, blade–vortex interaction in fast descent.
              </p>
            </section>
          </div>
        </div>
      )}
    </>
  );
}

export const RAMAN_METHODS_CSS = `
.rmn-methods-link{ font-family:'IBM Plex Mono', monospace; font-size:12px; font-weight:600; color:var(--rmn-blue); background:#fff; border:1px solid var(--rmn-blue-line); border-radius:2px; padding:5px 10px; cursor:pointer; white-space:nowrap; }
.rmn-methods-link:hover{ background:var(--rmn-blue); color:#fff; }
.rmn-methods-link:focus-visible,.rmn-methods-close:focus-visible{ outline:2px solid var(--rmn-blue); outline-offset:2px; }
.rmn-methods-overlay{ position:fixed; inset:0; z-index:60; background:rgba(10,24,38,0.55); display:flex; align-items:center; justify-content:center; padding:16px; }
.rmn-methods-panel{ background:#fff; color:var(--rmn-ink); border:1px solid var(--rmn-hair); border-top:3px solid var(--rmn-accent); border-radius:2px; width:100%; max-width:880px; max-height:88vh; overflow:auto; padding:0 24px 22px; box-shadow:0 18px 50px rgba(10,24,38,0.3); font-family:'IBM Plex Sans', sans-serif; scroll-padding-top:120px; }
.rmn-methods-head{ position:sticky; top:0; background:#fff; z-index:1; display:flex; justify-content:space-between; gap:16px; align-items:flex-start; padding:20px 0 12px; border-bottom:1px solid var(--rmn-hair); }
.rmn-methods-head h2{ margin:4px 0 6px; font-size:22px; }
.rmn-methods-head p{ margin:0; font-size:13px; color:var(--rmn-dim); max-width:620px; line-height:1.55; }
.rmn-methods-kicker{ font-family:'IBM Plex Mono', monospace; font-size:11px; letter-spacing:.1em; text-transform:uppercase; color:var(--rmn-amber-text); }
.rmn-methods-close{ flex-shrink:0; font-family:'IBM Plex Mono', monospace; font-size:11.5px; font-weight:700; letter-spacing:.06em; color:var(--rmn-dim); background:none; border:1px solid var(--rmn-hair); border-radius:2px; padding:5px 9px; cursor:pointer; }
.rmn-methods-close:hover{ color:var(--rmn-ink); border-color:var(--rmn-blue); }
.rmn-methods-toc{ display:flex; flex-wrap:wrap; gap:6px 8px; padding:12px 0; border-bottom:1px solid var(--rmn-hair); }
.rmn-methods-toc a{ font-family:'IBM Plex Mono', monospace; font-size:11px; color:var(--rmn-blue); text-decoration:none; background:var(--rmn-navy-2); border:1px solid var(--rmn-hair); border-radius:2px; padding:3px 7px; }
.rmn-methods-toc a:hover{ border-color:var(--rmn-blue); }
.rmn-methods-sect{ padding:16px 0 4px; border-bottom:1px dashed var(--rmn-hair); }
.rmn-methods-sect:last-child{ border-bottom:0; }
.rmn-methods-sect h3{ font-family:'IBM Plex Mono', monospace; font-size:12px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; border-left:3px solid var(--rmn-blue); padding-left:10px; margin:0 0 6px; }
.rmn-methods-sum{ margin:0 0 10px; font-size:13px; color:var(--rmn-dim); line-height:1.55; }
.rmn-methods-sect dl{ margin:0; display:flex; flex-direction:column; gap:10px; }
.rmn-methods-item dt{ font-size:13px; font-weight:600; margin-bottom:3px; }
.rmn-methods-item dd{ margin:0; }
.rmn-methods-item code{ display:block; white-space:pre-wrap; overflow-wrap:anywhere; font-family:'IBM Plex Mono', monospace; font-size:12px; line-height:1.6; background:var(--rmn-card); border:1px solid var(--rmn-hair); border-radius:2px; padding:7px 10px; color:var(--rmn-ink); font-variant-numeric:tabular-nums; }
.rmn-methods-note{ font-size:12.5px; color:var(--rmn-dim); margin:4px 0 0; line-height:1.5; }
.rmn-methods-refs{ margin:10px 0 8px; font-size:12px; color:var(--rmn-dim); }
.rmn-methods-refs a,.rmn-methods-reflist a{ color:var(--rmn-blue); }
.rmn-methods-reflist{ margin:0 0 8px; padding-left:18px; font-size:13px; display:flex; flex-direction:column; gap:5px; }
@media (max-width:640px){ .rmn-methods-panel{ padding:0 14px 16px; } .rmn-methods-head{ flex-direction:column-reverse; } .rmn-methods-head h2{ font-size:19px; } }
`;
