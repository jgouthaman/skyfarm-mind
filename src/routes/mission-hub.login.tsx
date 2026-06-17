import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useMissionHubAuth } from "@/lib/mission-hub/context";
import { checkSuperAdminExists, seedSuperAdmin } from "@/lib/mission-hub/seed.functions";

export const Route = createFileRoute("/mission-hub/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { profile, loading, refresh } = useMissionHubAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [mode, setMode] = useState<"signin" | "forgot">("signin");
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => { document.title = "Mission Hub — Sign in · TorqWings"; }, []);

  useEffect(() => {
    if (!loading && profile) navigate({ to: "/mission-hub/dashboard" });
  }, [loading, profile, navigate]);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSubmitting(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setSubmitting(false);
      setErr(error.message.includes("Invalid") ? "Invalid email or password." : error.message);
      return;
    }
    const { data: p } = await supabase
      .from("profiles").select("user_id").eq("user_id", data.user!.id).maybeSingle();
    if (!p) {
      await supabase.auth.signOut();
      setSubmitting(false);
      setErr("Your account is not fully set up. Contact your administrator.");
      return;
    }
    await refresh();
    navigate({ to: "/mission-hub/dashboard" });
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/mission-hub/reset-password`,
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    setResetSent(true);
  }

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
                  <button type="button" onClick={() => { setMode("forgot"); setResetEmail(email); }} className="text-[12px] text-white/50 hover:text-white">
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
                  <button onClick={() => { setMode("signin"); setResetSent(false); }} className="text-[12px] text-[#378ADD] hover:underline">
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
                  <button type="button" onClick={() => setMode("signin")} className="block text-[12px] text-white/50 hover:text-white">
                    Back to sign in
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        <p className="mt-5 text-center text-[12px] text-white/35">© {new Date().getFullYear()} TorqWings</p>

        <SeedPanel />
      </div>
    </div>
  );
}

function FieldInput({
  label, type = "text", value, onChange, placeholder, required,
}: { label: string; type?: string; value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean }) {
  return (
    <div>
      <label className="block text-[11px] uppercase tracking-wider text-white/50 mb-1.5">{label}</label>
      <input
        type={type} value={value} required={required}
        onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-[#1a2035] rounded-lg px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#378ADD]/60"
        style={{ border: "0.5px solid rgba(255,255,255,0.1)" }}
      />
    </div>
  );
}

function SeedPanel() {
  const [exists, setExists] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const isPreview = typeof window !== "undefined" && /lovable|localhost/.test(window.location.hostname);

  useEffect(() => {
    checkSuperAdminExists().then((r) => setExists(r.exists)).catch(() => setExists(true));
  }, []);

  if (!isPreview) return null;
  if (exists === null) return null;
  if (exists) return (
    <p className="mt-4 text-center text-[11px] text-white/30">Super admin already configured</p>
  );

  return (
    <div className="mt-6 rounded-xl p-4 bg-[#141928]" style={{ border: "0.5px dashed rgba(239,159,39,0.4)" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full text-left text-[12px] text-[#EF9F27]"
      >
        🔧 Seed first super admin (preview only)
      </button>
      {open && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setSubmitting(true); setMsg(null);
            try {
              await seedSuperAdmin({ data: { full_name: name, email, password } });
              setMsg("Super admin created. Sign in above.");
              setExists(true);
            } catch (err: any) {
              setMsg(err?.message ?? "Failed");
            } finally { setSubmitting(false); }
          }}
          className="mt-3 space-y-2"
        >
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" required
            className="w-full bg-[#0a0f1c] border border-white/10 rounded px-3 py-2 text-sm text-white" />
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Email" required
            className="w-full bg-[#0a0f1c] border border-white/10 rounded px-3 py-2 text-sm text-white" />
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Password (min 8)" required minLength={8}
            className="w-full bg-[#0a0f1c] border border-white/10 rounded px-3 py-2 text-sm text-white" />
          <button disabled={submitting} className="w-full bg-[#EF9F27] text-[#0a0f1c] rounded py-2 text-sm font-medium">
            {submitting ? "Creating…" : "Create super admin"}
          </button>
          {msg && <p className="text-[12px] text-white/70">{msg}</p>}
        </form>
      )}
    </div>
  );
}
