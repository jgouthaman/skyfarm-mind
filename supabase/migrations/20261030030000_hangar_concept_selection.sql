-- Concept Agent (Bay 02) -- the user's chosen concept from a run's ranked
-- candidates. A run ranks 3 concepts; by default the top-ranked one carries
-- forward to Vehicle Design (Bay 03). The user may instead pick any concept
-- with a fit score of 8 or above and save it here, before finalizing.
--
-- NULL means "no explicit choice" -- the rank-1 concept, exactly as before,
-- so every existing concept keeps its current behaviour with no backfill.
-- Stores the concept's name (ranked_concepts[].conceptName), the same key
-- every other part of the pipeline already matches concepts on.
--
-- Not auto-applied to the live project -- run manually in the Supabase SQL
-- editor, same as every other Hangar_* migration in this repo. Run it before
-- testing the selection locally and before deploying the code.

alter table public."Hangar_concepts"
  add column selected_concept_name text;
