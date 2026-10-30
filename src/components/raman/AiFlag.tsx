import { useEffect, useState } from "react";
import { ramanApi, type RamanAiStatus } from "@/lib/raman/ramanBrowserApi";

// Raman's "AI" flag -- the same badge and logic as Bay 01's
// (the-hangar.mission.tsx): the first provider in Mission Hub's AI Providers
// order that is genuinely reachable (a real, token-free round trip
// server-side), green and pulsing when live, amber when nothing answers,
// re-checked every 60 s. Raman's summary and Noise Fix agent use that same
// order, primary first, then secondary.

const MODEL_LABEL: Record<string, string> = {
  "claude-opus-5-5": "Claude Opus 5.5",
  "openai/gpt-oss-120b": "gpt-oss-120b",
};
const PROVIDER_NAME = { anthropic: "Claude", groq: "Groq" } as const;

export const AI_FLAG_CSS = `
.rmn-ai, .rmn-badge{ display:inline-flex; align-items:center; gap:8px; border-radius:2px; padding:6px 13px; font-family:'IBM Plex Mono',monospace; font-size:11.5px; font-weight:700; letter-spacing:.1em; text-transform:uppercase; }
.rmn-badge{ color:var(--rmn-on-navy); border:1px solid var(--rmn-blue-line); background:var(--rmn-navy-2); }
.rmn-ai-dot{ width:7px; height:7px; border-radius:50%; flex-shrink:0; }
.rmn-ai-checking{ color:var(--rmn-on-navy); border:1px solid var(--rmn-blue-line); background:var(--rmn-navy-2); }
.rmn-ai-checking .rmn-ai-dot{ background:var(--rmn-on-navy-dim); }
.rmn-ai-live{ color:#166534; border:1px solid #16A34A; background:#DCFCE7; }
.rmn-ai-live .rmn-ai-dot{ background:#16A34A; box-shadow:0 0 6px rgba(22,163,74,.7); animation:rmn-ai-pulse 2s ease-in-out infinite; }
.rmn-ai-offline{ color:#8A5A00; border:1px solid var(--rmn-accent); background:#FDF3E3; }
.rmn-ai-offline .rmn-ai-dot{ background:var(--rmn-accent); box-shadow:0 0 6px rgba(232,163,61,.6); }
.rmn-ai-model{ display:inline-flex; align-items:center; gap:3px; margin-left:2px; padding-left:6px; border-left:1px solid rgba(22,101,52,.35); font-weight:600; letter-spacing:0; }
.rmn-ai-model-groq{ border-left-color:rgba(180,105,14,.4); color:#8A5A00; }
.rmn-ai-note{ font-size:11px; color:var(--rmn-on-navy-dim); }
@keyframes rmn-ai-pulse{ 0%,100%{ opacity:1; } 50%{ opacity:.4; } }
`;

export function AiFlag() {
  const [status, setStatus] = useState<"checking" | "live" | "offline">("checking");
  const [info, setInfo] = useState<RamanAiStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const s = await ramanApi.aiStatus();
        if (cancelled) return;
        setInfo(s);
        setStatus(s.live ? "live" : "offline");
      } catch {
        if (!cancelled) setStatus("offline");
      }
    };
    void check();
    const t = setInterval(check, 60_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  const order = info?.configuredOrder ?? [];
  const provider = status === "live" ? info?.provider ?? null : null;
  const model = info?.model ? (MODEL_LABEL[info.model] ?? info.model) : "";
  const onSecondary = provider !== null && order[0] !== provider;
  const orderText = order.map((p, i) => `${i === 0 ? "primary" : "secondary"} ${PROVIDER_NAME[p]}`).join(", ");
  const title =
    status === "checking"
      ? "Checking the AI providers…"
      : provider === "groq"
        ? `Live — answering via Groq (${model}), per the AI Providers order in Mission Hub (${orderText}).`
        : provider === "anthropic"
          ? `Live — connected to Anthropic (${model}), per the AI Providers order in Mission Hub (${orderText}).`
          : "Offline — no AI provider answered. Noise Fix runs use the rule-based fallback planner (not agentic) and Noise Check summaries fall back to engine text.";

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span className={`rmn-ai rmn-ai-${status}`} title={title} role="status" aria-label={title}>
        <span className="rmn-ai-dot" />
        AI
        {provider === "anthropic" && (
          <span className="rmn-ai-model">
            {/* Generic spark mark, as on Bay 01 -- not a vendor logo. */}
            <svg viewBox="0 0 16 16" width="10" height="10" aria-hidden="true">
              <path d="M8 0 L9.4 6.6 L16 8 L9.4 9.4 L8 16 L6.6 9.4 L0 8 L6.6 6.6 Z" fill="currentColor" />
            </svg>
            Claude
          </span>
        )}
        {provider === "groq" && (
          <span className="rmn-ai-model rmn-ai-model-groq">
            {/* Generic bolt mark, as on Bay 01. */}
            <svg viewBox="0 0 16 16" width="10" height="10" aria-hidden="true">
              <path d="M9 0 L2 9 L7 9 L6 16 L14 6 L9 6 Z" fill="currentColor" />
            </svg>
            Groq
          </span>
        )}
        {status === "offline" && <span className="rmn-ai-model">Fallback planner</span>}
      </span>
      {order.length > 0 && status !== "checking" && (
        <span className="rmn-ai-note">
          {onSecondary
            ? `Primary ${PROVIDER_NAME[order[0]]} unavailable · using secondary ${PROVIDER_NAME[provider!]}`
            : `Order: ${order.map((p) => PROVIDER_NAME[p]).join(" → ")}`}
        </span>
      )}
    </span>
  );
}
