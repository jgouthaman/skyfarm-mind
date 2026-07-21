import type { Lesson } from "@/lib/academy/lesson-schema";
import { richText } from "@/lib/academy/lesson-schema";

// Module 2, Lesson 2 — same treatment as Lesson 1: fully authored from
// standard materials-engineering references, no source text supplied.
export const materialBehaviorAtSmallScaleLesson: Lesson = {
  id: "material-behavior-at-small-scale",
  title: "Material Behavior at Small Scale",
  sectionIndex: 2,
  totalSections: 11,
  missionBrief: richText("By the end of this lesson you'll be able to compare materials by specific strength and specific stiffness rather than absolute values, explain the trade-offs between 3D-printed thermoplastics, composites, and classic foam/balsa construction, and choose a material family for a given small-UAV mission."),
  quickRef: {
    formula: "Specific strength = σ / ρ",
    facts: [
      { label: "Specific stiffness", value: "E / ρ" },
      { label: "Carbon fiber E", value: "≈ 70–230 GPa" },
      { label: "EPP foam density", value: "≈ 20–60 kg/m³" },
    ],
  },
  slides: [
    // Chapter 1 — specific strength & specific stiffness
    {
      id: "specific-properties",
      eyebrow: "Miniaturized Structural Design",
      navTitle: "Specific Properties",
      readTime: "~2 min",
      blocks: [
        { type: "heading", level: 1, text: "Material Behavior at Small Scale" },
        { type: "heading", level: 2, text: "Specific Strength & Specific Stiffness" },
        {
          type: "paragraph",
          text: richText("For a mass-limited small UAV, the material property that matters is rarely absolute strength or absolute stiffness — it's how much strength or stiffness you get per unit of mass carried. Two ratios drive almost every material decision in this lesson:"),
        },
        { type: "formula", expression: "Specific strength = σultimate / ρ", size: "sm" },
        { type: "formula", expression: "Specific stiffness = E / ρ", size: "sm" },
        {
          type: "paragraph",
          text: richText("A material with modest absolute strength but very low density can out-perform a much stronger, much denser material once you account for the mass penalty of using enough of it."),
        },
        {
          type: "dataTable",
          columns: ["Material", "Density (g/cm³)", "E (GPa, approx.)", "Notes"],
          rows: [
            ["Balsa (along grain)", "≈ 0.15", "≈ 3–4", "Excellent specific stiffness along the grain, poor across it"],
            ["EPP / EPS foam", "≈ 0.02–0.06", "< 0.1", "Very low stiffness, but extremely impact-tolerant and cheap"],
            ["3D-printed PLA", "≈ 1.24", "≈ 2.5–3.5", "Rigid but brittle; weak between layers"],
            ["Fiberglass composite", "≈ 1.8–2.0", "≈ 20–40", "Tough, forgiving of impact, moderate stiffness"],
            ["Carbon fiber composite", "≈ 1.5–1.6", "≈ 70–230", "Highest specific stiffness, but brittle failure mode"],
          ],
        },
      ],
    },

    // Chapter 2 — 3D-printed thermoplastics
    {
      id: "printed-thermoplastics",
      eyebrow: "Miniaturized Structural Design",
      navTitle: "3D-Printed Plastics",
      readTime: "~2 min",
      blocks: [
        { type: "heading", level: 2, text: "3D-Printed Thermoplastics" },
        {
          type: "paragraph",
          text: richText("Fused deposition modeling (FDM) printing builds parts layer by layer, and that process leaves a structural signature: a printed part is meaningfully weaker between layers than within a layer. Print orientation is therefore a load-path decision, not just a slicer setting."),
        },
        {
          type: "row",
          blocks: [
            {
              type: "specList",
              variant: "blue",
              heading: "PLA",
              items: [
                "Stiff and dimensionally stable, easy to print",
                "Brittle — low impact tolerance, cracks rather than deforms",
                "Loses stiffness well below typical cockpit/motor temperatures",
              ],
            },
            {
              type: "specList",
              variant: "red",
              heading: "Nylon / PETG",
              items: [
                "Tougher and more impact-tolerant than PLA",
                "Lower stiffness for a given wall thickness",
                "More sensitive to moisture (nylon) or stringing (PETG) during printing",
              ],
            },
          ],
        },
        {
          type: "callout",
          variant: "tip",
          icon: "💡",
          heading: "Print Orientation Is a Structural Decision",
          text: richText("Orient a printed part so primary loads run along the print layers (in-plane), not across them (interlayer). A bracket that fails at half its expected load almost always failed at a layer line loaded in the weak direction."),
        },
      ],
    },

    // Chapter 3 — composites
    {
      id: "composites",
      eyebrow: "Miniaturized Structural Design",
      navTitle: "Composites",
      readTime: "~2 min",
      blocks: [
        { type: "heading", level: 2, text: "Composites: Fiberglass & Carbon Fiber" },
        {
          type: "paragraph",
          text: richText("Composite properties are fiber-dominated in the fiber direction and matrix-dominated across it — ply orientation (the layup) is what actually determines whether a panel is stiff, tough, or both."),
        },
        {
          type: "markList",
          items: [
            { icon: "▸", text: richText("Fiberglass: moderate stiffness, high toughness — it bends and cracks progressively rather than failing suddenly, which makes it forgiving during a hard landing") },
            { icon: "▸", text: richText("Carbon fiber: much higher specific stiffness, but a brittle failure mode — it holds its shape right up until it doesn't, with little warning") },
            { icon: "▸", text: richText("Layup (ply angle and stacking order) controls whether a panel resists bending, torsion, or both — a spar cap wants fibers aligned with the span; a torsion-box skin wants angled plies") },
          ],
        },
        {
          type: "callout",
          variant: "key",
          icon: "⚡",
          heading: "Key Insight",
          text: richText("Carbon fiber's high stiffness is a genuine liability in a crash-prone small UAV: a component that's stiff right up to sudden brittle failure gives none of the progressive warning that a tougher material would. Many designs deliberately mix a carbon spar (for stiffness) with a fiberglass or foam skin (for impact tolerance)."),
        },
      ],
    },

    // Chapter 4 — foam and balsa
    {
      id: "foam-balsa",
      eyebrow: "Miniaturized Structural Design",
      navTitle: "Foam & Balsa",
      readTime: "~1 min",
      blocks: [
        { type: "heading", level: 2, text: "Foam and Balsa Construction" },
        {
          type: "paragraph",
          text: richText("Long before composites and 3D printing, hobby aircraft were built almost entirely from balsa and foam — and for many small-UAV missions, that classic construction still wins."),
        },
        {
          type: "markList",
          items: [
            { icon: "▸", text: richText("EPP foam survives repeated hard impacts by deforming and springing back, rather than cracking — ideal for training airframes and anything that will be crashed often") },
            { icon: "▸", text: richText("Balsa's properties are strongly grain-direction dependent — a spar cut along the grain is far stiffer than the same piece loaded across it") },
            { icon: "▸", text: richText("Both are inexpensive, easy to repair with basic tools and glue, and forgiving of imprecise fabrication — valuable for iteration speed during development") },
          ],
        },
        {
          type: "callout",
          variant: "note",
          icon: "📝",
          heading: "When Classic Construction Still Wins",
          text: richText("If the mission calls for frequent crashes (training, racing), rapid field repair, or low unit cost over ultimate performance, foam/balsa construction often out-performs a \"better\" composite or printed structure on total cost of ownership, even though it loses on specific stiffness."),
        },
      ],
    },

    // Chapter 5 — choosing a material
    {
      id: "material-selection",
      eyebrow: "Miniaturized Structural Design",
      navTitle: "Choosing a Material",
      readTime: "~1 min",
      blocks: [
        { type: "heading", level: 2, text: "Choosing a Material for the Mission" },
        {
          type: "dataTable",
          columns: ["Mission Priority", "Recommended Approach"],
          rows: [
            ["Maximum stiffness, weight-critical", "Carbon fiber spar/skin, accept brittle failure risk"],
            ["Frequent crashes, low repair cost", "Foam (EPP) with balsa or plywood reinforcement"],
            ["Rapid iteration / prototyping", "3D-printed PLA/PETG, oriented for the primary load path"],
            ["Balanced toughness and stiffness", "Fiberglass composite, or carbon spar with fiberglass skin"],
          ],
        },
        {
          type: "callout",
          variant: "key",
          icon: "⚡",
          heading: "Bottom Line",
          text: richText("There is no universally \"best\" material — only the material whose specific strength, specific stiffness, and failure mode best match the mission's actual priorities. Choosing carbon fiber for a trainer aircraft that will be crashed weekly is as much a mismatch as choosing foam for a payload-critical long-endurance platform."),
        },
      ],
    },
  ],
};
