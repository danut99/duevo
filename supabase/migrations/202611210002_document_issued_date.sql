-- Issuance date used by the document details and duration shortcuts.
alter table public.documents add column if not exists issued_on date;
