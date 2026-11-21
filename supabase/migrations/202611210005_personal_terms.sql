-- Flexible personal terms share the existing document ownership and reminders.
alter table public.documents
  add column if not exists entry_type text not null default 'document'
    check (entry_type in ('document', 'other')),
  add column if not exists event_time time;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'documents_personal_term' and conrelid = 'public.documents'::regclass) then
    alter table public.documents add constraint documents_personal_term
      check ((entry_type = 'other' and category = 'Personal' and issued_on is null)
        or (entry_type = 'document' and event_time is null));
  end if;
end $$;
