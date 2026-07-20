import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import type { AcademyModuleSection, AcademyUser } from "@/lib/academy-auth";
import { getModuleSections, getCourseSlugForModule } from "@/lib/academy-auth";
import { clearModuleProgress, getCompletedSectionIds, markSectionComplete } from "@/lib/academy/module-progress";
import { computeSectionStates } from "@/lib/academy/module-grid";
import {
  QuizSection, FinalTestSection, ErrorRetry, Skeleton, LockedSection,
} from "@/components/academy/module-player/SectionPlayers";
import { PlayerStyles } from "@/components/academy/module-player/PlayerStyles";
import { ModuleTopBar } from "@/components/academy/module-player/ModuleTopBar";
import { C, MONO, SANS } from "@/components/academy/module-player/theme";

export const Route = createFileRoute("/academy/module/$moduleId/quiz/$quizId")({
  component: AcademyQuizPage,
  validateSearch: (search: Record<string, unknown>) => ({
    slug: typeof search.slug === "string" ? search.slug : undefined,
  }),
});

function AcademyQuizPage() {
  const { moduleId, quizId } = Route.useParams();
  const { slug: searchSlug } = Route.useSearch();
  const navigate = useNavigate();

  const [user, setUser] = useState<AcademyUser | null>(null);
  const [sections, setSections] = useState<AcademyModuleSection[] | null>(null);
  const [sectionsError, setSectionsError] = useState(false);
  const [slug, setSlug] = useState<string | null>(searchSlug ?? null);
  const [assessmentInProgress, setAssessmentInProgress] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem("academy_user");
    if (!raw) {
      navigate({ to: "/academy" });
      return;
    }
    setUser(JSON.parse(raw));
  }, [navigate]);

  const loadSections = useCallback(async () => {
    setSectionsError(false);
    setSections(null);
    try {
      const rows = await getModuleSections(moduleId);
      setSections(rows);
    } catch (err) {
      console.error("[Academy] failed to load module sections:", err);
      setSectionsError(true);
    }
  }, [moduleId]);

  useEffect(() => {
    if (!user) return;
    loadSections();
  }, [user, loadSections]);

  useEffect(() => {
    if (slug || searchSlug) return;
    getCourseSlugForModule(moduleId)
      .then((s) => setSlug(s))
      .catch((err) => console.error("[Academy] failed to resolve course slug:", err));
  }, [moduleId, slug, searchSlug]);

  function backToModule() {
    if (assessmentInProgress) {
      const ok = window.confirm("Assessment in progress. Leave anyway?");
      if (!ok) return;
    }
    if (slug) navigate({ to: "/academy/courses/$slug/modules/$moduleId", params: { slug, moduleId } });
    else navigate({ to: "/academy/dashboard" });
  }

  const states = useMemo(() => (sections ? computeSectionStates(sections, getCompletedSectionIds(moduleId)) : []), [sections, moduleId]);
  const target = states.find((s) => s.section.id === quizId) ?? null;

  function handleQuizComplete() {
    markSectionComplete(moduleId, quizId);
    backToModule();
  }

  function handleFinalPass() {
    markSectionComplete(moduleId, quizId);
    navigate({ to: "/academy/dashboard" });
  }

  function handleRestudy() {
    setAssessmentInProgress(false);
    clearModuleProgress(moduleId);
    if (slug) navigate({ to: "/academy/courses/$slug/modules/$moduleId", params: { slug, moduleId } });
    else navigate({ to: "/academy/dashboard" });
  }

  if (!user) return null;

  return (
    <div style={{
      background: C.bg, color: C.text, minHeight: "100vh", fontFamily: SANS,
      backgroundImage: `radial-gradient(900px 500px at 78% -8%, rgba(255,176,32,.05), transparent 60%),
        linear-gradient(${C.line}22 1px, transparent 1px), linear-gradient(90deg, ${C.line}22 1px, transparent 1px)`,
      backgroundSize: "auto, 44px 44px, 44px 44px",
    }}>
      <PlayerStyles />

      <ModuleTopBar onBack={backToModule} backLabel="Back to module">
        <div style={{ padding: "0 clamp(20px,4vw,44px) 12px" }}>
          <button
            onClick={backToModule}
            style={{
              display: "flex", alignItems: "center", gap: 4, background: "transparent", border: "none",
              color: C.faint, font: `600 11px/1 ${MONO}`, letterSpacing: ".04em", cursor: "pointer", padding: 0,
            }}
          >
            <ChevronLeft size={13} /> Back to module
          </button>
        </div>
      </ModuleTopBar>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "clamp(28px,4vw,48px) clamp(20px,4vw,44px)" }}>
        {sections === null && !sectionsError && <Skeleton label="Loading quiz…" />}
        {sectionsError && <ErrorRetry message="Couldn't load this quiz. Try again." onRetry={loadSections} />}

        {sections !== null && !sectionsError && !target && (
          <p style={{ font: `400 13px/1.5 ${SANS}`, color: C.mute }}>This quiz couldn't be found.</p>
        )}

        {target && target.isLocked && <LockedSection title={target.section.title} />}

        {target && !target.isLocked && target.section.section_type === "final_test" && (
          <FinalTestSection
            section={target.section}
            user={user}
            moduleId={moduleId}
            onPass={handleFinalPass}
            onRestudy={handleRestudy}
            onInProgressChange={setAssessmentInProgress}
          />
        )}

        {target && !target.isLocked && target.section.section_type === "quiz" && (
          <QuizSection section={target.section} user={user} onComplete={handleQuizComplete} />
        )}
      </div>
    </div>
  );
}
