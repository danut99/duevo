# Alerte prin Gmail pentru Duevo

Codul este pregătit în acest checkout. Nu este activ pe site până la aplicarea migrării, publicarea funcției și a frontendului și configurarea secretelor. Nu introduce parola Gmail sau parola de aplicație în cod, în SQL sau în variabile VITE_.

## 1. Baza de date

În proiectul `gibbjvdwugvoldcpttfd`, deschide **SQL Editor → New query**, copiază integral `supabase/migrations/202611220001_email_reminders.sql` și apasă **Run** o singură dată. Necesită migrările existente, inclusiv `202611210008_term_lifecycle_and_timed_reminders.sql`.

## 2. Secretele funcției

În **Edge Functions → Secrets**, adaugă:

| Nume | Valoare |
| --- | --- |
| `GMAIL_APP_PASSWORD` | Parola de aplicație Google generată pentru hello.duevo@gmail.com, fără spații |
| `EMAIL_CRON_SECRET` | Un secret aleator de minimum 32 de caractere, păstrat pentru pasul 4 |

Poți genera un secret local cu `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Acesta este un secret nou pentru programare, separat de parola Google și Client Secret OAuth.

Expeditorul este fix: `Duevo <hello.duevo@gmail.com>`. Funcția folosește `smtp.gmail.com:465`, cu TLS implicit. Supabase blochează conexiunile de ieșire pe 587 și 25 în Edge Functions.

## 3. Publică funcția

Din directorul proiectului, cu Supabase CLI autentificat:

```powershell
npx.cmd supabase functions deploy email --project-ref gibbjvdwugvoldcpttfd
```

`supabase/config.toml` setează `verify_jwt=false` pentru funcția `email`: funcția validează explicit fiecare JWT prin Supabase Auth, iar apelurile programate cer secretul separat.

Alternativ, în Dashboard → Edge Functions → Deploy a new function → Via Editor, creează funcția **email**, cu fișierele `index.ts` și `logic.ts` din `supabase/functions/email/`. Dezactivează **Verify JWT with legacy secret** pentru această funcție; validarea este făcută în cod.

## 4. Activează programarea

În **Vault**, creează secretul:

- Name: `expiry_email_cron_secret`
- Secret: exact valoarea `EMAIL_CRON_SECRET` de la pasul 2.

Apoi rulează în SQL Editor conținutul `supabase/schedule-email.sql`. Creează jobul `duevo-email-reminders` la fiecare 15 minute și nu schimbă programarea push existentă.

## 5. Publică frontendul și verifică

Publică noul build `dist/` pe Cloudflare Pages, prin fluxul existent al proiectului. Intră pe https://duevo.pages.dev/reminders cu Google, deschide **Email**, activează emailurile, alege ora și apasă **Trimite email de test**. Verifică Inbox și Spam. Acceptarea SMTP nu garantează livrarea în Inbox.

După următoarea execuție cron, secțiunea Email trebuie să arate că programarea funcționează. Pentru un test programat, creează un act cu o alertă scadentă astăzi și o oră deja trecută; verifică după următoarea execuție. Șterge actul de test după verificare.

Pentru diagnostic, verifică **Edge Functions → email → Logs** și rulează:

```sql
select last_run from public.email_runtime;
select status, error_code, count(*) from public.email_deliveries group by status,error_code;
select jobname, active from cron.job where jobname='duevo-email-reminders';
```

Niciun test local nu trimite mesaje reale. Testarea SMTP reală se face numai după introducerea secretului în Supabase.

## Comportament și limite

- Emailurile sunt oprite implicit. Activarea este pentru cont și toate profilurile sale, independent de push.
- Destinatarul este întotdeauna emailul confirmat din Supabase Auth, verificat din nou înaintea trimiterii. Nu se acceptă destinatari sau mesaje arbitrare din browser.
- Conturile create fără confirmare pot fi marcate confirmate automat de configurația Auth. Pentru lansare publică, configurează SMTP în Auth și un flux de confirmare înainte de a permite înregistrarea cu email; interfața actuală de signup cere Confirm email OFF. Google verifică adresa prin autentificarea sa.
- Se trimite un email pe act, versiune de reamintire și interval. Ora zilnică se salvează împreună cu fusul orar al dispozitivului. Alertele în minute folosesc fusul orar al programării.
- Actele reînnoite sau șterse și termenele finalizate nu mai generează alertele vechi. Emailurile deja acceptate de Gmail nu se retrag.
- Coada folosește blocare, token de rezervare și maximum cinci încercări. O cădere după acceptarea SMTP și înaintea înregistrării rezultatului poate produce un duplicat; Message-ID este stabil între încercări, fără garanție de deduplicare Gmail.
- Se procesează maximum cinci emailuri la fiecare 15 minute. Un volum mai mare poate întârzia sau expira alertele; Gmail personal are și limita proprie de aproximativ 500 de mesaje într-un interval de 24 de ore, comună cu alte trimiteri ale contului.
- Emailurile de autentificare/resetare folosesc separat **Authentication → SMTP Settings**; funcția de alerte nu modifică acea configurație.

Surse: https://supabase.com/docs/guides/functions/limits și https://developers.google.com/workspace/gmail/imap/imap-smtp
