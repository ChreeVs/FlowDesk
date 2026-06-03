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
- CRUD per tutte le entita principali
- Ricerca interna al progetto
- Filtro task aperti/completati
- Badge scadenze task
- Header con menu, tab Progetti, Guida e Impostazioni
- Landing page pubblica su `/`
- Demo guidata pubblica nella landing
- Area operativa privata con sidebar su `/dashboard`
- Switch tema chiaro/scuro
- Label esplicative disattivabili dalle impostazioni
- Footer applicativo
- App privata con login/registrazione Supabase obbligatori

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
