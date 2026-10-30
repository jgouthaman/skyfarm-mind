-- Raman (Bay 16): record which AI provider wrote each piece of text, now
-- that Raman follows the Mission Hub AI Providers order (primary first,
-- then secondary) like Bay 01. The UI tags text "via Claude" or "via Groq"
-- from these. Not auto-applied -- run manually in the Supabase SQL editor.

alter table public.raman_noise_checks
  add column if not exists summary_provider text
  check (summary_provider in ('anthropic', 'groq'));

-- Model that decided each Noise Fix step (e.g. claude-opus-5-5,
-- openai/gpt-oss-120b, fallback-planner); a run can switch provider mid-way.
alter table public.raman_agent_steps
  add column if not exists model text;

-- Make PostgREST pick up the new columns now (otherwise inserts fail with
-- "Could not find the ... column in the schema cache" until it reloads).
notify pgrst, 'reload schema';
