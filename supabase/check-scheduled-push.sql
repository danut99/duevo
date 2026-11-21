-- Exercise the same pg_net + Vault path used by cron, without exposing either secret.
select net.http_post(
 url:=(select decrypted_secret from vault.decrypted_secrets where name='expiry_push_url' limit 1),
 headers:=jsonb_build_object('Content-Type','application/json','x-cron-secret',(select decrypted_secret from vault.decrypted_secrets where name='expiry_push_cron_secret' limit 1)),
 body:='{"action":"dispatch"}'::jsonb,timeout_milliseconds:=120000
) as request_id;
