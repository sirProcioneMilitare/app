-- Wrapper immutable attorno alla finestra di 4 ore.
--
-- Postgres considera "timestamptz + interval" STABLE (non immutable) perche'
-- un intervallo puo' contenere mesi/giorni, la cui durata dipende dal fuso e
-- dai cambi di ora. Qui l'intervallo e' di sole ore, quindi la somma e' uno
-- scostamento assoluto e la funzione e' davvero immutable: dichiararlo tale
-- e' corretto e permette di usarla in una colonna generata.
create or replace function mood_periodo(ts timestamptz)
returns tstzrange
language sql
immutable
as $$
  select tstzrange(ts, ts + interval '4 hours', '[)')
$$;

create table mood_logs (
  id uuid primary key default gen_random_uuid(),
  valore int not null check (valore between 1 and 5),
  nota text,
  registrato_at timestamptz not null default now(),
  -- Finestra di 4 ore usata solo per applicare il vincolo "massimo una
  -- registrazione ogni 4 ore", senza possibilita' di race tra due insert.
  periodo tstzrange generated always as (mood_periodo(registrato_at)) stored,
  exclude using gist (periodo with &&)
);
