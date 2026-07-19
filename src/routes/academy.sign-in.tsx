import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plane, Lock, User, Mail, ArrowRight, Award, Loader2 } from "lucide-react";
import { verifyAcademyUser } from "@/lib/academy-auth";

export const Route = createFileRoute("/academy/sign-in")({
  component: AcademySignInPage,
});

const C = {
  bg: "#080B12", panel: "#0E131E",
  line: "#1E2838", line2: "#2A3648",
  text: "#E8ECF2", mute: "#8A94A6", faint: "#5C6678",
  amber: "#FFB020", amberSoft: "rgba(255,176,32,0.10)",
};
const DISPLAY = "'Space Grotesk', system-ui, -apple-system, sans-serif";
const MONO = "'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace";
const SANS = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

const STATS: [string, string][] = [
  ["5", "COURSES"], ["21", "MODULES"], ["54", "HOURS"], ["21", "PROJECTS"],
];

function Field({
  icon: Icon, label, value, onChange, onKeyDown, placeholder, err, type = "text",
}: {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  label: string;
  value: string;
  onChange: (v: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  placeholder: string;
  err: boolean;
  type?: string;
}) {
  const [focus, setFocus] = useState(false);
  return (
    <label style={{ display: "block" }}>
      <span style={{ font: `600 10px/1 ${MONO}`, letterSpacing: ".14em", color: C.faint, textTransform: "uppercase" }}>
        {label}
      </span>
      <div
        style={{
          display: "flex", alignItems: "center", gap: 10, marginTop: 8, height: 46, padding: "0 14px",
          background: C.bg, borderRadius: 9,
          border: `1px solid ${err ? "#F27D7D66" : focus ? C.amber : C.line2}`,
          transition: "border-color .15s",
        }}
      >
        <Icon size={16} color={focus ? C.amber : C.faint} />
        <input
          value={value}
          type={type}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: C.text, font: `400 14px/1 ${SANS}` }}
        />
      </div>
    </label>
  );
}

function AcademySignInPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function submit() {
    if (!fullName.trim() || !email.trim()) {
      setState("error");
      setErrorMessage("Enter both your name and email.");
      return;
    }
    setState("loading");
    try {
      const user = await verifyAcademyUser(fullName, email);
      if (!user) {
        setState("error");
        setErrorMessage("No matching account. Check your name and email.");
        return;
      }
      sessionStorage.setItem("academy_user", JSON.stringify(user));
      navigate({ to: "/academy/dashboard" });
    } catch (err) {
      console.error("[Academy] verifyAcademyUser failed:", err);
      setState("error");
      setErrorMessage("Couldn't verify right now, try again.");
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") submit();
  }

  return (
    <div
      style={{
        background: C.bg, color: C.text, minHeight: "100vh", fontFamily: SANS,
        backgroundImage: `radial-gradient(900px 500px at 78% -8%, rgba(255,176,32,.05), transparent 60%),
          linear-gradient(${C.line}22 1px, transparent 1px), linear-gradient(90deg, ${C.line}22 1px, transparent 1px)`,
        backgroundSize: "auto, 44px 44px, 44px 44px",
      }}
    >
      <style>{`
        .tw-academy-grid{display:grid;grid-template-columns:1.15fr 1fr;}
        @media(max-width:820px){.tw-academy-grid{grid-template-columns:1fr;}}
        .tw-academy-spin{animation:tw-academy-sp 1s linear infinite;}
        @keyframes tw-academy-sp{to{transform:rotate(360deg);}}
        .tw-academy-cta:hover:not(:disabled){filter:brightness(1.08);}
        .tw-academy-scan{position:absolute;inset:0;pointer-events:none;
          background:linear-gradient(180deg,transparent,rgba(255,176,32,.06),transparent);
          height:180px;animation:tw-academy-scan 5s ease-in-out 1;}
        @keyframes tw-academy-scan{0%{transform:translateY(-200px);opacity:0;}20%{opacity:1;}100%{transform:translateY(110vh);opacity:0;}}
        @media(prefers-reduced-motion:reduce){.tw-academy-scan{display:none;}.tw-academy-spin{animation:none;}}
      `}</style>

      <div className="tw-academy-grid" style={{ minHeight: "100vh" }}>
        {/* left: identity */}
        <div style={{ padding: "clamp(28px,5vw,64px)", display: "flex", flexDirection: "column", justifyContent: "center", position: "relative", overflow: "hidden" }}>
          <div className="tw-academy-scan" />
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 40 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: C.amberSoft, border: `1px solid ${C.amber}44`, display: "grid", placeItems: "center" }}>
              <Plane size={17} color={C.amber} />
            </div>
            <span style={{ font: `600 13px/1 ${MONO}`, letterSpacing: ".18em", color: C.text }}>TORQWINGS</span>
          </div>

          <div style={{ font: `500 11px/1 ${MONO}`, letterSpacing: ".22em", color: C.amber, marginBottom: 18 }}>
            ● AI AEROSPACE CERTIFICATION
          </div>
          <h1 style={{ font: `700 clamp(34px,5vw,54px)/1.02 ${DISPLAY}`, letterSpacing: "-.02em", color: C.text, margin: 0, maxWidth: 560 }}>
            TorqWings<br /><span style={{ color: C.amber }}>Academy</span>
          </h1>
          <p style={{ font: `400 16px/1.6 ${SANS}`, color: C.mute, maxWidth: 440, marginTop: 20 }}>
            The certification path for engineers who design autonomous aerial platforms — from classical
            theory to a simulation-validated capstone.
          </p>

          <div style={{ display: "flex", gap: 26, marginTop: 40, flexWrap: "wrap" }}>
            {STATS.map(([n, l]) => (
              <div key={l}>
                <div style={{ font: `600 26px/1 ${DISPLAY}`, color: C.text }}>{n}</div>
                <div style={{ font: `500 10px/1 ${MONO}`, letterSpacing: ".14em", color: C.faint, marginTop: 6 }}>{l}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "inline-flex", alignItems: "center", gap: 9, marginTop: 40, padding: "10px 14px", border: `1px solid ${C.line2}`, borderRadius: 8, background: C.panel, width: "fit-content" }}>
            <Award size={15} color={C.amber} />
            <span style={{ font: `500 12px/1.3 ${SANS}`, color: C.mute }}>
              Credential — <span style={{ color: C.text }}>TorqWings Certified AI Aerospace Engineer</span>
            </span>
          </div>
        </div>

        {/* right: auth panel */}
        <div style={{ background: C.panel, borderLeft: `1px solid ${C.line}`, display: "flex", alignItems: "center", justifyContent: "center", padding: "clamp(24px,4vw,48px)" }}>
          <div style={{ width: "100%", maxWidth: 380 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <Lock size={14} color={C.amber} />
              <span style={{ font: `600 11px/1 ${MONO}`, letterSpacing: ".16em", color: C.amber }}>ACCESS PORTAL</span>
            </div>
            <h2 style={{ font: `600 24px/1.1 ${DISPLAY}`, color: C.text, margin: "0 0 6px" }}>Sign in to continue</h2>
            <p style={{ font: `400 13px/1.5 ${SANS}`, color: C.mute, margin: "0 0 26px" }}>
              Enter the name and email you registered with.
            </p>

            <Field
              icon={User} label="Full name" value={fullName}
              onChange={(v) => { setFullName(v); setState("idle"); }}
              onKeyDown={onKeyDown} placeholder="Jothi Gouthaman" err={state === "error"}
            />
            <div style={{ height: 14 }} />
            <Field
              icon={Mail} label="Email" value={email}
              onChange={(v) => { setEmail(v); setState("idle"); }}
              onKeyDown={onKeyDown} placeholder="you@example.com" err={state === "error"} type="email"
            />

            {state === "error" && (
              <div style={{ font: `500 12px/1.4 ${SANS}`, color: "#F27D7D", marginTop: 12 }}>
                {errorMessage}
              </div>
            )}

            <button
              className="tw-academy-cta"
              onClick={submit}
              disabled={state === "loading"}
              style={{
                marginTop: 22, width: "100%", height: 46, border: "none", borderRadius: 9,
                background: C.amber, color: "#0A0A0A", font: `600 14px/1 ${SANS}`, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                opacity: state === "loading" ? 0.7 : 1,
              }}
            >
              {state === "loading" ? (
                <><Loader2 size={16} className="tw-academy-spin" /> Verifying…</>
              ) : (
                <>Enter Academy <ArrowRight size={16} /></>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
