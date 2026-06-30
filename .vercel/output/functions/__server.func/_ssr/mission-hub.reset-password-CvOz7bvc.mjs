import { r as reactExports, j as jsxRuntimeExports } from "../_libs/react.mjs";
import { d as useNavigate } from "../_libs/tanstack__react-router.mjs";
import { s as supabase } from "./client-DYtC4Igq.mjs";
import { t as toast } from "../_libs/sonner.mjs";
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
import "../_libs/supabase__supabase-js.mjs";
import "../_libs/supabase__postgrest-js.mjs";
import "../_libs/supabase__realtime-js.mjs";
import "../_libs/supabase__phoenix.mjs";
import "../_libs/supabase__storage-js.mjs";
import "../_libs/iceberg-js.mjs";
import "../_libs/supabase__auth-js.mjs";
import "tslib";
import "../_libs/supabase__functions-js.mjs";
function ResetPasswordPage() {
  const navigate = useNavigate();
  const [pwd, setPwd] = reactExports.useState("");
  const [confirm, setConfirm] = reactExports.useState("");
  const [submitting, setSubmitting] = reactExports.useState(false);
  const [err, setErr] = reactExports.useState(null);
  reactExports.useEffect(() => {
    document.title = "Mission Hub — Reset password · TorqWings";
  }, []);
  async function submit(e) {
    e.preventDefault();
    setErr(null);
    if (pwd.length < 8) {
      setErr("Password must be at least 8 characters.");
      return;
    }
    if (pwd !== confirm) {
      setErr("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    const {
      error
    } = await supabase.auth.updateUser({
      password: pwd
    });
    setSubmitting(false);
    if (error) {
      setErr(error.message);
      return;
    }
    await supabase.auth.signOut();
    toast.success("Password updated. Please sign in.");
    navigate({
      to: "/mission-hub/login"
    });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-h-screen flex items-center justify-center px-4 bg-[#0a0f1c]", style: {
    fontFamily: "Inter, sans-serif"
  }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: submit, className: "w-full max-w-[420px] rounded-2xl px-10 py-11 bg-[#141928] space-y-4", style: {
    border: "0.5px solid rgba(255,255,255,0.08)"
  }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-white text-[22px]", style: {
      fontFamily: "'Space Grotesk', sans-serif"
    }, children: "Set a new password" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-[11px] uppercase tracking-wider text-white/50 mb-1.5", children: "New password" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "password", value: pwd, onChange: (e) => setPwd(e.target.value), required: true, minLength: 8, className: "w-full bg-[#1a2035] rounded-lg px-3.5 py-2.5 text-sm text-white", style: {
        border: "0.5px solid rgba(255,255,255,0.1)"
      } })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-[11px] uppercase tracking-wider text-white/50 mb-1.5", children: "Confirm password" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "password", value: confirm, onChange: (e) => setConfirm(e.target.value), required: true, className: "w-full bg-[#1a2035] rounded-lg px-3.5 py-2.5 text-sm text-white", style: {
        border: "0.5px solid rgba(255,255,255,0.1)"
      } })
    ] }),
    err && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rounded-lg px-3.5 py-2.5 text-[13px] text-[#F09595]", style: {
      background: "rgba(163,45,45,0.15)",
      border: "0.5px solid rgba(163,45,45,0.4)"
    }, children: err }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "submit", disabled: submitting, className: "w-full rounded-lg bg-[#185FA5] hover:bg-[#378ADD] text-white py-3", children: submitting ? "Updating…" : "Update password" })
  ] }) });
}
export {
  ResetPasswordPage as component
};
