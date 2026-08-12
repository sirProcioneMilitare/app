create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  role app_role not null,
  creata_at timestamptz not null default now()
);

create index push_subscriptions_role_idx on push_subscriptions (role);
