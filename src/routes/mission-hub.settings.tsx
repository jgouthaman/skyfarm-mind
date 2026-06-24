import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MissionHubShell, MhCard } from "@/components/mission-hub/Shell";
import { useMissionHubAuth } from "@/lib/mission-hub/context";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/mission-hub/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { profile, refresh } = useMissionHubAuth();
  const [name, setName] = useState("");
  const [prefs, setPrefs] = useState({ new_lead: true, new_contact: true });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.full_name);
      setPrefs({
        new_lead: profile.notification_prefs?.new_lead ?? true,
        new_contact: profile.notification_prefs?.new_contact ?? true,
      });
    }
  }, [profile]);

  if (!profile) return <MissionHubShell title="Settings"><div /></MissionHubShell>;
  const isAdmin = profile.role === "admin" || profile.role === "super_admin";

  async function saveProfile() {
    setSubmitting(true);
    const { error } = await supabase.from("profiles")
      .update({ full_name: name, notification_prefs: prefs })
      .eq("user_id", profile!.id);
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Saved");
    refresh();
  }

  async function sendReset() {
    const { error } = await supabase.auth.resetPasswordForEmail(profile!.email, {
      redirectTo: `${window.location.origin}/mission-hub/reset-password`,
    });
    if (error) { toast.error(error.message); return; }
    toast.success(`Reset link sent to ${profile!.email}`);
  }

  return (
    <MissionHubShell title="Settings">
      <div className="space-y-6 max-w-2xl">
        <MhCard className="p-6">
          <h3 className="text-white text-base mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500 }}>Profile</h3>
          <div className="space-y-3.5">
            <Inp label="Full name" value={name} setValue={setName} />
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-white/50 mb-1.5">Email</label>
              <div className="bg-[#0a0f1c] border border-white/10 rounded-lg px-3.5 py-2.5 text-sm text-white/40">{profile.email}</div>
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-white/50 mb-1.5">Role</label>
              <div className="text-[12px] uppercase tracking-wider">{profile.role}</div>
            </div>
            <button onClick={saveProfile} disabled={submitting} className="rounded-lg bg-[#185FA5] hover:bg-[#378ADD] text-white px-4 py-2 text-sm">
              {submitting ? "Saving…" : "Save profile"}
            </button>
          </div>
        </MhCard>

        <MhCard className="p-6">
          <h3 className="text-white text-base mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500 }}>Security</h3>
          <p className="text-[13px] text-white/60 mb-3">A password reset link will be sent to {profile.email}</p>
          <button onClick={sendReset} className="rounded-lg border border-white/[0.1] text-white px-4 py-2 text-sm hover:bg-white/5">Change password</button>
        </MhCard>

        {isAdmin && (
          <MhCard className="p-6">
            <h3 className="text-white text-base mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500 }}>Notification preferences</h3>
            <Toggle label="Email me when a new waitlist lead is submitted" value={prefs.new_lead} setValue={(v) => setPrefs({ ...prefs, new_lead: v })} />
            <Toggle label="Email me when a new contact form is submitted" value={prefs.new_contact} setValue={(v) => setPrefs({ ...prefs, new_contact: v })} />
            <button onClick={saveProfile} disabled={submitting} className="mt-3 rounded-lg bg-[#185FA5] hover:bg-[#378ADD] text-white px-4 py-2 text-sm">Save preferences</button>
          </MhCard>
        )}
      </div>
    </MissionHubShell>
  );
}

function Inp({ label, value, setValue }: { label: string; value: string; setValue: (v: string) => void }) {
  return (
    <div>
      <label className="block text-[11px] uppercase tracking-wider text-white/50 mb-1.5">{label}</label>
      <input value={value} onChange={(e) => setValue(e.target.value)}
        className="w-full bg-[#1a2035] rounded-lg px-3.5 py-2.5 text-sm text-white" style={{ border: "0.5px solid rgba(255,255,255,0.1)" }} />
    </div>
  );
}

function Toggle({ label, value, setValue }: { label: string; value: boolean; setValue: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between py-2.5 cursor-pointer">
      <span className="text-[13px] text-white/80">{label}</span>
      <button
        type="button" onClick={() => setValue(!value)}
        className={`relative w-10 h-5 rounded-full transition-colors ${value ? "bg-[#185FA5]" : "bg-white/15"}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${value ? "translate-x-5" : ""}`} />
      </button>
    </label>
  );
}
