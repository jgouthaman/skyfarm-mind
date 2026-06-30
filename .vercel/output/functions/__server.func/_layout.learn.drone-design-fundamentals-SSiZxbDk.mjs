import { r as reactExports, j as jsxRuntimeExports } from "./_libs/react.mjs";
import { L as Link } from "./_libs/tanstack__react-router.mjs";
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
const COURSE = {
  title: "Drone Design Fundamentals",
  description: "Aerodynamics, frame types, propulsion basics, and payload math — take your first design from zero to BOM.",
  level: "Beginner",
  price: 1999,
  hours: 8,
  project_count: 5,
  vertical: "All verticals"
};
const LESSON_1_1_CONTENT = `# Introduction to Autonomous Aerial Platforms

Welcome to Drone Design Fundamentals — India's first structured curriculum for autonomous aerial platform designers. This lesson establishes the conceptual vocabulary you'll build on throughout the course.

## What is an Autonomous Aerial Platform?

An **autonomous aerial platform (AAP)** is an unmanned aircraft that can plan and execute flight operations — takeoff, navigation, task performance, and landing — without continuous human control inputs. The platform uses onboard sensors, processing systems, and software algorithms to make real-time decisions within a defined mission envelope.

This is fundamentally different from a **remotely piloted aircraft (RPA)**, where a human operator provides continuous flight inputs. AAPs operate on *mission logic*: a human defines the objective and the platform executes it.

> You are not training to be a pilot. You are training to be the engineer who designs the platform the autonomous system operates.

## The Four Subsystems Every AAP Designer Must Know

Every autonomous aerial platform — from a 250 g agricultural sprayer to a 25 kg defence surveillance drone — is built from four interdependent subsystems. Understanding how they affect each other is the foundation of good platform design.

### 1. Airframe

The physical structure that generates lift, houses all subsystems, and survives the operating environment. Frame geometry (quadrotor, hexarotor, fixed-wing, VTOL hybrid), material selection (carbon fibre, aluminium, injection-moulded polycarbonate), and structural rigidity determine what you can carry, how far you can fly, and what conditions the platform can survive.

### 2. Propulsion System

Motors, electronic speed controllers (ESCs), propellers, and the battery pack that powers them. The propulsion system converts electrical energy into mechanical thrust. Getting propulsion sizing right — matching motor KV rating, propeller pitch and diameter, and battery chemistry to total platform weight — is the single most consequential design decision you will make.

### 3. Avionics & Flight Controller

The brain of the platform. A flight controller reads sensor data from an IMU (accelerometers and gyroscopes), GPS, barometer, and optionally magnetometers and optical flow sensors. It runs stabilisation and navigation algorithms at update rates of 400–8000 Hz, outputting precise motor commands to hold attitude, track waypoints, and respond to disturbances. Common flight controller stacks used in India include Pixhawk (running ArduPilot or PX4), Cube Orange, and proprietary stacks built for specific verticals.

### 4. Payload & Mission System

The camera, spray nozzle assembly, LiDAR scanner, thermal sensor, or communication relay that makes the platform operationally useful. Payload design should drive every other subsystem decision — this is the **requirements-first** principle you will practise throughout this course.

## Why India Needs Platform Designers

India's drone economy is growing rapidly across every sector. The bottleneck is not operators — it is **engineers who can design, build, certify, and iterate** platforms suited to Indian conditions, regulations, and mission profiles.

Consider what each vertical demands:

- **AgriSky** — Precision spray drones for paddy, cotton, sugarcane, and horticulture. Variable canopy height, humid conditions, and remote field locations define the design constraints.
- **InfraSky** — Survey and inspection drones for railways, highways, power transmission corridors, and urban construction. Long range, high-resolution imaging, and BVLOS capability matter here.
- **GuardSky** — Persistent surveillance platforms for border management, coastal monitoring, and critical infrastructure protection. Extended endurance, low acoustic signature, and encrypted datalinks are the design requirements.
- **GeoSky** — High-accuracy mapping drones for cadastral surveys, disaster response, and urban planning. Sub-centimetre positioning and systematic coverage patterns define mission success.

A platform designer who understands the fundamentals can develop solutions for any of these verticals.

## The TorqWings Design Workflow

Throughout this course you will follow TorqWings' **requirements-first workflow**:

1. Define the mission profile — range, endurance, payload mass, and operating environment
2. Select the frame type that fits the mission geometry
3. Size the propulsion system by working backwards from all-up weight
4. Budget the payload and verify thrust-to-weight margin
5. Generate a production-ready BOM from real component data
6. Validate the design in simulation before any hardware procurement

This workflow is implemented directly inside TorqWings Design Studio. By the end of this course you will have completed it end-to-end for a real mission scenario.

---

*Next lesson: Frame Types and the physics of lift — why the geometry of your frame determines more about your drone's behaviour than any individual component choice.*`;
const MODULES = [{
  id: "m1",
  title: "Introduction to Autonomous Aerial Platforms",
  description: "Foundational understanding of what autonomous aerial platforms are, how they differ from remotely piloted drones, and why they matter for India.",
  order_index: 1,
  lessons: [{
    id: "l1",
    title: "Introduction to Autonomous Aerial Platforms",
    content: LESSON_1_1_CONTENT,
    order_index: 1,
    is_free: true
  }]
}, {
  id: "m2",
  title: "Frame Types & Aerodynamics",
  description: "Explore multirotor, fixed-wing, and VTOL frame configurations and the aerodynamic principles that govern each.",
  order_index: 2,
  lessons: [{
    id: "l2a",
    title: "Multirotor geometry and stability",
    content: null,
    order_index: 1,
    is_free: false
  }, {
    id: "l2b",
    title: "Fixed-wing lift fundamentals",
    content: null,
    order_index: 2,
    is_free: false
  }, {
    id: "l2c",
    title: "VTOL hybrid trade-offs",
    content: null,
    order_index: 3,
    is_free: false
  }]
}, {
  id: "m3",
  title: "Propulsion Systems",
  description: "Motors, ESCs, propellers, and batteries — how to size and match a propulsion stack to your frame and payload.",
  order_index: 3,
  lessons: [{
    id: "l3a",
    title: "Motor KV rating and selection",
    content: null,
    order_index: 1,
    is_free: false
  }, {
    id: "l3b",
    title: "ESC protocols and configuration",
    content: null,
    order_index: 2,
    is_free: false
  }, {
    id: "l3c",
    title: "Propeller pitch, diameter, and efficiency",
    content: null,
    order_index: 3,
    is_free: false
  }, {
    id: "l3d",
    title: "Battery chemistry and capacity sizing",
    content: null,
    order_index: 4,
    is_free: false
  }]
}, {
  id: "m4",
  title: "Payload & Weight Budgeting",
  description: "Calculate thrust-to-weight ratios, budget payload mass, and design for real-world Indian mission profiles.",
  order_index: 4,
  lessons: [{
    id: "l4a",
    title: "All-up weight and thrust margin",
    content: null,
    order_index: 1,
    is_free: false
  }, {
    id: "l4b",
    title: "Mission profile definition",
    content: null,
    order_index: 2,
    is_free: false
  }, {
    id: "l4c",
    title: "Payload integration constraints",
    content: null,
    order_index: 3,
    is_free: false
  }]
}, {
  id: "m5",
  title: "Building Your First BOM",
  description: "Compile a production-ready Bill of Materials using the TorqWings component database and design tools.",
  order_index: 5,
  lessons: [{
    id: "l5a",
    title: "Component sourcing in India",
    content: null,
    order_index: 1,
    is_free: false
  }, {
    id: "l5b",
    title: "BOM structure and cost estimation",
    content: null,
    order_index: 2,
    is_free: false
  }, {
    id: "l5c",
    title: "TorqWings Design Studio BOM workflow",
    content: null,
    order_index: 3,
    is_free: false
  }]
}, {
  id: "m6",
  title: "Introduction to Flight Simulation",
  description: "Validate your design in TorqWings simulation environment before committing to hardware.",
  order_index: 6,
  lessons: [{
    id: "l6a",
    title: "Setting up your first simulation",
    content: null,
    order_index: 1,
    is_free: false
  }, {
    id: "l6b",
    title: "Reading simulation outputs",
    content: null,
    order_index: 2,
    is_free: false
  }, {
    id: "l6c",
    title: "Iterating based on simulation results",
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
  if (activeLesson) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(LessonReader, { lesson: activeLesson, onBack: () => setActiveLesson(null) });
  }
  const lvl = LEVEL_STYLE[COURSE.level];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "relative overflow-hidden pt-24 pb-10 bg-gradient-hero", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 grid-bg opacity-40 pointer-events-none" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative mx-auto max-w-4xl px-5 lg:px-8", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { to: "/learn", className: "inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowLeft, { className: "h-3.5 w-3.5" }),
          "Torqwings Academy"
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
          " modules)"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-3", children: MODULES.map((mod, idx) => /* @__PURE__ */ jsxRuntimeExports.jsx(ModuleRow, { mod, index: idx, onLessonClick: setActiveLesson }, mod.id)) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-8 rounded-xl bg-card p-6 text-center", style: {
        border: "0.5px solid var(--color-border)"
      }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-medium text-foreground mb-1", children: "Ready to access the full course?" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground mb-4", children: "Enroll to unlock all modules, projects, and your certificate path." }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-center gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "rounded-lg px-6 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90", style: {
            background: "#2a78d6"
          }, children: "Enroll now" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("a", { href: "mailto:academy@torqwings.com", className: "rounded-lg border border-border px-6 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-white/5", children: "Talk to an advisor" })
        ] })
      ] })
    ] }) })
  ] });
}
export {
  CourseDetailPage as component
};
