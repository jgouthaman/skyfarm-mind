import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, Plane, Trophy, Loader2, RotateCcw, Lock, Lightbulb, CheckCircle2, ArrowLeftRight } from "lucide-react";
import type { AcademyModuleSection, AcademyUser } from "@/lib/academy-auth";
import { cacheModuleContent, getModuleSections, saveQuizAttempt, setModuleComplete } from "@/lib/academy-auth";
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
  cardBody: "#B0B8C8", codeBg: "#131A28",
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

// ---------- content card parsing ----------

const MAX_CARD_CHARS = 400;
const MIN_CARD_WORDS = 80;

function plainTextLength(md: string): number {
  return md
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_`>]/g, "")
    .replace(/\s+/g, " ")
    .trim().length;
}

function wordCount(md: string): number {
  const plain = md.replace(/^#{1,6}\s+/gm, "").replace(/[*_`>]/g, "").trim();
  return plain ? plain.split(/\s+/).length : 0;
}

function splitLongChunk(chunk: string): string[] {
  if (plainTextLength(chunk) <= MAX_CARD_CHARS) return [chunk];
  const paragraphs = chunk.split(/\n\s*\n/).filter((p) => p.trim());
  if (paragraphs.length <= 1) return [chunk];

  const out: string[] = [];
  let buf = "";
  for (const p of paragraphs) {
    const candidate = buf ? `${buf}\n\n${p}` : p;
    if (buf && plainTextLength(candidate) > MAX_CARD_CHARS) {
      out.push(buf);
      buf = p;
    } else {
      buf = candidate;
    }
  }
  if (buf) out.push(buf);
  return out;
}

// Splits streamed markdown into one card per concept: a chunk starts at a
// ## / ### heading (kept with its body) and ends at the next heading or an
// --- rule (the rule itself is dropped, it's just a divider). Chunks over
// MAX_CARD_CHARS of plain text are further split at paragraph boundaries.
function splitIntoCards(markdown: string): string[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const chunks: string[] = [];
  let current: string[] = [];

  const flush = () => {
    const text = current.join("\n").trim();
    if (text) chunks.push(text);
    current = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    const isHeading = /^#{2,3}\s+\S/.test(trimmed);
    const isRule = /^-{3,}$/.test(trimmed);

    if (isRule) {
      flush();
      continue;
    }
    if (isHeading && current.some((l) => l.trim().length > 0)) {
      flush();
    }
    current.push(line);
  }
  flush();

  if (chunks.length === 0) return [markdown.trim()];
  return chunks.flatMap(splitLongChunk);
}

// Folds any chunk under MIN_CARD_WORDS into the previous one — keeps thin
// trailing fragments (e.g. a lone closing sentence after the last heading)
// from becoming their own near-empty card.
function mergeShortCards(chunks: string[]): string[] {
  const out: string[] = [];
  for (const chunk of chunks) {
    if (out.length > 0 && wordCount(chunk) < MIN_CARD_WORDS) {
      out[out.length - 1] = `${out[out.length - 1]}\n\n${chunk}`;
    } else {
      out.push(chunk);
    }
  }
  return out;
}

function extractHeading(markdown: string): string | null {
  const m = markdown.match(/^#{2,3}\s+(.+)$/m);
  return m ? m[1].trim() : null;
}

function stripMarkdownEmphasis(markdown: string): string {
  return markdown
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_`]/g, "")
    .replace(/\n{2,}/g, " ")
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function firstSentence(markdown: string): string {
  const plain = stripMarkdownEmphasis(markdown);
  const match = plain.match(/^.*?[.!?](?:\s|$)/);
  return (match ? match[0] : plain).trim();
}

type ContentCardType = "hero" | "concept" | "formula" | "example" | "comparison" | "keyInsight";

// Priority matters: key-insight and formula markers can both appear in the
// same chunk, and key-insight is meant to be the rarer, higher-impact call-
// out, so it wins ties.
function classifyCard(markdown: string): Exclude<ContentCardType, "hero"> {
  const lower = markdown.toLowerCase();
  if (/\b(key|important|remember|critical)\b/.test(lower)) return "keyInsight";
  if (/=/.test(markdown) || /\bformula\b/.test(lower)) return "formula";
  if (/\bexample\b/.test(lower) || /\bcalculate\b/.test(lower) || /\d+\s?(m\/s|km\/h|mph|kg|km|n|hz|°|deg|cm|mm|ft|lbs?)\b/i.test(markdown)) return "example";
  if (/\bvs\.?\b/.test(lower) || /\bcompare/.test(lower) || /^\|.*\|\s*$/m.test(markdown)) return "comparison";
  return "concept";
}

interface TextContentCard { kind: "text"; type: ContentCardType; markdown: string }
interface ImageContentCard { kind: "image"; url: string; caption: string }
type PositionedCard = TextContentCard | ImageContentCard;

const CONTENT_IMAGES: { keywords: RegExp; url: string; caption: string }[] = [
  {
    keywords: /laminar|turbulent/i,
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Laminar_turbulent_transition.svg/640px-Laminar_turbulent_transition.svg.png",
    caption: "Laminar vs. turbulent flow transition",
  },
  {
    keywords: /airfoil|wing cross|cross.?section/i,
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/Anatomie_einer_Tragfl%C3%A4che.svg/640px-Anatomie_einer_Tragfl%C3%A4che.svg.png",
    caption: "Airfoil cross-section anatomy",
  },
  {
    keywords: /reynolds/i,
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Reynolds_fluid_animation.gif/220px-Reynolds_fluid_animation.gif",
    caption: "Reynolds number flow concept",
  },
  {
    keywords: /propeller|rotor|drone|quadcopter|uav/i,
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Quadcopter_camera_drone_in_flight.jpg/640px-Quadcopter_camera_drone_in_flight.jpg",
    caption: "Multirotor drone in flight",
  },
  {
    keywords: /separation|stall/i,
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/Flow_separation.svg/640px-Flow_separation.svg.png",
    caption: "Flow separation over a surface",
  },
];

function pickImageForContext(precedingText: string, position: number): { url: string; caption: string } {
  const heading = extractHeading(precedingText);
  const matched = CONTENT_IMAGES.find((img) => img.keywords.test(precedingText));
  const img = matched ?? CONTENT_IMAGES[position % CONTENT_IMAGES.length];
  return { url: img.url, caption: heading ?? img.caption };
}

// First card is always the hero. Every 4th text card thereafter (except the
// very last) is followed by a supporting diagram card.
function buildContentCards(rawMarkdown: string): PositionedCard[] {
  const chunks = mergeShortCards(splitIntoCards(rawMarkdown));
  const cards: PositionedCard[] = [];
  let imagesInserted = 0;

  chunks.forEach((chunk, i) => {
    const type: ContentCardType = i === 0 ? "hero" : classifyCard(chunk);
    cards.push({ kind: "text", type, markdown: chunk });
    if ((i + 1) % 4 === 0 && i < chunks.length - 1) {
      cards.push({ kind: "image", ...pickImageForContext(chunk, imagesInserted) });
      imagesInserted += 1;
    }
  });

  return cards;
}

// ---------- content sub-card renderers ----------

function extractFormulaParts(markdown: string): { formula: string; explanation: string } {
  const lines = markdown.split("\n");
  let formula = "";
  const rest: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    const isHeading = /^#{1,6}\s/.test(trimmed);
    if (!formula && !isHeading && /=/.test(trimmed) && trimmed.length > 0 && trimmed.length < 120) {
      formula = trimmed.replace(/^[-*]\s+/, "").replace(/[*_`]/g, "");
    } else {
      rest.push(line);
    }
  }
  return { formula: formula || "—", explanation: rest.join("\n").trim() };
}

function extractExampleParts(markdown: string): { setup: string; steps: string[] } {
  const lines = markdown.split("\n");
  const setupLines: string[] = [];
  const steps: string[] = [];
  let inSteps = false;
  for (const line of lines) {
    const trimmed = line.trim();
    const numbered = trimmed.match(/^(?:\d+[.)]|step\s*\d+[:.]?)\s+(.*)$/i);
    if (numbered) {
      inSteps = true;
      steps.push(numbered[1]);
    } else if (inSteps && trimmed) {
      if (steps.length) steps[steps.length - 1] += ` ${trimmed}`;
    } else if (!inSteps) {
      setupLines.push(line);
    }
  }
  return { setup: setupLines.join("\n").trim(), steps };
}

function extractComparisonParts(markdown: string): { leftLabel: string; rightLabel: string; leftItems: string[]; rightItems: string[] } {
  const heading = extractHeading(markdown) ?? "";
  const vsMatch = heading.match(/([A-Za-z][\w\s]*?)\s+vs\.?\s+([A-Za-z][\w\s]*)/i);
  const leftLabel = vsMatch ? vsMatch[1].trim() : "Option A";
  const rightLabel = vsMatch ? vsMatch[2].trim() : "Option B";

  const items = markdown
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => /^[-*]\s+/.test(l))
    .map((l) => l.replace(/^[-*]\s+/, ""));

  const mid = Math.ceil(items.length / 2);
  return { leftLabel, rightLabel, leftItems: items.slice(0, mid), rightItems: items.slice(mid) };
}

function CardTypeBadge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span style={{
      position: "absolute", top: 18, right: 22,
      font: `600 10px/1 ${MONO}`, letterSpacing: ".08em", textTransform: "uppercase",
      color, background: bg, border: `1px solid ${color}44`, padding: "5px 9px", borderRadius: 6,
    }}>
      {label}
    </span>
  );
}

function HeroCard({ title, hook, onNext }: { title: string; hook: string; onNext: () => void }) {
  return (
    <div style={{ textAlign: "center" }}>
      <Plane
        size={38} color={C.amber}
        className="tw-academy-hero-icon"
        style={{ position: "absolute", top: 24, right: 28, opacity: 0.55 }}
      />
      <h2 style={{ font: `700 clamp(24px,4vw,32px)/1.3 ${DISPLAY}`, color: C.text, margin: "0 0 14px" }}>{title}</h2>
      <p style={{ font: `400 15px/1.6 ${SANS}`, color: C.mute, maxWidth: 460, margin: "0 auto" }}>{hook}</p>
      <div style={{ marginTop: 32 }}>
        <button
          onClick={onNext}
          style={{
            background: C.amber, color: "#0A0A0A", border: "none", borderRadius: 9,
            padding: "13px 30px", font: `600 14px/1 ${SANS}`, cursor: "pointer",
          }}
        >
          Begin →
        </button>
      </div>
    </div>
  );
}

function ConceptCard({ number, markdown }: { number: number; markdown: string }) {
  return (
    <div style={{ display: "flex", gap: 24 }}>
      <div style={{ flexShrink: 0, minWidth: 52, font: `700 38px/1 ${DISPLAY}`, color: C.amber, opacity: 0.85 }}>
        {String(number).padStart(2, "0")}
      </div>
      <div className="tw-academy-card-prose" style={{ borderLeft: `2px solid ${C.amber}55`, paddingLeft: 22, flex: 1 }}>
        <ReactMarkdown>{markdown}</ReactMarkdown>
      </div>
    </div>
  );
}

function FormulaCard({ markdown }: { markdown: string }) {
  const { formula, explanation } = useMemo(() => extractFormulaParts(markdown), [markdown]);
  return (
    <div>
      <div style={{
        textAlign: "center", padding: "30px 20px", borderRadius: 12,
        background: C.bg, border: `1px solid ${C.amber}44`, boxShadow: `0 0 24px ${C.amber}22`,
      }}>
        <span style={{ font: `700 clamp(20px,4vw,28px)/1.4 ${MONO}`, color: C.amber }}>{formula}</span>
      </div>
      {explanation && (
        <div className="tw-academy-card-prose" style={{ marginTop: 20, fontSize: 14 }}>
          <ReactMarkdown>{explanation}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}

function ExampleCard({ markdown }: { markdown: string }) {
  const { setup, steps } = useMemo(() => extractExampleParts(markdown), [markdown]);
  return (
    <div className="tw-academy-example-grid">
      <div>
        <div style={{ font: `600 10px/1 ${MONO}`, letterSpacing: ".08em", textTransform: "uppercase", color: C.faint, marginBottom: 10 }}>
          Problem
        </div>
        <div className="tw-academy-card-prose" style={{ fontSize: 14 }}>
          <ReactMarkdown>{setup || markdown}</ReactMarkdown>
        </div>
      </div>
      <div>
        <div style={{ font: `600 10px/1 ${MONO}`, letterSpacing: ".08em", textTransform: "uppercase", color: C.faint, marginBottom: 10 }}>
          Solution
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {steps.length > 0 ? steps.map((step, i) => (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <CheckCircle2 size={16} color={C.green} style={{ flexShrink: 0, marginTop: 2 }} />
              <span style={{ font: `400 13px/1.6 ${SANS}`, color: C.cardBody }}>{step}</span>
            </div>
          )) : (
            <span style={{ font: `400 13px/1.6 ${SANS}`, color: C.faint }}>See the worked steps above.</span>
          )}
        </div>
      </div>
    </div>
  );
}

function ComparisonCard({ markdown }: { markdown: string }) {
  const { leftLabel, rightLabel, leftItems, rightItems } = useMemo(() => extractComparisonParts(markdown), [markdown]);

  if (leftItems.length === 0 && rightItems.length === 0) {
    return <div className="tw-academy-card-prose"><ReactMarkdown>{markdown}</ReactMarkdown></div>;
  }

  return (
    <div className="tw-academy-comparison-grid">
      <div style={{ background: "rgba(90,150,255,0.08)", border: "1px solid rgba(90,150,255,0.3)", borderRadius: 12, padding: 20 }}>
        <div style={{ font: `700 13px/1.3 ${DISPLAY}`, color: "#7AAAFF", marginBottom: 12 }}>{leftLabel}</div>
        {leftItems.map((item, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <ArrowLeftRight size={14} color="#7AAAFF" style={{ flexShrink: 0, marginTop: 2 }} />
            <span style={{ font: `400 13px/1.5 ${SANS}`, color: C.cardBody }}>{item}</span>
          </div>
        ))}
      </div>
      <div style={{ background: C.amberSoft, border: `1px solid ${C.amber}44`, borderRadius: 12, padding: 20 }}>
        <div style={{ font: `700 13px/1.3 ${DISPLAY}`, color: C.amber, marginBottom: 12 }}>{rightLabel}</div>
        {rightItems.map((item, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <ArrowLeftRight size={14} color={C.amber} style={{ flexShrink: 0, marginTop: 2 }} />
            <span style={{ font: `400 13px/1.5 ${SANS}`, color: C.cardBody }}>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function KeyInsightCard({ markdown }: { markdown: string }) {
  const statement = useMemo(() => stripMarkdownEmphasis(markdown), [markdown]);
  return (
    <div style={{ display: "flex", gap: 18, alignItems: "flex-start" }}>
      <Lightbulb size={28} color="#0A0A0A" style={{ flexShrink: 0 }} />
      <p style={{ font: `700 clamp(17px,2.4vw,20px)/1.5 ${DISPLAY}`, color: "#0A0A0A", margin: 0 }}>{statement}</p>
    </div>
  );
}

function ImageCardView({ url, caption }: { url: string; caption: string }) {
  return (
    <div>
      <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${C.line}` }}>
        <img src={url} alt={caption} loading="lazy" style={{ display: "block", width: "100%", height: "auto" }} />
      </div>
      <p style={{ font: `500 13px/1.5 ${SANS}`, color: C.mute, marginTop: 12, textAlign: "center" }}>{caption}</p>
    </div>
  );
}

function outerCardStyle(card: PositionedCard): CSSProperties {
  if (card.kind === "text" && card.type === "hero") {
    return {
      position: "relative", overflow: "hidden",
      background: `linear-gradient(160deg, ${C.panel} 0%, #0A0E17 60%, ${C.bg} 100%)`,
      border: `1px solid ${C.line}`, borderRadius: 20, padding: "56px 40px",
    };
  }
  const bg = card.kind === "image" ? C.panel
    : card.type === "formula" ? "#080B12"
    : card.type === "example" ? "#0A1A10"
    : card.type === "keyInsight" ? C.amber
    : C.panel;
  return {
    position: "relative", background: bg, borderRadius: 16, padding: 40,
    border: card.kind === "text" && card.type === "keyInsight" ? "none" : `1px solid ${C.line}`,
  };
}

function enterAnimClass(card: PositionedCard): string {
  if (card.kind === "image") return "tw-academy-card-anim-image";
  if (card.type === "hero") return "tw-academy-card-anim-hero";
  if (card.type === "keyInsight") return "tw-academy-card-anim-keyinsight";
  return "tw-academy-card-anim-fadeup";
}

function badgeForCard(card: PositionedCard): { label: string; color: string; bg: string } | null {
  if (card.kind === "image") return { label: "Visual", color: C.faint, bg: "transparent" };
  switch (card.type) {
    case "hero": return null;
    case "formula": return { label: "Formula", color: C.amber, bg: C.amberSoft };
    case "example": return { label: "Example", color: C.green, bg: C.greenSoft };
    case "keyInsight": return { label: "Key Insight", color: "#0A0A0A", bg: "rgba(10,10,10,0.14)" };
    // Comparison isn't in the badge label set, so it borrows the neutral
    // "Concept" chip — it still gets its own distinct panel layout below.
    case "comparison":
    case "concept":
    default:
      return { label: "Concept", color: C.faint, bg: "transparent" };
  }
}

// ---------- content section (paced card-by-card reveal) ----------

function ContentCardSkeleton() {
  return (
    <div
      className="tw-academy-player-pulse"
      style={{
        maxWidth: 880, margin: "0 auto", background: C.panel, border: `1px solid ${C.line}`,
        borderRadius: 16, padding: 40, display: "flex", flexDirection: "column",
        alignItems: "center", gap: 14, textAlign: "center",
      }}
    >
      <Loader2 size={22} className="tw-academy-player-spin" color={C.amber} />
      <span style={{ font: `500 14px/1 ${SANS}`, color: C.mute }}>Generating content…</span>
    </div>
  );
}

function ContentSection({
  section, sectionNumber, totalSections, isActive, nextLabel, onComplete,
}: {
  section: AcademyModuleSection;
  sectionNumber: number;
  totalSections: number;
  isActive: boolean;
  nextLabel: string;
  onComplete: () => void;
}) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [cards, setCards] = useState<PositionedCard[]>([]);
  const [cardIndex, setCardIndex] = useState(0);
  const [phase, setPhase] = useState<"idle" | "entering" | "exiting">("idle");

  const generate = useCallback(async () => {
    setStatus("loading");
    setCards([]);
    setCardIndex(0);
    try {
      if (section.cached_content) {
        console.info(`[Academy] "${section.title}" — serving cached content (cached_at: ${section.cached_at}).`);
        setCards(buildContentCards(section.cached_content));
      } else {
        console.info(`[Academy] "${section.title}" — no cache hit, generating via Anthropic API.`);
        let acc = "";
        await streamAnthropicContent(section.topic_brief, (fullTextSoFar) => { acc = fullTextSoFar; }, 1500);
        setCards(buildContentCards(acc));
        cacheModuleContent(section.id, acc)
          .then(() => console.info(`[Academy] "${section.title}" — cached generated content for next time.`))
          .catch((err) => console.error(`[Academy] "${section.title}" — failed to cache generated content:`, err));
      }
      setCardIndex(0);
      setStatus("ready");
      setPhase("entering");
      window.setTimeout(() => setPhase("idle"), 340);
    } catch (err) {
      console.error("[Academy] content generation failed:", err);
      setStatus("error");
    }
  }, [section.cached_content, section.id, section.topic_brief]);

  useEffect(() => { generate(); }, [generate]);

  const isLastCard = cardIndex >= cards.length - 1;

  const goNext = useCallback(() => {
    if (phase !== "idle") return;
    if (cardIndex >= cards.length - 1) { onComplete(); return; }
    setPhase("exiting");
    window.setTimeout(() => {
      setCardIndex((i) => i + 1);
      setPhase("entering");
      window.setTimeout(() => setPhase("idle"), 320);
    }, 200);
  }, [phase, cardIndex, cards.length, onComplete]);

  const goPrev = useCallback(() => {
    if (phase !== "idle" || cardIndex === 0) return;
    setPhase("exiting");
    window.setTimeout(() => {
      setCardIndex((i) => Math.max(0, i - 1));
      setPhase("entering");
      window.setTimeout(() => setPhase("idle"), 320);
    }, 200);
  }, [phase, cardIndex]);

  useEffect(() => {
    if (!isActive || status !== "ready") return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); goNext(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); goPrev(); }
      // Escape is intentionally a no-op — don't navigate away accidentally.
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isActive, status, goNext, goPrev]);

  if (status === "error") {
    return (
      <div>
        <h2 style={{ font: `700 clamp(20px,3vw,26px)/1.2 ${DISPLAY}`, color: C.text, margin: "0 0 18px" }}>{section.title}</h2>
        <ErrorRetry message="Content generation failed. Try again." onRetry={generate} />
      </div>
    );
  }

  if (status === "loading" || cards.length === 0) {
    return <ContentCardSkeleton />;
  }

  // Already completed — static, fully-visible recap (no pacing/keyboard nav).
  if (!isActive) {
    const recap = cards.filter((c): c is TextContentCard => c.kind === "text").map((c) => c.markdown).join("\n\n");
    return (
      <div>
        <h2 style={{ font: `700 clamp(20px,3vw,26px)/1.2 ${DISPLAY}`, color: C.text, margin: "0 0 18px" }}>{section.title}</h2>
        <div className="tw-academy-card-prose">
          <ReactMarkdown>{recap}</ReactMarkdown>
        </div>
      </div>
    );
  }

  const card = cards[cardIndex];
  const isHero = card.kind === "text" && card.type === "hero";
  const isKeyInsight = card.kind === "text" && card.type === "keyInsight";
  const badge = badgeForCard(card);
  const animClass = phase === "exiting" ? "tw-academy-card-exit" : phase === "entering" ? enterAnimClass(card) : undefined;

  return (
    <div style={{ maxWidth: 880, margin: "0 auto" }}>
      <div style={{
        font: `600 11px/1 ${MONO}`, letterSpacing: ".08em", textTransform: "uppercase", color: C.faint, marginBottom: 14,
      }}>
        Section {sectionNumber} of {totalSections} · {section.title}
      </div>

      <div key={cardIndex} className={animClass} style={outerCardStyle(card)}>
        {!isHero && (
          <span style={{ position: "absolute", top: 18, left: 22, font: `500 11px/1 ${MONO}`, color: isKeyInsight ? "#0A0A0A99" : C.faint }}>
            {cardIndex + 1} / {cards.length}
          </span>
        )}
        {badge && <CardTypeBadge {...badge} />}

        {card.kind === "text" && card.type === "hero" && <HeroCard title={section.title} hook={firstSentence(card.markdown)} onNext={goNext} />}
        {card.kind === "text" && card.type === "concept" && <ConceptCard number={cardIndex + 1} markdown={card.markdown} />}
        {card.kind === "text" && card.type === "formula" && <FormulaCard markdown={card.markdown} />}
        {card.kind === "text" && card.type === "example" && <ExampleCard markdown={card.markdown} />}
        {card.kind === "text" && card.type === "comparison" && <ComparisonCard markdown={card.markdown} />}
        {card.kind === "text" && card.type === "keyInsight" && <KeyInsightCard markdown={card.markdown} />}
        {card.kind === "image" && <ImageCardView url={card.url} caption={card.caption} />}

        {!isHero && (
          <div style={{ marginTop: 28 }}>
            {isLastCard ? (
              <ContinueButton onClick={goNext} label={nextLabel} />
            ) : (
              <div style={{ display: "flex", justifyContent: isKeyInsight ? "flex-start" : "flex-end" }}>
                <button
                  onClick={goNext}
                  style={{
                    background: isKeyInsight ? "#0A0A0A" : C.amber, color: isKeyInsight ? C.amber : "#0A0A0A",
                    border: "none", borderRadius: 8, padding: "10px 18px", font: `600 13px/1 ${SANS}`, cursor: "pointer",
                  }}
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: 7, marginTop: 18 }}>
        {cards.map((_, i) => (
          <span
            key={i}
            style={{
              width: 7, height: 7, borderRadius: "50%",
              background: i <= cardIndex ? C.amber : "transparent",
              border: i <= cardIndex ? "none" : `1.5px solid ${C.line2}`,
            }}
          />
        ))}
      </div>
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
          <div style={{ width: "100%", maxWidth: 960 }}>
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

  function nextContentLabel(index: number): string {
    const next = sections?.[index + 1];
    if (!next) return "Continue";
    if (next.section_type === "quiz") return "Continue to Quiz";
    if (next.section_type === "final_test") return "Continue to Final Assessment";
    return "Continue";
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
    navigate({ to: "/academy/dashboard" });
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
        @keyframes tw-academy-card-out{to{opacity:0;transform:translateY(-20px);}}
        .tw-academy-card-exit{animation:tw-academy-card-out .2s cubic-bezier(0.22,1,0.36,1) both;}
        @keyframes tw-academy-card-fadeup{from{opacity:0;transform:translateY(20px);}to{opacity:1;transform:translateY(0);}}
        @keyframes tw-academy-card-scalein{from{opacity:0;transform:scale(.96);}to{opacity:1;transform:scale(1);}}
        @keyframes tw-academy-card-slideleft{from{opacity:0;transform:translateX(-30px);}to{opacity:1;transform:translateX(0);}}
        @keyframes tw-academy-card-fadein{from{opacity:0;}to{opacity:1;}}
        .tw-academy-card-anim-fadeup{animation:tw-academy-card-fadeup .4s cubic-bezier(0.22,1,0.36,1) both;}
        .tw-academy-card-anim-hero{animation:tw-academy-card-scalein .5s cubic-bezier(0.22,1,0.36,1) both;}
        .tw-academy-card-anim-keyinsight{animation:tw-academy-card-slideleft .4s cubic-bezier(0.22,1,0.36,1) both;}
        .tw-academy-card-anim-image{animation:tw-academy-card-fadein .3s cubic-bezier(0.22,1,0.36,1) both;}
        @keyframes tw-academy-hero-float{0%,100%{transform:translateY(0) rotate(-4deg);}50%{transform:translateY(-6px) rotate(4deg);}}
        .tw-academy-hero-icon{animation:tw-academy-hero-float 3.4s ease-in-out infinite;}
        .tw-academy-example-grid{display:grid;grid-template-columns:1fr 1fr;gap:28px;}
        .tw-academy-comparison-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
        @media(max-width:560px){
          .tw-academy-example-grid,.tw-academy-comparison-grid{grid-template-columns:1fr;}
        }
        @media(prefers-reduced-motion:reduce){
          .tw-academy-player-spin,.tw-academy-player-fadein,.tw-academy-player-pulse,.tw-academy-card-exit,
          .tw-academy-card-anim-fadeup,.tw-academy-card-anim-hero,.tw-academy-card-anim-keyinsight,
          .tw-academy-card-anim-image,.tw-academy-hero-icon{animation:none;}
        }
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
        .tw-academy-card-prose{font:400 16px/1.7 ${SANS};color:${C.cardBody};}
        .tw-academy-card-prose p{margin:0 0 16px;}
        .tw-academy-card-prose p:last-child{margin-bottom:0;}
        .tw-academy-card-prose h1,.tw-academy-card-prose h2,.tw-academy-card-prose h3{
          font:700 22px/1.3 ${DISPLAY};color:${C.text};margin:0 0 14px;
        }
        .tw-academy-card-prose ul,.tw-academy-card-prose ol{
          margin:0 0 16px;padding-left:16px;border-left:3px solid ${C.amber};
        }
        .tw-academy-card-prose li{margin-bottom:8px;padding-left:8px;}
        .tw-academy-card-prose code{
          font-family:${MONO};background:${C.codeBg};color:${C.amber};padding:2px 6px;border-radius:4px;font-size:0.9em;
        }
        .tw-academy-card-prose pre{
          font-family:${MONO};background:${C.codeBg};color:${C.amber};padding:12px;border-radius:8px;overflow-x:auto;
        }
        .tw-academy-card-prose pre code{background:transparent;padding:0;}
        .tw-academy-card-prose strong{color:${C.text};}
        .tw-academy-card-prose a{color:${C.amber};}
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

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "clamp(28px,4vw,48px) clamp(20px,4vw,44px)" }}>
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
                    <ContentSection
                      section={s}
                      sectionNumber={i + 1}
                      totalSections={sections.length}
                      isActive={isCurrent}
                      nextLabel={nextContentLabel(i)}
                      onComplete={() => markSectionComplete(s.id)}
                    />
                  )}
                  {!isLocked && s.section_type === "quiz" && (
                    <QuizSection section={s} user={user} onComplete={() => markSectionComplete(s.id)} />
                  )}
                  {!isLocked && s.section_type === "final_test" && (
                    <FinalTestSection
                      section={s}
                      user={user}
                      moduleId={moduleId}
                      onPass={() => navigate({ to: "/academy/dashboard" })}
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
