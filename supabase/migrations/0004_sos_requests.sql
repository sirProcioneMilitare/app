create table sos_requests (
  id uuid primary key default gen_random_uuid(),
  livello int not null check (livello in (1, 2, 3)),
  nota text,
  stato sos_stato not null default 'aperta',
  eta_minuti int check (eta_minuti is null or eta_minuti > 0),
  presa_in_carico_at timestamptz,
  conclusa_at timestamptz,
  telegram_message_id bigint,
  creato_at timestamptz not null default now(),
  aggiornato_at timestamptz not null default now()
);

create index sos_requests_stato_idx on sos_requests (stato);
create index sos_requests_creato_at_idx on sos_requests (creato_at);
