-- Save preparation choices, not generated PDFs. Files stay in the private bucket.
begin;
create table if not exists public.renewal_packets (
 document_id uuid not null,
 user_id uuid not null references auth.users(id) on delete cascade,
 guide_code text not null check(guide_code in ('RCA','CAS','ITP','ROV','CI','PER','PAS','SAN','REV','PARK')),
 draft jsonb not null default '{}'::jsonb check(jsonb_typeof(draft)='object' and octet_length(draft::text)<=65536),
 updated_at timestamptz not null default now(),
 primary key(document_id,guide_code),
 foreign key(document_id,user_id) references public.documents(id,user_id) on delete cascade
);
alter table public.renewal_packets enable row level security;
revoke all on public.renewal_packets from anon,authenticated;
grant select,insert,update,delete on public.renewal_packets to authenticated;
grant all on public.renewal_packets to service_role;
drop policy if exists own_renewal_packets on public.renewal_packets;
create policy own_renewal_packets on public.renewal_packets for all to authenticated
 using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
commit;
