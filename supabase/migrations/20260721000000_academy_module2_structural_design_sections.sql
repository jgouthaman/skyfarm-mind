-- Module 2 ("Miniaturized Structural Design", id 107b5e44-dc24-498a-994a-ebdd2b8055bf,
-- under course "Applied Aerospace: From Classical Theory to Autonomous Platforms")
-- had zero rows in academy_module_sections. This seeds the same 5 content + 5 quiz +
-- 1 final_test structure Module 1 ("Low Reynolds Number Aerodynamics") already uses.
--
-- The 5 content section titles below must match exactly (case-insensitively) the keys
-- in src/data/academy/lessons/registry.ts's authoredLessonsBySectionTitle map, or the
-- module player will fall back to generating AI content from topic_brief instead of
-- rendering the hand-authored Lesson for that section.
insert into academy_module_sections (module_id, order_index, section_type, title, topic_brief)
values
  (
    '107b5e44-dc24-498a-994a-ebdd2b8055bf', 1, 'content',
    'Why Structures Don''t Scale Down Simply',
    'You are TorqWings Academy''s AI instructor teaching aerospace engineers about Miniaturized Structural Design. Explain why aircraft structures do not scale down simply for this section titled "Why Structures Don''t Scale Down Simply". Cover: the square-cube law and how mass scales with volume while structural cross-sections scale with area, why strength-to-weight and stiffness-to-weight ratios shift at small scale, why a linearly scaled-down full-size structure is under-strength and over-flexible at micro scale, and a worked example comparing a full-size and half-scale wing spar. Use clear headings, bullet points, and a worked numerical example. Write in an engaging technical tone suitable for engineering students. Format in markdown.'
  ),
  (
    '107b5e44-dc24-498a-994a-ebdd2b8055bf', 2, 'quiz',
    'Test Your Knowledge: Structural Scaling',
    'Generate exactly 3 multiple choice questions about structural scaling laws for aerospace engineering students. Cover: applying the square-cube law to mass vs. structural cross-section, identifying why scaled-down structures are under-strength, and reasoning about stiffness-to-weight changes at small scale. Return ONLY a JSON array, no preamble, no markdown fences. Format: [{"question":"...","options":{"a":"...","b":"...","c":"...","d":"..."},"correct":"a","explanation":"..."}]'
  ),
  (
    '107b5e44-dc24-498a-994a-ebdd2b8055bf', 3, 'content',
    'Material Behavior at Small Scale',
    'You are TorqWings Academy''s AI instructor teaching aerospace engineers about Miniaturized Structural Design. Explain material selection and behavior at small scale for this section titled "Material Behavior at Small Scale". Cover: specific strength and specific stiffness of composites (carbon fiber, fiberglass), 3D-printed thermoplastics (PLA, nylon, PETG), foam and balsa construction, impact tolerance and fatigue considerations at low mass, and a comparison table of material properties. Use clear headings, bullet points, and a worked numerical example. Write in an engaging technical tone suitable for engineering students. Format in markdown.'
  ),
  (
    '107b5e44-dc24-498a-994a-ebdd2b8055bf', 4, 'quiz',
    'Test Your Knowledge: Material Behavior',
    'Generate exactly 3 multiple choice questions about material selection for miniaturized aerospace structures. Cover: comparing specific strength/stiffness of common small-UAV materials, impact tolerance trade-offs, and fatigue behavior at small scale. Return ONLY a JSON array, no preamble, no markdown fences. Format: [{"question":"...","options":{"a":"...","b":"...","c":"...","d":"..."},"correct":"a","explanation":"..."}]'
  ),
  (
    '107b5e44-dc24-498a-994a-ebdd2b8055bf', 5, 'content',
    'Structural Member Design: Spars, Skins & Load Paths',
    'You are TorqWings Academy''s AI instructor teaching aerospace engineers about Miniaturized Structural Design. Explain structural member design for this section titled "Structural Member Design: Spars, Skins & Load Paths". Cover: sizing a wing spar for bending and torsional loads, skin/shell load-bearing contribution, sandwich construction (foam-core/composite skins), buckling of thin-walled members, and a worked example sizing a spar for a small UAV wing. Use clear headings, bullet points, and a worked numerical example. Write in an engaging technical tone suitable for engineering students. Format in markdown.'
  ),
  (
    '107b5e44-dc24-498a-994a-ebdd2b8055bf', 6, 'quiz',
    'Test Your Knowledge: Structural Member Design',
    'Generate exactly 3 multiple choice questions about structural member design for small UAV wings. Cover: bending vs. torsional stiffness trade-offs, sandwich construction benefits, and buckling of thin-walled members. Return ONLY a JSON array, no preamble, no markdown fences. Format: [{"question":"...","options":{"a":"...","b":"...","c":"...","d":"..."},"correct":"a","explanation":"..."}]'
  ),
  (
    '107b5e44-dc24-498a-994a-ebdd2b8055bf', 7, 'content',
    'Landing Gear & Impact Structures for Small UAVs',
    'You are TorqWings Academy''s AI instructor teaching aerospace engineers about Miniaturized Structural Design. Explain landing gear and impact structure design for this section titled "Landing Gear & Impact Structures for Small UAVs". Cover: impact energy absorption strategies, crash tolerance and structural redundancy for recoverable vs. expendable platforms, skid vs. wheeled gear trade-offs at small scale, and a worked example estimating impact loads for a hard landing. Use clear headings, bullet points, and a worked numerical example. Write in an engaging technical tone suitable for engineering students. Format in markdown.'
  ),
  (
    '107b5e44-dc24-498a-994a-ebdd2b8055bf', 8, 'quiz',
    'Test Your Knowledge: Landing Gear & Impact',
    'Generate exactly 3 multiple choice questions about landing gear and impact structure design for small UAVs. Cover: impact energy absorption strategies, crash tolerance/redundancy trade-offs, and estimating impact loads. Return ONLY a JSON array, no preamble, no markdown fences. Format: [{"question":"...","options":{"a":"...","b":"...","c":"...","d":"..."},"correct":"a","explanation":"..."}]'
  ),
  (
    '107b5e44-dc24-498a-994a-ebdd2b8055bf', 9, 'content',
    'Design Implications for Miniaturized Airframes',
    'You are TorqWings Academy''s AI instructor teaching aerospace engineers about Miniaturized Structural Design. Explain how structural choices interact with frame-type selection and mass budgets for this section titled "Design Implications for Miniaturized Airframes". Cover: how structural mass fraction affects multirotor vs. fixed-wing vs. VTOL viability, trade-offs between structural margin and payload capacity, and a closing design checklist synthesizing the module. Use clear headings, bullet points, and a worked numerical example. Write in an engaging technical tone suitable for engineering students. Format in markdown.'
  ),
  (
    '107b5e44-dc24-498a-994a-ebdd2b8055bf', 10, 'quiz',
    'Test Your Knowledge: Design Implications',
    'Generate exactly 3 multiple choice questions about structural design implications for miniaturized airframes. Cover: how structural mass fraction affects frame-type viability, and trade-offs between structural margin and payload capacity. Return ONLY a JSON array, no preamble, no markdown fences. Format: [{"question":"...","options":{"a":"...","b":"...","c":"...","d":"..."},"correct":"a","explanation":"..."}]'
  ),
  (
    '107b5e44-dc24-498a-994a-ebdd2b8055bf', 11, 'final_test',
    'Final Assessment: Miniaturized Structural Design',
    'Generate exactly 25 multiple choice questions for a final assessment on Miniaturized Structural Design for aerospace engineering students. Cover all five topics evenly (5 questions each): (1) structural scaling laws and the square-cube law, (2) material behavior and selection at small scale, (3) structural member design (spars, skins, load paths), (4) landing gear and impact structure design, (5) design implications for miniaturized airframes. Questions must vary in difficulty: 8 recall, 12 application, 5 analysis. Return ONLY a JSON array, no preamble, no markdown fences. Format: [{"question":"...","options":{"a":"...","b":"...","c":"...","d":"..."},"correct":"a","explanation":"..."}]'
  );
