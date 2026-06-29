import { j as jsxRuntimeExports, r as reactExports } from "./_libs/react.mjs";
import { O as Outlet, L as Link } from "./_libs/tanstack__react-router.mjs";
import { T as Toaster } from "./_ssr/sonner-DeNSN9-c.mjs";
import "./_libs/sonner.mjs";
import { P as Plane, X, h as Menu, i as MessageCircle } from "./_libs/lucide-react.mjs";
import "./_libs/tanstack__router-core.mjs";
import "./_libs/tanstack__history.mjs";
import "./_libs/cookie-es.mjs";
import "./_libs/seroval.mjs";
import "./_libs/seroval-plugins.mjs";
import "node:stream/web";
import "node:stream";
import "./_libs/react-dom.mjs";
import "util";
import "crypto";
import "async_hooks";
import "stream";
import "./_libs/isbot.mjs";
const NAV_LINKS = [
  { label: "Home", to: "/" },
  { label: "Solutions", to: "/solutions" },
  { label: "Industries", to: "/industries" },
  { label: "Technology", to: "/technology" },
  { label: "Design Studio", to: "/design-studio" },
  { label: "Work with us", to: "/pilots" },
  { label: "Academy", to: "/academy" },
  { label: "About", to: "/about" },
  { label: "Contact", to: "/contact" }
];
function Navbar() {
  const [open, setOpen] = reactExports.useState(false);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "fixed top-0 inset-x-0 z-50 backdrop-blur-xl bg-background/70 border-b border-border/60", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mx-auto max-w-7xl px-5 lg:px-8 h-16 flex items-center justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { to: "/", className: "flex items-center gap-2 font-display font-semibold text-lg", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "grid place-items-center h-8 w-8 rounded-lg bg-gradient-primary shadow-glow", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Plane, { className: "h-4 w-4 text-primary-foreground", "aria-hidden": "true" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "TorqWings" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("nav", { className: "hidden md:flex items-center gap-7 text-sm text-muted-foreground", children: NAV_LINKS.map((n) => /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: n.to, className: "hover:text-foreground transition-colors", children: n.label }, n.to)) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          className: "md:hidden p-2 rounded-md hover:bg-muted",
          onClick: () => setOpen(!open),
          "aria-label": "Toggle menu",
          children: open ? /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "h-5 w-5", "aria-hidden": "true" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Menu, { className: "h-5 w-5", "aria-hidden": "true" })
        }
      )
    ] }),
    open && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "md:hidden border-t border-border bg-background/95 backdrop-blur", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-5 py-4 flex flex-col gap-3", children: NAV_LINKS.map((n) => /* @__PURE__ */ jsxRuntimeExports.jsx(
      Link,
      {
        to: n.to,
        onClick: () => setOpen(false),
        className: "text-sm text-muted-foreground hover:text-foreground",
        children: n.label
      },
      n.to
    )) }) })
  ] });
}
function Footer() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("footer", { className: "border-t border-border bg-secondary", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mx-auto max-w-3xl px-5 lg:px-8 py-12 grid md:grid-cols-3 gap-8", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "md:col-span-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 font-display font-semibold text-lg", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "grid place-items-center h-8 w-8 rounded-lg bg-gradient-primary shadow-glow", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Plane, { className: "h-4 w-4 text-primary-foreground", "aria-hidden": "true" }) }),
          "TorqWings"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-3 text-sm text-muted-foreground", children: "Engineering the future of aerial intelligence." }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-xs text-muted-foreground", children: "AgriSky is a flagship service vertical of TorqWings." })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "font-display font-semibold text-sm", children: "Contact" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("ul", { className: "mt-3 space-y-2 text-sm text-muted-foreground", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "Hello : 9940263589" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "torqwings@gmail.com" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "India" })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "border-t border-border", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mx-auto max-w-3xl px-5 lg:px-8 py-6 text-xs text-muted-foreground flex flex-wrap justify-between gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
        "© ",
        (/* @__PURE__ */ new Date()).getFullYear(),
        " TorqWings. All rights reserved."
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Aerospace · Drones · AI" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/mission-hub/login", className: "hover:text-foreground transition-colors", children: "Mission Hub" })
      ] })
    ] }) })
  ] });
}
const PHONE = "919940263589";
const presets = [
  { label: "AgriSky — Drone for my farm", msg: "Hi TorqWings, I'm interested in AgriSky drone services for my farm. Please share details." },
  { label: "InfraSky — Inspection enquiry", msg: "Hi TorqWings, I'd like to discuss drone inspection (InfraSky) for our infrastructure assets." },
  { label: "GuardSky — Surveillance enquiry", msg: "Hi TorqWings, I'm interested in GuardSky aerial surveillance & early fire response." },
  { label: "GeoSky — Mapping / Survey", msg: "Hi TorqWings, I need aerial mapping / survey (GeoSky) for a site. Please get in touch." },
  { label: "Academy — Pilot training", msg: "Hi TorqWings, I'd like to enrol in TorqWings Academy drone pilot training." },
  { label: "Labs — Custom UAV / R&D", msg: "Hi TorqWings, I want to discuss a custom UAV / payload project with TorqWings Labs." },
  { label: "Other — General enquiry", msg: "Hi TorqWings, I'd like to know more about your drone services." }
];
function waLink(msg) {
  return `https://wa.me/${PHONE}?text=${encodeURIComponent(msg)}`;
}
function WhatsAppFab() {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed bottom-5 right-5 z-[60] group", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("details", { className: "relative", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("summary", { className: "list-none cursor-pointer select-none", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "grid place-items-center h-14 w-14 rounded-full bg-[#25D366] text-white shadow-soft hover:scale-105 transition-transform", children: /* @__PURE__ */ jsxRuntimeExports.jsx(MessageCircle, { className: "h-7 w-7" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "sr-only", children: "Chat on WhatsApp" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "absolute bottom-16 right-0 w-72 rounded-2xl border border-border/60 bg-card/95 backdrop-blur shadow-card p-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-2 pb-2 text-xs uppercase tracking-[0.2em] text-muted-foreground", children: "Chat on WhatsApp" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "space-y-1 max-h-80 overflow-auto", children: presets.map((p) => /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        "a",
        {
          href: waLink(p.msg),
          target: "_blank",
          rel: "noopener noreferrer",
          className: "block text-sm px-3 py-2 rounded-lg hover:bg-muted/60 text-foreground",
          children: p.label
        }
      ) }, p.label)) })
    ] })
  ] }) });
}
function PublicLayout() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-h-screen bg-background text-foreground", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Toaster, { richColors: true, position: "top-center", theme: "dark" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Navbar, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsx("main", { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Outlet, {}) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Footer, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsx(WhatsAppFab, {})
  ] });
}
export {
  PublicLayout as component
};
