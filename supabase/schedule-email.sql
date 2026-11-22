-- Run after the email migration and deploying the email function.
-- First create expiry_email_cron_secret in Vault with the SAME EMAIL_CRON_SECRET.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
do $$
declare existing bigint;
begin
 if not exists(select 1 from vault.decrypted_secrets where name='expiry_email_cron_secret') then raise exception 'Create expiry_email_cron_secret in Vault first';end if;
 for existing in select jobid from cron.job where jobname='duevo-email-reminders' loop perform cron.unschedule(existing);end loop;
 perform cron.schedule('duevo-email-reminders','*/15 * * * *',$job$
 select net.http_post(
 url:='https://gibbjvdwugvoldcpttfd.supabase.co/functions/v1/email',
 headers:=jsonb_build_object('Content-Type','application/json','x-cron-secret',(select decrypted_secret from vault.decrypted_secrets where name='expiry_email_cron_secret' limit 1)),
 body:='{"action":"dispatch"}'::jsonb,timeout_milliseconds:=120000);
 $job$);
end $$;
