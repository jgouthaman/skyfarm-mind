-- Vehicle Design (Bay 03) -- Save a design produced by the Python Vehicle
-- Design backend on the GCP server (VehicleDesign.py -> Bay3/<concept code>/).
--
-- Saving creates a Hangar_aircraft_designs row (the design ID) linked to its
-- concept (source_concept_id, already there) and now also to its mission
-- (source_mission_id), so the chain Mission -> Concept -> Design is explicit.
-- The full final_aircraft_design.json / .md go on the spec row, which is what
-- Bay 04 (CAD) reads through get_latest_aircraft_design_spec (select *, so the
-- new columns come back with no function change).
--
-- Existing v1 rows keep design_source 'ai_v1' and null for the new columns.
--
-- Not auto-applied to the live project -- run manually in the Supabase SQL
-- editor, same as every other Hangar_* migration. Run it before testing Save.

alter table public."Hangar_aircraft_designs"
  add column source_mission_id uuid references public."Hangar_missions"(id),
  add column source_design_id text,
  add column design_source text not null default 'ai_v1'
    check (design_source in ('ai_v1', 'python_vm'));

-- One saved design per Python design_id per concept (re-saving the same files
-- returns the existing design instead of a duplicate).
create unique index hangar_aircraft_designs_concept_source_design_uidx
  on public."Hangar_aircraft_designs" (source_concept_id, source_design_id)
  where source_design_id is not null;

alter table public."Hangar_aircraft_design_specs"
  add column design_output jsonb,
  add column design_markdown text,
  add column source_location text;
