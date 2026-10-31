-- Sentieri salvati dagli utenti nel proprio profilo (usata da POST /api/profile/saved-trails).
-- Da eseguire una volta nel SQL Editor di Supabase, DOPO aver creato la tabella trails (SUB-19.1).
-- Se trails.id non è uuid, cambiare il tipo di trail_id di conseguenza.

create table if not exists public.saved_trails (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  trail_id   uuid        not null references public.trails (id) on delete cascade,
  created_at timestamptz not null default now(),
  -- un sentiero si salva una volta sola: un secondo insert dà errore 23505 (-> 409)
  primary key (user_id, trail_id)
);

-- RLS: ogni utente vede, aggiunge e toglie solo i propri salvataggi.
alter table public.saved_trails enable row level security;

create policy "Users read their saved trails"
  on public.saved_trails for select
  using (auth.uid() = user_id);

create policy "Users save trails for themselves"
  on public.saved_trails for insert
  with check (auth.uid() = user_id);

create policy "Users remove their saved trails"
  on public.saved_trails for delete
  using (auth.uid() = user_id);
