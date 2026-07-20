import type { Lesson } from "@/lib/academy/lesson-schema";
import { richText } from "@/lib/academy/lesson-schema";

// Same treatment as Lessons 1-3: hand-authored instead of left on the
// AI-generated ContentSection/HeroCard path.
//
// The source content supplied only covered Section 1 (1.1-1.4) and the
// start of Section 2 (2.1, 2.2) before cutting off mid-formula — chapters
// 1-5 below are a faithful port of that. Chapters 6-8 (pitch-to-diameter
// selection, tip losses, and the worked example) cover the remaining
// sections from the source's own table of contents, which were never
// supplied beyond their titles — those were authored from standard
// blade-element-theory/propeller design references at the user's request
// rather than left as a "more coming" placeholder. The worked example in
// particular uses explicitly-labeled illustrative assumptions (chord,
// hover RPM) rather than claiming to be a specific product's measured
// data — flag for review if real datasheet numbers are available to
// replace them.
export const propellerRotorAerodynamicsAtLowReLesson: Lesson = {
  id: "propeller-rotor-aerodynamics-at-low-re",
  title: "Propeller & Rotor Aerodynamics at Low Re",
  sectionIndex: 5,
  totalSections: 11,
  missionBrief: richText("By the end of this lesson you'll be able to explain why propeller efficiency drops sharply at small scale, apply blade element theory to break a propeller into analyzable strips, and weigh pitch-to-diameter and tip-loss trade-offs when selecting a propeller for a small UAV."),
  quickRef: {
    formula: "Re = ρ·Vrel·c / μ",
    facts: [
      { label: "μ", value: "1.81×10⁻⁵ Pa·s" },
      { label: "Drone prop Re", value: "30k – 80k" },
      { label: "Full-scale prop Re", value: "10⁶ – 10⁷" },
    ],
  },
  slides: [
    // Chapter 1 — why efficiency drops (intro + Reynolds problem + cascade table)
    {
      id: "why-efficiency-drops",
      eyebrow: "Advanced Aerodynamics Module",
      navTitle: "Why Efficiency Drops",
      readTime: "~2 min",
      blocks: [
        { type: "heading", level: 1, text: "Propeller & Rotor Aerodynamics at Low Re" },
        { type: "heading", level: 2, text: "1. Why Propeller Efficiency Drops at Small Scale & Low Re" },
        { type: "heading", level: 3, text: "The Reynolds Number Problem" },
        {
          type: "paragraph",
          text: richText("The Reynolds number is arguably the most important scaling parameter in small UAV propulsion. For a blade section it is defined as:"),
        },
        { type: "formula", expression: "Re = ρ × Vrel × c / μ", size: "md" },
        {
          type: "dataTable",
          columns: ["Symbol", "Parameter"],
          rows: [
            ["ρ", "Air density (kg/m³)"],
            ["Vrel", "Relative velocity at the blade section (m/s)"],
            ["c", "Local chord length (m)"],
            ["μ", "Dynamic viscosity of air ≈ 1.81 × 10⁻⁵ Pa·s"],
          ],
        },
        {
          type: "callout",
          variant: "key",
          icon: "⚡",
          heading: "Key Insight",
          text: richText("A full-scale aircraft propeller operates at Re = 10⁶–10⁷. A 5-inch drone propeller spinning at 8,000 RPM may only reach Re = 30,000–80,000 at the blade midspan. This is a fundamentally different aerodynamic regime."),
        },
        { type: "heading", level: 3, text: "The Cascade of Efficiency Losses" },
        {
          type: "paragraph",
          text: richText("At low Reynolds numbers, several compounding mechanisms degrade performance:"),
        },
        {
          type: "row",
          blocks: [
            {
              type: "specList",
              variant: "blue",
              heading: "High Re (> 500,000)",
              items: [
                "Turbulent boundary layer attaches to the blade surface",
                "High L/D ratios",
                "Sharp stall behavior",
                "Thin, efficient airfoils perform well",
              ],
            },
            {
              type: "specList",
              variant: "red",
              heading: "Low Re (< 100,000)",
              items: [
                "Laminar boundary layer separates easily",
                "L/D ratios drop by 40–70%",
                "Soft, extended separation bubble instead of a sharp stall",
                "Cambered plates may outperform thin, efficient airfoils",
              ],
            },
          ],
        },
      ],
    },

    // Chapter 2 — 1.1 Laminar Separation Bubbles
    {
      id: "separation-bubbles",
      eyebrow: "Advanced Aerodynamics Module",
      navTitle: "Separation Bubbles",
      readTime: "~1 min",
      blocks: [
        { type: "heading", level: 2, text: "1.1 Laminar Separation Bubbles (LSB)" },
        {
          type: "paragraph",
          text: richText("At low Re, the boundary layer remains laminar far longer than at high Re. When it encounters an adverse pressure gradient (past the point of maximum thickness), it separates before transitioning to turbulent flow."),
        },
        {
          type: "illustration",
          caption: "Laminar separation bubble on a blade section",
          svg: `<svg viewBox="0 0 640 140" xmlns="http://www.w3.org/2000/svg">
            <line x1="30" y1="112" x2="610" y2="112" stroke="var(--lv-hairline)" stroke-width="1.5"/>
            <path d="M30 108 Q 160 96 232 100" fill="none" stroke="var(--lv-force-blue)" stroke-width="2.5"/>
            <path d="M232 100 Q 300 80 378 100" fill="none" stroke="var(--lv-amber-bright)" stroke-width="2.5" stroke-dasharray="2 3"/>
            <ellipse cx="305" cy="98" rx="76" ry="15" fill="color-mix(in srgb, var(--lv-amber) 16%, transparent)" stroke="var(--lv-amber)" stroke-width="1.5" stroke-dasharray="3 2"/>
            <path d="M378 100 Q 470 120 610 108" fill="none" stroke="var(--lv-force-red)" stroke-width="2.5"/>
            <text x="30" y="52" fill="var(--lv-force-blue)" font-family="JetBrains Mono" font-size="10">Laminar BL</text>
            <text x="478" y="52" fill="var(--lv-force-red)" font-family="JetBrains Mono" font-size="10">Turbulent reattachment</text>
            <text x="255" y="72" fill="var(--lv-amber-bright)" font-family="JetBrains Mono" font-size="10">Separation bubble</text>
            <text x="30" y="130" fill="var(--lv-dim)" font-family="JetBrains Mono" font-size="10">Blade section, leading edge</text>
            <text x="480" y="130" fill="var(--lv-dim)" font-family="JetBrains Mono" font-size="10">Trailing edge</text>
          </svg>`,
        },
        {
          type: "markList",
          items: [
            { icon: "⚠️", tone: "warn", text: richText("Adds significant pressure drag") },
            { icon: "⚠️", tone: "warn", text: richText("Reduces effective camber") },
            { icon: "⚠️", tone: "warn", text: richText("Can burst entirely at higher angles of attack → full stall") },
            { icon: "⚠️", tone: "warn", text: richText("Is highly sensitive to surface finish and freestream turbulence") },
          ],
        },
      ],
    },

    // Chapter 3 — 1.2 L/D degradation curve + 1.3 non-linear viscous losses
    {
      id: "ld-degradation",
      eyebrow: "Advanced Aerodynamics Module",
      navTitle: "L/D Degradation",
      readTime: "~2 min",
      blocks: [
        { type: "heading", level: 2, text: "1.2 The L/D Degradation Curve" },
        {
          type: "dataTable",
          columns: ["Reynolds Number", "Approximate Max L/D (Typical Airfoil)"],
          rows: [
            ["1,000,000", "80–120"],
            ["500,000", "60–90"],
            ["100,000", "25–40"],
            ["50,000", "12–22"],
            ["20,000", "5–12"],
            ["10,000", "3–7"],
          ],
        },
        {
          type: "callout",
          variant: "note",
          icon: "📝",
          heading: "Why This Matters for Propellers",
          text: richText("Each blade section operates at a different local Re. The root sections (low Vrel, small chord) operate at especially poor Re, sometimes below 20,000. These sections contribute drag more than thrust."),
        },
        { type: "heading", level: 3, text: "1.3 Viscous Losses Scale Non-Linearly" },
        {
          type: "paragraph",
          text: richText("The profile drag coefficient CD,p for a blade section scales approximately as:"),
        },
        { type: "formula", expression: "CD,p ≈ k × Re⁻ⁿ", size: "sm" },
        {
          type: "paragraph",
          text: richText("Where n ≈ 0.4–0.5 for laminar-dominated flow. This means:"),
        },
        {
          type: "markList",
          items: [
            { icon: "▸", text: richText("Halving the propeller size (at constant tip speed) → Re drops by ~50% → CD increases by ~30–40%") },
            { icon: "▸", text: richText("The torque required to overcome profile drag grows disproportionately") },
            { icon: "▸", text: richText("Propulsive efficiency η = T × V∞ / Pshaft can drop from ~85% (large prop) to ~55–65% (micro prop)") },
          ],
        },
      ],
    },

    // Chapter 4 — 1.4 rotational speed compensation and its limits
    {
      id: "rpm-limits",
      eyebrow: "Advanced Aerodynamics Module",
      navTitle: "RPM Limits",
      readTime: "~1 min",
      blocks: [
        { type: "heading", level: 2, text: "1.4 Rotational Speed Compensation and Its Limits" },
        {
          type: "paragraph",
          text: richText("Designers often respond by spinning propellers faster to recover thrust. This introduces:"),
        },
        {
          type: "markList",
          items: [
            { icon: "⚠️", tone: "warn", text: richText("Higher tip Mach numbers → compressibility effects above Ma ≈ 0.5–0.6") },
            { icon: "⚠️", tone: "warn", text: richText("Increased noise (scales roughly as tip speed⁵)") },
            { icon: "⚠️", tone: "warn", text: richText("Higher motor temperatures and efficiency losses") },
            { icon: "⚠️", tone: "warn", text: richText("Structural stress scaling as ω²") },
          ],
        },
        {
          type: "callout",
          variant: "problem",
          icon: "📋",
          heading: "Practical Ceiling",
          text: richText("There is a practical ceiling to RPM compensation, typically around 10,000–15,000 RPM for 5-inch props in consumer drones."),
        },
      ],
    },

    // Chapter 5 — 2.1 + 2.2 (as far as the source content goes)
    {
      id: "blade-element-theory",
      eyebrow: "Advanced Aerodynamics Module",
      navTitle: "Blade Element Theory",
      readTime: "~1 min",
      blocks: [
        { type: "heading", level: 2, text: "2. Simplified Blade Element Theory for Drone Propellers" },
        { type: "heading", level: 3, text: "2.1 Theory Overview" },
        {
          type: "paragraph",
          text: richText("Blade Element Theory (BET) divides a propeller blade into infinitesimally thin strips (elements) along the span and treats each element as a 2D airfoil operating in a local flow environment. Integrated over the span, these elements yield total thrust and torque."),
        },
        {
          type: "illustration",
          caption: "Blade span discretization into radial strips",
          svg: `<svg viewBox="0 0 640 100" xmlns="http://www.w3.org/2000/svg">
            <line x1="40" y1="50" x2="600" y2="50" stroke="var(--lv-hairline)" stroke-width="2"/>
            <circle cx="40" cy="50" r="6" fill="var(--lv-amber)"/>
            <circle cx="600" cy="50" r="6" fill="var(--lv-force-blue)"/>
            <text x="20" y="26" fill="var(--lv-amber)" font-family="JetBrains Mono" font-size="10">HUB</text>
            <text x="576" y="26" fill="var(--lv-force-blue)" font-family="JetBrains Mono" font-size="10">TIP</text>
            <g stroke="var(--lv-dim)" stroke-width="1">
              <line x1="152" y1="40" x2="152" y2="60"/>
              <line x1="264" y1="40" x2="264" y2="60"/>
              <line x1="376" y1="40" x2="376" y2="60"/>
              <line x1="488" y1="40" x2="488" y2="60"/>
            </g>
            <text x="96" y="80" fill="var(--lv-body)" font-family="JetBrains Mono" font-size="9" text-anchor="middle">dr₁ (r₁)</text>
            <text x="208" y="80" fill="var(--lv-body)" font-family="JetBrains Mono" font-size="9" text-anchor="middle">dr₂ (r₂)</text>
            <text x="320" y="80" fill="var(--lv-body)" font-family="JetBrains Mono" font-size="9" text-anchor="middle">dr₃ (r₃)</text>
            <text x="432" y="80" fill="var(--lv-body)" font-family="JetBrains Mono" font-size="9" text-anchor="middle">dr₄ (r₄)</text>
            <text x="544" y="80" fill="var(--lv-body)" font-family="JetBrains Mono" font-size="9" text-anchor="middle">dr₅ (r₅)</text>
          </svg>`,
        },
        { type: "heading", level: 3, text: "2.2 Velocity Components at a Blade Section" },
        {
          type: "paragraph",
          text: richText("At radius r, the blade section sees a combined relative velocity made up of a tangential (rotational) component and an axial (through-the-disk) component:"),
        },
        { type: "formula", expression: "Vrel = √(VT² + VA²)", size: "md" },
        { type: "formula", expression: "VT = ω × r", size: "sm" },
        { type: "formula", expression: "VA = V∞ + vi", size: "sm" },
        {
          type: "dataTable",
          columns: ["Symbol", "Parameter"],
          rows: [
            ["ω", "Angular velocity of the propeller (rad/s)"],
            ["r", "Local radius of the blade element (m)"],
            ["V∞", "Freestream / climb velocity (m/s) — zero in pure hover"],
            ["vi", "Induced velocity through the disk from momentum theory (m/s)"],
          ],
        },
        { type: "heading", level: 3, text: "2.3 Local Inflow Angle and Blade Forces" },
        {
          type: "paragraph",
          text: richText("The local inflow angle φ and the blade's geometric pitch angle θ at that radius together set the effective angle of attack the airfoil section actually sees:"),
        },
        { type: "formula", expression: "φ = arctan(VA / VT)", size: "sm" },
        { type: "formula", expression: "α = θ(r) − φ", size: "sm" },
        {
          type: "paragraph",
          text: richText("Once α is known, standard 2D airfoil lift and drag coefficients (CL, CD) — themselves Re-dependent, per the L/D curve earlier in this lesson — give the incremental thrust and torque contributed by that blade element:"),
        },
        { type: "formula", expression: "dT = ½ρVrel²·c·(CL cosφ − CD sinφ)·B·dr", size: "sm" },
        { type: "formula", expression: "dQ = ½ρVrel²·c·(CL sinφ + CD cosφ)·r·B·dr", size: "sm" },
        {
          type: "paragraph",
          text: richText("B is the number of blades. Integrating dT and dQ from root to tip across every element gives the propeller's total thrust and torque — this integration is the essence of Blade Element Theory."),
        },
        {
          type: "callout",
          variant: "key",
          icon: "⚡",
          heading: "Key Insight",
          text: richText("Because CL and CD in these equations are themselves strong functions of local Re, a propeller's overall efficiency is really the sum of many small, Re-dependent 2D airfoil performances stacked along the span — exactly why low-Re sections near the root can drag down the whole blade's efficiency."),
        },
      ],
    },

    // Chapter 6 — section 3 from the source TOC: pitch-to-diameter ratio selection
    {
      id: "pitch-selection",
      eyebrow: "Advanced Aerodynamics Module",
      navTitle: "Pitch Selection",
      readTime: "~2 min",
      blocks: [
        { type: "heading", level: 2, text: "3. Pitch-to-Diameter Ratio Selection" },
        {
          type: "paragraph",
          text: richText("Pitch-to-diameter ratio (P/D) describes a propeller's geometric pitch — the theoretical forward distance covered in one revolution assuming zero slip — relative to its diameter. It's one of the most consequential design choices for a small UAV propeller."),
        },
        { type: "formula", expression: "P/D = Pitch / Diameter", size: "sm" },
        { type: "heading", level: 3, text: "The Advance Ratio" },
        {
          type: "paragraph",
          text: richText("How \"loaded\" a propeller is at any given flight condition is captured by the advance ratio J:"),
        },
        { type: "formula", expression: "J = V∞ / (n × D)", size: "sm" },
        {
          type: "paragraph",
          text: richText("where n is rotational speed in revolutions per second and D is diameter. Low J (high RPM relative to forward speed) is the hover/climb regime; high J is the cruise regime."),
        },
        {
          type: "row",
          blocks: [
            {
              type: "specList",
              variant: "blue",
              heading: "Low P/D (≈ 0.3–0.5)",
              items: [
                "High static thrust — well suited to hover and vertical climb",
                "Lower top speed and worse efficiency at high advance ratio",
                "The standard choice for multirotor propellers",
              ],
            },
            {
              type: "specList",
              variant: "red",
              heading: "High P/D (≈ 0.7–1.2+)",
              items: [
                "Better efficiency at high advance ratio (fast forward flight)",
                "Poor static thrust — inefficient, sometimes near-stalled, at low airspeed",
                "Prone to blade-section stall if RPM is pushed up without enough forward speed",
              ],
            },
          ],
        },
        {
          type: "callout",
          variant: "tip",
          icon: "💡",
          heading: "Why Low-Re Propellers Skew Toward Lower P/D",
          text: richText("At small scale, thin, high-pitch blades push local sections into even lower Re at a given RPM. Wider-chord, lower-pitch blades keep local Re higher per section and spread the load — one reason small multirotor propellers trend toward lower P/D and larger chord than a naive scale-down of a full-size design would suggest."),
        },
      ],
    },

    // Chapter 7 — section 4 from the source TOC: tip losses & Reynolds effects
    {
      id: "tip-losses",
      eyebrow: "Advanced Aerodynamics Module",
      navTitle: "Tip Losses",
      readTime: "~2 min",
      blocks: [
        { type: "heading", level: 2, text: "4. Tip Losses & Reynolds Effects on Blade Sections" },
        {
          type: "paragraph",
          text: richText("Blade Element Theory as derived so far treats each strip as an isolated 2D airfoil, but real blades are finite. Near the tip, high-pressure air below the blade \"leaks\" around to the low-pressure side, reducing the lift that strip can actually generate. This is corrected with a tip-loss factor, F:"),
        },
        { type: "formula", expression: "F = (2/π) × arccos(exp(−f))", size: "sm" },
        { type: "formula", expression: "f = (B/2) × (1 − r/R) / ((r/R) × sinφ)", size: "sm" },
        {
          type: "dataTable",
          columns: ["Symbol", "Parameter"],
          rows: [
            ["B", "Number of blades"],
            ["R", "Tip radius (m)"],
            ["r", "Local radius (m)"],
            ["φ", "Local inflow angle"],
          ],
        },
        {
          type: "paragraph",
          text: richText("F scales from 1 (no loss) inboard down toward 0 at the very tip, and multiplies the thrust/torque contribution of each element — effectively de-rating the outermost sections."),
        },
        { type: "heading", level: 3, text: "Where Reynolds Effects and Tip Losses Collide" },
        {
          type: "paragraph",
          text: richText("Tangential velocity VT = ωr grows linearly with radius, so tip sections usually see the highest Vrel — and often the highest local Re — of any point on the blade. Root sections see the opposite: low Vrel, small chord, and correspondingly the poorest Re on the entire blade."),
        },
        {
          type: "markList",
          items: [
            { icon: "▸", text: richText("Root sections: low Re, high induced angle, often contribute more drag than thrust — many designs simplify or even omit airfoil shaping near the hub") },
            { icon: "▸", text: richText("Mid-span sections: the primary thrust-producing region, where Re is high enough for a well-chosen airfoil to behave as designed") },
            { icon: "▸", text: richText("Tip sections: highest Re on the blade, but tip losses (F < 1) cut into how much of that potential is actually usable") },
          ],
        },
        {
          type: "callout",
          variant: "key",
          icon: "⚡",
          heading: "Key Takeaway",
          text: richText("Efficient small-propeller design isn't about picking one \"best\" airfoil for the whole blade — it's about managing a Reynolds gradient from root to tip, and accepting that a meaningful fraction of the blade near the root will never be a strong thrust contributor no matter what section is used there."),
        },
      ],
    },

    // Chapter 8 — section 5 from the source TOC: worked example
    {
      id: "worked-example",
      eyebrow: "Advanced Aerodynamics Module",
      navTitle: "Worked Example",
      readTime: "~2 min",
      blocks: [
        { type: "heading", level: 2, text: "5. Worked Example: Two Propeller Configurations for a 250 g Drone" },
        {
          type: "callout",
          variant: "problem",
          icon: "📋",
          heading: "Problem Setup",
          text: richText("A 250 g quadcopter needs roughly 0.65 N of thrust per motor for a stable hover with margin. Compare a 5×4.5 propeller (127 mm diameter, 114 mm pitch, P/D ≈ 0.90) against a 6×3.0 propeller (152 mm diameter, 76 mm pitch, P/D ≈ 0.50) on the same airframe."),
        },
        {
          type: "callout",
          variant: "note",
          icon: "📝",
          heading: "Illustrative Assumptions",
          text: richText("The chord, RPM, and resulting Re figures below are representative estimates chosen to illustrate the trade-off — not a specific product's measured datasheet. Assumed: ~10 mm tip chord, ~6 mm root chord at r ≈ 20 mm, sea-level air (ρ = 1.225 kg/m³, μ = 1.81×10⁻⁵ Pa·s)."),
        },
        {
          type: "dataTable",
          columns: ["Parameter", "5×4.5 (High P/D)", "6×3.0 (Low P/D)"],
          rows: [
            ["Diameter", "127 mm", "152 mm"],
            ["Pitch", "114 mm", "76 mm"],
            ["P/D", "0.90", "0.50"],
            ["Est. hover RPM (~0.65 N thrust)", "≈ 9,000", "≈ 6,500"],
            ["Tip speed (πDN/60)", "≈ 60 m/s", "≈ 52 m/s"],
            ["Tip Re", "≈ 41,000", "≈ 35,000"],
            ["Root Re (r ≈ 20 mm)", "≈ 7,700", "≈ 5,500"],
          ],
        },
        {
          type: "paragraph",
          text: richText("The larger, lower-pitch 6×3.0 needs meaningfully lower RPM to produce the same thrust — a larger disk area means lower disk loading. That lower RPM keeps tip speed (and the noise/compressibility concerns from earlier in this lesson) down, but it also leaves both tip and root Re lower than the 5×4.5's, since Re scales with rotational speed at a fixed radius."),
        },
        {
          type: "callout",
          variant: "key",
          icon: "⚡",
          heading: "Takeaway",
          text: richText("Neither configuration is universally \"better.\" The 6×3.0's lower disk loading and quieter operation favor a hover-focused or efficiency-focused build; the 5×4.5's higher P/D and RPM headroom favor a build that needs punch and high-speed forward flight, at the cost of a noisier, less efficient hover. Both still pay the same fundamental low-Re taxes this lesson covers — the root sections on either propeller sit well inside the range where the L/D curve degrades sharply."),
        },
      ],
    },
  ],
};
