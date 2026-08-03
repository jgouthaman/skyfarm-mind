import { AlertTriangle } from 'lucide-react';
import type { DesignStudioOutput, ConfidenceMetric } from '@/lib/intelligence/designStudioBuilder';

const COMP_KEYS = ['frame', 'motors', 'esc', 'battery', 'flight_controller', 'gps', 'payload', 'propellers'];

const SOURCE_BADGE: Record<DesignStudioOutput['source'], string> = {
  rule:      'text-white/70 border-white/20 bg-white/5',
  reference: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
  ai:        'text-amber-400 border-amber-500/30 bg-amber-500/10',
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-white/35">{label}: </span>
      <span className="text-white/75">{value}</span>
    </div>
  );
}

function MetricBar({ metric }: { metric: ConfidenceMetric }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[12px]">
        <span className="text-white/60">{metric.label}</span>
        <span className="text-white/50">{metric.percent}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${metric.percent}%`, background: '#378ADD' }}
        />
      </div>
    </div>
  );
}

// Pure presentation of a DesignStudioOutput — shared by StepDesignStudio
// (the wizard step) and the /destud/projects/$projectId detail page, so the
// configuration/confidence rendering only lives in one place. Callers own
// their own surrounding chrome (page header vs wizard progress, Back link
// vs Back/Next buttons) and their own "no output" empty state, since those
// differ per context.
export function DesignStudioOutputView({ output }: { output: DesignStudioOutput }) {
  const rows: { label: string; value: string }[] = [];
  if (output.droneType)   rows.push({ label: 'Drone type', value: output.droneType });
  if (output.frameSize)   rows.push({ label: 'Frame size', value: output.frameSize });
  if (output.motorClass)  rows.push({ label: 'Motor class', value: output.motorClass });
  if (output.motorCount != null) rows.push({ label: 'Motor count', value: String(output.motorCount) });
  if (output.batteryConfig ?? output.battery) {
    rows.push({ label: 'Battery', value: (output.batteryConfig ?? output.battery)! });
  }
  if (output.escRating)        rows.push({ label: 'ESC rating', value: output.escRating });
  if (output.propellerSpec)    rows.push({ label: 'Propeller', value: output.propellerSpec });
  if (output.flightController) rows.push({ label: 'Flight ctrl', value: output.flightController });
  if (output.twrMin != null)   rows.push({ label: 'Min TWR', value: String(output.twrMin) });
  if (output.flightTimeMin != null || output.flightTimeMax != null) {
    rows.push({ label: 'Flight time', value: `${output.flightTimeMin ?? '—'}–${output.flightTimeMax ?? '—'} min` });
  }
  if (output.matchScore != null) rows.push({ label: 'Match score', value: `${output.matchScore}/100` });
  if (output.payloadDelta != null) rows.push({ label: 'Payload delta', value: `${output.payloadDelta.toFixed(1)} kg` });

  const componentKeys = output.componentList
    ? COMP_KEYS.filter((k) => (output.componentList as Record<string, unknown>)?.[k])
    : [];

  const requirementEntries = output.requirements ? Object.entries(output.requirements) : [];

  return (
    <div className="space-y-4">

      {/* ── Header ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="text-2xl font-semibold text-white">{output.designName}</h2>
        <span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full border ${SOURCE_BADGE[output.source]}`}>
          {output.sourceLabel}
        </span>
      </div>
      <p className="text-xs text-white/40">Generated configuration for this design</p>

      {/* ── AI disclaimer — prominent, non-dismissable ── */}
      {output.source === 'ai' && output.aiDisclaimer && (
        <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
          <p className="text-xs font-medium text-amber-300">{output.aiDisclaimer}</p>
        </div>
      )}

      {/* ── Generated configuration ── */}
      <div
        className="rounded-xl border p-5 space-y-3"
        style={{ background: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.15)' }}
      >
        <p className="text-[11px] uppercase tracking-widest text-white/30 font-medium">
          Configuration
        </p>

        {rows.length > 0 && (
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12px]">
            {rows.map((r) => <Row key={r.label} label={r.label} value={r.value} />)}
          </div>
        )}

        {(output.costMinInr != null || output.costMaxInr != null) && (
          <p className="text-[12px] text-white/50">
            ₹{(output.costMinInr ?? 0).toLocaleString('en-IN')}
            {' – '}
            ₹{(output.costMaxInr ?? 0).toLocaleString('en-IN')}
          </p>
        )}

        {output.riskLevel && (
          <span className={`inline-block text-[11px] px-2 py-0.5 rounded-full border ${
            output.riskLevel === 'Safe'    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' :
            output.riskLevel === 'Warning' ? 'bg-amber-500/15 border-amber-500/30 text-amber-400' :
                                              'bg-red-500/15 border-red-500/30 text-red-400'
          }`}>
            {output.riskLevel}
          </span>
        )}

        {(output.riskFlags ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {output.riskFlags!.map((f, i) => (
              <span
                key={i}
                className="text-[11px] px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-300"
              >
                {f}
              </span>
            ))}
          </div>
        )}

        {output.engineerNotes && (
          <p className="text-[12px] text-white/45 bg-white/5 rounded-lg p-3 leading-relaxed">
            {output.engineerNotes}
          </p>
        )}

        {componentKeys.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-widest text-white/25 mb-1.5">
              Components
            </p>
            {componentKeys.map((k) => {
              const val = (output.componentList as Record<string, Record<string, unknown>>)[k];
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
        )}

        {requirementEntries.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-widest text-white/25 mb-1.5">
              Requirements
            </p>
            {requirementEntries.map(([k, v]) => (
              <div key={k} className="flex justify-between items-center py-1 border-b border-white/5 last:border-0">
                <span className="text-white/40 text-xs capitalize">{k.replace(/_/g, ' ')}</span>
                <span className="text-white/70 text-xs text-right max-w-[55%]">
                  {typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Confidence metrics ── */}
      {output.confidenceMetrics.length > 0 && (
        <div
          className="rounded-xl border p-5 space-y-3"
          style={{ background: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.15)' }}
        >
          <p className="text-[11px] uppercase tracking-widest text-white/30 font-medium">
            Confidence
          </p>
          <div className="space-y-3">
            {output.confidenceMetrics.map((m) => <MetricBar key={m.label} metric={m} />)}
          </div>
        </div>
      )}

    </div>
  );
}
