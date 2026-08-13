# Ossigeno — SOS Burnout

App privata per due persone (una coppia): backend Next.js/Supabase più il
frontend mobile-first "Ossigeno", costruito a partire da un design handoff
(`Ossigeno.dc.html`, fornito come prototipo di riferimento, non come
codice) e collegato alle API reali sotto `app/api/**`. Il contratto
completo di ogni endpoint (metodo, body, risposta, errori, chi può
chiamarlo) è in **[`API_CONTRACT.md`](./API_CONTRACT.md)**. Restano anche
le pagine di prova non stilizzate sotto `/test/*`, utili per colpire un
singolo endpoint senza passare dall'interfaccia vera.

## Frontend

- `/login` — passphrase, imposta il cookie di sessione.
- `/oggi`, `/prenota`, `/sollievo` (+ `/sollievo/bingo`), `/buoni` — le
  quattro tab dell'app di lui (ruolo `him`), dietro `app/(app)/layout.tsx`.
- `/regia` — schermo dedicato per lei (ruolo `her`): disponibilità,
  richieste da confermare, buoni da onorare, registrazione del drop del
  giorno dopo.

Le due sessioni sono realmente separate (passphrase diverse), quindi la
sessione `her` atterra direttamente su `/regia` invece che dietro un
bottone nascosto in un device condiviso, come nel design originale. Buoni,
prenotazioni, SOS e umore usano le API vere end-to-end; bingo,
respirazione e rituale di shutdown sono interazioni locali (nessuna tabella
nello schema li richiede); ruota premi, bonus-bingo e bigliettini
programmati del design non sono stati implementati per questo giro (il
backend non ha tabelle per loro).

## Stack

- Next.js 15 (App Router) + TypeScript strict, deploy su Vercel
- Supabase Postgres (client server-side con la service role key, mai
  esposta al browser) + Supabase Storage (bucket privati, accesso solo via
  signed URL generate dal backend)
- Zod per validare ogni input
- `web-push` per le notifiche verso il browser di lui
- Telegram Bot API per le notifiche verso lei
- Vercel Cron per i job schedulati

Migrazioni SQL numerate in `supabase/migrations/`, dati iniziali in
`supabase/seed.sql`.

## Sviluppo locale

```bash
npm install
cp .env.example .env.local   # vedi sotto per come compilarlo
npm run dev
```

Apri `http://localhost:3000` — trovi i link a tutte le pagine di prova
(`/test/auth`, `/test/bookings`, `/test/sos`, `/test/availability`,
`/test/daily`, `/test/rewards`, `/test/mood`, `/test/push`).

Comandi utili:

```bash
npm run typecheck   # tsc --noEmit
npm run build        # build di produzione (fallisce se ci sono errori di tipo)
npm run lint          # next lint
```

## Setup di un nuovo progetto Supabase

1. Crea un progetto su [supabase.com](https://supabase.com).
2. Applica le migrazioni, in ordine, con la CLI Supabase:

   ```bash
   supabase link --project-ref <il-tuo-project-ref>
   supabase db push
   ```

   (oppure incolla il contenuto di ogni file in `supabase/migrations/`,
   in ordine numerico, nel SQL editor della dashboard).
3. Esegui `supabase/seed.sql` per i dati iniziali (servizi prenotabili e
   buoni).
4. I bucket Storage `daily-media` e `roost-media` vengono creati dalla
   migrazione `0013_storage_buckets.sql` (privati — l'accesso passa sempre
   dal backend, che genera signed URL a tempo).
5. Carica manualmente qualche foto in `roost-media` e inserisci le righe
   corrispondenti in `roost_media` (storage_path + didascalia) — non c'è
   un seed per le foto, ovviamente.
6. Copia `SUPABASE_URL` e la `service_role` key (Project Settings → API)
   nelle env var.

## Variabili d'ambiente

Vedi `.env.example` per l'elenco completo. Note su come generarle:

- `JWT_SECRET`: una stringa lunga e casuale, es. `openssl rand -base64 48`.
- `PASSPHRASE_HIM` / `PASSPHRASE_HER`: le due passphrase, scelte da voi.
  Non c'è registrazione utenti: sono letteralmente le uniche due "password"
  dell'app.
- `TELEGRAM_BOT_TOKEN`: crea un bot con [@BotFather](https://t.me/BotFather)
  su Telegram, copia il token.
- `TELEGRAM_CHAT_ID`: l'id della chat (privata, tra voi due o con lei) a cui
  il bot manda i messaggi SOS. Il modo più semplice: manda un messaggio al
  bot, poi chiama `https://api.telegram.org/bot<TOKEN>/getUpdates` e leggi
  `message.chat.id`.
- `TELEGRAM_WEBHOOK_SECRET`: una stringa casuale a tua scelta — Telegram la
  rimanda nell'header `X-Telegram-Bot-Api-Secret-Token` a ogni chiamata al
  webhook, e la route la verifica prima di processare qualunque cosa.
- `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`: generale con
  `npx web-push generate-vapid-keys`.
- `VAPID_SUBJECT`: `mailto:tuaemail@esempio.com`.
- `CRON_SECRET`: una stringa casuale — Vercel la usa per autenticare le
  chiamate ai cron job (vedi sotto).

## Deploy su Vercel

1. Collega il repository su [vercel.com](https://vercel.com/new).
2. Imposta tutte le variabili d'ambiente elencate sopra in Project
   Settings → Environment Variables (per Production **e** Preview, se le
   usi).
3. Vercel legge automaticamente `vercel.json` e registra i due cron job:
   - `/api/cron/daily-unlock`: ogni 15 minuti tra le 06:00 e le 09:00 UTC
     (copre le 08:30 sia in CET che in CEST — vedi `API_CONTRACT.md` per il
     perché di questo schedule).
   - `/api/cron/housekeeping`: ogni ora.

   Vercel Cron invoca questi endpoint con `GET` e, se `CRON_SECRET` è
   impostata come env var, aggiunge automaticamente l'header
   `Authorization: Bearer $CRON_SECRET` — non serve altra configurazione.
4. Deploya. Dopo il primo deploy, registra il webhook Telegram puntato al
   dominio Vercel:

   ```bash
   APP_URL=https://il-tuo-dominio.vercel.app npm run setup:telegram
   ```

   (richiede `TELEGRAM_BOT_TOKEN` e `TELEGRAM_WEBHOOK_SECRET` nell'ambiente
   locale da cui lanci lo script — stessi valori messi su Vercel).
5. Fatto. Testa il flusso SOS: `POST /api/sos` con la sessione di lui,
   verifica che arrivi il messaggio su Telegram con i tre bottoni, premine
   uno e controlla che `GET /api/sos/active` rifletta il cambio di stato.

## Note di design

- **Due utenti, non un sistema utenti**: l'auth è due passphrase in env
  var, confrontate in tempo costante, che producono un cookie con un JWT
  `{ role }`. Niente registrazione, niente ruoli dinamici, niente pannello
  admin.
- **Vincoli nel DB, non solo in app**: sovrapposizioni di prenotazioni,
  limite di 4 ore tra due registrazioni di umore e limite `usi_massimi` sui
  buoni sono `CHECK`/`EXCLUDE`/trigger a livello Postgres, non solo
  controlli applicativi aggirabili con una query diretta.
- **Telegram non deve mai far cadere un SOS**: tutte le chiamate a
  Telegram sono isolate in `lib/telegram.ts` e non lanciano mai eccezioni;
  se il bot è giù, l'SOS viene comunque salvato e l'endpoint risponde
  normalmente.
- **Storage privato**: i bucket non sono pubblici. Ogni contenuto (audio
  del giorno, foto del pollaio) viene servito tramite signed URL a tempo,
  generata dal backend con la service role key.
