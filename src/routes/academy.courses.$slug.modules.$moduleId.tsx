import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, Lock, Play } from "lucide-react";
import type { AcademyModuleSection, AcademyUser } from "@/lib/academy-auth";
import { getModuleSections } from "@/lib/academy-auth";
import { supabase } from "@/integrations/supabase/client";
import { getCompletedSectionIds, getSectionScore } from "@/lib/academy/module-progress";
import { buildModuleGrid, computeSectionStates, pairStatus, type PairStatus, type SectionState } from "@/lib/academy/module-grid";
import { ErrorRetry, Skeleton } from "@/components/academy/module-player/SectionPlayers";
import { ModuleTopBar } from "@/components/academy/module-player/ModuleTopBar";
import { C, DISPLAY, MONO, SANS } from "@/components/academy/module-player/theme";

export const Route = createFileRoute("/academy/courses/$slug/modules/$moduleId")({
  component: AcademyModuleGridPage,
});

type CellKind = "Lesson" | "Quiz" | "Final Assessment";

// A lesson/quiz completion just shows a check + the title. A quiz/final-test
// completion additionally surfaces its saved score when one is on record —
// module-progress.ts only has a score for section types that are ever
// scored, so lessons naturally fall through to the plain "title" case.
function completionLabel(moduleId: string, state: SectionState): string {
  if (state.section.section_type === "content") return state.section.title;
  const scoreInfo = getSectionScore(moduleId, state.section.id);
  if (scoreInfo && typeof scoreInfo.score === "number" && typeof scoreInfo.total === "number") {
    return `Test: ${state.section.title} · ${scoreInfo.score}/${scoreInfo.total}`;
  }
  return "Completed";
}

// Lives inside a PairCard/FinalAssessmentCard, which already carries the
// colored border/background for the row's state — this cell itself stays
// unstyled (no border of its own) so the two don't visually double up.
function PairChildCell({
  kind, number, state, moduleId, onOpen,
}: {
  kind: CellKind;
  number: number | null;
  state: SectionState | null;
  moduleId: string;
  onOpen: (state: SectionState) => void;
}) {
  if (!state) {
    return <div style={{ borderRadius: 10, border: `1px dashed ${C.line}`, minHeight: 52 }} />;
  }

  const { section, isLocked, isComplete, isCurrent } = state;
  const badge = number !== null ? String(number).padStart(2, "0") : "★";
  const label = isComplete ? completionLabel(moduleId, state) : section.title;
  const iconColor = isLocked ? C.faint : isComplete ? C.green : C.amber;

  return (
    <button
      type="button"
      onClick={() => onOpen(state)}
      disabled={isLocked}
      title={section.title}
      aria-label={`${kind} ${badge}: ${section.title}${isLocked ? " (locked)" : isComplete ? " (completed)" : ""}`}
      style={{
        display: "flex", alignItems: "center", gap: 9, textAlign: "left", width: "100%",
        background: "transparent", border: "none", borderRadius: 8, minWidth: 0,
        padding: "6px 4px", cursor: isLocked ? "default" : "pointer",
      }}
    >
      <span style={{ font: `700 10px/1 ${MONO}`, color: iconColor, flexShrink: 0, minWidth: 16 }}>
        {badge}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <div style={{ font: `500 9px/1 ${MONO}`, letterSpacing: ".08em", textTransform: "uppercase", color: C.faint, marginBottom: 3 }}>
          {kind}
        </div>
        <div style={{
          font: `600 12.5px/1.3 ${SANS}`, color: isLocked ? C.mute : C.text,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {label}
        </div>
      </span>
      {isLocked && <Lock size={14} color={C.faint} style={{ flexShrink: 0 }} />}
      {isComplete && <CheckCircle2 size={15} color={C.green} style={{ flexShrink: 0 }} />}
      {isCurrent && <Play size={14} color={C.amber} style={{ flexShrink: 0 }} />}
    </button>
  );
}

// Green only once both sides of the pair are done — grey (not amber) while
// the lesson is current but the quiz is still locked, since the two aren't
// "connected" yet.
function PairConnector({ status }: { status: PairStatus }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <ArrowRight size={16} color={status === "complete" ? C.green : C.line2} />
    </div>
  );
}

function PairCard({
  rowIndex, lesson, quiz, moduleId, onOpen,
}: {
  rowIndex: number;
  lesson: SectionState | null;
  quiz: SectionState | null;
  moduleId: string;
  onOpen: (state: SectionState) => void;
}) {
  const status = pairStatus(lesson, quiz);
  const borderColor = status === "complete" ? C.green : status === "current" ? C.amber : C.line2;
  const bg = status === "complete" ? C.greenSoft : C.panel;

  return (
    <div style={{
      border: `1px solid ${borderColor}`, background: bg, borderRadius: 12, padding: 12,
      opacity: status === "locked" ? 0.55 : 1,
    }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 24px 1fr", alignItems: "center", gap: 6 }}>
        <PairChildCell kind="Lesson" number={rowIndex + 1} state={lesson} moduleId={moduleId} onOpen={onOpen} />
        <PairConnector status={status} />
        <PairChildCell kind="Quiz" number={rowIndex + 1} state={quiz} moduleId={moduleId} onOpen={onOpen} />
      </div>
    </div>
  );
}

function FinalAssessmentCard({
  state, moduleId, onOpen,
}: {
  state: SectionState;
  moduleId: string;
  onOpen: (state: SectionState) => void;
}) {
  const borderColor = state.isLocked ? C.line2 : state.isComplete ? C.green : C.amber;
  const bg = state.isComplete ? C.greenSoft : C.panel;

  return (
    <div style={{
      border: `1px solid ${borderColor}`, background: bg, borderRadius: 12, padding: 12,
      opacity: state.isLocked ? 0.55 : 1,
    }}>
      <PairChildCell kind="Final Assessment" number={null} state={state} moduleId={moduleId} onOpen={onOpen} />
    </div>
  );
}

function AcademyModuleGridPage() {
  const { slug, moduleId } = Route.useParams();
  const navigate = useNavigate();

  const [user, setUser] = useState<AcademyUser | null>(null);
  const [moduleTitle, setModuleTitle] = useState<string | null>(null);
  const [sections, setSections] = useState<AcademyModuleSection[] | null>(null);
  const [sectionsError, setSectionsError] = useState(false);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const raw = sessionStorage.getItem("academy_user");
    if (!raw) {
      navigate({ to: "/academy" });
      return;
    }
    setUser(JSON.parse(raw));
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from("academy_course_modules" as any)
        .select("title")
        .eq("id", moduleId)
        .maybeSingle();
      if (error) console.error("[Academy] failed to load module:", error);
      setModuleTitle((data as any)?.title ?? null);
    })();
  }, [moduleId, user]);

  // Re-runs on every mount, which includes returning from a lesson/quiz
  // route — that's what picks up freshly-completed sections.
  const loadSections = useCallback(async () => {
    setSectionsError(false);
    setSections(null);
    try {
      const rows = await getModuleSections(moduleId);
      setSections(rows);
      setCompletedIds(getCompletedSectionIds(moduleId));
    } catch (err) {
      console.error("[Academy] failed to load module sections:", err);
      setSectionsError(true);
    }
  }, [moduleId]);

  useEffect(() => {
    if (!user) return;
    loadSections();
  }, [user, loadSections]);

  const states = useMemo(() => (sections ? computeSectionStates(sections, completedIds) : []), [sections, completedIds]);
  const grid = useMemo(() => buildModuleGrid(states), [states]);
  const progressPct = sections && sections.length > 0 ? (completedIds.size / sections.length) * 100 : 0;

  function openSection(state: SectionState) {
    if (state.isLocked) return;
    const { section } = state;
    if (section.section_type === "content") {
      navigate({
        to: "/academy/module/$moduleId/lesson/$lessonId",
        params: { moduleId, lessonId: section.id },
        search: { slug },
      });
    } else {
      navigate({
        to: "/academy/module/$moduleId/quiz/$quizId",
        params: { moduleId, quizId: section.id },
        search: { slug },
      });
    }
  }

  if (!user) return null;

  return (
    <div style={{
      background: C.bg, color: C.text, minHeight: "100vh", fontFamily: SANS,
      backgroundImage: `radial-gradient(900px 500px at 78% -8%, rgba(255,176,32,.05), transparent 60%),
        linear-gradient(${C.line}22 1px, transparent 1px), linear-gradient(90deg, ${C.line}22 1px, transparent 1px)`,
      backgroundSize: "auto, 44px 44px, 44px 44px",
    }}>
      <ModuleTopBar onBack={() => navigate({ to: "/academy/dashboard" })} backLabel="Back to courses" />

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "clamp(28px,4vw,48px) clamp(20px,4vw,44px)" }}>
        {moduleTitle && (
          <h1 style={{ font: `700 clamp(20px,3vw,26px)/1.2 ${DISPLAY}`, color: C.text, margin: "0 0 24px" }}>{moduleTitle}</h1>
        )}

        {sections === null && !sectionsError && <Skeleton label="Loading module…" />}
        {sectionsError && <ErrorRetry message="Couldn't load this module. Try again." onRetry={loadSections} />}

        {sections !== null && sections.length === 0 && (
          <p style={{ font: `400 13px/1.5 ${SANS}`, color: C.mute }}>This module doesn't have any sections yet.</p>
        )}

        {sections !== null && sections.length > 0 && (
          <>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 10 }}>
              <span style={{ font: `500 20px/1 ${DISPLAY}`, color: C.text }}>{completedIds.size}</span>
              <span style={{ font: `400 12px/1 ${SANS}`, color: C.mute }}>of {sections.length} sections completed</span>
            </div>
            <div style={{ height: 8, borderRadius: 4, background: `${C.line2}66`, overflow: "hidden", marginBottom: 22 }}>
              <div style={{
                height: "100%", borderRadius: 4, background: C.amber,
                width: `${progressPct}%`, transition: "width 0.3s ease",
              }} />
            </div>

            {grid.rows.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 24px 1fr", gap: "0 6px", marginBottom: 8 }}>
                <div style={{ font: `600 10px/1 ${MONO}`, letterSpacing: ".1em", textTransform: "uppercase", color: C.faint, paddingLeft: 6 }}>
                  Lessons
                </div>
                <div />
                <div style={{ font: `600 10px/1 ${MONO}`, letterSpacing: ".1em", textTransform: "uppercase", color: C.faint, paddingLeft: 6 }}>
                  Quizzes
                </div>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {grid.rows.map((row) => (
                <PairCard
                  key={row.rowIndex}
                  rowIndex={row.rowIndex}
                  lesson={row.lesson}
                  quiz={row.quiz}
                  moduleId={moduleId}
                  onOpen={openSection}
                />
              ))}
            </div>

            {grid.finalTest && (
              <div style={{ marginTop: 12 }}>
                <FinalAssessmentCard state={grid.finalTest} moduleId={moduleId} onOpen={openSection} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
