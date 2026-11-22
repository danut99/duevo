begin;
-- Initialize once; an explicit opt-out must survive subsequent sign-ins.
create or replace function public.initialize_email_reminders()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.email_confirmed_at is not null and new.email is not null then
  insert into public.email_preferences(user_id,enabled,hour,timezone)
  values(new.id,true,9,'Europe/Bucharest') on conflict(user_id) do nothing;
 end if;
 return new;
end $$;
revoke all on function public.initialize_email_reminders() from public,anon,authenticated;
create trigger initialize_email_reminders
after insert or update of email_confirmed_at,email on auth.users
for each row execute function public.initialize_email_reminders();

insert into public.email_preferences(user_id,enabled,hour,timezone)
select id,true,9,'Europe/Bucharest' from auth.users
where email_confirmed_at is not null and email is not null
on conflict(user_id) do nothing;
commit;
