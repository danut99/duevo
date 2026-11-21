# Enable reminders and renewal history

The frontend detects the database version. Editing and calendar export work with the original schema. Multiple reminder dates, renewal history, and server push require this upgrade. No paid WhatsApp service is used. Provider quotas and current plan limits still apply.

## Current deployment

For the existing expiry-pocket project, the migration, Edge Function, secrets, and cron schedule were deployed on 21 November 2026. The sender was checked live with an empty queue: HTTP 200 for the authorized dispatcher and HTTP 401 for anonymous/invalid-secret calls. Actual phone receipt remains a device test. The steps below document setup for recovery or another environment.

## 1. Database

Open the existing project's Supabase SQL Editor. Run `migrations/202611210001_reminders_and_renewals.sql` once. It is additive, preserves existing documents, enables row-level security, and rejects stale renewal requests. The existing `schema.sql` must already have been applied.

Refresh the app. The document form now shows several reminder checkboxes and "Marchează reînnoit" is enabled. Editing an expiry date also records its previous value. Renewing keeps the existing attachment; it does not replace the scan.

## 2. Push secrets and function

The project has browser credentials only. Deployment requires the project owner's Supabase CLI login or an existing Supabase access token. Never paste service-role keys, CLI tokens, or VAPID private keys into chat or `VITE_` variables.

From this project directory:

```sh
npm install
node scripts/generate-push-config.mjs
npx supabase login
npx supabase functions deploy push --project-ref YOUR_PROJECT_REF
npx supabase secrets set --project-ref YOUR_PROJECT_REF --env-file .env.push
```

Use the existing project ref from your Supabase dashboard. The deploy command reads `supabase/config.toml`; `verify_jwt=false` is intentional: the function validates every user JWT through `auth.getUser()` and validates scheduled requests with a distinct random cron secret. Supabase supplies its URL, anon key, and service-role key inside the function runtime.

`.env.push` is ignored by Git. Back it up securely. Reuse the VAPID key pair; rotating it requires users to reactivate their devices. `VAPID_SUBJECT` must be a valid HTTPS URL or mailto contact you control.

## 3. Schedule

In Supabase Vault create two named secrets:

- `expiry_push_url`: your existing Supabase project URL followed by `/functions/v1/push`.
- `expiry_push_cron_secret`: the exact `PUSH_CRON_SECRET` value from your ignored `.env.push` file.

Then run `schedule-push.sql` in the SQL Editor. It replaces only the `expiry-pocket-push` cron job, runs every 15 minutes, and reads its secret from Vault instead of exposing it in the cron command. Retry delays are checked at the next cron run. The first run records a heartbeat; the app checks the heartbeat before showing automatic notifications as active.

## 4. Test on an actual phone

1. Open the app over HTTPS. On iPhone install it using Safari > Share > Add to Home Screen, then open the installed app.
2. Sign in, open Reamintiri, choose an hour, and activate notifications. Permission is requested only after clicking Activate.
3. Send a test and verify that it appears on that phone. The UI distinguishes acceptance by the push service from confirmed delivery to a device.
4. Add a test document expiring tomorrow, select a one-day lead time, and set the preferred hour to the current local hour or earlier. Wait for the next 15-minute cron run, with the app closed. Remove the test document when done.
5. Repeat for another account/device. Signing out unsubscribes that browser before ending the session. Verify that the other account cannot see documents, renewal history, subscriptions, or delivery history.
6. Disable notifications on that device and check that scheduled sends stop. Test denied browser permission and iPhone installation instructions.

Notifications show a generic message without document names/references on the lock screen. Clicking opens the relevant authenticated document page. Delivery requires internet, browser/OS permission, and an active server schedule. Push service acceptance does not guarantee immediate device display.

## Queue behavior and limits

Each document reminder version, lead time, and device has one queue key. Metadata-only edits do not increment the reminder version or resend an accepted alert. The sender claims up to 10 jobs per run with a 10-minute lease, retries transient failures at most five times, and disables endpoints returning 404/410. A device notification tag suppresses duplicate visible alerts when a worker crashes after sending and before recording acceptance. Exactly-once delivery across a network is not guaranteed.

An hourly preference means the server sends on that local date after the chosen hour. New reminders are created for dates due that day; existing queued jobs retry up to the document's expiry date. Past dates are not all sent at once when a user first subscribes. Updating a document invalidates old pending queue entries. At larger volumes increase run frequency/batch throughput after measuring the Edge Function's runtime and plan quotas.

## Local checks

```sh
node scripts/check-database.mjs
node scripts/check-reminders.mjs
npm run build
npx deno check supabase/functions/push/index.ts
```

The database check runs the actual base schema and migration in an isolated PostgreSQL-compatible PGlite instance. It covers row-level account isolation, renewal history and stale version rejection, subscription validation, queue claims, retries, and delivery deduplication. It does not alter the hosted database or create live users.



## Grupare auto pe ma?in?

Dup? migrarea pentru profiluri, ruleaz? `migrations/202611210004_vehicles.sql` ?n Supabase SQL Editor. Actele existente r?m?n neasociate; le po?i asocia din editarea documentului. Ma?inile sunt separate pe profil ?i cont.

## Termene personale (Altele)

După migrarea pentru data emiterii, rulează `migrations/202611210005_personal_terms.sql` în Supabase SQL Editor. Adaugă tipul intrării și ora opțională, păstrând actele existente și regulile de acces. Ora este folosită în detalii și în exportul calendarului; notificările push continuă să folosească ora dispozitivului din setările de notificări.

## Termene auto suplimentare
După migrările 004 și 005, rulează `migrations/202611210006_auto_terms.sql`. Aceasta permite programări auto cu oră opțională și păstrează tipul ales pentru Revizie, Trusă & stingător, Parcare și Altele, inclusiv după redenumire.
