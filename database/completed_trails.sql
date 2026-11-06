-- Used by Profile endpoints (POST and GET /api/profile/completed-trails).
-- Creates table if not exists; drops and recreates all policies.

create table if not exists public.completed_trails (
  user_id      uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  trail_id     uuid        not null references public.trails (id) on delete cascade,
  completed_at timestamptz not null default now(),
-- Constraint: A trail can only be marked as completed once per user. Duplicate inserts throw SQLSTATE 23505 (mapped to HTTP 409).
  primary key (user_id, trail_id)
);

-- RLS: Users can only select, insert, and delete their own records.
-- 'to authenticated': Restricts policy scope strictly to logged-in users (no anonymous access).
-- "(select auth.uid())": l'id dell'utente si calcola una volta per query e non per ogni riga.
alter table public.completed_trails enable row level security;

drop policy if exists "Users read their completed trails" on public.completed_trails;
create policy "Users read their completed trails"
  on public.completed_trails for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users mark trails completed for themselves" on public.completed_trails;
create policy "Users mark trails completed for themselves"
  on public.completed_trails for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users remove their completed trails" on public.completed_trails;
create policy "Users remove their completed trails"
  on public.completed_trails for delete
  to authenticated
  using ((select auth.uid()) = user_id);
