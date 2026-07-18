import { Fragment, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Trophy, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionBadge } from "@/components/SectionBadge";
import { AcademyWaitlistModal, type WaitlistSource } from "@/components/academy-waitlist-modal";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_layout/learn/")({
  component: LearnPage,
});

// ── Types ──────────────────────────────────────────────────────────────────

type CourseLevel = "Foundation" | "Intermediate" | "Intermediate/Advanced" | "Advanced" | "Expert";
type CourseStatus = "active" | "coming_soon";

type AcademyCourse = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  level: CourseLevel;
  price: number;
  hours: number;
  project_count: number;
  vertical: string | null;
  status: CourseStatus;
  outcome: string | null;
  order_index: number | null;
  prerequisite: string | null;
  modules: string[] | null;
};

// ── Static data ────────────────────────────────────────────────────────────

const LEVEL_STYLE: Record<CourseLevel, { background: string; color: string }> = {
  "Foundation":            { background: "#e6f1fb", color: "#185fa5" },
  "Intermediate":          { background: "#faeeda", color: "#854f0b" },
  "Intermediate/Advanced": { background: "#fde8e8", color: "#9b2c2c" },
  "Advanced":              { background: "#eeedfe", color: "#3c3489" },
  "Expert":                { background: "#e1f5ee", color: "#0f6e56" },
};

const STATUS_LABEL: Record<CourseStatus, string> = {
  active: "Enroll Now",
  coming_soon: "Wait for Launch",
};

const CREDENTIAL_PATH = [
  "Courses 1–4",
  "Capstone Hackathon",
  "Problem statement",
  "Two design patterns",
  "Hackathon Day pitch",
  "Fly & certify",
];

const BUNDLE_DISCOUNT = 0.22;

function formatINR(amount: number): string {
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

// ── Sub-components ─────────────────────────────────────────────────────────

function CourseCard({
  course, num, isLast, onJoinWaitlist,
}: {
  course: AcademyCourse;
  num: number;
  isLast: boolean;
  onJoinWaitlist: (courseId: string, source: WaitlistSource) => void;
}) {
  const lvl = LEVEL_STYLE[course.level];
  return (
    <div className="relative flex gap-5">
      {/* Numbered rail */}
      <div className="flex flex-col items-center">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-display font-bold"
          style={
            isLast
              ? { background: "#1baf7a", color: "white", fontSize: 15 }
              : { background: "#2a78d6", color: "white", fontSize: 15 }
          }
        >
          {num}
        </div>
        {!isLast && (
          <div className="w-px flex-1 bg-border mt-2" style={{ minHeight: 24 }} />
        )}
      </div>

      {/* Card */}
      <div
        className="flex-1 rounded-xl bg-card p-5 md:p-6 mb-6"
        style={{ border: "0.5px solid var(--color-border)" }}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <span
              className="inline-block rounded px-1.5 py-0.5"
              style={{ fontSize: 10, fontWeight: 500, background: lvl.background, color: lvl.color }}
            >
              {course.level}
            </span>
            {course.status === "coming_soon" && (
              <span
                className="ml-2 inline-block rounded px-1.5 py-0.5"
                style={{ fontSize: 10, fontWeight: 500, background: "var(--color-muted)", color: "var(--color-muted-foreground)" }}
              >
                Coming Soon
              </span>
            )}
            <h3 className="mt-2 text-lg md:text-xl font-semibold text-foreground leading-snug">
              {course.title}
            </h3>
            {course.prerequisite && (
              <p className="mt-1 text-xs text-muted-foreground">Prerequisite: {course.prerequisite}</p>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="text-lg font-display font-bold text-foreground">{formatINR(course.price)}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {course.hours} hrs · {course.project_count} projects
            </p>
          </div>
        </div>

        <p className="mt-4 text-sm text-muted-foreground leading-relaxed">{course.description}</p>

        {course.modules && course.modules.length > 0 && (
          <div className="mt-4">
            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Modules
            </p>
            <div className="flex flex-wrap gap-1.5">
              {course.modules.map((m) => (
                <span
                  key={m}
                  className="rounded-full px-2.5 py-1 text-[11px]"
                  style={{ background: "var(--color-muted)", color: "var(--color-foreground)" }}
                >
                  {m}
                </span>
              ))}
            </div>
          </div>
        )}

        {course.outcome && (
          <div className="mt-4 rounded-lg p-3" style={{ background: "rgba(27,175,122,0.08)" }}>
            <p className="text-[11px] font-medium" style={{ color: "#0f6e56" }}>Outcome</p>
            <p className="mt-0.5 text-xs leading-relaxed text-foreground/80">{course.outcome}</p>
          </div>
        )}

        <Button
          className="mt-4 w-full sm:w-auto"
          onClick={() => onJoinWaitlist(course.id, course.status === "active" ? "enroll" : "waitlist")}
        >
          {STATUS_LABEL[course.status]}
        </Button>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

function LearnPage() {
  const [courses, setCourses] = useState<AcademyCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [waitlistCourseId, setWaitlistCourseId] = useState<string | null>(null);
  const [waitlistSource, setWaitlistSource] = useState<WaitlistSource>("waitlist");

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("academy_courses" as any)
        .select("*")
        .order("order_index", { ascending: true });
      if (error) console.error("[Academy] failed to load courses:", error);
      setCourses((data ?? []) as unknown as AcademyCourse[]);
      setLoading(false);
    })();
  }, []);

  const totalModules = useMemo(() => courses.reduce((sum, c) => sum + (c.modules?.length ?? 0), 0), [courses]);
  const totalHours = useMemo(() => courses.reduce((sum, c) => sum + c.hours, 0), [courses]);
  const totalProjects = useMemo(() => courses.reduce((sum, c) => sum + c.project_count, 0), [courses]);
  const totalIndividualPrice = useMemo(() => courses.reduce((sum, c) => sum + Number(c.price), 0), [courses]);
  const bundlePrice = useMemo(() => totalIndividualPrice * (1 - BUNDLE_DISCOUNT), [totalIndividualPrice]);

  function openWaitlist(courseId: string | null, source: WaitlistSource = "waitlist") {
    setWaitlistCourseId(courseId);
    setWaitlistSource(source);
    setWaitlistOpen(true);
  }

  return (
    <>
      {/* ── 1. Hero ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-28 pb-16 lg:pt-36 lg:pb-20 bg-gradient-hero">
        <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" />
        <div className="relative mx-auto max-w-6xl px-5 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-5 items-start gap-12 md:gap-16">

            <div className="md:col-span-3">
              <SectionBadge label="TorqWings Academy" />

              <h1 className="text-4xl md:text-5xl font-bold text-foreground leading-tight" style={{ marginBottom: 12 }}>
                Become a TorqWings Certified AI Aerospace Engineer
              </h1>

              <p className="text-lg md:text-xl font-medium text-muted-foreground">
                Five courses. One hackathon. A credential that proves you can design, validate, and defend a
                real autonomous aerial platform — not just pass a quiz.
              </p>

              <div className="flex gap-8 mt-6">
                <div>
                  <p className="text-[22px] font-display font-bold text-foreground">{loading ? "…" : totalModules}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Modules</p>
                </div>
                <div>
                  <p className="text-[22px] font-display font-bold text-foreground">{loading ? "…" : `${totalHours} hrs`}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Content</p>
                </div>
                <div>
                  <p className="text-[22px] font-display font-bold text-foreground">{loading ? "…" : totalProjects}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Projects</p>
                </div>
              </div>
            </div>

            <div className="md:col-span-2">
              <div
                className="rounded-2xl p-6"
                style={{ background: "#0d3b5e", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <p className="uppercase" style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", color: "#7fd9b8" }}>
                  Bundle &amp; save {BUNDLE_DISCOUNT * 100}%
                </p>
                <div className="mt-3 flex items-baseline gap-2 flex-wrap">
                  <span className="text-3xl font-display font-bold text-white">
                    {loading ? "…" : formatINR(bundlePrice)}
                  </span>
                  <span className="text-sm text-white/50 line-through">
                    {loading ? "" : formatINR(totalIndividualPrice)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-white/70">All 5 courses — one credential path</p>
                <Button
                  className="mt-5 w-full h-11 border-0 hover:opacity-90"
                  style={{ background: "#1baf7a", color: "white" }}
                  onClick={() => openWaitlist(null)}
                >
                  Wait for Launch
                </Button>
                <p className="mt-3 text-[11px] text-white/50 text-center">
                  Prefer course-by-course? Individual pricing is listed below.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── 2. Course path ───────────────────────────────────────────────── */}
      <section className="py-16 lg:py-20">
        <div className="mx-auto max-w-5xl px-5 lg:px-8">
          <div className="text-center mb-4">
            <p className="uppercase text-muted-foreground" style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.08em" }}>
              The course path
            </p>
            <h2 className="mt-2 text-2xl md:text-3xl font-bold text-foreground">
              Five courses, one prerequisite chain, one credential
            </h2>
            <p className="mt-3 text-sm md:text-base text-muted-foreground">
              {loading ? "Loading courses…" : `${totalModules} modules · ${totalHours} hours · ${totalProjects} projects across all 5 courses`}
            </p>
          </div>

          <div className="mt-12">
            {courses.map((c, i) => (
              <CourseCard
                key={c.id}
                course={c}
                num={c.order_index ?? i + 1}
                isLast={i === courses.length - 1}
                onJoinWaitlist={openWaitlist}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── 3. Certification ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden py-20 lg:py-28" style={{ background: "#0d3b5e" }}>
        <div className="absolute inset-0 grid-bg opacity-20 pointer-events-none" />
        <div className="relative mx-auto max-w-4xl px-5 lg:px-8 text-center">
          <Trophy className="mx-auto h-10 w-10" style={{ color: "#1baf7a" }} aria-hidden="true" />
          <p className="mt-4 uppercase" style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", color: "#7fd9b8" }}>
            The credential
          </p>
          <h2 className="mt-3 text-3xl md:text-4xl font-bold text-white leading-tight">
            Earn the TorqWings Certified AI Aerospace Engineer Credential
          </h2>
          <p className="mt-5 text-base md:text-lg text-white/70 leading-relaxed max-w-2xl mx-auto">
            Complete Courses 1–4, then take on the Capstone: Aerial Intelligence Hackathon. Author your own
            real-world problem statement, get full unguided access to TorqWings Design Studio, and deliver two
            simulation-validated design patterns with a defensible, comparative recommendation. Present both at
            Hackathon Day — then fly the winning pattern's platform to earn your certification.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3 text-sm">
            {CREDENTIAL_PATH.map((step, i) => (
              <Fragment key={step}>
                <span className="rounded-full px-4 py-1.5" style={{ background: "rgba(255,255,255,0.08)", color: "white" }}>
                  {step}
                </span>
                {i < CREDENTIAL_PATH.length - 1 && (
                  <ArrowRight className="h-3.5 w-3.5 text-white/30" aria-hidden="true" />
                )}
              </Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. Bundle CTA ────────────────────────────────────────────────── */}
      <section className="border-t border-border bg-card py-16 lg:py-20 text-center">
        <div className="mx-auto max-w-2xl px-6">
          <p className="uppercase text-muted-foreground" style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.08em" }}>
            Get started
          </p>
          <h2 className="mt-2 text-2xl md:text-3xl font-bold text-foreground leading-tight">
            All 5 courses — {loading ? "…" : formatINR(bundlePrice)}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            {BUNDLE_DISCOUNT * 100}% off the {loading ? "…" : formatINR(totalIndividualPrice)} individual total. Prefer to enroll
            course-by-course? Individual pricing is listed above for each course.
          </p>
          <Button
            className="mt-6 h-11 px-8 border-0 hover:opacity-90"
            style={{ background: "#2a78d6", color: "white" }}
            onClick={() => openWaitlist(null)}
          >
            Wait for Launch
          </Button>
          <p className="mt-4 text-xs text-muted-foreground">
            Questions? Email{" "}
            <a
              href="mailto:academy@torqwings.com"
              className="underline underline-offset-2 hover:opacity-80 transition-opacity"
            >
              academy@torqwings.com
            </a>
          </p>
        </div>
      </section>

      <AcademyWaitlistModal
        open={waitlistOpen}
        onOpenChange={setWaitlistOpen}
        courseId={waitlistCourseId}
        courses={courses.map((c) => ({ id: c.id, title: c.title }))}
        source={waitlistSource}
      />
    </>
  );
}
