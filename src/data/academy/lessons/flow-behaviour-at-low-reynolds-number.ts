import type { Lesson } from "@/lib/academy/lesson-schema";
import { richText } from "@/lib/academy/lesson-schema";

// Module 1, Lesson 2 — hand-authored the same way as
// low-reynolds-number-aerodynamics.ts (Lesson 1) rather than left on the
// AI-generated ContentSection/HeroCard path, which was producing raw
// pipe-text tables and a duplicated hero title for this content.
export const flowBehaviourAtLowReynoldsNumberLesson: Lesson = {
  id: "flow-behaviour-at-low-reynolds-number",
  title: "Flow Behaviour at Low Reynolds Number",
  sectionIndex: 3,
  totalSections: 11,
  missionBrief: richText("By the end of this lesson you'll be able to tell laminar from turbulent boundary layers apart, explain why low-Re flow struggles to stay attached, and recognize when a Laminar Separation Bubble is likely to hurt your wing's performance."),
  quickRef: {
    formula: "Re = ρVL / μ",
    facts: [
      { label: "ρ", value: "1.225 kg/m³" },
      { label: "μ", value: "1.789×10⁻⁵ Pa·s" },
      { label: "Low-Re band", value: "20k – 500k" },
    ],
    highlightValue: "Re ≈ 65,000",
    highlightLabel: "this lesson's worked example",
  },
  slides: [
    // Slide 1 — welcome / framing
    {
      id: "welcome",
      eyebrow: "Foundation · Low-Re Aerodynamics",
      navTitle: "Welcome",
      readTime: "~1 min",
      blocks: [
        { type: "heading", level: 1, text: "Flow Behaviour at Low Reynolds Number" },
        { type: "heading", level: 2, text: "Welcome to the Awkward Middle Ground" },
        {
          type: "lede",
          text: richText("You now know what Reynolds Number is. This lesson answers the harder question: what does the air actually do when Re drops into the 20,000–500,000 range where most small UAVs live? The answer determines whether your wing generates clean lift or stalls unpredictably at the worst possible moment."),
        },
      ],
    },

    // Slide 2 — laminar vs turbulent boundary layer
    {
      id: "laminar-turbulent",
      eyebrow: "Foundation · Low-Re Aerodynamics",
      navTitle: "Laminar vs Turbulent",
      readTime: "~2 min",
      blocks: [
        { type: "heading", level: 2, text: "Laminar and Turbulent Flow — The Two States of the Boundary Layer" },
        {
          type: "paragraph",
          text: [
            { kind: "text", text: "Every wing carries a thin layer of air dragged along by friction — the " },
            { kind: "term", text: "boundary layer", glossary: { term: "Boundary layer", definition: "The thin region of air next to the wing surface where friction slows the flow relative to the freestream." } },
            { kind: "text", text: ". That layer exists in one of two states, and which state it's in changes everything about drag and stall behaviour." },
          ],
        },
        {
          type: "dataTable",
          columns: ["State", "Structure", "Skin Friction", "Ability to Resist Separation"],
          rows: [
            ["Laminar", "Smooth, ordered layers sliding past each other", "Low", "Poor — separates easily under adverse pressure"],
            ["Turbulent", "Chaotic mixing, eddies, vortices", "High", "Strong — clings to the surface much longer"],
          ],
        },
        {
          type: "callout",
          variant: "tip",
          icon: "💡",
          heading: "Quick Tip",
          text: richText("Neither state is \"better\" in isolation. Laminar flow is efficient but fragile; turbulent flow is draggy but robust. Good low-Re airfoil design is about managing where the transition between the two happens — not eliminating one in favour of the other."),
        },
        {
          type: "quickCheck",
          question: "Which boundary layer state produces lower skin-friction drag?",
          options: ["Laminar", "Turbulent", "Both are equal"],
          correctIndex: 0,
        },
      ],
    },

    // Slide 3 — the physics of why low-Re flow struggles to stay attached
    {
      id: "physics",
      eyebrow: "Foundation · Low-Re Aerodynamics",
      navTitle: "The Physics",
      readTime: "~2 min",
      blocks: [
        { type: "heading", level: 2, text: "The Physics — Why Low-Re Flow Struggles to Stay Attached" },
        {
          type: "row",
          blocks: [
            {
              type: "specList",
              variant: "blue",
              heading: "Laminar Boundary Layer (Low Momentum Near the Surface)",
              items: [
                "Velocity profile near the wall is thin and low-energy",
                "Very little momentum to fight against rising pressure downstream",
                "Highly prone to separating the moment the flow decelerates",
                "Produces low skin-friction drag while it stays attached",
              ],
            },
            {
              type: "specList",
              variant: "red",
              heading: "Turbulent Boundary Layer (Momentum Mixed Down from the Freestream)",
              items: [
                "Chaotic mixing constantly re-energises the air near the surface",
                "That extra momentum lets it resist adverse pressure gradients far longer",
                "Produces higher skin-friction drag, but rarely separates outright",
                "Standard on full-scale aircraft, where Re is high enough to trigger it naturally",
              ],
            },
          ],
        },
        { type: "heading", level: 3, text: "Why This Matters More at Low Re" },
        {
          type: "dataTable",
          columns: ["Re Regime", "Natural Transition Behaviour", "Practical Consequence"],
          rows: [
            ["High Re (> 1,000,000)", "Transitions to turbulent early, on its own", "Attached flow, predictable stall"],
            ["Low Re (20,000–500,000)", "Often stays laminar too long, or never transitions cleanly", "Separation, bubbles, unpredictable stall"],
          ],
        },
        {
          type: "callout",
          variant: "analogy",
          icon: "🎯",
          heading: "Engineering Analogy",
          text: [
            { kind: "text", text: "Picture two runners crossing rough ground. The laminar runner sprints in a straight line with no wasted effort — efficient, but trips the instant the ground gets uneven. The turbulent runner jogs with constant small side-steps, burning more energy, but almost never falls. At low Re, your wing's boundary layer is that fragile sprinter, and it needs help to become the sturdier jogger before it reaches rough terrain (an " },
            { kind: "term", text: "adverse pressure gradient", glossary: { term: "Adverse pressure gradient", definition: "A region where pressure rises in the direction of flow, decelerating the boundary layer and pushing it toward separation." } },
            { kind: "text", text: ")." },
          ],
        },
      ],
    },

    // Slide 4 — transition point and laminar separation bubbles
    {
      id: "separation-bubbles",
      eyebrow: "Foundation · Low-Re Aerodynamics",
      navTitle: "Separation Bubbles",
      readTime: "~2 min",
      blocks: [
        { type: "heading", level: 2, text: "The Transition Point and Laminar Separation Bubbles (LSBs)" },
        {
          type: "paragraph",
          text: [
            { kind: "text", text: "At low Re, the laminar boundary layer frequently separates before it can naturally transition to turbulent — then, if conditions allow, the separated shear layer transitions while detached, and reattaches downstream as a turbulent layer. The pocket of recirculating air trapped between separation and reattachment is a " },
            { kind: "term", text: "Laminar Separation Bubble", glossary: { term: "LSB", definition: "A region where laminar flow detaches then reattaches turbulently, common at low Re." } },
            { kind: "text", text: " (LSB)." },
          ],
        },
        {
          type: "illustration",
          caption: "Laminar separation bubble (LSB) structure",
          svg: `<svg viewBox="0 0 640 140" xmlns="http://www.w3.org/2000/svg">
            <line x1="30" y1="112" x2="610" y2="112" stroke="var(--lv-hairline)" stroke-width="1.5"/>
            <path d="M30 108 Q 160 96 232 100" fill="none" stroke="var(--lv-force-blue)" stroke-width="2.5"/>
            <path d="M232 100 Q 300 80 378 100" fill="none" stroke="var(--lv-amber-bright)" stroke-width="2.5" stroke-dasharray="2 3"/>
            <ellipse cx="305" cy="98" rx="76" ry="15" fill="color-mix(in srgb, var(--lv-amber) 16%, transparent)" stroke="var(--lv-amber)" stroke-width="1.5" stroke-dasharray="3 2"/>
            <path d="M378 100 Q 470 120 610 108" fill="none" stroke="var(--lv-force-red)" stroke-width="2.5"/>
            <text x="30" y="52" fill="var(--lv-force-blue)" font-family="JetBrains Mono" font-size="10">Laminar BL</text>
            <text x="478" y="52" fill="var(--lv-force-red)" font-family="JetBrains Mono" font-size="10">Turbulent BL</text>
            <text x="255" y="72" fill="var(--lv-amber-bright)" font-family="JetBrains Mono" font-size="10">Recirculating bubble</text>
            <text x="30" y="130" fill="var(--lv-dim)" font-family="JetBrains Mono" font-size="10">Leading edge</text>
            <text x="196" y="130" fill="var(--lv-amber-bright)" font-family="JetBrains Mono" font-size="10">Separation</text>
            <text x="352" y="130" fill="var(--lv-amber-bright)" font-family="JetBrains Mono" font-size="10">Reattachment</text>
            <text x="548" y="130" fill="var(--lv-dim)" font-family="JetBrains Mono" font-size="10">Trailing edge</text>
          </svg>`,
        },
        {
          type: "markList",
          items: [
            { icon: "⚠️", tone: "warn", text: richText("Small (short) bubbles reattach quickly and cost only a modest drag penalty") },
            { icon: "⚠️", tone: "warn", text: richText("Large (long) bubbles can extend a significant fraction of the chord, spike drag, and trigger early stall") },
            { icon: "⚠️", tone: "warn", text: richText("Bubble size is highly sensitive to Re, angle of attack, and even surface roughness — a small manufacturing imperfection can shift bubble behaviour dramatically") },
          ],
        },
        {
          type: "callout",
          variant: "key",
          icon: "⚡",
          heading: "Key Takeaway for Designers",
          text: [
            { kind: "text", text: "An airfoil that works well at Re = 500,000 may develop a long, drag-heavy LSB at Re = 50,000, even though it's geometrically identical. This is exactly why dedicated low-Re airfoils (" },
            { kind: "strong", text: "Eppler, Selig, Drela" },
            { kind: "text", text: " series) use specific camber and thickness distributions to control where and how the bubble forms, rather than hoping it doesn't." },
          ],
        },
        {
          type: "quickCheck",
          question: "A long, drag-heavy LSB is most likely to develop when:",
          options: [
            "Re is high and the airfoil is a standard full-scale design",
            "Re is low and the airfoil wasn't designed for low-Re flow",
            "The wing is flying at zero angle of attack",
          ],
          correctIndex: 1,
        },
      ],
    },

    // Slide 5 — worked example
    {
      id: "worked-example",
      eyebrow: "Foundation · Low-Re Aerodynamics",
      navTitle: "Worked Example",
      readTime: "~1 min",
      blocks: [
        { type: "heading", level: 2, text: "Worked Example: Estimating Transition Risk for a Small Wing" },
        {
          type: "callout",
          variant: "problem",
          icon: "📋",
          heading: "Problem Statement",
          text: [
            { kind: "text", text: "A micro air vehicle wing has a chord of " },
            { kind: "strong", text: "120 mm" },
            { kind: "text", text: " and cruises at " },
            { kind: "strong", text: "8 m/s" },
            { kind: "text", text: " at sea level. Estimate its Reynolds Number and identify which flow regime it falls into." },
          ],
        },
        { type: "heading", level: 3, text: "Step 1: Identify and Convert Known Values" },
        {
          type: "dataTable",
          columns: ["Parameter", "Symbol", "Value", "Units"],
          rows: [
            ["Air density (sea level, standard day)", "ρ", "1.225", "kg/m³"],
            ["Cruise velocity", "V", "8", "m/s"],
            ["Wing chord length", "L", "120 mm = 0.12", "m"],
            ["Dynamic viscosity of air (15°C)", "μ", "1.789 × 10⁻⁵", "Pa·s"],
          ],
        },
        { type: "formula", expression: "Re = (1.225 × 8 × 0.12) / 1.789×10⁻⁵ ≈ 65,000", size: "sm" },
        {
          type: "illustration",
          caption: "Lands in the micro-UAV band, where LSBs are common",
          chart: { kind: "regimeBar", markerLog10: Math.log10(65000), minLabel: "10⁴", maxLabel: "10⁸" },
        },
        {
          type: "paragraph",
          text: richText("Working through Re = ρVL/μ gives a result around 65,000 — squarely in the micro-UAV band from the regime table earlier, where LSBs are common and airfoil selection matters enormously. We'll build on this exact calculation in the next lesson when we select an airfoil for this wing."),
        },
        {
          type: "callout",
          variant: "note",
          icon: "📝",
          heading: "Up next",
          text: richText("Airfoil selection for micro air vehicles — choosing (or shaping) a section that manages the LSB we just calculated the risk for."),
        },
      ],
    },
  ],
};
