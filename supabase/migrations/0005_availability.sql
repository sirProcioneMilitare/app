-- Riga singola: singleton forzato a livello di DB tramite chiave primaria fissa.
create table availability (
  singleton boolean primary key default true check (singleton),
  disponibile boolean not null default true,
  messaggio text,
  aggiornata_at timestamptz not null default now()
);

insert into availability (singleton, disponibile, messaggio) values (true, true, null);
