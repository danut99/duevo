-- Organize unassigned photos under an existing document without copying the file.
begin;
alter table public.vault_documents add column if not exists document_kind text
 check(document_kind is null or document_kind ~ '^[A-Z][A-Z0-9_]{0,39}$');
grant update(document_id,vault_document_id) on public.document_files to authenticated;
-- Existing RLS and composite foreign keys enforce the owner of both ends.
commit;
