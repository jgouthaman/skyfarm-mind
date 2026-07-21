import type { Lesson } from "@/lib/academy/lesson-schema";
import { richText } from "@/lib/academy/lesson-schema";

// Module 2, Lesson 1 — hand-authored the same way as Module 1's lessons.
// Fully authored from standard structural-engineering scaling principles
// (square-cube law, beam bending/deflection theory) at the user's request,
// as part of a proposed 5-lesson curriculum for "Miniaturized Structural
// Design" — no source text was supplied for this module, unlike Module 1.
export const whyStructuresDontScaleDownSimplyLesson: Lesson = {
  id: "why-structures-dont-scale-down-simply",
  title: "Why Structures Don't Scale Down Simply",
  sectionIndex: 1,
  totalSections: 11,
  missionBrief: richText("By the end of this lesson you'll be able to apply the square-cube law to structural scaling, explain why small structures are relatively strong against their own weight but relatively flexible against fixed external loads, and identify the manufacturing floors that prevent a full-size design from simply being scaled down."),
  quickRef: {
    formula: "M ∝ L³, I ∝ L⁴",
    facts: [
      { label: "Self-weight stress", value: "scales as L" },
      { label: "Deflection (fixed load)", value: "scales as 1/L" },
      { label: "Mass", value: "scales as L³" },
    ],
  },
  slides: [
    // Chapter 1 — the square-cube law
    {
      id: "square-cube-law",
      eyebrow: "Miniaturized Structural Design",
      navTitle: "The Square-Cube Law",
      readTime: "~2 min",
      blocks: [
        { type: "heading", level: 1, text: "Why Structures Don't Scale Down Simply" },
        { type: "heading", level: 2, text: "The Square-Cube Law" },
        {
          type: "lede",
          text: richText("Shrink an aircraft to a tenth of its size and every structural rule of thumb you learned at full scale quietly stops applying. The reason is purely geometric: length, area, and volume don't shrink at the same rate."),
        },
        {
          type: "paragraph",
          text: richText("If a structure is scaled uniformly by a factor applied to every dimension, its linear dimension L, cross-sectional area, and volume (and therefore mass, for a fixed material) scale at different rates:"),
        },
        {
          type: "dataTable",
          columns: ["Quantity", "Scales as", "Why it matters"],
          rows: [
            ["Length (L)", "L¹", "The baseline — every other quantity is measured against it"],
            ["Cross-sectional area", "L²", "Governs simple axial stress capacity (force / area)"],
            ["Volume / mass", "L³", "Governs weight, and how much material you're carrying around"],
            ["Second moment of area (I)", "L⁴", "Governs bending stiffness — grows fastest of all with size"],
          ],
        },
        {
          type: "callout",
          variant: "key",
          icon: "⚡",
          heading: "Key Insight",
          text: richText("Because mass (L³) and bending stiffness (L⁴) scale at different rates than area (L²), no single scaling factor keeps every structural property in the same proportion. A structure that's simply shrunk isn't a smaller version of the original — it's a different structural problem."),
        },
      ],
    },

    // Chapter 2 — self-weight scaling (smaller = relatively stronger)
    {
      id: "self-weight-strength",
      eyebrow: "Miniaturized Structural Design",
      navTitle: "Self-Weight Strength",
      readTime: "~2 min",
      blocks: [
        { type: "heading", level: 2, text: "Why Small Structures Are Relatively Strong Against Their Own Weight" },
        {
          type: "paragraph",
          text: richText("Consider a cantilevered beam supporting nothing but its own weight. The distributed self-weight load (force per unit length) is proportional to cross-sectional area, so it scales as L². The bending moment this produces scales as load × length², or L² × L² = L⁴. Bending stress is moment divided by section modulus, and section modulus scales as L³ — so:"),
        },
        { type: "formula", expression: "σself-weight ∝ L⁴ / L³ = L", size: "sm" },
        {
          type: "paragraph",
          text: richText("Self-weight bending stress scales linearly with size. Shrink the structure, and the stress it experiences from its own weight drops proportionally — smaller structures are relatively stronger against their own weight, not weaker."),
        },
        {
          type: "callout",
          variant: "analogy",
          icon: "🎯",
          heading: "Engineering Analogy",
          text: richText("This is the same reason an ant can carry many times its own body weight while an elephant can barely support its own — the classic square-cube observation from biology applies just as directly to airframes. A miniaturized structure isn't fighting its own weight the way a full-size one does."),
        },
        {
          type: "quickCheck",
          question: "If a structure is uniformly scaled down to half size, what happens to the bending stress it experiences from its own weight alone?",
          options: ["It doubles", "It halves", "It stays the same", "It quadruples"],
          correctIndex: 1,
        },
      ],
    },

    // Chapter 3 — fixed-load scaling (smaller = relatively more flexible)
    {
      id: "fixed-load-flexibility",
      eyebrow: "Miniaturized Structural Design",
      navTitle: "Fixed-Load Flexibility",
      readTime: "~2 min",
      blocks: [
        { type: "heading", level: 2, text: "Why Small Structures Are Relatively Flexible Against Fixed Loads" },
        {
          type: "paragraph",
          text: richText("Chapter 2's result flips completely once the load doesn't scale down with the structure. Tip deflection of a cantilever under an applied force F is:"),
        },
        { type: "formula", expression: "δ = F·L³ / (3·E·I)", size: "sm" },
        {
          type: "paragraph",
          text: richText("For a geometrically similar structure, I scales as L⁴. If F is held fixed — a fixed handling force, a fixed mounting-bracket weight, a fixed impact energy — then:"),
        },
        { type: "formula", expression: "δ ∝ F·L³ / L⁴ = F / L", size: "sm" },
        {
          type: "paragraph",
          text: richText("Deflection under a fixed load scales as 1/L — shrink the structure and the same absolute force bends it proportionally more. This is the opposite conclusion from Chapter 2, and it's the real reason miniaturized structures feel fragile: not because materials weaken at small scale, but because many of the loads a small airframe experiences don't shrink along with it."),
        },
        {
          type: "markList",
          items: [
            { icon: "⚠️", tone: "warn", text: richText("Handling force from a human hand — roughly constant regardless of airframe size") },
            { icon: "⚠️", tone: "warn", text: richText("A gust of a given absolute wind speed — doesn't scale down with a smaller wing") },
            { icon: "⚠️", tone: "warn", text: richText("Mounting hardware, connectors, and fasteners — have practical minimum sizes and weights") },
            { icon: "⚠️", tone: "warn", text: richText("Impact energy from a drop of a given height — set by gravity and height, not airframe size") },
          ],
        },
      ],
    },

    // Chapter 4 — manufacturing floors
    {
      id: "manufacturing-floors",
      eyebrow: "Miniaturized Structural Design",
      navTitle: "Manufacturing Floors",
      readTime: "~1 min",
      blocks: [
        { type: "heading", level: 2, text: "Manufacturing Floors and Minimum Gauge" },
        {
          type: "paragraph",
          text: richText("A second, non-aerodynamic reason miniaturized structures can't simply be scaled down: several manufacturing constraints have absolute minimums that don't shrink with the airframe."),
        },
        {
          type: "markList",
          items: [
            { icon: "▸", text: richText("3D-printed wall thickness is bounded below by nozzle diameter and layer height (commonly 0.1–0.3 mm) — you cannot print an arbitrarily thin rib") },
            { icon: "▸", text: richText("Composite ply thickness is set by the fiber/resin system (commonly 0.1–0.2 mm per ply) — a \"thin\" laminate still has a floor") },
            { icon: "▸", text: richText("Fasteners, inserts, and connectors have practical minimum sizes and masses regardless of how small the surrounding structure is") },
            { icon: "▸", text: richText("Adhesive bond lines need a minimum thickness to carry load reliably") },
          ],
        },
        {
          type: "callout",
          variant: "note",
          icon: "📝",
          heading: "The Practical Consequence",
          text: richText("As an airframe shrinks, these fixed minimums consume a growing fraction of the available mass and volume budget. A rib that's \"just\" 0.2 mm thick is negligible on a 2 m wing and dominant on a 200 mm wing. This is why a proven full-size design can't simply be photocopied at 10% scale — the manufacturing floor becomes the limiting factor long before the material itself does."),
        },
      ],
    },

    // Chapter 5 — worked example
    {
      id: "worked-example",
      eyebrow: "Miniaturized Structural Design",
      navTitle: "Worked Example",
      readTime: "~2 min",
      blocks: [
        { type: "heading", level: 2, text: "Worked Example: Full-Size vs. Half-Scale Wing Spar" },
        {
          type: "callout",
          variant: "problem",
          icon: "📋",
          heading: "Problem Statement",
          text: richText("A solid rectangular composite spar is 1000 mm long, 20 mm wide, 10 mm tall (density 1600 kg/m³, E = 70 GPa). A geometrically similar half-scale spar is 500 × 10 × 5 mm. Compare their mass, bending stiffness, and tip deflection under the same fixed 2 N point load."),
        },
        {
          type: "dataTable",
          columns: ["Quantity", "Full-size", "Half-scale", "Ratio"],
          rows: [
            ["Mass", "320 g", "40 g", "8× lighter"],
            ["Second moment of area, I", "1,667 mm⁴", "104 mm⁴", "16× stiffer (full-size)"],
            ["Bending stiffness, EI", "1.17×10⁸ N·mm²", "7.29×10⁶ N·mm²", "16×"],
            ["Tip deflection under fixed 2 N", "≈ 5.7 mm", "≈ 11.4 mm", "2× more (half-scale)"],
          ],
        },
        {
          type: "paragraph",
          text: richText("The half-scale spar is 8× lighter — exactly what the L³ mass scaling predicts. But under the same fixed 2 N load (representing something that doesn't scale down, like a mounting bracket or a handling force), it deflects twice as much, matching the 1/L scaling from Chapter 3."),
        },
        {
          type: "callout",
          variant: "key",
          icon: "⚡",
          heading: "Key Takeaway",
          text: richText("The half-scale spar isn't simply \"a smaller version\" of the full-size one — it's dramatically lighter and stronger against its own weight, but proportionally much more flexible against any load that doesn't scale down with it. Structural design at small scale has to account for both effects, not just assume smaller means weaker (or stronger) across the board."),
        },
      ],
    },
  ],
};
