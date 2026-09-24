import { callLlmGateway, stripJsonFences, type LlmUsage } from "./llmGateway.ts";
import type { FinalizedConstraint, FinalizedKpi } from "./missionSpecAssembly.ts";
import type { CandidateConcept } from "./conceptIdeation.ts";

// Concept Agent Stage 2 — Trade-off Reasoning. Deliberately labeled (here
// and in the UI) as Claude reasoning against the mission's own stated
// KPIs/constraints, NOT a benchmark-database or knowledge-graph lookup —
// no such database exists yet (contextRetrieval.ts is still a stub
// returning []). Honesty-about-what's-real pattern, same as elsewhere in
// this app (mock: boolean fields, StubResult).
//
// PRODUCTION FIX: analyzeConceptTradeoffs was a createServerFn until this
// change — same "Server function info not found" manifest bug as
// generateConceptIdeas (see conceptIdeation.ts's header comment), and same
// fix: its only caller anywhere in the codebase is conceptAgentPipeline.ts's
// runTradeoffReasoningStage, server-only, so the createServerFn RPC/hash
// dispatch mechanism was never actually needed.
const SYSTEM = `You are Concept Agent's trade-off reasoning step for TorqWings' aerospace design platform. Given a set of candidate vehicle concepts and the mission's finalized constraints and KPIs, evaluate each concept against those constraints and KPIs only — do not invent benchmarks, market data, or facts not present in the input. For each concept, list its pros and cons relative to the given KPIs/constraints, judge whether it fits the constraints ("pass" if it violates none, "fail" if it clearly violates a hard constraint, "partial" otherwise), and give a fit score from 1 (poor fit) to 10 (excellent fit) reflecting how well it satisfies the KPIs. Return JSON only.`;

export interface TradeoffReasoningInput {
  candidates: CandidateConcept[];
  constraints: FinalizedConstraint[];
  kpis: FinalizedKpi[];
}

export type ConstraintFit = "pass" | "partial" | "fail";

export interface ConceptTradeoffNote {
  conceptName: string;
  prosCons: string[];
  constraintFit: ConstraintFit;
  fitScore: number;
  rationale: string;
}

export interface TradeoffReasoningResult {
  notes: ConceptTradeoffNote[];
  mock: boolean;
  usage: LlmUsage | null;
}

export async function analyzeConceptTradeoffs(data: TradeoffReasoningInput): Promise<TradeoffReasoningResult> {
  const userContent = `Candidate concepts: ${JSON.stringify(data.candidates, null, 2)}
Constraints: ${JSON.stringify(data.constraints, null, 2)}
KPIs: ${JSON.stringify(data.kpis, null, 2)}

Return: { "notes": [{ "concept_name": "string", "pros_cons": ["string"], "constraint_fit": "pass | partial | fail", "fit_score": 1-10, "rationale": "string" }] } — one entry per candidate concept, using the same concept_name values given above.`;

  const { content, usage } = await callLlmGateway(SYSTEM, userContent, { jsonMode: true });
  if (!content) return { notes: mockNotes(data), mock: true, usage: null };

  const parsed = parseTradeoffResponse(content);
  if (!parsed || parsed.length === 0) return { notes: mockNotes(data), mock: true, usage: null };
  return { notes: parsed, mock: false, usage };
}

function isConstraintFit(value: unknown): value is ConstraintFit {
  return value === "pass" || value === "partial" || value === "fail";
}

function parseTradeoffResponse(raw: string): ConceptTradeoffNote[] | null {
  try {
    const obj = JSON.parse(stripJsonFences(raw));
    if (!Array.isArray(obj.notes)) return null;
    const notes = obj.notes
      .filter(
        (n: unknown): n is Record<string, unknown> =>
          typeof n === "object" &&
          n !== null &&
          typeof (n as Record<string, unknown>).concept_name === "string",
      )
      .map((n: Record<string, unknown>): ConceptTradeoffNote => {
        const rawScore = typeof n.fit_score === "number" ? n.fit_score : Number(n.fit_score);
        return {
          conceptName: n.concept_name as string,
          prosCons: Array.isArray(n.pros_cons)
            ? n.pros_cons.filter((p: unknown): p is string => typeof p === "string")
            : [],
          constraintFit: isConstraintFit(n.constraint_fit) ? n.constraint_fit : "partial",
          fitScore: Number.isFinite(rawScore) ? Math.min(10, Math.max(1, rawScore)) : 5,
          rationale: typeof n.rationale === "string" ? n.rationale : "",
        };
      });
    return notes.length > 0 ? notes : null;
  } catch {
    return null;
  }
}

function mockNotes(data: TradeoffReasoningInput): ConceptTradeoffNote[] {
  return data.candidates.map((c) => ({
    conceptName: c.conceptName,
    prosCons: ["Mock trade-off note — no ANTHROPIC_API_KEY reply."],
    constraintFit: "partial" as const,
    fitScore: 5,
    rationale: "Mock fallback.",
  }));
}
