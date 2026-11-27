# Enable reminders and renewal history

## Vehicle VIN

Apply `migrations/202611210013_vehicle_vin.sql` for the optional chassis number.
Existing vehicles retain a null VIN. New VIN values are uppercased and validated
as 17 characters excluding I/O/Q, in the app and database. It appears in the
vehicle group and pre-fills renewal packet VIN fields; saved packet values take
precedence. Leaving VIN empty remains compatible with the previous schema.

The frontend detects the database version. Editing and calendar export work with the original schema. Multiple reminder dates, renewal history, and server push require this upgrade. No paid WhatsApp service is used. Provider quotas and current plan limits still apply.

## Imagini folder

After migration `202611210009_document_vault.sql`, apply
`migrations/202611210011_photo_folder.sql`. The three folders are Auto, Personal
and Imagini. The original document form and saved-document list are shown only
inside Imagini. Users name a document, choose Personal/Auto and optionally a
vehicle, then upload its images/PDFs. There is one content section, without a
second gallery. Saved documents are searchable and shown ten at a time. Earlier
direct uploads are retained as document groups. Attachments on dated acts remain
available from those acts. The folder counter counts saved-document files. The
internal Photos category is retained for compatibility; no additional migration
is needed. Folder selection changes only the indicator below the folder; tabs,
borders and geometry are unchanged.

The Imagini form uses one title selector covering app document kinds and packet
requirements, with Altele for custom names. There are no new/existing mode cards
or category picker. An optional compatible-act selector appears when relevant.
Images/PDFs are selected and previewed in that same form before Save. Validation
runs before any document is created. Partial upload retries retain only unsaved
files and reuse the parent document, avoiding duplicate uploads. Save returns to
the list. The small success notice appears only there and clears automatically.
Linking uses the existing `document_files.document_id` relationship;
it does not create a duplicate vault entry or depend on matching names. The
files are available both in Imagini and in the original act. Profile-scoped
choices and the existing ownership foreign keys/RLS apply. Unlinked documents
keep their name/category/vehicle form. No new migration is needed for linking.

## Custom reminder days (27 November 2026)

Apply `migrations/202611270001_custom_reminder_days.sql` before deploying the
frontend. It is repeatable and keeps existing documents unchanged. Besides the
30/14/7/1 presets, users can enter any number of days from 1 to 365 (at most 8
alerts per document), both in Reminders → automatic defaults and in each
document's editor. The push and email senders already handle any lead time, so
no Edge Function redeployment is needed. Without the migration, saving a custom
value fails with a database check error.

## Term lifecycle and appointment reminders (21 November 2026)

Apply `migrations/202611210007_multiple_notification_hours.sql` if it has not already
been applied, then `migrations/202611210008_term_lifecycle_and_timed_reminders.sql`.
The latter is repeatable. It preserves existing documents, adds completed terms
and minute-based appointment reminders, and cancels pending deliveries when a
term is completed or rescheduled. Then deploy the updated `push` Edge Function;
keep the existing secrets and cron job. Deploy the frontend after the migration.
The frontend hides unavailable appointment-alert options on older databases.
The existing dispatcher runs every 15 minutes, so a selected alert may arrive up
to 15 minutes after its scheduled time. Minute alerts are not sent after the
appointment starts. Appointment timezones are saved with the appointment.

Password recovery uses Supabase Auth email delivery. Add the exact deployed URL
`https://YOUR_APP_HOST/reset-password` to Authentication → URL Configuration →
Redirect URLs, and the corresponding localhost URL for local testing. Ensure the
email provider/SMTP and recovery email template are configured. The app handles
the recovery session, expired links, password confirmation and update. Browser
tests mock the email API; they do not send real emails or establish phone receipt.
See the [Supabase password recovery documentation](https://supabase.com/docs/guides/auth/passwords).

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

## Documente și fișiere private

După migrările pentru profiluri și mașini (003 și 004), rulează `migrations/202611210009_document_vault.sql` în Supabase SQL Editor. Migrarea adaugă documente fără expirare și atașamente multiple pentru actele existente; atașamentele vechi sunt preluate fără mutarea fișierelor. Poate fi rulată din nou.

În detaliile unui act, „Documente și fișiere” permite încărcarea pozelor față-verso și a PDF-urilor. În „Actele mele”, „Documente păstrate” salvează documente fără expirare în profilul activ, opțional asociate unei mașini. Aceste documente nu intră în calculul termenelor și nu generează alerte.

Bucket-ul `documents` rămâne privat, cu limitele existente: PDF, JPG, PNG și WebP, maximum 5 MB fiecare. Descărcarea și previzualizarea folosesc sesiunea autentificată, fără URL-uri publice. Trimiterea fișierelor folosește meniul nativ unde browserul îl permite; în celelalte browsere se oferă descărcarea. Fișierele nu sunt memorate pentru acces offline.

Verificări: `npm run test:vault` pentru migrare, acces între conturi și relațiile profil/mașină; `node scripts/check-document-vault-ui.cjs` cu `TEST_APP_URL` pentru fluxurile din browser cu API simulat. Aceste verificări nu modifică baza de date găzduită.

## Dosare de pregătire pentru reînnoire

După migrarea 009, rulează `migrations/202611210010_renewal_packets.sql`. Salvează selecțiile și informațiile de pregătire în contul utilizatorului, separat pentru fiecare act și tip de dosar. După schimbarea expirării actului, pregătirea începe cu o selecție nouă. Nu sunt salvate copii ale PDF-urilor generate pe server.

„Pregătește și trimite actele” este disponibil în detaliile tipurilor RCA, CASCO, ITP, rovinietă, carte de identitate, permis, pașaport, card de sănătate (duplicat), revizie și parcare. În cardul expirărilor apropiate, „Pregătește actele” deschide detaliile actului; dosarul se extinde la click. Lista poate fi completată cu fișiere deja salvate în același profil și pentru aceeași mașină sau prin încărcare directă. Actele identificate fără ambiguitate pentru profilul și mașina respectivă sunt preselectate, inclusiv toate paginile aceluiași document. Debifările salvate și actele marcate doar în original se păstrează; versiunile concurente și imaginile neasociate cer alegerea utilizatorului. Actele disponibile numai în original pot fi marcate astfel, fără includerea unei copii.

PDF-ul se generează în browser, cu fontul Noto Sans inclus local sub licența OFL: informațiile editate, lista de pregătire și paginile fișierelor selectate. Limite: 30 de fișiere, 50 MB înaintea conversiei, 300 de pagini. Imaginile JPEG/PNG/WebP sunt orientate și convertite în PNG; PDF-urile statice sunt reunite cu toate paginile. Fișierele deteriorate, protejate cu parolă și PDF-urile cu câmpuri interactive/semnături sunt respinse explicit, fără omitere în tăcere. Documentele originale rămân disponibile separat.

Listele sunt orientative, cu surse oficiale în ghidurile existente; procedura depinde de situație și de destinatar. PDF-ul nu înlocuiește actele în original, programarea, plata sau depunerea oficială. Revizia și parcarea au liste de pregătire generale, nu cerințe legale universale. Trimiterea se face prin meniul de partajare al dispozitivului, numai după apăsarea butonului; în browserele fără suport se oferă descărcarea.

Verificări: `npm run test:renewal` și `node scripts/check-renewal-packet-ui.cjs` (cu `TEST_APP_URL` pentru serverul local). Testele folosesc date și fișiere fictive și nu modifică serviciul găzduit.

## Legarea imaginilor și completarea din context

Rulează și `migrations/202611210012_contextual_file_links.sql` pentru clasificarea documentelor păstrate și legarea unei imagini neasociate de un act. Sunt permise numai modificările coloanelor de asociere; proprietarul și cheia de stocare nu pot fi modificate de client. RLS și cheile străine verifică în continuare contul de la ambele capete.

Pozele neasociate din același profil apar în alegerea fișierelor pentru dosarul de reînnoire. Alegerea unei astfel de poze o organizează sub actul respectiv, păstrând ID-ul și fișierul original. Încărcarea directă dintr-o cerință preia tipul, profilul și mașina și folosește actul deja existent dacă este identificat fără ambiguitate; altfel creează documentul contextual în „Imagini și documente”. Alegerea tipului în formularul general completează numele și categoria. Numărul mașinii, referința și expirarea sunt preluate în pregătire și rămân editabile. Nu se extrag automat datele din conținutul pozelor.

Cardul „Pregătește dosarul” este închis inițial; secțiunea „Rezolvă actul” și linkurile oficiale rămân vizibile separat. Deschiderea/închiderea cardului păstrează completările din sesiunea curentă. Salvarea explicită păstrează pregătirea și după reîncărcare.

Verificarea legăturilor: `node scripts/check-contextual-files.mjs`.

## Ștergere mașină
Rulează migrations/202611210014_delete_vehicle.sql după migrările de dosare. Funcția delete_vehicle permite proprietarului să elimine mașina într-o tranzacție, păstrând actele, fișierele și alertele fără asocierea auto. Pregătirile PDF ale actelor acestei mașini sunt resetate. Interfața cere confirmare și afișează actele în Fără mașină.

