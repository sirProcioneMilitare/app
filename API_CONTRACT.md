# API Contract — Ganzelli Calendar

Contratto di tutte le API. Ogni endpoint è implementato in
`app/api/**/route.ts` e gli schemi di validazione sono in `lib/schemas.ts`
(esportati, riusabili lato client per i tipi).

## Convenzioni generali

- Tutte le risposte sono JSON.
- Tutte le date/ore sono in **UTC** nel database e nelle risposte (ISO 8601,
  es. `2026-09-01T16:30:00.000Z`). La conversione a `Europe/Rome` avviene
  solo in visualizzazione e nel calcolo della finestra oraria degli slot.
- Formato di errore unico:

  ```json
  { "error": { "code": "string", "message": "messaggio in italiano" } }
  ```

- Codici usati: `non_autenticato` (401), `non_autorizzato` (403),
  `input_non_valido` (400), `non_trovato` (404), `conflitto` (409),
  `errore_interno` (500).
- Autenticazione: cookie httpOnly `ganzelli_session` (JWT, 90 giorni),
  impostato da `POST /api/auth/login`. Tutte le route sotto `/api/*` lo
  richiedono tranne il login.

### I due ruoli

Le due persone hanno **gli stessi identici permessi**: entrambe vedono tutto
il calendario e possono prenotare qualsiasi attività. I ruoli sono `a` e `b`,
neutri di proposito; i nomi visualizzati arrivano dalle env var `NOME_A` /
`NOME_B` e non sono in database, così si cambiano senza migrazioni.

L'unica asimmetria è per singolo evento: a un invito risponde **solo chi lo
ha ricevuto**, non chi lo ha mandato.

### Attività "insieme" e impegni personali

Ogni attività ha un flag `insieme`:

- `insieme: true` → prenotarla crea un **invito** (`stato: "in_attesa"`).
  Compare sul calendario di entrambi solo quando l'altra persona accetta.
- `insieme: false` → **impegno personale**, nasce già `confermato`. L'altra
  persona lo vede sul calendario condiviso ma non deve accettare nulla.

### Chi occupa il calendario

Un'attività insieme impegna **entrambi**; un impegno personale impegna solo
chi l'ha creato. Due impegni personali di persone diverse possono quindi
sovrapporsi liberamente (uno cucina mentre l'altra si prende del tempo per
sé), mentre un'attività insieme non può accavallarsi con nulla che tocchi le
stesse persone. La regola è applicata **da un trigger nel database**, non
solo dal codice: gli stati che occupano sono `in_attesa` e `confermato`.

---

## Auth

### `POST /api/auth/login`

Chi può chiamarlo: chiunque (nessuna sessione richiesta).

Body: `{ "passphrase": "string" }`

Risposta `200`: `{ "role": "a" | "b", "nome": "string" }`. Imposta il cookie
di sessione.

Errori: `input_non_valido` (400), `non_autenticato` (401, passphrase errata).

### `POST /api/auth/logout`

Body: nessuno. Risposta `200`: `{ "ok": true }`. Cancella il cookie.

### `GET /api/auth/me`

Risposta `200`:

```json
{
  "role": "a",
  "nome": "...",
  "altro": { "role": "b", "nome": "..." }
}
```

---

## Attività

### `GET /api/activities`

Il catalogo di ciò che si può prenotare (solo `attivo = true`, ordinato per
`ordine`).

```json
{
  "activities": [
    {
      "id": "uuid",
      "slug": "yoga-insieme",
      "nome": "Yoga insieme",
      "descrizione": "string|null",
      "durata_minuti": 30,
      "emoji": "🧘",
      "insieme": true,
      "attivo": true,
      "ordine": 1
    }
  ]
}
```

---

## Eventi

### `GET /api/events`

Il calendario **condiviso**: restituisce gli impegni di entrambi, non filtra
per persona.

Query (tutti opzionali): `stato` (`in_attesa|confermato|rifiutato|annullato`),
`da`, `a` (date ISO, filtrano su `inizio_at`).

```json
{
  "events": [
    {
      "id": "uuid",
      "activity_type_id": "uuid",
      "inizio_at": "iso",
      "fine_at": "iso",
      "stato": "confermato",
      "creato_da": "a",
      "nota": "string|null",
      "nota_risposta": "string|null",
      "risposto_at": "iso|null",
      "creato_at": "iso",
      "aggiornato_at": "iso",
      "activity_types": {
        "slug": "...", "nome": "...", "emoji": "...",
        "durata_minuti": 30, "insieme": true
      }
    }
  ]
}
```

### `POST /api/events`

Body:

```json
{
  "activity_slug": "string",
  "inizio_at": "iso (con offset)",
  "nota": "string (opzionale, max 2000)"
}
```

`fine_at` è calcolata da `inizio_at + durata_minuti`. Lo `stato` iniziale
dipende dall'attività: `in_attesa` se `insieme`, `confermato` altrimenti.
`creato_da` viene dalla sessione.

Regole: l'attività deve esistere ed essere attiva (404); `inizio_at` non può
essere nel passato (400); non deve sovrapporsi a impegni che coinvolgono le
stesse persone (409, vincolo applicato dal database).

Risposta `201`: `{ "event": { ... } }`.

### `PATCH /api/events/:id`

Risponde a un invito. Body:

```json
{ "stato": "confermato" | "rifiutato", "nota_risposta": "string (opzionale)" }
```

Consentito **solo a chi ha ricevuto l'invito** e solo se è ancora
`in_attesa`.

Risposta `200`: `{ "event": { ... } }`.

Errori: `input_non_valido` (400), `non_autorizzato` (403, stai rispondendo a
un invito tuo), `non_trovato` (404), `conflitto` (409, non è più `in_attesa`,
oppure nel frattempo si è creata una sovrapposizione).

### `DELETE /api/events/:id`

Annulla un impegno (`stato -> annullato`). Può farlo **chiunque sia
coinvolto**: entrambi per un'attività insieme, solo chi l'ha creato per un
impegno personale. Vale sia per ritirare un invito mandato, sia per disdire
qualcosa di già confermato.

Risposta `200`: `{ "event": { ... } }`.

Errori: `input_non_valido` (400), `non_autorizzato` (403, l'impegno non ti
riguarda), `non_trovato` (404), `conflitto` (409, già annullato o rifiutato).

### `GET /api/events/slots?activity=slug&giorno=YYYY-MM-DD`

Orari di inizio possibili per un'attività in un giorno, nella finestra
**07:00–23:00 Europe/Rome**, a passi di 15 minuti, esclusi gli orari già
occupati **dalle persone che quell'attività impegnerebbe** e gli orari
passati.

```json
{
  "activity": "yoga-insieme",
  "giorno": "2026-09-01",
  "durata_minuti": 30,
  "insieme": true,
  "slots": ["2026-09-01T16:00:00.000Z", "..."]
}
```

Ogni elemento è un orario di **inizio** (UTC); la fine è implicita.

Errori: `input_non_valido` (400), `non_trovato` (404, attività inesistente o
non attiva).
