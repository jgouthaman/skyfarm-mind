import { useMemo, useState } from "react";
import { RegimeBar } from "../RegimeBar";

const AIR_DENSITY = 1.225; // kg/m^3, sea level
const DYNAMIC_VISCOSITY = 1.789e-5; // Pa*s, sea level

interface ReynoldsFormulaCalculatorProps {
  initialVelocity?: number;
  initialChordMm?: number;
}

// Interactive V/L → Reynolds number calculator, ported from the
// torqwings-module-template.html <script> block (calcV/calcL/calcRe +
// regime-bar marker). This is the reference pattern for lesson-specific
// interactive slides registered via a lesson's customComponents map.
export function ReynoldsFormulaCalculator({ props }: { props?: Record<string, unknown> }) {
  const { initialVelocity = 10, initialChordMm = 250 } = (props ?? {}) as ReynoldsFormulaCalculatorProps;
  const [velocity, setVelocity] = useState(initialVelocity);
  const [chordMm, setChordMm] = useState(initialChordMm);

  const reynolds = useMemo(() => {
    const chordM = chordMm / 1000;
    return (AIR_DENSITY * velocity * chordM) / DYNAMIC_VISCOSITY;
  }, [velocity, chordMm]);

  const markerLog10 = reynolds > 0 ? Math.log10(reynolds) : null;

  return (
    <div className="lv-calc">
      <div className="lv-calc-head">🧮 Try it yourself — drag to change the wing</div>

      <div className="lv-calc-row">
        <label>Velocity V</label>
        <input
          type="range" min={2} max={30} step={1} value={velocity}
          onChange={(e) => setVelocity(Number(e.target.value))}
        />
        <span className="lv-val">{velocity} m/s</span>
      </div>

      <div className="lv-calc-row">
        <label>Chord L</label>
        <input
          type="range" min={50} max={500} step={10} value={chordMm}
          onChange={(e) => setChordMm(Number(e.target.value))}
        />
        <span className="lv-val">{chordMm} mm</span>
      </div>

      <div className="lv-calc-result">
        Re ≈ <strong>{Math.round(reynolds).toLocaleString()}</strong>
      </div>

      <div className="lv-calc-bar-wrap lv-illus" style={{ margin: "10px 0 0", padding: "10px 12px 6px" }}>
        <RegimeBar id="regime-calc" markerLog10={markerLog10} minLabel="10³" maxLabel="10⁶·³" />
      </div>
    </div>
  );
}
