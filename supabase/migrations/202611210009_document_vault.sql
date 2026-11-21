-- Private files for existing terms and documents kept without an expiry date.
begin;
create unique index if not exists documents_id_owner on public.documents(id,user_id);
create table if not exists public.vault_documents (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 profile_id uuid not null,
 vehicle_id uuid,
 category text not null check(category in ('Vehicles','Personal')),
 name text not null check(char_length(btrim(name)) between 1 and 120),
 created_at timestamptz not null default now(),
 unique(id,user_id),
 foreign key(profile_id,user_id) references public.wallet_profiles(id,user_id),
 foreign key(vehicle_id,profile_id,user_id) references public.vehicles(id,profile_id,user_id),
 check(vehicle_id is null or category='Vehicles')
);
create index if not exists vault_documents_profile on public.vault_documents(profile_id,created_at);
create table if not exists public.document_files (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 document_id uuid,
 vault_document_id uuid,
 name text not null check(char_length(btrim(name)) between 1 and 255),
 storage_key text not null unique,
 mime_type text check(mime_type in ('application/pdf','image/jpeg','image/png','image/webp')),
 size_bytes bigint check(size_bytes between 1 and 5242880),
 created_at timestamptz not null default now(),
 foreign key(document_id,user_id) references public.documents(id,user_id) on delete cascade,
 foreign key(vault_document_id,user_id) references public.vault_documents(id,user_id) on delete cascade,
 check(num_nonnulls(document_id,vault_document_id)=1),
 check(storage_key like user_id::text||'/%' and storage_key not like '%..%')
);
create index if not exists document_files_document on public.document_files(document_id);
create index if not exists document_files_vault on public.document_files(vault_document_id);
alter table public.vault_documents enable row level security;
alter table public.document_files enable row level security;
revoke all on public.vault_documents,public.document_files from anon,authenticated;
grant select,insert,delete on public.vault_documents,public.document_files to authenticated;
grant all on public.vault_documents,public.document_files to service_role;
drop policy if exists own_vault_documents on public.vault_documents;
create policy own_vault_documents on public.vault_documents for all to authenticated
 using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
drop policy if exists own_document_files on public.document_files;
create policy own_document_files on public.document_files for all to authenticated
 using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
-- Preserve attachments already uploaded through the original single-file field.
insert into public.document_files(user_id,document_id,name,storage_key)
 select user_id,id,coalesce(nullif(btrim(file_name),''),'Document'),file_key
 from public.documents where file_key is not null
 on conflict(storage_key) do nothing;
-- The existing documents bucket stays private (no public URLs).
update storage.buckets set public=false where id='documents';
commit;
