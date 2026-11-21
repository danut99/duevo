-- Run this once in the Supabase SQL Editor.
create table if not exists public.documents (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 name text not null check (char_length(name) between 1 and 120),
 category text not null check (category in ('Vehicles','Personal','Home','Health','Other')),
 reference text not null default '' check (char_length(reference) <= 120),
 expires date not null,
 issued_on date,
 days integer not null default 30 check (days in (1,3,7,14,30,60,90)),
 notes text not null default '' check (char_length(notes) <= 2000),
 file_key text,
 file_name text,
 created_at timestamptz not null default now()
);
create index if not exists documents_user_expiry on public.documents(user_id, expires);
alter table public.documents enable row level security;
drop policy if exists "Own documents only" on public.documents;
create policy "Own documents only" on public.documents for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
revoke all on public.documents from anon;
grant select, insert, update, delete on public.documents to authenticated;
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('documents','documents',false,5242880,array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=false,file_size_limit=5242880,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists "Own document files select" on storage.objects;
drop policy if exists "Own document files insert" on storage.objects;
drop policy if exists "Own document files delete" on storage.objects;
create policy "Own document files select" on storage.objects for select to authenticated
using (bucket_id='documents' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "Own document files insert" on storage.objects for insert to authenticated
with check (bucket_id='documents' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "Own document files delete" on storage.objects for delete to authenticated
using (bucket_id='documents' and (storage.foldername(name))[1]=(select auth.uid())::text);

