import { j as jsxRuntimeExports, r as reactExports } from "./_libs/react.mjs";
import { C as Card } from "./_ssr/Card-Diw2V0Z0.mjs";
import { B as Button, c as cn } from "./_ssr/button-DjOZMqFS.mjs";
import { I as Input } from "./_ssr/input-D_U8fI25.mjs";
import { L as Label } from "./_ssr/label-C8WJLhmR.mjs";
import { S as Select, a as SelectTrigger, b as SelectValue, c as SelectContent, d as SelectItem } from "./_ssr/select-CUSP6kj8.mjs";
import { t as toast } from "./_libs/sonner.mjs";
import { s as supabase } from "./_ssr/client-DYtC4Igq.mjs";
import { S as SectionBadge } from "./_ssr/SectionBadge-Bokc1YJ-.mjs";
import { aj as Phone, ak as Mail, M as MapPin, l as ArrowRight, g as CircleCheck } from "./_libs/lucide-react.mjs";
import "./_libs/radix-ui__react-slot.mjs";
import "./_libs/radix-ui__react-compose-refs.mjs";
import "./_libs/class-variance-authority.mjs";
import "./_libs/clsx.mjs";
import "./_libs/tailwind-merge.mjs";
import "./_libs/radix-ui__react-label.mjs";
import "./_libs/radix-ui__react-primitive.mjs";
import "./_libs/react-dom.mjs";
import "util";
import "crypto";
import "async_hooks";
import "stream";
import "./_libs/radix-ui__react-select.mjs";
import "./_libs/radix-ui__number.mjs";
import "./_libs/radix-ui__primitive.mjs";
import "./_libs/radix-ui__react-collection.mjs";
import "./_libs/radix-ui__react-context.mjs";
import "./_libs/radix-ui__react-direction.mjs";
import "./_libs/@radix-ui/react-dismissable-layer+[...].mjs";
import "./_libs/@radix-ui/react-use-callback-ref+[...].mjs";
import "./_libs/@radix-ui/react-use-escape-keydown+[...].mjs";
import "./_libs/radix-ui__react-focus-guards.mjs";
import "./_libs/radix-ui__react-focus-scope.mjs";
import "./_libs/radix-ui__react-id.mjs";
import "./_libs/@radix-ui/react-use-layout-effect+[...].mjs";
import "./_libs/radix-ui__react-popper.mjs";
import "./_libs/floating-ui__react-dom.mjs";
import "./_libs/floating-ui__dom.mjs";
import "./_libs/floating-ui__core.mjs";
import "./_libs/floating-ui__utils.mjs";
import "./_libs/radix-ui__react-arrow.mjs";
import "./_libs/radix-ui__react-use-size.mjs";
import "./_libs/radix-ui__react-portal.mjs";
import "./_libs/radix-ui__react-presence.mjs";
import "./_libs/@radix-ui/react-use-controllable-state+[...].mjs";
import "./_libs/radix-ui__react-use-previous.mjs";
import "./_libs/@radix-ui/react-visually-hidden+[...].mjs";
import "./_libs/aria-hidden.mjs";
import "./_libs/react-remove-scroll.mjs";
import "tslib";
import "./_libs/react-remove-scroll-bar.mjs";
import "./_libs/react-style-singleton.mjs";
import "./_libs/get-nonce.mjs";
import "./_libs/use-sidecar.mjs";
import "./_libs/use-callback-ref.mjs";
import "./_libs/supabase__supabase-js.mjs";
import "./_libs/supabase__postgrest-js.mjs";
import "./_libs/supabase__realtime-js.mjs";
import "./_libs/supabase__phoenix.mjs";
import "./_libs/supabase__storage-js.mjs";
import "./_libs/iceberg-js.mjs";
import "./_libs/supabase__auth-js.mjs";
import "./_libs/supabase__functions-js.mjs";
const Textarea = reactExports.forwardRef(
  ({ className, ...props }, ref) => {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      "textarea",
      {
        className: cn(
          "flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        ),
        ref,
        ...props
      }
    );
  }
);
Textarea.displayName = "Textarea";
function ContactForm() {
  const [submitting, setSubmitting] = reactExports.useState(false);
  const [interest, setInterest] = reactExports.useState("");
  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get("name") ?? "").trim(),
      phone: String(fd.get("phone") ?? "").trim() || null,
      email: String(fd.get("email") ?? "").trim() || null,
      organisation: String(fd.get("org") ?? "").trim() || null,
      location: String(fd.get("location") ?? "").trim() || null,
      vertical_interest: interest || null,
      message: String(fd.get("message") ?? "").trim() || null
    };
    try {
      const { error } = await supabase.from("contacts").insert(payload);
      if (error) throw error;
      toast.success("Thanks! We'll reach out shortly.");
      e.target.reset();
      setInterest("");
    } catch (err) {
      toast.error(err?.message ?? "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "form",
    {
      "aria-label": "Partner interest form",
      onSubmit: handleSubmit,
      className: "grid sm:grid-cols-2 gap-4",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { id: "cf-name", label: "Name", required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { id: "cf-name", name: "name", required: true, placeholder: "Your full name" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { id: "cf-phone", label: "Phone", required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { id: "cf-phone", name: "phone", required: true, type: "tel", placeholder: "+91 ..." }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { id: "cf-email", label: "Email", required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { id: "cf-email", name: "email", required: true, type: "email", placeholder: "support@torqwings.com" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { id: "cf-org", label: "Organization", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { id: "cf-org", name: "org", placeholder: "Company / FPO / Institution" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { id: "cf-location", label: "Location", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { id: "cf-location", name: "location", placeholder: "City, State" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { id: "cf-interest", label: "Interested in", required: true, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: interest, onValueChange: setInterest, required: true, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { id: "cf-interest", "aria-label": "Interested in", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, { placeholder: "Select an option" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "agrisky", children: "AgriSky — agriculture solution" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "infrasky", children: "InfraSky — infrastructure inspection" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "geosky", children: "GeoSky — mapping & survey" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "guardsky", children: "GuardSky — aerial surveillance & early fire response" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "labs", children: "Custom UAV R&D / Labs" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "academy", children: "TorqWings Academy — drone training" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "design-studio", children: "Design Studio" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "partner", children: "Partnership / Investment" })
          ] })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "sm:col-span-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { id: "cf-message", label: "Message", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Textarea, { id: "cf-message", name: "message", rows: 4, placeholder: "Tell us briefly about your interest…" }) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "sm:col-span-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Button,
            {
              type: "submit",
              size: "lg",
              disabled: submitting,
              className: "w-full bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow",
              children: [
                submitting ? "Submitting…" : "Submit Interest",
                /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { className: "ml-1 h-4 w-4", "aria-hidden": "true" })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-3 text-xs text-muted-foreground flex items-center gap-1.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "h-3.5 w-3.5 text-accent", "aria-hidden": "true" }),
            "We typically respond within 1–2 business days."
          ] })
        ] })
      ]
    }
  );
}
function Field({
  id,
  label,
  required,
  children
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Label, { htmlFor: id, className: "text-xs uppercase tracking-wider text-muted-foreground", children: [
      label,
      required && " *"
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1.5", children })
  ] });
}
function ContactPage() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { id: "contact", className: "relative py-20 sm:py-28 bg-gradient-hero", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 grid-bg opacity-30 pointer-events-none" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mx-auto max-w-7xl px-5 lg:px-8 relative grid lg:grid-cols-12 gap-10", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "lg:col-span-5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(SectionBadge, { label: "Get In Touch" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-3xl sm:text-4xl font-bold", children: "Partner with TorqWings" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-4 text-muted-foreground", children: "Whether you are a farmer, infrastructure company, autonomous aerial platform operator, investor, institution, or industry partner — TorqWings is open to pilots, partnerships, and custom aerial intelligence projects." }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("ul", { className: "mt-8 space-y-4 text-sm", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex items-center gap-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Phone, { className: "h-4 w-4 text-primary", "aria-hidden": "true" }),
            " Hello : 9940263589"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex items-center gap-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Mail, { className: "h-4 w-4 text-primary", "aria-hidden": "true" }),
            " support@torqwings.com"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex items-center gap-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(MapPin, { className: "h-4 w-4 text-primary", "aria-hidden": "true" }),
            " India"
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { className: "lg:col-span-7", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ContactForm, {}) })
    ] })
  ] });
}
export {
  ContactPage as component
};
