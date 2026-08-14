-- Ganzelli Calendar — schema completo.
--
-- Due persone con gli stessi identici permessi: i ruoli sono 'a' e 'b',
-- neutri di proposito. I nomi visualizzati stanno nelle env var NOME_A /
-- NOME_B e non nel database, cosi' si cambiano senza migrazioni.

create extension if not exists pgcrypto;

create type app_role as enum ('a', 'b');

-- in_attesa  -> invito mandato, l'altra persona deve rispondere
-- confermato -> sul calendario di chi partecipa
-- rifiutato  -> invito declinato
-- annullato  -> disdetto dopo essere stato creato/confermato
create type event_stato as enum ('in_attesa', 'confermato', 'rifiutato', 'annullato');

create table activity_types (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  nome text not null,
  descrizione text,
  durata_minuti int not null check (durata_minuti > 0),
  emoji text,
  -- true  = attivita' di coppia: parte un invito che l'altro deve accettare
  -- false = impegno personale: finisce subito sul calendario, visibile a entrambi
  insieme boolean not null default false,
  attivo boolean not null default true,
  ordine int not null default 0,
  creato_at timestamptz not null default now()
);

create table events (
  id uuid primary key default gen_random_uuid(),
  activity_type_id uuid not null references activity_types (id),
  inizio_at timestamptz not null,
  fine_at timestamptz not null,
  stato event_stato not null,
  creato_da app_role not null,
  nota text,
  nota_risposta text,
  risposto_at timestamptz,
  creato_at timestamptz not null default now(),
  aggiornato_at timestamptz not null default now(),
  constraint fine_dopo_inizio check (fine_at > inizio_at)
);

create index events_inizio_at_idx on events (inizio_at);
create index events_stato_idx on events (stato);
create index events_activity_type_id_idx on events (activity_type_id);

create or replace function set_aggiornato_at()
returns trigger
language plpgsql
as $$
begin
  new.aggiornato_at = now();
  return new;
end;
$$;

create trigger events_set_aggiornato_at
  before update on events
  for each row
  execute function set_aggiornato_at();
