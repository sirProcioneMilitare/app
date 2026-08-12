-- Dati iniziali per l'app SOS Burnout.

insert into service_types (slug, nome, descrizione, durata_minuti, emoji, attivo, richiede_anticipo_ore, ordine)
values
  ('yoga-insieme', 'Yoga insieme', 'Mezz''ora di stretching e respiro, insieme.', 30, '🧘', true, null, 1),
  ('massaggio-collo-schiena', 'Massaggio collo e schiena', 'Le spalle chiuse dopo 8 ore di call meritano attenzione.', 15, '💆', true, null, 2),
  ('passeggiata-col-cane', 'Passeggiata col cane', 'Aria, gambe che si muovono, guinzaglio in mano.', 45, '🐕', true, null, 3),
  ('colazione-a-letto', 'Colazione a letto', 'Va organizzata, quindi va prenotata.', 20, '🥐', true, 12, 4),
  ('ora-di-silenzio-garantito', 'Ora di silenzio garantito', 'Nessuno parla, nessuno chiede niente, per un''ora intera.', 60, '🤫', true, null, 5),
  ('cena-a-sorpresa', 'Cena a sorpresa', 'Lei decide tutto, lui si fida.', 90, '🍽️', true, 24, 6)
on conflict (slug) do nothing;

insert into rewards (titolo, descrizione, costo_punti, usi_massimi, attivo)
values
  ('Salto il turno delle galline', 'Un giorno senza dover pensare al pollaio.', null, null, true),
  ('Carta bianca sul weekend', 'Decidi tu cosa si fa, senza discussioni.', null, 1, true),
  ('Un''ora di sonno extra la domenica', 'Nessuna sveglia, nessun senso di colpa.', null, null, true)
on conflict do nothing;
