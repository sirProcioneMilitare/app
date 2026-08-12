create table roost_media (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null,
  didascalia text,
  mostrata_count int not null default 0 check (mostrata_count >= 0),
  ultima_volta_at timestamptz,
  creato_at timestamptz not null default now()
);
