import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useCurrentProject } from "@/lib/design-studio/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Disclaimer } from "@/components/design-studio/sidebar";
import { riskColor } from "@/lib/design-studio/engine";
import { buildComplianceReport } from "@/lib/design-studio/compliance";
import { ShieldAlert, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { StudioStepNav } from "@/components/design-studio/step-nav";
import { StudioTabNav } from "@/components/design-studio/StudioTabNav";
import type { IntelligenceResult } from "@/lib/intelligence/types";

export const Route = createFileRoute("/mission-hub/torqwings-design-studio/design")({
  component: DesignResult,
});

const COMP_KEYS = ['frame', 'motors', 'esc', 'battery', 'flight_controller', 'gps', 'payload', 'propellers'] as const;

const CONF_STYLE = {
  high:   { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)', color: '#34d399', label: 'High confidence' },
  medium: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', color: '#fbbf24', label: 'Medium confidence' },
  low:    { bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.3)',  color: '#f87171', label: 'Low confidence'   },
} as const;

function twrColor(twr: number | null) {
  if (twr === null) return 'text-white/50';
  if (twr >= 2.0)  return 'text-emerald-400';
  if (twr >= 1.5)  return 'text-amber-400';
  return 'text-red-400';
}

const STUDIO_DARK_VARS = {
  '--foreground':       'oklch(0.95 0.01 250)',
  '--muted-foreground': 'oklch(0.58 0.04 250)',
  '--border':           'oklch(0.95 0.01 250 / 15%)',
  '--primary':          'oklch(0.65 0.15 235)',
  '--card':             'oklch(0.14 0.04 250)',
  '--muted':            'oklch(0.18 0.03 250)',
} as React.CSSProperties;

function DesignResult() {
  const project = useCurrentProject();

  const rec       = project?.design_recommendation ?? null;
  const hasNewRec = rec !== null;
  const hasOldRec = !!project?.recommendedDesign;

  if (!hasNewRec && !hasOldRec) {
    return (
      <Empty
        msg="No design generated yet. Capture mission requirements first."
        cta="/mission-hub/torqwings-design-studio/requirements"
        ctaLabel="Open requirements"
      />
    );
  }

  if (hasNewRec) {
    return (
      <div className="space-y-6" style={STUDIO_DARK_VARS}>
        <StudioTabNav />
        <header>
          <h1 className="text-2xl font-semibold">Drone Design Result</h1>
          <p className="text-sm text-muted-foreground mt-1">{project!.projectName} · {project!.vertical}</p>
        </header>
        <NewDesignView rec={rec!} />
        <StudioStepNav />
        <Disclaimer />
      </div>
    );
  }

  // ── Old render path (recommendedDesign from studio_designs table) ──
  const d = project!.recommendedDesign!;
  const cards: Array<[string, string]> = [
    ["Recommended Drone Type", d.droneType],
    ["Frame Size", d.frameSize],
    ["Motor Class", d.motorClass],
    ["ESC Rating", d.escRating],
    ["Propeller Size", d.propellerSize],
    ["Battery", d.battery],
    ["Flight Controller", d.flightController],
    ["GPS & Navigation", d.gps],
    ["Payload System", d.payloadSystem],
    ["Estimated Flight Time", `${d.estimatedFlightTime} min`],
    ["Estimated Cost Range", `₹${d.estimatedCost.min.toLocaleString("en-IN")} – ₹${d.estimatedCost.max.toLocaleString("en-IN")}`],
    ["Risk Level", d.riskLevel],
  ];
  return (
    <div className="space-y-6" style={STUDIO_DARK_VARS}>
      <StudioTabNav />
      <header>
        <h1 className="text-2xl font-semibold">Drone Design Result</h1>
        <p className="text-sm text-muted-foreground mt-1">{project!.projectName} · {project!.vertical}</p>
      </header>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {cards.map(([k, v]) => (
          <div key={k} className="rounded-xl border border-border/60 bg-card/60 p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{k}</div>
            <div className={`mt-1.5 text-base font-medium ${k === "Risk Level" ? riskColor(d.riskLevel).split(" ")[0] : ""}`}>{v}</div>
          </div>
        ))}
      </div>
      {d.notes.length > 0 && (
        <div className="rounded-xl border border-border/60 bg-card/60 p-5">
          <div className="text-sm font-semibold mb-2">Engineering Notes</div>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
            {d.notes.map((n, i) => <li key={i}>{n}</li>)}
          </ul>
        </div>
      )}
      <ComplianceCard />
      <StudioStepNav />
      <Disclaimer />
    </div>
  );
}

function NewDesignView({ rec }: { rec: IntelligenceResult }) {
  const rule = rec.matched_rule;
  const ref  = rec.matched_reference;
  const conf = CONF_STYLE[rec.confidence];

  return (
    <div className="space-y-6">

      {/* ── Section 1: Design Summary ── */}
      <div className="rounded-xl border border-border/60 bg-card/60 p-6 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Recommended Drone</p>
            <h2 className="text-2xl font-semibold">{rule?.drone_type ?? '—'}</h2>
            {rule?.rule_name && <p className="text-sm text-muted-foreground mt-0.5">{rule.rule_name}</p>}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {rule?.risk_level && (
              <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
                rule.risk_level === 'low'    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' :
                rule.risk_level === 'medium' ? 'bg-amber-500/15 border-amber-500/30 text-amber-400' :
                                               'bg-red-500/15 border-red-500/30 text-red-400'
              }`}>{rule.risk_level}</span>
            )}
            {ref && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/50">
                Based on: {ref.name}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {([
            ['Frame size',        rule?.frame_size],
            ['Motor class',       rule?.motor_class],
            ['Motor count',       rule?.motor_count != null ? String(rule.motor_count) : null],
            ['Battery config',    rule?.battery_config],
            ['ESC rating',        rule?.esc_rating],
            ['Propeller spec',    rule?.propeller_spec],
            ['Flight controller', rule?.flight_controller],
            ['Min TWR',           rule?.twr_min != null ? String(rule.twr_min) : null],
          ] as [string, string | null][]).filter(([, v]) => v).map(([k, v]) => (
            <div key={k} className="rounded-lg border border-border/40 bg-black/20 p-3">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{k}</div>
              <div className="mt-1 text-sm font-medium">{v}</div>
            </div>
          ))}
        </div>

        {(rule?.cost_min_inr != null || rule?.cost_max_inr != null) && (
          <p className="text-sm text-muted-foreground">
            Estimated cost:{' '}
            <span className="font-medium text-white">
              ₹{(rule!.cost_min_inr ?? 0).toLocaleString('en-IN')} – ₹{(rule!.cost_max_inr ?? 0).toLocaleString('en-IN')}
            </span>
          </p>
        )}
      </div>

      {/* ── Section 2: Bill of Materials ── */}
      <div className="rounded-xl border border-border/60 bg-card/60 p-6 space-y-4">
        <h3 className="text-sm font-semibold">Bill of Materials</h3>
        {ref?.component_list ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {COMP_KEYS.filter(k => (ref.component_list as Record<string, unknown>)?.[k]).map(k => {
              const val = (ref.component_list as Record<string, Record<string, unknown>>)[k];
              const secondary = Object.entries(val)
                .filter(([key]) => key !== 'model')
                .map(([key, v]) => `${key.replace(/_/g, ' ')}: ${v}`)
                .join(' · ');
              return (
                <div key={k} className="rounded-lg border border-border/40 bg-black/20 p-3">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">{k.replace(/_/g, ' ')}</div>
                  <div className="text-sm font-medium">{(val.model as string) ?? '—'}</div>
                  {secondary && <div className="text-[11px] text-muted-foreground mt-1">{secondary}</div>}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Component list will be available once a proven design is matched.
          </p>
        )}
      </div>

      {/* ── Section 3: Performance Estimates ── */}
      <div className="rounded-xl border border-border/60 bg-card/60 p-6 space-y-4">
        <h3 className="text-sm font-semibold">Performance Estimates</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="rounded-lg border border-border/40 bg-black/20 p-3">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Flight time</div>
            <div className="mt-1 text-sm font-medium">
              {rule?.flight_time_min != null
                ? rule.flight_time_max != null
                  ? `${rule.flight_time_min} – ${rule.flight_time_max} min`
                  : `${rule.flight_time_min} min`
                : '—'}
            </div>
          </div>
          <div className="rounded-lg border border-border/40 bg-black/20 p-3">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Min TWR</div>
            <div className={`mt-1 text-sm font-medium ${twrColor(rule?.twr_min ?? null)}`}>
              {rule?.twr_min != null ? `${rule.twr_min}×` : '—'}
            </div>
          </div>
          <div className="rounded-lg border border-border/40 bg-black/20 p-3">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Cost range</div>
            <div className="mt-1 text-sm font-medium">
              {rule?.cost_min_inr != null
                ? `₹${rule.cost_min_inr.toLocaleString('en-IN')} – ₹${(rule.cost_max_inr ?? 0).toLocaleString('en-IN')}`
                : '—'}
            </div>
          </div>
          <div className="rounded-lg border border-border/40 bg-black/20 p-3">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Risk level</div>
            <div className={`mt-1 text-sm font-medium ${
              rule?.risk_level === 'low'    ? 'text-emerald-400' :
              rule?.risk_level === 'medium' ? 'text-amber-400'   :
              rule?.risk_level              ? 'text-red-400'     : ''
            }`}>{rule?.risk_level ?? '—'}</div>
          </div>
          <div className="rounded-lg border border-border/40 bg-black/20 p-3">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Motor config</div>
            <div className="mt-1 text-sm font-medium">
              {rule?.motor_count != null && rule?.motor_class
                ? `${rule.motor_count} × ${rule.motor_class}`
                : rule?.motor_count != null ? `${rule.motor_count} motors` : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 4: Match Intelligence ── */}
      <div className="rounded-xl border border-border/60 bg-card/60 p-6 space-y-4">
        <h3 className="text-sm font-semibold">Match Intelligence</h3>
        <div className="flex flex-wrap items-center gap-3">
          <span
            className="text-xs px-3 py-1 rounded-full border font-medium"
            style={{ background: conf.bg, borderColor: conf.border, color: conf.color }}
          >
            {conf.label}
          </span>
          <span className="text-xs text-muted-foreground">
            Rule score: <span className="text-white font-medium">{rec.rule_confidence_score}/100</span>
          </span>
          <span className="text-xs text-muted-foreground">
            Reference score: <span className="text-white font-medium">{rec.reference_score}/100</span>
          </span>
        </div>

        {rec.is_fallback && rec.fallback_reason && (
          <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <div>
              <p className="text-xs font-medium text-amber-400">Nearest rule used — not an exact match</p>
              <p className="mt-0.5 text-xs text-amber-300/70">{rec.fallback_reason}</p>
            </div>
          </div>
        )}

        {rule?.engineer_notes && (
          <div className="rounded-lg bg-black/20 border border-border/40 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Engineer notes</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{rule.engineer_notes}</p>
          </div>
        )}

        {(rule?.risk_flags ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {rule!.risk_flags!.map((f, i) => (
              <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-300">
                {f}
              </span>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

function ComplianceCard() {
  const project = useCurrentProject()!;
  const baseline = useMemo(() => buildComplianceReport(project).allUpWeightKg, [project]);
  const [auw, setAuw] = useState<number>(Number(baseline.toFixed(2)));
  const report = useMemo(() => buildComplianceReport(project, auw), [project, auw]);
  const tone = report.category === "Nano" || report.category === "Micro"
    ? "text-emerald-700 border-emerald-500/30 bg-emerald-500/10"
    : report.category === "Small"
      ? "text-amber-700 border-amber-500/30 bg-amber-500/10"
      : "text-rose-400 border-rose-500/30 bg-rose-500/10";

  const breakpoints = [
    { upTo: 0.25, label: "Nano" },
    { upTo: 2, label: "Micro" },
    { upTo: 25, label: "Small" },
    { upTo: 150, label: "Medium" },
    { upTo: Infinity, label: "Large" },
  ];
  const next = breakpoints.find((b) => auw <= b.upTo && b.upTo !== Infinity && auw < b.upTo);
  const nextHint = next ? `+${(next.upTo - auw).toFixed(2)} kg → moves to ${breakpoints[breakpoints.indexOf(next) + 1]?.label ?? "Large"} class` : null;

  return (
    <div className="rounded-xl border border-border/60 bg-card/60 p-5 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-sky-700" />
          <h2 className="font-semibold">DGCA & NPNT Compliance Rating</h2>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${tone}`}>
          {report.category} class · {report.weightBand}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        Edit estimated All-Up Weight to see how component swaps (heavier battery, extra sensors, larger tank) push the design into a different DGCA class.
      </p>

      <div className="grid sm:grid-cols-[260px_1fr] gap-4 items-start">
        <div className="space-y-2">
          <Label className="text-xs">Estimated All-Up Weight (kg)</Label>
          <Input type="number" step={0.1} min={0} value={auw} onChange={(e) => setAuw(+e.target.value)} />
          <div className="text-[11px] text-muted-foreground">
            Baseline from current design: <span className="font-medium">{baseline.toFixed(2)} kg</span>
            <button className="ml-2 underline text-sky-700" onClick={() => setAuw(Number(baseline.toFixed(2)))}>reset</button>
          </div>
          {nextHint && <div className="text-[11px] text-amber-700">{nextHint}</div>}
          <div className="text-[11px] text-muted-foreground pt-1">
            Altitude ceiling: <span className="font-medium">{report.maxAltitudeFtAgl} ft AGL</span>
          </div>
        </div>

        <ul className="grid sm:grid-cols-2 gap-1.5">
          {report.checks.map((c) => (
            <li key={c.id} className="flex items-start gap-2 text-xs rounded border border-border/40 px-2.5 py-1.5">
              {c.ok
                ? <CheckCircle2 className="h-3.5 w-3.5 text-amber-700 mt-0.5 shrink-0" />
                : <XCircle className="h-3.5 w-3.5 text-emerald-700 mt-0.5 shrink-0" />}
              <div>
                <div className="font-medium">{c.label}</div>
                <div className="text-muted-foreground">{c.detail}</div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex justify-end">
        <Button asChild variant="outline" size="sm">
          <Link to="/mission-hub/torqwings-design-studio/compliance">Open full compliance checklist →</Link>
        </Button>
      </div>
    </div>
  );
}

function Empty({ msg, cta, ctaLabel }: { msg: string; cta: string; ctaLabel: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/60 p-10 text-center">
      <p className="text-sm text-muted-foreground">{msg}</p>
      <Button asChild className="mt-4"><Link to={cta as never}>{ctaLabel}</Link></Button>
    </div>
  );
}
