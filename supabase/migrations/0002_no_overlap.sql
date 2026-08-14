-- Nessuno puo' essere in due posti contemporaneamente.
--
-- Chi occupa un evento dipende dal tipo di attivita': un'attivita' "insieme"
-- impegna entrambi, un impegno personale impegna solo chi l'ha creato. Due
-- impegni personali diversi possono quindi tranquillamente sovrapporsi
-- (uno cucina mentre l'altra si prende del tempo libero), mentre un'attivita'
-- di coppia non puo' accavallarsi con nulla che tocchi le stesse persone.

create or replace function partecipanti(p_insieme boolean, p_creato_da app_role)
returns app_role[]
language sql
immutable
as $$
  select case
    when p_insieme then array['a', 'b']::app_role[]
    else array[p_creato_da]
  end
$$;

create or replace function check_event_sovrapposizione()
returns trigger
language plpgsql
as $$
declare
  v_insieme boolean;
  v_partecipanti app_role[];
begin
  -- Rifiutati e annullati non occupano nessuno.
  if new.stato not in ('in_attesa', 'confermato') then
    return new;
  end if;

  select insieme into v_insieme
  from activity_types
  where id = new.activity_type_id;

  v_partecipanti := partecipanti(v_insieme, new.creato_da);

  if exists (
    select 1
    from events e
    join activity_types a on a.id = e.activity_type_id
    where e.id is distinct from new.id
      and e.stato in ('in_attesa', 'confermato')
      and e.inizio_at < new.fine_at
      and e.fine_at > new.inizio_at
      and partecipanti(a.insieme, e.creato_da) && v_partecipanti
  ) then
    raise exception 'sovrapposizione' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create trigger events_check_sovrapposizione
  before insert or update on events
  for each row
  execute function check_event_sovrapposizione();
