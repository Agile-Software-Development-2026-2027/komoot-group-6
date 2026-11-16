-- Optional scores for profile search (SCRUM-49).
-- Requires profiles.is_public and the existing completed_trails.points_earned column.
begin;

create or replace function public.get_public_profile_points(p_profile_ids uuid[])
returns table (profile_id uuid, total_points bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, coalesce(sum(c.points_earned), 0)::bigint
  from public.profiles as p
  left join public.completed_trails as c on c.user_id = p.id
  where p.is_public
    and p.id = any(p_profile_ids)
    and cardinality(p_profile_ids) <= 20
  group by p.id;
$$;

revoke all on function public.get_public_profile_points(uuid[]) from public, anon, authenticated;
grant execute on function public.get_public_profile_points(uuid[]) to authenticated;

notify pgrst, 'reload schema';

commit;
