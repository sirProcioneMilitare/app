create table mood_logs (
  id uuid primary key default gen_random_uuid(),
  valore int not null check (valore between 1 and 5),
  nota text,
  registrato_at timestamptz not null default now(),
  -- Finestra di 4 ore usata solo per applicare il vincolo "massimo una registrazione ogni 4 ore".
  periodo tstzrange generated always as (
    tstzrange(registrato_at, registrato_at + interval '4 hours', '[)')
  ) stored,
  exclude using gist (periodo with &&)
);
