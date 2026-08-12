-- Applica il limite usi_massimi a livello di DB, non solo in app.
create or replace function check_reward_usi_massimi()
returns trigger
language plpgsql
as $$
declare
  v_usi_massimi int;
  v_conteggio int;
begin
  select usi_massimi into v_usi_massimi from rewards where id = new.reward_id;

  if v_usi_massimi is not null then
    select count(*) into v_conteggio
    from reward_redemptions
    where reward_id = new.reward_id
      and stato in ('richiesto', 'onorato');

    if v_conteggio >= v_usi_massimi then
      raise exception 'usi_massimi_raggiunto' using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

create trigger reward_redemptions_check_usi_massimi
  before insert on reward_redemptions
  for each row
  execute function check_reward_usi_massimi();
