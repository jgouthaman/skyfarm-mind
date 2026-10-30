// Semicircular decibel meter (spec §0.2 Tab 4 / §0.4): green up to the
// target, amber within the ±5 dB uncertainty above it, red beyond; a marker
// at the target, a needle that eases to each new value, and a large digital
// dBA readout in the centre. Pure display -- the value always comes from
// the engine.

const W = 280;
const R = 110;
const CX = W / 2;
const CY = 130;
const STROKE = 22;

function polar(angleDeg: number, r = R) {
  const a = (Math.PI * (180 - angleDeg)) / 180;
  return { x: CX + r * Math.cos(a), y: CY - r * Math.sin(a) };
}

function arc(fromDeg: number, toDeg: number) {
  const a = polar(fromDeg);
  const b = polar(toDeg);
  return `M ${a.x} ${a.y} A ${R} ${R} 0 0 1 ${b.x} ${b.y}`;
}

export function DecibelGauge({
  value,
  target,
  label = "dBA",
  caption,
  size = 280,
}: {
  value: number | null;
  target: number | null;
  label?: string;
  caption?: string;
  size?: number;
}) {
  const centre = target ?? value ?? 60;
  const min = Math.floor((centre - 25) / 5) * 5;
  const max = min + 50;
  const toDeg = (v: number) => (Math.min(max, Math.max(min, v)) - min) / (max - min) * 180;
  const needle = value === null ? 0 : toDeg(value);
  const zones =
    target === null
      ? [{ from: 0, to: 180, color: "#A9BBCB" }]
      : [
          { from: 0, to: toDeg(target), color: "var(--rmn-pass)" },
          { from: toDeg(target), to: toDeg(target + 5), color: "var(--rmn-warn)" },
          { from: toDeg(target + 5), to: 180, color: "var(--rmn-fail)" },
        ];
  // Needle: a pointer just inside the arc, so it never crosses the readout.
  const tail = polar(0, R - STROKE / 2 - 30);
  const tip = polar(0, R - STROKE / 2 - 3);
  const tm = target === null ? null : { a: polar(toDeg(target), R + STROKE / 2 + 2), b: polar(toDeg(target), R - STROKE / 2 - 2) };
  const tl = target === null ? null : polar(toDeg(target), R + STROKE / 2 + 14);

  return (
    <figure className="m-0 flex flex-col items-center" aria-label={`${value === null ? "No reading" : `${value.toFixed(1)} ${label}`}${target !== null ? `, target ${target} ${label}` : ""}`}>
      <svg viewBox={`0 0 ${W} 160`} width={size} style={{ maxWidth: "100%", height: "auto" }} role="img">
        {zones.map((z, i) =>
          z.to > z.from ? <path key={i} d={arc(z.from, z.to)} stroke={z.color} strokeWidth={STROKE} fill="none" /> : null,
        )}
        {tm && tl && (
          <g>
            <line x1={tm.a.x} y1={tm.a.y} x2={tm.b.x} y2={tm.b.y} stroke="var(--rmn-ink)" strokeWidth={3} />
            <text x={tl.x} y={tl.y} fontSize={10} textAnchor="middle" fill="var(--rmn-ink)" className="rmn-mono">
              target {target}
            </text>
          </g>
        )}
        <text x={polar(0).x + 4} y={CY + 16} fontSize={10} fill="var(--rmn-dim)" textAnchor="start">{min}</text>
        <text x={polar(180).x - 4} y={CY + 16} fontSize={10} fill="var(--rmn-dim)" textAnchor="end">{max}</text>
        {value !== null && (
          // Drawn pointing at the scale minimum, then rotated clockwise, so
          // the CSS transform transition eases the needle between readings.
          <line
            x1={tail.x}
            y1={tail.y}
            x2={tip.x}
            y2={tip.y}
            stroke="var(--rmn-ink)"
            strokeWidth={5}
            strokeLinecap="round"
            style={{
              transform: `rotate(${needle}deg)`,
              transformOrigin: `${CX}px ${CY}px`,
              transition: "transform 700ms cubic-bezier(.2,.8,.2,1)",
            }}
          />
        )}
        <text x={CX} y={CY - 32} textAnchor="middle" className="rmn-num" fontSize={34} fill="var(--rmn-ink)">
          {value === null ? "--" : value.toFixed(1)}
        </text>
        <text x={CX} y={CY - 14} textAnchor="middle" fontSize={12} fill="var(--rmn-dim)">{label}</text>
      </svg>
      {caption && <figcaption className="rmn-label -mt-1 text-center">{caption}</figcaption>}
    </figure>
  );
}
