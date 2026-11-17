-- sql functions for trail leaderboard and global leaderboard
-- run after completed trails and profiles visibility
begin;

-- ensure completed trails stores the points earned on each hike
alter table public.completed_trails
  add column if not exists points_earned integer not null default 0;

-- returns the leaderboard of a single trail ordered by points earned on that hike
-- returns no row when the trail does not exist so the backend can answer 404
create or replace function public.get_trail_leaderboard(
  p_trail_id uuid,
  p_limit integer
)
returns table (leaderboard jsonb)
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select jsonb_agg(to_jsonb(ranked) order by ranked.rank asc)
    from (
      select
        row_number() over (
          order by c.points_earned desc, c.completed_at asc, p.username asc
        )::integer as rank,
        p.username,
        p.display_name,
        p.level,
        c.points_earned,
        c.completed_at,
        coalesce(p.id = (select auth.uid()), false) as is_mine
      from public.completed_trails as c
      inner join public.profiles as p on p.id = c.user_id
      where c.trail_id = t.id
        and p.is_public
      order by c.points_earned desc, c.completed_at asc, p.username asc
      limit least(greatest(coalesce(p_limit, 50), 1), 100)
    ) as ranked
  ), '[]'::jsonb)
  from public.trails as t
  where t.id = p_trail_id;
$$;

-- returns the global leaderboard ordered by highest player level and total points
create or replace function public.get_global_leaderboard(
  p_limit integer
)
returns table (
  rank integer,
  username text,
  display_name text,
  level integer,
  total_points bigint,
  completed_trails bigint,
  is_mine boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    row_number() over (
      order by p.level desc, coalesce(sum(c.points_earned), 0) desc, count(c.trail_id) desc, p.username asc
    )::integer as rank,
    p.username,
    p.display_name,
    p.level,
    coalesce(sum(c.points_earned), 0)::bigint as total_points,
    count(c.trail_id)::bigint as completed_trails,
    coalesce(p.id = (select auth.uid()), false) as is_mine
  from public.profiles as p
  left join public.completed_trails as c on c.user_id = p.id
  where p.is_public
  group by p.id, p.username, p.display_name, p.level
  order by p.level desc, total_points desc, completed_trails desc, p.username asc
  limit least(greatest(coalesce(p_limit, 50), 1), 100);
$$;

-- restrict execution of both leaderboard functions to logged in users only
revoke all on function public.get_trail_leaderboard(uuid, integer) from public, anon, authenticated;
grant execute on function public.get_trail_leaderboard(uuid, integer) to authenticated;

revoke all on function public.get_global_leaderboard(integer) from public, anon, authenticated;
grant execute on function public.get_global_leaderboard(integer) to authenticated;

notify pgrst, 'reload schema';

commit;
