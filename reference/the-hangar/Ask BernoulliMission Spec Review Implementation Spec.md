# Ask Bernoulli — Mission Spec Review: Implementation Spec

**Project:** TorqWings / The Hangar
**Feature:** "Ask Bernoulli" action on the Bernoulli Agent page, scoped to Mission Agent (B01) spec review
**Status:** Ready for implementation
**Prepared:** September 2026

> This is the build spec for one concrete user flow: land on the Bernoulli page from Mission, pick a spec from the dropdown, click **Ask Bernoulli**, get a rendered report on the page. It implements the `PHYS-M01`–`PHYS-M05` rule set already defined in `Bernoulli_Mission_Integration.md` — that doc is the source of truth for *what* the checks are; this doc is the source of truth for *how the page and the call work*.
>
> Naming assumption: this spec uses `Hangar_Bernoulli` / `BERN-M0N` naming (full rebrand, matching the Bernoulli Agent rename) rather than `Hangar_Physics` / `PHYS-M0N`. If you want to keep the `physics`-prefixed table/event names from the earlier docs, swap the names below before handing this to Claude Code — the logic doesn't change either way.

---

## 1. User flow (as it exists today)

1. User is on a Mission spec detail page, navigates to the Bernoulli Agent page.
2. Bernoulli page loads with a **spec selector dropdown** — populated from `Hangar_Missions_specs` (or equivalent Mission spec list), most recent first.
3. User selects a spec from the dropdown. Its summary (vehicle class, KPIs, constraints — same fields shown in the Mission page) loads into the page for reference, but **no review runs yet**.
4. User clicks **Ask Bernoulli**.
5. Frontend shows a loading state (checks run in seconds, not instant — deterministic checks are fast, the Claude call is the bottleneck).
6. Backend runs the `BERN-M01`–`BERN-M05` rule set (see §4) against the selected spec, persists the result, and returns it.
7. Report renders on the page: overall verdict, per-check results, confidence score, and a **save** affordance (matches the existing "save card appears pre-filled, editable" pattern from the parent Bernoulli spec doc).

---

## 2. Frontend requirements

### 2.1 Spec selector
- Dropdown sourced from Mission Agent's persisted specs (the same records shown on the Mission page). Label each option with spec identifier + mission type + created date, e.g. `5F503ACE... — Aerial photography — Sep 10, 2026`.
- Selecting a spec loads it into a read-only summary panel (vehicle class, KPI table, constraint list) so the user can see what they're about to send for review before committing. Reuse the Mission page's existing spec-summary component if one exists — don't rebuild KPI/constraint rendering from scratch.

### 2.2 "Ask Bernoulli" button
- Disabled until a spec is selected.
- On click: `POST` to the review endpoint (§3), button enters a loading state, disabled for the duration of the call.
- On success: render the report (§2.3) below/beside the spec summary. On failure (network/API error, not a review FAIL): show an inline error with a retry action — do not silently fail.

### 2.3 Report display
Render directly from the response schema in §3 — don't transform it further client-side:

- **Verdict banner** at the top: `PASS` (green) / `WARN` (amber) / `FAIL` (red), matching the color language already used elsewhere in The Hangar UI (Pass/Fail/Conditional badges on other bay pages).
- **Per-check list**, one row per entry in `checks[]`:
  - Rule ID (`BERN-M01`, etc.) and status badge
  - Message text
  - A small "via Claude" tag on checks where `source_was_mock: true`, so the user can see which findings came from deterministic arithmetic vs. an LLM judgment call — this distinction matters for how much weight to give a WARN
- **Confidence score**, displayed alongside (not merged with) Mission Agent's own extraction-confidence score, per the note in `Bernoulli_Mission_Integration.md` §6.
- **Save button** — persists the review record against the spec (see §5); pre-filled, editable, confirmation toast on save, matching the pattern already used on the Bernoulli agent page design.

---

## 3. API contract

**Endpoint:** `POST /api/the-hangar/bernoulli/review`

**Request:**
```json
{
  "mission_spec_id": "uuid",
  "checks_requested": ["BERN-M01", "BERN-M02", "BERN-M03", "BERN-M04", "BERN-M05"]
}
```
`checks_requested` defaults to all five if omitted — the frontend doesn't need to enumerate them explicitly for this flow, but the field stays required-shaped (non-empty array) per the gate-mechanics rule inherited from the parent spec doc (no silent default check set).

**Response:**
```json
{
  "review_id": "uuid",
  "mission_spec_id": "uuid",
  "verdict": "PASS | WARN | FAIL",
  "checks": [
    {
      "rule_id": "BERN-M01",
      "status": "PASS | WARN | FAIL | INFO",
      "message": "...",
      "source_was_mock": false
    }
  ],
  "confidence_score": 0.62,
  "created_at": "2026-09-10T..."
}
```

Note `source_was_mock` moved to per-check (see §4) rather than one flag for the whole response — a single review mixes deterministic and Claude-backed checks, and the parent spec doc's convention is that the flag should reflect where each individual result actually came from.

---

## 4. Backend logic — `bernoulliRules.ts`

Mirrors the shape of `materialsRules.ts` / `manufacturingRules.ts` / `certificationRules.ts` from Bays 10–12: one rules file, one function per rule, a top-level orchestrator that runs them and assembles the verdict.

```ts
// src/lib/the-hangar/bernoulliRules.ts

type CheckResult = {
  rule_id: string;
  status: "PASS" | "WARN" | "FAIL" | "INFO";
  message: string;
  source_was_mock: boolean;
};

// BERN-M01 — deterministic. Range/endurance/reserve → plausible avg speed.
function checkSpeedConsistency(spec: MissionSpec): CheckResult { /* arithmetic only, no LLM call */ }

// BERN-M02 — deterministic. Coverage math: n_units * per_unit_angle >= 360.
function checkCoverageMath(spec: MissionSpec): CheckResult { /* arithmetic only */ }

// BERN-M03 — Claude Sonnet 5 call. Payload/endurance/vehicle-class plausibility.
async function checkPayloadEndurancePlausibility(spec: MissionSpec): Promise<CheckResult> { /* calls llmGateway.ts */ }

// BERN-M04 — deterministic tag check + optional Claude call for the flag message.
async function checkKpiProvenance(spec: MissionSpec): Promise<CheckResult> { /* deterministic scan; Claude only invoked if untagged KPIs are found */ }

// BERN-M05 — deterministic. Unit/dimensional consistency across all KPI values.
function checkDimensionalConsistency(spec: MissionSpec): CheckResult { /* unit matching only */ }

export async function runBernoulliReview(spec: MissionSpec, checksRequested: string[]): Promise<{
  verdict: "PASS" | "WARN" | "FAIL";
  checks: CheckResult[];
  confidence_score: number;
}> {
  // Run deterministic checks first (cheap, no network) — M01, M02, M05
  // Then Claude-backed checks — M03, and M04's message step if triggered
  // Verdict = FAIL if any hard-gate rule (M01, M05) is FAIL
  //         = WARN if any other rule is WARN
  //         = PASS otherwise
  // confidence_score = weighted average, see parent spec doc §4.3 for the general formula;
  //   for Mission-stage specifically, weight M01/M05 heavier since they're the hard gates
}
```

**Key implementation notes carried over from project convention:**
- `ANTHROPIC_API_KEY` (plain name) via `llmGateway.ts` for the `BERN-M03` (and conditional `BERN-M04`) calls — same gateway every other bay uses, no new integration needed.
- Deterministic checks (`BERN-M01`, `BERN-M02`, `BERN-M05`) run first and cheaply — no reason to make the user wait on a Claude round-trip for arithmetic. Only block on the network call for `BERN-M03`/`BERN-M04`.
- Ownership-assertion (`assertMissionSpecOwnership` or equivalent) belongs in `BernoulliAgentPipeline.ts`, not in `bernoulliRules.ts` itself, per the existing convention of keeping ownership checks out of the rules files.
- Read real Bay 09/12 gate-logic files before writing this — schema drift between spec and code has bitten this project before; match the existing rules-file shape exactly rather than inventing a new pattern.

---

## 5. Persistence

Versioned three-table pattern, same shape as every other bay:

- `Hangar_Bernoulli` — one row per review request: `mission_spec_id`, `bay` (always `B01` for this flow), `gate_type` (`hard`), `created_at`
- `Hangar_Bernoulli_specs` — the review output: `verdict`, `checks` (jsonb array), `confidence_score`
- `Hangar_Bernoulli_runs` — run metadata: which checks hit the LLM gateway, latency, `source_was_mock` per check, raw model response for debugging

Use `supabaseAdmin` throughout, `.limit(1)` not `.single()` on any lookup query, RPCs with `SET search_path = ''`. Schema changes applied manually via the Supabase SQL Editor first, migration file reconciled and committed afterward — same as every other bay.

Since this table only needs to support one caller (Mission Agent / B01) for now, `mission_spec_id` is a direct foreign key rather than the generic `(caller_bay, caller_run_id)` shape suggested in the parent spec doc for the cross-cutting case — simplify to the concrete case here, generalize later if/when B02/B03/B09/B12 integrations are built.

---

## 6. Verification before merge

Per project convention — no committed test runner, verify via a throwaway script:

```
npx tsx scripts/verify-bernoulli-rules.ts
```

Should cover: a clean spec (all PASS), a spec that trips each rule individually, and the actual worked example from `Bernoulli_Mission_Integration.md` §4 (the 5-drone swarm case) as a known-answer regression check — that example should reproduce the same WARN verdict and the same four flagged checks documented there. Don't commit the script; verify, confirm output matches, discard.

Also verify on the Vercel preview deployment before merging to `main` — confirm the Claude Sonnet 5 calls actually resolve against the real `ANTHROPIC_API_KEY` env var in that environment, not just locally.

---

## 7. Scope boundary

This spec covers the Mission Agent (B01) call point only — the dropdown, the button, and the report on the Bernoulli page as it exists today. It does **not** cover:
- Making this a synchronous hard gate that blocks Mission Agent from advancing to Concept Agent automatically (today's flow is user-triggered review, not an automatic pipeline gate) — that's a separate integration decision for later
- The B02/B03/B09/B12 hard-gate call points or the B04–B08 async call points from the parent spec doc
- Any UI changes to the Mission page itself

---

*End of Ask Bernoulli — Mission Spec Review implementation spec.*