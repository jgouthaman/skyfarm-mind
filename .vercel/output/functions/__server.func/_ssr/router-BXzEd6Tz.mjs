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
const appCss = "/assets/styles-DPbUaCUG.css";
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
const Route$W = createRootRouteWithContext()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "google-site-verification", content: "IL9yaYUX7jYk9iy6Z-N0xSWw6F_q86yJaKMUIKCSNBo" },
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
  const { queryClient } = Route$W.useRouteContext();
  return /* @__PURE__ */ jsxRuntimeExports.jsx(QueryClientProvider, { client: queryClient, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Outlet, {}) });
}
const BASE_URL = "https://torqwings.com";
const Route$V = createFileRoute("/sitemap.xml")({
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
const $$splitComponentImporter$U = () => import("./pilot-C_mS6A3J.mjs");
const Route$U = createFileRoute("/pilot")({
  head: () => ({
    meta: [{
      title: "AgriSky Pilot"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$U, "component")
});
const $$splitComponentImporter$T = () => import("./mission-hub-D5jJ7NmB.mjs");
const Route$T = createFileRoute("/mission-hub")({
  ssr: false,
  component: lazyRouteComponent($$splitComponentImporter$T, "component")
});
const $$splitComponentImporter$S = () => import("./field-CcO9cRxU.mjs");
const Route$S = createFileRoute("/field")({
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
  component: lazyRouteComponent($$splitComponentImporter$S, "component")
});
const $$splitComponentImporter$R = () => import("../_layout-BPjGZY8S.mjs");
const Route$R = createFileRoute("/_layout")({
  component: lazyRouteComponent($$splitComponentImporter$R, "component")
});
const $$splitComponentImporter$Q = () => import("./pilot.index-BTU5dmpx.mjs");
const Route$Q = createFileRoute("/pilot/")({
  beforeLoad: () => {
    throw redirect({
      to: "/field"
    });
  },
  component: lazyRouteComponent($$splitComponentImporter$Q, "component")
});
const heroImg = "/assets/torqwings-hero-BsLi94d3.jpg";
const $$splitComponentImporter$P = () => import("../_layout.index-CZLwn-DF.mjs");
const Route$P = createFileRoute("/_layout/")({
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
  component: lazyRouteComponent($$splitComponentImporter$P, "component")
});
const $$splitComponentImporter$O = () => import("./pilot.tracking-CzxkxnF8.mjs");
const Route$O = createFileRoute("/pilot/tracking")({
  head: () => ({
    meta: [{
      title: "AgriSky Pilot — Live Tracking"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$O, "component")
});
const $$splitComponentImporter$N = () => import("./pilot.sync-DEsre-X4.mjs");
const Route$N = createFileRoute("/pilot/sync")({
  head: () => ({
    meta: [{
      title: "AgriSky Pilot — Sync Center"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$N, "component")
});
const $$splitComponentImporter$M = () => import("./pilot.profile-CWLpJGAH.mjs");
const Route$M = createFileRoute("/pilot/profile")({
  head: () => ({
    meta: [{
      title: "AgriSky Pilot — Profile"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$M, "component")
});
const $$splitComponentImporter$L = () => import("./pilot.login-C8lu9l27.mjs");
const Route$L = createFileRoute("/pilot/login")({
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
  component: lazyRouteComponent($$splitComponentImporter$L, "component")
});
const $$splitComponentImporter$K = () => import("./mission-hub.waitlist-CummSoO7.mjs");
const Route$K = createFileRoute("/mission-hub/waitlist")({
  component: lazyRouteComponent($$splitComponentImporter$K, "component")
});
const $$splitComponentImporter$J = () => import("./mission-hub.users-oi_YkNRa.mjs");
const Route$J = createFileRoute("/mission-hub/users")({
  component: lazyRouteComponent($$splitComponentImporter$J, "component")
});
const $$splitComponentImporter$I = () => import("./mission-hub.twbc-drone-similarity-search-4mvZSm8L.mjs");
const Route$I = createFileRoute("/mission-hub/twbc-drone-similarity-search")({
  component: lazyRouteComponent($$splitComponentImporter$I, "component")
});
const $$splitComponentImporter$H = () => import("./mission-hub.twbc-drone-rule-engine-DwlVa17c.mjs");
const Route$H = createFileRoute("/mission-hub/twbc-drone-rule-engine")({
  component: lazyRouteComponent($$splitComponentImporter$H, "component")
});
const $$splitComponentImporter$G = () => import("./mission-hub.twbc-drone-reference-designs-BbQMfOcP.mjs");
const Route$G = createFileRoute("/mission-hub/twbc-drone-reference-designs")({
  component: lazyRouteComponent($$splitComponentImporter$G, "component")
});
const $$splitComponentImporter$F = () => import("./mission-hub.twbc-drone-reasoning-api-X1pEJzNm.mjs");
const Route$F = createFileRoute("/mission-hub/twbc-drone-reasoning-api")({
  component: lazyRouteComponent($$splitComponentImporter$F, "component")
});
const $$splitComponentImporter$E = () => import("./mission-hub.twbc-drone-proven-designs-BCfFivcr.mjs");
const Route$E = createFileRoute("/mission-hub/twbc-drone-proven-designs")({
  component: lazyRouteComponent($$splitComponentImporter$E, "component")
});
const $$splitComponentImporter$D = () => import("./mission-hub.twbc-drone-feedback-CibwCHbi.mjs");
const Route$D = createFileRoute("/mission-hub/twbc-drone-feedback")({
  component: lazyRouteComponent($$splitComponentImporter$D, "component")
});
const $$splitComponentImporter$C = () => import("./mission-hub.twbc-drone-design-score-BTrVZb4l.mjs");
const Route$C = createFileRoute("/mission-hub/twbc-drone-design-score")({
  component: lazyRouteComponent($$splitComponentImporter$C, "component")
});
const $$splitComponentImporter$B = () => import("./mission-hub.twbc-drone-design-rules-CUR1E2sb.mjs");
const Route$B = createFileRoute("/mission-hub/twbc-drone-design-rules")({
  component: lazyRouteComponent($$splitComponentImporter$B, "component")
});
const $$splitComponentImporter$A = () => import("./mission-hub.twbc-drone-design-rule-dxaWjvzl.mjs");
const Route$A = createFileRoute("/mission-hub/twbc-drone-design-rule")({
  component: lazyRouteComponent($$splitComponentImporter$A, "component")
});
const $$splitComponentImporter$z = () => import("./mission-hub.twbc-drone-components-library-kXVtRIBp.mjs");
const Route$z = createFileRoute("/mission-hub/twbc-drone-components-library")({
  component: lazyRouteComponent($$splitComponentImporter$z, "component")
});
const $$splitComponentImporter$y = () => import("./mission-hub.twbc-drone-approval-DjG6dACZ.mjs");
const Route$y = createFileRoute("/mission-hub/twbc-drone-approval")({
  component: lazyRouteComponent($$splitComponentImporter$y, "component")
});
const $$splitComponentImporter$x = () => import("./mission-hub.torqwings-design-studio-C5JPLT6H.mjs");
const Route$x = createFileRoute("/mission-hub/torqwings-design-studio")({
  ssr: false,
  head: () => ({
    meta: [{
      title: "TorqWings Design Studio"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$x, "component")
});
const $$splitComponentImporter$w = () => import("./mission-hub.settings-Cz8ejb15.mjs");
const Route$w = createFileRoute("/mission-hub/settings")({
  component: lazyRouteComponent($$splitComponentImporter$w, "component")
});
const $$splitComponentImporter$v = () => import("./mission-hub.reset-password-CvOz7bvc.mjs");
const Route$v = createFileRoute("/mission-hub/reset-password")({
  component: lazyRouteComponent($$splitComponentImporter$v, "component")
});
const $$splitComponentImporter$u = () => import("./mission-hub.login-DY5w07r7.mjs");
const Route$u = createFileRoute("/mission-hub/login")({
  component: lazyRouteComponent($$splitComponentImporter$u, "component")
});
const $$splitComponentImporter$t = () => import("./mission-hub.knowledge-uav-C-I-jRy4.mjs");
const Route$t = createFileRoute("/mission-hub/knowledge-uav")({
  component: lazyRouteComponent($$splitComponentImporter$t, "component")
});
const $$splitComponentImporter$s = () => import("./mission-hub.design-studio-CnPbExOu.mjs");
const Route$s = createFileRoute("/mission-hub/design-studio")({
  component: lazyRouteComponent($$splitComponentImporter$s, "component")
});
const $$splitComponentImporter$r = () => import("./mission-hub.dashboard-Cz_MKbU5.mjs");
const Route$r = createFileRoute("/mission-hub/dashboard")({
  component: lazyRouteComponent($$splitComponentImporter$r, "component")
});
const $$splitComponentImporter$q = () => import("./mission-hub.contacts-5ko1BisL.mjs");
const Route$q = createFileRoute("/mission-hub/contacts")({
  validateSearch: (s) => ({
    vertical: s.vertical || ""
  }),
  component: lazyRouteComponent($$splitComponentImporter$q, "component")
});
const $$splitComponentImporter$p = () => import("../_layout.technology-8yVvuV61.mjs");
const Route$p = createFileRoute("/_layout/technology")({
  component: lazyRouteComponent($$splitComponentImporter$p, "component")
});
const $$splitComponentImporter$o = () => import("../_layout.solutions-BWHPtByb.mjs");
const Route$o = createFileRoute("/_layout/solutions")({
  component: lazyRouteComponent($$splitComponentImporter$o, "component")
});
const $$splitComponentImporter$n = () => import("../_layout.pilots-BTU5dmpx.mjs");
const Route$n = createFileRoute("/_layout/pilots")({
  loader: () => {
    throw redirect({
      to: "/contact",
      replace: true
    });
  },
  component: lazyRouteComponent($$splitComponentImporter$n, "component")
});
const $$splitComponentImporter$m = () => import("../_layout.learn-BFsOu0JM.mjs");
const Route$m = createFileRoute("/_layout/learn")({
  component: lazyRouteComponent($$splitComponentImporter$m, "component")
});
const $$splitComponentImporter$l = () => import("../_layout.industries-CehDuYsN.mjs");
const Route$l = createFileRoute("/_layout/industries")({
  component: lazyRouteComponent($$splitComponentImporter$l, "component")
});
const $$splitComponentImporter$k = () => import("../_layout.guardsky-t73hMkbt.mjs");
const Route$k = createFileRoute("/_layout/guardsky")({
  component: lazyRouteComponent($$splitComponentImporter$k, "component")
});
const $$splitComponentImporter$j = () => import("../_layout.design-studio-BGnT-KDE.mjs");
const Route$j = createFileRoute("/_layout/design-studio")({
  component: lazyRouteComponent($$splitComponentImporter$j, "component")
});
const $$splitComponentImporter$i = () => import("../_layout.contact-BHXaBHF4.mjs");
const Route$i = createFileRoute("/_layout/contact")({
  component: lazyRouteComponent($$splitComponentImporter$i, "component")
});
const $$splitComponentImporter$h = () => import("../_layout.agrisky-_dLFtQ8x.mjs");
const Route$h = createFileRoute("/_layout/agrisky")({
  component: lazyRouteComponent($$splitComponentImporter$h, "component")
});
const $$splitComponentImporter$g = () => import("../_layout.about-DIv9NUmw.mjs");
const Route$g = createFileRoute("/_layout/about")({
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
  component: lazyRouteComponent($$splitComponentImporter$g, "component")
});
const $$splitComponentImporter$f = () => import("./pilot.missions.index-CyIqaMXS.mjs");
const Route$f = createFileRoute("/pilot/missions/")({
  head: () => ({
    meta: [{
      title: "AgriSky Pilot — Missions"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$f, "component")
});
const $$splitComponentImporter$e = () => import("./mission-hub.torqwings-design-studio.index-CQRXA8KQ.mjs");
const Route$e = createFileRoute("/mission-hub/torqwings-design-studio/")({
  component: lazyRouteComponent($$splitComponentImporter$e, "component")
});
const $$splitComponentImporter$d = () => import("../_layout.learn.index-CpO6hQ21.mjs");
const Route$d = createFileRoute("/_layout/learn/")({
  component: lazyRouteComponent($$splitComponentImporter$d, "component")
});
const $$splitComponentImporter$c = () => import("./pilot.missions._id-gMMMe3QL.mjs");
const Route$c = createFileRoute("/pilot/missions/$id")({
  head: () => ({
    meta: [{
      title: "AgriSky Pilot — Mission"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$c, "component")
});
const $$splitComponentImporter$b = () => import("./mission-hub.verticals._vertical-CVWNuI7l.mjs");
const Route$b = createFileRoute("/mission-hub/verticals/$vertical")({
  component: lazyRouteComponent($$splitComponentImporter$b, "component")
});
const $$splitComponentImporter$a = () => import("./mission-hub.torqwings-design-studio.simulation-C8iNxfDL.mjs");
const Route$a = createFileRoute("/mission-hub/torqwings-design-studio/simulation")({
  component: lazyRouteComponent($$splitComponentImporter$a, "component"),
  ssr: false
});
const $$splitComponentImporter$9 = () => import("./mission-hub.torqwings-design-studio.requirements-B25jeamI.mjs");
const Route$9 = createFileRoute("/mission-hub/torqwings-design-studio/requirements")({
  component: lazyRouteComponent($$splitComponentImporter$9, "component")
});
const $$splitComponentImporter$8 = () => import("./mission-hub.torqwings-design-studio.report-BaZo6E1D.mjs");
const Route$8 = createFileRoute("/mission-hub/torqwings-design-studio/report")({
  component: lazyRouteComponent($$splitComponentImporter$8, "component")
});
const $$splitComponentImporter$7 = () => import("./mission-hub.torqwings-design-studio.new-2tRXE8uf.mjs");
const Route$7 = createFileRoute("/mission-hub/torqwings-design-studio/new")({
  component: lazyRouteComponent($$splitComponentImporter$7, "component"),
  ssr: false
});
const $$splitComponentImporter$6 = () => import("./mission-hub.torqwings-design-studio.history-TxaV-kpH.mjs");
const Route$6 = createFileRoute("/mission-hub/torqwings-design-studio/history")({
  component: lazyRouteComponent($$splitComponentImporter$6, "component")
});
const $$splitComponentImporter$5 = () => import("./mission-hub.torqwings-design-studio.design-rule-BETNj-Th.mjs");
const Route$5 = createFileRoute("/mission-hub/torqwings-design-studio/design-rule")({
  component: lazyRouteComponent($$splitComponentImporter$5, "component")
});
const $$splitComponentImporter$4 = () => import("./mission-hub.torqwings-design-studio.design-BAcdI7A2.mjs");
const Route$4 = createFileRoute("/mission-hub/torqwings-design-studio/design")({
  component: lazyRouteComponent($$splitComponentImporter$4, "component")
});
const $$splitComponentImporter$3 = () => import("./mission-hub.torqwings-design-studio.components-xLWjE48z.mjs");
const Route$3 = createFileRoute("/mission-hub/torqwings-design-studio/components")({
  component: lazyRouteComponent($$splitComponentImporter$3, "component")
});
const $$splitComponentImporter$2 = () => import("./mission-hub.torqwings-design-studio.compliance-CrIvjtgv.mjs");
const Route$2 = createFileRoute("/mission-hub/torqwings-design-studio/compliance")({
  component: lazyRouteComponent($$splitComponentImporter$2, "component")
});
const $$splitComponentImporter$1 = () => import("./mission-hub.torqwings-design-studio.advisor-CjO0_sCv.mjs");
const Route$1 = createFileRoute("/mission-hub/torqwings-design-studio/advisor")({
  component: lazyRouteComponent($$splitComponentImporter$1, "component")
});
const $$splitComponentImporter = () => import("../_layout.learn.drone-design-fundamentals-SSiZxbDk.mjs");
const Route = createFileRoute("/_layout/learn/drone-design-fundamentals")({
  component: lazyRouteComponent($$splitComponentImporter, "component")
});
const SitemapDotxmlRoute = Route$V.update({
  id: "/sitemap.xml",
  path: "/sitemap.xml",
  getParentRoute: () => Route$W
});
const PilotRoute = Route$U.update({
  id: "/pilot",
  path: "/pilot",
  getParentRoute: () => Route$W
});
const MissionHubRoute = Route$T.update({
  id: "/mission-hub",
  path: "/mission-hub",
  getParentRoute: () => Route$W
});
const FieldRoute = Route$S.update({
  id: "/field",
  path: "/field",
  getParentRoute: () => Route$W
});
const LayoutRoute = Route$R.update({
  id: "/_layout",
  getParentRoute: () => Route$W
});
const PilotIndexRoute = Route$Q.update({
  id: "/",
  path: "/",
  getParentRoute: () => PilotRoute
});
const LayoutIndexRoute = Route$P.update({
  id: "/",
  path: "/",
  getParentRoute: () => LayoutRoute
});
const PilotTrackingRoute = Route$O.update({
  id: "/tracking",
  path: "/tracking",
  getParentRoute: () => PilotRoute
});
const PilotSyncRoute = Route$N.update({
  id: "/sync",
  path: "/sync",
  getParentRoute: () => PilotRoute
});
const PilotProfileRoute = Route$M.update({
  id: "/profile",
  path: "/profile",
  getParentRoute: () => PilotRoute
});
const PilotLoginRoute = Route$L.update({
  id: "/login",
  path: "/login",
  getParentRoute: () => PilotRoute
});
const MissionHubWaitlistRoute = Route$K.update({
  id: "/waitlist",
  path: "/waitlist",
  getParentRoute: () => MissionHubRoute
});
const MissionHubUsersRoute = Route$J.update({
  id: "/users",
  path: "/users",
  getParentRoute: () => MissionHubRoute
});
const MissionHubTwbcDroneSimilaritySearchRoute = Route$I.update({
  id: "/twbc-drone-similarity-search",
  path: "/twbc-drone-similarity-search",
  getParentRoute: () => MissionHubRoute
});
const MissionHubTwbcDroneRuleEngineRoute = Route$H.update({
  id: "/twbc-drone-rule-engine",
  path: "/twbc-drone-rule-engine",
  getParentRoute: () => MissionHubRoute
});
const MissionHubTwbcDroneReferenceDesignsRoute = Route$G.update({
  id: "/twbc-drone-reference-designs",
  path: "/twbc-drone-reference-designs",
  getParentRoute: () => MissionHubRoute
});
const MissionHubTwbcDroneReasoningApiRoute = Route$F.update({
  id: "/twbc-drone-reasoning-api",
  path: "/twbc-drone-reasoning-api",
  getParentRoute: () => MissionHubRoute
});
const MissionHubTwbcDroneProvenDesignsRoute = Route$E.update({
  id: "/twbc-drone-proven-designs",
  path: "/twbc-drone-proven-designs",
  getParentRoute: () => MissionHubRoute
});
const MissionHubTwbcDroneFeedbackRoute = Route$D.update({
  id: "/twbc-drone-feedback",
  path: "/twbc-drone-feedback",
  getParentRoute: () => MissionHubRoute
});
const MissionHubTwbcDroneDesignScoreRoute = Route$C.update({
  id: "/twbc-drone-design-score",
  path: "/twbc-drone-design-score",
  getParentRoute: () => MissionHubRoute
});
const MissionHubTwbcDroneDesignRulesRoute = Route$B.update({
  id: "/twbc-drone-design-rules",
  path: "/twbc-drone-design-rules",
  getParentRoute: () => MissionHubRoute
});
const MissionHubTwbcDroneDesignRuleRoute = Route$A.update({
  id: "/twbc-drone-design-rule",
  path: "/twbc-drone-design-rule",
  getParentRoute: () => MissionHubRoute
});
const MissionHubTwbcDroneComponentsLibraryRoute = Route$z.update({
  id: "/twbc-drone-components-library",
  path: "/twbc-drone-components-library",
  getParentRoute: () => MissionHubRoute
});
const MissionHubTwbcDroneApprovalRoute = Route$y.update({
  id: "/twbc-drone-approval",
  path: "/twbc-drone-approval",
  getParentRoute: () => MissionHubRoute
});
const MissionHubTorqwingsDesignStudioRoute = Route$x.update({
  id: "/torqwings-design-studio",
  path: "/torqwings-design-studio",
  getParentRoute: () => MissionHubRoute
});
const MissionHubSettingsRoute = Route$w.update({
  id: "/settings",
  path: "/settings",
  getParentRoute: () => MissionHubRoute
});
const MissionHubResetPasswordRoute = Route$v.update({
  id: "/reset-password",
  path: "/reset-password",
  getParentRoute: () => MissionHubRoute
});
const MissionHubLoginRoute = Route$u.update({
  id: "/login",
  path: "/login",
  getParentRoute: () => MissionHubRoute
});
const MissionHubKnowledgeUavRoute = Route$t.update({
  id: "/knowledge-uav",
  path: "/knowledge-uav",
  getParentRoute: () => MissionHubRoute
});
const MissionHubDesignStudioRoute = Route$s.update({
  id: "/design-studio",
  path: "/design-studio",
  getParentRoute: () => MissionHubRoute
});
const MissionHubDashboardRoute = Route$r.update({
  id: "/dashboard",
  path: "/dashboard",
  getParentRoute: () => MissionHubRoute
});
const MissionHubContactsRoute = Route$q.update({
  id: "/contacts",
  path: "/contacts",
  getParentRoute: () => MissionHubRoute
});
const LayoutTechnologyRoute = Route$p.update({
  id: "/technology",
  path: "/technology",
  getParentRoute: () => LayoutRoute
});
const LayoutSolutionsRoute = Route$o.update({
  id: "/solutions",
  path: "/solutions",
  getParentRoute: () => LayoutRoute
});
const LayoutPilotsRoute = Route$n.update({
  id: "/pilots",
  path: "/pilots",
  getParentRoute: () => LayoutRoute
});
const LayoutLearnRoute = Route$m.update({
  id: "/learn",
  path: "/learn",
  getParentRoute: () => LayoutRoute
});
const LayoutIndustriesRoute = Route$l.update({
  id: "/industries",
  path: "/industries",
  getParentRoute: () => LayoutRoute
});
const LayoutGuardskyRoute = Route$k.update({
  id: "/guardsky",
  path: "/guardsky",
  getParentRoute: () => LayoutRoute
});
const LayoutDesignStudioRoute = Route$j.update({
  id: "/design-studio",
  path: "/design-studio",
  getParentRoute: () => LayoutRoute
});
const LayoutContactRoute = Route$i.update({
  id: "/contact",
  path: "/contact",
  getParentRoute: () => LayoutRoute
});
const LayoutAgriskyRoute = Route$h.update({
  id: "/agrisky",
  path: "/agrisky",
  getParentRoute: () => LayoutRoute
});
const LayoutAboutRoute = Route$g.update({
  id: "/about",
  path: "/about",
  getParentRoute: () => LayoutRoute
});
const PilotMissionsIndexRoute = Route$f.update({
  id: "/missions/",
  path: "/missions/",
  getParentRoute: () => PilotRoute
});
const MissionHubTorqwingsDesignStudioIndexRoute = Route$e.update({
  id: "/",
  path: "/",
  getParentRoute: () => MissionHubTorqwingsDesignStudioRoute
});
const LayoutLearnIndexRoute = Route$d.update({
  id: "/",
  path: "/",
  getParentRoute: () => LayoutLearnRoute
});
const PilotMissionsIdRoute = Route$c.update({
  id: "/missions/$id",
  path: "/missions/$id",
  getParentRoute: () => PilotRoute
});
const MissionHubVerticalsVerticalRoute = Route$b.update({
  id: "/verticals/$vertical",
  path: "/verticals/$vertical",
  getParentRoute: () => MissionHubRoute
});
const MissionHubTorqwingsDesignStudioSimulationRoute = Route$a.update({
  id: "/simulation",
  path: "/simulation",
  getParentRoute: () => MissionHubTorqwingsDesignStudioRoute
});
const MissionHubTorqwingsDesignStudioRequirementsRoute = Route$9.update({
  id: "/requirements",
  path: "/requirements",
  getParentRoute: () => MissionHubTorqwingsDesignStudioRoute
});
const MissionHubTorqwingsDesignStudioReportRoute = Route$8.update({
  id: "/report",
  path: "/report",
  getParentRoute: () => MissionHubTorqwingsDesignStudioRoute
});
const MissionHubTorqwingsDesignStudioNewRoute = Route$7.update({
  id: "/new",
  path: "/new",
  getParentRoute: () => MissionHubTorqwingsDesignStudioRoute
});
const MissionHubTorqwingsDesignStudioHistoryRoute = Route$6.update({
  id: "/history",
  path: "/history",
  getParentRoute: () => MissionHubTorqwingsDesignStudioRoute
});
const MissionHubTorqwingsDesignStudioDesignRuleRoute = Route$5.update({
  id: "/design-rule",
  path: "/design-rule",
  getParentRoute: () => MissionHubTorqwingsDesignStudioRoute
});
const MissionHubTorqwingsDesignStudioDesignRoute = Route$4.update({
  id: "/design",
  path: "/design",
  getParentRoute: () => MissionHubTorqwingsDesignStudioRoute
});
const MissionHubTorqwingsDesignStudioComponentsRoute = Route$3.update({
  id: "/components",
  path: "/components",
  getParentRoute: () => MissionHubTorqwingsDesignStudioRoute
});
const MissionHubTorqwingsDesignStudioComplianceRoute = Route$2.update({
  id: "/compliance",
  path: "/compliance",
  getParentRoute: () => MissionHubTorqwingsDesignStudioRoute
});
const MissionHubTorqwingsDesignStudioAdvisorRoute = Route$1.update({
  id: "/advisor",
  path: "/advisor",
  getParentRoute: () => MissionHubTorqwingsDesignStudioRoute
});
const LayoutLearnDroneDesignFundamentalsRoute = Route.update({
  id: "/drone-design-fundamentals",
  path: "/drone-design-fundamentals",
  getParentRoute: () => LayoutLearnRoute
});
const LayoutLearnRouteChildren = {
  LayoutLearnDroneDesignFundamentalsRoute,
  LayoutLearnIndexRoute
};
const LayoutLearnRouteWithChildren = LayoutLearnRoute._addFileChildren(
  LayoutLearnRouteChildren
);
const LayoutRouteChildren = {
  LayoutAboutRoute,
  LayoutAgriskyRoute,
  LayoutContactRoute,
  LayoutDesignStudioRoute,
  LayoutGuardskyRoute,
  LayoutIndustriesRoute,
  LayoutLearnRoute: LayoutLearnRouteWithChildren,
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
const routeTree = Route$W._addFileChildren(rootRouteChildren)._addFileTypes();
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
  Route$b as R,
  heroImg as h,
  router as r
};
