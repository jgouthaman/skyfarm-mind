import { j as jsxRuntimeExports } from "./_libs/react.mjs";
import { L as Link } from "./_libs/tanstack__react-router.mjs";
import { S as SectionWrapper } from "./_ssr/SectionWrapper-CRvOCB89.mjs";
import { I as IconBubble } from "./_ssr/IconBubble-CjOnHlj0.mjs";
import { ad as Rocket, k as ArrowRight, E as Sprout, D as Building2, z as Map, Z as Eye, F as FlaskConical, y as GraduationCap } from "./_libs/lucide-react.mjs";
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
function VerticalCard({ tag, icon, title, subtitle, desc, accent, to }) {
  const isAgri = accent === "agri";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: `rounded-2xl p-6 border shadow-card transition-all hover:-translate-y-0.5 ${isAgri ? "bg-gradient-card border-accent/40 hover:shadow-soft" : "bg-gradient-card border-border/60 hover:border-primary/40 hover:shadow-soft"}`,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(IconBubble, { tone: isAgri ? "agri" : "primary", children: icon }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] uppercase tracking-widest text-muted-foreground", children: tag })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "mt-5 text-xl font-display font-semibold", children: title }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: `mt-1 text-sm font-medium ${isAgri ? "text-accent" : "text-primary"}`, children: subtitle }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-3 text-sm text-muted-foreground", children: desc }),
        to && /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Link,
          {
            to,
            className: "mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:gap-2.5 transition-all",
            children: [
              "Explore ",
              title,
              " ",
              /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { className: "h-4 w-4", "aria-hidden": "true" })
            ]
          }
        )
      ]
    }
  );
}
const VERTICALS = [
  {
    accent: "agri",
    tag: "Agriculture",
    icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Sprout, { className: "h-5 w-5", "aria-hidden": "true" }),
    title: "AgriSky",
    subtitle: "Agriculture Drone Intelligence",
    desc: "Drone-based farm monitoring, crop health analysis, irrigation insights, organic farming advisory, and future precision spraying support.",
    to: "/agrisky"
  },
  {
    tag: "Infrastructure",
    icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Building2, { className: "h-5 w-5", "aria-hidden": "true" }),
    title: "InfraSky",
    subtitle: "Infrastructure Inspection",
    desc: "Drone-based inspection for roads, bridges, buildings, telecom towers, solar farms, and industrial assets."
  },
  {
    tag: "Mapping",
    icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Map, { className: "h-5 w-5", "aria-hidden": "true" }),
    title: "GeoSky",
    subtitle: "Mapping & Survey Intelligence",
    desc: "Aerial mapping, land survey, site progress monitoring, GIS data capture, and terrain intelligence."
  },
  {
    tag: "Surveillance",
    icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, { className: "h-5 w-5", "aria-hidden": "true" }),
    title: "GuardSky",
    subtitle: "Aerial Surveillance & Early Fire Response",
    desc: "Drone-based real-time monitoring, smoke/fire detection support, live aerial visibility, rapid alerts, and targeted first-response payload deployment for farms, industrial sites, campuses, remote facilities, and critical assets.",
    to: "/guardsky"
  },
  {
    tag: "R&D",
    icon: /* @__PURE__ */ jsxRuntimeExports.jsx(FlaskConical, { className: "h-5 w-5", "aria-hidden": "true" }),
    title: "TorqWings Labs",
    subtitle: "Custom UAV R&D",
    desc: "Custom drone design, payload integration, flight testing, aerospace research, and prototype development for specialized use cases."
  },
  {
    tag: "Training",
    icon: /* @__PURE__ */ jsxRuntimeExports.jsx(GraduationCap, { className: "h-5 w-5", "aria-hidden": "true" }),
    title: "TorqWings Academy",
    subtitle: "Drone Pilot Training & Certification Support",
    desc: "Practical drone pilot training, safety procedures, mission planning, agri-drone operations, mapping workflows, and certification support for students, farmers, drone operators, SHGs, FPOs, and professionals.",
    to: "/academy"
  }
];
function IndustriesPage() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(SectionWrapper, { id: "verticals", eyebrow: "Industries", title: "Built for multiple industries", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-muted-foreground max-w-3xl", children: "Six focused service lines, one unified aerospace and AI platform underneath." }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-10 grid md:grid-cols-2 lg:grid-cols-3 gap-5", children: [
      VERTICALS.map((v) => /* @__PURE__ */ jsxRuntimeExports.jsx(VerticalCard, { ...v }, v.title)),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-2xl p-6 bg-gradient-primary text-primary-foreground shadow-soft flex flex-col justify-between", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Rocket, { className: "h-6 w-6", "aria-hidden": "true" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "mt-4 text-xl font-display font-semibold", children: "One platform. Many missions." }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-sm opacity-90", children: "Every vertical shares the same modular UAV, data, and AI stack — engineered once, deployed everywhere." })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { to: "/technology", className: "mt-6 inline-flex items-center gap-1.5 text-sm font-medium hover:gap-2.5 transition-all", children: [
          "See the stack ",
          /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { className: "h-4 w-4", "aria-hidden": "true" })
        ] })
      ] })
    ] })
  ] });
}
export {
  IndustriesPage as component
};
