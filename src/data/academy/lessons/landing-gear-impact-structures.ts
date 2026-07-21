import type { Lesson } from "@/lib/academy/lesson-schema";
import { richText } from "@/lib/academy/lesson-schema";

// Module 2, Lesson 4 — same treatment as Lessons 1-3: fully authored from
// standard impact-energy/crash-tolerance design references, no source text
// supplied.
export const landingGearImpactStructuresLesson: Lesson = {
  id: "landing-gear-impact-structures",
  title: "Landing Gear & Impact Structures for Small UAVs",
  sectionIndex: 4,
  totalSections: 11,
  missionBrief: richText("By the end of this lesson you'll be able to distinguish impact loads from steady flight loads, estimate impact energy for a hard landing, compare landing gear configurations, and design for graceful rather than catastrophic structural failure."),
  quickRef: {
    formula: "E = m·g·h",
    facts: [
      { label: "Impact vs flight loads", value: "impulsive, not steady" },
      { label: "Energy absorption", value: "controlled deformation" },
      { label: "Redundancy", value: "modular, replaceable elements" },
    ],
  },
  slides: [
    // Chapter 1 — impact loads are different
    {
      id: "impact-vs-flight-loads",
      eyebrow: "Miniaturized Structural Design",
      navTitle: "Impact vs. Flight Loads",
      readTime: "~1 min",
      blocks: [
        { type: "heading", level: 1, text: "Landing Gear & Impact Structures for Small UAVs" },
        { type: "heading", level: 2, text: "Impact Loads Are Different From Flight Loads" },
        {
          type: "paragraph",
          text: richText("Every load discussed so far in this module — bending, torsion, self-weight — is a steady or slowly-varying load: it builds up and the structure has time to distribute stress smoothly through its load paths. An impact is fundamentally different: it delivers a large amount of energy in a very short time, and the structure's job shifts from resisting a peak force to absorbing energy without transmitting a dangerous peak force to whatever's inside."),
        },
        {
          type: "callout",
          variant: "key",
          icon: "⚡",
          heading: "Key Insight",
          text: richText("A structure sized purely for flight loads is answering the wrong question during a crash. Flight-load design asks \"how much stress can this material take?\" Impact design asks \"how much energy can this structure absorb before something important breaks?\" — and those two designs often pull in opposite directions."),
        },
      ],
    },

    // Chapter 2 — energy absorption strategies
    {
      id: "energy-absorption",
      eyebrow: "Miniaturized Structural Design",
      navTitle: "Energy Absorption",
      readTime: "~2 min",
      blocks: [
        { type: "heading", level: 2, text: "Energy Absorption Strategies" },
        {
          type: "paragraph",
          text: richText("The kinetic energy an airframe carries into a hard landing has to go somewhere. Good crash design gives it somewhere safe to go, rather than letting it dump into whatever component happens to be stiffest."),
        },
        {
          type: "row",
          blocks: [
            {
              type: "specList",
              variant: "blue",
              heading: "Elastic Absorption",
              items: [
                "Foam, flexible skids, and compliant landing gear legs flex and spring back",
                "No repair needed after a mild impact",
                "Limited total energy capacity before it transmits the rest onward",
              ],
            },
            {
              type: "specList",
              variant: "red",
              heading: "Plastic / Sacrificial Absorption",
              items: [
                "A deliberately weaker element (a breakaway motor mount, a crumple rib) deforms permanently",
                "Absorbs much more energy per unit mass than elastic elements",
                "Requires replacing or repairing the sacrificial part after use",
              ],
            },
          ],
        },
        {
          type: "callout",
          variant: "problem",
          icon: "📋",
          heading: "Worked Example: Estimating Impact Energy",
          text: richText("A 400 g airframe stalls and drops 1.5 m before impact. Kinetic energy at impact: E = m·g·h = 0.4 × 9.81 × 1.5 ≈ 5.9 J. That energy has to be absorbed by whatever structure contacts the ground first — landing gear, a sacrificial nose, or (if neither is present) the payload bay."),
        },
      ],
    },

    // Chapter 3 — landing gear configurations
    {
      id: "landing-gear-configurations",
      eyebrow: "Miniaturized Structural Design",
      navTitle: "Gear Configurations",
      readTime: "~2 min",
      blocks: [
        { type: "heading", level: 2, text: "Landing Gear Configurations" },
        {
          type: "dataTable",
          columns: ["Configuration", "Mass Penalty", "Best Suited For"],
          rows: [
            ["Skids (fixed, rigid)", "Low", "Smooth, prepared surfaces; simple, cheap, low maintenance"],
            ["Flexible/spring skids", "Low–moderate", "Rough terrain, hand-launched fixed-wing recovery"],
            ["Wheeled gear", "Moderate", "Runway operations, repeated takeoff/landing cycles"],
            ["Belly landing (no dedicated gear)", "Lowest", "Expendable or foam-bodied airframes where the fuselage itself absorbs impact"],
          ],
        },
        {
          type: "paragraph",
          text: richText("At small scale, dedicated landing gear is often a worse trade than it looks: the mass, complexity, and drag it adds may not be repaid unless the mission genuinely requires repeated wheeled operations. Many small fixed-wing UAVs are deliberately belly-landed or hand-recovered instead."),
        },
      ],
    },

    // Chapter 4 — crash tolerance and redundancy
    {
      id: "crash-tolerance-redundancy",
      eyebrow: "Miniaturized Structural Design",
      navTitle: "Crash Tolerance",
      readTime: "~2 min",
      blocks: [
        { type: "heading", level: 2, text: "Crash Tolerance & Structural Redundancy" },
        {
          type: "paragraph",
          text: richText("Designing for graceful failure means choosing, in advance, which part breaks first — and making sure that part is cheap, fast, and safe to replace."),
        },
        {
          type: "markList",
          items: [
            { icon: "▸", text: richText("Motor arms and mounts designed as separate, bolt-on modules fail (and get replaced) independently of the main airframe") },
            { icon: "▸", text: richText("A sacrificial nose or skid absorbs impact energy before it reaches the payload bay or flight controller") },
            { icon: "▸", text: richText("Snap-fit or friction-fit joints can be tuned to release under excessive load, protecting the parts on either side of them") },
            { icon: "▸", text: richText("Redundant, independently-replaceable structure means one crash grounds the aircraft for minutes, not the whole build") },
          ],
        },
        {
          type: "callout",
          variant: "tip",
          icon: "💡",
          heading: "Design Principle",
          text: richText("Decide what breaks first, on purpose, rather than letting the crash decide for you. A structure with no designed failure point tends to fail wherever it's weakest by accident — often somewhere expensive or slow to repair."),
        },
      ],
    },

    // Chapter 5 — worked example
    {
      id: "worked-example",
      eyebrow: "Miniaturized Structural Design",
      navTitle: "Worked Example",
      readTime: "~1 min",
      blocks: [
        { type: "heading", level: 2, text: "Worked Example: Estimating Hard-Landing Loads" },
        {
          type: "callout",
          variant: "problem",
          icon: "📋",
          heading: "Problem Statement",
          text: richText("The same 400 g airframe from Chapter 2 (impact energy ≈ 5.9 J) lands on a foam skid that compresses 15 mm before bottoming out. Estimate the average deceleration force."),
        },
        {
          type: "paragraph",
          text: richText("Assuming the skid absorbs the full impact energy over its 15 mm of travel, average force F ≈ E / d = 5.9 J / 0.015 m ≈ 393 N. That's roughly 100× the airframe's own weight (0.4 kg × 9.81 ≈ 3.9 N) — a reminder that even a \"soft\" landing on a short-travel skid can subject internal components to a large transient load."),
        },
        {
          type: "callout",
          variant: "key",
          icon: "⚡",
          heading: "Key Takeaway",
          text: richText("Doubling the skid's compression travel roughly halves the peak force for the same impact energy. Energy-absorbing travel distance is often a more effective lever than adding raw structural strength — it's usually cheaper in mass, too."),
        },
      ],
    },
  ],
};
