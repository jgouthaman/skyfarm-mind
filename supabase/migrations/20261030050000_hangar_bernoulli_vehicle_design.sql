-- Bernoulli Agent (Bay 14) -- review Vehicle Design (Bay 03) output.
--
-- A vehicle design review checks the concept's current Vehicle Design files
-- (final_aircraft_design.json on the GCP server, Bay3/<concept code>/) against
-- the concept's source mission. Like a concept review it carries concept_id
-- (and mission_id); design_ref records which backend design_id it reviewed,
-- so a report can say when the files have changed since.
--
-- Saving a design (Bay 03 Save) records the latest review of that design_id
-- on the design: bernoulli_review_id + bernoulli_verdict.
--
-- Seeds the built-in checks BERN-V01..V09. Custom rules for this bay get
-- BERN-VX01, BERN-VX02, ...
--
-- Run after 20261030040000_hangar_vehicle_design_save.sql. Not auto-applied
-- -- run manually in the Supabase SQL editor before testing Bernoulli on Bay 03.

alter table public."Hangar_BernoulliReviews"
  drop constraint if exists "Hangar_BernoulliReviews_source_bay_check";
alter table public."Hangar_BernoulliReviews"
  add constraint "Hangar_BernoulliReviews_source_bay_check"
    check (source_bay in ('mission', 'concept', 'vehicle_design'));

alter table public."Hangar_BernoulliReviews"
  drop constraint if exists hangar_bernoulli_reviews_concept_matches_source;
alter table public."Hangar_BernoulliReviews"
  add constraint hangar_bernoulli_reviews_concept_matches_source
    check ((source_bay in ('concept', 'vehicle_design')) = (concept_id is not null));

alter table public."Hangar_BernoulliReviews"
  add column design_ref text;

alter table public."Hangar_aircraft_designs"
  add column bernoulli_review_id uuid references public."Hangar_BernoulliReviews"(id),
  add column bernoulli_verdict text check (bernoulli_verdict in ('PASS', 'WARN', 'FAIL'));

insert into public."Hangar_BernoulliRules"
  (rule_id, bay, name, description, kind, hard_gate, enabled, builtin, sort_order, category, max_severity)
values
  ('BERN-V01', 'vehicle_design', 'Mass Closure',
   'The component masses must add up to the stated MTOW, and the battery mass must agree everywhere it appears.',
   'rule', true, true, true, 10, 'physics', 'FAIL'),
  ('BERN-V02', 'vehicle_design', 'Balance Closure',
   'The mass-weighted CG of the components must match the stated CG, with every component inside the airframe.',
   'rule', false, true, true, 20, 'consistency', 'FAIL'),
  ('BERN-V03', 'vehicle_design', 'Stability & Trim',
   'CG inside its allowed range, a positive static margin that matches NP and CG, stable in all axes and trimmable.',
   'rule', true, true, true, 30, 'physics', 'FAIL'),
  ('BERN-V04', 'vehicle_design', 'Lift & Stall Consistency',
   'Stall speed and cruise lift coefficient recomputed from weight, wing area and CL max must match the stated values.',
   'rule', false, true, true, 40, 'physics', 'FAIL'),
  ('BERN-V05', 'vehicle_design', 'Energy Budget',
   'Usable battery energy must cover the mission energy with at least the required reserve, and the budget must add up.',
   'rule', true, true, true, 50, 'physics', 'FAIL'),
  ('BERN-V06', 'vehicle_design', 'Performance Closure',
   'Range must follow from cruise speed x endurance, and endurance from usable energy / cruise power.',
   'rule', false, true, true, 60, 'consistency', 'FAIL'),
  ('BERN-V07', 'vehicle_design', 'Requirements & Limits',
   'The design must meet every mission requirement and constraint: MTOW and span limits, endurance, range and payload.',
   'rule', true, true, true, 70, 'regulatory', 'FAIL'),
  ('BERN-V08', 'vehicle_design', 'Electrical Consistency',
   'Bus voltage must match the battery, and the ESC and battery current ratings must cover the cruise draw with margin.',
   'rule', false, true, true, 80, 'consistency', 'FAIL'),
  ('BERN-V09', 'vehicle_design', 'Engineering Plausibility',
   'TorqWings AI-judged, grounded in reference ranges: are the sizing and the selected motor, propeller, ESC and battery realistic for this mission?',
   'llm', false, true, true, 90, 'physics', 'FAIL');
