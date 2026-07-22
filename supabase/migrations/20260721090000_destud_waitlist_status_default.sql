-- destud_waitlist.status keeps arriving empty on new signups because
-- migration 20260721060000's "ADD COLUMN IF NOT EXISTS status ..." was a
-- no-op: the column already existed on this table (nullable, no default)
-- before that migration ran, so IF NOT EXISTS silently skipped applying the
-- default/not-null. Backfill existing empty rows, then set the default for
-- real.
update public.destud_waitlist set status = 'new' where status is null or status = '';
alter table public.destud_waitlist alter column status set default 'new';
alter table public.destud_waitlist alter column status set not null;
