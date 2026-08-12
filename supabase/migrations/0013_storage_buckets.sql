-- Bucket privati: l'accesso passa sempre dal backend (service role), che
-- genera signed URL a tempo per l'audio e le foto.
insert into storage.buckets (id, name, public)
values ('daily-media', 'daily-media', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('roost-media', 'roost-media', false)
on conflict (id) do nothing;
