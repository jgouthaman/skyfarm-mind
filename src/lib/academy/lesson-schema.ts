// JSON schema for the paginated slide-deck lesson viewer. A Lesson is a
// fixed sequence of hand-authored Slides (unlike AcademyModuleSection
// content, which is AI-generated at render time) — used for lessons where
// the content, diagrams, and interactive pieces are curated up front.

export interface GlossaryEntry {
  term: string;
  definition: string;
}

export type InlineNode =
  | { kind: "text"; text: string }
  | { kind: "em"; text: string }
  | { kind: "strong"; text: string }
  | { kind: "term"; text: string; glossary: GlossaryEntry };

export type RichText = InlineNode[];

export interface HeadingBlock {
  type: "heading";
  level: 1 | 2 | 3;
  text: string;
}

export interface LedeBlock {
  type: "lede";
  text: RichText;
}

export interface ParagraphBlock {
  type: "paragraph";
  text: RichText;
}

export interface FormulaBlock {
  type: "formula";
  expression: string;
  size?: "sm" | "md";
}

export type CalloutVariant = "tip" | "analogy" | "key" | "problem" | "note";

export interface CalloutBlock {
  type: "callout";
  variant: CalloutVariant;
  icon: string;
  heading: string;
  text: RichText;
}

export interface SpecListBlock {
  type: "specList";
  variant: "blue" | "red";
  heading: string;
  items: string[];
}

export interface MarkListItem {
  icon: string;
  tone?: "ok" | "warn";
  text: RichText;
}

export interface MarkListBlock {
  type: "markList";
  items: MarkListItem[];
}

export interface DataTableBlock {
  type: "dataTable";
  columns: string[];
  rows: string[][];
}

export interface RegimeBarChart {
  kind: "regimeBar";
  /** log10 position of the marker, e.g. 5.23 for Re ≈ 171,000 */
  markerLog10: number | null;
  minLabel: string;
  maxLabel: string;
  bandLabel?: string;
  bandStartLog10?: number;
  bandEndLog10?: number;
}

export interface IllustrationBlock {
  type: "illustration";
  caption: string;
  svg?: string;
  chart?: RegimeBarChart;
}

export interface QuickCheckBlock {
  type: "quickCheck";
  question: string;
  options: string[];
  correctIndex: number;
}

export interface CustomBlock {
  type: "custom";
  component: string;
  props?: Record<string, unknown>;
}

export type SlideBlock =
  | HeadingBlock
  | LedeBlock
  | ParagraphBlock
  | FormulaBlock
  | CalloutBlock
  | SpecListBlock
  | MarkListBlock
  | DataTableBlock
  | IllustrationBlock
  | QuickCheckBlock
  | CustomBlock
  | RowBlock;

/** Lays child blocks side-by-side (two-up grid, stacks on narrow screens) — e.g. a pair of comparison SpecLists. */
export interface RowBlock {
  type: "row";
  blocks: Exclude<SlideBlock, RowBlock>[];
}

export interface Slide {
  id: string;
  eyebrow: string;
  /** Short label for the chapter sidebar nav — falls back to `eyebrow` when omitted. */
  navTitle?: string;
  readTime?: string;
  blocks: SlideBlock[];
  /** Overrides the lesson-level quickRef while this chapter is active. */
  quickRef?: QuickRefData;
}

export interface QuickRefFact {
  label: string;
  value: string;
}

export interface QuickRefData {
  formula: string;
  facts: QuickRefFact[];
  highlightValue?: string;
  highlightLabel?: string;
}

export interface Lesson {
  id: string;
  title: string;
  sectionIndex: number;
  totalSections: number;
  /** "Mission brief" banner at the top of the lesson — what the learner will be able to do by the end. */
  missionBrief?: RichText;
  slides: Slide[];
  quickRef?: QuickRefData;
}

export function richText(text: string): RichText {
  return [{ kind: "text", text }];
}
