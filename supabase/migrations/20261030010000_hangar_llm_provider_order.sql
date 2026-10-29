-- The Hangar -- which LLM provider every agent calls first, and which it
-- falls back to. One row (id = 'default'), managed from Mission Hub ->
-- Configurations -> AI Providers; read by llmGateway.ts on every call (with
-- a short in-memory cache), so a change applies without a redeploy.
--
-- provider_order: 1 or 2 of 'anthropic' | 'groq', no repeats. A provider
-- in the list is still skipped at call time if its API key isn't set.
-- If this table is missing or unreadable, the gateway uses the default
-- order below (Anthropic first, Groq fallback) -- same as before.
--
-- Not auto-applied to the live project -- run manually in the Supabase SQL
-- editor, same as every other Hangar_* migration in this repo.

create table public."Hangar_LlmSettings" (
  id text primary key default 'default' check (id = 'default'),
  provider_order text[] not null default array['anthropic','groq'],
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  constraint hangar_llm_settings_order_valid check (
    array_length(provider_order, 1) between 1 and 2
    and provider_order <@ array['anthropic','groq']
    and (array_length(provider_order, 1) = 1 or provider_order[1] <> provider_order[2])
  )
);

alter table public."Hangar_LlmSettings" enable row level security;

-- Signed-in users may read it (the pages' AI badge reflects it); writes go
-- through the server with the service role after a Mission Hub admin check.
create policy "Signed-in users read llm settings" on public."Hangar_LlmSettings"
  for select to authenticated using (true);

create trigger set_hangar_llm_settings_updated_at
  before update on public."Hangar_LlmSettings"
  for each row execute function public.set_hangar_updated_at();

insert into public."Hangar_LlmSettings" (id, provider_order) values ('default', array['anthropic','groq']);
