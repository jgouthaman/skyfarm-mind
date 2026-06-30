import { r as reactExports, j as jsxRuntimeExports } from "./_libs/react.mjs";
import { S as SectionBadge } from "./_ssr/SectionBadge-Bokc1YJ-.mjs";
import { B as Button, c as cn } from "./_ssr/button-DjOZMqFS.mjs";
import { D as Dialog$1, a as DialogPortal$1, b as DialogContent$1, c as DialogClose, d as DialogTitle$1, e as DialogDescription$1, f as DialogOverlay$1 } from "./_libs/radix-ui__react-dialog.mjs";
import { s as supabase } from "./_ssr/client-DYtC4Igq.mjs";
import { l as ArrowRight, X, ai as Check, z as GraduationCap, g as CircleCheck } from "./_libs/lucide-react.mjs";
import "./_libs/radix-ui__react-slot.mjs";
import "./_libs/radix-ui__react-compose-refs.mjs";
import "./_libs/class-variance-authority.mjs";
import "./_libs/clsx.mjs";
import "./_libs/tailwind-merge.mjs";
import "./_libs/radix-ui__primitive.mjs";
import "./_libs/radix-ui__react-context.mjs";
import "./_libs/radix-ui__react-id.mjs";
import "./_libs/@radix-ui/react-use-layout-effect+[...].mjs";
import "./_libs/@radix-ui/react-use-controllable-state+[...].mjs";
import "./_libs/@radix-ui/react-dismissable-layer+[...].mjs";
import "./_libs/radix-ui__react-primitive.mjs";
import "./_libs/react-dom.mjs";
import "util";
import "crypto";
import "async_hooks";
import "stream";
import "./_libs/@radix-ui/react-use-callback-ref+[...].mjs";
import "./_libs/@radix-ui/react-use-escape-keydown+[...].mjs";
import "./_libs/radix-ui__react-focus-scope.mjs";
import "./_libs/radix-ui__react-portal.mjs";
import "./_libs/radix-ui__react-presence.mjs";
import "./_libs/radix-ui__react-focus-guards.mjs";
import "./_libs/react-remove-scroll.mjs";
import "tslib";
import "./_libs/react-remove-scroll-bar.mjs";
import "./_libs/react-style-singleton.mjs";
import "./_libs/get-nonce.mjs";
import "./_libs/use-sidecar.mjs";
import "./_libs/use-callback-ref.mjs";
import "./_libs/aria-hidden.mjs";
import "./_libs/supabase__supabase-js.mjs";
import "./_libs/supabase__postgrest-js.mjs";
import "./_libs/supabase__realtime-js.mjs";
import "./_libs/supabase__phoenix.mjs";
import "./_libs/supabase__storage-js.mjs";
import "./_libs/iceberg-js.mjs";
import "./_libs/supabase__auth-js.mjs";
import "./_libs/supabase__functions-js.mjs";
const Dialog = Dialog$1;
const DialogPortal = DialogPortal$1;
const DialogOverlay = reactExports.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsxRuntimeExports.jsx(
  DialogOverlay$1,
  {
    ref,
    className: cn(
      "fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    ),
    ...props
  }
));
DialogOverlay.displayName = DialogOverlay$1.displayName;
const DialogContent = reactExports.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogPortal, { children: [
  /* @__PURE__ */ jsxRuntimeExports.jsx(DialogOverlay, {}),
  /* @__PURE__ */ jsxRuntimeExports.jsxs(
    DialogContent$1,
    {
      ref,
      className: cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg",
        className
      ),
      ...props,
      children: [
        children,
        /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogClose, { className: "absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background cursor-pointer transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "h-4 w-4" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "sr-only", children: "Close" })
        ] })
      ]
    }
  )
] }));
DialogContent.displayName = DialogContent$1.displayName;
const DialogHeader = ({ className, ...props }) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: cn("flex flex-col space-y-1.5 text-center sm:text-left", className), ...props });
DialogHeader.displayName = "DialogHeader";
const DialogTitle = reactExports.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsxRuntimeExports.jsx(
  DialogTitle$1,
  {
    ref,
    className: cn("text-lg font-semibold leading-none tracking-tight", className),
    ...props
  }
));
DialogTitle.displayName = DialogTitle$1.displayName;
const DialogDescription = reactExports.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsxRuntimeExports.jsx(
  DialogDescription$1,
  {
    ref,
    className: cn("text-sm text-muted-foreground", className),
    ...props
  }
));
DialogDescription.displayName = DialogDescription$1.displayName;
function DesignStudioLeadModal({
  open,
  onClose,
  plan
}) {
  const [submitting, setSubmitting] = reactExports.useState(false);
  const [success, setSuccess] = reactExports.useState(null);
  const [errors, setErrors] = reactExports.useState({});
  const [serverError, setServerError] = reactExports.useState(null);
  reactExports.useEffect(() => {
    if (!open) {
      setSuccess(null);
      setErrors({});
      setServerError(null);
    }
  }, [open]);
  reactExports.useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open || !plan) return null;
  const inputCls = "w-full bg-[#1a2035] text-white placeholder:text-white/40 border border-white/10 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#378ADD]/60 transition-colors";
  async function handleSubmit(e) {
    e.preventDefault();
    setServerError(null);
    const fd = new FormData(e.currentTarget);
    const get = (k) => String(fd.get(k) ?? "").trim();
    const data = {
      full_name: get("full_name"),
      email: get("email"),
      phone: get("phone"),
      organisation: get("organisation") || null,
      role: get("role"),
      location: get("location"),
      plan: get("plan"),
      message: get("message") || null,
      source: "website"
    };
    const errs = {};
    if (!data.full_name) errs.full_name = "Please enter your full name";
    if (!data.email) errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errs.email = "Enter a valid email";
    if (!data.phone) errs.phone = "Phone number is required";
    if (!data.role) errs.role = "Please select your role";
    if (!data.location) errs.location = "Please enter your city / state";
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const { error } = await supabase.from("design_studio_leads").insert(data);
      console.log("[Leads] insert result — error:", error);
      if (error) throw error;
      setSuccess(data.email);
    } catch (err) {
      try {
        const existing = JSON.parse(localStorage.getItem("twds_leads") || "[]");
        existing.push({ ...data, created_at: (/* @__PURE__ */ new Date()).toISOString() });
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
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      className: "fixed inset-0 z-[1000] flex items-center justify-center bg-black/[0.78] p-0 sm:p-4 overflow-y-auto",
      onClick: onClose,
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          className: "relative w-full sm:max-w-[480px] sm:rounded-2xl bg-[#141928] border border-white/10 p-6 sm:p-8 my-0 sm:my-8 min-h-screen sm:min-h-0",
          onClick: (e) => e.stopPropagation(),
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                onClick: onClose,
                "aria-label": "Close",
                className: "absolute right-4 top-4 text-white/50 hover:text-white text-lg",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "h-5 w-5" })
              }
            ),
            success ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "py-6 text-center", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full bg-emerald-500/15 border border-emerald-500/40", children: /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "h-8 w-8 text-emerald-400" }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-display text-xl text-white", children: "You're on the list!" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-sm text-white/60", children: "We'll be in touch within 1 business day. Watch your inbox." }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-3 text-sm text-[#378ADD] break-all", children: success }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-4 text-[13px] text-white/60", children: [
                "Once your access is confirmed, sign in at",
                " ",
                /* @__PURE__ */ jsxRuntimeExports.jsx("a", { href: "/mission-hub/login", className: "text-[#378ADD] hover:underline", children: "Mission Hub →" })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  onClick: onClose,
                  className: "mt-6 w-full rounded-lg border border-white/20 text-white/90 hover:bg-white/5 py-3 text-sm transition-colors",
                  children: "Close"
                }
              )
            ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "span",
                {
                  className: "inline-block text-[10px] font-semibold uppercase tracking-[0.18em] px-2.5 py-1 rounded-md",
                  style: { background: plan.badgeBg, color: plan.badgeText },
                  children: plan.badge
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "mt-3 font-display text-xl text-white", children: [
                "You chose the ",
                plan.name,
                " plan"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-sm text-white/60", children: plan.tagline }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: handleSubmit, className: "mt-6 space-y-3.5", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(FormField, { label: "Full name", error: errors.full_name, children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { name: "full_name", className: inputCls, placeholder: "Your full name" }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(FormField, { label: "Email address", error: errors.email, children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { name: "email", type: "email", className: inputCls, placeholder: "you@email.com" }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(FormField, { label: "Phone number", error: errors.phone, children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { name: "phone", type: "tel", className: inputCls, placeholder: "+91 98765 43210" }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(FormField, { label: "Organisation", children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { name: "organisation", className: inputCls, placeholder: "Company / College / Institution (optional)" }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(FormField, { label: "Role", error: errors.role, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { name: "role", defaultValue: "", className: inputCls, children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", disabled: true, children: "Select your role" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: "Student" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: "Drone Engineer" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: "Defence / DRDO" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: "Academic / Faculty" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: "Startup Founder" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: "Investor" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: "Other" })
                ] }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(FormField, { label: "State / City", error: errors.location, children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { name: "location", className: inputCls, placeholder: "e.g. Chennai, Tamil Nadu" }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(FormField, { label: "Plan", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    name: "plan",
                    readOnly: true,
                    defaultValue: plan.name,
                    className: "w-full bg-[#0a0f1c] text-white/60 border border-white/10 rounded-lg px-3.5 py-2.5 text-sm"
                  }
                ) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(FormField, { label: "Message", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "textarea",
                  {
                    name: "message",
                    rows: 3,
                    className: inputCls,
                    placeholder: "Tell us briefly what you want to build or achieve"
                  }
                ) }),
                serverError && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300", children: serverError }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    type: "submit",
                    disabled: submitting,
                    className: "w-full rounded-lg bg-[#185FA5] hover:bg-[#378ADD] text-white font-display font-medium py-3 transition-colors disabled:opacity-60",
                    children: submitting ? "Submitting…" : "Submit interest"
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-center text-[11px] text-white/40", children: "We respond within 1 business day · Your data stays in India" })
              ] })
            ] })
          ]
        }
      )
    }
  );
}
function FormField({
  label,
  error,
  children
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-[11px] uppercase tracking-wider text-white/50 mb-1.5", children: label }),
    children,
    error && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-xs text-red-400", children: error })
  ] });
}
function InlineBadge({ variant }) {
  if (variant === "new") {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-1.5 inline-block align-middle text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-[#EF9F27]/20 text-[#EF9F27]", children: "new" });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-1.5 inline-block align-middle text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-[#185FA5]/25 text-[#378ADD]", children: "flagship" });
}
function formatPrice(n) {
  return "₹" + n.toLocaleString("en-IN");
}
const TIERS = [
  {
    key: "explorer",
    name: "Explorer",
    tagline: "For students and hobbyists",
    badgeLabel: "Free forever",
    badgeBg: "rgba(255,255,255,0.08)",
    badgeText: "rgba(255,255,255,0.7)",
    cardBorder: "1px solid rgba(255,255,255,0.08)",
    hoverBorder: "rgba(55,138,221,0.4)",
    monthlyPrice: 0,
    annualMonthly: 0,
    annualBillingLine: "",
    isFree: true,
    included: [
      { text: "5 drone designs per month", note: "↑ from 3" },
      { text: "3 AI advisor queries / month" },
      { text: "Basic flight simulation" },
      { text: "Standard component list" },
      { text: "Community templates" }
    ],
    excluded: [
      "BOM + component export",
      "PDF report generation",
      "Team collaboration",
      "API access"
    ],
    cta: "Start free",
    ctaClass: "border border-white/30 text-white hover:bg-white/5"
  },
  {
    key: "engineer",
    name: "Engineer",
    tagline: "For solo professional drone engineers",
    badgeLabel: "Most popular",
    badgeBg: "#185FA5",
    badgeText: "#ffffff",
    topPill: true,
    cardBorder: "2px solid #378ADD",
    hoverBorder: "#378ADD",
    monthlyPrice: 1499,
    annualMonthly: 1199,
    annualBillingLine: "billed ₹14,388 / year",
    included: [
      { text: "Everything in Explorer" },
      { text: "Unlimited drone designs" },
      { text: "50 AI advisor queries / month" },
      { text: "Full flight simulation" },
      { text: "AI-powered design review" },
      { text: "BOM + component export" },
      { text: "PDF report generation" },
      { text: "Priority email support" }
    ],
    excluded: ["Team seats", "White-label reports", "API access", "DRDO compliance pack"],
    cta: "Get early access",
    ctaClass: "bg-[#185FA5] hover:bg-[#378ADD] text-white"
  },
  {
    key: "studio",
    name: "Studio",
    tagline: "For small drone companies and design teams",
    badgeLabel: "New tier ✦",
    badgeBg: "rgba(239,159,39,0.15)",
    badgeText: "#EF9F27",
    topPill: true,
    pillLabel: "Coming Soon",
    cardBorder: "2px solid #22c55e",
    hoverBorder: "#22c55e",
    monthlyPrice: 4999,
    annualMonthly: 3999,
    annualBillingLine: "billed ₹47,988 / year",
    included: [
      { text: "Everything in Engineer" },
      { text: "Up to 10 team seats" },
      { text: "500 AI advisor queries / month", badge: "new" },
      { text: "Shared project workspace", badge: "new" },
      { text: "White-label PDF reports" },
      { text: "API access + webhooks" },
      { text: "Custom payload library" },
      { text: "Dedicated onboarding" }
    ],
    excluded: ["DRDO compliance pack"],
    cta: "Join waitlist",
    ctaClass: "border border-white/30 text-white hover:bg-white/5"
  },
  {
    key: "squadron",
    name: "Squadron",
    tagline: "For drone companies and defence labs",
    badgeLabel: "Enterprise · DRDO",
    badgeBg: "#EF9F27",
    badgeText: "#0a0f1c",
    cardBorder: "1px solid rgba(239,159,39,0.3)",
    hoverBorder: "rgba(239,159,39,0.55)",
    monthlyPrice: 9999,
    annualMonthly: 7999,
    annualBillingLine: "billed ₹95,988 / year",
    strikethrough: 12999,
    included: [
      { text: "Everything in Studio" },
      { text: "Unlimited team members" },
      { text: "2,000 AI advisor queries / month", badge: "flagship" },
      { text: "Overage: ₹1 / extra query", muted: true },
      { text: "DRDO / HAL compliance export", badge: "flagship" },
      { text: "Priority support + SLA" },
      { text: "Custom integrations" },
      { text: "White-glove onboarding" }
    ],
    excluded: [],
    cta: "Join waitlist",
    ctaClass: "border border-[#EF9F27] text-[#EF9F27] hover:bg-[#EF9F27]/10",
    comingSoon: true
  }
];
const CAMPUS_SUBTIERS = [
  {
    name: "Starter",
    seats: "Up to 30 student seats",
    monthlyPrice: 4999,
    annualMonthly: 3999,
    annualBillingLine: "₹47,988 / year"
  },
  {
    name: "Department",
    seats: "Up to 100 student seats",
    monthlyPrice: 9999,
    annualMonthly: 7999,
    annualBillingLine: "₹95,988 / year"
  },
  {
    name: "Institution",
    seats: "Up to 500 student seats",
    monthlyPrice: 19999,
    annualMonthly: 15999,
    annualBillingLine: "₹1,91,988 / year"
  }
];
const CAMPUS_FEATURES = [
  "Faculty admin dashboard",
  "Curriculum integration kit",
  "Assignment and grading tools",
  "Anna University compatible",
  "Co-branded certificates",
  "Career pathway support",
  "Full Design Studio access for all seats"
];
function CampusCard({ annual, onCta }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: "mt-6 rounded-2xl p-7 bg-[#1a2035] transition-all duration-200",
      style: { border: "1px solid rgba(20,184,166,0.25)" },
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-start justify-between gap-6", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "shrink-0", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "span",
              {
                className: "inline-block text-[10px] font-semibold uppercase tracking-[0.18em] px-2.5 py-1 rounded-md",
                style: { background: "rgba(20,184,166,0.18)", color: "#5eead4" },
                children: "Institutional"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "mt-3 font-display font-semibold text-xl text-white flex items-center gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(GraduationCap, { className: "h-5 w-5 text-teal-400", "aria-hidden": "true" }),
              "Campus"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-sm text-white/55", children: "For engineering colleges and universities" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 max-w-xs text-xs text-teal-400/70", children: "Includes all Design Studio modules, faculty controls, and Anna University-compatible curriculum tools." })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid sm:grid-cols-3 gap-4 flex-1 min-w-0 sm:min-w-[480px]", children: CAMPUS_SUBTIERS.map((sub) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              className: "rounded-xl p-4 bg-[#111827] border border-white/[0.07]",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-semibold text-teal-400 uppercase tracking-wide", children: sub.name }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-0.5 text-[11px] text-white/40", children: sub.seats }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 flex items-baseline gap-1", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-display font-bold text-2xl text-white", children: formatPrice(annual ? sub.annualMonthly : sub.monthlyPrice) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-white/40", children: "/ mo" })
                ] }),
                annual && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-0.5 text-[10px] text-white/35", children: [
                  "billed ",
                  sub.annualBillingLine
                ] })
              ]
            },
            sub.name
          )) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-6 grid sm:grid-cols-[1fr_auto] gap-6 items-end", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "grid sm:grid-cols-2 gap-x-6 gap-y-2", children: CAMPUS_FEATURES.map((f) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex items-start gap-2 text-sm text-white/75", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "mt-0.5 h-4 w-4 flex-shrink-0 text-teal-400" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: f })
          ] }, f)) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: onCta,
              className: "shrink-0 rounded-lg px-8 py-2.5 text-sm font-medium border border-white/30 text-white hover:bg-white/5 transition-colors",
              children: "Apply for Campus plan"
            }
          )
        ] })
      ]
    }
  );
}
function DesignStudioPricing() {
  const [annual, setAnnual] = reactExports.useState(false);
  const [openPlan, setOpenPlan] = reactExports.useState(null);
  const openModal = (plan) => setOpenPlan(plan);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { id: "design-studio-pricing", className: "relative py-20 sm:py-28 bg-[#0a0f1c]", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mx-auto max-w-7xl px-5 lg:px-8", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-semibold uppercase tracking-[0.25em] text-[#378ADD]", children: "Design Studio · Pricing" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "mt-3 font-display font-bold text-3xl sm:text-4xl lg:text-5xl text-white", children: "Choose your engineering plan" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-4 text-base text-white/60", children: "Start free. Upgrade as your team grows. Cancel anytime." }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-7 flex justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: () => openModal({
              name: "Waitlist",
              tagline: "Early access to TorqWings Design Studio",
              badge: "Waitlist",
              badgeBg: "rgba(239,159,39,0.15)",
              badgeText: "#EF9F27"
            }),
            className: "inline-flex items-center gap-2 rounded-full border border-[#EF9F27] text-[#EF9F27] text-sm px-5 py-2 hover:bg-[#EF9F27]/10 transition-colors",
            children: "Early access open — join the waitlist →"
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-7 flex items-center justify-center gap-3 text-sm", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: annual ? "text-white/50" : "text-white font-medium", children: "Monthly" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              role: "switch",
              "aria-checked": annual,
              onClick: () => setAnnual((v) => !v),
              className: "relative h-7 w-12 rounded-full transition-colors",
              style: { background: annual ? "#185FA5" : "rgba(255,255,255,0.15)" },
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                "span",
                {
                  className: "absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white transition-transform",
                  style: { transform: annual ? "translateX(20px)" : "translateX(0)" }
                }
              )
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: annual ? "text-white font-medium" : "text-white/50", children: "Annual" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "span",
            {
              className: "text-[10px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full transition-all duration-200",
              style: {
                background: annual ? "rgba(239,159,39,0.18)" : "rgba(255,255,255,0.06)",
                color: annual ? "#EF9F27" : "rgba(255,255,255,0.28)"
              },
              children: "Save up to 20%"
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-12 grid gap-6 sm:grid-cols-2 xl:grid-cols-4", children: TIERS.map((t) => {
        const price = annual ? t.annualMonthly : t.monthlyPrice;
        return /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: "relative rounded-2xl p-7 bg-[#1a2035] transition-all duration-200 hover:-translate-y-[3px]",
            style: { border: t.cardBorder },
            onMouseEnter: (e) => {
              if (!t.topPill) e.currentTarget.style.borderColor = t.hoverBorder;
            },
            onMouseLeave: (e) => {
              if (!t.topPill) e.currentTarget.style.border = t.cardBorder;
            },
            children: [
              t.topPill && /* @__PURE__ */ jsxRuntimeExports.jsx(
                "span",
                {
                  className: "absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.18em] px-3 py-1 rounded-full",
                  style: { background: t.badgeBg, color: t.badgeText },
                  children: t.pillLabel ?? t.badgeLabel
                }
              ),
              t.comingSoon && !t.topPill && /* @__PURE__ */ jsxRuntimeExports.jsx(
                "span",
                {
                  className: "absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.18em] px-3 py-1 rounded-full",
                  style: { background: "rgba(239,159,39,0.15)", color: "#EF9F27" },
                  children: "Coming Soon"
                }
              ),
              !t.topPill && /* @__PURE__ */ jsxRuntimeExports.jsx(
                "span",
                {
                  className: "inline-block text-[10px] font-semibold uppercase tracking-[0.18em] px-2.5 py-1 rounded-md",
                  style: { background: t.badgeBg, color: t.badgeText },
                  children: t.badgeLabel
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "mt-4 font-display font-semibold text-xl text-white", children: t.name }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-sm text-white/55", children: t.tagline }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-5", children: [
                t.isFree ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-display font-bold text-3xl text-white", children: "Free" }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-baseline gap-2", children: [
                  t.strikethrough && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-lg font-medium text-white/30 line-through", children: formatPrice(t.strikethrough) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-display font-bold text-3xl text-white", children: formatPrice(price) })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-xs text-white/40", children: "per user / month" }),
                annual && t.annualBillingLine && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-0.5 text-xs text-white/35", children: t.annualBillingLine })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("ul", { className: "mt-6 space-y-2.5", children: [
                t.included.map((f) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "li",
                  {
                    className: `flex items-start gap-2 text-sm ${f.muted ? "text-white/38" : "text-white/80"}`,
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        Check,
                        {
                          className: `mt-0.5 h-4 w-4 flex-shrink-0 ${f.muted ? "text-white/22" : "text-[#378ADD]"}`
                        }
                      ),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                        f.text,
                        f.badge && /* @__PURE__ */ jsxRuntimeExports.jsx(InlineBadge, { variant: f.badge }),
                        f.note && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-1.5 text-[10px] font-semibold text-[#EF9F27]/80", children: f.note })
                      ] })
                    ]
                  },
                  f.text
                )),
                t.excluded.map((f) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex items-start gap-2 text-sm text-white/25", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "mt-0.5 h-4 w-4 flex-shrink-0" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: f })
                ] }, f))
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  onClick: () => openModal({
                    name: t.name,
                    tagline: t.tagline,
                    badge: t.badgeLabel,
                    badgeBg: t.badgeBg,
                    badgeText: t.badgeText
                  }),
                  className: `mt-7 w-full rounded-lg py-2.5 text-sm font-medium transition-colors ${t.ctaClass}`,
                  children: t.cta
                }
              )
            ]
          },
          t.key
        );
      }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        CampusCard,
        {
          annual,
          onCta: () => openModal({
            name: "Campus",
            tagline: "For engineering colleges and universities",
            badge: "Institutional",
            badgeBg: "rgba(20,184,166,0.18)",
            badgeText: "#5eead4"
          })
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-10 text-center text-xs text-white/40", children: "🔒 14-day free trial on all paid plans · No credit card required · Data hosted in India" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      DesignStudioLeadModal,
      {
        open: !!openPlan,
        onClose: () => setOpenPlan(null),
        plan: openPlan
      }
    )
  ] });
}
const url = "/__l5e/assets-v1/95b381af-7d80-44df-b976-d23ac5d772a9/design-studio-demo.mp4";
const demoVideo = {
  url
};
const DS_STATS = [{
  label: "Total Designs",
  value: 12,
  tone: "text-sky-600"
}, {
  label: "Simulations",
  value: 8,
  tone: "text-indigo-600"
}, {
  label: "Safe Designs",
  value: 9,
  tone: "text-emerald-600"
}, {
  label: "Warning",
  value: 2,
  tone: "text-amber-600"
}, {
  label: "Unsafe",
  value: 1,
  tone: "text-red-600"
}, {
  label: "AI Reviews",
  value: 24,
  tone: "text-violet-600"
}];
const DS_TABLE_ROWS = [{
  name: "AgriSpray X1",
  vertical: "Agriculture",
  type: "Hexacopter",
  risk: "Safe",
  status: "Finalized"
}, {
  name: "Solar Scout",
  vertical: "Infrastructure",
  type: "Quadcopter",
  risk: "Safe",
  status: "Simulated"
}, {
  name: "FireWatch Pro",
  vertical: "Surveillance",
  type: "Octocopter",
  risk: "Warning",
  status: "Designed"
}, {
  name: "MapStream 300",
  vertical: "Mapping",
  type: "Fixed Wing",
  risk: "Safe",
  status: "Finalized"
}, {
  name: "CargoLift 50",
  vertical: "Logistics",
  type: "Hexacopter",
  risk: "Unsafe",
  status: "Draft"
}];
const RISK_STYLES = {
  Safe: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Warning: "bg-amber-50 text-amber-700 border-amber-200",
  Unsafe: "bg-red-50 text-red-700 border-red-200"
};
function DesignStudioPage() {
  const [demoOpen, setDemoOpen] = reactExports.useState(false);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { id: "design-studio", className: "relative py-20 sm:py-28 overflow-hidden", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 bg-gradient-primary opacity-[0.06] pointer-events-none" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mx-auto max-w-7xl px-5 lg:px-8 relative", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid lg:grid-cols-12 gap-10 items-start", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "lg:col-span-5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(SectionBadge, { label: "Engineering Vertical" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-3xl sm:text-4xl font-bold", children: "TorqWings Design Studio" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-lg text-muted-foreground", children: "Autonomous aerial platform design, simulation, and AI-powered engineering" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-5 text-muted-foreground", children: "TorqWings Design Studio is an engineering workspace where teams design autonomous aerial platform architectures from mission requirements, run real-time flight simulations, generate component lists, and receive AI-powered design reviews — turning concepts into flyable systems faster." }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { size: "lg", onClick: () => setDemoOpen(true), className: "mt-7 bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow", children: [
            "Watch Design Studio Demo ",
            /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { className: "ml-1 h-4 w-4", "aria-hidden": "true" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "lg:col-span-7 space-y-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-3 gap-3", children: DS_STATS.map((k) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-border/60 bg-card/60 p-4", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10px] uppercase tracking-wide text-muted-foreground", children: k.label }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `mt-1 text-xl font-semibold ${k.tone}`, children: k.value })
          ] }, k.label)) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rounded-xl border border-border/60 bg-card/60 overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-sm", "aria-label": "Design Studio project overview", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("caption", { className: "sr-only", children: "Design Studio projects with vertical, platform type, risk, and status" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "text-left font-medium px-4 py-2", children: "Project" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "text-left font-medium px-4 py-2", children: "Vertical" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "text-left font-medium px-4 py-2", children: "Platform Type" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "text-left font-medium px-4 py-2", children: "Risk" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("th", { scope: "col", className: "text-left font-medium px-4 py-2", children: "Status" })
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: DS_TABLE_ROWS.map((p) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-t border-border/60 hover:bg-muted/20", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2 font-medium", children: p.name }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2 text-muted-foreground", children: p.vertical }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2 text-muted-foreground", children: p.type }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `text-[10px] px-2 py-0.5 rounded-full border ${RISK_STYLES[p.risk] ?? ""}`, children: p.risk }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] px-2 py-0.5 rounded-full bg-muted/40 border border-border", children: p.status }) })
            ] }, p.name)) })
          ] }) }) })
        ] })
      ] }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open: demoOpen, onOpenChange: setDemoOpen, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { className: "max-w-3xl", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "TorqWings Design Studio — Demo" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(DialogDescription, { children: "A quick walkthrough of the engineering workspace. Live access is restricted to authorized teams." })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "aspect-video w-full overflow-hidden rounded-lg bg-black", children: /* @__PURE__ */ jsxRuntimeExports.jsx("video", { src: demoVideo.url, controls: true, autoPlay: true, className: "h-full w-full" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm", children: [
        "For access to the Design Studio, please reach out to",
        " ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("a", { href: "mailto:Torqwings@gmail.com", className: "font-semibold text-primary hover:underline", children: "Torqwings@gmail.com" }),
        "."
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(DesignStudioPricing, {})
  ] });
}
export {
  DesignStudioPage as component
};
