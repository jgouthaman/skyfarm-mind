import type { Lesson } from "@/lib/academy/lesson-schema";
import { richText } from "@/lib/academy/lesson-schema";

// Module 1, Lesson 3 — hand-authored the same way as Lesson 1
// (low-reynolds-number-aerodynamics.ts) and Lesson 2
// (flow-behaviour-at-low-reynolds-number.ts), for the same reason: keeps it
// off the AI-generated ContentSection/HeroCard path.
//
// Source text supplied for this lesson cut off mid-sentence at "Practical
// Rule: Use symmetric airfoils only on..." — completed conservatively using
// the tail-surfaces/fins/aerobatic-aircraft examples already given earlier
// in the same source text, not new information. A few page-chrome artifacts
// that had been scraped into the paste ("N", "Section 3 of 5 · ...",
// "4 / 4Formula") were dropped as not being actual lesson content.
export const airfoilSelectionAtLowReynoldsNumberLesson: Lesson = {
  id: "airfoil-selection-at-low-reynolds-number",
  title: "Airfoil Selection at Low Reynolds Number",
  sectionIndex: 4,
  totalSections: 11,
  missionBrief: richText("By the end of this lesson you'll be able to explain why airfoil shape matters more at low Re, compare flat-plate, cambered, and symmetric airfoils, and choose the right airfoil family for a given low-Re mission."),
  quickRef: {
    formula: "Re = ρVc / μ",
    facts: [
      { label: "μ", value: "1.81×10⁻⁵ Pa·s" },
      { label: "Low-Re band", value: "20k – 150k" },
      { label: "Best camber ratio", value: "8–12% (Re < 100k)" },
    ],
  },
  slides: [
    // Slide 1 — introduction
    {
      id: "introduction",
      eyebrow: "Foundation · Low-Re Aerodynamics",
      navTitle: "Introduction",
      readTime: "~1 min",
      blocks: [
        { type: "heading", level: 1, text: "Airfoil Selection at Low Reynolds Number" },
        {
          type: "lede",
          text: richText("One of the most counterintuitive challenges in small UAV design is that the aerodynamic rules governing full-scale aircraft do not simply scale down. When your aircraft operates at chord Reynolds numbers below approximately 150,000, the boundary layer behaves in ways that defy conventional high-Re intuition. Laminar separation bubbles form and refuse to reattach. Thin, highly cambered geometries that would be laughed out of a commercial aircraft design review suddenly outperform sophisticated NACA profiles. Understanding why this happens — and choosing the right airfoil as a consequence — is fundamental to designing a fixed-wing UAV that actually flies rather than one that merely descends with style."),
        },
        {
          type: "paragraph",
          text: richText("This section covers the aerodynamic physics, polar curve behavior, candidate airfoil comparisons, and practical selection guidance for the Re 20,000–150,000 regime that governs most small fixed-wing UAVs, micro aerial vehicles (MAVs), and high-altitude platforms."),
        },
      ],
    },

    // Slide 2 — the Reynolds number and why it changes everything
    {
      id: "reynolds-number",
      eyebrow: "Foundation · Low-Re Aerodynamics",
      navTitle: "Why Re Matters",
      readTime: "~2 min",
      blocks: [
        { type: "heading", level: 2, text: "1. The Reynolds Number and Why It Changes Everything" },
        { type: "formula", expression: "Re = ρVc / μ", size: "md" },
        {
          type: "dataTable",
          columns: ["Symbol", "Parameter", "Value / Units"],
          rows: [
            ["ρ", "Air density", "kg/m³"],
            ["V", "Freestream velocity", "m/s"],
            ["c", "Chord length", "m"],
            ["μ", "Dynamic viscosity of air", "≈ 1.81 × 10⁻⁵ Pa·s at sea level"],
          ],
        },
        {
          type: "row",
          blocks: [
            {
              type: "specList",
              variant: "blue",
              heading: "High Re (> 500,000)",
              items: [
                "Boundary layer transitions naturally from laminar to turbulent relatively early along the chord",
                "Turbulent boundary layers are energetic and resist separation",
                "Flow \"sticks\" to the airfoil surface, staying attached over a wide range of angles of attack",
              ],
            },
            {
              type: "specList",
              variant: "red",
              heading: "Low Re (< 150,000)",
              items: [
                "The boundary layer remains stubbornly laminar",
                "Laminar flow has far less momentum and is highly susceptible to adverse pressure gradients",
                "Flow separates from the surface far earlier than it would at high Re",
              ],
            },
          ],
        },
        {
          type: "markList",
          items: [
            { icon: "⚠️", tone: "warn", text: richText("A Laminar Separation Bubble (LSB) may form, where separated flow eventually transitions to turbulent and reattaches — but this bubble grows, moves, and can catastrophically burst with increasing angle of attack") },
            { icon: "⚠️", tone: "warn", text: richText("Drag increases dramatically due to pressure drag from separated regions") },
            { icon: "⚠️", tone: "warn", text: richText("Lift generation becomes geometry-sensitive in ways that don't appear at higher Re") },
          ],
        },
        {
          type: "callout",
          variant: "key",
          icon: "⚡",
          heading: "Key Insight",
          text: richText("At low Re, the shape of the airfoil — particularly its camber and thickness distribution — matters far more than at high Re, because the boundary layer cannot be relied upon to behave itself."),
        },
      ],
    },

    // Slide 3 — flat plate airfoils
    {
      id: "flat-plate",
      eyebrow: "Foundation · Low-Re Aerodynamics",
      navTitle: "Flat Plate Airfoils",
      readTime: "~1 min",
      blocks: [
        { type: "heading", level: 2, text: "2.1 Flat Plate Airfoils" },
        {
          type: "paragraph",
          text: richText("A flat plate airfoil seems primitive — and at high Reynolds numbers, it is. But in the Re 20,000–80,000 range, it becomes a serious competitor."),
        },
        {
          type: "row",
          blocks: [
            {
              type: "specList",
              variant: "blue",
              heading: "Why flat plates work at low Re",
              items: [
                "There is no adverse pressure gradient on the upper surface caused by thickness-induced flow acceleration and deceleration",
                "The boundary layer does not need to \"recover\" pressure over a thick body",
                "Separation occurs at the leading edge, but the separated shear layer rolls up into vortical structures that generate lift through low-pressure regions",
                "The flow mechanism is fundamentally different from attached-flow aerodynamics",
              ],
            },
            {
              type: "specList",
              variant: "red",
              heading: "Limitations of flat plates",
              items: [
                "Very poor L/D compared to well-designed cambered airfoils in the upper portion of this Re range (Re > 60,000)",
                "Structurally impractical — real flat plate wings require some thickness or structural element",
                "High sensitivity to angle of attack; abrupt stall behavior",
                "No camber means the zero-lift angle of attack is 0° (or very close), limiting passive lift generation",
              ],
            },
          ],
        },
        {
          type: "callout",
          variant: "note",
          icon: "📝",
          heading: "In practice",
          text: richText("\"Flat plate\" behavior is approximated by thin, under-cambered membrane wings or simple balsa sheet constructions used in early MAV research."),
        },
      ],
    },

    // Slide 4 — cambered airfoils
    {
      id: "cambered",
      eyebrow: "Foundation · Low-Re Aerodynamics",
      navTitle: "Cambered Airfoils",
      readTime: "~2 min",
      blocks: [
        { type: "heading", level: 2, text: "2.2 Cambered Airfoils" },
        {
          type: "paragraph",
          text: richText("Cambered airfoils — particularly thin, highly cambered profiles — are the dominant performers in the low-Re regime. The physics are elegant:"),
        },
        {
          type: "callout",
          variant: "key",
          icon: "⚡",
          heading: "Why Camber Lifts",
          text: richText("Camber shifts the zero-lift angle of attack to a negative value, generating lift even at α = 0°."),
        },
        {
          type: "specList",
          variant: "blue",
          heading: "Why camber helps at low Re",
          items: [
            "The pressure distribution over a cambered airfoil produces a more gradual adverse pressure gradient on the upper surface compared to a thick symmetric airfoil",
            "Thin cambered airfoils reduce the \"bubble penalty\" because there is less thickness-induced flow acceleration to recover from",
            "At Re < 100,000, camber ratios of 8–12% (camber/chord) significantly outperform thicker profiles",
          ],
        },
        {
          type: "paragraph",
          text: [
            { kind: "strong", text: "The under-cambered (concave lower surface) variant: " },
            { kind: "text", text: "Many classic low-Re airfoils feature an under-cambered shape — the lower surface curves upward toward the trailing edge. This geometry was discovered empirically in early model aviation and later validated computationally. The concave lower surface acts somewhat like a scoop, increasing pressure below the wing and contributing to lift without requiring high angle of attack. Examples include the " },
            { kind: "strong", text: "Eppler 61" },
            { kind: "text", text: " and " },
            { kind: "strong", text: "Zimmermann" },
            { kind: "text", text: " profiles." },
          ],
        },
        {
          type: "specList",
          variant: "red",
          heading: "Limitations of cambered airfoils",
          items: [
            "Strong pitch moment (nose-down) due to aft loading — requires tail download or reflexed trailing edge",
            "Optimized for a narrow angle-of-attack range",
            "Sensitive to surface roughness at their design point",
          ],
        },
      ],
    },

    // Slide 5 — symmetric airfoils
    {
      id: "symmetric",
      eyebrow: "Foundation · Low-Re Aerodynamics",
      navTitle: "Symmetric Airfoils",
      readTime: "~1 min",
      blocks: [
        { type: "heading", level: 2, text: "2.3 Symmetric Airfoils" },
        {
          type: "paragraph",
          text: richText("Symmetric airfoils (zero camber) are the worst performers at low Re and should generally be avoided for lifting surfaces. They generate zero lift at α = 0°, so they must operate at higher angles of attack to produce useful lift."),
        },
        {
          type: "specList",
          variant: "red",
          heading: "Why symmetric airfoils struggle at low Re",
          items: [
            "At higher α, the adverse pressure gradient on the upper surface is more severe",
            "Laminar separation occurs earlier and more aggressively",
            "The L/D ratio at typical cruise lift coefficients is dramatically lower than equivalent cambered profiles",
          ],
        },
        {
          type: "callout",
          variant: "note",
          icon: "📝",
          heading: "Practical Rule",
          text: richText("Use symmetric airfoils only on tail surfaces, fins, or aerobatic aircraft — applications where zero-net-lift at zero angle of attack is actually the goal, not a liability."),
        },
      ],
    },
  ],
};
