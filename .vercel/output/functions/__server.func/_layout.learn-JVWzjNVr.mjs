import { j as jsxRuntimeExports, r as reactExports } from "./_libs/react.mjs";
import { e as useRouterState, O as Outlet, L as Link } from "./_libs/tanstack__react-router.mjs";
import { B as Button } from "./_ssr/button-DjOZMqFS.mjs";
import { S as SectionBadge } from "./_ssr/SectionBadge-Bokc1YJ-.mjs";
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
function LearnRouteComponent() {
  const pathname = useRouterState({
    select: (s) => s.location.pathname
  });
  if (pathname.startsWith("/learn/")) return /* @__PURE__ */ jsxRuntimeExports.jsx(Outlet, {});
  return /* @__PURE__ */ jsxRuntimeExports.jsx(LearnPage, {});
}
const COURSES = [{
  title: "Drone Design Fundamentals",
  level: "Beginner",
  description: "Aerodynamics, frame types, propulsion basics, and payload math — take your first design from zero to BOM.",
  duration: "8 hrs",
  projects: 5,
  vertical: "All verticals",
  price: "₹1,999",
  note: "Free with Explorer tier",
  badge: null,
  previewPath: "/learn/drone-design-fundamentals"
}, {
  title: "Component Selection Masterclass",
  level: "Intermediate",
  description: "Motors, ESCs, flight controllers, batteries — read datasheets, match specs, and build production-ready BOMs.",
  duration: "10 hrs",
  projects: 8,
  vertical: "All verticals",
  price: "₹2,999",
  note: "Included in Engineer tier",
  badge: null
}, {
  title: "Flight Simulation & Validation",
  level: "Intermediate",
  description: "Use TorqWings simulation to stress-test designs across Indian terrain types, monsoon conditions, and payloads.",
  duration: "8 hrs",
  projects: 5,
  vertical: "All verticals",
  price: "₹2,999",
  note: null,
  badge: null
}, {
  title: "DRDO Compliance & Defence UAV Design",
  level: "Advanced",
  description: "HAL specs, DRDO documentation, defence-grade payload integration, and the GuardSky vertical in depth.",
  duration: "12 hrs",
  projects: 4,
  vertical: "GuardSky",
  price: "₹4,999",
  note: "Included in Squadron tier",
  badge: "🛡️ Defence"
}, {
  title: "TorqWings Certified Designer",
  level: "Professional",
  description: "All courses bundled into one complete learning path — from zero to industry-recognised certified autonomous aerial platform design engineer.",
  duration: "44 hrs",
  projects: 25,
  vertical: "All verticals",
  price: "₹9,999",
  note: "Full certification path",
  badge: "🏆 Full path"
}];
const LEVEL_STYLE = {
  Beginner: {
    bg: "#e6f1fb",
    color: "#185fa5"
  },
  Intermediate: {
    bg: "#faeeda",
    color: "#854f0b"
  },
  Advanced: {
    bg: "#eeedfe",
    color: "#3c3489"
  },
  Professional: {
    bg: "#e1f5ee",
    color: "#0f6e56"
  }
};
const FILTERS = ["All", "Beginner", "Intermediate", "Advanced", "Professional"];
const LEARNING_PATH = [{
  step: 1,
  label: "Explorer",
  sub: "Free fundamentals",
  teal: false
}, {
  step: 2,
  label: "Engineer",
  sub: "Component mastery",
  teal: false
}, {
  step: 3,
  label: "Simulator",
  sub: "Validate designs",
  teal: false
}, {
  step: 4,
  label: "Specialist",
  sub: "Pick your vertical",
  teal: false
}, {
  step: 5,
  label: "Certified ✦",
  sub: "Industry credential",
  teal: true
}];
function CourseCard({
  course
}) {
  const lvl = LEVEL_STYLE[course.level];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative flex flex-col rounded-xl bg-card p-4 transition-colors hover:border-foreground/20", style: {
    border: "0.5px solid var(--color-border)"
  }, children: [
    course.badge && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "absolute top-3 right-3 rounded px-2 py-0.5", style: {
      fontSize: 9,
      fontWeight: 500,
      background: "#faeeda",
      color: "#854f0b"
    }, children: course.badge }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "self-start rounded px-1.5 py-0.5", style: {
      fontSize: 10,
      fontWeight: 500,
      background: lvl.bg,
      color: lvl.color
    }, children: course.level }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 leading-snug text-foreground", style: {
      fontSize: 13,
      fontWeight: 500
    }, children: course.title }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 mb-2 leading-relaxed text-muted-foreground line-clamp-2", style: {
      fontSize: 11
    }, children: course.description }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-2 flex flex-wrap gap-2 text-muted-foreground", style: {
      fontSize: 10
    }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
        "📹 ",
        course.duration
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
        "📝 ",
        course.projects,
        " projects"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: course.vertical })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-auto border-t border-border pt-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-foreground", style: {
        fontSize: 13,
        fontWeight: 500
      }, children: [
        course.price,
        course.note && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-2 font-normal text-muted-foreground", style: {
          fontSize: 10
        }, children: course.note })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 flex gap-1.5", children: [
        course.previewPath ? /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: course.previewPath, className: "flex-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "sm", variant: "outline", className: "h-7 w-full", style: {
          fontSize: 11
        }, children: "Preview course" }) }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "sm", variant: "outline", className: "h-7 flex-1", style: {
          fontSize: 11
        }, children: "Preview course" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "sm", className: "h-7 flex-1 border-0 hover:opacity-90", style: {
          fontSize: 11,
          background: "#2a78d6",
          color: "white"
        }, children: "Enroll now" })
      ] })
    ] })
  ] });
}
function LearnPage() {
  const [filter, setFilter] = reactExports.useState("All");
  const visibleCourses = filter === "All" ? COURSES : COURSES.filter((c) => c.level === filter);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "relative overflow-hidden pt-28 pb-16 lg:pt-36 lg:pb-20 bg-gradient-hero", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 grid-bg opacity-40 pointer-events-none" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "relative mx-auto max-w-6xl px-5 lg:px-8", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 md:grid-cols-5 items-start gap-12 md:gap-16", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "md:col-span-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(SectionBadge, { label: "Torqwings Academy" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("h1", { className: "text-4xl md:text-5xl font-bold text-foreground leading-tight", style: {
            marginBottom: 12
          }, children: [
            "Aerospace Intelligence is for Every Indian.",
            " ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("br", { className: "hidden sm:block" }),
            "The Technology Above Must Be Built in India."
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-lg md:text-xl font-medium text-muted-foreground", children: "We Don't Just Teach You to Fly. We Teach You to Build Autonomous Aerial Platforms." })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "md:col-span-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: {
            width: 32,
            height: 2,
            background: "#1baf7a",
            borderRadius: 2,
            marginBottom: 16
          } }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm md:text-base text-muted-foreground leading-relaxed", style: {
            marginBottom: 12
          }, children: "TorqWings Academy goes beyond pilot training. We are building India's first pipeline of autonomous aerial platform designers, engineers, and aerial intelligence professionals — from students and rural innovators to defence-adjacent researchers and aerospace startups." }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm md:text-base text-muted-foreground leading-relaxed", children: "Every course is rooted in real design, real components, and real AI — because India's aerospace future depends not on who flies the platform, but on who builds it." }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-8 mt-6", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[22px] font-display font-bold text-foreground", children: "5" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] text-muted-foreground mt-0.5", children: "Courses" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[22px] font-display font-bold text-foreground", children: "38+ hrs" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] text-muted-foreground mt-0.5", children: "Content" })
            ] })
          ] })
        ] })
      ] }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("section", { className: "py-6 border-b border-border", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mx-auto max-w-6xl px-6", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-wrap gap-2", children: FILTERS.map((f) => /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setFilter(f), className: "rounded-full px-4 py-1.5 text-sm font-medium transition-colors", style: filter === f ? {
      background: "#2a78d6",
      color: "white",
      border: "1px solid #2a78d6"
    } : {
      background: "transparent",
      border: "1px solid var(--color-border)",
      color: "var(--color-foreground)"
    }, children: f }, f)) }) }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("section", { className: "py-10", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mx-auto max-w-6xl px-6", children: visibleCourses.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "py-12 text-center text-muted-foreground", children: "No courses at this level yet — check back soon." }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid sm:grid-cols-2 lg:grid-cols-3 gap-4", children: visibleCourses.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx(CourseCard, { course: c }, c.title)) }) }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("section", { className: "pb-8", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mx-auto max-w-6xl px-6", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-3 bg-card px-6 py-4", style: {
      borderLeft: "4px solid #1baf7a",
      borderRadius: "0 10px 10px 0"
    }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mt-0.5 shrink-0 text-xl", "aria-hidden": "true", children: "🤖" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-foreground", style: {
          fontSize: 13,
          fontWeight: 500
        }, children: "Courses powered by TorqWings AI" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-0.5 leading-relaxed text-muted-foreground", style: {
          fontSize: 11
        }, children: "Every module is generated from TorqWings' autonomous aerial platform design knowledge base — reviewed by domain experts and updated automatically as the platform evolves." })
      ] })
    ] }) }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("section", { className: "border-t border-border bg-card py-12", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mx-auto max-w-4xl px-6 text-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mb-8 text-base font-medium text-foreground", children: "Your learning path" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-col items-center sm:flex-row sm:items-start justify-center", children: LEARNING_PATH.map((s, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs(reactExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-center text-center", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex h-8 w-8 items-center justify-center rounded-full", style: s.teal ? {
            background: "#1baf7a",
            color: "white",
            fontSize: 13,
            fontWeight: 500
          } : {
            background: "var(--color-muted)",
            border: "0.5px solid var(--color-border)",
            color: "var(--color-muted-foreground)",
            fontSize: 13,
            fontWeight: 500
          }, children: s.step }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-xs font-medium", style: {
            color: s.teal ? "#0f6e56" : "var(--color-foreground)"
          }, children: s.label }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: {
            fontSize: 10,
            color: s.teal ? "#0f6e56" : "var(--color-muted-foreground)"
          }, children: s.sub })
        ] }),
        i < LEARNING_PATH.length - 1 && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "hidden sm:block flex-1 h-px bg-border self-start mt-4 mx-2" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "sm:hidden w-px h-5 bg-border my-1" })
        ] })
      ] }, s.step)) })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("section", { className: "border-t border-border bg-card py-12 text-center", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mx-auto max-w-lg px-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mb-2 uppercase text-muted-foreground", style: {
        fontSize: 10,
        fontWeight: 500,
        letterSpacing: "0.08em"
      }, children: "GET STARTED" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "mb-2 text-[22px] font-medium text-foreground leading-tight", children: "Begin your journey as an autonomous aerial platform designer with TorqWings Academy" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "leading-relaxed text-muted-foreground", style: {
        fontSize: 13
      }, children: [
        "Enroll in a course or drop a note to our advisor to find the right learning path at",
        " ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("a", { href: "mailto:academy@torqwings.com", className: "underline underline-offset-2 hover:opacity-80 transition-opacity", children: "academy@torqwings.com" })
      ] })
    ] }) })
  ] });
}
export {
  LearnRouteComponent as component
};
