create table service_types (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  nome text not null,
  descrizione text,
  durata_minuti int not null check (durata_minuti > 0),
  emoji text,
  attivo boolean not null default true,
  richiede_anticipo_ore int check (richiede_anticipo_ore is null or richiede_anticipo_ore >= 0),
  ordine int not null default 0,
  creato_at timestamptz not null default now()
);
