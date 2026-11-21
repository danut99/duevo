-- Run AFTER the migration and deployment. Set the two secrets in Supabase Vault first:
-- expiry_push_url: https://YOUR_PROJECT.supabase.co/functions/v1/push
-- expiry_push_cron_secret: the SAME random PUSH_CRON_SECRET saved in Edge Function secrets.
-- Keep secret values out of this file and source control.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
do $$
declare existing bigint;
begin
 if not exists(select 1 from vault.decrypted_secrets where name='expiry_push_url') or not exists(select 1 from vault.decrypted_secrets where name='expiry_push_cron_secret') then raise exception 'Create the two named Vault secrets first';end if;
 for existing in select jobid from cron.job where jobname='expiry-pocket-push' loop perform cron.unschedule(existing);end loop;
 perform cron.schedule('expiry-pocket-push','*/15 * * * *',$job$
  select net.http_post(
   url:=(select decrypted_secret from vault.decrypted_secrets where name='expiry_push_url' limit 1),
   headers:=jsonb_build_object('Content-Type','application/json','x-cron-secret',(select decrypted_secret from vault.decrypted_secrets where name='expiry_push_cron_secret' limit 1)),
   body:='{"action":"dispatch"}'::jsonb,timeout_milliseconds:=120000
  );
 $job$);
 update public.push_runtime set schedule_ready=true where id=true;
end $$;
