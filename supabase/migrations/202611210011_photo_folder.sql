-- Standalone photos use the same private storage and profile ownership as documents.
begin;
alter table public.vault_documents drop constraint if exists vault_documents_category_check;
alter table public.vault_documents add constraint vault_documents_category_check check(category in ('Vehicles','Personal','Photos'));
commit;
