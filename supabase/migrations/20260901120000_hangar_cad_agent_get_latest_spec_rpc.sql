-- Adds the get_latest_cad_design_spec RPC deferred in the original Bay 04
-- migration (see 20260831120000_hangar_cad_agent.sql comment: "nothing
-- downstream needs it yet -- Bay 05 doesn't exist"). Bay 05's
-- simDesignPersistence.ts is the consumer this was waiting for.

create or replace function public.get_latest_cad_design_spec(p_cad_design_id uuid)
returns public."Hangar_CADDesign_specs" language sql stable
set search_path = ''
as $$
  select * from public."Hangar_CADDesign_specs"
  where cad_design_id = p_cad_design_id
  order by version desc
  limit 1;
$$;
