import { r as reactExports, j as jsxRuntimeExports } from "./_libs/react.mjs";
import { L as Link } from "./_libs/tanstack__react-router.mjs";
import { s as supabase } from "./_ssr/client-DYtC4Igq.mjs";
import { A as ArrowLeft, w as Clock, K as BookOpen, ac as Layers, u as ChevronDown, v as ChevronRight, ax as Lock } from "./_libs/lucide-react.mjs";
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
import "./_libs/supabase__supabase-js.mjs";
import "./_libs/supabase__postgrest-js.mjs";
import "./_libs/supabase__realtime-js.mjs";
import "./_libs/supabase__phoenix.mjs";
import "./_libs/supabase__storage-js.mjs";
import "./_libs/iceberg-js.mjs";
import "./_libs/supabase__auth-js.mjs";
import "tslib";
import "./_libs/supabase__functions-js.mjs";
const COURSE = {
  title: "Drone Design Fundamentals",
  description: "Aerodynamics, frame types, propulsion basics, and payload math — take your first design from zero to BOM.",
  level: "Beginner",
  price: 1999,
  hours: 8,
  project_count: 5,
  vertical: "All verticals"
};
const LESSON_1_1_CONTENT = `# What Is an Autonomous Aerial Platform?

You've probably heard the word "drone" thrown around everywhere — delivery drones, racing drones, military drones, camera drones. But if you're going to design one, the word "drone" isn't specific enough. We need a better mental model.

An **autonomous aerial platform** is any flying machine that can operate without continuous manual input from a human pilot. That's the key word: autonomous. It can hold its position, follow a path, avoid obstacles, or execute a mission — all based on onboard sensors, logic, and programming.

What separates an autonomous aerial platform from a toy or a hobby quadcopter isn't size or price. It's **design intent**. A well-designed platform is engineered around a specific mission, with every component chosen to serve that mission reliably and efficiently.

**The three design questions you must answer first**

Before you touch any component, you need to answer three questions:

*1. What is this platform supposed to accomplish?*
This is your mission. Survey 50 acres of farmland? Inspect a 100-metre transmission tower? Deliver a 500g package within a 5km radius? The mission defines everything else.

*2. What environment will it operate in?*
A platform designed for coastal wind conditions needs different motor sizing, frame rigidity, and flight controller tuning than one designed for calm, inland agricultural operations. Temperature, altitude, humidity, and wind all matter.

*3. What are your constraints?*
Budget, weight limits (regulatory or physical), battery charging infrastructure, operator skill level, maintenance capability. Every design is a set of tradeoffs within constraints.

**Why this matters more than specs**

Most beginners obsess over specs — thrust ratings, battery C-ratings, ESC amperage. Specs matter, but they're meaningless without context. A motor with 1.2kg of thrust per unit is excellent for a 500g survey drone and completely inadequate for a 3kg inspection platform.

In this course, we'll teach you to think in terms of missions and tradeoffs, not just numbers. By the end, you won't just know what a motor does — you'll know how to choose the right motor for a given job, and why.`;
const MODULES = [{
  id: "m1",
  title: "Introduction to Autonomous Aerial Platforms",
  description: "From the word 'drone' to a clear mental model — what autonomous aerial platforms are, how they differ from manually piloted aircraft, and how mission requirements drive every design decision.",
  order_index: 1,
  lessons: [{
    id: "l1-1",
    title: "What Is an Autonomous Aerial Platform?",
    content: LESSON_1_1_CONTENT,
    order_index: 1,
    is_free: true
  }, {
    id: "l1-2",
    title: "The Five Subsystems Every Platform Shares",
    content: null,
    order_index: 2,
    is_free: false
  }, {
    id: "l1-3",
    title: "Mission-Driven Design — A Worked Example",
    content: null,
    order_index: 3,
    is_free: false
  }]
}, {
  id: "m2",
  title: "Frame Types & Aerodynamics",
  description: "Multirotor configurations, fixed-wing and VTOL aircraft, and how to choose the right frame wheelbase for your mission.",
  order_index: 2,
  lessons: [{
    id: "l2-1",
    title: "Multirotor Configurations — Quad, Hex, Octo and When to Use Each",
    content: null,
    order_index: 1,
    is_free: false
  }, {
    id: "l2-2",
    title: "Fixed-Wing and VTOL — When Multirotors Aren't Enough",
    content: null,
    order_index: 2,
    is_free: false
  }, {
    id: "l2-3",
    title: "Frame Sizing — How to Choose the Right Wheelbase",
    content: null,
    order_index: 3,
    is_free: false
  }]
}, {
  id: "m3",
  title: "Propulsion Systems",
  description: "How motors, propellers, and ESCs work together — and how to match them correctly to your airframe and mission.",
  order_index: 3,
  lessons: [{
    id: "l3-1",
    title: "Understanding Motors — KV, Torque, and Efficiency",
    content: null,
    order_index: 1,
    is_free: false
  }, {
    id: "l3-2",
    title: "Propellers — Diameter, Pitch, and Material",
    content: null,
    order_index: 2,
    is_free: false
  }, {
    id: "l3-3",
    title: "ESCs, Power Matching, and the BLHeli/KISS Ecosystem",
    content: null,
    order_index: 3,
    is_free: false
  }]
}, {
  id: "m4",
  title: "Payload & Weight Budgeting",
  description: "Defining payload requirements, building a mass budget, and managing centre of gravity — the disciplines that separate professional builds from amateur ones.",
  order_index: 4,
  lessons: [{
    id: "l4-1",
    title: "Defining Your Payload Requirements",
    content: null,
    order_index: 1,
    is_free: false
  }, {
    id: "l4-2",
    title: "Weight Budgeting — Building Your Mass Budget",
    content: null,
    order_index: 2,
    is_free: false
  }, {
    id: "l4-3",
    title: "Centre of Gravity — Why Balance Makes or Breaks Your Platform",
    content: null,
    order_index: 3,
    is_free: false
  }]
}, {
  id: "m5",
  title: "Building Your First BOM",
  description: "Building a production-ready Bill of Materials — from component selection through battery sizing.",
  order_index: 5,
  lessons: [{
    id: "l5-1",
    title: "What Is a BOM and Why It's Your Most Important Document",
    content: null,
    order_index: 1,
    is_free: false
  }, {
    id: "l5-2",
    title: "Component Selection — Matching Parts to Mission",
    content: null,
    order_index: 2,
    is_free: false
  }, {
    id: "l5-3",
    title: "Battery Sizing — The Calculation You Must Get Right",
    content: null,
    order_index: 3,
    is_free: false
  }]
}, {
  id: "m6",
  title: "Introduction to Flight Simulation",
  description: "Using simulation to validate your design before building — and how to interpret and act on simulation results.",
  order_index: 6,
  lessons: [{
    id: "l6-1",
    title: "Why Simulate Before You Build",
    content: null,
    order_index: 1,
    is_free: false
  }, {
    id: "l6-2",
    title: "Setting Up Your First Simulation in TorqWings",
    content: null,
    order_index: 2,
    is_free: false
  }, {
    id: "l6-3",
    title: "Iterating Your Design Using Simulation Results",
    content: null,
    order_index: 3,
    is_free: false
  }]
}];
function parseInline(text) {
  const parts = [];
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let last = 0;
  let m;
  let k = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[2]) parts.push(/* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: m[2] }, k++));
    else if (m[3]) parts.push(/* @__PURE__ */ jsxRuntimeExports.jsx("em", { children: m[3] }, k++));
    else if (m[4]) parts.push(/* @__PURE__ */ jsxRuntimeExports.jsx("code", { className: "rounded bg-white/10 px-1 py-0.5 font-mono text-[0.85em] text-foreground", children: m[4] }, k++));
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return /* @__PURE__ */ jsxRuntimeExports.jsx(jsxRuntimeExports.Fragment, { children: parts });
}
function renderMarkdown(md) {
  const lines = md.split("\n");
  const nodes = [];
  let i = 0;
  let key = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("### ")) {
      nodes.push(/* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "mt-6 mb-2 text-base font-semibold text-foreground", children: parseInline(line.slice(4)) }, key++));
      i++;
    } else if (line.startsWith("## ")) {
      nodes.push(/* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "mt-8 mb-3 text-lg font-semibold text-foreground border-b border-border pb-2", children: parseInline(line.slice(3)) }, key++));
      i++;
    } else if (line.startsWith("# ")) {
      nodes.push(/* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "mt-0 mb-4 text-2xl font-bold text-foreground", children: parseInline(line.slice(2)) }, key++));
      i++;
    } else if (line.startsWith("> ")) {
      nodes.push(/* @__PURE__ */ jsxRuntimeExports.jsx("blockquote", { className: "my-4 border-l-4 border-[#1baf7a] pl-4 italic text-muted-foreground", style: {
        fontSize: 14
      }, children: parseInline(line.slice(2)) }, key++));
      i++;
    } else if (line.startsWith("- ")) {
      const items = [];
      while (i < lines.length && lines[i].startsWith("- ")) {
        items.push(lines[i].slice(2));
        i++;
      }
      nodes.push(/* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "my-3 space-y-1.5 pl-5 list-disc", style: {
        fontSize: 14
      }, children: items.map((item, idx) => /* @__PURE__ */ jsxRuntimeExports.jsx("li", { className: "text-muted-foreground leading-relaxed", children: parseInline(item) }, idx)) }, key++));
    } else if (/^\d+\. /.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\. /, ""));
        i++;
      }
      nodes.push(/* @__PURE__ */ jsxRuntimeExports.jsx("ol", { className: "my-3 space-y-1.5 pl-5 list-decimal", style: {
        fontSize: 14
      }, children: items.map((item, idx) => /* @__PURE__ */ jsxRuntimeExports.jsx("li", { className: "text-muted-foreground leading-relaxed", children: parseInline(item) }, idx)) }, key++));
    } else if (line.trim() === "---") {
      nodes.push(/* @__PURE__ */ jsxRuntimeExports.jsx("hr", { className: "my-8 border-border" }, key++));
      i++;
    } else if (line.trim() === "") {
      i++;
    } else {
      nodes.push(/* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "my-3 leading-relaxed text-muted-foreground", style: {
        fontSize: 14
      }, children: parseInline(line) }, key++));
      i++;
    }
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(jsxRuntimeExports.Fragment, { children: nodes });
}
function LessonReader({
  lesson,
  onBack
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-h-screen bg-background", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mx-auto max-w-3xl px-5 py-3 flex items-center justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: onBack, className: "flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowLeft, { className: "h-4 w-4" }),
        "Back to course"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide", style: {
        background: "rgba(27,175,122,0.15)",
        color: "#1baf7a"
      }, children: "Free Preview" })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mx-auto max-w-3xl px-5 py-10", children: renderMarkdown(lesson.content ?? "") })
  ] });
}
function ModuleRow({
  mod,
  index,
  onLessonClick
}) {
  const [open, setOpen] = reactExports.useState(index === 0);
  const freeCount = mod.lessons.filter((l) => l.is_free).length;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl bg-card", style: {
    border: "0.5px solid var(--color-border)"
  }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => setOpen((v) => !v), className: "w-full flex items-start gap-4 px-5 py-4 text-left hover:bg-white/[0.02] transition-colors rounded-xl", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold", style: {
        background: "rgba(42,120,214,0.15)",
        color: "#2a78d6"
      }, children: index + 1 }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-medium text-foreground leading-snug", children: mod.title }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-0.5 text-xs text-muted-foreground leading-relaxed line-clamp-2", children: mod.description }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-1.5 text-[10px] text-muted-foreground", children: [
          mod.lessons.length,
          " ",
          mod.lessons.length === 1 ? "lesson" : "lessons",
          freeCount > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "ml-2", style: {
            color: "#1baf7a"
          }, children: [
            freeCount,
            " free preview"
          ] })
        ] })
      ] }),
      open ? /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { className: "h-4 w-4 shrink-0 text-muted-foreground mt-0.5" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { className: "h-4 w-4 shrink-0 text-muted-foreground mt-0.5" })
    ] }),
    open && mod.lessons.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "border-t border-border divide-y divide-border", children: mod.lessons.map((lesson) => lesson.is_free ? /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => onLessonClick(lesson), className: "w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-white/[0.03] transition-colors group", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold", style: {
        background: "rgba(27,175,122,0.15)",
        color: "#1baf7a"
      }, children: "▶" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex-1 text-sm text-foreground group-hover:text-foreground/90 leading-snug", children: lesson.title }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide shrink-0", style: {
        background: "rgba(27,175,122,0.15)",
        color: "#1baf7a"
      }, children: "Free Preview" })
    ] }, lesson.id) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 px-5 py-3 opacity-50", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Lock, { className: "h-4 w-4 shrink-0 text-muted-foreground" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex-1 text-sm text-muted-foreground leading-snug", children: lesson.title })
    ] }, lesson.id)) })
  ] });
}
async function signInWithGoogle() {
  await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : void 0
    }
  });
}
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
function CourseDetailPage() {
  const [activeLesson, setActiveLesson] = reactExports.useState(null);
  const [user, setUser] = reactExports.useState(null);
  reactExports.useEffect(() => {
    supabase.auth.getUser().then(({
      data
    }) => setUser(data.user));
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);
  async function handleSignOut() {
    await supabase.auth.signOut();
    setUser(null);
  }
  if (activeLesson) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(LessonReader, { lesson: activeLesson, onBack: () => setActiveLesson(null) });
  }
  const lvl = LEVEL_STYLE[COURSE.level];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "relative overflow-hidden pt-24 pb-10 bg-gradient-hero", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 grid-bg opacity-40 pointer-events-none" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative mx-auto max-w-4xl px-5 lg:px-8", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { to: "/learn", className: "inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowLeft, { className: "h-3.5 w-3.5" }),
            "Torqwings Academy"
          ] }),
          user && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground hidden sm:block truncate max-w-[200px]", children: user.user_metadata?.full_name || user.email }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: handleSignOut, className: "rounded-lg border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground hover:bg-white/5", children: "Sign out" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "inline-block rounded px-2 py-0.5 mb-3", style: {
          fontSize: 10,
          fontWeight: 500,
          background: lvl.bg,
          color: lvl.color
        }, children: COURSE.level }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-3xl sm:text-4xl font-bold text-foreground leading-tight mb-3", children: COURSE.title }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-base text-muted-foreground leading-relaxed max-w-2xl mb-6", children: COURSE.description }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap gap-5 text-sm text-muted-foreground", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-1.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Clock, { className: "h-4 w-4" }),
            COURSE.hours,
            " hrs of content"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-1.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(BookOpen, { className: "h-4 w-4" }),
            COURSE.project_count,
            " projects"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-1.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Layers, { className: "h-4 w-4" }),
            COURSE.vertical
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-medium text-foreground", children: [
            "₹",
            COURSE.price.toLocaleString("en-IN"),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-1.5 font-normal text-muted-foreground text-xs", children: "· Free with Explorer tier" })
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("section", { className: "py-10", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mx-auto max-w-4xl px-5 lg:px-8", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mb-4 text-sm font-medium text-foreground", children: [
        "Course modules",
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "ml-2 text-muted-foreground font-normal", children: [
          "(",
          MODULES.length,
          " modules · 18 lessons)"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-3", children: MODULES.map((mod, idx) => /* @__PURE__ */ jsxRuntimeExports.jsx(ModuleRow, { mod, index: idx, onLessonClick: setActiveLesson }, mod.id)) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-8 rounded-xl bg-card p-6 text-center", style: {
        border: "0.5px solid var(--color-border)"
      }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-medium text-foreground mb-1", children: "Ready to access the full course?" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground mb-4", children: "Sign in to unlock all modules, projects, and your certificate path." }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col sm:flex-row justify-center gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: signInWithGoogle, className: "inline-flex items-center justify-center gap-2.5 rounded-lg border border-border bg-white px-6 py-2.5 text-sm font-medium text-gray-800 shadow-sm transition-colors hover:bg-gray-50 active:bg-gray-100", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { width: "18", height: "18", viewBox: "0 0 18 18", "aria-hidden": "true", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z", fill: "#4285F4" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z", fill: "#34A853" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z", fill: "#FBBC05" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 6.293C4.672 4.166 6.656 3.58 9 3.58z", fill: "#EA4335" })
            ] }),
            "Sign in with Google"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("a", { href: "mailto:academy@torqwings.com", className: "inline-flex items-center justify-center rounded-lg border border-border px-6 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-white/5", children: "Talk to an advisor" })
        ] })
      ] })
    ] }) })
  ] });
}
export {
  CourseDetailPage as component
};
