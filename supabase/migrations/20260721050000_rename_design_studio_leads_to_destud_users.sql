-- Renaming only: RLS policies, indexes, grants, and the sequence/PK all stay
-- attached to the table by OID, so a plain RENAME is sufficient and keeps
-- existing data/security intact. Constraint names (e.g.
-- design_studio_leads_status_check) keep their old literal names — cosmetic
-- only, not worth a follow-up migration.
ALTER TABLE public.design_studio_leads RENAME TO destud_users;
