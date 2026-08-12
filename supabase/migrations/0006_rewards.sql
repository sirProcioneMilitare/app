create table rewards (
  id uuid primary key default gen_random_uuid(),
  titolo text not null,
  descrizione text,
  costo_punti int check (costo_punti is null or costo_punti >= 0),
  usi_massimi int check (usi_massimi is null or usi_massimi > 0),
  attivo boolean not null default true,
  creato_at timestamptz not null default now()
);

create table reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  reward_id uuid not null references rewards (id),
  riscattato_at timestamptz not null default now(),
  stato redemption_stato not null default 'richiesto',
  onorato_at timestamptz,
  constraint onorato_at_richiede_stato check (
    (stato = 'onorato' and onorato_at is not null) or
    (stato != 'onorato' and onorato_at is null)
  )
);

create index reward_redemptions_reward_id_idx on reward_redemptions (reward_id);
create index reward_redemptions_stato_idx on reward_redemptions (stato);
