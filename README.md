# FlowDesk

FlowDesk e una scrivania operativa per progetti: timeline eventi, task, note, link e promemoria in una singola pagina.

## Stack

- React + TypeScript + Vite
- Supabase come database relazionale
- Login obbligatorio con Supabase Auth quando le variabili Supabase sono presenti
- Modalita demo locale via `localStorage` solo quando Supabase non e configurato
- Preferenze locali per tema e label esplicative

## Setup

1. Installa le dipendenze:

```bash
npm install
```

2. Crea un progetto Supabase e lancia `supabase/schema.sql` nel SQL editor.

3. Copia `.env.example` in `.env` e inserisci le chiavi:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

4. Avvia l'app:

```bash
npm run dev
```

## Database

Lo schema include:

- `projects`
- `events`
- `tasks`
- `notes`
- `links`
- `reminders`

Le policy RLS in `supabase/schema.sql` richiedono utenti autenticati. Ogni progetto ha `user_id`; eventi, task, note, link e promemoria sono accessibili solo se collegati a un progetto dell'utente corrente.

## Funzioni

- Dashboard con lista progetti, creazione e conteggio task aperti
- Project page con timeline eventi, task, note autosave, link e reminders
- Impostazioni progetto con logo, colore, note, sito e link social
- Calendario operativo su `/calendario`
- Programmazione post Facebook/Instagram su `/social`
- CRUD per tutte le entita principali
- Ricerca interna al progetto
- Filtro task aperti/completati
- Badge scadenze task
- Header con menu, tab Progetti, Guida e Impostazioni
- Landing page pubblica su `/`
- Demo guidata pubblica nella landing
- Pagina pricing pubblica su `/pricing` con piani Free, Solo e Studio
- Area operativa privata con sidebar su `/dashboard`
- Switch tema chiaro/scuro
- Label esplicative disattivabili dalle impostazioni
- Footer applicativo
- App privata con login/registrazione Supabase obbligatori

## Backend utenti e pricing

Gli utenti registrati vivono in Supabase Auth (`Authentication > Users`). Lo schema aggiunge due tabelle applicative:

- `profiles`: dati modificabili dell'utente, come `display_name`
- `subscriptions`: piano corrente (`free`, `solo`, `studio`) e stato abbonamento

Alla registrazione, il trigger `on_auth_user_created` crea automaticamente profilo e subscription Free.

Per pagamenti reali, collega Stripe Checkout e aggiorna `subscriptions` da una Edge Function o da un backend con service role key. Non inserire mai service role key o chiavi `sb_secret_...` nel frontend o nei secret pubblici del build.

## Pannello admin

La pagina privata `/admin` permette di gestire utenti e abbonamenti dal sito. Usa la Edge Function `supabase/functions/admin-users`, perche la lista completa degli utenti e le modifiche ai piani richiedono privilegi server.

Setup iniziale:

1. Rilancia `supabase/schema.sql` nel SQL editor Supabase.
2. Collega la CLI Supabase al progetto:

```bash
npx supabase login
npx supabase link --project-ref ykedlqvnwgrtmeroeche
```

3. Imposta almeno un amministratore con una di queste opzioni:

```sql
update public.profiles
set role = 'admin'
where id = (
  select id
  from auth.users
  where email = 'tua-email@example.com'
);
```

Oppure usa una allowlist server-side:

```bash
npx supabase secrets set FLOWDESK_ADMIN_EMAILS=tua-email@example.com
```

4. Deploy della funzione:

```bash
npx supabase functions deploy admin-users --no-verify-jwt
```

La funzione verifica comunque il JWT dell'utente e accetta solo account con ruolo `admin` o email presente in `FLOWDESK_ADMIN_EMAILS`.

Se nel pannello admin compare un errore di rete, di solito la Edge Function non e stata ancora pubblicata o manca il secret `FLOWDESK_ADMIN_EMAILS`.

## Social publishing

La pagina `/social` salva la programmazione dei post nel database (`social_posts`) con progetto, testo, media URL, piattaforme e data. Per pubblicare automaticamente su Facebook e Instagram serve un'integrazione server-side con Meta Graph API: token pagina, account Instagram Business collegato, permessi approvati e una funzione schedulata che pubblichi i post in stato `scheduled`.

## Deploy su GitHub Pages

Il repository include `.github/workflows/deploy.yml`.

1. Crea un repository GitHub e carica il progetto.
2. In GitHub vai su `Settings > Pages`.
3. In `Build and deployment`, imposta `Source` su `GitHub Actions`.
4. Se usi Supabase, aggiungi in `Settings > Secrets and variables > Actions`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Fai push su `main`.

La workflow costruisce `dist`, imposta il base path del repository e pubblica GitHub Pages.

## Aggiornare RLS su Supabase

Quando modifichi `supabase/schema.sql`, rilancialo nel SQL editor Supabase.

Se avevi creato dati prima di aggiungere `user_id`, quei record resteranno invisibili finche non vengono assegnati a un utente. Per un progetto nuovo, basta registrarsi nell'app e creare nuovi dati.
