-- Preserve the selected kind even when a reminder has a custom name.
begin;
alter table public.documents add column if not exists document_kind text;
alter table public.documents drop constraint if exists documents_personal_term;
alter table public.documents add constraint documents_personal_term
 check ((entry_type='other' and category in ('Personal','Vehicles') and issued_on is null)
   or (entry_type='document' and event_time is null));
alter table public.documents drop constraint if exists documents_auto_kind;
alter table public.documents add constraint documents_auto_kind
 check (document_kind is null or
   (category='Vehicles' and document_kind in ('REV','KIT','PARK','AUTO_OTHER')
    and ((document_kind='AUTO_OTHER' and entry_type='other') or
         (document_kind<>'AUTO_OTHER' and entry_type='document'))));
commit;
