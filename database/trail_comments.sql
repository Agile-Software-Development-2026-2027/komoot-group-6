-- Comments on the public trail page (SCRUM-16).
-- Run after schema.sql and profiles_visibility.sql.
begin;

create table if not exists public.trail_comments (
  id uuid primary key default gen_random_uuid(),
  trail_id uuid not null references public.trails (id) on delete cascade,
  author_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000 and body ~ '[^[:space:]]'),
  created_at timestamptz not null default now()
);

create index if not exists trail_comments_by_trail_idx
  on public.trail_comments (trail_id, created_at desc, id desc);

alter table public.trail_comments enable row level security;

revoke all on public.trail_comments from public, anon, authenticated;
grant insert (trail_id, body) on public.trail_comments to authenticated;
grant select (id, trail_id), delete on public.trail_comments to authenticated;

drop policy if exists trail_comments_insert_own on public.trail_comments;
create policy trail_comments_insert_own
  on public.trail_comments for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and not coalesce((select (auth.jwt() ->> 'is_anonymous')::boolean), false)
    and exists (select 1 from public.trails t where t.id = trail_comments.trail_id)
  );

-- The delete filter can read the IDs of the current user's rows.
drop policy if exists trail_comments_select_own on public.trail_comments;
create policy trail_comments_select_own
  on public.trail_comments for select to authenticated
  using (author_id = (select auth.uid()));

drop policy if exists trail_comments_delete_own on public.trail_comments;
create policy trail_comments_delete_own
  on public.trail_comments for delete to authenticated
  using (author_id = (select auth.uid()));

-- Return comments for visible trails only. Project only the fields a reader needs,
-- and expose usernames only when the associated profile is public.
create or replace function public.get_trail_comments(
  p_trail_id uuid,
  p_before_at timestamptz,
  p_before_id uuid,
  p_limit integer
)
returns table (comments jsonb)
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select jsonb_agg(to_jsonb(page) order by page.created_at desc, page.id desc)
    from (
      select
        c.id,
        c.body,
        c.created_at,
        coalesce(nullif(trim(p.display_name), ''), p.username, 'Hiker') as author_name,
        p.username as author_username,
        coalesce(c.author_id = (select auth.uid()), false) as is_mine
      from public.trail_comments as c
      left join public.profiles as p on p.id = c.author_id and p.is_public
      where c.trail_id = t.id
        and (p_before_at is null or (c.created_at, c.id) < (p_before_at, p_before_id))
      order by c.created_at desc, c.id desc
      limit least(greatest(p_limit, 1), 51)
    ) as page
  ), '[]'::jsonb)
  from public.trails as t
  where t.id = p_trail_id and (t.is_public or t.created_by = (select auth.uid()));
$$;

revoke all on function public.get_trail_comments(uuid, timestamptz, uuid, integer)
  from public, anon, authenticated;
grant execute on function public.get_trail_comments(uuid, timestamptz, uuid, integer)
  to anon, authenticated;

notify pgrst, 'reload schema';

commit;
