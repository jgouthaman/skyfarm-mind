import { Eye, EyeOff, Loader2 } from "lucide-react";
import { FieldInput } from "@/components/ui/FieldInput";
import { SeedPanel } from "@/components/dev/SeedPanel";
import { useMissionHubLogin } from "@/lib/mission-hub/useMissionHubLogin";

// Light theme matching the main site (localhost:8080) — same tokens as
// Shell.tsx's .mh-shell, declared locally here since this page renders
// before auth, outside MissionHubShell's wrapper.
const MH_LOGIN_VARS = {
  "--mh-bg": "#FFFFFF", "--mh-panel": "#F2F7FB",
  "--mh-ink": "#08131F", "--mh-paper": "#12222F", "--mh-dim": "#4F6B80",
  "--mh-blue": "#1C74B8", "--mh-hairline": "rgba(62,124,166,0.28)",
} as React.CSSProperties;

export function MissionHubLoginForm() {
  const {
    email,
    setEmail,
    password,
    setPassword,
    showPwd,
    setShowPwd,
    submitting,
    err,
    mode,
    resetEmail,
    setResetEmail,
    resetSent,
    handleSignIn,
    handleForgot,
    goToForgot,
    goToSignIn,
  } = useMissionHubLogin();

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ ...MH_LOGIN_VARS, fontFamily: "'IBM Plex Sans', sans-serif", background: "var(--mh-panel)" }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap');`}</style>
      <div className="w-full max-w-[420px]">
        <div
          className="rounded-2xl px-10 py-11"
          style={{ background: "var(--mh-bg)", border: "1px solid var(--mh-hairline)" }}
        >
          <div className="text-center">
            <h1 className="text-xl" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color: "var(--mh-ink)" }}>
              Torq<span style={{ color: "var(--mh-blue)" }}>Wings</span>
            </h1>
            <span
              className="inline-block mt-2 uppercase tracking-[0.08em] text-[11px] rounded-full px-3 py-1"
              style={{ background: "rgba(28,116,184,0.12)", color: "var(--mh-blue)" }}
            >
              Mission Hub
            </span>
          </div>
          <div className="my-6 border-t" style={{ borderColor: "var(--mh-hairline)" }} />

          {mode === "signin" ? (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <h2 className="text-[22px]" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, color: "var(--mh-ink)" }}>
                  Sign in
                </h2>
                <p className="mt-1 text-[13px]" style={{ color: "var(--mh-dim)" }}>Access is by invitation only. Contact your administrator.</p>
              </div>
              <FieldInput label="Email" type="email" value={email} onChange={setEmail} placeholder="you@torqwings.com" required />
              <div>
                <label className="block text-[11px] uppercase tracking-wider mb-1.5" style={{ color: "var(--mh-dim)" }}>Password</label>
                <div className="relative">
                  <input
                    type={showPwd ? "text" : "password"} value={password}
                    onChange={(e) => setPassword(e.target.value)} required
                    className="w-full border rounded-lg pl-3.5 pr-10 py-2.5 text-sm outline-none"
                    style={{ background: "var(--mh-panel)", borderColor: "var(--mh-hairline)", color: "var(--mh-ink)" }}
                  />
                  <button
                    type="button" onClick={() => setShowPwd((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: "var(--mh-dim)" }}
                  >
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <div className="mt-2 text-right">
                  <button type="button" onClick={goToForgot} className="text-[12px] transition-colors" style={{ color: "var(--mh-dim)" }}>
                    Forgot password?
                  </button>
                </div>
              </div>
              <button
                type="submit" disabled={submitting}
                className="w-full rounded-lg text-white py-3 transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
                style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, background: "var(--mh-blue)" }}
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Sign in
              </button>
              {err && (
                <div className="rounded-lg px-3.5 py-2.5 text-[13px]"
                  style={{ background: "rgba(188,54,54,0.1)", border: "1px solid rgba(188,54,54,0.35)", color: "#B23A3A" }}>
                  {err}
                </div>
              )}
            </form>
          ) : (
            <div className="space-y-4">
              <h2 className="text-[22px]" style={{ fontFamily: "'Space Grotesk', sans-serif", color: "var(--mh-ink)" }}>Reset password</h2>
              {resetSent ? (
                <>
                  <p className="text-[13px]" style={{ color: "var(--mh-dim)" }}>Check your inbox for a reset link.</p>
                  <button onClick={goToSignIn} className="text-[12px] hover:underline" style={{ color: "var(--mh-blue)" }}>
                    Back to sign in
                  </button>
                </>
              ) : (
                <form onSubmit={handleForgot} className="space-y-4">
                  <FieldInput label="Email" type="email" value={resetEmail} onChange={setResetEmail} required />
                  <button
                    type="submit" disabled={submitting}
                    className="w-full rounded-lg text-white py-3 transition-colors"
                    style={{ background: "var(--mh-blue)" }}
                  >
                    {submitting ? "Sending…" : "Send reset link"}
                  </button>
                  <button type="button" onClick={goToSignIn} className="block text-[12px] transition-colors" style={{ color: "var(--mh-dim)" }}>
                    Back to sign in
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        <p className="mt-5 text-center text-[12px]" style={{ color: "var(--mh-dim)" }}>© {new Date().getFullYear()} TorqWings</p>
        <div className="mt-3 text-center">
          <a href="/" className="text-[12px] transition-colors" style={{ color: "var(--mh-dim)" }}>← Back to home</a>
        </div>

        <SeedPanel />
      </div>
    </div>
  );
}
