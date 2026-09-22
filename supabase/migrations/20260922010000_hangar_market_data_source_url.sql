-- Market-data catalog: an optional link per source.
--
-- A catalog row can now carry a URL. When a mission selects that row, the
-- server reads the page (missionAgent: marketDataFetch.ts) and gives its text to
-- the model as background context. The link is set by whoever curates the
-- catalog (service role / SQL editor -- there is no user-write policy on this
-- table), so users only ever pick a row; they never supply an address, which is
-- what keeps a server-side fetch safe.
--
-- data_source stays what it was: a human-readable label ("DGCA Digital Sky
-- registry"). source_url is the address to read.
--
-- HTTPS only, and no whitespace, enforced here as well as in the fetcher.
-- Nullable: a row with no link works exactly as before (name + description only).
--
-- DO NOT put a secret in a link (an API key, a signed or token URL). The catalog
-- is publicly readable by design (policy public_select_hangar_market_data_catalog
-- is `using (true)`), so anyone with the site's public API key can read every
-- link in it. Use links to public pages or data files only.
--
-- Idempotent; safe to run twice. Not auto-applied to the live project -- run
-- manually in the Supabase SQL editor, same as every other Hangar_* migration.

alter table public."Hangar_market_data_catalog"
  add column if not exists source_url text;

alter table public."Hangar_market_data_catalog"
  drop constraint if exists "Hangar_market_data_catalog_source_url_https_check";

alter table public."Hangar_market_data_catalog"
  add constraint "Hangar_market_data_catalog_source_url_https_check"
  check (source_url is null or source_url ~* '^https://[^\s]+$');
