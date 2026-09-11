# Bernoulli Integration — Bay 01 Mission Agent

**Status:** Live (fully wired, including real BERN-M01–M05 checks and saved-report reload)

## Overview

Mission Agent is Bernoulli's origin call point — every other bay's link ultimately resolves back to *a* Mission spec, but Mission is the only bay that *is* one. No chain-walking is needed here: the mission's own id is the id Bernoulli needs.

## How the link works

- **Trigger:** "Ask Bernoulli →" link, placed next to the confidence-score number in the header.
  - Live view: `MissionDashboard` (in `src/routes/the-hangar.mission.tsx`)
  - Read-only past view: `PastMissionDetail` (same file), shown when a *finalized* mission is opened from "Your missions"
- **Target:** `/the-hangar/bernoulli`
- **Search params:**
  ```
  { source: "mission", missionId: <mission id>, sourceId: "" }
  ```
  - Live view uses `result.missionId` (the just-generated `MissionResult`)
  - Past view uses `mission.missionId` (the `MissionListEntry`)
- **Disabled when:** the mission is finalized (`finalizeState.status === "saved"` in the live view, `mission.status === "finalized"` in the past view) — dimmed, `pointer-events: none`, with a tooltip explaining why.

## Mission resolution

None needed — `missionId` is passed directly, no server-side chain walk.

## Round trip back

On the Bernoulli page, `search.source === "mission"` highlights the **Bay 01 Mission Agent** box (amber glow) and turns it into a `Link` back to `/the-hangar/mission` — this is the only way back, there's no separate nav-bar "Back to Mission" link anymore.

## Backend (the review itself)

This is the one bay with a fully real backend behind it, not just navigation plumbing:

- `src/lib/the-hangar/bernoulliChecks.ts` — the 5 checks (BERN-M01–M05)
- `src/lib/the-hangar/bernoulliPersistence.ts` — `Hangar_BernoulliReviews` / `_specs` / `_runs` (3-table versioned pattern)
- `src/lib/the-hangar/bernoulliAgentPipeline.ts` — `runBernoulliReviewStage()` (run a fresh review) and `getLatestBernoulliReview()` (load the last saved one)
- `src/routes/api.hangar.process-bernoulli.review.ts` — `POST`, runs a review
- `src/routes/api.hangar.bernoulli-review.ts` — `GET ?missionId=`, loads the latest saved review
- Migration: `supabase/migrations/20260914000000_hangar_bernoulli_agent.sql`

See `Ask BernoulliMission Spec Review Implementation Spec.md` for the original spec this was built against.

## Files touched (frontend)

- `src/routes/the-hangar.mission.tsx` — `MissionDashboard`, `PastMissionDetail`, `.hgr-m-dash-bernoulli-link`
- `src/routes/the-hangar.bernoulli.tsx` — the picker, spec display, report rendering, `LEFT_CALLERS` entry `{ bay: "01", key: "mission", to: "/the-hangar/mission" }`
