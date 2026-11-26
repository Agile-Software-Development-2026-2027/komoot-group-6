-- Public profile page (GET /api/profile/users/:username).
-- Requires profiles.is_public (profiles_visibility.sql) and completed_trails.
-- Safe to run again.
--
-- RLS only lets each user read their own completed_trails, so the trails completed
-- by a public profile are returned by this function (security definer).
-- A private profile always gets an empty list.
begin;

create or replace function public.get_public_profile_completed(p_profile_id uuid)
returns table (trail_id uuid, completed_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select c.trail_id, c.completed_at
  from public.completed_trails as c
  inner join public.profiles as p on p.id = c.user_id
  where p.id = p_profile_id
    and p.is_public
  order by c.completed_at desc;
$$;

revoke all on function public.get_public_profile_completed(uuid) from public, anon, authenticated;
grant execute on function public.get_public_profile_completed(uuid) to authenticated;

notify pgrst, 'reload schema';

commit;
