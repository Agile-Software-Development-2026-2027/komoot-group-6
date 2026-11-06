create table if not exists public.trail_likes (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  trail_id   uuid        not null references public.trails (id) on delete cascade,
  created_at timestamptz not null default now(),
  -- a user can like a trail only once: a second insert fails with error 23505
  primary key (user_id, trail_id)
);

-- The primary key starts with user_id: to count the likes of one trail quickly
-- we also need an index that starts with trail_id.
create index if not exists trail_likes_trail_id_idx on public.trail_likes (trail_id);

-- Each user can only see, add and remove their own likes.
-- The total of all users is read through the function trail_likes_summary below,
-- so nobody can find out who liked a trail, but everyone sees how many likes it has.
-- "(select auth.uid())": the user id is computed once per query, not once per row.
alter table public.trail_likes enable row level security;

drop policy if exists "Users read their trail likes" on public.trail_likes;
create policy "Users read their trail likes"
  on public.trail_likes for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users like trails for themselves" on public.trail_likes;
create policy "Users like trails for themselves"
  on public.trail_likes for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users remove their trail likes" on public.trail_likes;
create policy "Users remove their trail likes"
  on public.trail_likes for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Summary of the likes of a trail: a single row with
--   like_count:  how many users liked the trail in total
--   liked_by_me: true if the user making the request is one of them
-- No row at all if the trail does not exist: the backend then answers 404.
-- "security definer": the function counts the rows of all users, which RLS
-- would otherwise hide; it only returns the number, never the user ids.
-- Starting from trails with a left join, a trail without likes still gets its row (0, false).
create or replace function public.trail_likes_summary(p_trail_id uuid)
returns table (like_count integer, liked_by_me boolean)
language sql
stable
security definer
set search_path = public
as $$
  select
    count(l.user_id)::integer,
    coalesce(bool_or(l.user_id = (select auth.uid())), false)
  from public.trails as t
  left join public.trail_likes as l on l.trail_id = t.id
  where t.id = p_trail_id
  group by t.id;
$$;

-- Only logged-in users can call it (the trail page requires login).
revoke execute on function public.trail_likes_summary(uuid) from public, anon;
grant execute on function public.trail_likes_summary(uuid) to authenticated;
