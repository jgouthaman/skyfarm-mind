import { useEffect, useState } from "react";
import { CheckCircle2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export type LeadPlan = {
  name: string;
  tagline: string;
  badge: string;
  badgeBg: string;
  badgeText: string;
};

export function DesignStudioLeadModal({
  open, onClose, plan,
}: { open: boolean; onClose: () => void; plan: LeadPlan | null }) {
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) { setSuccess(null); setErrors({}); setServerError(null); }
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !plan) return null;

  const inputCls = "w-full bg-[#1a2035] text-white placeholder:text-white/40 border border-white/10 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#378ADD]/60 transition-colors";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setServerError(null);
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => String(fd.get(k) ?? "").trim();
    const data = {
      full_name: get("full_name"),
      email: get("email"),
      phone: get("phone"),
      organisation: get("organisation") || null,
      role: get("role"),
      location: get("location"),
      plan: get("plan"),
      message: get("message") || null,
      source: "website",
    };
    const errs: Record<string, string> = {};
    if (!data.full_name) errs.full_name = "Please enter your full name";
    if (!data.email) errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errs.email = "Enter a valid email";
    if (!data.phone) errs.phone = "Phone number is required";
    if (!data.role) errs.role = "Please select your role";
    if (!data.location) errs.location = "Please enter your city / state";
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setSubmitting(true);
    try {
      const { error } = await supabase.from("design_studio_leads" as any).insert(data as any);
      if (error) throw error;
      setSuccess(data.email);
    } catch (err) {
      try {
        const existing = JSON.parse(localStorage.getItem("twds_leads") || "[]");
        existing.push({ ...data, created_at: new Date().toISOString() });
        localStorage.setItem("twds_leads", JSON.stringify(existing));
        console.warn("Supabase not connected — lead saved to localStorage.");
        setSuccess(data.email);
      } catch {
        setServerError("Something went wrong — please email us directly at hello@torqwings.com");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/[0.78] p-0 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full sm:max-w-[480px] sm:rounded-2xl bg-[#141928] border border-white/10 p-6 sm:p-8 my-0 sm:my-8 min-h-screen sm:min-h-0"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 text-white/50 hover:text-white text-lg"
        >
          <X className="h-5 w-5" />
        </button>

        {success ? (
          <div className="py-6 text-center">
            <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full bg-emerald-500/15 border border-emerald-500/40">
              <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            </div>
            <h3 className="font-display text-xl text-white">You're on the list!</h3>
            <p className="mt-2 text-sm text-white/60">
              We'll be in touch within 1 business day. Watch your inbox.
            </p>
            <p className="mt-3 text-sm text-[#378ADD] break-all">{success}</p>
            <p className="mt-4 text-[13px] text-white/60">
              Once your access is confirmed, sign in at{" "}
              <a href="/mission-hub/login" className="text-[#378ADD] hover:underline">Mission Hub →</a>
            </p>
            <button
              onClick={onClose}
              className="mt-6 w-full rounded-lg border border-white/20 text-white/90 hover:bg-white/5 py-3 text-sm transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <span
              className="inline-block text-[10px] font-semibold uppercase tracking-[0.18em] px-2.5 py-1 rounded-md"
              style={{ background: plan.badgeBg, color: plan.badgeText }}
            >
              {plan.badge}
            </span>
            <h3 className="mt-3 font-display text-xl text-white">
              You chose the {plan.name} plan
            </h3>
            <p className="mt-1 text-sm text-white/60">{plan.tagline}</p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-3.5">
              <FormField label="Full name" error={errors.full_name}>
                <input name="full_name" className={inputCls} placeholder="Your full name" />
              </FormField>
              <FormField label="Email address" error={errors.email}>
                <input name="email" type="email" className={inputCls} placeholder="you@email.com" />
              </FormField>
              <FormField label="Phone number" error={errors.phone}>
                <input name="phone" type="tel" className={inputCls} placeholder="+91 98765 43210" />
              </FormField>
              <FormField label="Organisation">
                <input name="organisation" className={inputCls} placeholder="Company / College / Institution (optional)" />
              </FormField>
              <FormField label="Role" error={errors.role}>
                <select name="role" defaultValue="" className={inputCls}>
                  <option value="" disabled>Select your role</option>
                  <option>Student</option>
                  <option>Drone Engineer</option>
                  <option>Defence / DRDO</option>
                  <option>Academic / Faculty</option>
                  <option>Startup Founder</option>
                  <option>Investor</option>
                  <option>Other</option>
                </select>
              </FormField>
              <FormField label="State / City" error={errors.location}>
                <input name="location" className={inputCls} placeholder="e.g. Chennai, Tamil Nadu" />
              </FormField>
              <FormField label="Plan">
                <input
                  name="plan" readOnly defaultValue={plan.name}
                  className="w-full bg-[#0a0f1c] text-white/60 border border-white/10 rounded-lg px-3.5 py-2.5 text-sm"
                />
              </FormField>
              <FormField label="Message">
                <textarea
                  name="message" rows={3} className={inputCls}
                  placeholder="Tell us briefly what you want to build or achieve"
                />
              </FormField>

              {serverError && (
                <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                  {serverError}
                </div>
              )}

              <button
                type="submit" disabled={submitting}
                className="w-full rounded-lg bg-[#185FA5] hover:bg-[#378ADD] text-white font-display font-medium py-3 transition-colors disabled:opacity-60"
              >
                {submitting ? "Submitting…" : "Submit interest"}
              </button>
              <p className="text-center text-[11px] text-white/40">
                We respond within 1 business day · Your data stays in India
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function FormField({
  label, error, children,
}: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] uppercase tracking-wider text-white/50 mb-1.5">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
