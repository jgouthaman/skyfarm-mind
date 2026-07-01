import { j as jsxRuntimeExports, r as reactExports } from "../_libs/react.mjs";
import { c as createSsrRpc } from "./createSsrRpc-CwzutQwK.mjs";
import { a as createServerFn } from "./server-BTiM7Kib.mjs";
import { d as useNavigate } from "../_libs/tanstack__react-router.mjs";
import { s as supabase } from "./client-DYtC4Igq.mjs";
import { t as toast } from "../_libs/sonner.mjs";
import { u as useMissionHubAuth } from "./context-BevYt8mH.mjs";
import "../_libs/seroval.mjs";
import { a2 as EyeOff, _ as Eye, e as LoaderCircle } from "../_libs/lucide-react.mjs";
import { o as objectType, s as stringType } from "../_libs/zod.mjs";
import "node:async_hooks";
import "../_libs/h3-v2.mjs";
import "../_libs/rou3.mjs";
import "../_libs/srvx.mjs";
import "node:stream";
import "../_libs/tanstack__router-core.mjs";
import "../_libs/tanstack__history.mjs";
import "../_libs/cookie-es.mjs";
import "../_libs/seroval-plugins.mjs";
import "node:stream/web";
import "../_libs/react-dom.mjs";
import "util";
import "crypto";
import "async_hooks";
import "stream";
import "../_libs/isbot.mjs";
import "../_libs/supabase__supabase-js.mjs";
import "../_libs/supabase__postgrest-js.mjs";
import "../_libs/supabase__realtime-js.mjs";
import "../_libs/supabase__phoenix.mjs";
import "../_libs/supabase__storage-js.mjs";
import "../_libs/iceberg-js.mjs";
import "../_libs/supabase__auth-js.mjs";
import "tslib";
import "../_libs/supabase__functions-js.mjs";
function FieldInput({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  required
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-[11px] uppercase tracking-wider text-white/50 mb-1.5", children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "input",
      {
        type,
        value,
        required,
        onChange: (e) => onChange(e.target.value),
        placeholder,
        className: "w-full bg-[#1a2035] rounded-lg px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#378ADD]/60",
        style: { border: "0.5px solid rgba(255,255,255,0.1)" }
      }
    )
  ] });
}
createServerFn({
  method: "GET"
}).handler(createSsrRpc("cfc200084b8041428ecc271b3a84e9bb67a5bbfc0c10774db3a02fccb40897d5"));
const SeedSchema = objectType({
  full_name: stringType().min(1).max(120),
  email: stringType().email().max(255),
  password: stringType().min(8).max(128)
});
createServerFn({
  method: "POST"
}).validator((d) => SeedSchema.parse(d)).handler(createSsrRpc("465d753133d03fe4e88ed7addb5729df8340d378a9812b383ba8a1aa8b6bce01"));
function SeedPanel() {
  return null;
}
function useMissionHubLogin() {
  const navigate = useNavigate();
  const { profile, loading, refresh } = useMissionHubAuth();
  const [email, setEmail] = reactExports.useState("");
  const [password, setPassword] = reactExports.useState("");
  const [showPwd, setShowPwd] = reactExports.useState(false);
  const [submitting, setSubmitting] = reactExports.useState(false);
  const [err, setErr] = reactExports.useState(null);
  const [mode, setMode] = reactExports.useState("signin");
  const [resetEmail, setResetEmail] = reactExports.useState("");
  const [resetSent, setResetSent] = reactExports.useState(false);
  reactExports.useEffect(() => {
    document.title = "Mission Hub — Sign in · TorqWings";
  }, []);
  reactExports.useEffect(() => {
    if (!loading && profile) navigate({ to: "/mission-hub/dashboard" });
  }, [loading, profile, navigate]);
  async function handleSignIn(e) {
    e.preventDefault();
    setErr(null);
    setSubmitting(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setSubmitting(false);
      setErr(error.message.includes("Invalid") ? "Invalid email or password." : error.message);
      return;
    }
    const { data: p } = await supabase.from("mission_hub_users").select("id").eq("id", data.user.id).maybeSingle();
    if (!p) {
      await supabase.auth.signOut();
      setSubmitting(false);
      setErr("Your account is not fully set up. Contact your administrator.");
      return;
    }
    await refresh();
    navigate({ to: "/mission-hub/dashboard" });
  }
  async function handleForgot(e) {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/mission-hub/reset-password`
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setResetSent(true);
  }
  function goToForgot() {
    setMode("forgot");
    setResetEmail(email);
  }
  function goToSignIn() {
    setMode("signin");
    setResetSent(false);
  }
  return {
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
    goToSignIn
  };
}
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
    goToSignIn
  } = useMissionHubLogin();
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-h-screen flex items-center justify-center px-4 bg-[#0a0f1c]", style: {
    fontFamily: "Inter, sans-serif"
  }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "w-full max-w-[420px]", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-2xl px-10 py-11 bg-[#141928]", style: {
      border: "0.5px solid rgba(255,255,255,0.08)"
    }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("h1", { className: "text-white text-xl", style: {
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 700
        }, children: [
          "Torq",
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[#378ADD]", children: "Wings" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "inline-block mt-2 uppercase tracking-[0.08em] text-[11px] rounded-full px-3 py-1", style: {
          background: "rgba(55,138,221,0.12)",
          color: "#378ADD"
        }, children: "Mission Hub" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "my-6 border-t border-white/[0.06]" }),
      mode === "signin" ? /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: handleSignIn, className: "space-y-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-white text-[22px]", style: {
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 500
          }, children: "Sign in" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-[13px] text-white/55", children: "Access is by invitation only. Contact your administrator." })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(FieldInput, { label: "Email", type: "email", value: email, onChange: setEmail, placeholder: "you@torqwings.com", required: true }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-[11px] uppercase tracking-wider text-white/50 mb-1.5", children: "Password" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: showPwd ? "text" : "password", value: password, onChange: (e) => setPassword(e.target.value), required: true, className: "w-full bg-[#1a2035] border rounded-lg pl-3.5 pr-10 py-2.5 text-sm text-white outline-none focus:border-[#378ADD]/60", style: {
              borderColor: "rgba(255,255,255,0.1)"
            } }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: () => setShowPwd((s) => !s), className: "absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white", children: showPwd ? /* @__PURE__ */ jsxRuntimeExports.jsx(EyeOff, { className: "h-4 w-4" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, { className: "h-4 w-4" }) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-2 text-right", children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: goToForgot, className: "text-[12px] text-white/50 hover:text-white", children: "Forgot password?" }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "submit", disabled: submitting, className: "w-full rounded-lg bg-[#185FA5] hover:bg-[#378ADD] text-white py-3 transition-colors flex items-center justify-center gap-2 disabled:opacity-70", style: {
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 500
        }, children: [
          submitting && /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "h-4 w-4 animate-spin" }),
          "Sign in"
        ] }),
        err && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rounded-lg px-3.5 py-2.5 text-[13px] text-[#F09595]", style: {
          background: "rgba(163,45,45,0.15)",
          border: "0.5px solid rgba(163,45,45,0.4)"
        }, children: err })
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-white text-[22px]", style: {
          fontFamily: "'Space Grotesk', sans-serif"
        }, children: "Reset password" }),
        resetSent ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[13px] text-white/60", children: "Check your inbox for a reset link." }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: goToSignIn, className: "text-[12px] text-[#378ADD] hover:underline", children: "Back to sign in" })
        ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: handleForgot, className: "space-y-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(FieldInput, { label: "Email", type: "email", value: resetEmail, onChange: setResetEmail, required: true }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "submit", disabled: submitting, className: "w-full rounded-lg bg-[#185FA5] hover:bg-[#378ADD] text-white py-3", children: submitting ? "Sending…" : "Send reset link" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: goToSignIn, className: "block text-[12px] text-white/50 hover:text-white", children: "Back to sign in" })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-5 text-center text-[12px] text-white/35", children: [
      "© ",
      (/* @__PURE__ */ new Date()).getFullYear(),
      " TorqWings"
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-3 text-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx("a", { href: "/", className: "text-[12px] text-white/40 hover:text-white transition-colors", children: "← Back to home" }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(SeedPanel, {})
  ] }) });
}
export {
  LoginPage as component
};
