-- Bernoulli Agent (Bay 14) -- the check registry. Which checks run for each
-- calling bay, their type and hard-gate flag, managed from Mission Hub ->
-- Agents -> Bernoulli instead of being fixed in code.
--
-- Built-in checks (builtin = true) map to code in bernoulliChecks.ts by
-- rule_id: admins can enable/disable them and change hard_gate, but not
-- delete them. Custom checks (builtin = false) are TorqWings AI checks
-- defined by an `instruction`; Bernoulli runs them generically against the
-- calling bay's output.
--
-- If this table is missing or unreadable, bernoulliRules.ts falls back to
-- the same built-in defaults seeded below, so reviews keep working.
--
-- Not auto-applied to the live project -- run manually in the Supabase SQL
-- editor, same as every other Hangar_* migration in this repo.

create table public."Hangar_BernoulliRules" (
  rule_id text primary key,
  bay text not null,
  name text not null,
  description text not null default '',
  kind text not null check (kind in ('rule','llm')),
  hard_gate boolean not null default false,
  enabled boolean not null default true,
  builtin boolean not null default false,
  instruction text,
  sort_order int not null default 100,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- custom checks are always TorqWings AI checks with an instruction
  constraint hangar_bernoulli_rules_custom_shape
    check (builtin or (kind = 'llm' and instruction is not null and length(btrim(instruction)) > 0))
);

create index hangar_bernoulli_rules_bay_idx on public."Hangar_BernoulliRules"(bay, sort_order);

alter table public."Hangar_BernoulliRules" enable row level security;

-- Any signed-in user can read the registry (the Bernoulli page shows it).
-- Writes go through the server with the service role, after a Mission Hub
-- admin check -- no client write policy.
create policy "Signed-in users read bernoulli rules" on public."Hangar_BernoulliRules"
  for select to authenticated using (true);

create trigger set_hangar_bernoulli_rules_updated_at
  before update on public."Hangar_BernoulliRules"
  for each row execute function public.set_hangar_updated_at();

insert into public."Hangar_BernoulliRules" (rule_id, bay, name, description, kind, hard_gate, enabled, builtin, sort_order) values
  ('BERN-M01', 'mission', 'Speed Consistency', 'Range ÷ Endurance implies an average speed -- flagged if implausible for the vehicle class.', 'rule', true,  true, true, 10),
  ('BERN-M02', 'mission', 'Coverage Math', 'For multi-unit/swarm specs: units × per-unit coverage angle should reach 360°.', 'rule', false, true, true, 20),
  ('BERN-M03', 'mission', 'Payload/Endurance Plausibility', 'TorqWings AI-judged: is this payload/endurance combination realistic for this vehicle class?', 'llm', false, true, true, 30),
  ('BERN-M04', 'mission', 'KPI/Constraint Provenance', 'Does every constraint cite a source, or are some untagged?', 'rule', false, true, true, 40),
  ('BERN-M05', 'mission', 'Dimensional Consistency', 'Do KPI units actually match what their names imply (e.g. "Range" isn''t given in kg)?', 'rule', true,  true, true, 50),
  ('BERN-M06', 'mission', 'Energy/Power Budget Plausibility', 'TorqWings AI-judged, grounded in reference ranges: could a battery/fuel load that fits this vehicle class actually deliver this payload+endurance?', 'llm', false, true, true, 60),
  ('BERN-C01', 'concept', 'Vehicle-Class Consistency', 'Do the concepts stay within the vehicle class the mission spec calls for?', 'rule', false, true, true, 10),
  ('BERN-C02', 'concept', 'Speed Feasibility per Concept', 'Can each concept''s vehicle class fly the average speed the mission''s range ÷ endurance needs?', 'rule', true,  true, true, 20),
  ('BERN-C03', 'concept', 'Ranking Coherence', 'Is the ranking consistent with constraint fit, and is any "pass" contradicted by the physics?', 'rule', false, true, true, 30),
  ('BERN-C04', 'concept', 'Physical Feasibility per Concept', 'TorqWings AI-judged, grounded in reference ranges: can each concept physically carry the payload for the required endurance?', 'llm', false, true, true, 40);
