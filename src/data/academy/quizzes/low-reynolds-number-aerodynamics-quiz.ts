import type { Quiz } from "@/lib/academy/quiz-schema";

// Paired with lowReynoldsNumberAerodynamicsLesson — one question per chapter,
// in chapter order, so the result screen's "Review: [chapter]" links cover
// every slide in the lesson.
export const lowReynoldsNumberAerodynamicsQuiz: Quiz = {
  id: "low-reynolds-number-aerodynamics-quiz",
  lessonId: "low-reynolds-number-aerodynamics",
  title: "Low Reynolds Number Aerodynamics — Knowledge Check",
  passThreshold: 4,
  questions: [
    {
      id: "q1",
      chapterId: "formula",
      chapterTitle: "The Formula",
      question: "What does the Reynolds number formula Re = ρVL / μ represent?",
      correctOptionId: "a",
      options: [
        { id: "a", text: "The ratio of inertial forces to viscous forces in a fluid flow", reasoning: "Correct — Re is exactly this ratio, which is why it predicts whether inertia or viscosity dominates the flow." },
        { id: "b", text: "The ratio of air density to dynamic viscosity", reasoning: "Not quite — that's just ρ/μ (kinematic viscosity's reciprocal), not the full force ratio Re represents." },
        { id: "c", text: "The total drag force on a wing", reasoning: "Re is dimensionless and doesn't give a force value directly — it's a similarity parameter, not a force." },
        { id: "d", text: "The speed of sound relative to airflow velocity", reasoning: "That's the Mach number, a different dimensionless parameter entirely." },
      ],
    },
    {
      id: "q2",
      chapterId: "intuition",
      chapterTitle: "Physical Intuition",
      question: "Why does a low Reynolds number mean viscous forces matter more?",
      correctOptionId: "a",
      options: [
        { id: "a", text: "At low Re, viscous forces are comparable to or larger than inertial forces, so friction dominates flow behavior", reasoning: "Right — Re is inertial/viscous, so a small Re means the denominator (viscous) is relatively large." },
        { id: "b", text: "Low Re always means the fluid is more dense", reasoning: "Density is only one factor in Re, and a denser fluid alone doesn't determine the regime." },
        { id: "c", text: "Low Re means the wing is moving faster than sound", reasoning: "Speed relative to sound is Mach number, unrelated to Reynolds number directly." },
        { id: "d", text: "Viscosity decreases as Re decreases", reasoning: "Viscosity is a fluid property; it doesn't change with Re — Re changes because of velocity/length/density changes." },
      ],
    },
    {
      id: "q3",
      chapterId: "regime",
      chapterTitle: "The Low-Re Regime",
      question: "Where do small drones typically sit on the Reynolds number spectrum?",
      correctOptionId: "b",
      options: [
        { id: "a", text: "Re < 1, dominated entirely by viscosity like a microorganism", reasoning: "That's far too low — that regime is for microscopic organisms, not drones." },
        { id: "b", text: "Roughly 10,000 to 200,000 — low enough that Laminar Separation Bubbles are common", reasoning: "Correct — this is the band called out in the lesson, and it's exactly where LSBs become a real design concern." },
        { id: "c", text: "10⁷–10⁸, the same as commercial aircraft", reasoning: "That's the full-scale aircraft regime — small drones operate several orders of magnitude below this." },
        { id: "d", text: "Reynolds number doesn't apply to rotorcraft or drones", reasoning: "Re applies to any wing or blade in a fluid flow, drones included." },
      ],
    },
    {
      id: "q4",
      chapterId: "example-problem",
      chapterTitle: "Worked Example: Setup",
      question: "A drone wing has a 250 mm chord and cruises at 10 m/s at sea level. Which values do you need to compute its Reynolds number?",
      correctOptionId: "a",
      options: [
        { id: "a", text: "Air density, velocity, chord length, and dynamic viscosity", reasoning: "Correct — these are exactly ρ, V, L, and μ from Re = ρVL/μ." },
        { id: "b", text: "Only velocity and chord length", reasoning: "That's not enough — without ρ and μ you can't compute a dimensionless ratio of forces." },
        { id: "c", text: "Wing area and total mass", reasoning: "Those matter for lift and weight calculations, but they don't appear in the Reynolds number formula." },
        { id: "d", text: "Altitude and temperature only", reasoning: "These influence ρ and μ indirectly, but you still need the actual density/viscosity/velocity/chord values to compute Re." },
      ],
    },
    {
      id: "q5",
      chapterId: "solve",
      chapterTitle: "Worked Example: Solve",
      question: "Solving Re = (1.225 × 10 × 0.25) / 1.789×10⁻⁵ gives approximately 171,000. What does this tell the designer?",
      correctOptionId: "a",
      options: [
        { id: "a", text: "The wing needs a dedicated low-Re airfoil, not a scaled-down commercial section", reasoning: "Correct — 171,000 lands inside the low-Re drone band, where high-Re airfoil theory breaks down." },
        { id: "b", text: "The wing will behave identically to a full-scale aircraft wing", reasoning: "171,000 is far below aircraft-scale Re (10⁷–10⁸), so high-Re assumptions don't hold here." },
        { id: "c", text: "The flow is definitely turbulent everywhere on the wing", reasoning: "Re alone doesn't guarantee fully turbulent flow — at this regime, transition and laminar separation bubbles are the actual concern." },
        { id: "d", text: "The Reynolds number is too low to be meaningful", reasoning: "171,000 is a completely valid, meaningful Re — it's just in the low-Re drone band rather than the aircraft band." },
      ],
    },
  ],
};
