import { useState } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import type { IntelligenceResult, IntelligenceInput } from '@/lib/intelligence/types';

interface Props {
  result:     IntelligenceResult | null;
  input:      IntelligenceInput;
  onAccept:   (choice: 'rule' | 'reference') => void;
  onBack:     () => void;
  onRetry:    () => void;
  isLoading:  boolean;
  error:      string | null;
}

const COMP_KEYS = ['frame', 'motors', 'esc', 'battery', 'flight_controller', 'gps', 'payload', 'propellers'];

function Stars({ n }: { n: number }) {
  const color = n >= 4 ? 'text-emerald-400' : n >= 3 ? 'text-amber-400' : 'text-red-400';
  return (
    <span className={`font-mono text-[13px] ${color}`}>
      {'★'.repeat(n)}{'☆'.repeat(5 - n)}
    </span>
  );
}

function RiskBadge({ level }: { level: string | null }) {
  if (!level) return null;
  const cls =
    level === 'Safe'    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' :
    level === 'Warning' ? 'bg-amber-500/15 border-amber-500/30 text-amber-400' :
                          'bg-red-500/15 border-red-500/30 text-red-400';
  return (
    <span className={`text-[11px] px-2 py-0.5 rounded-full border ${cls}`}>{level}</span>
  );
}

function Spec({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <span className="text-white/35">{label}: </span>
      <span className="text-white/75">{value}</span>
    </div>
  );
}

const BANNER = {
  high:   { bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.3)', color: '#34d399', label: 'High confidence match' },
  medium: { bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.3)', color: '#fbbf24', label: 'Partial match — review recommended' },
  low:    { bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.3)',  color: '#f87171', label: 'No direct match — engineer review required' },
} as const;

export function StepRecommendation({ result, onAccept, onBack, onRetry, isLoading, error }: Props) {

  const [selected, setSelected] = useState<'rule' | 'reference' | null>(() => {
    if (!result) return null;
    if (!result.matched_rule) return 'reference';
    if (!result.matched_reference) return 'rule';
    return result.rule_confidence_score >= result.reference_score ? 'rule' : 'reference';
  });

  /* ── Loading state ── */
  if (isLoading) {
    return (
      <div
        className="rounded-2xl border p-8 flex flex-col items-center justify-center gap-4 min-h-[280px]"
        style={{ background: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.15)' }}
      >
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#378ADD' }} />
        <div className="text-center">
          <p className="text-white font-medium">Analysing your requirements...</p>
          <p className="text-sm text-white/50 mt-1">Matching design rules and proven designs</p>
        </div>
      </div>
    );
  }

  /* ── Error state ── covers both a real caught error and the otherwise-
     impossible "finished loading, nothing came back" case, so there's never
     a silent stuck-looking screen with no explanation. */
  if (error || !result) {
    return (
      <div
        className="rounded-2xl border p-8 flex flex-col items-center justify-center gap-4 min-h-[280px]"
        style={{ background: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.15)' }}
      >
        <div className="grid h-12 w-12 place-items-center rounded-full bg-red-500/15 border border-red-500/30">
          <AlertTriangle className="h-6 w-6 text-red-400" aria-hidden="true" />
        </div>
        <div className="text-center">
          <p className="text-white font-medium">Something went wrong</p>
          <p className="text-sm text-white/50 mt-1">
            {error ?? 'No analysis result came back. Please try again.'}
          </p>
        </div>
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onBack}
            className="h-10 px-6 rounded-lg text-sm text-white/60 hover:text-white border border-white/10 hover:border-white/20 transition-colors"
          >
            Back
          </button>
          <button
            type="button"
            onClick={onRetry}
            className="h-10 px-6 rounded-lg text-sm font-medium text-white hover:opacity-90 transition-opacity"
            style={{ background: '#378ADD' }}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const { matched_rule: rule, matched_reference: ref, confidence, summary } = result;
  const banner = BANNER[confidence];

  return (
    <div className="space-y-4">

      {/* ── Section A — Confidence banner ── */}
      <div
        className="rounded-xl p-4"
        style={{ background: banner.bg, border: `0.5px solid ${banner.border}` }}
      >
        <p className="text-sm font-semibold mb-1" style={{ color: banner.color }}>
          {banner.label}
        </p>
        <p className="text-sm text-white/60">{summary}</p>
      </div>

      {result.is_fallback && result.fallback_reason && (
        <div className="mt-3 flex items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <div>
            <p className="text-xs font-medium text-amber-400">Nearest rule used — not an exact match</p>
            <p className="mt-0.5 text-xs text-amber-300/70">{result.fallback_reason}</p>
          </div>
        </div>
      )}

      {/* ── Section B — Two columns ── */}
      <p className="text-xs text-white/40">Select the recommendation to use as your design base</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Left — Matched Rule */}
        <div
          className={[
            "relative rounded-xl border p-5 space-y-3 transition-all",
            rule
              ? selected === 'rule'
                ? "border-blue-500 bg-blue-500/5 ring-1 ring-blue-500/30 cursor-pointer"
                : "border-white/10 opacity-60 cursor-pointer"
              : "border-white/10 opacity-40",
          ].join(' ')}
          onClick={rule ? () => setSelected('rule') : undefined}
        >
          {selected === 'rule' && rule && (
            <div className="absolute top-3 right-3 flex items-center gap-1.5 rounded-full bg-blue-500 px-2 py-0.5 text-[10px] font-medium text-white">
              ✓ Selected
            </div>
          )}
          <p className="text-[11px] uppercase tracking-widest text-white/30 font-medium">
            Matched Rule
          </p>

          {rule ? (
            <>
              <h3 className="text-white font-semibold text-base leading-snug">
                {rule.rule_name ?? rule.drone_type}
              </h3>

              {result.is_fallback && (
                <span className="inline-block rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-400">
                  Nearest match
                </span>
              )}

              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12px]">
                <Spec label="Drone type"  value={rule.drone_type} />
                <Spec label="Frame size"  value={rule.frame_size} />
                <Spec label="Motor class" value={rule.motor_class} />
                <Spec label="Motor count" value={rule.motor_count != null ? String(rule.motor_count) : null} />
                <Spec label="Battery"     value={rule.battery_config} />
                <Spec label="ESC rating"  value={rule.esc_rating} />
                <Spec label="Propeller"   value={rule.propeller_spec} />
                <Spec label="Flight ctrl" value={rule.flight_controller} />
                {rule.twr_min != null && (
                  <Spec label="Min TWR" value={String(rule.twr_min)} />
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <RiskBadge level={rule.risk_level} />
                <Stars n={rule.confidence_level} />
              </div>

              {(rule.cost_min_inr != null || rule.cost_max_inr != null) && (
                <p className="text-[12px] text-white/50">
                  ₹{(rule.cost_min_inr ?? 0).toLocaleString('en-IN')}
                  {' – '}
                  ₹{(rule.cost_max_inr ?? 0).toLocaleString('en-IN')}
                </p>
              )}

              {rule.engineer_notes && (
                <p className="text-[12px] text-white/45 bg-white/5 rounded-lg p-3 leading-relaxed">
                  {rule.engineer_notes}
                </p>
              )}

              {(rule.risk_flags ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {rule.risk_flags!.map((f, i) => (
                    <span
                      key={i}
                      className="text-[11px] px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-300"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="py-8 text-center space-y-1">
              <p className="text-white/40 text-sm">No matching rule found</p>
              <p className="text-white/25 text-[12px]">
                Try adjusting payload or flight time requirements
              </p>
            </div>
          )}
        </div>

        {/* Right — Closest Proven Design */}
        <div
          className={[
            "relative rounded-xl border p-5 space-y-3 transition-all",
            ref
              ? selected === 'reference'
                ? "border-blue-500 bg-blue-500/5 ring-1 ring-blue-500/30 cursor-pointer"
                : "border-white/10 opacity-60 cursor-pointer"
              : "border-white/10 opacity-40",
          ].join(' ')}
          onClick={ref ? () => setSelected('reference') : undefined}
        >
          {selected === 'reference' && ref && (
            <div className="absolute top-3 right-3 flex items-center gap-1.5 rounded-full bg-blue-500 px-2 py-0.5 text-[10px] font-medium text-white">
              ✓ Selected
            </div>
          )}
          <p className="text-[11px] uppercase tracking-widest text-white/30 font-medium">
            Closest Proven Design
          </p>

          {ref ? (
            <>
              <h3 className="text-white font-semibold text-base leading-snug">{ref.name}</h3>

              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12px]">
                <Spec label="Drone type"  value={ref.drone_type} />
                <Spec label="Frame size"  value={ref.frame_size} />
                <Spec label="Motor class" value={ref.motor_class} />
                <Spec label="Battery"     value={ref.battery} />
              </div>

              <div className="flex items-center gap-3 flex-wrap text-[12px]">
                <span className="text-white/50">
                  Score: <span className="text-white font-medium">{ref.score}/100</span>
                </span>
                <span className={
                  ref.payload_delta < 2   ? 'text-emerald-400 font-medium' :
                  ref.payload_delta <= 5  ? 'text-amber-400 font-medium' :
                                            'text-red-400 font-medium'
                }>
                  Payload delta: {ref.payload_delta.toFixed(1)} kg
                </span>
              </div>

              {ref.engineer_notes && (
                <p className="text-[12px] text-white/45 bg-white/5 rounded-lg p-3 leading-relaxed">
                  {ref.engineer_notes}
                </p>
              )}

              {ref.component_list && (() => {
                const keys = COMP_KEYS.filter(k => (ref.component_list as Record<string, unknown>)?.[k]);
                if (keys.length === 0) return null;
                return (
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-widest text-white/25 mb-1.5">
                      Components
                    </p>
                    {keys.map(k => {
                      const val = (ref.component_list as Record<string, Record<string, unknown>>)[k];
                      const display = typeof val === 'object' && val !== null
                        ? (val.model as string) ?? JSON.stringify(val)
                        : String(val);
                      return (
                        <div key={k} className="flex justify-between items-center py-1 border-b border-white/5 last:border-0">
                          <span className="text-white/40 text-xs capitalize">{k.replace(/_/g, ' ')}</span>
                          <span className="text-white/70 text-xs text-right max-w-[55%]">{display}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </>
          ) : (
            <div className="py-8 text-center">
              <p className="text-white/40 text-sm">No proven design found</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Section C — Action bar ── */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={onBack}
          className="h-10 px-6 rounded-lg text-sm text-white/60 hover:text-white border border-white/10 hover:border-white/20 transition-colors"
        >
          Back
        </button>
        <button
          type="button"
          onClick={() => onAccept(selected!)}
          disabled={selected === null || isLoading}
          className="h-10 px-8 rounded-lg text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity inline-flex items-center gap-2"
          style={{ background: '#378ADD' }}
        >
          {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Save &amp; Continue →
        </button>
      </div>

    </div>
  );
}
