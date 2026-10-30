# Claude Code prompt — Raman Agent (Bay 16) beta: front end, API routes, GCP wiring, Supabase migration

Paste everything below the line into Claude Code in VS Code, from the repo root `C:\Workshop\Glacier\skyfarm-mind`.

Before you paste:
1. Save the spec as `reference/the-hangar/RamanAgent.md` (export the "Raman Noise Check (RNC) — Phase 1 Build Spec" doc as Markdown).
2. Copy the two Python files into the repo at `th-gcp-service/agents/raman/`:
   `raman_engine.py`, `handler.py`, plus an empty `__init__.py`.
3. Create the branch: `git checkout -b feature/raman-bay16` (from an up-to-date `dev`).

---

You are working in the TorqWings `skyfarm-mind` repo. Build the **Raman Agent (Bay 16)** standalone beta: a UAV noise assessment workspace inside the admin-only Mission Hub at `/mission`, under a new left-tree node **Upcoming Agents → Raman**. The full product spec is `reference/the-hangar/RamanAgent.md`. Read it fully first.

## 0. Read before writing anything (do not skip)

Read these and summarise back to me in 10–15 lines before you change any file:

- `reference/the-hangar/RamanAgent.md` (the spec).
- `CLAUDE.md` and any conventions doc in `reference/the-hangar/`.
- The Mission Hub: its route file(s), layout, the left tree component, and how its admin login/guard works. Raman must reuse that login and guard — no new auth.
- How the front end already calls the GCP Python service: the Vercel server-side route used by the Vehicle Agent / Bay 01 GCP path, the env var holding the GCP endpoint URL, and the request/response shape. Raman must use the **same relay pattern and the same env var**. The browser must never call the GCP IP directly (the CSP only allows self, Supabase and api.anthropic.com).
- `th-gcp-service/`: the router/main app and `agents/mission/handler.py`, to learn the handler contract (entry function name, request shape, how agents are registered).
- `th-gcp-service/agents/raman/raman_engine.py` and `handler.py` (already added by me). Do not change the physics in `raman_engine.py`. You may only adapt `handler.py` so it matches the router contract.
- `src/lib/**/llmGateway.ts` (or wherever it lives) and one existing bay's `*AgentPipeline.ts` / `*Persistence.ts` to copy patterns.

**Framework note:** the spec says "Next.js", but this repo is React + TypeScript + Vite + TanStack Router/Start. Follow what the repo actually uses. All new files are `.ts` / `.tsx` only — no `.js`.

## 1. Standing rules (from this project's conventions)

- Use `supabaseAdmin` for all server-side persistence. Use `.limit(1)`, never `.single()`.
- RPCs, if any, use `SET search_path = ''`; no `SECURITY DEFINER` unless I approve.
- Do not use `createServerFn`; use plain async functions and the repo's existing API-route style.
- Ownership/role assertions live in `RamanAgentPipeline.ts`, not in the persistence file.
- LLM calls go only through `llmGateway.ts` with `ANTHROPIC_API_KEY`. Every LLM-written text block is tagged "via Claude" in the UI. Every result carries `source_was_mock`: `false` on a real call, `true` only on fallback, and the fallback must be loud (logged and shown as a badge), never silent.
- **No LLM computes any number.** All dB levels, RPMs and trade-offs come from the Python engine.
- Never `git add -A`. Discard `src/routeTree.gen.ts` changes before committing. Feature branch → PR to `dev` → PR to `main`.
- No new npm dependencies without asking me first (name the package and why).
- Stop at the end of each part below, report what changed and how you verified it, and wait for my "go".

## 2. Part A — GCP wiring (Python, minimal)

1. Register `agents/raman` in the `th-gcp-service` router exactly the way `mission` is registered. Agent key: `raman` (Bay 16).
2. Adapt `agents/raman/handler.py` only as needed to match the router's entry-point name and request/response shape. The engine functions are: `noise_check`, `evaluate_design`, `lever_ranges`, plus `health`.
3. No new Python dependencies (the engine is standard library only).
4. Verify locally: `python th-gcp-service/agents/raman/handler.py` prints a result with `"status": "ok"`. Then call the router locally (the same way Bay 01 is tested) with `{"agent":"raman","function":"health"}`.

## 3. Part B — Supabase migration

Write `supabase/migrations/<timestamp>_raman_bay16.sql`. I will run it in the Supabase SQL Editor first, then you reconcile the file. Use spec §8.1 tables, lowercase `raman_*` names, `uuid` PKs (`gen_random_uuid()`), `created_at` / `updated_at timestamptz default now()`, FKs with `on delete cascade` where a child cannot exist alone, and indexes on every FK.

- `raman_customers`: name, company, email, phone, notes, created_by (uuid → auth.users).
- `raman_vehicles`: customer_id, name, vehicle_type (check: 'multirotor','vtol','fixed_wing'), layout, notes.
- `raman_engagements`: vehicle_id, cycle int (unique per vehicle), status (check: 'open','closed'), furthest_tab int (1–5), payment1_status and payment2_status (check: 'pending','paid','waived'; placeholder flags only), before_dba numeric, after_dba numeric, target_dba numeric, target_distance_m numeric, closed_at.
- `raman_noise_checks`: engagement_id, kind (check: 'baseline','fix_prediction'), inputs jsonb, provenance jsonb, result jsonb (the full engine response), verdict (check: 'PASS','WARN','FAIL','INFO'), headline text, hover_dba numeric, confidence_score numeric, engine_version text, summary_text text (LLM), summary_source_was_mock bool, issued_at, frozen bool default false.
- `raman_agent_runs`: engagement_id, goal jsonb (target, max_added_mass_g, min_flight_time_change_pct, max_iterations), status (check: 'running','completed','stopped','failed'), stop_reason text, model text, source_was_mock bool, recommended_design jsonb, locked_design jsonb, locked_result jsonb, started_at, finished_at.
- `raman_agent_steps`: run_id, iteration int, reasoning text, action jsonb (the `changes` sent to `evaluate_design`), result jsonb (the engine response), predicted_dba numeric, delta_db numeric, tradeoffs jsonb, feasible bool, created_at. Unique (run_id, iteration).
- `raman_propellers`: brand, model, diameter_in, pitch_in, blade_count, chord_075_over_r, geometry jsonb, performance jsonb, source_url, status (check: 'unverified','verified','rejected'), verified_by, verified_at, loaded_via (check: 'manual','llm').
- `raman_reports`: engagement_id, type (check: 'check','final','certificate'), certificate_code text unique (format `RNC-YYYY-NNNN`), storage_path, issued_at, issued_by.
- `raman_payments`: engagement_id, stage (1 or 2), amount_inr numeric, status, reference. (Placeholder only.)

RLS: enable on every table. Policy: only Mission Hub admins can select/insert/update. Reuse whatever admin check the Mission Hub already uses (role column, claims, or admin table) — find it and use the same thing. Service role (supabaseAdmin) bypasses RLS as usual. Enable Supabase Realtime on `raman_agent_steps` if the repo already uses Realtime anywhere; otherwise plan on polling (see Part D).

## 4. Part C — Server side (TypeScript)

Create under the repo's lib folder, e.g. `src/lib/raman/`:

- `ramanEngineClient.ts` — the only code that calls GCP. Posts `{agent:"raman", function, payload}` through the existing relay helper and env var. Timeout 20 s. Throws a typed error on `status:"error"` and passes field errors through.
- `ramanPersistence.ts` — all `supabaseAdmin` reads/writes for the tables above.
- `RamanAgentPipeline.ts` — orchestration plus the admin assertion (`assertRamanAdmin`).
- `ramanAgentLoop.ts` — the Noise Fix agent (see below).
- `ramanTypes.ts` — TypeScript types matching the engine's JSON exactly (read `raman_engine.py` return dicts; do not invent fields).

API routes, following the repo's existing API-route convention and path prefix (check whether it is `/api/the-hangar/...`; use `/api/the-hangar/raman/...` unless the repo says otherwise):

| Route | Does |
|---|---|
| `GET/POST customers`, `GET/POST vehicles` | list/create; search by name |
| `POST engagements` | new cycle for a vehicle (cycle = max+1) |
| `GET engagements/:id` | engagement + latest check + runs + reports (drives which tab opens) |
| `POST noise-check` | validate → engine `noise_check` → LLM summary (≤5 sentences, causes only, no fixes, from the numbers given) → persist `raman_noise_checks` (kind baseline) → update engagement before_dba, furthest_tab=2 |
| `POST evaluate` | engine `evaluate_design` for the sliders. **No persistence.** |
| `GET lever-ranges/:engagementId` | engine `lever_ranges` |
| `POST payments/:engagementId/:stage` | placeholder: mark paid/waived, unlock next tabs |
| `POST fix-runs` | start the agent loop (below); returns run_id immediately |
| `GET fix-runs/:id/steps?after=N` | steps after iteration N (for polling/replay) |
| `POST fix-runs/:id/stop` | sets a stop flag the loop checks each iteration |
| `POST fix-runs/:id/lock` | body: final `changes` (agent's recommendation, possibly tuned with sliders) → engine `evaluate_design` once more → persist `locked_design`, `locked_result`, a `raman_noise_checks` row (kind fix_prediction), engagement after_dba, furthest_tab=5 |
| `POST engagements/:id/close` | freeze all checks, status closed |
| `POST reports/:engagementId/:type` | create a report row and certificate code; return the data the PDF needs |
| `GET/POST propellers`, `POST propellers/load` | propeller DB list/edit; Load = LLM research call returning specs with source URLs, saved as `unverified` |

Frozen rule: once a check is issued (`frozen=true`), any route that would change it must refuse with 409. Changing inputs means a new engagement cycle.

### Noise Fix agent loop (`ramanAgentLoop.ts`) — this is what makes Raman agentic

- Tools exposed to Claude (tool use via `llmGateway.ts`): `evaluate_design(changes)` and `get_lever_ranges()`. Both call the engine; the agent never sees or produces a number the engine didn't return.
- Inputs to the agent: the baseline Noise Check (breakdown, drivers, performance), the goal (target dBA at the target distance), and constraints (max added mass, min flight-time change, lever ranges, `feasible` must be true).
- Each iteration the agent must return a short **reasoning** (what it noticed in the last result and why it is choosing this change) and one **action** (`changes` object). The loop calls the engine, saves a `raman_agent_steps` row (reasoning, action, result), and feeds the result back.
- The agent decides the next move from results: refine, combine levers, or drop one. A fixed sweep is not acceptable.
- Stop when: target met with all constraints satisfied; or no improvement of ≥0.5 dB over 2 iterations; or a constraint can't be satisfied; or the stop flag is set; or 8 iterations. Store `stop_reason`. If the target is unreachable, say so and recommend the closest feasible design.
- At the end, the agent returns 3–5 ranked options (each a `changes` object it actually evaluated, with its result) and a recommended one → `recommended_design`.
- Run the loop server-side and write steps as they happen, so the UI can show them live. Make sure this works within Vercel's function time limit (check the repo's `maxDuration` setting); if it may exceed it, run each iteration as its own request driven by the client, keeping all decisions server-side.
- If `ANTHROPIC_API_KEY` is missing or the call fails: do **not** fall back silently. Mark the run `failed` with the error, or (only if I approve) use a clearly labelled rule-based planner with `source_was_mock=true` and the UI badge "Not agentic — fallback planner".

## 5. Part D — UI (`.tsx`)

Location: Mission Hub left tree → new node **Upcoming Agents** (a generic test-lab group; future agents go here) → **Raman**. Match the Mission Hub's existing look; spec §0.5 "Visual style" for colours (dark navy, white cards, one accent; PASS green, WARN amber, FAIL red).

Screens (spec §0.1, §0.2, §0.4, §0.5):

1. **Customer list**: search, New customer, New vehicle; choosing a vehicle opens its latest engagement at `furthest_tab`; New cycle button.
2. **Shell**: top bar (TorqWings · Raman, customer, vehicle, cycle badge), tab strip of five tabs with state icons (locked, active, done/frozen, awaiting payment), history drawer (cycle, date, before, after, reduction, status).
3. **Tab 1 Inputs**: the six required inputs with units and hints — take-off mass (kg), rotor count, propeller diameter (in/m toggle), blade count, motor KV + battery (cells or volts toggle), cruise speed (m/s or km/h toggle). Folded "Optional" section: propeller pitch (in), hover RPM, target dBA, target distance (default 10 m), environment (rural/suburban/urban/near people), rotor spacing (m), rotor-to-arm clearance ratio, altitude AGL, temperature, humidity, propeller brand/model (picker from verified `raman_propellers`). Generate Report disabled until the six are valid. Show engine field errors inline. Payload keys must be exactly the engine's: `take_off_mass_kg, rotor_count, prop_diameter, prop_diameter_unit ('in'|'m'), blade_count, motor_kv, battery_voltage | battery_cells, cruise_speed, cruise_speed_unit ('m/s'|'km/h'), prop_pitch_in, hover_rpm, target_dba, target_distance_m, environment, rotor_spacing_m, arm_clearance_ratio, altitude_agl_m, temperature_c, humidity_pct`.
4. **Tab 2 Noise Check report**: verdict banner + headline; levels-by-distance table and line chart with hover/cruise toggle; source breakdown bar (tonal, interaction, broadband, motor); 1/3-octave spectrum with the BPF marked; top drivers (causes only); assumptions panel (each assumed value links back to Tab 1 → new cycle); confidence score and "±5 dB early-stage estimate, not a certified measurement"; summary with "via Claude" tag; lock badge; Download PDF; Noise Fix button (shows Payment 2 placeholder, then unlocks Tab 3). Use the repo's existing chart library; if there is none, ask me before adding one.
5. **Tab 3 Fix options / live agent run** and **Tab 4 Agent run and tune** (spec §0.4 "Live agent run"):
   - Start Noise Fix → live view: the parameter sliders move on their own to each step's values; a semicircular **decibel gauge** (green/amber/red zones, target marker, needle, big digital dBA in the centre) animates to each step's result; live trade-offs (added mass g, flight time %, efficiency %); a **decision log** of Reasoning card → Action card per iteration.
   - Pace playback at ~1 s per step. Modes: **Auto** (default) and **Step** (Next button). Step mode only changes viewing pace, never the agent's decisions. Every frame must be a real saved step — no faked motion.
   - **Stop** is the only control during a run.
   - At the end: ranked options (cards: change in plain words, dB saved, trade-offs, effort) and the recommendation. The user can then tune with sliders (diameter, blade count, hover RPM, rotor spacing, arm clearance; ranges from `lever-ranges`). Debounce slider calls to `evaluate` by ~150 ms; show warnings and `feasible=false` clearly. **Lock this design** → `fix-runs/:id/lock`.
6. **Tab 5 Final report**: before/after headline, two gauges side by side, locked changes with final trade-offs, agent trace summary with a link to replay, Download PDF, **Download certificate**, Email to customer (stub: copy-to-clipboard of a draft email for now), Close engagement.
7. **Certificate PDF** — "TorqWings Raman Acoustic Assessment Certificate". One A4 page: navy header band with TorqWings logo placeholder and "Raman · UAV Noise Intelligence"; certificate ID, issue date, cycle; customer/vehicle/take-off mass; two big boxes (before in verdict colour, predicted after) with the dB reduction between; a table of hover/cruise levels at 10/30/100 m before vs after; locked changes and trade-offs; the statement "TorqWings has assessed this vehicle design using the Raman acoustic engine and recommended the changes above. Noise levels are predictions from engineering analysis, accurate to about ±5 dB. They are not measured values and do not certify regulatory compliance."; a gold seal (bottom-left, text "TorqWings · RAMAN · Assessed · Acoustic"); a QR code linking to `/mission/raman/verify/<certificate_code>` (admin-only for the beta); signature line "Jothi Gouthaman, Founder, TorqWings". Never use the words "certified compliant". If the repo has no PDF or QR library, ask me which to add.
8. **Propeller DB admin screen** (inside Raman): list/search/edit, Load button (LLM research → unverified rows with source links), Verify/Reject buttons.

## 6. Environment variables

List every env var you use, with where it is read and what it is for, and say which ones already exist. Do not invent values. Expected: the existing GCP relay URL var, `ANTHROPIC_API_KEY`, the existing Supabase URL/service-role vars. No new secrets in client code.

## 7. Verification (before PR)

- Throwaway `npx tsx scripts/verify-raman.ts` (do not commit): calls the engine through `ramanEngineClient` with (a) the 4.2 kg quad below — expect `status:"ok"` and a headline around 64 dBA at 10 m; (b) a missing field — expect field errors; (c) `vehicle_type:"vtol"` — expect the Spiral 1 rejection message; (d) `evaluate_design` with `{prop_diameter_in: 17}` — expect a negative `delta_db` and positive `added_mass_g`.
  Test vehicle: `{take_off_mass_kg: 4.2, rotor_count: 4, prop_diameter: 13, prop_diameter_unit: "in", blade_count: 2, motor_kv: 600, battery_cells: 6, cruise_speed: 12, cruise_speed_unit: "m/s", target_dba: 60, rotor_spacing_m: 0.55, environment: "urban"}`
- Run one full agent loop against that vehicle and paste the step trace (reasoning + predicted dBA per iteration) in your report.
- Check the frozen-tab rule returns 409.
- Test on the Vercel preview URL (not just localhost), including the GCP call and the Claude call.

## 8. Order of work

Part A → stop → Part B (migration file only; I run it) → stop → Part C → stop → Part D → stop → verification. Separate PRs for code and docs, matching earlier bays. Update `reference/the-hangar/RamanAgent.md` with any decision you had to make.

## 9. Build decisions (recorded during the build)

**Part A — GCP.** Done on the VM by Jothi, not in `th-gcp-service/`. The engine runs under `hangar_runner.py` (standard-library HTTP server on 127.0.0.1:8001, behind Apache at `/torqwings/api/`): `POST <runner>/run/raman` with `X-Hangar-Key`, body `{function, payload, request_id}`; 400 input errors with `fields`, 401 bad key, 500 engine failure. Raman reuses the Vehicle Agent's env vars `HANGAR_BAY3_RUNNER_URL` and `HANGAR_BAY3_KEY` (helpers exported from `designFileServer.ts`).

**Part B — migration** (`supabase/migrations/20261031010000_raman_bay16.sql`, run in the SQL Editor unchanged):
- Admin check `public.raman_is_admin()`: active admin/super_admin in `mission_hub_users`, matched on `id` or `auth_user_id`; plain invoker function, no `SECURITY DEFINER`. RLS: admins select/insert/update on all nine tables, no delete.
- Extra columns on `raman_agent_runs`: `stop_requested` (Stop flag), `ranked_options` (the 3–5 options), `error_message` (why a run failed or fell back).
- Certificate codes `RNC-<year>-<NNNN>` come from a sequence via a trigger on `raman_reports`; NNNN does not reset each year.
- `raman_agent_steps` is in `supabase_realtime` (the repo already uses Realtime).

**Part C — server.**
- API prefix is `/api/hangar/raman/...` (the repo's Hangar routes use `/api/hangar/`, not `/api/the-hangar/`).
- The Mission Hub lives at `/mission-hub`, not `/mission`.
- Noise Fix runs one iteration per request: the client calls `POST fix-runs/:id/step` until `done`. The main app sets no `maxDuration`, so no single invocation runs the whole loop; each request rebuilds the agent's context from the saved steps, so all decisions stay server-side.
- Extra route `POST fix-runs/:id/step` (one iteration) alongside the listed ones.
- Claude model `claude-opus-5-5`, effort medium, through a new `callClaude()` in `llmGateway.ts` (Anthropic only, returns the error instead of null). Opus 5.5 rejects forced tool use, so the agent's tools use `tool_choice: auto` with strict schemas and the prompt names the tool to call. The installed SDK (0.121.0) has no server-side `fallbacks` parameter, so none is set.
- Agent tools: `evaluate_design(reasoning, changes)`, `get_lever_ranges()`, `finish_run(outcome, reasoning, options, recommended_iteration)`. Ranked options must reference evaluated iterations; their numbers are copied from the saved steps.
- Stop rules are enforced in code before each iteration: target met with constraints; < 0.5 dB gain over the last 2 iterations (baseline counts as iteration 0); iteration limit (max 8); Stop flag. Claude can also end the run (unreachable, constraint can't be satisfied, no further gain).
- Goal defaults when not given: `max_added_mass_g` 150, `min_flight_time_change_pct` −10, `max_iterations` 8; target from the request, else the engagement/Noise Check target. Lever ranges are fetched once and stored in `goal.lever_ranges`.
- Fallback planner approved: if `ANTHROPIC_API_KEY` is missing or a Claude call fails, the run switches to a rule-based planner, `source_was_mock=true`, `model="fallback-planner"`, `error_message` says why, each step's reasoning starts "[Fallback planner -- not agentic]", logged with `console.error`. UI badge: "Not agentic — fallback planner".
- Noise Check summary: Claude only (so "via Claude" is true). If Claude fails, the summary is the engine's own headline and driver sentences with `summary_source_was_mock=true`, logged.
- Frozen rule: the baseline check is issued frozen when created; a second Noise Check in the same cycle, a second lock, or any write to a closed engagement returns 409.
- Payments: Payment 2 (paid or waived) is required to start Noise Fix and sets `furthest_tab` ≥ 3. Payment 1 is recorded but does not block the Noise Check in the beta.
- `furthest_tab`: 2 after the Noise Check, 3 after Payment 2, 4 when a run starts, 5 after Lock.
- Lock refuses an infeasible design (409) and saves a frozen `fix_prediction` check.
- Reports: the route creates the row and returns the data; the PDF is drawn in the browser (Part D, `jspdf` + `qrcode`), so `storage_path` stays empty for now.
- Propeller Load uses Claude with Anthropic's web search tool; a row is saved (unverified, `loaded_via='llm'`) only if its `source_url` is one the search actually returned.

**Part D — UI.**
- Pages: `/mission-hub/raman` (customers), `/mission-hub/raman/<engagementId>?tab=N` (workspace), `/mission-hub/raman/propellers` (propeller DB), `/mission-hub/raman/verify/<code>` (QR target, admin-only). Left tree: new **Upcoming Agents** section → Raman.
- Look: Raman is a navy canvas with white cards and the TorqWings amber accent inside the existing (light) Mission Hub shell, so the shell, login and guard are reused unchanged. Verdicts always show icon + label + colour.
- Lock now also reruns the engine's `noise_check` on the modified design (spec Tab 4 "reruns the full Noise Check") and stores it as `result.noise_check` on the `fix_prediction` row; this feeds the before/after levels table on Tab 5, the final report and the certificate. The modified inputs mirror `evaluate_design` exactly (checked: same hover level, 58.4 vs 58.4 dBA). New route `GET /api/hangar/raman/verify/:code`.
- Noise Fix live view: the browser drives `fix-runs/:id/step` and plays the saved steps back at ~1 s each (Auto or Step); only real saved steps are shown. Supabase Realtime is enabled on `raman_agent_steps` but the view doesn't need it, because each step comes back in the step response.
- Tab 4 sends only levers that differ from the original vehicle; hover RPM is sent only after it is moved deliberately (otherwise the engine derives it).
- Spectrum chart starts at 0 dBA (bands below are inaudible and not drawn).
- PDFs are drawn in the browser with `jspdf`; the certificate QR uses `qrcode` (added with `@types/qrcode`). The logo is a placeholder "TW" mark.
- New cycle from Tab 1/Tab 2 (including clicking an assumed value) prefills the next cycle's inputs via `sessionStorage` and focuses the field.
- Email to customer is a stub: copies a draft to the clipboard.
- AI providers, same as Bay 01: the Noise Check summary and the Noise Fix agent use the Mission Hub → Configurations → AI Providers order — the primary provider first, the secondary if it fails (Groq `openai/gpt-oss-120b` via OpenAI-style function calling; Claude `claude-opus-5-5` via tool use). Only when neither answers do they fall back to engine text / the rule-based planner (loud, as before). Propeller Load stays Claude-only because it needs Anthropic's web search to return real source links.
- Provenance per provider: `raman_noise_checks.summary_provider` and `raman_agent_steps.model` (migration `20261031020000_raman_llm_provider.sql`); `raman_agent_runs.model` shows the provider currently answering. The UI tags text "via Claude" or "via Groq" (never "via Claude" for Groq output), per step in the decision log.
- "AI" flag (same badge and logic as Bay 01) on every Raman page, from `GET /api/hangar/raman/ai-status` every 60 s: the first reachable provider in the AI Providers order (spark = Claude, bolt = Groq), the order itself, and "Primary X unavailable · using secondary Y" when the secondary has taken over; amber "Fallback planner" when none answers.
- Landing page header laid out like Bay 01: status row (Bay 16 badge + AI flag), then "Raman Agent" beside a short write-up of what the agent does.
- PDF text is normalised to characters jsPDF's Helvetica can draw (AI text uses typographic hyphens and quotes).

**Changes after the first test runs (requested by Jothi).**
- Tab 4 is labelled **Agentic Noise Fix** (was "Agent Run and Tune").
- Name: the agent is titled **Ask Raman** (sidebar, page titles, header). Product names in reports stay "Raman Noise Check" / "Raman Noise Fix".
- Look and feel now matches Bay 01 Mission Agent instead of the navy canvas in spec §0.5: white page on the blue 44px grid, light-blue panels with hairline borders, 2px corners, IBM Plex Mono uppercase labels and card titles with a blue left rule, amber primary / blue-outlined secondary buttons, the tab strip as Bay 01's numbered stage tracker, and the hangar-doors animation on the landing header.
- Certificate signature line reads "For TorqWings" (no personal name).
- Tab 1 validation: optional values outside the ranges `raman_engine.py` accepts (temperature −30..55 °C, humidity 5..100 %, arm clearance 0.01..1, rotor spacing 0..10 m, altitude 2..500 m, chord 0.04..0.35) are rejected inline, because the engine would otherwise silently replace them with defaults. A typed hover RPM is rejected if it is more than 2× away from the RPM the engine derives from thrust = weight (a 120 rpm entry on a 4.2 kg quad produced a 7 dBA "baseline").
- Noise Fix: a design counts only if it is quieter than the baseline (`delta_db` < 0); options never include louder designs; a run won't start if the baseline already meets the target.
- Groq tool calls: levers sent as strings, at the top level, or as a JSON string are accepted; an unusable `evaluate_design` call gets one corrective tool result before the next provider is tried.
