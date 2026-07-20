import type { Lesson } from "@/lib/academy/lesson-schema";
import { richText } from "@/lib/academy/lesson-schema";

// Same treatment as Lessons 1-4: hand-authored instead of left on the
// AI-generated ContentSection/HeroCard path.
//
// Source content cut off mid-sentence in section 2.1 ("However, pushing too
// hard in this...") — completed using standard wing-loading/Re trade-off
// reasoning consistent with everything already stated earlier in the same
// source text, not new unrelated claims. No table of contents was supplied
// for this lesson (unlike Lesson 4's), so there was no explicit list of
// missing sections to flag — a closing "Design Checklist" chapter was
// added as a synthesis of the content actually given, at the user's
// request to enrich rather than leave the lesson trailing off after the
// wing-loading section.
export const designImplicationsForAutonomousPlatformsLesson: Lesson = {
  id: "design-implications-for-autonomous-platforms",
  title: "Design Implications for Autonomous Platforms",
  sectionIndex: 6,
  totalSections: 11,
  missionBrief: richText("By the end of this lesson you'll be able to use Reynolds number as a frame-selection filter — multirotor vs. fixed-wing vs. VTOL — and connect wing loading and cruise speed decisions back to the Re they actually produce."),
  quickRef: {
    formula: "Re = ρVc / μ",
    facts: [
      { label: "Multirotor Re", value: "10k – 120k" },
      { label: "Fixed-wing cruise Re", value: "100k – 350k" },
      { label: "VTOL transition Re", value: "30k – 80k" },
    ],
  },
  slides: [
    // Chapter 1 — framing: Re as a frame-selection filter
    {
      id: "frame-selection",
      eyebrow: "Advanced Aerodynamics Module",
      navTitle: "Frame Selection",
      readTime: "~1 min",
      blocks: [
        { type: "heading", level: 1, text: "Design Implications for Autonomous Platforms" },
        { type: "heading", level: 2, text: "How Low Reynolds Number Aerodynamics Shapes Every Design Decision" },
        { type: "heading", level: 2, text: "1. Translating Reynolds Number Knowledge into Frame Type Selection" },
        {
          type: "paragraph",
          text: richText("The Reynolds number (Re) is not merely an academic parameter — it is a primary sorting criterion that determines which platform architecture is physically viable for a given mission envelope. Before any structural or propulsion calculation begins, the operating Re range effectively narrows your design space to a defensible shortlist of frame types."),
        },
        {
          type: "paragraph",
          text: richText("Recall the fundamental relationship:"),
        },
        { type: "formula", expression: "Re = ρVc / μ", size: "md" },
        {
          type: "paragraph",
          text: richText("where ρ is air density, V is airspeed, c is the mean aerodynamic chord, and μ is dynamic viscosity. For small autonomous platforms, this number typically falls between 10,000 and 500,000 — a regime dominated by laminar boundary layer instability, laminar separation bubbles (LSBs), and dramatically nonlinear lift-to-drag behavior."),
        },
      ],
    },

    // Chapter 2 — 1.1 Multirotor platforms
    {
      id: "multirotor",
      eyebrow: "Advanced Aerodynamics Module",
      navTitle: "Multirotor Platforms",
      readTime: "~2 min",
      blocks: [
        { type: "heading", level: 2, text: "1.1 Multirotor Platforms (Re ≈ 10,000 – 120,000)" },
        {
          type: "paragraph",
          text: richText("Multirotor blades and small-format rotors operate deep in the low-Re regime. The aerodynamic consequences are severe and non-negotiable:"),
        },
        {
          type: "dataTable",
          columns: ["Re Range", "Blade Behavior", "Design Response"],
          rows: [
            ["< 30,000", "Fully laminar, separation-dominated", "Thick, cambered profiles (e.g., E387 variants)"],
            ["30,000 – 70,000", "LSB formation and shedding", "Smooth leading edges, controlled camber distribution"],
            ["70,000 – 120,000", "Transitional, improving L/D", "Conventional thin aerofoils become viable"],
          ],
        },
        {
          type: "paragraph",
          text: richText("Key implication: Multirotors sacrifice aerodynamic efficiency in exchange for hover capability and geometric simplicity. This trade-off is acceptable when:"),
        },
        {
          type: "markList",
          items: [
            { icon: "▸", text: richText("The mission requires stationary observation or precision station-keeping") },
            { icon: "▸", text: richText("The operating radius is short (< 5 km in most small-UAS applications)") },
            { icon: "▸", text: richText("Payload mass fractions are high relative to total mass") },
            { icon: "▸", text: richText("Deployment environments preclude runway infrastructure") },
          ],
        },
        {
          type: "callout",
          variant: "key",
          icon: "⚡",
          heading: "Watch the Figure of Merit",
          text: richText("Multirotor hover consumes power at a rate governed by disk actuator theory — and at low Re, rotor figure of merit (FM) degrades significantly, often falling below FM = 0.55 for rotors under 15 cm diameter. Ignoring this Re-driven FM degradation leads directly to underestimated power budgets and battery sizing errors."),
        },
      ],
    },

    // Chapter 3 — 1.2 Fixed-wing platforms
    {
      id: "fixed-wing",
      eyebrow: "Advanced Aerodynamics Module",
      navTitle: "Fixed-Wing Platforms",
      readTime: "~2 min",
      blocks: [
        { type: "heading", level: 2, text: "1.2 Fixed-Wing Platforms (Re ≈ 80,000 – 500,000+)" },
        {
          type: "paragraph",
          text: richText("Fixed-wing designs enter a more favorable aerodynamic regime when chord lengths and cruise speeds are selected to push Re above the critical LSB-dominated zone. Here, the designer has genuine freedom to optimize for efficiency."),
        },
        { type: "heading", level: 3, text: "Critical Threshold Awareness" },
        {
          type: "markList",
          items: [
            { icon: "▸", text: richText("Re < 100,000: Most conventional aerofoils perform poorly. The pressure recovery zone aft of an LSB causes premature separation, collapsing the polar. Purpose-designed low-Re profiles (Selig S1223, Eppler E387, Wortmann FX 63-137) are required.") },
            { icon: "▸", text: richText("Re 100,000 – 300,000: Transitional regime. Profile selection matters enormously. Laminar flow design pays dividends. This is where many small fixed-wing UAS cruise.") },
            { icon: "▸", text: richText("Re > 300,000: Conventional design tools become increasingly reliable. Thin, moderate-camber profiles begin to match or exceed specialized low-Re designs.") },
          ],
        },
        { type: "heading", level: 3, text: "Frame Selection Logic from Re" },
        {
          type: "markList",
          items: [
            { icon: "→", text: richText("Mission range > 20 km and hover not required: fixed-wing is aerodynamically justified — target cruise Re > 150,000 through chord/speed selection, and airfoil selection becomes a critical design input") },
            { icon: "→", text: richText("Mission range < 5 km, or precision station-keeping is required: multirotor is acceptable despite the Re penalty — optimize blade geometry for the actual operating Re, not a theoretical peak") },
            { icon: "→", text: richText("Mission requires both: VTOL hybrid — accept Re penalties during the transition phase") },
          ],
        },
      ],
    },

    // Chapter 4 — 1.3 VTOL hybrid platforms
    {
      id: "vtol-hybrid",
      eyebrow: "Advanced Aerodynamics Module",
      navTitle: "VTOL Hybrid Platforms",
      readTime: "~2 min",
      blocks: [
        { type: "heading", level: 2, text: "1.3 VTOL Hybrid Platforms (Re ≈ 50,000 – 350,000 across phases)" },
        {
          type: "paragraph",
          text: richText("VTOL configurations — tilt-rotor, tailsitter, or lift+cruise — face a uniquely challenging Re landscape because they operate across multiple distinct Re regimes within a single flight:"),
        },
        {
          type: "markList",
          items: [
            { icon: "▸", text: richText("Hover phase: low-Re rotor aerodynamics dominate (Re 20,000–80,000 on blade sections)") },
            { icon: "▸", text: richText("Transition phase: the wing begins generating lift at low airspeed → very low wing Re (often 30,000–80,000) with severe LSB risk") },
            { icon: "▸", text: richText("Cruise phase: the wing operates at design Re (100,000–350,000), rotors either stopped or operating at reduced speed") },
          ],
        },
        {
          type: "paragraph",
          text: richText("The transition phase is the most aerodynamically dangerous from a low-Re perspective. As the wing accelerates from near-zero airspeed, it passes through Re ranges where:"),
        },
        {
          type: "markList",
          items: [
            { icon: "⚠️", tone: "warn", text: richText("Lift curve slope is depressed relative to high-Re predictions") },
            { icon: "⚠️", tone: "warn", text: richText("Stall characteristics are abrupt and nonlinear") },
            { icon: "⚠️", tone: "warn", text: richText("The vehicle may simultaneously experience rotor downwash interacting with a wing operating in a fully separated flow state") },
          ],
        },
        {
          type: "callout",
          variant: "key",
          icon: "⚡",
          heading: "TorqWings Academy Key Principle",
          text: richText("In VTOL design, the transition corridor is not a brief inconvenience — it is a distinct aerodynamic design point that must be analyzed at the correct Re, not extrapolated from cruise-condition data."),
        },
      ],
    },

    // Chapter 5 — section 2, wing loading and cruise speed
    {
      id: "wing-loading",
      eyebrow: "Advanced Aerodynamics Module",
      navTitle: "Wing Loading & Speed",
      readTime: "~2 min",
      blocks: [
        { type: "heading", level: 2, text: "2. Wing Loading and Cruise Speed Envelope Decisions" },
        {
          type: "paragraph",
          text: richText("Wing loading (W/S, expressed in N/m² or g/cm²) and cruise speed are interdependent decisions that must be made with explicit Re awareness. This is one of the areas most frequently mishandled in amateur and early-professional autonomous platform design."),
        },
        { type: "heading", level: 3, text: "2.1 The Wing Loading–Re–Speed Triangle" },
        {
          type: "paragraph",
          text: richText("The three variables form a constrained triangle:"),
        },
        { type: "formula", expression: "Vcruise = √(2(W/S) / (ρ·CL))", size: "sm" },
        { type: "formula", expression: "Re_cruise = ρ · Vcruise · c / μ", size: "sm" },
        {
          type: "paragraph",
          text: richText("These equations reveal a critical coupling: increasing wing loading to reduce structural weight raises stall speed, which raises Re — which can actually improve aerodynamic efficiency up to a point. However, pushing too hard in this direction has real costs: stall speed and structural loads climb faster than the Re-driven efficiency gains can offset. Past a certain wing loading, the aircraft becomes harder to hand-launch and recover, control margins shrink at low speed, and a smaller, more heavily loaded wing can end up with more drag at its operating CL than a larger wing would have had at a lower, more favorable Re."),
        },
        {
          type: "callout",
          variant: "tip",
          icon: "💡",
          heading: "Practical Balance",
          text: richText("Treat wing loading as a Re decision, not just a weight decision. Pick a target cruise Re from the platform's mission profile first, then work backward to the wing area and loading that gets you there — rather than sizing the wing purely for minimum structural weight and accepting whatever Re results."),
        },
      ],
    },

    // Chapter 6 — synthesis checklist
    {
      id: "design-checklist",
      eyebrow: "Advanced Aerodynamics Module",
      navTitle: "Design Checklist",
      readTime: "~1 min",
      blocks: [
        { type: "heading", level: 2, text: "Putting It Together: A Design Checklist" },
        {
          type: "paragraph",
          text: richText("Every decision in this lesson traces back to the same question: what Reynolds number will this platform actually fly at, and does the design account for it?"),
        },
        {
          type: "markList",
          items: [
            { icon: "☐", text: richText("Estimate the operating Re range for every lifting or rotating surface before committing to a frame type — not after") },
            { icon: "☐", text: richText("Match frame type to mission profile: short-range/hover-critical → multirotor; long-range/no-hover → fixed-wing; both → VTOL hybrid with an explicitly analyzed transition phase") },
            { icon: "☐", text: richText("Select airfoils for the Re band you'll actually operate in, not a generic \"efficient\" profile chosen from high-Re intuition") },
            { icon: "☐", text: richText("Size wing loading around a target cruise Re, then check that the resulting stall speed and structural loads are acceptable — not the other way around") },
            { icon: "☐", text: richText("For VTOL platforms, treat the transition phase as its own design point, with its own Re and its own risk of LSB-driven stall") },
          ],
        },
        {
          type: "callout",
          variant: "key",
          icon: "⚡",
          heading: "Bottom Line",
          text: richText("At small scale, Reynolds number isn't a footnote to the design process — it's the filter every other decision has to pass through first."),
        },
      ],
    },
  ],
};
