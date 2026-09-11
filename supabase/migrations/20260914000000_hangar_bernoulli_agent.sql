-- Bernoulli Agent (Bay 14) schema -- Mission Agent (B01) spec review call
-- point only, per "Ask Bernoulli — Mission Spec Review Implementation
-- Spec" §5. Mirrors Hangar_Documentations / Hangar_Documentation_specs /
-- Hangar_Documentation_runs shape and RLS pattern field-for-field
-- (20260913000000_hangar_documentation_agent.sql), swapping in this bay's
-- own review schema.
--
-- Scoped to the concrete case: mission_id is a direct foreign key to
-- Hangar_missions (not the generic (caller_bay, caller_run_id) shape the
-- parent cross-cutting spec doc suggests for when B02/B03/B09/B12
-- integrations exist) -- simplify now, generalize later if/when those are
-- built.
--
-- Not auto-applied to the live project -- run manually in the Supabase SQL
-- editor, same as every other Hangar_* migration in this repo.

create table public."Hangar_BernoulliReviews" (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  mission_id uuid not null references public."Hangar_missions"(id),
  review_code text not null default upper(substr(replace(gen_random_uuid()::text,'-',''), 1, 20)),
  status text not null default 'draft' check (status in ('draft','processing','spec_ready','error')),
  verdict text check (verdict in ('PASS','WARN','FAIL')),
  confidence_score numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public."Hangar_BernoulliReview_specs" (
  id uuid primary key default gen_random_uuid(),
  bernoulli_review_id uuid not null references public."Hangar_BernoulliReviews"(id),
  version int not null,
  verdict text not null check (verdict in ('PASS','WARN','FAIL')),
  checks jsonb not null default '[]'::jsonb,
  confidence_score numeric not null,
  created_at timestamptz not null default now(),
  unique (bernoulli_review_id, version)
);

create table public."Hangar_BernoulliReview_runs" (
  id uuid primary key default gen_random_uuid(),
  bernoulli_review_id uuid not null references public."Hangar_BernoulliReviews"(id),
  agent_id text not null default 'BERNOULLI_AGENT',
  stage text not null check (stage in ('review')),
  input_snapshot jsonb,
  output_snapshot jsonb,
  status text not null check (status in ('success','error')),
  error_message text,
  duration_ms int,
  created_at timestamptz not null default now()
);

create or replace function public.get_next_bernoulli_review_spec_version(p_bernoulli_review_id uuid)
returns int language sql stable
set search_path = ''
as $$
  select coalesce(max(version),0)+1 from public."Hangar_BernoulliReview_specs" where bernoulli_review_id = p_bernoulli_review_id;
$$;

alter table public."Hangar_BernoulliReviews" enable row level security;
alter table public."Hangar_BernoulliReview_specs" enable row level security;
alter table public."Hangar_BernoulliReview_runs" enable row level security;

create policy "Users read/write their own bernoulli reviews" on public."Hangar_BernoulliReviews"
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users read/write specs for their own bernoulli reviews" on public."Hangar_BernoulliReview_specs"
  for all using (exists (select 1 from public."Hangar_BernoulliReviews" r where r.id = bernoulli_review_id and r.user_id = auth.uid()));

create policy "Users read/write runs for their own bernoulli reviews" on public."Hangar_BernoulliReview_runs"
  for all using (exists (select 1 from public."Hangar_BernoulliReviews" r where r.id = bernoulli_review_id and r.user_id = auth.uid()));

create trigger set_hangar_bernoulli_reviews_updated_at
  before update on public."Hangar_BernoulliReviews"
  for each row execute function public.set_hangar_updated_at();
