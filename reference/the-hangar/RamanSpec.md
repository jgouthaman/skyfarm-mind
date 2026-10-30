# Raman Noise Check (RNC) — Phase 1 Build Spec

**Project:** TorqWings / The Hangar **Agent:** Raman (agent 16, cross-cutting, named after Sir C. V. Raman) **Services:** Raman Noise Check (RNC) — this spec. Raman Noise Fix (RNF) — later spec. **Phase 1 scope:** Spiral 1 first (phone-based 15-minute estimate), then Phase 1 full engine. Multirotor only, software only, no equipment. **Prepared:** October 2026

## 1. Purpose

RNC answers one question: how loud is this vehicle, and why? It predicts noise levels in hover and cruise at set distances, breaks the noise down by source, and compares it against a target. RNC diagnoses only. It names the causes but gives no design recommendations. Those belong to Raman Noise Fix.

## 0. Spiral roadmap and Spiral 1 (start here)

RNC grows in spirals: build a little, sell it, learn, add more. Spiral 1 is a phone service that delivers a noise estimate report in about 15 minutes, with no equipment.

### Spiral 1 flow

1. **Call (about 5 min):** collect six inputs over the phone.
2. **Run (seconds):** lean engine produces the numbers.
3. **Report (auto PDF):** levels by distance, main noise source, PASS / WARN against the target.
4. **Send:** email the PDF within 15 minutes of the call.

### The six inputs

| # | Input | Unit |
|---|---|---|
| 1 | Take-off weight | kg |
| 2 | Number of rotors | count |
| 3 | Propeller diameter | inch or m |
| 4 | Blade count | count |
| 5 | Motor KV and battery voltage | KV, V (or cells) |
| 6 | Cruise speed | m/s or km/h |

Optional if known: propeller brand and model, noise target, operating environment. Everything else is defaulted from a propeller library and marked assumed.

### Spiral 1 lean engine

- Simplified BEMT (or momentum theory with figure of merit) to get hover RPM from weight
- Tip Mach and blade-passing frequency
- Gutin's formula for tonal hum
- Simplified BPM-style broadband estimate
- Logarithmic energy summing, spherical spreading (about 6 dB per doubling of distance), A-weighting

### Spiral 1 report

One page, top to bottom:

1. **Header:** TorqWings and Raman Noise Check name, customer, vehicle, date, label "Early-Stage Noise Estimate (not a certified measurement)".
2. **Verdict banner:** green PASS, amber WARN or red FAIL, with one headline line, e.g. "78 dBA at 10 m in hover, 10 dB over target".
3. **Noise by distance:** table for hover and cruise at 1.5, 10, 30, 60, 100 m, plus a simple level-versus-distance chart.
4. **Where the noise comes from:** one bar showing the split, e.g. 70% rotor hum, 25% hiss, 5% motor.
5. **What's driving it:** two or three plain sentences naming causes only, e.g. "propeller tips are spinning fast". No fixes.
6. **Assumptions and accuracy:** values assumed or defaulted, and stated accuracy of about ±5 dB.
7. **Next step:** "Book a Raman Noise Fix to find out how to reduce it."

### Later spirals

1. **Spiral 2:** full Phase 1 engine (Farassat F1A, full BPM, interaction, ISO 9613), validated against published data
2. **Spiral 3:** self-serve customer web form and in-app report; pipeline calls from Concept and vehicle design
3. **Spiral 4:** VTOL and fixed-wing support
4. **Spiral 5:** Raman Noise Fix
5. **Spiral 6:** bench and field measurement with hardware

## 0.1 Raman workspace: five tabs, two payments, versioned cycles

Raman is one agent and one service workspace. Noise Check and Noise Fix are stages inside it, not separate products.

### The five tabs

| Tab | Name | Stage | Payment |
|---|---|---|---|
| 1 | Vehicle inputs | Noise Check | Payment 1 |
| 2 | Noise Check report | Noise Check | Payment 1 |
| 3 | Fix options | Noise Fix | Payment 2 |
| 4 | Chosen fix (rerun check on new design) | Noise Fix | Payment 2 |
| 5 | Final before-and-after report | Close | Included |

### Tab rules

- After login and choosing the customer, the workspace opens at the furthest tab reached.
- Completed tabs are frozen: read-only but always viewable.
- Tab 3 unlocks only after Payment 2.
- Tab 5 closes the engagement.
- Changing inputs never edits a frozen tab; it starts a new version.

### Repeat cycles

If the customer returns after building the fix, that is a new engagement (a new cycle), starting again at Tab 1 with the updated vehicle. Each cycle is one row in the customer's history:

| Cycle | Date | Before (dBA) | After (dBA) | Reduction (dB) | Status |
|---|---|---|---|---|---|
| v1 | e.g. Nov 2026 | 78 | 71 | 7 | Closed |
| v2 | e.g. Jan 2027 | 71 | 66 | 5 | In progress |

This history shows the customer's noise reduction across cycles and maps to the versioned three-table persistence pattern.

## 0.2 Staged rollout

Raman launches standalone first and joins The Hangar only after beta.

1. **Standalone beta:** inside the Mission Hub at torqwings.com/mission (admin users only, not a public page). After login, the left tree gets a new node, Upcoming Agents, and Raman sits under it. Upcoming Agents is the test area for all future agents before they are promoted. Tab 1 screen: customer and vehicle bar (name, vehicle type, cycle number), six input boxes with units and hints, folded optional section (propeller brand, noise target, environment), Generate Report button disabled until all six are filled.
2. **Beta testing:** run real customer jobs end to end, including payments, frozen tabs and repeat cycles.
3. **Hangar integration:** add Ask Raman, following the Ask Bernoulli pattern, so pipeline stages (Concept, vehicle design) can call Raman.
4. **New-entry link in The Hangar:** an intake link that the customer fills in, or that TorqWings staff fill in after a phone call.

**Upcoming Agents = the test lab.** Every new agent starts there and is promoted to The Hangar only after passing a gate: validation targets met (for Raman, within ±5 dBA of published data), real beta jobs completed end to end, and no open critical bugs.

### Tab 2 screen (Noise Check report)

Shows the one-page report on screen, plus:

- Download PDF and Email to customer buttons at the top
- Hover / cruise toggle for the chart and table
- Expandable assumptions panel; clicking an assumed value returns to Tab 1 to start a new version with the real number
- Lock badge once the report is issued (frozen)
- Noise Fix button at the bottom: shows Payment 2, then unlocks Tab 3

### Tab 3 screen (Fix options)

Ranked option cards, largest saving first. Each card: the change in plain words, dB saved (e.g. 6 dB at 10 m in hover), trade-offs (weight, flight time, efficiency), effort (easy to hard), and a select box. Spiral 1 options come from a fixed set: larger and slower propeller, more blades, lower tip speed, wider rotor spacing, more rotor-to-arm clearance. A running total of the selected options and a Continue button lead to Tab 4. Savings do not add up simply, so Tab 4 reruns the combination.

### Tab 4 screen (Predicted result)

Tab 4 is a prediction, not a measurement. Raman reruns the full Noise Check on the modified design and shows the predicted level and reduction in dB, e.g. "78 dBA to 71 dBA, 7 dB quieter". Reductions are stated in dB, not percent. A plain-language line explains it, e.g. 10 dB sounds about half as loud. The ±5 dB accuracy note applies. Real measured confirmation is offered later through the hardware spiral.

### Tab 4 simulation screen

- **Sliders:** propeller diameter, blade count, RPM or tip speed, rotor spacing. Each limited to a realistic range for the vehicle.
- **Decibel meter:** semicircular gauge with green, amber and red zones, a marker at the customer's target, a needle that moves live, and a large digital dBA readout in the centre (combines the dial and digital styles).
- **Live trade-offs:** weight, flight time and efficiency are recalculated from the whole combined design on every slider move, never taken from fixed per-option values. Moving one slider can raise or lower each trade-off, and sliders interact.
- **Warnings:** shown if a change breaks something, e.g. not enough thrust to hover.
- **Lock this design:** freezes the chosen combination as the official prediction for the Tab 5 report.

## 0.3 Propeller database and LLM role

All numbers come from the deterministic engine and the propeller database. No LLM computes any value.

- **Propeller DB:** brand, model, diameter, pitch, blade count, chord and twist, performance tables, source link, verified-by, date loaded.
- **Propeller DB admin UI:** list, search and edit entries, with a Load button.
- **Load:** triggers an LLM research call (Claude or Grok via llmGateway.ts) that finds specs online and returns them with source links. Entries stay unverified until a team member approves them.
- **Refresh:** run Load periodically as new propellers reach the market.
- **LLM elsewhere:** only the plain-language report summary and driver explanations, tagged "via Claude".

## 0.4 Agentic design (built in from day one)

Noise Check stays a deterministic tool. Noise Fix is the agentic loop: the agent decides what to try, not a fixed script.

1. **Goal:** reduce noise to the target within constraints (max added weight, min flight time, fit limits).
2. **Plan:** the agent reads the Noise Check source breakdown and picks which design levers to try first, with a stated reason.
3. **Act:** it calls tools: the noise engine, the performance and weight model, the propeller DB.
4. **Evaluate:** it checks each result against the goal and constraints.
5. **Adapt:** it chooses the next move from what it learned (refine, combine, or drop a lever).
6. **Stop:** target met, constraints breached, no further gain, or max iterations reached; if unreachable, it says so and shows the closest option.
7. **Deliver:** three to five ranked options with trade-offs, plus a visible decision trace explaining each step.

To qualify as agentic: the LLM chooses actions and adapts between loops; a brute-force sweep of every combination does not qualify. Every number still comes from deterministic tools. The decision trace is saved in Hangar_Raman_runs. The customer can still explore options with the Tab 4 sliders.

### Live agent run (Tabs 3 and 4)

Once the customer starts Noise Fix, the agent runs with no manual intervention:

- The parameter sliders move on their own as the agent tries each change.
- The decibel meter needle and digital readout move with each iteration.
- Trade-offs (weight, flight time, efficiency) update live.
- A live decision log streams beside the meter, one line per step, e.g. "Iteration 3: increase diameter 13 to 15 in, tonal source dominant. Result 74 dBA, 4 dB saved, +60 g."
- Every frame shows a real iteration from the agent's run; nothing is faked or animated beyond the true results. Steps are paced (about 1 s each) so people can follow them.
- A Stop button is the only control during the run.
- At the end: ranked options and the full trace. The customer can then explore with the sliders and lock a design for the Tab 5 report.

**Reason and act steps:** each iteration shows a Reasoning card (what the agent noticed and why it picked this change), then an Action card (the change made and the result). Playback has two modes: Auto (default; the agent runs straight through, paced) and Step (a Next button advances one reason-and-act step, for demos and reviews). Step mode controls only the viewing pace; the agent's decisions are never altered. The final screen shows the agent's recommendation; the user can then adjust it with the sliders before choosing Lock this fix.

## 0.5 UI design (torqwings.com/mission → Upcoming Agents → Raman)

One workspace with a fixed shell and five tabs. Tab screens 1 to 4 are detailed above; this section adds the shell, login, customer selection, Tab 5 and the visual style.

Pricing and payment flow are specified separately; in this spec, payment points are placeholders (a status flag that unlocks the next tabs).

### Shell

- **Top bar:** TorqWings and Raman logo, customer and vehicle name, cycle badge (v1, v2), user menu.
- **Tab strip:** five numbered tabs (Inputs, Noise Check, Fix Options, Agent Run and Tune, Final Report). Each shows a state: locked (padlock), active, completed and frozen (tick), or awaiting payment (rupee icon).
- **History drawer:** a side panel with the cycle history table (date, before, after, reduction, status).

### Login and customer selection

1. Login uses the Mission Hub's existing admin login; Raman adds no login of its own. Open Upcoming Agents → Raman in the left tree.
2. Customer list with search and a New customer button.
3. Choosing a customer and vehicle opens the latest engagement at the furthest tab reached; a New cycle button starts the next version.

### Tab 5 screen (Final report)

- Before-and-after headline, e.g. "78 to 71 dBA, 7 dB quieter, PASS".
- Two decibel meters side by side, before and after.
- Changes made, with final trade-offs (weight, flight time, efficiency).
- Summary of the agent decision trace, with a link to the full replay.
- Download PDF, Email to customer, and Close engagement buttons. Closing freezes all five tabs.

### Tab 5 certificate (one-page PDF)

Title: TorqWings Raman Acoustic Assessment Certificate (TorqWings logo with Raman sub-brand).

- TorqWings logo at the top; certificate ID and issue date
- Customer, vehicle and cycle (v1, v2)
- Before: assessed noise level (e.g. 78 dBA at 10 m in hover)
- TorqWings assessed the design and recommended a fix: the locked changes listed
- Predicted after: noise level and reduction (e.g. 71 dBA, 7 dB quieter)
- Statement: "Predicted by software analysis, accuracy about ±5 dB. Not a measured or regulatory certification."
- Authorised signature, name and title at the bottom; QR code or certificate ID to verify it against the database

The wording must always say predicted and assessed, never certified compliant, until measured testing (hardware spiral) is in place.

### Visual style

- Dark navy background, white cards, single accent colour, matching The Hangar.
- Verdict colours: green PASS, amber WARN, red FAIL.
- Large readable numbers, plain-language labels, units always shown.
- Desktop first; the tablet layout stacks the meter above the sliders.

## 2. How Raman fits The Hangar

Raman works like Bernoulli: a callable engine with no fixed sequence of steps. There is one engine with two entry points.

- **Pipeline entry (internal):** any bay can call Raman. Goals and noise targets come from Mission (B01), and geometry comes from Concept (B02) and vehicle design. Raman gives a quick estimate after Concept and a detailed check once rotors, motors and RPM are fixed.
- **Service entry (external):** a Raman Noise Check page for outside customers who have not used Mission or Concept. They fill in an intake form, the page calls the same engine, and the report renders.

## 3. Inputs

### 3.1 Vehicle basics

- Vehicle type (Phase 1 accepts multirotor only; VTOL and fixed-wing are rejected with a clear message)
- Take-off mass (kg), payload mass (kg)
- Number of rotors, layout (quad, hexa, octo, coaxial)

### 3.2 Rotor / propeller

- Diameter (m), blade count, pitch (in or deg)
- Chord distribution and twist if known; otherwise a default from a propeller library
- Hover RPM and cruise RPM (if missing, derived from thrust needed)
- Rotor-to-rotor spacing and rotor-to-arm clearance

### 3.3 Powerplant

- Electric: motor model, KV, ESC PWM frequency
- Engine (not modelled in Phase 1; flagged as an excluded source)

### 3.4 Flight profile

- Cruise speed (m/s), operating altitude AGL (m)

### 3.5 Assessment goals

- Operating environment: urban, suburban, rural, near people
- Receiver distances (default 1.5, 10, 30, 60, 100 m)
- Noise target in dBA, with its source (customer, regulation or Mission spec)

Every input carries a provenance tag: **provided**, **derived** or **assumed**. Assumed values are listed in the report.

## 4. Calculation pipeline (deterministic)

All acoustic maths is deterministic Python. No LLM computes any number.

1. **Performance — Blade Element Momentum Theory (BEMT):** thrust, torque, induced velocity and spanwise blade loading at hover and cruise. Solve RPM for thrust = weight if RPM is missing.
2. **Tonal noise — Ffowcs Williams–Hawkings, Farassat Formulation 1A:** thickness and loading noise at the blade-passing frequency (BPF) and harmonics. Gutin's method runs alongside as a fast sanity check.
3. **Broadband noise — Brooks–Pope–Marcolini (BPM):** turbulent boundary layer trailing-edge noise, tip vortex noise, and laminar boundary layer vortex shedding.
4. **Interaction (estimate):** an empirical penalty for rotor-rotor and rotor-arm interaction, based on spacing and clearance. Flagged as low confidence.
5. **Motor noise:** an empirical estimate from motor class and PWM frequency.
6. **Summing:** energetic sum of sources per frequency band (1/3 octave, 50 Hz–10 kHz).
7. **Propagation — ISO 9613:** spherical spreading, air absorption, and a simple ground reflection term.
8. **Weighting — IEC 61672:** A-weighting applied to get dBA.

## 5. Outputs (metrics)

For each flight state (hover, cruise):

- LAmax and LAeq at each receiver distance
- Sound power level LWA
- 1/3-octave spectrum and BPF tone levels
- Tonal prominence (how much the hum stands out)
- Flyover SEL at operating altitude (cruise only)
- Source breakdown: tonal, broadband, interaction, motor, as a percentage of total energy

## 6. Verdict rules

- **PASS:** all levels at or below the target at the assessed distance
- **WARN:** within 3 dB of the target, or tonal prominence high even if level passes
- **FAIL:** above the target by more than the stated uncertainty
- **INFO:** no target provided; levels reported, no verdict

**Confidence score:** based on how many inputs were assumed and which models were used. Stated accuracy for Phase 1 is roughly ±3–5 dB until validation narrows it.

## 7. Report content

1. Verdict banner (PASS / WARN / FAIL / INFO)
2. Headline: level versus target, e.g. "78 dBA at 10 m in hover, 10 dB over target"
3. Levels by distance table, hover and cruise
4. Source breakdown chart
5. Spectrum chart with BPF tones marked
6. Top two or three noise drivers, named only (e.g. high tip speed). No fixes.
7. Assumptions and excluded sources
8. Confidence and stated accuracy
9. Handoff note: "Run Raman Noise Fix for reduction options"

Claude writes only the plain-language summary and driver explanations, from the computed numbers. Each LLM-written block carries a "via Claude" tag, as in Ask Bernoulli.

## 8. Architecture

**Technology stack (fixed):**

- **Front end:** Next.js in **TypeScript** (.tsx/.ts only, no plain JavaScript files), matching every existing TorqWings page.
- **Database: Supabase** (Postgres) for all raman_* tables, auth and stored reports/certificates.
- **Calculation engine: Python on Google Cloud (GCP)**: BEMT, Gutin, Farassat 1A, BPM, Amiet, ISO 9613, A-weighting. It is called through the Vercel→GCP relay and writes results to Supabase.
- **API routes:** TypeScript on Vercel; they validate requests, call the GCP engine and read/write Supabase via supabaseAdmin.

- **Engine:** Python service on Google Cloud, reached through the Vercel-to-Google relay from the POC test harness plan
- **Front end:** Next.js in TypeScript (.tsx), Raman Noise Check page with intake form, spec selector for pipeline users, and report view
- **LLM:** via existing llmGateway.ts, ANTHROPIC_API_KEY
- **API:** POST /api/the-hangar/raman/noise-check

## 8.1 Database tables (Supabase)

These tables replace the three-table outline in section 9 for the standalone beta; section 9's conventions still apply.

| Table | Key contents | Notes |
|---|---|---|
| raman_customers | name, company, contact | One per customer |
| raman_vehicles | customer_id, vehicle type, basic details | Belongs to a customer |
| raman_engagements | vehicle_id, cycle (v1, v2…), furthest tab reached, payment 1 and 2 status, before and after dBA, dates | One row per cycle; drives the history table |
| raman_noise_checks | engagement_id, inputs with provided / derived / assumed tags, results, verdict, confidence | Frozen once issued |
| raman_agent_runs | engagement_id, goal, constraints, stop reason, model version, locked design | One per Noise Fix run |
| raman_agent_steps | run_id, iteration, reasoning, action, parameter values, dBA result, trade-offs | Powers live replay and decision trace |
| raman_propellers | brand, model, geometry, performance tables, source link, verified_by, verified_at | Loaded via LLM research, human-approved |
| raman_reports | engagement_id, type (check or final), PDF link, issued_at | Issued reports |
| raman_payments | engagement_id, stage (1 or 2), amount, status, reference | Optional; can live in engagements |

## 9. Persistence

Versioned three-table pattern, same as other bays:

- Hangar_Raman — one row per request: caller (bay ID or external), source spec ID, created_at
- Hangar_Raman_specs — inputs with provenance tags, results, verdict, confidence
- Hangar_Raman_runs — run metadata: model versions, latency, LLM calls, raw outputs

Use supabaseAdmin, .limit(1) not .single(), RPCs with SET search_path = ''. Apply schema in the Supabase SQL Editor first, then reconcile the migration file.

## 10. Validation before launch

- Known-answer regression: compare predictions against two or three multirotors with published measured noise data (NASA and academic hover tests of DJI-class quads)
- Target: predictions within ±5 dBA of published hover levels before RNC is sold
- Verify with a throwaway script; do not commit it
- Verify on Vercel preview before merging to main

## 11. Scope boundary

Phase 1 excludes:

- VTOL transition and fixed-wing (Phase 4)
- IC engine and exhaust noise
- Noise reduction recommendations (Raman Noise Fix)
- Bench and field measurement (later hardware tiers)
- CFD-grade analysis
- Regulatory certification claims

## 12. Build order

1. BEMT module, verified against a known propeller
2. Tonal module (F1A, Gutin check)
3. BPM broadband module
4. Propagation and A-weighting
5. Verdict and confidence logic
6. API and persistence
7. Intake page and report page
8. Validation against published data
