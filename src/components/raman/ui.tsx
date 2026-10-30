import type { ButtonHTMLAttributes, ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, Lock, XCircle } from "lucide-react";
import type { RamanVerdict } from "@/lib/raman/ramanTypes";

// Ask Raman (Bay 16) look -- the same UX/UI as Bay 01 Mission Agent
// (the-hangar.mission.tsx HGR_MISSION_CSS): white page on a faint blue
// grid, light-blue panels with hairline borders, 2px corners, IBM Plex Mono
// uppercase labels, Space Grotesk headings, amber primary buttons. Verdict
// colours green/amber/red always come with an icon and a label, never
// colour alone. Scoped to .rmn so the rest of Mission Hub is unchanged.

export const RAMAN_CSS = `
.rmn{
  --rmn-navy:#0A1826; --rmn-navy-2:#E4EEF7; --rmn-navy-line:rgba(62,124,166,0.28);
  --rmn-card:#F2F7FB; --rmn-ink:#0A1826; --rmn-dim:#4F6B80; --rmn-hair:rgba(62,124,166,0.28);
  --rmn-on-navy:#12222F; --rmn-on-navy-dim:#4F6B80;
  --rmn-blue:#1C74B8; --rmn-blue-line:#3E7CA6; --rmn-grid:rgba(62,124,166,0.14);
  --rmn-accent:#E8A33D; --rmn-accent-ink:#0A1826; --rmn-amber-text:#B4690E;
  --rmn-pass:#0CA30C; --rmn-pass-ink:#006300;
  --rmn-warn:#FAB219; --rmn-warn-ink:#8A5A00;
  --rmn-fail:#D03B3B; --rmn-fail-ink:#A32323;
  --rmn-info:#4F6B80;
  /* chart series, fixed order: tonal, interaction, broadband, motor */
  --rmn-s1:#2A78D6; --rmn-s2:#EB6834; --rmn-s3:#1BAF7A; --rmn-s4:#EDA100;
  background:#FFFFFF; color:var(--rmn-on-navy);
  background-image:linear-gradient(var(--rmn-grid) 1px, transparent 1px), linear-gradient(90deg, var(--rmn-grid) 1px, transparent 1px);
  background-size:44px 44px;
  border:1px solid var(--rmn-hair); border-radius:2px; padding:20px;
  font-family:'IBM Plex Sans', sans-serif;
}
@media (min-width:1024px){ .rmn{ padding:32px; } }
.rmn [class*="rounded"]{ border-radius:2px !important; }
.rmn h1, .rmn h2 { font-family:'Space Grotesk', sans-serif; font-weight:600; letter-spacing:-0.01em; }
.rmn-card{ background:var(--rmn-card); color:var(--rmn-ink); border:1px solid var(--rmn-hair); border-radius:2px; padding:18px; }
/* Card titles: Bay 01's panel-title bar (mono, uppercase, blue left rule). */
.rmn-card h3, .rmn-ctitle{ font-family:'IBM Plex Mono', monospace; font-size:11.5px !important; font-weight:700 !important; letter-spacing:.08em; text-transform:uppercase; color:var(--rmn-on-navy); border-left:3px solid var(--rmn-blue); padding-left:10px; line-height:1.4; }
.rmn-num{ font-family:'Space Grotesk', sans-serif; font-weight:700; font-variant-numeric:tabular-nums; }
.rmn-mono{ font-family:'IBM Plex Mono', monospace; }
.rmn-label{ font-size:12px; color:var(--rmn-dim); }
.rmn-flabel{ display:block; font-family:'IBM Plex Mono', monospace; font-size:11px; letter-spacing:.08em; text-transform:uppercase; color:var(--rmn-dim); }
.rmn-input{ width:100%; min-width:0; border:1px solid var(--rmn-hair); border-radius:2px; padding:9px 11px; font-size:14px; color:var(--rmn-ink); background:#fff; transition:border-color .15s; }
.rmn-input:focus{ outline:none; border-color:var(--rmn-blue); }
.rmn-input[aria-invalid="true"]{ border-color:var(--rmn-fail); }
.rmn-seg{ display:inline-flex; flex-shrink:0; border:1px solid var(--rmn-hair); border-radius:2px; overflow:hidden; }
.rmn-seg button{ padding:6px 10px; font-family:'IBM Plex Mono', monospace; font-size:11.5px; color:var(--rmn-dim); background:#fff; white-space:nowrap; }
.rmn-seg button[aria-pressed="true"]{ background:var(--rmn-blue); color:#fff; }
.rmn-slider{ width:100%; accent-color:var(--rmn-accent); }
.rmn-table{ width:100%; font-size:13px; border-collapse:collapse; }
.rmn-table th{ text-align:left; font-family:'IBM Plex Mono', monospace; font-size:11px; letter-spacing:.06em; text-transform:uppercase; font-weight:500; color:var(--rmn-dim); padding:8px; border-bottom:1px solid var(--rmn-hair); }
.rmn-table td{ padding:8px; border-bottom:1px dashed var(--rmn-hair); font-variant-numeric:tabular-nums; }
/* Buttons: Bay 01's .hgr-m-btn family. */
.rmn-btn{ display:inline-flex; align-items:center; justify-content:center; gap:8px; font-family:'IBM Plex Mono', monospace; font-size:13px; padding:10px 18px; border-radius:2px; border:1px solid transparent; cursor:pointer; transition:background .15s, color .15s, border-color .15s; }
.rmn-btn:disabled{ opacity:.4; cursor:not-allowed; }
.rmn-btn-accent{ background:var(--rmn-accent); color:var(--rmn-accent-ink); font-weight:600; }
.rmn-btn-accent:not(:disabled):hover{ background:#F6C374; }
.rmn-btn-navy{ background:var(--rmn-navy-2); color:var(--rmn-blue); border-color:var(--rmn-blue-line); font-weight:700; }
.rmn-btn-navy:not(:disabled):hover{ background:var(--rmn-blue); color:#fff; border-color:var(--rmn-blue); }
.rmn-btn-ghost{ background:transparent; border-color:var(--rmn-hair); color:var(--rmn-dim); }
.rmn-btn-ghost:not(:disabled):hover{ color:var(--rmn-ink) !important; border-color:var(--rmn-blue); }
.rmn-btn-danger{ background:var(--rmn-fail); color:#fff; font-weight:600; }
/* Stage tracker: Bay 01's .hgr-m-stage-tracker, used as Raman's tab strip. */
.rmn-tracker{ display:flex; gap:1px; background:var(--rmn-blue-line); border:1px solid var(--rmn-blue-line); overflow-x:auto; }
.rmn-tracker-item{ flex:1; min-width:118px; background:var(--rmn-navy-2); padding:12px 10px; text-align:center; border:none; cursor:pointer; font:inherit; }
.rmn-tracker-item:disabled{ cursor:not-allowed; }
.rmn-tracker-num{ width:24px; height:24px; border-radius:50%; margin:0 auto 6px; display:flex; align-items:center; justify-content:center; font-family:'IBM Plex Mono', monospace; font-size:12px; font-weight:700; border:1.5px solid var(--rmn-blue-line); background:#fff; color:var(--rmn-blue-line); }
.rmn-tracker-label{ font-size:12.5px; font-weight:600; color:var(--rmn-on-navy); display:inline-flex; align-items:center; gap:4px; }
.rmn-tracker-item-done .rmn-tracker-num{ background:var(--rmn-blue); border-color:var(--rmn-blue); color:#fff; box-shadow:0 0 6px rgba(28,116,184,.35); }
.rmn-tracker-item-locked .rmn-tracker-label{ color:var(--rmn-dim); opacity:.6; }
.rmn-tracker-item-locked .rmn-tracker-num{ opacity:.5; }
.rmn-tracker-item-pay .rmn-tracker-num{ border-color:var(--rmn-accent); color:var(--rmn-amber-text); }
.rmn-tracker-item-active{ background:#FDF3E3; box-shadow:inset 0 -3px 0 var(--rmn-accent); }
.rmn-tracker-item-active .rmn-tracker-label{ color:var(--rmn-amber-text); font-weight:700; }
.rmn-tracker-item-active .rmn-tracker-num{ border-color:var(--rmn-accent); }
/* Hangar doors opening over the header, as on Bay 01. */
.rmn-hero{ position:relative; overflow:hidden; }
.rmn-doors{ position:absolute; inset:0; z-index:5; display:flex; pointer-events:none; }
.rmn-door{ flex:1; background:repeating-linear-gradient(90deg, #0C1E30 0 78px, #08131F 78px 80px); }
.rmn-door-left{ animation:rmn-openLeft 1.4s cubic-bezier(.77,0,.18,1) .3s forwards; }
.rmn-door-right{ animation:rmn-openRight 1.4s cubic-bezier(.77,0,.18,1) .3s forwards; }
@keyframes rmn-openLeft{ from{ transform:translateX(0);} to{ transform:translateX(-100%);} }
@keyframes rmn-openRight{ from{ transform:translateX(0);} to{ transform:translateX(100%);} }
@media (prefers-reduced-motion: reduce){ .rmn-doors{ display:none; } }
@media (max-width:767px){ .rmn-stack-sm{ flex-direction:column; } }
`;

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rmn-card ${className}`}>{children}</div>;
}

type BtnKind = "accent" | "navy" | "ghost" | "danger";
// Bay 01's button family: amber primary, blue-outlined secondary ("navy"),
// hairline ghost, red for destructive.
export function Btn({ kind = "navy", className = "", ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { kind?: BtnKind }) {
  return <button {...rest} className={`rmn-btn rmn-btn-${kind} ${className}`} />;
}

export const VERDICT_STYLE: Record<RamanVerdict, { bg: string; ink: string; label: string; Icon: typeof CheckCircle2 }> = {
  PASS: { bg: "var(--rmn-pass)", ink: "#fff", label: "PASS", Icon: CheckCircle2 },
  WARN: { bg: "var(--rmn-warn)", ink: "#3A2600", label: "WARN", Icon: AlertTriangle },
  FAIL: { bg: "var(--rmn-fail)", ink: "#fff", label: "FAIL", Icon: XCircle },
  INFO: { bg: "var(--rmn-info)", ink: "#fff", label: "INFO", Icon: Info },
};

export function VerdictPill({ verdict }: { verdict: RamanVerdict }) {
  const v = VERDICT_STYLE[verdict];
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: v.bg, color: v.ink }}>
      <v.Icon className="h-3.5 w-3.5" aria-hidden="true" /> {v.label}
    </span>
  );
}

export function VerdictBanner({ verdict, headline, right }: { verdict: RamanVerdict; headline: string; right?: ReactNode }) {
  const v = VERDICT_STYLE[verdict];
  return (
    <div className="rounded-[14px] px-5 py-4 flex flex-wrap items-center gap-3" style={{ background: v.bg, color: v.ink }}>
      <v.Icon className="h-7 w-7 flex-shrink-0" aria-hidden="true" />
      <div className="flex-1 min-w-[200px]">
        <div className="rmn-mono text-xs font-bold tracking-wider">{v.label}</div>
        <div className="rmn-num text-xl leading-tight">{headline}</div>
      </div>
      {right}
    </div>
  );
}

export type AiProvider = "anthropic" | "groq";

export const PROVIDER_NAME: Record<AiProvider, string> = { anthropic: "Claude", groq: "Groq" };

// Which provider a stored model id belongs to (run.model, step.model).
export function providerOfModel(model: string | null | undefined): AiProvider | null {
  if (!model) return null;
  if (model.startsWith("claude")) return "anthropic";
  if (model.includes("gpt-oss") || model.startsWith("openai/")) return "groq";
  return null;
}

// "via Claude" / "via Groq" on every AI-written block; a loud badge when no
// provider answered and engine text was used instead.
export function ViaProvider({ provider, mock = false }: { provider: AiProvider | null; mock?: boolean }) {
  if (mock || !provider) {
    return (
      <span className="rmn-mono rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider" style={{ background: "#FDECEC", color: "var(--rmn-fail-ink)" }}>
        Engine text -- no AI provider answered
      </span>
    );
  }
  return (
    <span
      className="rmn-mono rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
      style={provider === "anthropic" ? { background: "#EAF2FB", color: "#1C5CAB" } : { background: "#FDF3E3", color: "#8A5A00" }}
    >
      via {PROVIDER_NAME[provider]}
    </span>
  );
}

export function FallbackBadge() {
  return (
    <span className="rmn-mono rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider" style={{ background: "var(--rmn-fail)", color: "#fff" }}>
      Not agentic — fallback planner
    </span>
  );
}

export function LockBadge({ label = "Issued · frozen" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium" style={{ background: "var(--rmn-navy)", color: "#fff" }}>
      <Lock className="h-3 w-3" aria-hidden="true" /> {label}
    </span>
  );
}

export function Stat({ label, value, unit, tone }: { label: string; value: ReactNode; unit?: string; tone?: "good" | "bad" }) {
  const color = tone === "good" ? "var(--rmn-pass-ink)" : tone === "bad" ? "var(--rmn-fail-ink)" : "var(--rmn-ink)";
  return (
    <div className="rounded-lg px-3 py-2" style={{ background: "#FFFFFF", border: "1px solid var(--rmn-hair)" }}>
      <div className="rmn-label">{label}</div>
      <div className="rmn-num text-lg" style={{ color }}>
        {value}
        {unit && <span className="ml-1 text-xs font-medium" style={{ color: "var(--rmn-dim)" }}>{unit}</span>}
      </div>
    </div>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <div role="alert" className="rounded-lg px-3 py-2 text-sm" style={{ background: "#FDECEC", color: "var(--rmn-fail-ink)" }}>
      {children}
    </div>
  );
}

export const fmt = (v: number | null | undefined, digits = 1) => (v === null || v === undefined ? "--" : v.toFixed(digits));
export const signed = (v: number | null | undefined, digits = 1) =>
  v === null || v === undefined ? "--" : `${v > 0 ? "+" : ""}${v.toFixed(digits)}`;
