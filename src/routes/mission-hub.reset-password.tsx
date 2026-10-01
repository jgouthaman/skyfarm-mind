import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/mission-hub/reset-password")({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { document.title = "Mission Hub — Reset password · TorqWings"; }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (pwd.length < 8) { setErr("Password must be at least 8 characters."); return; }
    if (pwd !== confirm) { setErr("Passwords do not match."); return; }
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setSubmitting(false);
    if (error) { setErr(error.message); return; }
    await supabase.auth.signOut();
    toast.success("Password updated. Please sign in.");
    navigate({ to: "/mission-hub/login" });
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[var(--mh-panel)]" style={{ fontFamily: "Inter, sans-serif" }}>
      <form
        onSubmit={submit}
        className="w-full max-w-[420px] rounded-2xl px-10 py-11 bg-[var(--mh-bg)] space-y-4"
        style={{ border: "0.5px solid var(--mh-panel)" }}
      >
        <h2 className="text-[var(--mh-ink)] text-[22px]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Set a new password</h2>
        <div>
          <label className="block text-[11px] uppercase tracking-wider text-[var(--mh-dim)] mb-1.5">New password</label>
          <input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} required minLength={8}
            className="w-full bg-[var(--mh-bg)] rounded-lg px-3.5 py-2.5 text-sm text-[var(--mh-ink)]" style={{ border: "0.5px solid var(--mh-hairline)" }} />
        </div>
        <div>
          <label className="block text-[11px] uppercase tracking-wider text-[var(--mh-dim)] mb-1.5">Confirm password</label>
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required
            className="w-full bg-[var(--mh-bg)] rounded-lg px-3.5 py-2.5 text-sm text-[var(--mh-ink)]" style={{ border: "0.5px solid var(--mh-hairline)" }} />
        </div>
        {err && (
          <div className="rounded-lg px-3.5 py-2.5 text-[13px] text-[#F09595]"
            style={{ background: "rgba(163,45,45,0.15)", border: "0.5px solid rgba(163,45,45,0.4)" }}>
            {err}
          </div>
        )}
        <button type="submit" disabled={submitting}
          className="w-full rounded-lg bg-[#185FA5] hover:bg-[#378ADD] text-[var(--mh-ink)] py-3">
          {submitting ? "Updating…" : "Update password"}
        </button>
      </form>
    </div>
  );
}
