begin;
create table if not exists public.email_preferences (
 user_id uuid primary key references auth.users(id) on delete cascade,
 enabled boolean not null default false,
 hour integer not null default 9 check(hour between 0 and 23),
 timezone text not null default 'Europe/Bucharest',
 last_test_at timestamptz
);
alter table public.email_preferences enable row level security;
create policy email_preferences_read on public.email_preferences for select to authenticated using(user_id=auth.uid());
grant select on public.email_preferences to authenticated;
grant all on public.email_preferences to service_role;
create table if not exists public.email_runtime(id boolean primary key default true check(id),last_run timestamptz);
insert into public.email_runtime(id) values(true) on conflict do nothing;
alter table public.email_runtime enable row level security;
grant all on public.email_runtime to service_role;
create table if not exists public.email_deliveries (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 document_id uuid not null references public.documents(id) on delete cascade,
 document_version integer not null, lead integer not null, scheduled_for timestamptz not null,
 status text not null default 'pending' check(status in('pending','sending','accepted','failed','cancelled')),
 attempts integer not null default 0, next_attempt timestamptz not null default now(),
 lease_token uuid,lease_until timestamptz,error_code text,
 unique(document_id,document_version,lead)
);
alter table public.email_deliveries enable row level security;
grant all on public.email_deliveries to service_role;
create index email_deliveries_pending on public.email_deliveries(status,next_attempt);

-- Only this RPC can write preferences: confirmed account address, never a browser-supplied recipient.
create or replace function public.save_email_preferences(want_enabled boolean,preferred_hour integer,preferred_timezone text)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 if not exists(select 1 from pg_catalog.pg_timezone_names where name=preferred_timezone) then raise exception 'Invalid timezone';end if;
 if want_enabled and not exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null and email is not null) then raise exception 'Confirmă adresa de email înainte de activare.';end if;
 insert into public.email_preferences(user_id,enabled,hour,timezone) values(auth.uid(),want_enabled,preferred_hour,preferred_timezone)
 on conflict(user_id) do update set enabled=excluded.enabled,hour=excluded.hour,timezone=excluded.timezone;
 -- Preference changes invalidate queued work; sent reminders remain deduplicated.
 update public.email_deliveries set status='cancelled',lease_token=null,lease_until=null where user_id=auth.uid() and status in('pending','sending');
end $$;
revoke all on function public.save_email_preferences(boolean,integer,text) from public,anon;
grant execute on function public.save_email_preferences(boolean,integer,text) to authenticated;

create or replace function public.email_health() returns jsonb language sql security definer set search_path='' as $$
 select jsonb_build_object('lastRun',last_run) from public.email_runtime where id=true
$$;
revoke all on function public.email_health() from public,anon;
grant execute on function public.email_health() to authenticated,service_role;

create or replace function public.claim_email_deliveries(batch_size integer default 5)
returns setof public.email_deliveries language plpgsql security definer set search_path='' as $$
begin
 update public.email_runtime set last_run=now() where id=true;
 insert into public.email_deliveries(user_id,document_id,document_version,lead,scheduled_for)
 select d.user_id,d.id,d.reminder_version,r.lead,(d.expires-r.lead+make_time(p.hour,0,0)) at time zone p.timezone
 from public.documents d join public.email_preferences p on p.user_id=d.user_id and p.enabled
 join auth.users u on u.id=d.user_id and u.email_confirmed_at is not null
 cross join lateral unnest(d.reminder_days) r(lead)
 where d.completed_at is null and d.expires-r.lead=(now() at time zone p.timezone)::date
 and extract(hour from now() at time zone p.timezone)>=p.hour
 on conflict(document_id,document_version,lead) do update set status='pending',attempts=0,next_attempt=now(),scheduled_for=excluded.scheduled_for where email_deliveries.status='cancelled';
 insert into public.email_deliveries(user_id,document_id,document_version,lead,scheduled_for)
 select d.user_id,d.id,d.reminder_version,-r.minutes,((d.expires+d.event_time) at time zone d.event_timezone)-make_interval(mins=>r.minutes)
 from public.documents d join public.email_preferences p on p.user_id=d.user_id and p.enabled
 join auth.users u on u.id=d.user_id and u.email_confirmed_at is not null
 cross join lateral unnest(d.event_reminder_minutes) r(minutes)
 where d.completed_at is null and d.entry_type='other' and d.event_time is not null
 and now()>=((d.expires+d.event_time) at time zone d.event_timezone)-make_interval(mins=>r.minutes)
 and now()<(d.expires+d.event_time) at time zone d.event_timezone
 on conflict(document_id,document_version,lead) do update set status='pending',attempts=0,next_attempt=now(),scheduled_for=excluded.scheduled_for where email_deliveries.status='cancelled';
 update public.email_deliveries q set status='cancelled',lease_token=null,lease_until=null
 from public.documents d,public.email_preferences p,auth.users u
 where q.document_id=d.id and p.user_id=q.user_id and u.id=q.user_id and q.status in('pending','sending')
 and (not p.enabled or u.email_confirmed_at is null or d.completed_at is not null or d.reminder_version<>q.document_version
 or q.lead>=0 and (now() at time zone p.timezone)::date<>(q.scheduled_for at time zone p.timezone)::date
 or q.lead<0 and now()>=(d.expires+d.event_time) at time zone d.event_timezone);
 update public.email_deliveries set status='failed',error_code='retry_limit' where status='sending' and attempts>=5 and lease_until<now();
 return query with candidates as (
 select id from public.email_deliveries where (status='pending' and next_attempt<=now() or status='sending' and lease_until<now())
 and attempts<5 and scheduled_for<=now() order by scheduled_for for update skip locked limit greatest(1,least(batch_size,5))
 ) update public.email_deliveries q set status='sending',attempts=q.attempts+1,lease_token=gen_random_uuid(),lease_until=now()+interval '10 minutes'
 from candidates c where q.id=c.id returning q.*;
end $$;
create or replace function public.finish_email_delivery(delivery_id uuid,claim_token uuid,result_code integer)
returns void language sql security definer set search_path='' as $$
 update public.email_deliveries set
 status=case when result_code between 200 and 299 then 'accepted' when result_code=409 then 'cancelled' when attempts>=5 or result_code between 400 and 499 then 'failed' else 'pending' end,
 next_attempt=now()+make_interval(mins=>15*attempts),error_code=case when result_code between 200 and 299 then null else result_code::text end,
 lease_token=null,lease_until=null
 where id=delivery_id and lease_token=claim_token and status='sending'
$$;
revoke all on function public.claim_email_deliveries(integer) from public,anon,authenticated;
revoke all on function public.finish_email_delivery(uuid,uuid,integer) from public,anon,authenticated;
grant execute on function public.claim_email_deliveries(integer) to service_role;
grant execute on function public.finish_email_delivery(uuid,uuid,integer) to service_role;
commit;
