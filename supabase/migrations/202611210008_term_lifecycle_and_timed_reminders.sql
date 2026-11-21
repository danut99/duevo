-- Additive upgrade: completed terms stay available in the archive.
begin;
alter table public.documents add column if not exists completed_at timestamptz;
alter table public.documents add column if not exists event_reminder_minutes integer[] not null default '{}';
alter table public.documents add column if not exists event_timezone text not null default 'Europe/Bucharest';
alter table public.documents drop constraint if exists documents_term_completion;
alter table public.documents add constraint documents_term_completion check(completed_at is null or entry_type='other');
alter table public.documents drop constraint if exists documents_event_reminders;
alter table public.documents add constraint documents_event_reminders check(
 cardinality(event_reminder_minutes)<=4 and array_position(event_reminder_minutes,null) is null
 and event_reminder_minutes <@ array[15,30,60,120]
 and (cardinality(event_reminder_minutes)=0 or (entry_type='other' and event_time is not null)));
create or replace function public.validate_event_timezone() returns trigger language plpgsql set search_path='' as $$
begin
 if not exists(select 1 from pg_catalog.pg_timezone_names where name=new.event_timezone) then raise exception 'Invalid event timezone';end if;
 return new;
end $$;
drop trigger if exists validate_event_timezone on public.documents;
create trigger validate_event_timezone before insert or update on public.documents for each row execute function public.validate_event_timezone();

create or replace function public.track_document_changes() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='INSERT' then
  if new.reminder_days is null then new.reminder_days=array[new.days];end if;
  new.version=1;new.reminder_version=1;new.updated_at=now();return new;
 end if;
 if new.user_id is distinct from old.user_id or new.id is distinct from old.id then raise exception 'Document ownership is immutable';end if;
 if new.reminder_days is not distinct from old.reminder_days and new.days is distinct from old.days then new.reminder_days=array[new.days];end if;
 new.version=old.version+1;new.updated_at=now();
 new.reminder_version=old.reminder_version+case when new.expires is distinct from old.expires
  or new.reminder_days is distinct from old.reminder_days or new.completed_at is distinct from old.completed_at
  or new.event_time is distinct from old.event_time or new.event_reminder_minutes is distinct from old.event_reminder_minutes
  or new.event_timezone is distinct from old.event_timezone or new.entry_type is distinct from old.entry_type then 1 else 0 end;
 if new.expires is distinct from old.expires then
  insert into public.document_revisions(document_id,user_id,name,expires,reminder_days,file_key,file_name)
  values(old.id,old.user_id,old.name,old.expires,old.reminder_days,old.file_key,old.file_name);
 end if;
 return new;
end $$;

alter table public.push_deliveries add column if not exists scheduled_for timestamptz;
create or replace function public.claim_push_deliveries(batch_size integer default 10) returns table(
 delivery_id uuid,claim_token uuid,document_id uuid,document_version integer,lead_days integer,endpoint text,p256dh text,auth text
) language plpgsql security definer set search_path='' as $$
begin
 update public.push_runtime set last_run=now() where id=true;
 insert into public.push_deliveries(document_id,user_id,subscription_id,document_version,lead_days,expires,scheduled_hour,scheduled_for)
 select d.id,d.user_id,s.id,d.reminder_version,r.lead,d.expires,h.hour,
  (d.expires-r.lead+make_time(h.hour,0,0)) at time zone s.timezone
 from public.documents d join public.push_subscriptions s on s.user_id=d.user_id and s.enabled
 cross join lateral unnest(d.reminder_days) r(lead) cross join lateral unnest(s.hours) h(hour)
 where d.completed_at is null and d.expires-r.lead=(now() at time zone s.timezone)::date
  and extract(hour from now() at time zone s.timezone)>=h.hour
 on conflict do nothing;
 -- Negative lead_days identify minute-based alerts and cannot collide with day alerts.
 insert into public.push_deliveries(document_id,user_id,subscription_id,document_version,lead_days,expires,scheduled_hour,scheduled_for)
 select d.id,d.user_id,s.id,d.reminder_version,-r.minutes,d.expires,0,
  ((d.expires+d.event_time) at time zone d.event_timezone)-make_interval(mins=>r.minutes)
 from public.documents d join public.push_subscriptions s on s.user_id=d.user_id and s.enabled
 cross join lateral unnest(d.event_reminder_minutes) r(minutes)
 where d.completed_at is null and d.entry_type='other' and d.event_time is not null
  and now()>=((d.expires+d.event_time) at time zone d.event_timezone)-make_interval(mins=>r.minutes)
  and now()<((d.expires+d.event_time) at time zone d.event_timezone)
 on conflict do nothing;
 update public.push_deliveries q set status='cancelled',error_code='document_changed'
 where q.status in('pending','sending') and exists(select 1 from public.documents d where d.id=q.document_id and (d.reminder_version<>q.document_version or d.completed_at is not null));
 update public.push_deliveries q set status='failed',error_code='retry_limit' where q.status='sending' and q.attempts>=5 and q.lease_until<now();
 update public.push_deliveries q set status='cancelled',error_code='expired'
 from public.push_subscriptions s,public.documents d
 where s.id=q.subscription_id and d.id=q.document_id and q.status in('pending','sending')
  and (q.lead_days>=0 and q.expires<(now() at time zone s.timezone)::date
   or q.lead_days<0 and now()>=(d.expires+d.event_time) at time zone d.event_timezone);
 return query
 with candidates as (
  select q.id from public.push_deliveries q join public.push_subscriptions s on s.id=q.subscription_id and s.enabled
  join public.documents d on d.id=q.document_id and d.reminder_version=q.document_version and d.completed_at is null
  where (q.status='pending' and q.next_attempt<=now() or q.status='sending' and q.lease_until<now()) and q.attempts<5
   and (q.scheduled_for is null or q.scheduled_for<=now())
   and (q.lead_days>=0 and q.scheduled_hour=any(s.hours) and q.expires>=(now() at time zone s.timezone)::date and extract(hour from now() at time zone s.timezone)>=q.scheduled_hour
    or q.lead_days<0 and -q.lead_days=any(d.event_reminder_minutes) and now()<(d.expires+d.event_time) at time zone d.event_timezone)
  order by q.created_at for update of q skip locked limit greatest(1,least(batch_size,50))
 ), claimed as (
  update public.push_deliveries q set status='sending',attempts=q.attempts+1,lease_token=gen_random_uuid(),lease_until=now()+interval '10 minutes'
  from candidates c where q.id=c.id returning q.*
 ) select q.id,q.lease_token,q.document_id,q.document_version,q.lead_days,s.endpoint,s.p256dh,s.auth from claimed q join public.push_subscriptions s on s.id=q.subscription_id;
end $$;
revoke all on function public.claim_push_deliveries(integer) from public,anon,authenticated;
grant execute on function public.claim_push_deliveries(integer) to service_role;
commit;
