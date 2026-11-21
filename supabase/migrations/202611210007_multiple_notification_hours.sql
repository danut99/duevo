-- Multiple notification hours per device, preserving existing preferences and deliveries.
begin;
alter table public.push_subscriptions add column if not exists hours smallint[];
update public.push_subscriptions set hours=array[hour] where hours is null;
alter table public.push_subscriptions alter column hours set default array[9]::smallint[];
alter table public.push_subscriptions alter column hours set not null;
alter table public.push_subscriptions add constraint push_subscription_hours_valid check (
 cardinality(hours) between 1 and 24 and array_ndims(hours)=1
 and array_position(hours,null) is null and hours <@ array[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23]::smallint[]);
grant insert(hours),update(hours) on public.push_subscriptions to authenticated;
alter table public.push_deliveries add column if not exists scheduled_hour smallint;
update public.push_deliveries q set scheduled_hour=s.hour from public.push_subscriptions s where s.id=q.subscription_id and q.scheduled_hour is null;
alter table public.push_deliveries alter column scheduled_hour set not null;
alter table public.push_deliveries add constraint push_delivery_hour_valid check(scheduled_hour between 0 and 23);
-- Locate the original generated unique constraint without relying on its truncated name.
do $$ declare item record; begin
 for item in select conname from pg_constraint where conrelid='public.push_deliveries'::regclass and contype='u'
 loop execute format('alter table public.push_deliveries drop constraint %I',item.conname); end loop;
end $$;
alter table public.push_deliveries add constraint push_delivery_slot_unique unique(document_id,document_version,subscription_id,lead_days,scheduled_hour);
create or replace function public.claim_push_deliveries(batch_size integer default 10) returns table(
 delivery_id uuid,claim_token uuid,document_id uuid,document_version integer,lead_days integer,endpoint text,p256dh text,auth text
) language plpgsql security definer set search_path='' as $$
begin
 update public.push_runtime set last_run=now() where id=true;
 insert into public.push_deliveries(document_id,user_id,subscription_id,document_version,lead_days,expires,scheduled_hour)
 select d.id,d.user_id,s.id,d.reminder_version,r.lead,d.expires,h.hour from public.documents d join public.push_subscriptions s on s.user_id=d.user_id and s.enabled
 cross join lateral unnest(d.reminder_days) r(lead)
 cross join lateral unnest(s.hours) h(hour)
 where d.expires-r.lead=(now() at time zone s.timezone)::date and extract(hour from now() at time zone s.timezone)>=h.hour
 on conflict do nothing;
 update public.push_deliveries q set status='cancelled',error_code='document_changed' where q.status in('pending','sending') and exists(select 1 from public.documents d where d.id=q.document_id and d.reminder_version<>q.document_version);
 update public.push_deliveries q set status='failed',error_code='retry_limit' where q.status='sending' and q.attempts>=5 and q.lease_until<now();
 update public.push_deliveries q set status='cancelled',error_code='expired' from public.push_subscriptions s where s.id=q.subscription_id and q.status='pending' and q.expires<(now() at time zone s.timezone)::date;
 return query
 with candidates as (
  select q.id from public.push_deliveries q join public.push_subscriptions s on s.id=q.subscription_id and s.enabled
  join public.documents d on d.id=q.document_id and d.reminder_version=q.document_version
  where (q.status='pending' and q.next_attempt<=now() or q.status='sending' and q.lease_until<now()) and q.attempts<5
   and q.scheduled_hour=any(s.hours) and q.expires >= (now() at time zone s.timezone)::date and extract(hour from now() at time zone s.timezone)>=q.scheduled_hour
  order by q.created_at for update of q skip locked limit greatest(1,least(batch_size,50))
 ), claimed as (
  update public.push_deliveries q set status='sending',attempts=q.attempts+1,lease_token=gen_random_uuid(),lease_until=now()+interval '10 minutes'
  from candidates c where q.id=c.id returning q.*
 ) select q.id,q.lease_token,q.document_id,q.document_version,q.lead_days,s.endpoint,s.p256dh,s.auth from claimed q join public.push_subscriptions s on s.id=q.subscription_id;
end $$;
revoke all on function public.claim_push_deliveries(integer) from public,anon,authenticated;
grant execute on function public.claim_push_deliveries(integer) to service_role;
commit;
