-- Additive upgrade: preserves all existing documents and attachments.
begin;
alter table public.documents add column if not exists reminder_days integer[];
update public.documents set reminder_days=array[days] where reminder_days is null;
alter table public.documents alter column reminder_days set not null;
alter table public.documents alter column reminder_days drop default;
alter table public.documents add column if not exists version integer not null default 1;
alter table public.documents add column if not exists reminder_version integer not null default 1;
alter table public.documents add column if not exists updated_at timestamptz not null default now();
alter table public.documents drop constraint if exists documents_reminders_valid;
alter table public.documents add constraint documents_reminders_valid check (cardinality(reminder_days) between 1 and 8 and reminder_days <@ array[0,1,3,7,14,30,60,90] and array_position(reminder_days,null) is null);
create table if not exists public.document_revisions (
 id uuid primary key default gen_random_uuid(),document_id uuid not null references public.documents(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,name text not null,expires date not null,
 reminder_days integer[] not null,file_key text,file_name text,renewed_at timestamptz not null default now()
);
alter table public.document_revisions enable row level security;
revoke all on public.document_revisions from anon,authenticated;
grant select on public.document_revisions to authenticated;
drop policy if exists own_revisions on public.document_revisions;
create policy own_revisions on public.document_revisions for select to authenticated using(user_id=(select auth.uid()));
create or replace function public.track_document_changes() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='INSERT' then
  if new.reminder_days is null then new.reminder_days=array[new.days];end if;
  new.version=1;new.reminder_version=1;new.updated_at=now();return new;
 end if;
 if new.user_id is distinct from old.user_id or new.id is distinct from old.id then raise exception 'Document ownership is immutable'; end if;
 if new.reminder_days is not distinct from old.reminder_days and new.days is distinct from old.days then new.reminder_days=array[new.days]; end if;
 new.version=old.version+1;new.updated_at=now();
 new.reminder_version=old.reminder_version+case when new.expires is distinct from old.expires or new.reminder_days is distinct from old.reminder_days then 1 else 0 end;
 if new.expires is distinct from old.expires then
  insert into public.document_revisions(document_id,user_id,name,expires,reminder_days,file_key,file_name)
  values(old.id,old.user_id,old.name,old.expires,old.reminder_days,old.file_key,old.file_name);
 end if;
 return new;
end $$;
drop trigger if exists track_document_changes on public.documents;
create trigger track_document_changes before insert or update on public.documents for each row execute function public.track_document_changes();
create or replace function public.renew_document(document_id uuid,new_expiry date,expected_version integer) returns public.documents language plpgsql security invoker set search_path='' as $$
declare current_doc public.documents;result public.documents;
begin
 select * into current_doc from public.documents where id=document_id and user_id=auth.uid() for update;
 if not found then raise exception 'Document not found';end if;
 if current_doc.version<>expected_version or expected_version is null then raise exception 'Document changed; reload before renewing';end if;
 if new_expiry is null or new_expiry<=current_doc.expires or new_expiry<current_date then raise exception 'New expiry must be later than current expiry and not in the past';end if;
 update public.documents set expires=new_expiry where id=document_id returning * into result;return result;
end $$;
revoke all on function public.renew_document(uuid,date,integer) from public,anon;
grant execute on function public.renew_document(uuid,date,integer) to authenticated;

create table if not exists public.push_subscriptions (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 endpoint text not null unique check(length(endpoint)<4096 and endpoint ~ '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-zA-Z0-9.-]+\.notify\.windows\.com)/'),
 p256dh text not null check(length(p256dh) between 80 and 200),auth text not null check(length(auth) between 16 and 100),
 timezone text not null default 'Europe/Bucharest',hour smallint not null default 9 check(hour between 0 and 23),
 enabled boolean not null default true,created_at timestamptz not null default now(),last_test_at timestamptz
);
create index if not exists push_subscriptions_owner on public.push_subscriptions(user_id);
alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon;
revoke all on public.push_subscriptions from authenticated;
grant select,delete on public.push_subscriptions to authenticated;
grant insert(user_id,endpoint,p256dh,auth,timezone,hour,enabled) on public.push_subscriptions to authenticated;
grant update(user_id,endpoint,p256dh,auth,timezone,hour,enabled) on public.push_subscriptions to authenticated;
drop policy if exists own_push_subscriptions on public.push_subscriptions;
create policy own_push_subscriptions on public.push_subscriptions for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create or replace function public.validate_push_timezone() returns trigger language plpgsql set search_path='' as $$
begin
 if not exists(select 1 from pg_catalog.pg_timezone_names where name=new.timezone) then raise exception 'Invalid timezone';end if;
 if tg_op='UPDATE' and (new.user_id<>old.user_id or new.endpoint<>old.endpoint) then raise exception 'Subscription ownership is immutable';end if;
 return new;
end $$;
drop trigger if exists validate_push_timezone on public.push_subscriptions;
create trigger validate_push_timezone before insert or update on public.push_subscriptions for each row execute function public.validate_push_timezone();

create table if not exists public.push_runtime(id boolean primary key default true check(id),schedule_ready boolean not null default false,last_run timestamptz);
insert into public.push_runtime(id) values(true) on conflict do nothing;
alter table public.push_runtime enable row level security;
revoke all on public.push_runtime from anon,authenticated;
create or replace function public.push_health() returns jsonb language sql security definer set search_path='' as $$
 select jsonb_build_object('scheduleReady',schedule_ready,'lastRun',last_run) from public.push_runtime where id=true
$$;
revoke all on function public.push_health() from public,anon;
grant execute on function public.push_health() to authenticated,service_role;

create table if not exists public.push_deliveries (
 id uuid primary key default gen_random_uuid(),document_id uuid not null references public.documents(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,subscription_id uuid not null references public.push_subscriptions(id) on delete cascade,
 document_version integer not null,lead_days integer not null,expires date not null,
 status text not null default 'pending' check(status in('pending','sending','accepted','failed','cancelled')),
 attempts integer not null default 0,lease_token uuid,lease_until timestamptz,next_attempt timestamptz not null default now(),
 created_at timestamptz not null default now(),accepted_at timestamptz,error_code text,
 unique(document_id,document_version,subscription_id,lead_days)
);
create index if not exists push_deliveries_pending on public.push_deliveries(status,next_attempt);
alter table public.push_deliveries enable row level security;
revoke all on public.push_deliveries from anon,authenticated;
grant select on public.push_deliveries to authenticated;
drop policy if exists own_push_deliveries on public.push_deliveries;
create policy own_push_deliveries on public.push_deliveries for select to authenticated using(user_id=(select auth.uid()));
-- Only the server may create/claim deliveries. SKIP LOCKED and expiring leases support concurrent cron runs.
create or replace function public.claim_push_deliveries(batch_size integer default 10) returns table(
 delivery_id uuid,claim_token uuid,document_id uuid,document_version integer,lead_days integer,endpoint text,p256dh text,auth text
) language plpgsql security definer set search_path='' as $$
begin
 update public.push_runtime set last_run=now() where id=true;
 insert into public.push_deliveries(document_id,user_id,subscription_id,document_version,lead_days,expires)
 select d.id,d.user_id,s.id,d.reminder_version,r.lead,d.expires from public.documents d join public.push_subscriptions s on s.user_id=d.user_id and s.enabled
 cross join lateral unnest(d.reminder_days) r(lead)
 where d.expires-r.lead=(now() at time zone s.timezone)::date and extract(hour from now() at time zone s.timezone)>=s.hour
 on conflict do nothing;
 update public.push_deliveries q set status='cancelled',error_code='document_changed' where q.status in('pending','sending') and exists(select 1 from public.documents d where d.id=q.document_id and d.reminder_version<>q.document_version);
 update public.push_deliveries q set status='failed',error_code='retry_limit' where q.status='sending' and q.attempts>=5 and q.lease_until<now();
 update public.push_deliveries q set status='cancelled',error_code='expired' from public.push_subscriptions s where s.id=q.subscription_id and q.status='pending' and q.expires<(now() at time zone s.timezone)::date;
 return query
 with candidates as (
  select q.id from public.push_deliveries q join public.push_subscriptions s on s.id=q.subscription_id and s.enabled
  join public.documents d on d.id=q.document_id and d.reminder_version=q.document_version
  where (q.status='pending' and q.next_attempt<=now() or q.status='sending' and q.lease_until<now()) and q.attempts<5
   and q.expires >= (now() at time zone s.timezone)::date and extract(hour from now() at time zone s.timezone)>=s.hour
  order by q.created_at for update of q skip locked limit greatest(1,least(batch_size,50))
 ), claimed as (
  update public.push_deliveries q set status='sending',attempts=q.attempts+1,lease_token=gen_random_uuid(),lease_until=now()+interval '10 minutes'
  from candidates c where q.id=c.id returning q.*
 ) select q.id,q.lease_token,q.document_id,q.document_version,q.lead_days,s.endpoint,s.p256dh,s.auth from claimed q join public.push_subscriptions s on s.id=q.subscription_id;
end $$;
revoke all on function public.claim_push_deliveries(integer) from public,anon,authenticated;
grant execute on function public.claim_push_deliveries(integer) to service_role;
create or replace function public.finish_push_delivery(delivery_id uuid,claim_token uuid,result_code integer) returns void language plpgsql security definer set search_path='' as $$
declare attempt integer;sub_id uuid;
begin
 select attempts,subscription_id into attempt,sub_id from public.push_deliveries where id=delivery_id and lease_token=claim_token and status='sending' for update;
 if not found then return;end if;
 update public.push_deliveries set status=case when result_code between 200 and 299 then 'accepted' when result_code in(404,410) or attempt>=5 or result_code between 400 and 499 and result_code not in(408,429) then 'failed' else 'pending' end,
 accepted_at=case when result_code between 200 and 299 then now() else null end,
 error_code=case when result_code between 200 and 299 then null else result_code::text end,
 next_attempt=now()+make_interval(mins=>least(360,5*power(2,attempt)::integer)),lease_until=null,lease_token=null
 where id=delivery_id;
 if result_code in(404,410) then update public.push_subscriptions set enabled=false where id=sub_id;end if;
end $$;
revoke all on function public.finish_push_delivery(uuid,uuid,integer) from public,anon,authenticated;
grant execute on function public.finish_push_delivery(uuid,uuid,integer) to service_role;
-- Supabase normally grants these through default privileges; make server requirements explicit.
grant all on public.document_revisions,public.push_subscriptions,public.push_deliveries,public.push_runtime to service_role;
commit;


