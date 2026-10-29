-- Bernoulli Agent (Bay 14) -- rule editor and review flow ("Bernoulli: Rule
-- Editor UI and Review Flow", 29 Oct 2026).
--
-- Hangar_BernoulliRules gains:
--   category      -- groups the Mission Hub table
--   max_severity  -- caps a rule's result: a 'WARN' rule can never FAIL a review
--   version       -- bumped on every edit of a custom rule
--   updated_by    -- who last changed the rule
-- Custom rule ids now use an X prefix (BERN-MX01, BERN-CX01, ...) so that
-- BERN-M07..M14 and BERN-C05..C11 stay free for coded checks.
-- Adds the first of those coded checks, BERN-M07 (payload vs MTOW).
--
-- Hangar_BernoulliReviews gains client_run_id + progress, so the Bernoulli
-- page can poll "check 7 of 14" while a review runs.
--
-- Not auto-applied to the live project -- run manually in the Supabase SQL
-- editor, same as every other Hangar_* migration in this repo. Run it before
-- testing the new rule editor locally and before deploying the code.

alter table public."Hangar_BernoulliRules"
  add column category text not null default 'physics'
    check (category in ('physics','regulatory','data_quality','consistency')),
  add column max_severity text not null default 'FAIL'
    check (max_severity in ('FAIL','WARN')),
  add column version int not null default 1,
  add column updated_by uuid references auth.users(id);

update public."Hangar_BernoulliRules" set category = 'physics'      where rule_id in ('BERN-M01','BERN-M03','BERN-M06','BERN-C02','BERN-C04');
update public."Hangar_BernoulliRules" set category = 'consistency'  where rule_id in ('BERN-M02','BERN-C01','BERN-C03');
update public."Hangar_BernoulliRules" set category = 'data_quality' where rule_id in ('BERN-M04','BERN-M05');

insert into public."Hangar_BernoulliRules"
  (rule_id, bay, name, description, kind, hard_gate, enabled, builtin, sort_order, category, max_severity)
values
  ('BERN-M07', 'mission', 'Payload vs MTOW',
   'The payload KPI must fit inside the spec''s maximum takeoff weight constraint -- payload can''t exceed MTOW.',
   'rule', true, true, true, 70, 'physics', 'FAIL');

alter table public."Hangar_BernoulliReviews"
  add column client_run_id uuid,
  add column progress jsonb;

create index hangar_bernoulli_reviews_client_run_idx on public."Hangar_BernoulliReviews"(client_run_id);
