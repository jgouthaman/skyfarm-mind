import type { Lesson } from "@/lib/academy/lesson-schema";
import { richText } from "@/lib/academy/lesson-schema";

// Section 2 of the "Low Reynolds Number Aerodynamics" course, ported
// slide-for-slide from docs/design/torqwings-module-template.html — the
// reference example for the JSON-driven slide-deck lesson viewer.
export const lowReynoldsNumberAerodynamicsLesson: Lesson = {
  id: "low-reynolds-number-aerodynamics",
  title: "Low Reynolds Number Aerodynamics",
  sectionIndex: 2,
  totalSections: 11,
  missionBrief: richText("By the end of this lesson you'll be able to compute the Reynolds number for a given wing, explain why it separates laminar from turbulent flow, and place a small-drone wing correctly on the low-Re spectrum."),
  quickRef: {
    formula: "Re = ρVL / μ",
    facts: [
      { label: "ρ", value: "1.225 kg/m³" },
      { label: "μ", value: "1.789×10⁻⁵ Pa·s" },
      { label: "Low-Re band", value: "10k – 200k" },
    ],
    highlightValue: "Re ≈ 171,000",
    highlightLabel: "this lesson's worked example",
  },
  slides: [
    // Slide 1 — formula + interactive calculator
    {
      id: "formula",
      eyebrow: "Foundation · Low-Re Aerodynamics",
      navTitle: "The Formula",
      readTime: "~2 min",
      blocks: [
        { type: "heading", level: 1, text: "What is Reynolds Number?" },
        { type: "lede", text: richText("Before we design effective wings for small drones, we need the single most important dimensionless parameter governing their aerodynamic behaviour.") },
        { type: "heading", level: 2, text: "The formula" },
        { type: "formula", expression: "Re = ρVL / μ", size: "md" },
        {
          type: "paragraph",
          text: [
            { kind: "text", text: "Where V is the " },
            { kind: "term", text: "freestream", glossary: { term: "Freestream", definition: "The undisturbed airflow ahead of the wing, unaffected by its presence." } },
            { kind: "text", text: " velocity, L is the " },
            { kind: "term", text: "chord", glossary: { term: "Chord", definition: "The straight-line distance from a wing's leading edge to its trailing edge." } },
            { kind: "text", text: " length, and μ is the fluid's " },
            { kind: "term", text: "dynamic viscosity", glossary: { term: "Dynamic viscosity", definition: "A fluid's internal resistance to flow — its \"thickness.\"" } },
            { kind: "text", text: "." },
          ],
        },
        {
          type: "illustration",
          caption: "V, L, and ρ mapped onto a wing section",
          svg: `<svg viewBox="0 0 640 150" xmlns="http://www.w3.org/2000/svg">
            <path d="M40 95 Q 220 55 480 78 Q 560 84 600 70" fill="none" stroke="var(--lv-amber)" stroke-width="2.5"/>
            <path d="M40 95 Q 220 130 480 105 Q 560 100 600 70" fill="none" stroke="var(--lv-amber-dim)" stroke-width="2" opacity=".6"/>
            <g stroke="var(--lv-force-blue)" stroke-width="2" fill="none">
              <line x1="20" y1="40" x2="70" y2="40"/><polygon points="70,40 62,35 62,45" fill="var(--lv-force-blue)"/>
              <line x1="20" y1="60" x2="70" y2="60"/><polygon points="70,60 62,55 62,65" fill="var(--lv-force-blue)"/>
            </g>
            <text x="12" y="30" fill="var(--lv-force-blue)" font-family="JetBrains Mono" font-size="13">V</text>
            <line x1="40" y1="118" x2="480" y2="105" stroke="var(--lv-dim)" stroke-width="1" stroke-dasharray="3 3"/>
            <line x1="40" y1="112" x2="40" y2="124" stroke="var(--lv-dim)" stroke-width="1"/>
            <line x1="480" y1="99" x2="480" y2="111" stroke="var(--lv-dim)" stroke-width="1"/>
            <text x="245" y="140" fill="var(--lv-dim)" font-family="JetBrains Mono" font-size="13" text-anchor="middle">L (chord)</text>
            <g fill="var(--lv-amber-dim)" opacity=".8">
              <circle cx="140" cy="25" r="2.5"/><circle cx="170" cy="18" r="2.5"/><circle cx="120" cy="15" r="2.5"/>
              <circle cx="310" cy="28" r="2.5"/><circle cx="340" cy="20" r="2.5"/><circle cx="290" cy="14" r="2.5"/>
            </g>
            <text x="220" y="8" fill="var(--lv-dim)" font-family="JetBrains Mono" font-size="11">ρ (air density, surrounding field)</text>
          </svg>`,
        },
        { type: "custom", component: "ReynoldsFormulaCalculator" },
        {
          type: "dataTable",
          columns: ["Symbol", "Parameter", "Units", "Typical (sea level)"],
          rows: [
            ["ρ", "Air density", "kg/m³", "1.225 kg/m³"],
            ["V", "Freestream velocity", "m/s", "Mission-dependent"],
            ["L", "Reference chord", "m", "Mission-dependent"],
            ["μ", "Dynamic viscosity", "Pa·s", "1.789 × 10⁻⁵ Pa·s"],
          ],
        },
        {
          type: "callout",
          variant: "tip",
          icon: "💡",
          heading: "Quick tip",
          text: [
            { kind: "text", text: "You'll sometimes see Re written with kinematic viscosity " },
            { kind: "em", text: "ν = μ/ρ" },
            { kind: "text", text: ", giving " },
            { kind: "strong", text: "Re = VL/ν" },
            { kind: "text", text: ". Same number, different form." },
          ],
        },
      ],
    },

    // Slide 2 — physical intuition + quick check
    {
      id: "intuition",
      eyebrow: "Foundation · Low-Re Aerodynamics",
      navTitle: "Physical Intuition",
      readTime: "~2 min",
      blocks: [
        { type: "heading", level: 2, text: "The physical intuition" },
        { type: "paragraph", text: richText("Reynolds Number is a ratio of forces — this is the insight that separates engineers who use Re from those who truly understand it:") },
        { type: "formula", expression: "Re = Inertial Forces / Viscous Forces", size: "md" },
        {
          type: "illustration",
          caption: "At low Re the two sides sit close in weight — viscosity keeps competing for control of the flow",
          svg: `<svg viewBox="0 0 640 130" xmlns="http://www.w3.org/2000/svg">
            <line x1="320" y1="18" x2="320" y2="40" stroke="var(--lv-dim)" stroke-width="2"/>
            <g transform="rotate(-4 320 40)">
              <line x1="150" y1="40" x2="490" y2="40" stroke="var(--lv-dim)" stroke-width="2" stroke-linecap="round"/>
              <line x1="150" y1="40" x2="150" y2="72" stroke="var(--lv-force-blue)" stroke-width="2"/>
              <rect x="105" y="72" width="90" height="26" rx="6" fill="color-mix(in srgb, var(--lv-force-blue) 18%, var(--lv-panel))" stroke="var(--lv-force-blue)"/>
              <text x="150" y="89" fill="var(--lv-force-blue)" font-family="JetBrains Mono" font-size="11" text-anchor="middle">ρVL</text>
              <line x1="490" y1="40" x2="490" y2="64" stroke="var(--lv-force-red)" stroke-width="2"/>
              <rect x="445" y="64" width="90" height="26" rx="6" fill="color-mix(in srgb, var(--lv-force-red) 18%, var(--lv-panel))" stroke="var(--lv-force-red)"/>
              <text x="490" y="81" fill="var(--lv-force-red)" font-family="JetBrains Mono" font-size="11" text-anchor="middle">μ</text>
            </g>
            <polygon points="320,18 312,30 328,30" fill="var(--lv-amber)"/>
            <text x="150" y="112" fill="var(--lv-dim)" font-family="Inter" font-size="11" text-anchor="middle">Inertial</text>
            <text x="490" y="112" fill="var(--lv-dim)" font-family="Inter" font-size="11" text-anchor="middle">Viscous</text>
          </svg>`,
        },
        {
          type: "row",
          blocks: [
            { type: "specList", variant: "blue", heading: "Inertial (ρVL)", items: ["Momentum of the fluid", "Flow \"wants to keep going\"", "Sustains motion, resists change"] },
            { type: "specList", variant: "red", heading: "Viscous (μ)", items: ["Internal friction — the fluid's \"stickiness\"", "Damps disturbances", "Keeps flow ordered and laminar"] },
          ],
        },
        {
          type: "callout",
          variant: "analogy",
          icon: "🌀",
          heading: "Engineering analogy",
          text: richText("Pushing your hand through honey (high viscosity, low Re) versus through water at speed (low viscosity, high Re) — your drone wing sits somewhere on this spectrum."),
        },
        {
          type: "quickCheck",
          question: "a fluid with very high viscosity and low velocity has:",
          options: ["Low Re — viscous forces dominate", "High Re — inertial forces dominate", "Re is undefined in this case"],
          correctIndex: 0,
        },
      ],
    },

    // Slide 3 — where small drones sit
    {
      id: "regime",
      eyebrow: "Foundation · Low-Re Aerodynamics",
      navTitle: "The Low-Re Regime",
      readTime: "~1 min",
      blocks: [
        { type: "heading", level: 2, text: "What \"low Reynolds number\" means" },
        {
          type: "paragraph",
          text: [
            { kind: "text", text: "Commercial aircraft cruise at Re of " },
            { kind: "strong", text: "10⁷–10⁸" },
            { kind: "text", text: ". Small drones operate in a very different band:" },
          ],
        },
        { type: "formula", expression: "10,000 ≤ Re ≤ 200,000", size: "sm" },
        {
          type: "illustration",
          caption: "Micro-insects & dust → small drones → transition zone → full-scale aircraft",
          chart: {
            kind: "regimeBar",
            markerLog10: null,
            minLabel: "10⁴",
            maxLabel: "10⁸",
            bandStartLog10: 4,
            bandEndLog10: 5.3,
            bandLabel: "YOU ARE HERE — small drones",
          },
        },
        {
          type: "markList",
          items: [
            { icon: "✅", tone: "ok", text: richText("Not dominated by viscosity alone (unlike a microorganism at Re < 1)") },
            { icon: "✅", tone: "ok", text: richText("Not turbulent enough to behave like a large aircraft wing") },
            {
              icon: "⚠️",
              tone: "warn",
              text: [
                { kind: "term", text: "Laminar Separation Bubbles", glossary: { term: "LSB", definition: "A region where laminar flow detaches then reattaches turbulently, common at low Re." } },
                { kind: "text", text: " form readily and hurt performance" },
              ],
            },
            {
              icon: "⚠️",
              tone: "warn",
              text: [
                { kind: "text", text: "Classic high-Re airfoil theory " },
                { kind: "strong", text: "breaks down" },
              ],
            },
          ],
        },
        {
          type: "callout",
          variant: "key",
          icon: "⚡",
          heading: "Key takeaway",
          text: [
            { kind: "text", text: "A wing that performs beautifully at Re = 10⁶ can perform " },
            { kind: "em", text: "catastrophically" },
            { kind: "text", text: " at Re = 50,000. Dedicated low-Re airfoil families — " },
            { kind: "strong", text: "Eppler, Selig, Drela" },
            { kind: "text", text: " — exist precisely because of this." },
          ],
        },
      ],
    },

    // Slide 4 — worked example problem
    {
      id: "example-problem",
      eyebrow: "Foundation · Low-Re Aerodynamics",
      navTitle: "Worked Example: Setup",
      readTime: "~1 min",
      blocks: [
        { type: "heading", level: 2, text: "Worked example" },
        {
          type: "callout",
          variant: "problem",
          icon: "📋",
          heading: "Problem",
          text: [
            { kind: "text", text: "A fixed-wing surveillance drone has a " },
            { kind: "strong", text: "250 mm chord" },
            { kind: "text", text: ", cruising at " },
            { kind: "strong", text: "10 m/s" },
            { kind: "text", text: " at sea level. Find Re." },
          ],
        },
        { type: "heading", level: 3, text: "Known values" },
        {
          type: "dataTable",
          columns: ["Parameter", "Symbol", "Value"],
          rows: [
            ["Air density", "ρ", "1.225 kg/m³"],
            ["Cruise velocity", "V", "10 m/s"],
            ["Wing chord", "L", "0.25 m"],
            ["Dynamic viscosity", "μ", "1.789 × 10⁻⁵ Pa·s"],
          ],
        },
        {
          type: "quickCheck",
          question: "before solving, estimate: is this Re closer to...",
          options: ["~1,000 (way below the drone band)", "~170,000 (inside the drone band)", "~5,000,000 (aircraft-scale)"],
          correctIndex: 1,
        },
      ],
    },

    // Slide 5 — solve
    {
      id: "solve",
      eyebrow: "Foundation · Low-Re Aerodynamics",
      navTitle: "Worked Example: Solve",
      readTime: "~1 min",
      blocks: [
        { type: "heading", level: 2, text: "Solve" },
        { type: "formula", expression: "Re = (1.225 × 10 × 0.25) / 1.789×10⁻⁵ ≈ 171,000", size: "sm" },
        {
          type: "illustration",
          caption: "Lands squarely in the low-Re design band from the previous section",
          chart: { kind: "regimeBar", markerLog10: Math.log10(171000), minLabel: "10⁴", maxLabel: "10⁸" },
        },
        { type: "paragraph", text: richText("This wing must use a dedicated low-Re airfoil, not a scaled-down commercial section.") },
        {
          type: "callout",
          variant: "note",
          icon: "📝",
          heading: "Up next",
          text: richText("Laminar Separation Bubbles — what they are, why they form at this Re, and how to design around them."),
        },
      ],
    },
  ],
};
