import { useState, Fragment } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { SectionBadge } from "@/components/SectionBadge";

export const Route = createFileRoute("/_layout/learn")({
  component: LearnPage,
});

// ── Types ──────────────────────────────────────────────────────────────────

type Level = "Beginner" | "Intermediate" | "Advanced" | "Professional";
type FilterOption = "All" | Level;

type Course = {
  title: string;
  level: Level;
  description: string;
  duration: string;
  projects: number;
  vertical: string;
  price: string;
  note: string | null;
  badge: string | null;
};

type LearningStep = {
  step: number;
  label: string;
  sub: string;
  teal: boolean;
};

// ── Static data ────────────────────────────────────────────────────────────

const COURSES: Course[] = [
  {
    title: "Drone Design Fundamentals",
    level: "Beginner",
    description:
      "Aerodynamics, frame types, propulsion basics, and payload math — take your first design from zero to BOM.",
    duration: "8 hrs",
    projects: 5,
    vertical: "All verticals",
    price: "₹1,999",
    note: "Free with Explorer tier",
    badge: null,
  },
  {
    title: "Component Selection Masterclass",
    level: "Intermediate",
    description:
      "Motors, ESCs, flight controllers, batteries — read datasheets, match specs, and build production-ready BOMs.",
    duration: "10 hrs",
    projects: 8,
    vertical: "All verticals",
    price: "₹2,999",
    note: "Included in Engineer tier",
    badge: null,
  },
  {
    title: "Flight Simulation & Validation",
    level: "Intermediate",
    description:
      "Use TorqWings simulation to stress-test designs across Indian terrain types, monsoon conditions, and payloads.",
    duration: "8 hrs",
    projects: 5,
    vertical: "All verticals",
    price: "₹2,999",
    note: null,
    badge: null,
  },
  {
    title: "DRDO Compliance & Defence UAV Design",
    level: "Advanced",
    description:
      "HAL specs, DRDO documentation, defence-grade payload integration, and the GuardSky vertical in depth.",
    duration: "12 hrs",
    projects: 4,
    vertical: "GuardSky",
    price: "₹4,999",
    note: "Included in Squadron tier",
    badge: "🛡️ Defence",
  },
  {
    title: "TorqWings Certified Designer",
    level: "Professional",
    description:
      "All courses bundled into one complete learning path — from zero to industry-recognised certified autonomous aerial platform design engineer.",
    duration: "44 hrs",
    projects: 25,
    vertical: "All verticals",
    price: "₹9,999",
    note: "Full certification path",
    badge: "🏆 Full path",
  },
];

const LEVEL_STYLE: Record<Level, { bg: string; color: string }> = {
  Beginner:     { bg: "#e6f1fb", color: "#185fa5" },
  Intermediate: { bg: "#faeeda", color: "#854f0b" },
  Advanced:     { bg: "#eeedfe", color: "#3c3489" },
  Professional: { bg: "#e1f5ee", color: "#0f6e56" },
};

const FILTERS: FilterOption[] = [
  "All",
  "Beginner",
  "Intermediate",
  "Advanced",
  "Professional",
];

const LEARNING_PATH: LearningStep[] = [
  { step: 1, label: "Explorer",    sub: "Free fundamentals",   teal: false },
  { step: 2, label: "Engineer",    sub: "Component mastery",   teal: false },
  { step: 3, label: "Simulator",   sub: "Validate designs",    teal: false },
  { step: 4, label: "Specialist",  sub: "Pick your vertical",  teal: false },
  { step: 5, label: "Certified ✦", sub: "Industry credential", teal: true  },
];

// ── Sub-components ─────────────────────────────────────────────────────────

function CourseCard({ course }: { course: Course }) {
  const lvl = LEVEL_STYLE[course.level];
  return (
    <div
      className="relative flex flex-col rounded-xl bg-card p-4 transition-colors hover:border-foreground/20"
      style={{ border: "0.5px solid var(--color-border)" }}
    >
      {/* Absolute corner badge */}
      {course.badge && (
        <span
          className="absolute top-3 right-3 rounded px-2 py-0.5"
          style={{ fontSize: 9, fontWeight: 500, background: "#faeeda", color: "#854f0b" }}
        >
          {course.badge}
        </span>
      )}

      {/* Level badge */}
      <span
        className="self-start rounded px-1.5 py-0.5"
        style={{ fontSize: 10, fontWeight: 500, background: lvl.bg, color: lvl.color }}
      >
        {course.level}
      </span>

      {/* Title */}
      <p className="mt-2 leading-snug text-foreground" style={{ fontSize: 13, fontWeight: 500 }}>
        {course.title}
      </p>

      {/* Description */}
      <p
        className="mt-1 mb-2 leading-relaxed text-muted-foreground line-clamp-2"
        style={{ fontSize: 11 }}
      >
        {course.description}
      </p>

      {/* Metadata */}
      <div className="mb-2 flex flex-wrap gap-2 text-muted-foreground" style={{ fontSize: 10 }}>
        <span>📹 {course.duration}</span>
        <span>📝 {course.projects} projects</span>
        <span>{course.vertical}</span>
      </div>

      {/* Price + buttons */}
      <div className="mt-auto border-t border-border pt-2">
        <p className="text-foreground" style={{ fontSize: 13, fontWeight: 500 }}>
          {course.price}
          {course.note && (
            <span className="ml-2 font-normal text-muted-foreground" style={{ fontSize: 10 }}>
              {course.note}
            </span>
          )}
        </p>
        <div className="mt-2 flex gap-1.5">
          <Button size="sm" variant="outline" className="h-7 flex-1" style={{ fontSize: 11 }}>
            Preview course
          </Button>
          <Button
            size="sm"
            className="h-7 flex-1 border-0 hover:opacity-90"
            style={{ fontSize: 11, background: "#2a78d6", color: "white" }}
          >
            Enroll now
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

function LearnPage() {
  const [filter, setFilter] = useState<FilterOption>("All");

  const visibleCourses =
    filter === "All" ? COURSES : COURSES.filter((c) => c.level === filter);

  return (
    <>
      {/* ── 1. Hero ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-28 pb-16 lg:pt-36 lg:pb-20 bg-gradient-hero">
        <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" />
        <div className="relative mx-auto max-w-6xl px-5 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-5 items-start gap-12 md:gap-16">

            {/* Left — badge + headline + subheadline */}
            <div className="md:col-span-3">
              <SectionBadge label="Torqwings Academy" />

              <h1 className="text-4xl md:text-5xl font-bold text-foreground leading-tight" style={{ marginBottom: 12 }}>
                Aerospace Intelligence is for Every Indian.{" "}
                <br className="hidden sm:block" />
                The Technology Above Must Be Built in India.
              </h1>

              <p className="text-lg md:text-xl font-medium text-muted-foreground">
                We Don't Just Teach You to Fly. We Teach You to Build Autonomous Aerial Platforms.
              </p>
            </div>

            {/* Right — teal divider + paragraphs + stats */}
            <div className="md:col-span-2">
              <div style={{ width: 32, height: 2, background: "#1baf7a", borderRadius: 2, marginBottom: 16 }} />

              <p className="text-sm md:text-base text-muted-foreground leading-relaxed" style={{ marginBottom: 12 }}>
                TorqWings Academy goes beyond pilot training. We are building
                India's first pipeline of autonomous aerial platform designers, engineers, and aerial
                intelligence professionals — from students and rural innovators to
                defence-adjacent researchers and aerospace startups.
              </p>

              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                Every course is rooted in real design, real components, and real AI
                — because India's aerospace future depends not on who flies the
                platform, but on who builds it.
              </p>

              <div className="flex gap-8 mt-6">
                <div>
                  <p className="text-[22px] font-display font-bold text-foreground">5</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Courses</p>
                </div>
                <div>
                  <p className="text-[22px] font-display font-bold text-foreground">38+ hrs</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Content</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── 2. Filter bar ────────────────────────────────────────────────── */}
      <section className="py-6 border-b border-border">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="rounded-full px-4 py-1.5 text-sm font-medium transition-colors"
                style={
                  filter === f
                    ? { background: "#2a78d6", color: "white", border: "1px solid #2a78d6" }
                    : {
                        background: "transparent",
                        border: "1px solid var(--color-border)",
                        color: "var(--color-foreground)",
                      }
                }
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3. Course card grid ──────────────────────────────────────────── */}
      <section className="py-10">
        <div className="mx-auto max-w-6xl px-6">
          {visibleCourses.length === 0 ? (
            <p className="py-12 text-center text-muted-foreground">
              No courses at this level yet — check back soon.
            </p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {visibleCourses.map((c) => (
                <CourseCard key={c.title} course={c} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── 4. AI callout banner ─────────────────────────────────────────── */}
      <section className="pb-8">
        <div className="mx-auto max-w-6xl px-6">
          <div
            className="flex items-start gap-3 bg-card px-6 py-4"
            style={{ borderLeft: "4px solid #1baf7a", borderRadius: "0 10px 10px 0" }}
          >
            <span className="mt-0.5 shrink-0 text-xl" aria-hidden="true">🤖</span>
            <div>
              <p className="text-foreground" style={{ fontSize: 13, fontWeight: 500 }}>
                Courses powered by TorqWings AI
              </p>
              <p
                className="mt-0.5 leading-relaxed text-muted-foreground"
                style={{ fontSize: 11 }}
              >
                Every module is generated from TorqWings' autonomous aerial platform design knowledge base —
                reviewed by domain experts and updated automatically as the platform evolves.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. Learning path ─────────────────────────────────────────────── */}
      <section className="border-t border-border bg-card py-12">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <p className="mb-8 text-base font-medium text-foreground">Your learning path</p>
          <div className="flex flex-col items-center sm:flex-row sm:items-start justify-center">
            {LEARNING_PATH.map((s, i) => (
              <Fragment key={s.step}>
                <div className="flex flex-col items-center text-center">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full"
                    style={
                      s.teal
                        ? { background: "#1baf7a", color: "white", fontSize: 13, fontWeight: 500 }
                        : {
                            background: "var(--color-muted)",
                            border: "0.5px solid var(--color-border)",
                            color: "var(--color-muted-foreground)",
                            fontSize: 13,
                            fontWeight: 500,
                          }
                    }
                  >
                    {s.step}
                  </div>
                  <p
                    className="mt-2 text-xs font-medium"
                    style={{ color: s.teal ? "#0f6e56" : "var(--color-foreground)" }}
                  >
                    {s.label}
                  </p>
                  <p
                    style={{
                      fontSize: 10,
                      color: s.teal ? "#0f6e56" : "var(--color-muted-foreground)",
                    }}
                  >
                    {s.sub}
                  </p>
                </div>
                {i < LEARNING_PATH.length - 1 && (
                  <>
                    <div className="hidden sm:block flex-1 h-px bg-border self-start mt-4 mx-2" />
                    <div className="sm:hidden w-px h-5 bg-border my-1" />
                  </>
                )}
              </Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* ── 6. CTA strip ─────────────────────────────────────────────────── */}
      <section className="border-t border-border bg-card py-12 text-center">
        <div className="mx-auto max-w-lg px-6">
          <p
            className="mb-2 uppercase text-muted-foreground"
            style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.08em" }}
          >
            GET STARTED
          </p>
          <h2 className="mb-2 text-[22px] font-medium text-foreground leading-tight">
            Begin your journey as an autonomous aerial platform designer with TorqWings Academy
          </h2>
          <p className="leading-relaxed text-muted-foreground" style={{ fontSize: 13 }}>
            Enroll in a course or drop a note to our advisor to find the right learning path at{" "}
            <a
              href="mailto:academy@torqwings.com"
              className="underline underline-offset-2 hover:opacity-80 transition-opacity"
            >
              academy@torqwings.com
            </a>
          </p>
        </div>
      </section>
    </>
  );
}
