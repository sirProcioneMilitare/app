-- Catalogo delle attivita' prenotabili.
--
-- insieme = true  -> parte un invito che l'altra persona deve accettare
-- insieme = false -> impegno personale, compare subito sul calendario condiviso
--
-- E' un semplice elenco: aggiungere, togliere o rinominare una voce vuol dire
-- modificare questo file, niente codice.

insert into activity_types (slug, nome, descrizione, durata_minuti, emoji, insieme, attivo, ordine)
values
  -- Insieme
  ('yoga-insieme', 'Yoga insieme', 'Mezz''ora di stretching e respiro, insieme.', 30, '🧘', true, true, 1),
  ('palestra-insieme', 'Palestra insieme', 'Ci si trascina a vicenda.', 90, '🏋️', true, true, 2),
  ('passeggiata-col-cane', 'Passeggiata col cane', 'Aria, gambe che si muovono, guinzaglio in mano.', 45, '🐕', true, true, 3),
  ('serata-insieme', 'Serata insieme', 'Divano, film, niente telefoni.', 180, '🎬', true, true, 4),
  ('cena-fuori-insieme', 'Cena fuori insieme', 'Si esce, si mangia, non si cucina.', 120, '🍽️', true, true, 5),
  ('colazione-a-letto', 'Colazione a letto', 'Va organizzata, quindi va prenotata.', 30, '🥐', true, true, 6),
  ('massaggio-collo-schiena', 'Massaggio collo e schiena', 'Le spalle chiuse meritano attenzione.', 15, '💆', true, true, 7),

  -- Personali
  ('cucino-io', 'Cucino io', 'Pranzo o cena, a seconda dell''ora scelta.', 60, '🍳', false, true, 8),
  ('tempo-libero-per-me', 'Tempo libero per me', 'Tempo mio, senza dover spiegare altro.', 120, '🎧', false, true, 9)
on conflict (slug) do nothing;
