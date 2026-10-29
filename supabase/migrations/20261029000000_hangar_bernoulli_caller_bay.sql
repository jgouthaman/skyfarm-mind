-- Bernoulli Agent (Bay 14) -- record which bay a review was called from, so
-- Bernoulli can review that bay's own output instead of always re-checking
-- the source mission spec. First non-mission caller: Concept Agent (B02).
--
-- mission_id stays required: a concept review still belongs to the concept's
-- source mission (its KPIs are what the concepts are checked against), and
-- keeping it means every existing query and policy keeps working. source_bay
-- defaults to 'mission', so every existing row is correctly labelled as a
-- Bay 01 review with no backfill.
--
-- Not auto-applied to the live project -- run manually in the Supabase SQL
-- editor, same as every other Hangar_* migration in this repo. Must be run
-- BEFORE deploying the code that writes source_bay/concept_id.

alter table public."Hangar_BernoulliReviews"
  add column source_bay text not null default 'mission'
    check (source_bay in ('mission','concept')),
  add column concept_id uuid references public."Hangar_concepts"(id);

alter table public."Hangar_BernoulliReviews"
  add constraint hangar_bernoulli_reviews_concept_matches_source
    check ((source_bay = 'concept') = (concept_id is not null));

create index hangar_bernoulli_reviews_concept_id_idx
  on public."Hangar_BernoulliReviews"(concept_id);
