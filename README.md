# FlowDesk

FlowDesk e una scrivania operativa per progetti: timeline eventi, task, note, link e promemoria in una singola pagina.

## Stack

- React + TypeScript + Vite
- Supabase come database relazionale
- Modalita demo locale via `localStorage` quando le variabili Supabase non sono presenti
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

Le policy RLS in `supabase/schema.sql` sono aperte per un MVP single-user. Per produzione, restringile con autenticazione e ownership per utente.

## Funzioni

- Dashboard con lista progetti, creazione e conteggio task aperti
- Project page con timeline eventi, task, note autosave, link e reminders
- CRUD per tutte le entita principali
- Ricerca interna al progetto
- Filtro task aperti/completati
- Badge scadenze task
- Header con menu, tab Progetti, Impostazioni, Come funziona e Casi d'Utilizzo
- Switch tema chiaro/scuro
- Label esplicative disattivabili dalle impostazioni
- Footer applicativo
- Modal login/registrazione con Supabase Auth quando Supabase e configurato

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
