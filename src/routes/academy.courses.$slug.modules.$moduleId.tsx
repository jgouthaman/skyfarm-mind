import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, Plane, Trophy, Loader2, RotateCcw } from "lucide-react";
import type { AcademyModuleSection, AcademyUser } from "@/lib/academy-auth";
import { getModuleSections, saveQuizAttempt, setModuleComplete } from "@/lib/academy-auth";
import { generateQuizQuestions, type GeneratedQuizQuestion } from "@/lib/academy/quiz.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/academy/courses/$slug/modules/$moduleId")({
  component: AcademyModulePlayerPage,
});

const C = {
  bg: "#080B12", panel: "#0E131E",
  line: "#1E2838", line2: "#2A3648",
  text: "#E8ECF2", mute: "#8A94A6", faint: "#5C6678",
  amber: "#FFB020", amberSoft: "rgba(255,176,32,0.10)",
  green: "#3DD68C", greenSoft: "rgba(61,214,140,0.10)",
  red: "#F27D7D", redSoft: "rgba(242,125,125,0.10)",
};
const DISPLAY = "'Space Grotesk', system-ui, -apple-system, sans-serif";
const MONO = "'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace";
const SANS = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
const LETTERS = ["A", "B", "C", "D"];
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
    <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
      <button
        onClick={onClick}
        disabled={disabled}
        style={{
          background: C.amber, color: "#0A0A0A", border: "none", borderRadius: 8,
          padding: "10px 18px", font: `600 13px/1 ${SANS}`, cursor: disabled ? "default" : "pointer",
          opacity: disabled ? 0.6 : 1,
        }}
      >
        {label} →
      </button>
    </div>
  );
}

function scoreFromAnswers(answers: Record<number, number>, questions: GeneratedQuizQuestion[]): number {
  return Object.entries(answers).reduce(
    (acc, [i, v]) => acc + (questions[Number(i)]?.correctIndex === v ? 1 : 0),
    0,
  );
}

function answersToLetters(answers: Record<number, number>): Record<number, string> {
  const out: Record<number, string> = {};
  for (const [k, v] of Object.entries(answers)) out[Number(k)] = ["a", "b", "c", "d"][v];
  return out;
}

// ---------- progress bar ----------

function ProgressBar({ sections, currentIndex }: { sections: AcademyModuleSection[]; currentIndex: number }) {
  const total = sections.length;
  const fillPct = total > 0 ? (currentIndex / total) * 100 : 0;
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ font: `600 10px/1 ${MONO}`, letterSpacing: ".14em", color: C.faint, textTransform: "uppercase" }}>
          Progress
        </span>
        <span style={{ font: `600 10px/1 ${MONO}`, color: C.faint }}>
          {Math.min(currentIndex, total)} / {total} sections
        </span>
      </div>
      <div style={{ position: "relative", height: 4, borderRadius: 2, background: C.line2, overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, width: `${fillPct}%`, background: C.amber, borderRadius: 2, transition: "width .4s ease" }} />
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        {sections.map((s, i) => {
          const state = i < currentIndex ? "done" : i === currentIndex ? "active" : "locked";
          return (
            <div
              key={s.id}
              title={s.title}
              style={{
                width: state === "active" ? 12 : 8, height: state === "active" ? 12 : 8, borderRadius: "50%",
                background: state === "locked" ? "transparent" : C.amber,
                border: state === "locked" ? `1.5px solid ${C.line2}` : state === "active" ? `2px solid ${C.amberSoft}` : "none",
                boxShadow: state === "active" ? `0 0 0 3px ${C.amberSoft}` : "none",
                transition: "all .3s ease",
              }}
            />
          );
        })}
      </div>
    </div>
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
      const res = await fetch("/api/academy/generate-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicBrief: section.topic_brief }),
      });
      if (!res.ok || !res.body) throw new Error(`generation failed: ${res.status}`);
      setStatus("streaming");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setText(acc);
      }
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
  section, generate, onComplete, onSave,
}: {
  section: AcademyModuleSection;
  generate: (topicBrief: string, count: number) => Promise<{ questions: GeneratedQuizQuestion[] } | { error: string }>;
  onComplete: () => void;
  onSave: (questions: GeneratedQuizQuestion[], answers: Record<number, number>, score: number) => Promise<void>;
}) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [questions, setQuestions] = useState<GeneratedQuizQuestion[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [finished, setFinished] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setStatus("loading");
    const result = await generate(section.topic_brief, QUIZ_COUNT);
    if ("error" in result) { setStatus("error"); return; }
    setQuestions(result.questions);
    setQIndex(0);
    setAnswers({});
    setFinished(false);
    setStatus("ready");
  }, [generate, section.topic_brief]);

  useEffect(() => { load(); }, [load]);

  const score = useMemo(() => scoreFromAnswers(answers, questions), [answers, questions]);

  function selectOption(idx: number) {
    if (qIndex in answers) return;
    setAnswers((a) => ({ ...a, [qIndex]: idx }));
  }

  function goNext() {
    if (qIndex + 1 < questions.length) {
      setQIndex((i) => i + 1);
    } else {
      setFinished(true);
    }
  }

  async function handleContinue() {
    setSaving(true);
    try {
      await onSave(questions, answers, score);
    } finally {
      setSaving(false);
      onComplete();
    }
  }

  if (status === "loading") return <Skeleton label="Preparing questions…" />;
  if (status === "error") return <ErrorRetry message="Content generation failed. Try again." onRetry={load} />;

  if (finished) {
    return (
      <div>
        <h2 style={{ font: `700 22px/1.2 ${DISPLAY}`, color: C.text, margin: "0 0 8px" }}>Test Your Knowledge</h2>
        <p style={{ font: `500 14px/1.5 ${SANS}`, color: C.mute }}>
          {score} of {questions.length} correct
        </p>
        <ContinueButton onClick={handleContinue} disabled={saving} />
      </div>
    );
  }

  const q = questions[qIndex];
  const answered = qIndex in answers;
  const selectedIdx = answers[qIndex];

  return (
    <div>
      <h2 style={{ font: `700 22px/1.2 ${DISPLAY}`, color: C.text, margin: "0 0 4px" }}>Test Your Knowledge</h2>
      <p style={{ font: `500 11px/1 ${MONO}`, color: C.faint, marginBottom: 18 }}>
        Question {qIndex + 1} of {questions.length}
      </p>

      <p style={{ font: `500 15px/1.5 ${SANS}`, color: C.text, marginBottom: 14 }}>{q.question}</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {q.options.map((opt, i) => {
          let border = C.line2;
          let bg = "transparent";
          let textColor = C.text;
          if (answered) {
            if (i === q.correctIndex) { border = C.green; bg = C.greenSoft; textColor = C.green; }
            else if (i === selectedIdx) { border = C.red; bg = C.redSoft; textColor = C.red; }
          }
          return (
            <button
              key={i}
              disabled={answered}
              onClick={() => selectOption(i)}
              style={{
                textAlign: "left", display: "flex", gap: 10, alignItems: "flex-start",
                border: `1px solid ${border}`, background: bg, color: textColor, borderRadius: 9,
                padding: "11px 14px", font: `500 14px/1.4 ${SANS}`, cursor: answered ? "default" : "pointer",
                transition: "all .15s",
              }}
            >
              <span style={{ font: `600 12px/1 ${MONO}`, color: C.faint, flexShrink: 0 }}>{LETTERS[i]}</span>
              {opt}
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
  section, generate, onSave, onPass, onRestudy, onInProgressChange,
}: {
  section: AcademyModuleSection;
  generate: (topicBrief: string, count: number) => Promise<{ questions: GeneratedQuizQuestion[] } | { error: string }>;
  onSave: (questions: GeneratedQuizQuestion[], answers: Record<number, number>, score: number, passed: boolean) => Promise<void>;
  onPass: () => void;
  onRestudy: () => void;
  onInProgressChange: (inProgress: boolean) => void;
}) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [questions, setQuestions] = useState<GeneratedQuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setStatus("loading");
    const result = await generate(section.topic_brief, FINAL_TEST_COUNT);
    if ("error" in result) { setStatus("error"); return; }
    setQuestions(result.questions);
    setAnswers({});
    setSubmitted(false);
    setStatus("ready");
  }, [generate, section.topic_brief]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    onInProgressChange(status === "ready" && !submitted && Object.keys(answers).length > 0);
    return () => onInProgressChange(false);
  }, [status, submitted, answers, onInProgressChange]);

  const score = useMemo(() => scoreFromAnswers(answers, questions), [answers, questions]);
  const allAnswered = questions.length > 0 && Object.keys(answers).length === questions.length;
  const passed = score >= PASS_MARK;

  function selectOption(qIdx: number, optIdx: number) {
    if (submitted) return;
    setAnswers((a) => ({ ...a, [qIdx]: optIdx }));
  }

  async function submit() {
    setSubmitted(true);
    setSaving(true);
    try {
      await onSave(questions, answers, score, passed);
    } finally {
      setSaving(false);
    }
  }

  if (status === "loading") return <Skeleton label="Preparing your final assessment…" />;
  if (status === "error") return <ErrorRetry message="Content generation failed. Try again." onRetry={load} />;

  if (submitted) {
    return (
      <div>
        {passed ? (
          <div style={{ textAlign: "center", padding: "28px 0" }}>
            <Trophy size={36} color={C.amber} style={{ marginBottom: 12 }} />
            <h2 style={{ font: `700 26px/1.2 ${DISPLAY}`, color: C.text, margin: 0 }}>Congratulations! You passed.</h2>
            <p style={{ font: `600 15px/1 ${MONO}`, color: C.amber, marginTop: 10 }}>{score} / {questions.length}</p>
            <button
              onClick={onPass}
              style={{
                marginTop: 22, background: C.amber, color: "#0A0A0A", border: "none", borderRadius: 8,
                padding: "10px 20px", font: `600 13px/1 ${SANS}`, cursor: "pointer",
              }}
            >
              Back to courses
            </button>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "28px 0" }}>
            <h2 style={{ font: `700 22px/1.2 ${DISPLAY}`, color: C.text, margin: 0 }}>
              You scored {score}/{questions.length}. You need {PASS_MARK} to pass.
            </h2>
            <p style={{ font: `400 14px/1.5 ${SANS}`, color: C.mute, marginTop: 10 }}>
              Take another look at the material — you've got this.
            </p>
            <button
              onClick={onRestudy}
              disabled={saving}
              style={{
                marginTop: 22, display: "inline-flex", alignItems: "center", gap: 8,
                background: "transparent", color: C.amber, border: `1px solid ${C.amber}66`, borderRadius: 8,
                padding: "10px 20px", font: `600 13px/1 ${SANS}`, cursor: "pointer",
              }}
            >
              <RotateCcw size={14} /> Restudy module
            </button>
          </div>
        )}

        <div style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 14 }}>
          {questions.map((q, i) => (
            <div key={i} style={{ border: `1px solid ${C.line}`, borderRadius: 10, padding: "14px 16px" }}>
              <p style={{ font: `500 13px/1.5 ${SANS}`, color: C.text, marginBottom: 8 }}>{i + 1}. {q.question}</p>
              {q.options.map((opt, oi) => {
                const isCorrect = oi === q.correctIndex;
                const isSelected = answers[i] === oi;
                const color = isCorrect ? C.green : isSelected ? C.red : C.faint;
                return (
                  <div key={oi} style={{ font: `400 12px/1.6 ${SANS}`, color, display: "flex", gap: 8 }}>
                    <span style={{ font: `600 11px/1 ${MONO}` }}>{LETTERS[oi]}</span> {opt}
                  </div>
                );
              })}
              <p style={{ font: `400 12px/1.6 ${SANS}`, color: C.mute, marginTop: 6 }}>{q.explanation}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ font: `700 24px/1.2 ${DISPLAY}`, color: C.text, margin: "0 0 4px" }}>Final Assessment</h2>
      <p style={{ font: `500 11px/1 ${MONO}`, color: C.faint, marginBottom: 22 }}>
        {FINAL_TEST_COUNT} questions · Pass mark: {PASS_MARK}/{FINAL_TEST_COUNT}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 14, maxHeight: "60vh", overflowY: "auto", paddingRight: 4 }}>
        {questions.map((q, qi) => (
          <div key={qi} style={{ border: `1px solid ${C.line}`, borderRadius: 10, padding: "14px 16px" }}>
            <p style={{ font: `500 14px/1.5 ${SANS}`, color: C.text, marginBottom: 10 }}>{qi + 1}. {q.question}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {q.options.map((opt, oi) => {
                const selected = answers[qi] === oi;
                return (
                  <button
                    key={oi}
                    onClick={() => selectOption(qi, oi)}
                    style={{
                      textAlign: "left", display: "flex", gap: 10, alignItems: "flex-start",
                      border: `1px solid ${selected ? C.amber : C.line2}`, background: selected ? C.amberSoft : "transparent",
                      color: selected ? C.amber : C.text, borderRadius: 8, padding: "8px 12px",
                      font: `500 13px/1.4 ${SANS}`, cursor: "pointer",
                    }}
                  >
                    <span style={{ font: `600 11px/1 ${MONO}`, flexShrink: 0 }}>{LETTERS[oi]}</span>
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {allAnswered && (
        <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={submit}
            disabled={saving}
            style={{
              background: C.amber, color: "#0A0A0A", border: "none", borderRadius: 8,
              padding: "11px 20px", font: `600 13px/1 ${SANS}`, cursor: saving ? "default" : "pointer",
              opacity: saving ? 0.7 : 1,
            }}
          >
            Submit Assessment
          </button>
        </div>
      )}
    </div>
  );
}

// ---------- page ----------

function AcademyModulePlayerPage() {
  const { moduleId } = Route.useParams();
  const navigate = useNavigate();
  const generateQuiz = useServerFn(generateQuizQuestions);

  const [user, setUser] = useState<AcademyUser | null>(null);
  const [moduleTitle, setModuleTitle] = useState<string | null>(null);
  const [sections, setSections] = useState<AcademyModuleSection[] | null>(null);
  const [sectionsError, setSectionsError] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [assessmentInProgress, setAssessmentInProgress] = useState(false);

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

  const generate = useCallback(
    async (topicBrief: string, count: number) => generateQuiz({ data: { topicBrief, count } }),
    [generateQuiz],
  );

  async function handleQuizSave(questions: GeneratedQuizQuestion[], answers: Record<number, number>, score: number) {
    if (!user) return;
    const section = sections?.[currentIndex];
    if (!section) return;
    try {
      await saveQuizAttempt({
        user_id: user.id,
        section_id: section.id,
        generated_questions: questions,
        user_answers: answersToLetters(answers),
        score,
        total: questions.length,
        passed: score >= QUIZ_PASS_MARK,
      });
    } catch (err) {
      console.error("[Academy] failed to save quiz attempt:", err);
    }
  }

  async function handleFinalTestSave(
    questions: GeneratedQuizQuestion[], answers: Record<number, number>, score: number, passed: boolean,
  ) {
    if (!user) return;
    const section = sections?.[currentIndex];
    if (!section) return;
    try {
      await saveQuizAttempt({
        user_id: user.id,
        section_id: section.id,
        generated_questions: questions,
        user_answers: answersToLetters(answers),
        score,
        total: questions.length,
        passed,
      });
      if (passed) await setModuleComplete(user.id, moduleId, true);
    } catch (err) {
      console.error("[Academy] failed to save final assessment:", err);
    }
  }

  function goToNextSection() {
    setCurrentIndex((i) => i + 1);
  }

  function handleRestudy() {
    setAssessmentInProgress(false);
    setCurrentIndex(0);
  }

  function handleBack() {
    if (assessmentInProgress) {
      const ok = window.confirm("Leave without finishing the assessment? Your progress on this attempt will be lost.");
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
        @media(prefers-reduced-motion:reduce){.tw-academy-player-spin{animation:none;}}
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

      <div style={{
        position: "sticky", top: 0, zIndex: 5, background: "rgba(8,11,18,.82)", backdropFilter: "blur(10px)",
        borderBottom: `1px solid ${C.line}`, padding: "14px clamp(20px,4vw,44px)",
        display: "flex", alignItems: "center", gap: 14,
      }}>
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

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "clamp(28px,4vw,48px) clamp(20px,4vw,44px)" }}>
        <div style={{ font: `500 11px/1 ${MONO}`, letterSpacing: ".18em", color: C.amber, marginBottom: 6 }}>● MODULE PLAYER</div>
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
            <ProgressBar sections={sections} currentIndex={currentIndex} />

            {currentIndex < sections.length ? (
              <div
                key={sections[currentIndex].id}
                style={{ border: `1px solid ${C.line}`, borderRadius: 14, background: C.panel, padding: "24px 26px" }}
              >
                {sections[currentIndex].section_type === "content" && (
                  <ContentSection section={sections[currentIndex]} onComplete={goToNextSection} />
                )}
                {sections[currentIndex].section_type === "quiz" && (
                  <QuizSection
                    section={sections[currentIndex]}
                    generate={generate}
                    onComplete={goToNextSection}
                    onSave={handleQuizSave}
                  />
                )}
                {sections[currentIndex].section_type === "final_test" && (
                  <FinalTestSection
                    section={sections[currentIndex]}
                    generate={generate}
                    onSave={handleFinalTestSave}
                    onPass={() => navigate({ to: "/academy" })}
                    onRestudy={handleRestudy}
                    onInProgressChange={setAssessmentInProgress}
                  />
                )}
              </div>
            ) : (
              <p style={{ font: `400 13px/1.5 ${SANS}`, color: C.mute }}>All sections complete.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
