import type { Lesson } from "@/lib/academy/lesson-schema";
import { richText } from "@/lib/academy/lesson-schema";

// Module 2, Lesson 3 — same treatment as Lessons 1-2: fully authored from
// standard beam bending/buckling theory, no source text supplied.
export const structuralMemberDesignLesson: Lesson = {
  id: "structural-member-design",
  title: "Structural Member Design: Spars, Skins & Load Paths",
  sectionIndex: 3,
  totalSections: 11,
  missionBrief: richText("By the end of this lesson you'll be able to identify the load paths in a small UAV wing, size a spar for a target bending load, explain why a closed torsion box resists twist far better than an open structure, and recognize when buckling — not material strength — is the limiting failure mode."),
  quickRef: {
    formula: "σ = M·c / I",
    facts: [
      { label: "Buckling load", value: "∝ E·I / L²" },
      { label: "Torsion box", value: "closed cell resists twist" },
      { label: "Sandwich panel", value: "stiffness from core separation" },
    ],
  },
  slides: [
    // Chapter 1 — load paths
    {
      id: "load-paths",
      eyebrow: "Miniaturized Structural Design",
      navTitle: "Load Paths",
      readTime: "~2 min",
      blocks: [
        { type: "heading", level: 1, text: "Structural Member Design: Spars, Skins & Load Paths" },
        { type: "heading", level: 2, text: "Load Paths in a Small UAV Wing" },
        {
          type: "paragraph",
          text: [
            { kind: "text", text: "A " },
            { kind: "term", text: "load path", glossary: { term: "Load path", definition: "The route a structural load travels from where it's applied to where it's ultimately reacted — e.g. from lift on a wing skin, into the spar, through the fuselage, to the ground." } },
            { kind: "text", text: " is the route a force takes from where it's applied to where it's finally reacted. A wing in flight carries three distinct load types simultaneously, and each has a natural structural member that resists it best:" },
          ],
        },
        {
          type: "dataTable",
          columns: ["Load Type", "Primary Resisting Member", "Failure Mode If Undersized"],
          rows: [
            ["Bending (lift distributed along span)", "Spar (cap in tension/compression)", "Spar cap yields or fractures"],
            ["Shear (rate of change of bending moment)", "Spar web", "Web crushes or shears"],
            ["Torsion (twist from aerodynamic center offset)", "Skin (as a closed torsion box)", "Skin buckles or wing twists excessively"],
          ],
        },
        {
          type: "callout",
          variant: "tip",
          icon: "💡",
          heading: "Quick Tip",
          text: richText("Before sizing anything, sketch the load path: where does the force enter the structure, and what member carries it to the fuselage attachment? A structure with no clear load path for one of the three cases above will eventually fail there, regardless of how strong the rest of it is."),
        },
      ],
    },

    // Chapter 2 — sizing a spar for bending
    {
      id: "spar-bending",
      eyebrow: "Miniaturized Structural Design",
      navTitle: "Sizing a Spar",
      readTime: "~2 min",
      blocks: [
        { type: "heading", level: 2, text: "Sizing a Spar for Bending" },
        {
          type: "paragraph",
          text: richText("Bending stress at any point in a beam cross-section is:"),
        },
        { type: "formula", expression: "σ = M·c / I", size: "md" },
        {
          type: "dataTable",
          columns: ["Symbol", "Parameter"],
          rows: [
            ["M", "Bending moment at the section (N·mm)"],
            ["c", "Distance from the neutral axis to the outer fiber (mm)"],
            ["I", "Second moment of area of the cross-section (mm⁴)"],
          ],
        },
        {
          type: "callout",
          variant: "problem",
          icon: "📋",
          heading: "Worked Example",
          text: richText("A wing root sees a bending moment of 8,000 N·mm. The spar cap material has an allowable stress of 250 MPa. For a rectangular cap 6 mm wide, what minimum height h gives an acceptable margin?"),
        },
        {
          type: "paragraph",
          text: richText("For a rectangular section, I = b·h³/12 and c = h/2, so σ = M·(h/2) / (b·h³/12) = 6M / (b·h²). Solving for h: h = √(6M / (b·σ)) = √(6 × 8,000 / (6 × 250)) = √32 ≈ 5.7 mm. A 6 mm cap height gives a small margin above the minimum."),
        },
      ],
    },

    // Chapter 3 — torsional stiffness and skin
    {
      id: "torsion-box",
      eyebrow: "Miniaturized Structural Design",
      navTitle: "Torsional Stiffness",
      readTime: "~2 min",
      blocks: [
        { type: "heading", level: 2, text: "Torsional Stiffness and Skin Contribution" },
        {
          type: "paragraph",
          text: richText("An open structure — a spar with no continuous skin, or a skin split by a spar cutout — resists twist almost entirely through the spar's own torsional stiffness, which for a thin open section is very low. Close the same structure into a torsion box (a continuous skin wrapping the spar into a closed cell) and torsional stiffness increases by one to two orders of magnitude for the same material and mass, because shear now flows continuously around a closed loop instead of concentrating in one open member."),
        },
        {
          type: "illustration",
          caption: "Open structure vs. closed torsion box under twist",
          svg: `<svg viewBox="0 0 640 140" xmlns="http://www.w3.org/2000/svg">
            <rect x="60" y="40" width="200" height="60" fill="none" stroke="var(--lv-force-red)" stroke-width="2.5"/>
            <line x1="160" y1="40" x2="160" y2="100" stroke="var(--lv-force-red)" stroke-width="2" stroke-dasharray="3 3"/>
            <text x="160" y="122" fill="var(--lv-force-red)" font-family="JetBrains Mono" font-size="10" text-anchor="middle">Open section (gap at top)</text>
            <rect x="380" y="40" width="200" height="60" fill="none" stroke="var(--lv-force-blue)" stroke-width="2.5"/>
            <text x="480" y="122" fill="var(--lv-force-blue)" font-family="JetBrains Mono" font-size="10" text-anchor="middle">Closed torsion box</text>
            <path d="M 20 70 Q 40 55 60 70" fill="none" stroke="var(--lv-dim)" stroke-width="1.5"/>
            <path d="M 340 70 Q 360 55 380 70" fill="none" stroke="var(--lv-dim)" stroke-width="1.5"/>
          </svg>`,
        },
        {
          type: "markList",
          items: [
            { icon: "▸", text: richText("Shear flow in a closed cell distributes around the full perimeter, engaging far more material to resist twist") },
            { icon: "▸", text: richText("Even a thin skin dramatically increases torsional stiffness once it forms a closed loop — this is why D-tube leading edges are so effective") },
            { icon: "▸", text: richText("Any gap in the skin (an access hatch, an unsealed control-surface cutout) breaks the closed cell and can undo most of this benefit locally") },
          ],
        },
      ],
    },

    // Chapter 4 — buckling
    {
      id: "buckling",
      eyebrow: "Miniaturized Structural Design",
      navTitle: "Buckling",
      readTime: "~2 min",
      blocks: [
        { type: "heading", level: 2, text: "Buckling of Thin-Walled Members" },
        {
          type: "paragraph",
          text: richText("At small scale, thin skins and spar webs are frequently limited by buckling long before the material's ultimate strength is reached. For a simple column, the critical (Euler) buckling load is:"),
        },
        { type: "formula", expression: "Pcr = π²·E·I / L²", size: "sm" },
        {
          type: "paragraph",
          text: richText("Buckling load depends on stiffness (E·I) and length, not material strength — a thin panel can buckle elastically at a load far below what its material could otherwise carry. This is why thin-walled aerospace structures are so often stiffness-critical rather than strength-critical."),
        },
        {
          type: "markList",
          items: [
            { icon: "▸", text: richText("Shortening the unsupported length (adding ribs or stiffeners) raises the buckling load with the square of the length reduction") },
            { icon: "▸", text: richText("A curved panel (like a fuselage skin) resists buckling far better than a flat one of the same thickness") },
            { icon: "▸", text: richText("Buckling failure can be sudden and, in compression members, catastrophic — it needs its own margin, separate from the material's yield/ultimate strength margin") },
          ],
        },
      ],
    },

    // Chapter 5 — sandwich construction
    {
      id: "sandwich-construction",
      eyebrow: "Miniaturized Structural Design",
      navTitle: "Sandwich Construction",
      readTime: "~1 min",
      blocks: [
        { type: "heading", level: 2, text: "Sandwich Construction" },
        {
          type: "paragraph",
          text: richText("A sandwich panel — two thin, stiff skins bonded to a lightweight core (foam, honeycomb, balsa) — gets its bending stiffness almost entirely from separating the skins, the same way an I-beam's flanges do most of the work while the web just holds them apart."),
        },
        { type: "formula", expression: "I ≈ 2·Askin·(d/2)²  (skins dominate, thin core)", size: "sm" },
        {
          type: "paragraph",
          text: richText("Because I scales with the square of the skin separation d, doubling the core thickness (for negligible extra mass, since foam core is very light) can multiply bending stiffness several times over — far more efficient per unit mass than simply using a thicker solid laminate."),
        },
        {
          type: "callout",
          variant: "key",
          icon: "⚡",
          heading: "Key Takeaway",
          text: richText("Sandwich construction turns the square-cube problem from Lesson 1 to your advantage: a thicker, lighter core gets you disproportionately more bending stiffness for very little extra mass — exactly the direction you want to push at small scale."),
        },
      ],
    },
  ],
};
