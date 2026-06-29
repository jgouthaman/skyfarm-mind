import { r as reactExports, j as jsxRuntimeExports } from "../_libs/react.mjs";
import { d as useNavigate, L as Link } from "../_libs/tanstack__react-router.mjs";
import { t as toast } from "../_libs/sonner.mjs";
import { T as Toaster } from "./sonner-DeNSN9-c.mjs";
import { B as Button } from "./button-DjOZMqFS.mjs";
import { p as pilotStore } from "./pilot-store-Br2zyCNy.mjs";
import { g as getPilotByPhone } from "./cloud-api-CcVCjfQj.mjs";
import { P as Plane, d as Leaf, r as Shield } from "../_libs/lucide-react.mjs";
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
import "../_libs/radix-ui__react-slot.mjs";
import "../_libs/radix-ui__react-compose-refs.mjs";
import "../_libs/class-variance-authority.mjs";
import "../_libs/clsx.mjs";
import "../_libs/tailwind-merge.mjs";
import "./client-DYtC4Igq.mjs";
import "../_libs/supabase__supabase-js.mjs";
import "../_libs/supabase__postgrest-js.mjs";
import "../_libs/supabase__realtime-js.mjs";
import "../_libs/supabase__phoenix.mjs";
import "../_libs/supabase__storage-js.mjs";
import "../_libs/iceberg-js.mjs";
import "../_libs/supabase__auth-js.mjs";
import "tslib";
import "../_libs/supabase__functions-js.mjs";
function PilotLogin() {
  const navigate = useNavigate();
  const [mobile, setMobile] = reactExports.useState("");
  const [otp, setOtp] = reactExports.useState("");
  const [sent, setSent] = reactExports.useState(false);
  const sendOtp = () => {
    if (mobile.length !== 10) return toast.error("Enter a valid 10-digit mobile number");
    setSent(true);
    toast.success("Demo OTP sent");
  };
  const verify = async () => {
    if (otp.length !== 5) return toast.error("OTP must be exactly 5 digits");
    if (otp !== mobile.slice(-5)) return toast.error("Invalid OTP. Please enter the last 5 digits of your mobile number.");
    let name = "Pilot";
    try {
      const p = await getPilotByPhone(mobile);
      if (!p) {
        return toast.error("No pilot registered with this mobile number. Ask Control Center to add you first.");
      }
      name = p.name;
    } catch (e) {
      return toast.error(e.message);
    }
    pilotStore.login(name, mobile);
    toast.success(`Welcome ${name}`);
    setTimeout(() => navigate({
      to: "/field"
    }), 250);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-h-screen bg-gradient-hero grid-bg flex items-center justify-center p-5", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Toaster, { richColors: true, position: "top-center", theme: "dark" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "w-full max-w-sm", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-center gap-2 mb-6", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "grid place-items-center h-10 w-10 rounded-xl bg-gradient-primary shadow-glow", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Plane, { className: "h-5 w-5 text-primary-foreground" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-left", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-display font-semibold leading-none", children: "TorqWings" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground", children: "AgriSky Pilot App" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-2xl border border-border/60 bg-gradient-card p-6 shadow-card", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-xs text-accent mb-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Leaf, { className: "h-3.5 w-3.5" }),
          " Field operations gateway"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-xl font-semibold", children: "Pilot sign in" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground mt-1", children: "Verify your mobile number to access today's missions." }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs text-muted-foreground mt-5 block", children: "Mobile number" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { inputMode: "numeric", value: mobile, onChange: (e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10)), placeholder: "10-digit mobile", className: "mt-1 w-full h-12 rounded-lg bg-input/40 border border-border/60 px-3 text-base outline-none focus:ring-2 focus:ring-ring" }),
        !sent ? /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: sendOtp, className: "mt-4 w-full h-12 bg-gradient-primary text-primary-foreground", children: "Send OTP" }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs text-muted-foreground mt-4 block", children: "Enter OTP" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { inputMode: "numeric", value: otp, onChange: (e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 5)), placeholder: "5-digit OTP", className: "mt-1 w-full h-12 rounded-lg bg-input/40 border border-border/60 px-3 text-center text-lg tracking-[0.5em] font-mono outline-none focus:ring-2 focus:ring-ring" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: verify, className: "mt-4 w-full h-12 bg-gradient-agri text-primary-foreground", children: "Verify & Login" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => {
            setSent(false);
            setOtp("");
          }, className: "mt-3 text-xs text-muted-foreground hover:text-foreground w-full text-center", children: "Change number" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-5 text-[11px] text-muted-foreground flex items-start gap-1.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Shield, { className: "h-3 w-3 mt-0.5 shrink-0" }),
          "OTP validation uses the last 5 digits of the entered mobile number for demo."
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-center mt-5", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/control-center", className: "text-xs text-muted-foreground hover:text-foreground", children: "Go to Control Center →" }) })
    ] })
  ] });
}
export {
  PilotLogin as component
};
