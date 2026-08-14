# API Contract — SOS Burnout

Contratto di tutte le API del backend. Riferimento per chi costruisce il
frontend: ogni endpoint qui descritto è implementato in `app/api/**/route.ts`
e gli schemi di validazione sono in `lib/schemas.ts` (esportati, riusabili
lato client per i tipi TypeScript).

## Convenzioni generali

- Tutte le risposte sono JSON.
- Tutte le date/ore sono in **UTC** nel DB e nelle risposte JSON (formato
  ISO 8601, es. `2026-08-12T18:30:00.000Z`), salvo dove specificato
  diversamente. La conversione a `Europe/Rome` avviene solo per i messaggi
  Telegram e nei calcoli di "giorno corrente" (es. sblocco contenuti,
  finestra slot).
- Formato di errore unico:

  ```json
  { "error": { "code": "string", "message": "messaggio in italiano" } }
  ```

  Alcuni endpoint aggiungono campi extra allo stesso livello di `error`
  quando serve (es. `POST /api/sos` in caso di debounce) — sono annotati
  esplicitamente sotto.

- Codici di errore usati: `non_autenticato` (401), `non_autorizzato` (403),
  `input_non_valido` (400), `non_trovato` (404), `conflitto` (409),
  `errore_interno` (500).
- Autenticazione: cookie httpOnly `sos_session` (JWT, 90 giorni), impostato
  da `POST /api/auth/login`. Tutte le route sotto `/api/*` lo richiedono
  tranne `POST /api/auth/login`, `POST /api/telegram/webhook` e
  `/api/cron/*` (questi ultimi due hanno un'autenticazione propria, vedi le
  rispettive sezioni). Il middleware verifica che il cookie sia presente e
  valido (401 altrimenti); ogni route poi verifica anche il ruolo specifico
  quando serve (403 se non ammesso).
- "Chi può chiamarlo" indica il ruolo richiesto **oltre** all'autenticazione
  base: `him`, `her`, o `him|her` (entrambi, qualunque sessione valida).

---

## Auth

### `POST /api/auth/login`

Chi può chiamarlo: chiunque (nessuna sessione richiesta).

Body:

```json
{ "passphrase": "string" }
```

Risposta `200`:

```json
{ "role": "him" | "her" }
```

Effetto collaterale: imposta il cookie `sos_session` (httpOnly, secure,
sameSite=lax, 90 giorni).

Errori: `input_non_valido` (400, passphrase mancante/vuota),
`non_autenticato` (401, passphrase non corrisponde a nessun ruolo).

### `POST /api/auth/logout`

Chi può chiamarlo: `him|her`.

Body: nessuno. Risposta `200`: `{ "ok": true }`. Cancella il cookie.

### `GET /api/auth/me`

Chi può chiamarlo: `him|her`.

Risposta `200`: `{ "role": "him" | "her" }`.

---

## Prenotazioni

### `GET /api/services`

Chi può chiamarlo: `him|her`.

Risposta `200`:

```json
{
  "services": [
    {
      "id": "uuid",
      "slug": "yoga-insieme",
      "nome": "Yoga insieme",
      "descrizione": "string|null",
      "durata_minuti": 30,
      "emoji": "🧘",
      "attivo": true,
      "richiede_anticipo_ore": null,
      "ordine": 1,
      "creato_at": "iso"
    }
  ]
}
```

Solo i servizi con `attivo=true`, ordinati per `ordine`.

### `GET /api/bookings`

Chi può chiamarlo: `him|her`.

Query string (tutti opzionali):

- `stato`: uno tra `richiesta|confermata|rifiutata|completata|annullata`
- `da`, `a`: date ISO (filtrano su `inizio_at`, `da` incluso, `a` incluso)

Risposta `200`:

```json
{
  "bookings": [
    {
      "id": "uuid",
      "service_type_id": "uuid",
      "inizio_at": "iso",
      "fine_at": "iso",
      "stato": "richiesta",
      "nota_richiedente": "string|null",
      "nota_risposta": "string|null",
      "creata_da": "him" | "her",
      "creato_at": "iso",
      "aggiornato_at": "iso",
      "service_types": { "slug": "...", "nome": "...", "emoji": "...", "durata_minuti": 30 }
    }
  ]
}
```

Errori: `input_non_valido` (400, query non valida).

### `POST /api/bookings`

Chi può chiamarlo: `him|her`.

Body:

```json
{
  "service_slug": "string",
  "inizio_at": "iso (con offset, es 2026-08-13T10:00:00+02:00)",
  "nota_richiedente": "string (opzionale, max 2000)"
}
```

Risposta `201`: `{ "booking": { ...come sopra } }`. `fine_at` è calcolato
automaticamente da `inizio_at + durata_minuti` del servizio. `stato` parte
sempre da `richiesta`. `creata_da` è preso dal ruolo della sessione.

Regole applicate (in ordine):

1. Il servizio deve esistere ed essere attivo (`non_trovato` 404).
2. `inizio_at` non può essere nel passato (`input_non_valido` 400).
3. Se il servizio ha `richiede_anticipo_ore`, `inizio_at` deve rispettarlo
   (`input_non_valido` 400).
4. Non deve sovrapporsi a nessuna prenotazione non `rifiutata`/`annullata`
   (vincolo a livello DB, exclusion constraint) → `conflitto` 409.

Errori: `input_non_valido` (400), `non_trovato` (404, slug inesistente o
non attivo), `conflitto` (409, sovrapposizione).

### `PATCH /api/bookings/:id`

Chi può chiamarlo: **solo `her`**.

Body:

```json
{ "stato": "confermata" | "rifiutata", "nota_risposta": "string (opzionale, max 2000)" }
```

Consentito solo se la prenotazione è attualmente in stato `richiesta`.

Risposta `200`: `{ "booking": { ... } }`.

Errori: `input_non_valido` (400), `non_autorizzato` (403, ruolo `him`),
`non_trovato` (404), `conflitto` (409, la prenotazione non è più in
`richiesta`).

### `DELETE /api/bookings/:id`

Chi può chiamarlo: `him|her`. Annulla (`stato -> annullata`) una
prenotazione in stato `richiesta` o `confermata`.

Risposta `200`: `{ "booking": { ... } }`.

Errori: `input_non_valido` (400, id non valido), `non_trovato` (404),
`conflitto` (409, stato non annullabile).

### `GET /api/bookings/slots?service=slug&giorno=YYYY-MM-DD`

Chi può chiamarlo: `him|her`.

Calcola gli slot liberi per un servizio in un giorno, nella finestra
**07:00–22:00 Europe/Rome**, a passi di 15 minuti, escludendo gli orari già
occupati da prenotazioni non `rifiutata`/`annullata` e rispettando
l'eventuale `richiede_anticipo_ore` del servizio e il fatto che non si può
prenotare nel passato.

Risposta `200`:

```json
{
  "service": "yoga-insieme",
  "giorno": "2026-08-13",
  "durata_minuti": 30,
  "slots": ["2026-08-13T07:00:00.000Z", "2026-08-13T07:15:00.000Z", "..."]
}
```

Ogni elemento di `slots` è l'orario di **inizio** possibile (UTC); l'orario
di fine è implicito (`inizio + durata_minuti`).

Errori: `input_non_valido` (400, query mancante/malformata), `non_trovato`
(404, servizio inesistente/non attivo).

---

## SOS

Il flusso è descritto per esteso nel README. Riassunto dei dati.

### `POST /api/sos`

Chi può chiamarlo: **solo `him`**.

Body:

```json
{ "livello": 1 | 2 | 3, "nota": "string (opzionale, max 2000)" }
```

Livelli: `1` = caffè e biscotti in silenzio, `2` = spuntino salato serio,
`3` = intervento in presenza.

Debounce: se esiste già un SOS in stato `aperta` o `presa_in_carico`
creato meno di 20 minuti fa, risponde `409` con:

```json
{
  "error": { "code": "conflitto", "message": "..." },
  "sos_esistente": { "...sos_requests row..." },
  "minuti_rimanenti": 12
}
```

(nota: qui il body estende il formato di errore standard con
`sos_esistente` e `minuti_rimanenti` allo stesso livello di `error`, per
permettere al frontend di mostrare direttamente il countdown residuo.)

In assenza di debounce, risposta `201`:

```json
{
  "sos": {
    "id": "uuid",
    "livello": 1,
    "nota": "string|null",
    "stato": "aperta",
    "eta_minuti": null,
    "presa_in_carico_at": null,
    "conclusa_at": null,
    "telegram_message_id": 123 | null,
    "creato_at": "iso",
    "aggiornato_at": "iso"
  }
}
```

L'SOS viene **sempre salvato e restituito con `201`**, anche se l'invio del
messaggio Telegram fallisce (bot giù, rete, ecc.): in quel caso
`telegram_message_id` resta `null` e l'errore viene solo loggato
server-side.

Errori: `input_non_valido` (400), `non_autorizzato` (403, ruolo `her`),
`conflitto` (409, debounce — vedi sopra).

### `GET /api/sos/active`

Chi può chiamarlo: `him|her`.

Risposta `200` (nessun SOS aperto/preso in carico):

```json
{ "sos": null, "countdown_secondi": null, "eta_at": null }
```

Risposta `200` (SOS attivo):

```json
{
  "sos": { "...sos_requests row..." },
  "countdown_secondi": 480,
  "eta_at": "iso|null"
}
```

`countdown_secondi` ed `eta_at` sono `null` finché l'SOS è `aperta` (nessuna
ETA ancora comunicata); diventano valorizzati quando passa a
`presa_in_carico` (calcolati da `presa_in_carico_at + eta_minuti`). Il
countdown è già calcolato server-side: il frontend deve solo renderizzarlo
(e farlo scendere lato client, se vuole, senza ripollare in continuazione).

### `PATCH /api/sos/:id`

Chi può chiamarlo: `him|her`.

Conclude un SOS ancora attivo — è il "Sto meglio" dell'app. Senza questo un
SOS passato a `presa_in_carico` non tornerebbe mai indietro e
`GET /api/sos/active` continuerebbe a restituirlo per sempre.

Body: `{ "stato": "conclusa" }` (unico valore accettato). Consentito solo se
l'SOS è in stato `aperta` o `presa_in_carico`.

Risposta `200`: `{ "sos": { ...con stato "conclusa" e conclusa_at valorizzato } }`.

Nota sul debounce: il debounce di `POST /api/sos` guarda solo gli SOS in
stato `aperta`/`presa_in_carico`, quindi una volta concluso se ne può
mandare subito un altro senza aspettare i 20 minuti.

Errori: `input_non_valido` (400), `non_trovato` (404), `conflitto` (409,
l'SOS è già `conclusa` o `scaduta`).

### `GET /api/sos/history?mese=YYYY-MM`

Chi può chiamarlo: `him|her`.

Risposta `200`:

```json
{
  "mese": "2026-08",
  "sos": [ "...sos_requests rows, ordinate per creato_at asc..." ],
  "aggregati": {
    "per_livello": { "1": 4, "2": 2, "3": 1 },
    "per_giorno_settimana": { "0": 1, "1": 0, "2": 3, "3": 0, "4": 2, "5": 1, "6": 0 }
  }
}
```

`per_giorno_settimana` usa la convenzione JS (`0` = domenica … `6` =
sabato), calcolata in `Europe/Rome`.

Errori: `input_non_valido` (400, `mese` mancante/malformato).

---

## Disponibilità

Riga singola in DB, rappresenta se lei è raggiungibile per un SOS di
livello 3.

### `GET /api/availability`

Chi può chiamarlo: `him|her`.

Risposta `200`:

```json
{ "availability": { "disponibile": true, "messaggio": "string|null", "aggiornata_at": "iso" } }
```

### `PUT /api/availability`

Chi può chiamarlo: **solo `her`**.

Body:

```json
{ "disponibile": true, "messaggio": "string|null (opzionale, max 500)" }
```

Risposta `200`: come `GET`. Errori: `input_non_valido` (400),
`non_autorizzato` (403, ruolo `him`).

---

## Buoni

### `GET /api/rewards`

Chi può chiamarlo: `him|her`. Risposta `200`:

```json
{
  "rewards": [
    {
      "id": "uuid",
      "titolo": "string",
      "descrizione": "string|null",
      "costo_punti": "int|null",
      "usi_massimi": "int|null",
      "attivo": true,
      "creato_at": "iso"
    }
  ]
}
```

Solo i buoni con `attivo=true`.

### `POST /api/rewards/:id/redeem`

Chi può chiamarlo: `him|her`.

Body: nessuno. Risposta `201`:

```json
{
  "redemption": {
    "id": "uuid",
    "reward_id": "uuid",
    "riscattato_at": "iso",
    "stato": "richiesto",
    "onorato_at": null,
    "rewards": { "titolo": "...", "descrizione": "..." }
  }
}
```

Il limite `usi_massimi` (se impostato) è applicato **a livello di DB** da
un trigger: superato il limite, l'insert fallisce e la route risponde
`409`.

Errori: `non_trovato` (404, buono inesistente o non attivo), `conflitto`
(409, `usi_massimi` raggiunto).

### `GET /api/redemptions`

Chi può chiamarlo: `him|her`. Risposta `200`:

```json
{
  "redemptions": [
    {
      "id": "uuid",
      "reward_id": "uuid",
      "riscattato_at": "iso",
      "stato": "richiesto" | "onorato" | "scaduto",
      "onorato_at": "iso|null",
      "rewards": { "titolo": "...", "descrizione": "..." }
    }
  ]
}
```

Ordinati per `riscattato_at` decrescente.

### `PATCH /api/redemptions/:id`

Chi può chiamarlo: **solo `her`**. Onora un riscatto.

Body: `{ "stato": "onorato" }` (unico valore accettato). Consentito solo se
il riscatto è in stato `richiesto`. Risposta `200`: `{ "redemption": { ... } }`
con `onorato_at` valorizzato.

Errori: `input_non_valido` (400), `non_autorizzato` (403, ruolo `him`),
`non_trovato` (404), `conflitto` (409, stato non `richiesto`).

---

## Contenuti quotidiani

### `GET /api/daily`

Chi può chiamarlo: `him|her`. Restituisce i drop pubblicati **per oggi**
(data odierna in `Europe/Rome`).

- Per `her`: nessuna restrizione — vede subito quello che ha caricato,
  anche prima delle 8:30 o se `sbloccato=false` (utile per verificare).
- Per `him`: solo i drop con `sbloccato=true` **e** solo se l'ora corrente
  a Roma è >= 08:30. Se non c'è nulla di visibile in quel momento, risponde
  **`404`**, mai un flag `bloccato: true` col contenuto sotto.

Risposta `200`:

```json
{
  "drops": [
    {
      "id": "uuid",
      "tipo": "audio" | "testo",
      "contenuto_testo": "string|null",
      "storage_path": "string|null",
      "audio_url": "string firmata, valida 5 minuti|null",
      "pubblicato_per": "YYYY-MM-DD",
      "sbloccato": true,
      "ascoltato_at": "iso|null",
      "creato_at": "iso"
    }
  ]
}
```

Errori: `non_trovato` (404, nessun contenuto visibile ora).

### `POST /api/daily/:id/listened`

Chi può chiamarlo: `him|her`. Segna un drop come ascoltato (`ascoltato_at =
now()`). Risposta `200`: `{ "drop": { ... } }`.

Errori: `input_non_valido` (400, id non valido), `non_trovato` (404).

### `POST /api/daily`

Chi può chiamarlo: **solo `her`**. Upload di un contenuto.

Content-Type: **`multipart/form-data`** (non JSON, perché può includere un
file). Campi:

- `tipo`: `"audio"` o `"testo"` (obbligatorio)
- `pubblicato_per`: `YYYY-MM-DD` (obbligatorio)
- `contenuto_testo`: stringa, obbligatoria solo se `tipo=testo`
- `file`: file audio, obbligatorio solo se `tipo=audio` — caricato dal
  backend su Supabase Storage (bucket privato `daily-media`), mai
  direttamente dal browser

Risposta `201`: `{ "drop": { ...come sopra, senza audio_url... } }`.

Errori: `input_non_valido` (400, campi mancanti/incoerenti col `tipo`),
`non_autorizzato` (403, ruolo `him`), `conflitto` (409, esiste già un drop
con lo stesso `tipo` per lo stesso `pubblicato_per` — vincolo `unique` a
livello DB).

### `GET /api/roost/random`

Chi può chiamarlo: `him|her`. Pesca una foto a caso dal pollaio, con
probabilità inversamente proporzionale a `mostrata_count` (le foto mai
viste hanno più probabilità di uscire), poi incrementa il contatore e
aggiorna `ultima_volta_at`.

Risposta `200`:

```json
{
  "media": {
    "id": "uuid",
    "storage_path": "string",
    "image_url": "string firmata, valida 5 minuti",
    "didascalia": "string|null",
    "mostrata_count": 4,
    "ultima_volta_at": "iso",
    "creato_at": "iso"
  }
}
```

Errori: `non_trovato` (404, nessuna foto in `roost_media`).

---

## Umore

### `POST /api/mood`

Chi può chiamarlo: `him|her`.

Body: `{ "valore": 1-5, "nota": "string (opzionale, max 1000)" }`.

Massimo una registrazione ogni 4 ore (vincolo a livello DB, exclusion
constraint sulla finestra temporale) → oltre il limite, `409`.

Risposta `201`: `{ "mood": { "id", "valore", "nota", "registrato_at" } }`.

Errori: `input_non_valido` (400), `conflitto` (409, meno di 4 ore
dall'ultima registrazione).

### `GET /api/mood?giorni=30`

Chi può chiamarlo: `him|her`. `giorni` opzionale, default `30`.

Risposta `200`:

```json
{ "mood_logs": [ { "id", "valore", "nota", "registrato_at" } ] }
```

Ordinati per `registrato_at` crescente.

---

## Push

### `POST /api/push/subscribe`

Chi può chiamarlo: `him|her`. Registra (o aggiorna, upsert su `endpoint`)
una `PushSubscription` del browser per il ruolo della sessione corrente.

Body:

```json
{ "endpoint": "url", "keys": { "p256dh": "string", "auth": "string" } }
```

Risposta `201`: `{ "ok": true }`. Errori: `input_non_valido` (400).

### `DELETE /api/push/subscribe`

Chi può chiamarlo: `him|her`. Body: `{ "endpoint": "url" }`. Risposta
`200`: `{ "ok": true }` (idempotente, anche se l'endpoint non esisteva).

---

## Webhook Telegram

### `POST /api/telegram/webhook`

Chi può chiamarlo: Telegram (non richiede il cookie di sessione — è
escluso dal middleware). **Autenticazione**: header
`X-Telegram-Bot-Api-Secret-Token` deve corrispondere a
`TELEGRAM_WEBHOOK_SECRET`, verificato **prima di qualunque altra cosa**;
se non corrisponde, `401` e nessun'altra elaborazione.

Gestisce gli update di tipo `callback_query` generati dai tre bottoni
mandati con l'SOS (`eta_10`, `eta_30`, `annulla`, con `callback_data` nel
formato `sos:<id>:<azione>`):

- `eta_10` / `eta_30`: porta l'SOS a `presa_in_carico`, imposta
  `eta_minuti` e `presa_in_carico_at`, manda una web push a lui
  ("spuntino in arrivo tra N minuti").
- `annulla`: porta l'SOS a `conclusa` (`conclusa_at = now()`).

In tutti i casi: risponde al bottone con `answerCallbackQuery`, poi
modifica il messaggio originale con `editMessageText` togliendo la
tastiera (mostra lo stato aggiornato invece dei bottoni ancora attivi). Se
l'SOS referenziato non esiste o non è più in stato `aperta` (già gestito),
risponde comunque al callback con un messaggio informativo e non tocca
nulla.

Risposta: sempre `200 { "ok": true }` per gli update che non richiedono
altra azione (es. update senza `callback_query`), così Telegram non
ritenta la consegna.

Errori: `401` (secret token mancante/non valido).

---

## Cron

Autenticazione: header `Authorization: Bearer $CRON_SECRET`, verificato
per primo — nessun'altra elaborazione se manca o non corrisponde (`401`).
Questi endpoint sono esclusi dal middleware basato su cookie (Vercel Cron
non può inviare il nostro cookie di sessione).

Nota tecnica: **Vercel Cron invoca con `GET`**; entrambe le route accettano
sia `GET` che `POST` con la stessa logica — `POST` resta disponibile per
test manuali (`curl -X POST ... -H "Authorization: Bearer ..."`), `GET` è
quello effettivamente schedulato in `vercel.json`.

### `/api/cron/daily-unlock`

Sblocca (`sbloccato = true`) i drop di oggi (`pubblicato_per` = oggi in
`Europe/Rome`) se non lo sono già, ma solo se l'orario locale corrente è
già >= 08:30 — per questo lo schedule in `vercel.json` lo richiama più
volte nella finestra 06:00–09:00 UTC (`*/15 6-9 * * *`): un singolo orario
fisso in UTC non seguirebbe il cambio CET/CEST, mentre così il primo giro
utile dopo le 08:30 locali fa lo sblocco e i successivi sono no-op. Se
sblocca qualcosa, manda una push a lui.

Risposta `200`: `{ "sbloccati": [ { "id", "tipo" } ] }` (vuoto se non c'era
nulla da sbloccare o non sono ancora le 08:30 locali).

### `/api/cron/housekeeping`

Schedulato ogni ora (`0 * * * *`). In un'unica chiamata:

1. Porta a `completata` le prenotazioni `confermata` la cui `fine_at` è
   passata.
2. Porta a `scaduta` gli SOS `aperta` creati da più di 3 ore (nessuno li ha
   mai presi in carico).
3. Porta a `conclusa` gli SOS `presa_in_carico` creati da più di 3 ore: sono
   stati gestiti ma nessuno ha premuto "Sto meglio", e senza questa pulizia
   resterebbero attivi per sempre in `GET /api/sos/active`.
4. Porta a `scaduto` i riscatti `richiesto` più vecchi di 30 giorni.

Risposta `200`:

```json
{
  "prenotazioni_completate": 2,
  "sos_scaduti": 0,
  "sos_conclusi": 1,
  "riscatti_scaduti": 1
}
```

(i numeri sono conteggi delle righe aggiornate in quella chiamata, non
totali cumulativi).
