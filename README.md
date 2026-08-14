# Ganzelli Calendar

Calendario condiviso privato per due persone. Si prenotano attività: alcune
si fanno **insieme** (e allora parte un invito che l'altra persona deve
accettare), altre sono **impegni personali** che finiscono direttamente sul
calendario condiviso.

Entrambi vedono la stessa identica app e gli impegni dell'altro. Il contratto
di ogni endpoint è in **[`API_CONTRACT.md`](./API_CONTRACT.md)**.

## Come funziona

- **Insieme** (yoga, palestra, passeggiata col cane, serata, cena fuori,
  colazione a letto, massaggio): prenotandola parte un invito. L'altra
  persona lo trova in cima al calendario e risponde **Accetto** / **No**.
  Solo se accetta, l'impegno compare su entrambi i calendari.
- **Personali** (cucino io, tempo libero per me): nessun invito, vanno
  dritti sul calendario condiviso. L'altra persona li vede e sa che sei
  occupato.
- **Nessuno può essere in due posti insieme**: un'attività di coppia impegna
  entrambi, un impegno personale solo chi l'ha creato. Due impegni personali
  diversi possono quindi sovrapporsi (uno cucina, l'altra ha tempo libero),
  un'attività insieme no. Il vincolo è applicato da un trigger nel database,
  non solo dal codice.

Il catalogo delle attività è tutto in `supabase/seed.sql`: aggiungerne,
toglierne o rinominarne una vuol dire modificare quel file, senza toccare
codice.

## Stack

- Next.js 15 (App Router) + TypeScript strict, deploy su Vercel
- Supabase Postgres (client server-side con la service role key, mai esposta
  al browser)
- Zod per validare ogni input

Migrazioni SQL numerate in `supabase/migrations/`, catalogo in
`supabase/seed.sql`. Nessun cron, nessun servizio esterno.

## Sviluppo locale

```bash
npm install
cp .env.example .env.local   # vedi sotto
npm run dev
```

Comandi utili:

```bash
npm run typecheck   # tsc --noEmit
npm run build       # build di produzione (fallisce se ci sono errori di tipo)
```

## Setup Supabase

1. Crea un progetto su [supabase.com](https://supabase.com).
2. Applica le migrazioni in ordine:

   ```bash
   supabase link --project-ref <project-ref>
   supabase db push
   ```

   (oppure incolla i file di `supabase/migrations/` in ordine numerico nel
   SQL editor della dashboard).
3. Esegui `supabase/seed.sql` per il catalogo delle attività.
4. Copia `SUPABASE_URL` e la chiave `service_role` (Project Settings → API)
   nelle variabili d'ambiente.

## Variabili d'ambiente

| Variabile | A cosa serve |
| --- | --- |
| `SUPABASE_URL` | URL del progetto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Chiave service role, **solo server-side** |
| `JWT_SECRET` | Firma del cookie di sessione, es. `openssl rand -base64 48` |
| `PASSPHRASE_A` | Passphrase della prima persona |
| `PASSPHRASE_B` | Passphrase della seconda persona |
| `NOME_A` | Nome mostrato per la prima persona |
| `NOME_B` | Nome mostrato per la seconda persona |

Non c'è registrazione utenti: le due passphrase sono le uniche credenziali, e
determinano chi sei. I nomi stanno solo qui, non in database, quindi si
cambiano modificando la variabile e rifacendo il deploy.

## Deploy su Vercel

1. Collega il repository su [vercel.com](https://vercel.com/new).
2. Imposta le variabili d'ambiente qui sopra in Project Settings →
   Environment Variables.
3. Deploya. Non serve altro: niente cron, niente webhook, niente servizi
   esterni da configurare.

## Note di design

- **Due utenti, non un sistema utenti**: l'auth è due passphrase confrontate
  in tempo costante che producono un cookie con un JWT `{ role }`. Niente
  registrazione, niente ruoli dinamici, niente pannello admin.
- **Ruoli simmetrici**: i due ruoli (`a` e `b`) possono fare esattamente le
  stesse cose. L'unica differenza per singolo evento è che a un invito
  risponde solo chi lo ha ricevuto.
- **Vincoli nel database**: la regola sulle sovrapposizioni vive in un
  trigger Postgres, quindi vale anche per modifiche fatte a mano dalla
  dashboard Supabase.
