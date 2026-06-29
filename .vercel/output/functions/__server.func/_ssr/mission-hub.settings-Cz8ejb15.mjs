import { r as reactExports, j as jsxRuntimeExports } from "../_libs/react.mjs";
import { M as MissionHubShell, a as MhCard } from "./Shell-BRA8Q4Nz.mjs";
import { u as useMissionHubAuth } from "./context-BevYt8mH.mjs";
import { s as supabase } from "./client-DYtC4Igq.mjs";
import { t as toast } from "../_libs/sonner.mjs";
import "../_libs/tanstack__react-router.mjs";
import "../_libs/tanstack__router-core.mjs";
import "../_libs/tanstack__history.mjs";
import "../_libs/cookie-es.mjs";
import "../_libs/seroval.mjs";
import "../_libs/seroval-plugins.mjs";
import "node:stream/web";
import "node:stream";
import "../_libs/react-dom.mjs";
import "util";
import "crypto";
import "async_hooks";
import "stream";
import "../_libs/isbot.mjs";
import "../_libs/lucide-react.mjs";
import "../_libs/supabase__supabase-js.mjs";
import "../_libs/supabase__postgrest-js.mjs";
import "../_libs/supabase__realtime-js.mjs";
import "../_libs/supabase__phoenix.mjs";
import "../_libs/supabase__storage-js.mjs";
import "../_libs/iceberg-js.mjs";
import "../_libs/supabase__auth-js.mjs";
import "tslib";
import "../_libs/supabase__functions-js.mjs";
function SettingsPage() {
  const {
    profile,
    refresh
  } = useMissionHubAuth();
  const [name, setName] = reactExports.useState("");
  const [prefs, setPrefs] = reactExports.useState({
    new_lead: true,
    new_contact: true
  });
  const [submitting, setSubmitting] = reactExports.useState(false);
  reactExports.useEffect(() => {
    if (profile) {
      setName(profile.full_name);
      setPrefs({
        new_lead: profile.notification_prefs?.new_lead ?? true,
        new_contact: profile.notification_prefs?.new_contact ?? true
      });
    }
  }, [profile]);
  if (!profile) return /* @__PURE__ */ jsxRuntimeExports.jsx(MissionHubShell, { title: "Settings", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", {}) });
  const isAdmin = profile.role === "admin" || profile.role === "super_admin";
  async function saveProfile() {
    setSubmitting(true);
    const {
      error
    } = await supabase.from("profiles").update({
      full_name: name,
      notification_prefs: prefs
    }).eq("user_id", profile.id);
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Saved");
    refresh();
  }
  async function sendReset() {
    const {
      error
    } = await supabase.auth.resetPasswordForEmail(profile.email, {
      redirectTo: `${window.location.origin}/mission-hub/reset-password`
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Reset link sent to ${profile.email}`);
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(MissionHubShell, { title: "Settings", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-6 max-w-2xl", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(MhCard, { className: "p-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-white text-base mb-4", style: {
        fontFamily: "'Space Grotesk', sans-serif",
        fontWeight: 500
      }, children: "Profile" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3.5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Inp, { label: "Full name", value: name, setValue: setName }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-[11px] uppercase tracking-wider text-white/50 mb-1.5", children: "Email" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-[#0a0f1c] border border-white/10 rounded-lg px-3.5 py-2.5 text-sm text-white/40", children: profile.email })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-[11px] uppercase tracking-wider text-white/50 mb-1.5", children: "Role" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[12px] uppercase tracking-wider", children: profile.role })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: saveProfile, disabled: submitting, className: "rounded-lg bg-[#185FA5] hover:bg-[#378ADD] text-white px-4 py-2 text-sm", children: submitting ? "Saving…" : "Save profile" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(MhCard, { className: "p-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-white text-base mb-4", style: {
        fontFamily: "'Space Grotesk', sans-serif",
        fontWeight: 500
      }, children: "Security" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-[13px] text-white/60 mb-3", children: [
        "A password reset link will be sent to ",
        profile.email
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: sendReset, className: "rounded-lg border border-white/[0.1] text-white px-4 py-2 text-sm hover:bg-white/5", children: "Change password" })
    ] }),
    isAdmin && /* @__PURE__ */ jsxRuntimeExports.jsxs(MhCard, { className: "p-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-white text-base mb-4", style: {
        fontFamily: "'Space Grotesk', sans-serif",
        fontWeight: 500
      }, children: "Notification preferences" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Toggle, { label: "Email me when a new waitlist lead is submitted", value: prefs.new_lead, setValue: (v) => setPrefs({
        ...prefs,
        new_lead: v
      }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Toggle, { label: "Email me when a new contact form is submitted", value: prefs.new_contact, setValue: (v) => setPrefs({
        ...prefs,
        new_contact: v
      }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: saveProfile, disabled: submitting, className: "mt-3 rounded-lg bg-[#185FA5] hover:bg-[#378ADD] text-white px-4 py-2 text-sm", children: "Save preferences" })
    ] })
  ] }) });
}
function Inp({
  label,
  value,
  setValue
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-[11px] uppercase tracking-wider text-white/50 mb-1.5", children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value, onChange: (e) => setValue(e.target.value), className: "w-full bg-[#1a2035] rounded-lg px-3.5 py-2.5 text-sm text-white", style: {
      border: "0.5px solid rgba(255,255,255,0.1)"
    } })
  ] });
}
function Toggle({
  label,
  value,
  setValue
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-center justify-between py-2.5 cursor-pointer", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[13px] text-white/80", children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: () => setValue(!value), className: `relative w-10 h-5 rounded-full transition-colors ${value ? "bg-[#185FA5]" : "bg-white/15"}`, children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${value ? "translate-x-5" : ""}` }) })
  ] });
}
export {
  SettingsPage as component
};
