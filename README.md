# Duevo

React + TypeScript + Vite, with Supabase Auth, Postgres, and private Storage.
Installable on supported mobile browsers; no separate native app is required.

## Monthly plan and language preferences

The dashboard includes a calendar-month action plan with overdue items first, document preparation links and completion actions for appointments. Completed items are removed from the active plan; the plan uses the active wallet profile.

The first visit asks for Romanian or English and, independently, the country used for renewal guides (Romania / another country). The header's RO/EN button reopens these preferences. They are saved on this browser; after sign-in the app also records `duevo_language` and `duevo_country` in the account's user metadata. Changing language preserves document names, notes, files and internal category keys. Dates, UI text, calendar exports and renewal PDF labels follow the selected language.

Romanian official links and procedure packs appear only when Romania is explicitly selected, regardless of UI language. Other countries receive a general preparation checklist and retain document storage, deadlines and alerts; no Romanian institutional links or country-specific requirements are presented as applicable abroad. Country-specific guides for other jurisdictions are not implemented.

Email and push alerts and tests use the account's `duevo_language` metadata, defaulting to Romanian for existing accounts. Deploy the updated `email` and `push` functions to enable English delivery. Copy the updated `supabase/templates/reset-password.html` into Supabase Auth's Reset Password body to enable both languages; it chooses the language from account metadata and keeps the secure confirmation URL. Suggested subject: `{{ if eq .Data.duevo_language "en" }}Reset your Duevo password{{ else }}Resetează parola contului tău Duevo{{ end }}`. No new database migration is required for these language and monthly-plan changes.

Validation: `npm run test:monthly-language`, and with Vite running at port 5192, `npm run test:monthly-language:browser`. Browser checks use isolated API fixtures and do not send emails or change hosted records.

## Start locally

```sh
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and set your Supabase project URL and publishable key.
This checkout already has the provided project's browser configuration in an ignored local file.
Never put a Supabase secret/service_role key into a VITE_ variable.

## Connect Supabase

1. Open https://supabase.com/dashboard/project/gibbjvdwugvoldcpttfd/sql/new
2. Run the contents of `supabase/schema.sql`. It creates the documents table, enables row level security, and creates a private documents bucket with per-user file policies.
3. In Authentication > URL Configuration, set Site URL to http://127.0.0.1:5173 and allow http://127.0.0.1:5173/ and http://localhost:5173/ as redirect URLs.
4. Configure Google and Email providers as described below. Email signup requires Confirm email to be disabled.
5. Add a document and optional PDF/photo; confirm it remains after reload and can be downloaded. A second account must not see the first account's documents or files.

The browser uses the signed-in user's access token. The supplied publishable key grants no administrative access. The SQL must be applied before document operations work.

## Features

- Google sign-in first, with email/password signup and sign-in as a fallback. No confirmation email when the Email provider is configured below.
- Mașină and Personal folders. Previously saved categories remain accessible in the complete list.
- Expiry dashboard, search, category/status filters, and a renewal checklist.
- Optional private PDF/JPG/PNG/WebP uploads up to 5 MB.
- Download attachments, edit documents, export calendars, and delete documents.
- Single reminder lead time on the original schema; multiple alerts and renewal history after the additive database upgrade.
- Responsive layout and a web app manifest for phone installation.

## Reminders, renewal history and push

Editing and calendar export work with the original database. The additive upgrade adds multiple reminder dates, renewal history, version checks, push subscriptions and a deduplicated delivery queue.

The push receiver, Edge Function sender, permission/settings UI, device test action, and cron SQL are implemented. The migration, function, private secrets, and 15-minute schedule were deployed to the existing project on 21 November 2026. An authorized live dispatch returned HTTP 200; anonymous calls and invalid cron secrets returned HTTP 401. Each device still needs notification permission, activation, and a real notification test. The UI checks service readiness before enabling activation.

See [supabase/SETUP.md](supabase/SETUP.md) for exact setup and phone verification steps. VAPID keys were generated in the ignored `.env.push` file; never commit that file or expose its private key to browser code. No WhatsApp provider or paid messaging service has been enabled.

Validation:

```sh
npm test
npm run build
npx deno check supabase/functions/push/index.ts
npx deno test --allow-env supabase/functions/push/index_test.ts
```

Browser workflow fixtures can be run with `npm run test:browser` against a local Vite server (default port 5180; configurable via TEST_APP_URL). They create no live accounts or records. Database tests run in isolated PGlite, not in the hosted project.

## Build

Email expiry reminders using Gmail are implemented with account opt-in, a confirmed-account recipient, a leased delivery queue, retries and a separate cron job. Deployment and secret configuration are documented in [supabase/EMAIL_SETUP.md](supabase/EMAIL_SETUP.md). Run `node scripts/check-email.mjs` for the isolated database checks. These email changes have not been deployed by this checkout.

```sh
npm run build
npm run preview
```

The output is a static `dist/` folder suitable for static hosting.

The service worker does not cache private documents and does not provide offline document access.


## Google first, email without confirmation

These settings are configured in your Supabase dashboard, not by the browser's publishable key.

### Google

1. In Google Cloud, create an OAuth client of type **Web application** with the app's consent screen.
2. Add these Authorized JavaScript origins:
   - http://127.0.0.1:5173
   - http://localhost:5173
3. Add this Authorized redirect URI:
   - https://gibbjvdwugvoldcpttfd.supabase.co/auth/v1/callback
4. In Supabase > Authentication > Sign In / Providers > Google, enable Google and save the OAuth Client ID and Client Secret. Keep the secret in Supabase; never add it to VITE_ variables.
5. If Google's OAuth app is in Testing mode, add your Google account as a test user. Configure the audience for your intended users before launch.

### Email

In Supabase > Authentication > Sign In / Providers > Email:
- Keep the Email provider enabled.
- Turn **Confirm email OFF** and save.
- Keep new-user signups enabled.

New email users then receive an immediate session after choosing an email address and password. The app checks the public auth settings before signup and does not request signup while confirmation is enabled, avoiding unwanted confirmation emails. Previously created unconfirmed accounts may still need to be confirmed in Supabase or recreated.

### Redirects

In Authentication > URL Configuration:
- Set Site URL to http://127.0.0.1:5173.
- Add http://127.0.0.1:5173/ and http://localhost:5173/ for local development.

### Verify

Run `node scripts/check-connection.mjs` to check the public auth configuration without creating users or sending emails. It should show Google sign-in enabled and Email signup without confirmation as true.

Then test in the browser:
- Continue with Google, select an account, and return to the dashboard.
- Sign out and register a new personal email/password; the dashboard should open immediately.
- Sign out and sign back in with those credentials.
- Cancel Google authorization and confirm that email sign-in remains available.


References: https://supabase.com/docs/guides/auth/social-sign-in/auth-google and https://supabase.com/docs/guides/auth/general-configuration




## Renewal assistance

Document details include a compact “Rezolvă actul” section for ITP, RCA, rovinietă, carte de identitate (CEI), permis, pașaport, CASCO, and national health card. Unknown document names offer a type selector instead of guessing. Source URLs, short contextual checklists, and the review date are defined in `src/renewal-guides.ts` (reviewed 21 November 2026).

ITP opens an external Google Maps search. Users may enter a city; the app does not request geolocation or send document references, names or number plates to Maps. Nearby results depend on Maps' own location permission. Search results do not establish RAR authorization or appointment availability; the guide also links the RAR list. MAI links use official CEI, passport and driving licence appointment portals. Insurance opens ASF's provider registry; this is not a quote comparison or endorsement. Online purchases and appointments happen on external sites.

Checklists are contextual summaries, not universal requirements. CEI varies by records already available; passport guidance covers adults resident in Romania; CASCO depends on the contract. Full source links remain available. Recheck these sources before changing the recorded review date. No map API keys, paid APIs or new dependencies were added.

Browser check: `node scripts/check-renewal-help.cjs` against the local Vite server on port 5186. Uses an isolated rendering fixture and creates no live documents or users.

## Separate wallets in one account

Apply `supabase/migrations/202611210003_wallet_profiles.sql`. Existing documents are assigned to the account's default “Eu” profile. New accounts receive it on first load. In the account/avatar menu users can create, switch and rename profiles; Auto/Personal lists, counters, exports and new document creation use the active profile. All profiles belong to the same signed-in account and are not independent logins or shared permissions. The last selected profile is remembered per account on that browser; direct document links select their owning profile. Existing documents cannot be silently reassigned to another profile.

Push subscriptions and reminder defaults remain device/account preferences. All account profiles can generate notifications. To include the profile name in notification messages deploy the updated sender:

```sh
npx supabase functions deploy push --remote=gibbjvdwugvoldcpttfd --use-api --no-verify-jwt --yes
```

The current CLI session returned 403 for this deployment; the existing sender was not replaced. Do not claim named profile push messages until deployment succeeds. Names are intentionally included by this feature and may appear on the lock screen; document titles and reference numbers remain omitted.

`node scripts/check-wallet-profiles.mjs` checks the actual migration with an isolated PostgreSQL-compatible database, including backfill, RLS, composite ownership FK, immutable document membership, default provisioning and repeat application. `node scripts/check-profile-ui.cjs` checks the browser flow with isolated API fixtures against port 5174, without creating live accounts or records.
