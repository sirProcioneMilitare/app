create table daily_drops (
  id uuid primary key default gen_random_uuid(),
  tipo daily_tipo not null,
  contenuto_testo text,
  storage_path text,
  pubblicato_per date not null,
  sbloccato boolean not null default false,
  ascoltato_at timestamptz,
  creato_at timestamptz not null default now(),
  constraint contenuto_coerente_col_tipo check (
    (tipo = 'audio' and storage_path is not null) or
    (tipo = 'testo' and contenuto_testo is not null)
  ),
  unique (pubblicato_per, tipo)
);

create index daily_drops_pubblicato_per_idx on daily_drops (pubblicato_per);
