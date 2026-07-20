// Shared Reynolds-number regime gradient bar with an optional marker —
// used by the static Illustration "regimeBar" chart and by the live
// ReynoldsFormulaCalculator, so the two stay visually identical.

const LOG_MIN = 3;
const LOG_MAX = 6.3;
const BAR_X = 20;
const BAR_W = 600;

export function logToX(log10Value: number): number {
  const p = Math.min(1, Math.max(0, (log10Value - LOG_MIN) / (LOG_MAX - LOG_MIN)));
  return BAR_X + p * BAR_W;
}

export function RegimeBar({
  id, markerLog10, minLabel, maxLabel, bandStartLog10, bandEndLog10, bandLabel,
}: {
  id: string;
  markerLog10: number | null;
  minLabel: string;
  maxLabel: string;
  bandStartLog10?: number;
  bandEndLog10?: number;
  bandLabel?: string;
}) {
  const hasBand = bandStartLog10 != null && bandEndLog10 != null;
  const bandX1 = hasBand ? logToX(bandStartLog10!) : 0;
  const bandX2 = hasBand ? logToX(bandEndLog10!) : 0;
  const markerX = markerLog10 != null ? logToX(markerLog10) : null;

  return (
    <svg viewBox="0 0 640 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--lv-force-red)" />
          <stop offset="35%" stopColor="var(--lv-amber)" />
          <stop offset="75%" stopColor="var(--lv-note)" />
          <stop offset="100%" stopColor="var(--lv-force-blue)" />
        </linearGradient>
      </defs>
      <rect x={BAR_X} y="46" width={BAR_W} height="10" rx="5" fill={`url(#${id})`} opacity=".85" />
      {hasBand && (
        <rect
          x={bandX1} y="40" width={Math.max(0, bandX2 - bandX1)} height="22" rx="11"
          fill="none" stroke="var(--lv-amber-bright)" strokeWidth="2" strokeDasharray="4 3"
        />
      )}
      {hasBand && bandLabel && (
        <text x={(bandX1 + bandX2) / 2} y="34" fill="var(--lv-amber-bright)" fontFamily="JetBrains Mono" fontSize="11" textAnchor="middle">
          {bandLabel}
        </text>
      )}
      {markerX != null && (
        <>
          <line x1={markerX} y1="30" x2={markerX} y2="66" stroke="var(--lv-ink)" strokeWidth="2" />
          <circle cx={markerX} cy="30" r="4" fill="var(--lv-amber-bright)" />
        </>
      )}
      <text x={BAR_X} y="78" fill="var(--lv-dim)" fontFamily="JetBrains Mono" fontSize="10">{minLabel}</text>
      <text x={BAR_X + BAR_W} y="78" fill="var(--lv-dim)" fontFamily="JetBrains Mono" fontSize="10" textAnchor="end">{maxLabel}</text>
    </svg>
  );
}
