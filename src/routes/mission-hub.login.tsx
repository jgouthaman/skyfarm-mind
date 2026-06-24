import { createFileRoute } from "@tanstack/react-router";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { FieldInput } from "@/components/ui/FieldInput";
import { SeedPanel } from "@/components/dev/SeedPanel";
import { useMissionHubLogin } from "@/lib/mission-hub/useMissionHubLogin";

export const Route = createFileRoute("/mission-hub/login")({
  component: LoginPage,
});

function LoginPage() {
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
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#0a0f1c]" style={{ fontFamily: "Inter, sans-serif" }}>
      <div className="w-full max-w-[420px]">
        <div
          className="rounded-2xl px-10 py-11 bg-[#141928]"
          style={{ border: "0.5px solid rgba(255,255,255,0.08)" }}
        >
          <div className="text-center">
            <h1 className="text-white text-xl" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}>
              Torq<span className="text-[#378ADD]">Wings</span>
            </h1>
            <span
              className="inline-block mt-2 uppercase tracking-[0.08em] text-[11px] rounded-full px-3 py-1"
              style={{ background: "rgba(55,138,221,0.12)", color: "#378ADD" }}
            >
              Mission Hub
            </span>
          </div>
          <div className="my-6 border-t border-white/[0.06]" />

          {mode === "signin" ? (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <h2 className="text-white text-[22px]" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500 }}>
                  Sign in
                </h2>
                <p className="mt-1 text-[13px] text-white/55">Access is by invitation only. Contact your administrator.</p>
              </div>
              <FieldInput label="Email" type="email" value={email} onChange={setEmail} placeholder="you@torqwings.com" required />
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-white/50 mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPwd ? "text" : "password"} value={password}
                    onChange={(e) => setPassword(e.target.value)} required
                    className="w-full bg-[#1a2035] border rounded-lg pl-3.5 pr-10 py-2.5 text-sm text-white outline-none focus:border-[#378ADD]/60"
                    style={{ borderColor: "rgba(255,255,255,0.1)" }}
                  />
                  <button
                    type="button" onClick={() => setShowPwd((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                  >
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <div className="mt-2 text-right">
                  <button type="button" onClick={goToForgot} className="text-[12px] text-white/50 hover:text-white">
                    Forgot password?
                  </button>
                </div>
              </div>
              <button
                type="submit" disabled={submitting}
                className="w-full rounded-lg bg-[#185FA5] hover:bg-[#378ADD] text-white py-3 transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
                style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500 }}
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Sign in
              </button>
              {err && (
                <div className="rounded-lg px-3.5 py-2.5 text-[13px] text-[#F09595]"
                  style={{ background: "rgba(163,45,45,0.15)", border: "0.5px solid rgba(163,45,45,0.4)" }}>
                  {err}
                </div>
              )}
            </form>
          ) : (
            <div className="space-y-4">
              <h2 className="text-white text-[22px]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Reset password</h2>
              {resetSent ? (
                <>
                  <p className="text-[13px] text-white/60">Check your inbox for a reset link.</p>
                  <button onClick={goToSignIn} className="text-[12px] text-[#378ADD] hover:underline">
                    Back to sign in
                  </button>
                </>
              ) : (
                <form onSubmit={handleForgot} className="space-y-4">
                  <FieldInput label="Email" type="email" value={resetEmail} onChange={setResetEmail} required />
                  <button
                    type="submit" disabled={submitting}
                    className="w-full rounded-lg bg-[#185FA5] hover:bg-[#378ADD] text-white py-3"
                  >
                    {submitting ? "Sending…" : "Send reset link"}
                  </button>
                  <button type="button" onClick={goToSignIn} className="block text-[12px] text-white/50 hover:text-white">
                    Back to sign in
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        <p className="mt-5 text-center text-[12px] text-white/35">© {new Date().getFullYear()} TorqWings</p>
        <div className="mt-3 text-center">
          <a href="/" className="text-[12px] text-white/40 hover:text-white transition-colors">← Back to home</a>
        </div>

        <SeedPanel />
      </div>
    </div>
  );

}
