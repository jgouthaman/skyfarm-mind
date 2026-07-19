import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, Plane, Trophy, Loader2, RotateCcw, Lock } from "lucide-react";
import type { AcademyModuleSection, AcademyUser } from "@/lib/academy-auth";
import { getModuleSections, saveQuizAttempt, setModuleComplete } from "@/lib/academy-auth";
import { streamAnthropicContent, generateAnthropicQuestions, type GeneratedQuestion } from "@/lib/academy/anthropic-client";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/academy/courses/$slug/modules/$moduleId")({
  component: AcademyModulePlayerPage,
});

const C = {
  bg: "#080B12", panel: "#0E131E",
  line: "#1E2838", line2: "#2A3648",
  text: "#E8ECF2", mute: "#8A94A6", faint: "#5C6678",
  amber: "#FFB020", amberSoft: "rgba(255,176,32,0.10)",
  green: "#4FD08A", greenSoft: "rgba(79,208,138,0.10)",
  red: "#F27D7D", redSoft: "rgba(242,125,125,0.10)",
};
const DISPLAY = "'Space Grotesk', system-ui, -apple-system, sans-serif";
const MONO = "'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace";
const SANS = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
const OPTION_KEYS = ["a", "b", "c", "d"] as const;
const PASS_MARK = 22;
const FINAL_TEST_COUNT = 25;
const QUIZ_COUNT = 3;
const QUIZ_PASS_MARK = 2;

// ---------- shared small pieces ----------

function ErrorRetry({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div style={{
      border: `1px solid ${C.red}44`, background: C.redSoft, borderRadius: 12,
      padding: "18px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap",
    }}>
      <span style={{ font: `500 13px/1.5 ${SANS}`, color: C.red }}>{message}</span>
      <button
        onClick={onRetry}
        style={{
          background: "transparent", color: C.red, border: `1px solid ${C.red}66`, borderRadius: 7,
          padding: "7px 14px", font: `600 12px/1 ${SANS}`, cursor: "pointer", flexShrink: 0,
        }}
      >
        Retry
      </button>
    </div>
  );
}

function Skeleton({ label }: { label: string }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 9, color: C.mute, font: `500 13px/1 ${SANS}` }}>
        <Loader2 size={15} className="tw-academy-player-spin" color={C.amber} /> {label}
      </div>
      <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        {[100, 92, 96, 60].map((w, i) => (
          <div key={i} style={{ height: 12, width: `${w}%`, borderRadius: 6, background: C.line2, opacity: 0.5 }} />
        ))}
      </div>
    </div>
  );
}

function ContinueButton({ onClick, disabled, label = "Continue" }: { onClick: () => void; disabled?: boolean; label?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        marginTop: 22, width: "100%", background: C.amber, color: "#0A0A0A", border: "none", borderRadius: 9,
        padding: "13px 18px", font: `600 14px/1 ${SANS}`, cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {label} →
    </button>
  );
}

function scoreFromAnswers(answers: Record<number, string>, questions: GeneratedQuestion[]): number {
  return Object.entries(answers).reduce(
    (acc, [i, v]) => acc + (questions[Number(i)]?.correct === v ? 1 : 0),
    0,
  );
}

// ---------- content section ----------

function ContentSection({ section, onComplete }: { section: AcademyModuleSection; onComplete: () => void }) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<"loading" | "streaming" | "done" | "error">("loading");

  const generate = useCallback(async () => {
    setStatus("loading");
    setText("");
    try {
      let started = false;
      await streamAnthropicContent(section.topic_brief, (acc) => {
        if (!started) { started = true; setStatus("streaming"); }
        setText(acc);
      });
      setStatus("done");
    } catch (err) {
      console.error("[Academy] content generation failed:", err);
      setStatus("error");
    }
  }, [section.topic_brief]);

  useEffect(() => { generate(); }, [generate]);

  return (
    <div>
      <h2 style={{ font: `700 clamp(20px,3vw,26px)/1.2 ${DISPLAY}`, color: C.text, margin: "0 0 18px" }}>{section.title}</h2>

      {status === "loading" && <Skeleton label="Generating content…" />}
      {status === "error" && <ErrorRetry message="Content generation failed. Try again." onRetry={generate} />}
      {(status === "streaming" || status === "done") && (
        <div className="tw-academy-player-prose" style={{ font: `400 15px/1.7 ${SANS}`, color: C.text }}>
          <ReactMarkdown>{text}</ReactMarkdown>
        </div>
      )}
      {status === "done" && <ContinueButton onClick={onComplete} />}
    </div>
  );
}

// ---------- quiz section (3 questions, one at a time) ----------

function QuizSection({
  section, user, onComplete,
}: {
  section: AcademyModuleSection;
  user: AcademyUser;
  onComplete: () => void;
}) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [finished, setFinished] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const qs = await generateAnthropicQuestions(section.topic_brief, QUIZ_COUNT, 1000);
      setQuestions(qs);
      setQIndex(0);
      setAnswers({});
      setFinished(false);
      setStatus("ready");
    } catch (err) {
      console.error("[Academy] quiz generation failed:", err);
      setStatus("error");
    }
  }, [section.topic_brief]);

  useEffect(() => { load(); }, [load]);

  const score = useMemo(() => scoreFromAnswers(answers, questions), [answers, questions]);

  function selectOption(key: string) {
    if (qIndex in answers) return;
    setAnswers((a) => ({ ...a, [qIndex]: key }));
  }

  function goNext() {
    if (qIndex + 1 < questions.length) setQIndex((i) => i + 1);
    else setFinished(true);
  }

  async function handleContinue() {
    setSaving(true);
    try {
      await saveQuizAttempt({
        user_id: user.id,
        section_id: section.id,
        generated_questions: questions,
        user_answers: answers,
        score,
        total: questions.length,
        passed: score >= QUIZ_PASS_MARK,
      });
    } catch (err) {
      console.error("[Academy] failed to save quiz attempt:", err);
    } finally {
      setSaving(false);
      onComplete();
    }
  }

  if (status === "loading") return <Skeleton label="Generating questions…" />;
  if (status === "error") return <ErrorRetry message="Failed to generate questions." onRetry={load} />;

  if (finished) {
    const scoreColor = score >= QUIZ_PASS_MARK ? C.green : score === 1 ? C.amber : C.red;
    const scoreBg = score >= QUIZ_PASS_MARK ? C.greenSoft : score === 1 ? C.amberSoft : C.redSoft;
    return (
      <div>
        <span style={{
          font: `600 10px/1 ${MONO}`, letterSpacing: ".1em", textTransform: "uppercase", color: C.amber,
          background: C.amberSoft, border: `1px solid ${C.amber}33`, padding: "5px 8px", borderRadius: 5,
        }}>
          Test Your Knowledge
        </span>
        <h2 style={{ font: `700 22px/1.2 ${DISPLAY}`, color: C.text, margin: "12px 0 16px" }}>{section.title}</h2>
        <div style={{
          border: `1px solid ${scoreColor}44`, background: scoreBg, borderRadius: 12,
          padding: "18px 20px", textAlign: "center",
        }}>
          <span style={{ font: `700 20px/1 ${DISPLAY}`, color: scoreColor }}>{score} of {questions.length} correct</span>
        </div>
        <ContinueButton onClick={handleContinue} disabled={saving} />
      </div>
    );
  }

  const q = questions[qIndex];
  const answered = qIndex in answers;
  const selectedKey = answers[qIndex];

  return (
    <div>
      <span style={{
        font: `600 10px/1 ${MONO}`, letterSpacing: ".1em", textTransform: "uppercase", color: C.amber,
        background: C.amberSoft, border: `1px solid ${C.amber}33`, padding: "5px 8px", borderRadius: 5,
      }}>
        Test Your Knowledge
      </span>
      <h2 style={{ font: `700 22px/1.2 ${DISPLAY}`, color: C.text, margin: "12px 0 4px" }}>{section.title}</h2>
      <p style={{ font: `500 11px/1 ${MONO}`, color: C.faint, marginBottom: 18 }}>
        Question {qIndex + 1} of {questions.length}
      </p>

      <p style={{ font: `500 15px/1.5 ${SANS}`, color: C.text, marginBottom: 14 }}>{q.question}</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {OPTION_KEYS.map((key) => {
          let border = C.line2;
          let bg = "transparent";
          let textColor = C.text;
          if (answered) {
            if (key === q.correct) { border = C.green; bg = C.greenSoft; textColor = C.green; }
            else if (key === selectedKey) { border = C.red; bg = C.redSoft; textColor = C.red; }
          }
          return (
            <button
              key={key}
              disabled={answered}
              onClick={() => selectOption(key)}
              style={{
                textAlign: "left", display: "flex", gap: 10, alignItems: "flex-start",
                border: `1px solid ${border}`, background: bg, color: textColor, borderRadius: 9,
                padding: "11px 14px", font: `500 14px/1.4 ${SANS}`, cursor: answered ? "default" : "pointer",
                transition: "all .15s",
              }}
            >
              <span style={{ font: `600 12px/1 ${MONO}`, color: C.faint, flexShrink: 0, textTransform: "uppercase" }}>{key}</span>
              {q.options[key]}
            </button>
          );
        })}
      </div>

      {answered && (
        <p style={{ font: `400 13px/1.6 ${SANS}`, color: C.mute, marginTop: 14, borderTop: `1px solid ${C.line}`, paddingTop: 14 }}>
          {q.explanation}
        </p>
      )}

      {answered && (
        <ContinueButton onClick={goNext} label={qIndex + 1 < questions.length ? "Next question" : "See results"} />
      )}
    </div>
  );
}

// ---------- final test (25 questions, all at once, reveal on submit) ----------

function FinalTestSection({
  section, user, moduleId, onPass, onRestudy, onInProgressChange,
}: {
  section: AcademyModuleSection;
  user: AcademyUser;
  moduleId: string;
  onPass: () => void;
  onRestudy: () => void;
  onInProgressChange: (inProgress: boolean) => void;
}) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const topRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const qs = await generateAnthropicQuestions(section.topic_brief, FINAL_TEST_COUNT, 4000);
      setQuestions(qs);
      setAnswers({});
      setSubmitted(false);
      setStatus("ready");
    } catch (err) {
      console.error("[Academy] final assessment generation failed:", err);
      setStatus("error");
    }
  }, [section.topic_brief]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    onInProgressChange(status === "ready" && !submitted && Object.keys(answers).length > 0);
    return () => onInProgressChange(false);
  }, [status, submitted, answers, onInProgressChange]);

  const score = useMemo(() => scoreFromAnswers(answers, questions), [answers, questions]);
  const allAnswered = questions.length > 0 && Object.keys(answers).length === questions.length;
  const passed = score >= PASS_MARK;

  function selectOption(qIdx: number, key: string) {
    if (submitted) return;
    setAnswers((a) => ({ ...a, [qIdx]: key }));
  }

  async function submit() {
    setSubmitted(true);
    setSaving(true);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    try {
      await saveQuizAttempt({
        user_id: user.id,
        section_id: section.id,
        generated_questions: questions,
        user_answers: answers,
        score,
        total: questions.length,
        passed,
      });
      if (passed) await setModuleComplete(user.id, moduleId, true);
    } catch (err) {
      console.error("[Academy] failed to save final assessment:", err);
    } finally {
      setSaving(false);
    }
  }

  if (status === "loading") return <Skeleton label="Generating assessment…" />;
  if (status === "error") return <ErrorRetry message="Failed to generate questions." onRetry={load} />;

  return (
    <div ref={topRef}>
      <h2 style={{ font: `700 24px/1.2 ${DISPLAY}`, color: C.text, margin: "0 0 4px" }}>Final Assessment</h2>
      <p style={{ font: `500 11px/1 ${MONO}`, color: C.faint, marginBottom: 22 }}>
        {FINAL_TEST_COUNT} questions · Pass mark: {PASS_MARK}/{FINAL_TEST_COUNT} ({Math.round((PASS_MARK / FINAL_TEST_COUNT) * 100)}%)
      </p>

      {submitted && (
        <div style={{
          border: `1px solid ${passed ? C.green : C.amber}44`, background: passed ? C.greenSoft : C.amberSoft,
          borderRadius: 12, padding: "22px 20px", marginBottom: 24, textAlign: "center",
        }}>
          {passed ? (
            <>
              <Trophy size={30} color={C.green} style={{ marginBottom: 8 }} />
              <h3 style={{ font: `700 20px/1.3 ${DISPLAY}`, color: C.green, margin: 0 }}>🎉 Congratulations! You passed.</h3>
              <p style={{ font: `600 14px/1 ${MONO}`, color: C.green, marginTop: 10 }}>You scored {score}/{questions.length}</p>
              <button
                onClick={onPass}
                style={{
                  marginTop: 18, background: C.amber, color: "#0A0A0A", border: "none", borderRadius: 8,
                  padding: "11px 20px", font: `600 13px/1 ${SANS}`, cursor: "pointer",
                }}
              >
                Back to My Courses →
              </button>
            </>
          ) : (
            <>
              <h3 style={{ font: `700 18px/1.3 ${DISPLAY}`, color: C.amber, margin: 0 }}>
                You scored {score}/{questions.length}. You need {PASS_MARK} to pass.
              </h3>
              <button
                onClick={onRestudy}
                disabled={saving}
                style={{
                  marginTop: 18, display: "inline-flex", alignItems: "center", gap: 8,
                  background: "transparent", color: C.amber, border: `1px solid ${C.amber}66`, borderRadius: 8,
                  padding: "11px 20px", font: `600 13px/1 ${SANS}`, cursor: "pointer",
                }}
              >
                <RotateCcw size={14} /> Restudy Module
              </button>
            </>
          )}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingBottom: submitted ? 0 : 90 }}>
        {questions.map((q, qi) => (
          <div key={qi} style={{ border: `1px solid ${C.line}`, borderRadius: 10, padding: "14px 16px" }}>
            <p style={{ font: `500 14px/1.5 ${SANS}`, color: C.text, marginBottom: 10 }}>{qi + 1}. {q.question}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {OPTION_KEYS.map((key) => {
                const selected = answers[qi] === key;
                let border = selected ? C.amber : C.line2;
                let bg = selected ? C.amberSoft : "transparent";
                let color = selected ? C.amber : C.text;
                if (submitted) {
                  if (key === q.correct) { border = C.green; bg = C.greenSoft; color = C.green; }
                  else if (selected) { border = C.red; bg = C.redSoft; color = C.red; }
                  else { border = C.line2; bg = "transparent"; color = C.mute; }
                }
                return (
                  <button
                    key={key}
                    onClick={() => selectOption(qi, key)}
                    disabled={submitted}
                    style={{
                      textAlign: "left", display: "flex", gap: 10, alignItems: "flex-start",
                      border: `1px solid ${border}`, background: bg, color, borderRadius: 8, padding: "8px 12px",
                      font: `500 13px/1.4 ${SANS}`, cursor: submitted ? "default" : "pointer",
                    }}
                  >
                    <span style={{ font: `600 11px/1 ${MONO}`, flexShrink: 0, textTransform: "uppercase" }}>{key}</span>
                    {q.options[key]}
                  </button>
                );
              })}
            </div>
            {submitted && (
              <p style={{ font: `400 12px/1.6 ${SANS}`, color: C.mute, marginTop: 10, borderTop: `1px solid ${C.line}`, paddingTop: 10 }}>
                {q.explanation}
              </p>
            )}
          </div>
        ))}
      </div>

      {!submitted && (
        <div style={{
          position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 6,
          background: "rgba(8,11,18,.92)", backdropFilter: "blur(10px)", borderTop: `1px solid ${C.line}`,
          padding: "16px clamp(20px,4vw,44px)", display: "flex", justifyContent: "center",
        }}>
          <div style={{ width: "100%", maxWidth: 760 }}>
            <button
              onClick={submit}
              disabled={!allAnswered || saving}
              style={{
                width: "100%", background: C.amber, color: "#0A0A0A", border: "none", borderRadius: 9,
                padding: "13px 18px", font: `600 14px/1 ${SANS}`, cursor: allAnswered && !saving ? "pointer" : "default",
                opacity: allAnswered ? 1 : 0.4,
              }}
            >
              {allAnswered ? "Submit Assessment" : `Answer all questions to submit (${Object.keys(answers).length}/${questions.length})`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- locked placeholder ----------

function LockedSection({ title }: { title: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, color: C.faint }}>
      <Lock size={16} />
      <div>
        <div style={{ font: `600 14px/1.4 ${SANS}`, color: C.mute }}>{title}</div>
        <div style={{ font: `400 12px/1.4 ${SANS}` }}>Complete the previous section to unlock.</div>
      </div>
    </div>
  );
}

// ---------- page ----------

function AcademyModulePlayerPage() {
  const { moduleId } = Route.useParams();
  const navigate = useNavigate();

  const [user, setUser] = useState<AcademyUser | null>(null);
  const [moduleTitle, setModuleTitle] = useState<string | null>(null);
  const [sections, setSections] = useState<AcademyModuleSection[] | null>(null);
  const [sectionsError, setSectionsError] = useState(false);
  const [completedSections, setCompletedSections] = useState<Set<string>>(new Set());
  const [frontierIndex, setFrontierIndex] = useState(0);
  const [resetKey, setResetKey] = useState(0);
  const [assessmentInProgress, setAssessmentInProgress] = useState(false);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const pageTopRef = useRef<HTMLDivElement | null>(null);

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

  const loadSections = useCallback(async () => {
    setSectionsError(false);
    setSections(null);
    setCompletedSections(new Set());
    setFrontierIndex(0);
    setResetKey((k) => k + 1);
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

  const isMountRef = useRef(true);
  useEffect(() => {
    if (isMountRef.current) { isMountRef.current = false; return; }
    if (!sections) return;
    const s = sections[frontierIndex];
    if (s) sectionRefs.current[s.id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [frontierIndex, sections]);

  function markSectionComplete(sectionId: string) {
    setCompletedSections((prev) => new Set(prev).add(sectionId));
    setFrontierIndex((i) => (sections ? Math.min(i + 1, sections.length - 1) : i));
  }

  function jumpToSection(index: number) {
    if (index > frontierIndex || !sections) return;
    const s = sections[index];
    sectionRefs.current[s.id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleRestudy() {
    setAssessmentInProgress(false);
    loadSections();
    pageTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleBack() {
    if (assessmentInProgress) {
      const ok = window.confirm("Assessment in progress. Leave anyway?");
      if (!ok) return;
    }
    navigate({ to: "/academy" });
  }

  if (!user) return null;

  return (
    <div style={{
      background: C.bg, color: C.text, minHeight: "100vh", fontFamily: SANS,
      backgroundImage: `radial-gradient(900px 500px at 78% -8%, rgba(255,176,32,.05), transparent 60%),
        linear-gradient(${C.line}22 1px, transparent 1px), linear-gradient(90deg, ${C.line}22 1px, transparent 1px)`,
      backgroundSize: "auto, 44px 44px, 44px 44px",
    }}>
      <style>{`
        .tw-academy-player-spin{animation:tw-academy-player-sp 1s linear infinite;}
        @keyframes tw-academy-player-sp{to{transform:rotate(360deg);}}
        @keyframes tw-academy-player-fadein{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:translateY(0);}}
        @keyframes tw-academy-player-pulse{0%,100%{box-shadow:0 0 0 0 ${C.amber}66;}50%{box-shadow:0 0 0 5px ${C.amber}00;}}
        .tw-academy-player-fadein{animation:tw-academy-player-fadein .4s ease both;}
        .tw-academy-player-pulse{animation:tw-academy-player-pulse 1.6s ease-in-out infinite;}
        @media(prefers-reduced-motion:reduce){.tw-academy-player-spin,.tw-academy-player-fadein,.tw-academy-player-pulse{animation:none;}}
        .tw-academy-player-prose p{margin:0 0 14px;}
        .tw-academy-player-prose h1,.tw-academy-player-prose h2,.tw-academy-player-prose h3{
          font-family:${DISPLAY};color:${C.text};margin:22px 0 10px;
        }
        .tw-academy-player-prose ul,.tw-academy-player-prose ol{margin:0 0 14px;padding-left:22px;}
        .tw-academy-player-prose li{margin-bottom:6px;}
        .tw-academy-player-prose code{background:${C.line2};padding:2px 6px;border-radius:4px;font-family:${MONO};font-size:0.9em;}
        .tw-academy-player-prose pre{background:${C.panel};border:1px solid ${C.line};border-radius:8px;padding:12px 14px;overflow-x:auto;}
        .tw-academy-player-prose strong{color:${C.text};}
        .tw-academy-player-prose a{color:${C.amber};}
      `}</style>

      <div ref={pageTopRef} style={{ position: "sticky", top: 0, zIndex: 5, background: "rgba(8,11,18,.92)", backdropFilter: "blur(10px)", borderBottom: `1px solid ${C.line}` }}>
        <div style={{ padding: "14px clamp(20px,4vw,44px)", display: "flex", alignItems: "center", gap: 14 }}>
          <button
            onClick={handleBack}
            style={{ background: "transparent", border: "none", color: C.mute, cursor: "pointer", display: "flex", padding: 4 }}
            aria-label="Back to courses"
          >
            <ArrowLeft size={18} />
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 7, background: C.amberSoft, border: `1px solid ${C.amber}44`, display: "grid", placeItems: "center" }}>
              <Plane size={15} color={C.amber} />
            </div>
            <span style={{ font: `600 12px/1 ${MONO}`, letterSpacing: ".16em", color: C.text }}>TORQWINGS ACADEMY</span>
          </div>
        </div>

        {sections && sections.length > 0 && (
          <div style={{ padding: "0 clamp(20px,4vw,44px) 14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ font: `600 10px/1 ${MONO}`, letterSpacing: ".1em", color: C.faint, textTransform: "uppercase" }}>
                Section {Math.min(frontierIndex + 1, sections.length)} of {sections.length}
              </span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {sections.map((s, i) => {
                const isComplete = completedSections.has(s.id);
                const isCurrent = i === frontierIndex && !isComplete;
                const isLocked = i > frontierIndex;
                return (
                  <button
                    key={s.id}
                    title={s.title}
                    onClick={() => jumpToSection(i)}
                    className={isCurrent ? "tw-academy-player-pulse" : undefined}
                    style={{
                      width: 10, height: 10, borderRadius: "50%", padding: 0,
                      background: isLocked ? "transparent" : C.amber,
                      border: isLocked ? `1.5px solid ${C.line2}` : "none",
                      cursor: isLocked ? "default" : "pointer",
                    }}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "clamp(28px,4vw,48px) clamp(20px,4vw,44px)" }}>
        {moduleTitle && (
          <h1 style={{ font: `700 clamp(20px,3vw,26px)/1.2 ${DISPLAY}`, color: C.text, margin: "0 0 24px" }}>{moduleTitle}</h1>
        )}

        {sections === null && !sectionsError && <Skeleton label="Loading module…" />}
        {sectionsError && <ErrorRetry message="Couldn't load this module. Try again." onRetry={loadSections} />}

        {sections !== null && sections.length === 0 && (
          <p style={{ font: `400 13px/1.5 ${SANS}`, color: C.mute }}>This module doesn't have any sections yet.</p>
        )}

        {sections !== null && sections.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {sections.map((s, i) => {
              const isComplete = completedSections.has(s.id);
              const isCurrent = i === frontierIndex && !isComplete;
              const isLocked = i > frontierIndex;
              const borderColor = isLocked ? C.line2 : isCurrent ? C.amber : C.green;

              return (
                <div
                  key={isLocked ? s.id : `${s.id}-${resetKey}`}
                  ref={(el) => { sectionRefs.current[s.id] = el; }}
                  className={!isLocked ? "tw-academy-player-fadein" : undefined}
                  style={{
                    border: `1px solid ${C.line}`, borderLeft: `3px solid ${borderColor}`, borderRadius: 14,
                    background: C.panel, padding: isLocked ? "18px 22px" : "24px 26px",
                  }}
                >
                  {isLocked && <LockedSection title={s.title} />}
                  {!isLocked && s.section_type === "content" && (
                    <ContentSection section={s} onComplete={() => markSectionComplete(s.id)} />
                  )}
                  {!isLocked && s.section_type === "quiz" && (
                    <QuizSection section={s} user={user} onComplete={() => markSectionComplete(s.id)} />
                  )}
                  {!isLocked && s.section_type === "final_test" && (
                    <FinalTestSection
                      section={s}
                      user={user}
                      moduleId={moduleId}
                      onPass={() => navigate({ to: "/academy" })}
                      onRestudy={handleRestudy}
                      onInProgressChange={setAssessmentInProgress}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
