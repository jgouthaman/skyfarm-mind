-- Root cause of "invalid input syntax for type uuid: null" on status
-- updates: destud_waitlist's id column (as created independently, outside
-- this repo's migrations) has no default and is nullable, so every row
-- inserted via the design-studio popup (which never sets id) ends up with
-- id = NULL. The frontend then does .eq("id", null), which PostgREST casts
-- as 'null'::uuid and rejects. Backfill existing NULL ids, then make id a
-- proper auto-generating, non-null primary key so this can't recur.
update public.destud_waitlist set id = gen_random_uuid() where id is null;

alter table public.destud_waitlist alter column id set default gen_random_uuid();
alter table public.destud_waitlist alter column id set not null;

do $$ begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public' and table_name = 'destud_waitlist' and constraint_type = 'PRIMARY KEY'
  ) then
    alter table public.destud_waitlist add primary key (id);
  end if;
end $$;
