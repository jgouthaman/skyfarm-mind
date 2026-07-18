-- ============================================================
-- TorqWings Academy: courses -> academy_courses + waitlist
-- Run this whole block in the Supabase SQL Editor.
-- ============================================================

begin;

-- 1. Rename table (modules.course_id FK follows automatically)
alter table public.courses rename to academy_courses;

-- Rename the pre-existing public-read policy so its name matches the new table
-- (actual deployed name was "Public can read courses", not the "courses_public_read"
-- name from the original migration file — renamed here for consistency)
alter policy "Public can read courses" on public.academy_courses rename to "academy_courses_public_read";

-- 2. New columns
-- outcome / order_index requested directly.
-- prerequisite / modules added so the live Academy page can render the
-- prerequisite line and module chips it previously got from static data.
alter table public.academy_courses
  add column if not exists outcome text,
  add column if not exists order_index integer,
  add column if not exists prerequisite text,
  add column if not exists modules text[];

-- 3. Clear dev seed data
-- NOTE: cascades to public.modules / public.lessons rows tied to the
-- existing 'drone-design-fundamentals' seed course (FK ... on delete cascade).
delete from public.academy_courses;

-- 4. Insert the 5 Academy courses
insert into public.academy_courses
  (slug, title, description, level, price, hours, project_count, vertical, status, outcome, order_index, prerequisite, modules)
values
  ('applied-aerospace',
   'Applied Aerospace: From Classical Theory to Autonomous Platforms',
   'Bridging classical aerospace theory to small-scale, electric, autonomous platform constraints.',
   'Foundation', 999, 8, 5, null, 'coming_soon',
   'Can translate classical aerospace principles into small-scale/electric platform design, identifying where standard aerospace assumptions break down at this scale.',
   1, null,
   array['Low Reynolds Number Aerodynamics', 'Miniaturized Structural Design', 'Electric Propulsion Systems', 'Electric Energy Systems & Endurance Modeling', 'Applied Control for Small Autonomous Platforms']),
  ('autonomous-platform-systems-engineering',
   'Autonomous Platform Systems Engineering',
   'Systems integration using TorqWings Design Studio. Applied lab: choose the TQ Drone (3-motor, free flight/aerial photography) or Sagush UAV (fixed-wing) project track.',
   'Intermediate', 1499, 12, 6, null, 'coming_soon',
   'One complete, simulation-validated, build-ready blueprint on your chosen track (TQ Drone or Sagush UAV).',
   2, 'Course 1',
   array['Avionics / Sensor Fusion', 'Payload Integration', 'Comms / Telemetry', 'Design Studio Applied Lab', 'Simulation & Validation']),
  ('ai-autonomy-aerial-intelligence',
   'AI & Autonomy for Aerial Intelligence',
   'The AI and autonomy layer — the reasoning behind TorqWings'' own Intelligence Engine.',
   'Intermediate/Advanced', 2499, 10, 4, null, 'coming_soon',
   'Can interpret and justify Intelligence Engine recommendations and confidence scores; classify autonomy and regulatory status.',
   3, 'Course 2',
   array['Autonomy Fundamentals', 'Computer Vision', 'Intelligence Engine Internals', 'Data-Driven Design', 'Regulatory / Ethics']),
  ('vertical-specialization',
   'Vertical Specialization',
   'Choose your track — GuardSky (surveillance mission design & payload principles) or AgriSky (agricultural platform design principles). The Proven Designs module studied is specific to your chosen track.',
   'Advanced', 3499, 12, 4, null, 'coming_soon',
   'One documented platform design meeting the chosen vertical''s requirements, built from a studied proven design as its base.',
   4, 'Courses 1–3',
   array['Design Principles', 'Proven Designs']),
  ('capstone-aerial-intelligence-hackathon',
   'Capstone: Aerial Intelligence Hackathon',
   'Bring your own real-world problem statement. Get full, unguided access to TorqWings Design Studio and deliver two distinct design patterns (e.g. TQ Drone vs Sagush UAV) with a comparative justification.',
   'Expert', 4499, 12, 2, null, 'coming_soon',
   'A self-authored problem statement, two simulation-validated design patterns, and a defensible recommendation — presented at Hackathon Day. Fly the winning pattern''s platform to earn certification.',
   5, 'Courses 1–4',
   array['Problem Statement Definition', 'Design Studio Full-Access Build', 'Two-Pattern Delivery', 'Hackathon Day Pitch & Certification']);

-- 5. Waitlist table
create table if not exists public.academy_waitlist (
  id           uuid primary key default gen_random_uuid(),
  course_id    uuid references public.academy_courses(id) on delete cascade,
  email        text not null,
  name         text,
  created_at   timestamptz default now(),
  notified_at  timestamptz,
  status       text default 'pending'  -- pending -> notified -> converted
);

-- 6. RLS: academy_waitlist — insert-only for anon/authenticated, no reads
alter table public.academy_waitlist enable row level security;

create policy "academy_waitlist_insert" on public.academy_waitlist
  for insert
  to anon, authenticated
  with check (true);

-- Deliberately no select/update/delete policy for anon/authenticated:
-- the lead list is readable only via the service-role key (bypasses RLS),
-- e.g. from a mission-hub admin view using supabaseAdmin.

-- 7. RLS: academy_courses — public catalog stays world-readable
alter table public.academy_courses enable row level security;
-- academy_courses_public_read (renamed in step 1) already grants public SELECT.

commit;

-- ── Verification — run after the block above to confirm RLS state ─────────
select relname as table_name, relrowsecurity as rls_enabled
from pg_class
where relname in ('academy_courses', 'academy_waitlist');

select schemaname, tablename, policyname, cmd, roles
from pg_policies
where tablename in ('academy_courses', 'academy_waitlist')
order by tablename, cmd;
