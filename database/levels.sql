-- =====================================================================
-- Levels of the users
--
-- 1. Table public.levels: the minimum total points of each level.
--    The backend reads it to show the points missing to the next level.
-- 2. The level of a user is saved in public.profiles.level and updated by
--    a trigger every time a completed trail is added or removed: the
--    leaderboards and the profile search read it from there.
-- 3. The level of the users who already completed trails is calculated.
--    To change a threshold: change it in step 1 and run the file again.
-- =====================================================================

begin;

-- 1. Levels ------------------------------------------------------------
-- The thresholds must grow with the level, and level 0 must start at 0 points.
create table if not exists public.levels (
  level      integer primary key check (level >= 0),
  min_points integer not null check (min_points >= 0),
  name       text    not null
);

insert into public.levels (level, min_points, name) values
  (0,   0, 'Beginner'),
  (1,  30, 'Walker'),
  (2, 120, 'Hiker'),
  (3, 250, 'Explorer'),
  (4, 400, 'Mountaineer'),
  (5, 600, 'Trail master')
on conflict (level) do update
  set min_points = excluded.min_points, name = excluded.name;

-- Everyone can read the levels. There are no insert/update/delete policies:
-- with RLS on, nobody can change the thresholds through the API

alter table public.levels enable row level security;

drop policy if exists levels_select on public.levels;
create policy levels_select
  on public.levels for select
  using (true);

-- 2. Level of a user ---------------------------------------------------
-- The highest level whose minimum has been reached with these points.
create or replace function public.level_for_points(p_points bigint)
returns integer
language sql
stable
set search_path = ''
as $$
  select coalesce(max(l.level), 0)
  from public.levels as l
  where l.min_points <= p_points;
$$;

-- Saves in the profile the level of the sum of the user's points.
-- security definer: users cannot change profiles.level themselves
-- (see profiles_birth_date_level.sql), so the function runs as its owner.
create or replace function public.refresh_profile_level(p_user_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profiles as p
  set level = public.level_for_points((
    select coalesce(sum(c.points_earned), 0)
    from public.completed_trails as c
    where c.user_id = p_user_id
  ))
  where p.id = p_user_id;
$$;

-- Only the trigger below uses it: it cannot be called through the API
revoke all on function public.refresh_profile_level(uuid) from public, anon, authenticated;

-- After a completed trail is added or removed, update the level of its user.
-- security definer: it runs as the owner, who can call refresh_profile_level.
create or replace function public.update_level_after_completion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_profile_level(old.user_id);
  else
    perform public.refresh_profile_level(new.user_id);
  end if;
  return null; -- after trigger: the return value is not used
end $$;

drop trigger if exists completed_trails_update_level on public.completed_trails;
create trigger completed_trails_update_level
  after insert or delete on public.completed_trails
  for each row execute function public.update_level_after_completion();

-- 3. Levels of the users who already completed trails ------------------
update public.profiles as p
set level = public.level_for_points((
  select coalesce(sum(c.points_earned), 0)
  from public.completed_trails as c
  where c.user_id = p.id
));

notify pgrst, 'reload schema';

commit;