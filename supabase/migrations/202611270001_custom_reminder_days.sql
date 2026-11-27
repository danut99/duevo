-- Custom reminder lead times: any whole number of days from 0 to 365, at most 8 per document.
-- Safe to run more than once. Existing documents already satisfy the wider range.
begin;
alter table public.documents drop constraint if exists documents_reminders_valid;
alter table public.documents add constraint documents_reminders_valid check (
 cardinality(reminder_days) between 1 and 8 and array_ndims(reminder_days)=1
 and array_position(reminder_days,null) is null
 and 0<=all(reminder_days) and 365>=all(reminder_days));
-- days mirrors the largest reminder. Its original inline check only allowed preset values;
-- locate it by column rather than by its generated name.
do $$ declare item record; begin
 for item in select c.conname from pg_constraint c
  where c.conrelid='public.documents'::regclass and c.contype='c'
   and c.conkey=array[(select a.attnum from pg_attribute a where a.attrelid='public.documents'::regclass and a.attname='days')]::smallint[]
 loop execute format('alter table public.documents drop constraint %I',item.conname); end loop;
end $$;
alter table public.documents add constraint documents_days_valid check (days between 1 and 365);
commit;
