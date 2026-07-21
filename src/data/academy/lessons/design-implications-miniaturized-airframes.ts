import type { Lesson } from "@/lib/academy/lesson-schema";
import { richText } from "@/lib/academy/lesson-schema";

// Module 2, Lesson 5 — same treatment as Lessons 1-4: fully authored
// synthesis lesson, no source text supplied. Mirrors Module 1's closing
// "Design Implications" lesson in role (ties the module's earlier lessons
// back into frame-level design decisions) and ends with a checklist, same
// pattern used at the end of Module 1's propeller lesson.
export const designImplicationsMiniaturizedAirframesLesson: Lesson = {
  id: "design-implications-miniaturized-airframes",
  title: "Design Implications for Miniaturized Airframes",
  sectionIndex: 5,
  totalSections: 11,
  missionBrief: richText("By the end of this lesson you'll be able to reason about structural mass fraction across frame types, balance structural margin against payload capacity, and connect structural decisions back to the aerodynamic and propulsion trade-offs from earlier in this course."),
  quickRef: {
    formula: "Mass budget = structure + propulsion + payload + battery",
    facts: [
      { label: "Multirotor structure fraction", value: "≈ 15–25%" },
      { label: "Fixed-wing structure fraction", value: "≈ 20–35%" },
      { label: "Typical safety factor (small UAV)", value: "1.5–2.0" },
    ],
  },
  slides: [
    // Chapter 1 — structural mass fraction and frame type
    {
      id: "mass-fraction",
      eyebrow: "Miniaturized Structural Design",
      navTitle: "Mass Fraction",
      readTime: "~2 min",
      blocks: [
        { type: "heading", level: 1, text: "Design Implications for Miniaturized Airframes" },
        { type: "heading", level: 2, text: "Structural Mass Fraction and Frame Type" },
        {
          type: "paragraph",
          text: richText("Every gram spent on structure is a gram not available for payload, battery, or propulsion — and how much structure a design actually needs depends heavily on frame type."),
        },
        {
          type: "dataTable",
          columns: ["Frame Type", "Typical Structural Mass Fraction", "Why"],
          rows: [
            ["Multirotor", "≈ 15–25%", "Loads are concentrated at arm/motor mounts; simpler load paths than a wing"],
            ["Fixed-wing", "≈ 20–35%", "Wing bending/torsion loads demand a continuous spar and skin along the span"],
            ["VTOL hybrid", "≈ 25–40%", "Carries both rotor-mount loads and wing loads, plus transition-phase dynamic loads"],
          ],
        },
        {
          type: "callout",
          variant: "tip",
          icon: "💡",
          heading: "Quick Tip",
          text: richText("A structural mass fraction noticeably above these ranges usually means either an overly conservative safety factor or a load path that hasn't been optimized — both are worth re-examining before accepting the mass penalty."),
        },
      ],
    },

    // Chapter 2 — structural margin vs payload capacity
    {
      id: "margin-vs-payload",
      eyebrow: "Miniaturized Structural Design",
      navTitle: "Margin vs. Payload",
      readTime: "~2 min",
      blocks: [
        { type: "heading", level: 2, text: "Structural Margin vs. Payload Capacity" },
        {
          type: "paragraph",
          text: [
            { kind: "text", text: "Every structural member is designed against an expected maximum load multiplied by a " },
            { kind: "term", text: "safety factor", glossary: { term: "Safety factor", definition: "A multiplier applied to expected loads before sizing a structure, to cover uncertainty in loads, materials, and manufacturing." } },
            { kind: "text", text: " — typically 1.5–2.0 for small UAVs, lower than full-scale aviation's 1.5 minimum because failure consequences are usually far less severe." },
          ],
        },
        {
          type: "markList",
          items: [
            { icon: "▸", text: richText("A higher safety factor buys confidence against load uncertainty and manufacturing variability, at a direct mass cost") },
            { icon: "▸", text: richText("Every gram of margin above what the mission genuinely requires is a gram of payload, battery, or endurance given up") },
            { icon: "▸", text: richText("The right safety factor depends on how well the loads are actually known — a well-tested, well-characterized design can safely carry a lower margin than a first-flight prototype") },
          ],
        },
        {
          type: "callout",
          variant: "key",
          icon: "⚡",
          heading: "Key Insight",
          text: richText("Structural margin and payload capacity are directly competing for the same mass budget. Treating safety factor as a fixed constant regardless of how well the design is understood leaves either unnecessary mass on the table, or unrecognized risk in the structure."),
        },
      ],
    },

    // Chapter 3 — feedback into aero/propulsion decisions
    {
      id: "aero-propulsion-feedback",
      eyebrow: "Miniaturized Structural Design",
      navTitle: "Aero & Propulsion Feedback",
      readTime: "~2 min",
      blocks: [
        { type: "heading", level: 2, text: "Structural Choices Feed Back Into Aerodynamic and Propulsion Decisions" },
        {
          type: "paragraph",
          text: richText("Structural design doesn't happen in isolation from the rest of the platform — it directly shapes and is shaped by the aerodynamic and propulsion decisions covered earlier in this course."),
        },
        {
          type: "row",
          blocks: [
            {
              type: "specList",
              variant: "blue",
              heading: "Structure → Aerodynamics",
              items: [
                "Wing stiffness sets how much a wing twists and bends under load — insufficient torsional stiffness can trigger aeroelastic flutter",
                "Total structural mass sets wing loading (W/S), which sets stall speed and cruise Re",
              ],
            },
            {
              type: "specList",
              variant: "red",
              heading: "Structure → Propulsion",
              items: [
                "Airframe mass directly sets required thrust and disk loading for a multirotor",
                "A heavier structure needs a larger, less Re-efficient propeller to compensate — compounding the low-Re losses from earlier lessons",
              ],
            },
          ],
        },
        {
          type: "callout",
          variant: "note",
          icon: "📝",
          heading: "Why This Matters",
          text: richText("A structural decision made in isolation — over-building a spar \"to be safe,\" for instance — quietly forces a larger propeller, more battery, and a higher stall speed elsewhere in the design. None of these subsystems can be sized correctly without treating mass, structure, aerodynamics, and propulsion as one coupled problem."),
        },
      ],
    },

    // Chapter 4 — common mistakes
    {
      id: "common-mistakes",
      eyebrow: "Miniaturized Structural Design",
      navTitle: "Common Mistakes",
      readTime: "~1 min",
      blocks: [
        { type: "heading", level: 2, text: "Common Structural Design Mistakes at Small Scale" },
        {
          type: "markList",
          items: [
            { icon: "⚠️", tone: "warn", text: richText("Over-building from full-scale intuition — applying aviation-grade safety factors and material choices where they're not warranted, at a heavy mass cost") },
            { icon: "⚠️", tone: "warn", text: richText("Ignoring non-scaling loads — sizing purely against self-weight and flight loads while forgetting handling forces, mounting hardware, and impact energy (Lesson 1)") },
            { icon: "⚠️", tone: "warn", text: richText("Ignoring manufacturing floors — assuming a structure can be made arbitrarily thin without hitting a 3D-printing or composite-ply minimum (Lesson 1)") },
            { icon: "⚠️", tone: "warn", text: richText("Insufficient impact tolerance — optimizing purely for flight-load stiffness while giving the airframe no way to absorb a hard landing (Lesson 4)") },
          ],
        },
      ],
    },

    // Chapter 5 — design checklist
    {
      id: "design-checklist",
      eyebrow: "Miniaturized Structural Design",
      navTitle: "Design Checklist",
      readTime: "~1 min",
      blocks: [
        { type: "heading", level: 2, text: "Design Checklist" },
        {
          type: "paragraph",
          text: richText("Every lesson in this module traces back to the same underlying question: does the structure account for how small-scale loads and manufacturing actually behave, rather than assuming a full-size intuition applies?"),
        },
        {
          type: "markList",
          items: [
            { icon: "☐", text: richText("Identify which loads on this structure scale down with the airframe, and which don't (Lesson 1)") },
            { icon: "☐", text: richText("Check the design against manufacturing floors (minimum wall thickness, ply count, fastener size) before finalizing dimensions (Lesson 1)") },
            { icon: "☐", text: richText("Select materials by specific strength/stiffness and failure mode, matched to the mission's actual priorities (Lesson 2)") },
            { icon: "☐", text: richText("Trace the load path for bending, shear, and torsion, and size each member for its actual governing load case (Lesson 3)") },
            { icon: "☐", text: richText("Check thin-walled members against buckling, not just material strength (Lesson 3)") },
            { icon: "☐", text: richText("Decide, on purpose, what structure absorbs impact energy and what fails first in a hard landing (Lesson 4)") },
            { icon: "☐", text: richText("Size structural margin against how well the loads are actually known — not a fixed, one-size-fits-all safety factor (this lesson)") },
          ],
        },
        {
          type: "callout",
          variant: "key",
          icon: "⚡",
          heading: "Bottom Line",
          text: richText("Miniaturized structural design isn't full-scale aerospace practice scaled down — it's a distinct discipline with its own governing effects. Treat it that way, and the mass, stiffness, and crash-tolerance budget you save can go straight back into payload, endurance, or performance."),
        },
      ],
    },
  ],
};
