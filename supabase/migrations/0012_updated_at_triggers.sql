create or replace function set_aggiornato_at()
returns trigger
language plpgsql
as $$
begin
  new.aggiornato_at = now();
  return new;
end;
$$;

create trigger bookings_set_aggiornato_at
  before update on bookings
  for each row
  execute function set_aggiornato_at();

create trigger sos_requests_set_aggiornato_at
  before update on sos_requests
  for each row
  execute function set_aggiornato_at();
