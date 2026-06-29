import { j as jsxRuntimeExports } from "./_libs/react.mjs";
import { L as Link } from "./_libs/tanstack__react-router.mjs";
import { B as Button } from "./_ssr/button-DjOZMqFS.mjs";
import { S as SectionWrapper } from "./_ssr/SectionWrapper-CRvOCB89.mjs";
import { C as Card } from "./_ssr/Card-Diw2V0Z0.mjs";
import { I as IconBubble } from "./_ssr/IconBubble-CjOnHlj0.mjs";
import { k as ArrowRight, P as Plane, E as Sprout, z as Map, aa as Wrench, g as CircleCheck, K as Users } from "./_libs/lucide-react.mjs";
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
import "./_libs/radix-ui__react-slot.mjs";
import "./_libs/radix-ui__react-compose-refs.mjs";
import "./_libs/class-variance-authority.mjs";
import "./_libs/clsx.mjs";
import "./_libs/tailwind-merge.mjs";
const ACADEMY_PROGRAMS = [{
  icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Plane, { "aria-hidden": "true" }),
  text: "Drone Pilot Training",
  desc: "Learn drone basics, flight safety, controls, emergency handling, and field operations."
}, {
  icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Sprout, { "aria-hidden": "true" }),
  text: "Agri-Drone Operations",
  desc: "Learn drone usage for farm monitoring, crop imaging, spraying workflows, and precision agriculture services."
}, {
  icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Map, { "aria-hidden": "true" }),
  text: "Mapping & Survey Training",
  desc: "Learn aerial mapping basics, mission planning, data capture, and reporting workflows."
}, {
  icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Wrench, { "aria-hidden": "true" }),
  text: "Drone Maintenance Basics",
  desc: "Understand batteries, propellers, motors, payloads, pre-flight checks, and post-flight maintenance."
}, {
  icon: /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { "aria-hidden": "true" }),
  text: "Certification Support",
  desc: "Guidance and preparation support for drone pilot licensing and certification pathways through authorized channels."
}, {
  icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Users, { "aria-hidden": "true" }),
  text: "Career & Entrepreneurship Pathway",
  desc: "Support for students, operators, SHGs, FPOs, and rural entrepreneurs to start drone-based service businesses."
}];
function AcademyPage() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(SectionWrapper, { id: "academy", eyebrow: "TorqWings Academy", title: "Training the next generation of drone pilots and aerial intelligence professionals", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-muted-foreground max-w-3xl", children: "TorqWings Academy provides hands-on drone pilot training and certification support for students, farmers, rural entrepreneurs, SHGs, FPOs, and professionals. The program focuses on safe drone operations, mission planning, field applications, agri-drone workflows, mapping basics, maintenance awareness, and real-world drone service readiness." }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4", children: ACADEMY_PROGRAMS.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(IconBubble, { children: c.icon }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "mt-4 text-base font-semibold", children: c.text }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1.5 text-sm text-muted-foreground", children: c.desc })
    ] }, c.text)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-10 flex justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { asChild: true, size: "lg", className: "bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { to: "/contact", children: [
      "Join Drone Training Program ",
      /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { className: "ml-1 h-4 w-4", "aria-hidden": "true" })
    ] }) }) })
  ] });
}
export {
  AcademyPage as component
};
