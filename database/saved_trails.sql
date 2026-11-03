-- Sentieri salvati dagli utenti nel proprio profilo (usata da POST /api/profile/saved-trails).
-- Da eseguire nel SQL Editor di Supabase, DOPO aver creato la tabella trails (SUB-19.1).
-- Si può rilanciare: la tabella si crea solo se manca e ogni policy viene cancellata e ricreata.

create table if not exists public.saved_trails (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  trail_id   uuid        not null references public.trails (id) on delete cascade,
  created_at timestamptz not null default now(),
  -- un sentiero si salva una volta sola: un secondo insert dà errore 23505 (-> 409)
  primary key (user_id, trail_id)
);

-- RLS: ogni utente vede, aggiunge e toglie solo i propri salvataggi.
-- "to authenticated": le policy valgono solo per chi ha fatto il login, gli utenti anonimi non hanno accesso.
-- "(select auth.uid())": l'id dell'utente si calcola una volta per query e non per ogni riga.
alter table public.saved_trails enable row level security;

drop policy if exists "Users read their saved trails" on public.saved_trails;
create policy "Users read their saved trails"
  on public.saved_trails for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users save trails for themselves" on public.saved_trails;
create policy "Users save trails for themselves"
  on public.saved_trails for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users remove their saved trails" on public.saved_trails;
create policy "Users remove their saved trails"
  on public.saved_trails for delete
  to authenticated
  using ((select auth.uid()) = user_id);
