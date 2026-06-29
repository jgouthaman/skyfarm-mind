import { b as QueryClient } from "../_libs/tanstack__query-core.mjs";
import { Q as QueryClientProvider } from "../_libs/tanstack__react-query.mjs";
import { c as createRouter, a as createRootRouteWithContext, u as useRouter, L as Link, O as Outlet, H as HeadContent, S as Scripts, b as createFileRoute, l as lazyRouteComponent } from "../_libs/tanstack__react-router.mjs";
import { S as redirect } from "../_libs/tanstack__router-core.mjs";
import { j as jsxRuntimeExports } from "../_libs/react.mjs";
import "../_libs/react-dom.mjs";
import "util";
import "crypto";
import "async_hooks";
import "stream";
import "node:stream";
import "../_libs/isbot.mjs";
import "../_libs/tanstack__history.mjs";
import "../_libs/cookie-es.mjs";
import "../_libs/seroval.mjs";
import "../_libs/seroval-plugins.mjs";
import "node:stream/web";
const appCss = "/assets/styles-CsaP9rGs.css";
function NotFoundComponent() {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex min-h-screen items-center justify-center bg-background px-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-md text-center", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-7xl font-bold text-foreground", children: "404" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "mt-4 text-xl font-semibold text-foreground", children: "Page not found" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-sm text-muted-foreground", children: "The page you're looking for doesn't exist or has been moved." }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-6", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      Link,
      {
        to: "/",
        className: "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90",
        children: "Go home"
      }
    ) })
  ] }) });
}
function ErrorComponent({ error, reset }) {
  console.error(error);
  const router2 = useRouter();
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex min-h-screen items-center justify-center bg-background px-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-md text-center", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-xl font-semibold tracking-tight text-foreground", children: "This page didn't load" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-sm text-muted-foreground", children: "Something went wrong on our end. You can try refreshing or head back home." }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-6 flex flex-wrap justify-center gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: () => {
            router2.invalidate();
            reset();
          },
          className: "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90",
          children: "Try again"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "a",
        {
          href: "/",
          className: "inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent",
          children: "Go home"
        }
      )
    ] })
  ] }) });
}
const Route$U = createRootRouteWithContext()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "TorqWings — Engineering the future of aerial intelligence" },
      { name: "description", content: "TorqWings builds AI-powered drone systems, custom UAVs, and aerial intelligence for agriculture, infrastructure, mapping, and surveillance." },
      { name: "author", content: "TorqWings" },
      { name: "theme-color", content: "#0a0f1c" },
      // iOS Add to Home Screen
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "TorqWings" },
      { property: "og:title", content: "TorqWings — Aerospace & Drone Intelligence" },
      { property: "og:description", content: "Custom UAV engineering and AI aerial analytics across agriculture, infrastructure, mapping, surveillance and R&D." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "TorqWings — Aerospace & Drone Intelligence" },
      { name: "twitter:description", content: "Custom UAV engineering and AI aerial analytics across agriculture, infrastructure, mapping, surveillance and R&D." }
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.json" },
      { rel: "apple-touch-icon", href: "/app-icon.png" },
      { rel: "icon", href: "/app-icon.png", type: "image/png" }
    ]
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent
});
function RootShell({ children }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("html", { lang: "en", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("head", { children: /* @__PURE__ */ jsxRuntimeExports.jsx(HeadContent, {}) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("body", { children: [
      children,
      /* @__PURE__ */ jsxRuntimeExports.jsx(Scripts, {})
    ] })
  ] });
}
function RootComponent() {
  const { queryClient } = Route$U.useRouteContext();
  return /* @__PURE__ */ jsxRuntimeExports.jsx(QueryClientProvider, { client: queryClient, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Outlet, {}) });
}
const BASE_URL = "https://torqwings.com";
const Route$T = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/field", changefreq: "monthly", priority: "0.6" },
          { path: "/pilot/login", changefreq: "monthly", priority: "0.5" },
          { path: "/mission-hub/login", changefreq: "monthly", priority: "0.5" },
          { path: "/mission-hub/dashboard", changefreq: "monthly", priority: "0.4" },
          { path: "/mission-hub/torqwings-design-studio", changefreq: "monthly", priority: "0.6" }
        ];
        const urls = entries.map(
          (e) => [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`
          ].filter(Boolean).join("\n")
        );
        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`
        ].join("\n");
        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600"
          }
        });
      }
    }
  }
});
const $$splitComponentImporter$S = () => import("./pilot-C_mS6A3J.mjs");
const Route$S = createFileRoute("/pilot")({
  head: () => ({
    meta: [{
      title: "AgriSky Pilot"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$S, "component")
});
const $$splitComponentImporter$R = () => import("./mission-hub-D5jJ7NmB.mjs");
const Route$R = createFileRoute("/mission-hub")({
  ssr: false,
  component: lazyRouteComponent($$splitComponentImporter$R, "component")
});
const $$splitComponentImporter$Q = () => import("./field-CcO9cRxU.mjs");
const Route$Q = createFileRoute("/field")({
  head: () => ({
    meta: [{
      title: "AgriSky Field — Pilot"
    }, {
      name: "description",
      content: "AgriSky Field for pilots. View missions, capture GPS-tagged farm photos, and sync data to the Control Center."
    }, {
      property: "og:title",
      content: "AgriSky Field — Pilot"
    }, {
      property: "og:description",
      content: "AgriSky Field for pilots. View missions, capture GPS-tagged farm photos, and sync data to the Control Center."
    }, {
      property: "og:url",
      content: "/field"
    }],
    links: [{
      rel: "canonical",
      href: "/field"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$Q, "component")
});
const $$splitComponentImporter$P = () => import("../_layout-CXFeFOvL.mjs");
const Route$P = createFileRoute("/_layout")({
  component: lazyRouteComponent($$splitComponentImporter$P, "component")
});
const $$splitComponentImporter$O = () => import("./pilot.index-BTU5dmpx.mjs");
const Route$O = createFileRoute("/pilot/")({
  beforeLoad: () => {
    throw redirect({
      to: "/field"
    });
  },
  component: lazyRouteComponent($$splitComponentImporter$O, "component")
});
const heroImg = "/assets/torqwings-hero-BsLi94d3.jpg";
const $$splitComponentImporter$N = () => import("../_layout.index-CSp5Jyae.mjs");
const Route$N = createFileRoute("/_layout/")({
  head: () => ({
    meta: [{
      property: "og:title",
      content: "TorqWings — Aerospace & Drone Intelligence"
    }, {
      property: "og:description",
      content: "Custom UAV engineering and AI aerial analytics across agriculture, infrastructure, mapping, surveillance and R&D."
    }, {
      property: "og:image",
      content: heroImg
    }, {
      property: "og:type",
      content: "website"
    }, {
      property: "og:url",
      content: "/"
    }],
    links: [{
      rel: "canonical",
      href: "/"
    }, {
      rel: "preload",
      as: "image",
      href: heroImg,
      fetchpriority: "high"
    }],
    scripts: [{
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "TorqWings",
        url: "https://torqwings.com",
        logo: "https://torqwings.com/app-icon.png",
        description: "TorqWings builds AI-powered drone systems, custom UAVs, and aerial intelligence solutions."
      })
    }, {
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Service",
        name: "AgriSky",
        serviceType: "Agriculture Drone Intelligence",
        provider: {
          "@type": "Organization",
          name: "TorqWings"
        },
        areaServed: {
          "@type": "AdministrativeArea",
          name: "Tamil Nadu, India"
        },
        description: "Drone agriculture services in Tamil Nadu — crop health monitoring, NDVI mapping, irrigation insights, and precision farming for farms, FPOs and SHGs.",
        keywords: "drone agriculture Tamil Nadu, AgriSky, crop health drone, precision farming Chennai, agri drone services India"
      })
    }, {
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Service",
        name: "GuardSky",
        serviceType: "Aerial Surveillance & Early Fire Response",
        provider: {
          "@type": "Organization",
          name: "TorqWings"
        },
        areaServed: {
          "@type": "Country",
          name: "India"
        },
        description: "Drone-based surveillance, smoke and fire detection, and rapid first-response payload deployment for industrial sites, campuses and remote facilities.",
        keywords: "aerial surveillance drone India, fire detection drone, GuardSky, perimeter security UAV"
      })
    }, {
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Service",
        name: "InfraSky",
        serviceType: "Infrastructure & Industrial Drone Inspection",
        provider: {
          "@type": "Organization",
          name: "TorqWings"
        },
        areaServed: {
          "@type": "AdministrativeArea",
          name: "Tamil Nadu, India"
        },
        description: "UAV inspection in Chennai and across India for bridges, telecom towers, solar farms, roads and industrial assets — high-resolution imagery with AI defect detection.",
        keywords: "UAV inspection Chennai, drone inspection Tamil Nadu, InfraSky, solar farm drone inspection, telecom tower drone survey, bridge inspection drone India"
      })
    }, {
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "EducationalOccupationalProgram",
        name: "TorqWings Academy",
        provider: {
          "@type": "Organization",
          name: "TorqWings"
        },
        occupationalCategory: "Drone Pilot",
        areaServed: {
          "@type": "AdministrativeArea",
          name: "Tamil Nadu, India"
        },
        description: "Drone pilot training and certification support in Tamil Nadu — agri-drone operations, mapping workflows, mission planning and safety procedures for students, farmers, SHGs and FPOs.",
        keywords: "drone pilot training Tamil Nadu, drone certification Chennai, agri drone training India, TorqWings Academy"
      })
    }, {
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        name: "TorqWings",
        telephone: "+91 99402 63589",
        address: {
          "@type": "PostalAddress",
          addressCountry: "IN",
          addressLocality: "India"
        },
        url: "https://torqwings.com",
        description: "TorqWings builds AI-powered drone systems, custom UAVs, and aerial intelligence solutions."
      })
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$N, "component")
});
const $$splitComponentImporter$M = () => import("./pilot.tracking-CzxkxnF8.mjs");
const Route$M = createFileRoute("/pilot/tracking")({
  head: () => ({
    meta: [{
      title: "AgriSky Pilot — Live Tracking"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$M, "component")
});
const $$splitComponentImporter$L = () => import("./pilot.sync-DEsre-X4.mjs");
const Route$L = createFileRoute("/pilot/sync")({
  head: () => ({
    meta: [{
      title: "AgriSky Pilot — Sync Center"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$L, "component")
});
const $$splitComponentImporter$K = () => import("./pilot.profile-CWLpJGAH.mjs");
const Route$K = createFileRoute("/pilot/profile")({
  head: () => ({
    meta: [{
      title: "AgriSky Pilot — Profile"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$K, "component")
});
const $$splitComponentImporter$J = () => import("./pilot.login-C8lu9l27.mjs");
const Route$J = createFileRoute("/pilot/login")({
  head: () => ({
    meta: [{
      title: "AgriSky Pilot — Login"
    }, {
      name: "description",
      content: "AgriSky pilot login. Verify your mobile to access farm missions, aerial surveys, and field operations."
    }, {
      property: "og:title",
      content: "AgriSky Pilot — Login"
    }, {
      property: "og:description",
      content: "AgriSky pilot login. Verify your mobile to access farm missions, aerial surveys, and field operations."
    }, {
      property: "og:url",
      content: "/pilot/login"
    }],
    links: [{
      rel: "canonical",
      href: "/pilot/login"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$J, "component")
});
const $$splitComponentImporter$I = () => import("./mission-hub.waitlist-CummSoO7.mjs");
const Route$I = createFileRoute("/mission-hub/waitlist")({
  component: lazyRouteComponent($$splitComponentImporter$I, "component")
});
const $$splitComponentImporter$H = () => import("./mission-hub.users-AvdDnYxM.mjs");
const Route$H = createFileRoute("/mission-hub/users")({
  component: lazyRouteComponent($$splitComponentImporter$H, "component")
});
const $$splitComponentImporter$G = () => import("./mission-hub.twbc-drone-similarity-search-4mvZSm8L.mjs");
const Route$G = createFileRoute("/mission-hub/twbc-drone-similarity-search")({
  component: lazyRouteComponent($$splitComponentImporter$G, "component")
});
const $$splitComponentImporter$F = () => import("./mission-hub.twbc-drone-rule-engine-DwlVa17c.mjs");
const Route$F = createFileRoute("/mission-hub/twbc-drone-rule-engine")({
  component: lazyRouteComponent($$splitComponentImporter$F, "component")
});
const $$splitComponentImporter$E = () => import("./mission-hub.twbc-drone-reference-designs-BbQMfOcP.mjs");
const Route$E = createFileRoute("/mission-hub/twbc-drone-reference-designs")({
  component: lazyRouteComponent($$splitComponentImporter$E, "component")
});
const $$splitComponentImporter$D = () => import("./mission-hub.twbc-drone-reasoning-api-X1pEJzNm.mjs");
const Route$D = createFileRoute("/mission-hub/twbc-drone-reasoning-api")({
  component: lazyRouteComponent($$splitComponentImporter$D, "component")
});
const $$splitComponentImporter$C = () => import("./mission-hub.twbc-drone-proven-designs-BCfFivcr.mjs");
const Route$C = createFileRoute("/mission-hub/twbc-drone-proven-designs")({
  component: lazyRouteComponent($$splitComponentImporter$C, "component")
});
const $$splitComponentImporter$B = () => import("./mission-hub.twbc-drone-feedback-CibwCHbi.mjs");
const Route$B = createFileRoute("/mission-hub/twbc-drone-feedback")({
  component: lazyRouteComponent($$splitComponentImporter$B, "component")
});
const $$splitComponentImporter$A = () => import("./mission-hub.twbc-drone-design-score-BTrVZb4l.mjs");
const Route$A = createFileRoute("/mission-hub/twbc-drone-design-score")({
  component: lazyRouteComponent($$splitComponentImporter$A, "component")
});
const $$splitComponentImporter$z = () => import("./mission-hub.twbc-drone-design-rules-CUR1E2sb.mjs");
const Route$z = createFileRoute("/mission-hub/twbc-drone-design-rules")({
  component: lazyRouteComponent($$splitComponentImporter$z, "component")
});
const $$splitComponentImporter$y = () => import("./mission-hub.twbc-drone-design-rule-dxaWjvzl.mjs");
const Route$y = createFileRoute("/mission-hub/twbc-drone-design-rule")({
  component: lazyRouteComponent($$splitComponentImporter$y, "component")
});
const $$splitComponentImporter$x = () => import("./mission-hub.twbc-drone-components-library-kXVtRIBp.mjs");
const Route$x = createFileRoute("/mission-hub/twbc-drone-components-library")({
  component: lazyRouteComponent($$splitComponentImporter$x, "component")
});
const $$splitComponentImporter$w = () => import("./mission-hub.twbc-drone-approval-DjG6dACZ.mjs");
const Route$w = createFileRoute("/mission-hub/twbc-drone-approval")({
  component: lazyRouteComponent($$splitComponentImporter$w, "component")
});
const $$splitComponentImporter$v = () => import("./mission-hub.torqwings-design-studio-C5JPLT6H.mjs");
const Route$v = createFileRoute("/mission-hub/torqwings-design-studio")({
  ssr: false,
  head: () => ({
    meta: [{
      title: "TorqWings Design Studio"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$v, "component")
});
const $$splitComponentImporter$u = () => import("./mission-hub.settings-Cz8ejb15.mjs");
const Route$u = createFileRoute("/mission-hub/settings")({
  component: lazyRouteComponent($$splitComponentImporter$u, "component")
});
const $$splitComponentImporter$t = () => import("./mission-hub.reset-password-CvOz7bvc.mjs");
const Route$t = createFileRoute("/mission-hub/reset-password")({
  component: lazyRouteComponent($$splitComponentImporter$t, "component")
});
const $$splitComponentImporter$s = () => import("./mission-hub.login-DgerOs_i.mjs");
const Route$s = createFileRoute("/mission-hub/login")({
  component: lazyRouteComponent($$splitComponentImporter$s, "component")
});
const $$splitComponentImporter$r = () => import("./mission-hub.knowledge-uav-C-I-jRy4.mjs");
const Route$r = createFileRoute("/mission-hub/knowledge-uav")({
  component: lazyRouteComponent($$splitComponentImporter$r, "component")
});
const $$splitComponentImporter$q = () => import("./mission-hub.design-studio-CnPbExOu.mjs");
const Route$q = createFileRoute("/mission-hub/design-studio")({
  component: lazyRouteComponent($$splitComponentImporter$q, "component")
});
const $$splitComponentImporter$p = () => import("./mission-hub.dashboard-Cz_MKbU5.mjs");
const Route$p = createFileRoute("/mission-hub/dashboard")({
  component: lazyRouteComponent($$splitComponentImporter$p, "component")
});
const $$splitComponentImporter$o = () => import("./mission-hub.contacts-5ko1BisL.mjs");
const Route$o = createFileRoute("/mission-hub/contacts")({
  validateSearch: (s) => ({
    vertical: s.vertical || ""
  }),
  component: lazyRouteComponent($$splitComponentImporter$o, "component")
});
const $$splitComponentImporter$n = () => import("../_layout.technology-DxJRcJFs.mjs");
const Route$n = createFileRoute("/_layout/technology")({
  component: lazyRouteComponent($$splitComponentImporter$n, "component")
});
const $$splitComponentImporter$m = () => import("../_layout.solutions-DoC0EgTB.mjs");
const Route$m = createFileRoute("/_layout/solutions")({
  component: lazyRouteComponent($$splitComponentImporter$m, "component")
});
const $$splitComponentImporter$l = () => import("../_layout.pilots-DCLHWR_b.mjs");
const Route$l = createFileRoute("/_layout/pilots")({
  component: lazyRouteComponent($$splitComponentImporter$l, "component")
});
const $$splitComponentImporter$k = () => import("../_layout.industries-CxVZsJiU.mjs");
const Route$k = createFileRoute("/_layout/industries")({
  component: lazyRouteComponent($$splitComponentImporter$k, "component")
});
const $$splitComponentImporter$j = () => import("../_layout.guardsky-t73hMkbt.mjs");
const Route$j = createFileRoute("/_layout/guardsky")({
  component: lazyRouteComponent($$splitComponentImporter$j, "component")
});
const $$splitComponentImporter$i = () => import("../_layout.design-studio-DB-1FLYn.mjs");
const Route$i = createFileRoute("/_layout/design-studio")({
  component: lazyRouteComponent($$splitComponentImporter$i, "component")
});
const $$splitComponentImporter$h = () => import("../_layout.contact-BzZJHvB8.mjs");
const Route$h = createFileRoute("/_layout/contact")({
  component: lazyRouteComponent($$splitComponentImporter$h, "component")
});
const $$splitComponentImporter$g = () => import("../_layout.agrisky-_dLFtQ8x.mjs");
const Route$g = createFileRoute("/_layout/agrisky")({
  component: lazyRouteComponent($$splitComponentImporter$g, "component")
});
const $$splitComponentImporter$f = () => import("../_layout.academy-GAXD8g-6.mjs");
const Route$f = createFileRoute("/_layout/academy")({
  component: lazyRouteComponent($$splitComponentImporter$f, "component")
});
const $$splitComponentImporter$e = () => import("../_layout.about-CSXO0zC8.mjs");
const Route$e = createFileRoute("/_layout/about")({
  head: () => ({
    meta: [{
      title: "About TorqWings — Built by engineers. Flown for India."
    }, {
      name: "description",
      content: "TorqWings is a Chennai-based aerospace startup building AI-powered drone systems for Indian agriculture, infrastructure, and defence. Founded by 5 aerospace engineers."
    }, {
      property: "og:title",
      content: "About TorqWings — Built by engineers. Flown for India."
    }, {
      property: "og:description",
      content: "Five aerospace engineers building India's drone intelligence platform from Chennai's aerospace corridor."
    }, {
      property: "og:type",
      content: "website"
    }, {
      property: "og:url",
      content: "/about"
    }],
    links: [{
      rel: "canonical",
      href: "/about"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$e, "component")
});
const $$splitComponentImporter$d = () => import("./pilot.missions.index-CyIqaMXS.mjs");
const Route$d = createFileRoute("/pilot/missions/")({
  head: () => ({
    meta: [{
      title: "AgriSky Pilot — Missions"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$d, "component")
});
const $$splitComponentImporter$c = () => import("./mission-hub.torqwings-design-studio.index-CQRXA8KQ.mjs");
const Route$c = createFileRoute("/mission-hub/torqwings-design-studio/")({
  component: lazyRouteComponent($$splitComponentImporter$c, "component")
});
const $$splitComponentImporter$b = () => import("./pilot.missions._id-gMMMe3QL.mjs");
const Route$b = createFileRoute("/pilot/missions/$id")({
  head: () => ({
    meta: [{
      title: "AgriSky Pilot — Mission"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$b, "component")
});
const $$splitComponentImporter$a = () => import("./mission-hub.verticals._vertical-Ba2xmuLy.mjs");
const Route$a = createFileRoute("/mission-hub/verticals/$vertical")({
  component: lazyRouteComponent($$splitComponentImporter$a, "component")
});
const $$splitComponentImporter$9 = () => import("./mission-hub.torqwings-design-studio.simulation-C8iNxfDL.mjs");
const Route$9 = createFileRoute("/mission-hub/torqwings-design-studio/simulation")({
  component: lazyRouteComponent($$splitComponentImporter$9, "component"),
  ssr: false
});
const $$splitComponentImporter$8 = () => import("./mission-hub.torqwings-design-studio.requirements-B25jeamI.mjs");
const Route$8 = createFileRoute("/mission-hub/torqwings-design-studio/requirements")({
  component: lazyRouteComponent($$splitComponentImporter$8, "component")
});
const $$splitComponentImporter$7 = () => import("./mission-hub.torqwings-design-studio.report-BaZo6E1D.mjs");
const Route$7 = createFileRoute("/mission-hub/torqwings-design-studio/report")({
  component: lazyRouteComponent($$splitComponentImporter$7, "component")
});
const $$splitComponentImporter$6 = () => import("./mission-hub.torqwings-design-studio.new-2tRXE8uf.mjs");
const Route$6 = createFileRoute("/mission-hub/torqwings-design-studio/new")({
  component: lazyRouteComponent($$splitComponentImporter$6, "component"),
  ssr: false
});
const $$splitComponentImporter$5 = () => import("./mission-hub.torqwings-design-studio.history-TxaV-kpH.mjs");
const Route$5 = createFileRoute("/mission-hub/torqwings-design-studio/history")({
  component: lazyRouteComponent($$splitComponentImporter$5, "component")
});
const $$splitComponentImporter$4 = () => import("./mission-hub.torqwings-design-studio.design-rule-BETNj-Th.mjs");
const Route$4 = createFileRoute("/mission-hub/torqwings-design-studio/design-rule")({
  component: lazyRouteComponent($$splitComponentImporter$4, "component")
});
const $$splitComponentImporter$3 = () => import("./mission-hub.torqwings-design-studio.design-BAcdI7A2.mjs");
const Route$3 = createFileRoute("/mission-hub/torqwings-design-studio/design")({
  component: lazyRouteComponent($$splitComponentImporter$3, "component")
});
const $$splitComponentImporter$2 = () => import("./mission-hub.torqwings-design-studio.components-xLWjE48z.mjs");
const Route$2 = createFileRoute("/mission-hub/torqwings-design-studio/components")({
  component: lazyRouteComponent($$splitComponentImporter$2, "component")
});
const $$splitComponentImporter$1 = () => import("./mission-hub.torqwings-design-studio.compliance-CrIvjtgv.mjs");
const Route$1 = createFileRoute("/mission-hub/torqwings-design-studio/compliance")({
  component: lazyRouteComponent($$splitComponentImporter$1, "component")
});
const $$splitComponentImporter = () => import("./mission-hub.torqwings-design-studio.advisor-ChE8IS8G.mjs");
const Route = createFileRoute("/mission-hub/torqwings-design-studio/advisor")({
  component: lazyRouteComponent($$splitComponentImporter, "component")
});
const SitemapDotxmlRoute = Route$T.update({
  id: "/sitemap.xml",
  path: "/sitemap.xml",
  getParentRoute: () => Route$U
});
const PilotRoute = Route$S.update({
  id: "/pilot",
  path: "/pilot",
  getParentRoute: () => Route$U
});
const MissionHubRoute = Route$R.update({
  id: "/mission-hub",
  path: "/mission-hub",
  getParentRoute: () => Route$U
});
const FieldRoute = Route$Q.update({
  id: "/field",
  path: "/field",
  getParentRoute: () => Route$U
});
const LayoutRoute = Route$P.update({
  id: "/_layout",
  getParentRoute: () => Route$U
});
const PilotIndexRoute = Route$O.update({
  id: "/",
  path: "/",
  getParentRoute: () => PilotRoute
});
const LayoutIndexRoute = Route$N.update({
  id: "/",
  path: "/",
  getParentRoute: () => LayoutRoute
});
const PilotTrackingRoute = Route$M.update({
  id: "/tracking",
  path: "/tracking",
  getParentRoute: () => PilotRoute
});
const PilotSyncRoute = Route$L.update({
  id: "/sync",
  path: "/sync",
  getParentRoute: () => PilotRoute
});
const PilotProfileRoute = Route$K.update({
  id: "/profile",
  path: "/profile",
  getParentRoute: () => PilotRoute
});
const PilotLoginRoute = Route$J.update({
  id: "/login",
  path: "/login",
  getParentRoute: () => PilotRoute
});
const MissionHubWaitlistRoute = Route$I.update({
  id: "/waitlist",
  path: "/waitlist",
  getParentRoute: () => MissionHubRoute
});
const MissionHubUsersRoute = Route$H.update({
  id: "/users",
  path: "/users",
  getParentRoute: () => MissionHubRoute
});
const MissionHubTwbcDroneSimilaritySearchRoute = Route$G.update({
  id: "/twbc-drone-similarity-search",
  path: "/twbc-drone-similarity-search",
  getParentRoute: () => MissionHubRoute
});
const MissionHubTwbcDroneRuleEngineRoute = Route$F.update({
  id: "/twbc-drone-rule-engine",
  path: "/twbc-drone-rule-engine",
  getParentRoute: () => MissionHubRoute
});
const MissionHubTwbcDroneReferenceDesignsRoute = Route$E.update({
  id: "/twbc-drone-reference-designs",
  path: "/twbc-drone-reference-designs",
  getParentRoute: () => MissionHubRoute
});
const MissionHubTwbcDroneReasoningApiRoute = Route$D.update({
  id: "/twbc-drone-reasoning-api",
  path: "/twbc-drone-reasoning-api",
  getParentRoute: () => MissionHubRoute
});
const MissionHubTwbcDroneProvenDesignsRoute = Route$C.update({
  id: "/twbc-drone-proven-designs",
  path: "/twbc-drone-proven-designs",
  getParentRoute: () => MissionHubRoute
});
const MissionHubTwbcDroneFeedbackRoute = Route$B.update({
  id: "/twbc-drone-feedback",
  path: "/twbc-drone-feedback",
  getParentRoute: () => MissionHubRoute
});
const MissionHubTwbcDroneDesignScoreRoute = Route$A.update({
  id: "/twbc-drone-design-score",
  path: "/twbc-drone-design-score",
  getParentRoute: () => MissionHubRoute
});
const MissionHubTwbcDroneDesignRulesRoute = Route$z.update({
  id: "/twbc-drone-design-rules",
  path: "/twbc-drone-design-rules",
  getParentRoute: () => MissionHubRoute
});
const MissionHubTwbcDroneDesignRuleRoute = Route$y.update({
  id: "/twbc-drone-design-rule",
  path: "/twbc-drone-design-rule",
  getParentRoute: () => MissionHubRoute
});
const MissionHubTwbcDroneComponentsLibraryRoute = Route$x.update({
  id: "/twbc-drone-components-library",
  path: "/twbc-drone-components-library",
  getParentRoute: () => MissionHubRoute
});
const MissionHubTwbcDroneApprovalRoute = Route$w.update({
  id: "/twbc-drone-approval",
  path: "/twbc-drone-approval",
  getParentRoute: () => MissionHubRoute
});
const MissionHubTorqwingsDesignStudioRoute = Route$v.update({
  id: "/torqwings-design-studio",
  path: "/torqwings-design-studio",
  getParentRoute: () => MissionHubRoute
});
const MissionHubSettingsRoute = Route$u.update({
  id: "/settings",
  path: "/settings",
  getParentRoute: () => MissionHubRoute
});
const MissionHubResetPasswordRoute = Route$t.update({
  id: "/reset-password",
  path: "/reset-password",
  getParentRoute: () => MissionHubRoute
});
const MissionHubLoginRoute = Route$s.update({
  id: "/login",
  path: "/login",
  getParentRoute: () => MissionHubRoute
});
const MissionHubKnowledgeUavRoute = Route$r.update({
  id: "/knowledge-uav",
  path: "/knowledge-uav",
  getParentRoute: () => MissionHubRoute
});
const MissionHubDesignStudioRoute = Route$q.update({
  id: "/design-studio",
  path: "/design-studio",
  getParentRoute: () => MissionHubRoute
});
const MissionHubDashboardRoute = Route$p.update({
  id: "/dashboard",
  path: "/dashboard",
  getParentRoute: () => MissionHubRoute
});
const MissionHubContactsRoute = Route$o.update({
  id: "/contacts",
  path: "/contacts",
  getParentRoute: () => MissionHubRoute
});
const LayoutTechnologyRoute = Route$n.update({
  id: "/technology",
  path: "/technology",
  getParentRoute: () => LayoutRoute
});
const LayoutSolutionsRoute = Route$m.update({
  id: "/solutions",
  path: "/solutions",
  getParentRoute: () => LayoutRoute
});
const LayoutPilotsRoute = Route$l.update({
  id: "/pilots",
  path: "/pilots",
  getParentRoute: () => LayoutRoute
});
const LayoutIndustriesRoute = Route$k.update({
  id: "/industries",
  path: "/industries",
  getParentRoute: () => LayoutRoute
});
const LayoutGuardskyRoute = Route$j.update({
  id: "/guardsky",
  path: "/guardsky",
  getParentRoute: () => LayoutRoute
});
const LayoutDesignStudioRoute = Route$i.update({
  id: "/design-studio",
  path: "/design-studio",
  getParentRoute: () => LayoutRoute
});
const LayoutContactRoute = Route$h.update({
  id: "/contact",
  path: "/contact",
  getParentRoute: () => LayoutRoute
});
const LayoutAgriskyRoute = Route$g.update({
  id: "/agrisky",
  path: "/agrisky",
  getParentRoute: () => LayoutRoute
});
const LayoutAcademyRoute = Route$f.update({
  id: "/academy",
  path: "/academy",
  getParentRoute: () => LayoutRoute
});
const LayoutAboutRoute = Route$e.update({
  id: "/about",
  path: "/about",
  getParentRoute: () => LayoutRoute
});
const PilotMissionsIndexRoute = Route$d.update({
  id: "/missions/",
  path: "/missions/",
  getParentRoute: () => PilotRoute
});
const MissionHubTorqwingsDesignStudioIndexRoute = Route$c.update({
  id: "/",
  path: "/",
  getParentRoute: () => MissionHubTorqwingsDesignStudioRoute
});
const PilotMissionsIdRoute = Route$b.update({
  id: "/missions/$id",
  path: "/missions/$id",
  getParentRoute: () => PilotRoute
});
const MissionHubVerticalsVerticalRoute = Route$a.update({
  id: "/verticals/$vertical",
  path: "/verticals/$vertical",
  getParentRoute: () => MissionHubRoute
});
const MissionHubTorqwingsDesignStudioSimulationRoute = Route$9.update({
  id: "/simulation",
  path: "/simulation",
  getParentRoute: () => MissionHubTorqwingsDesignStudioRoute
});
const MissionHubTorqwingsDesignStudioRequirementsRoute = Route$8.update({
  id: "/requirements",
  path: "/requirements",
  getParentRoute: () => MissionHubTorqwingsDesignStudioRoute
});
const MissionHubTorqwingsDesignStudioReportRoute = Route$7.update({
  id: "/report",
  path: "/report",
  getParentRoute: () => MissionHubTorqwingsDesignStudioRoute
});
const MissionHubTorqwingsDesignStudioNewRoute = Route$6.update({
  id: "/new",
  path: "/new",
  getParentRoute: () => MissionHubTorqwingsDesignStudioRoute
});
const MissionHubTorqwingsDesignStudioHistoryRoute = Route$5.update({
  id: "/history",
  path: "/history",
  getParentRoute: () => MissionHubTorqwingsDesignStudioRoute
});
const MissionHubTorqwingsDesignStudioDesignRuleRoute = Route$4.update({
  id: "/design-rule",
  path: "/design-rule",
  getParentRoute: () => MissionHubTorqwingsDesignStudioRoute
});
const MissionHubTorqwingsDesignStudioDesignRoute = Route$3.update({
  id: "/design",
  path: "/design",
  getParentRoute: () => MissionHubTorqwingsDesignStudioRoute
});
const MissionHubTorqwingsDesignStudioComponentsRoute = Route$2.update({
  id: "/components",
  path: "/components",
  getParentRoute: () => MissionHubTorqwingsDesignStudioRoute
});
const MissionHubTorqwingsDesignStudioComplianceRoute = Route$1.update({
  id: "/compliance",
  path: "/compliance",
  getParentRoute: () => MissionHubTorqwingsDesignStudioRoute
});
const MissionHubTorqwingsDesignStudioAdvisorRoute = Route.update({
  id: "/advisor",
  path: "/advisor",
  getParentRoute: () => MissionHubTorqwingsDesignStudioRoute
});
const LayoutRouteChildren = {
  LayoutAboutRoute,
  LayoutAcademyRoute,
  LayoutAgriskyRoute,
  LayoutContactRoute,
  LayoutDesignStudioRoute,
  LayoutGuardskyRoute,
  LayoutIndustriesRoute,
  LayoutPilotsRoute,
  LayoutSolutionsRoute,
  LayoutTechnologyRoute,
  LayoutIndexRoute
};
const LayoutRouteWithChildren = LayoutRoute._addFileChildren(LayoutRouteChildren);
const MissionHubTorqwingsDesignStudioRouteChildren = {
  MissionHubTorqwingsDesignStudioAdvisorRoute,
  MissionHubTorqwingsDesignStudioComplianceRoute,
  MissionHubTorqwingsDesignStudioComponentsRoute,
  MissionHubTorqwingsDesignStudioDesignRoute,
  MissionHubTorqwingsDesignStudioDesignRuleRoute,
  MissionHubTorqwingsDesignStudioHistoryRoute,
  MissionHubTorqwingsDesignStudioNewRoute,
  MissionHubTorqwingsDesignStudioReportRoute,
  MissionHubTorqwingsDesignStudioRequirementsRoute,
  MissionHubTorqwingsDesignStudioSimulationRoute,
  MissionHubTorqwingsDesignStudioIndexRoute
};
const MissionHubTorqwingsDesignStudioRouteWithChildren = MissionHubTorqwingsDesignStudioRoute._addFileChildren(
  MissionHubTorqwingsDesignStudioRouteChildren
);
const MissionHubRouteChildren = {
  MissionHubContactsRoute,
  MissionHubDashboardRoute,
  MissionHubDesignStudioRoute,
  MissionHubKnowledgeUavRoute,
  MissionHubLoginRoute,
  MissionHubResetPasswordRoute,
  MissionHubSettingsRoute,
  MissionHubTorqwingsDesignStudioRoute: MissionHubTorqwingsDesignStudioRouteWithChildren,
  MissionHubTwbcDroneApprovalRoute,
  MissionHubTwbcDroneComponentsLibraryRoute,
  MissionHubTwbcDroneDesignRuleRoute,
  MissionHubTwbcDroneDesignRulesRoute,
  MissionHubTwbcDroneDesignScoreRoute,
  MissionHubTwbcDroneFeedbackRoute,
  MissionHubTwbcDroneProvenDesignsRoute,
  MissionHubTwbcDroneReasoningApiRoute,
  MissionHubTwbcDroneReferenceDesignsRoute,
  MissionHubTwbcDroneRuleEngineRoute,
  MissionHubTwbcDroneSimilaritySearchRoute,
  MissionHubUsersRoute,
  MissionHubWaitlistRoute,
  MissionHubVerticalsVerticalRoute
};
const MissionHubRouteWithChildren = MissionHubRoute._addFileChildren(
  MissionHubRouteChildren
);
const PilotRouteChildren = {
  PilotLoginRoute,
  PilotProfileRoute,
  PilotSyncRoute,
  PilotTrackingRoute,
  PilotIndexRoute,
  PilotMissionsIdRoute,
  PilotMissionsIndexRoute
};
const PilotRouteWithChildren = PilotRoute._addFileChildren(PilotRouteChildren);
const rootRouteChildren = {
  LayoutRoute: LayoutRouteWithChildren,
  FieldRoute,
  MissionHubRoute: MissionHubRouteWithChildren,
  PilotRoute: PilotRouteWithChildren,
  SitemapDotxmlRoute
};
const routeTree = Route$U._addFileChildren(rootRouteChildren)._addFileTypes();
const getRouter = () => {
  const queryClient = new QueryClient();
  const router2 = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0
  });
  return router2;
};
const router = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  getRouter
}, Symbol.toStringTag, { value: "Module" }));
export {
  Route$a as R,
  heroImg as h,
  router as r
};
