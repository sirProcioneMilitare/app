create table bookings (
  id uuid primary key default gen_random_uuid(),
  service_type_id uuid not null references service_types (id),
  inizio_at timestamptz not null,
  fine_at timestamptz not null,
  stato booking_stato not null default 'richiesta',
  nota_richiedente text,
  nota_risposta text,
  creata_da app_role not null,
  creato_at timestamptz not null default now(),
  aggiornato_at timestamptz not null default now(),
  periodo tstzrange generated always as (tstzrange(inizio_at, fine_at, '[)')) stored,
  constraint fine_dopo_inizio check (fine_at > inizio_at),
  exclude using gist (periodo with &&)
    where (stato not in ('rifiutata', 'annullata'))
);

create index bookings_inizio_at_idx on bookings (inizio_at);
create index bookings_stato_idx on bookings (stato);
create index bookings_service_type_id_idx on bookings (service_type_id);
