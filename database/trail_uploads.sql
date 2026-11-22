-- GPX overlap check. Run after trails_read.sql and trails_nearby.sql.
begin;

create index if not exists trails_gpx_by_author_idx
  on public.trails (created_by, created_at desc) where source = 'gpx';

create or replace function public.prevent_duplicate_gpx()
returns trigger
language plpgsql
set search_path = public, extensions
as $$
declare
  tolerance_m constant double precision := 25;
  minimum_overlap constant double precision := 0.90;
  uploaded_path geography;
  uploaded_buffer geography;
  matching_id uuid;
begin
  if new.source <> 'gpx' then
    return new;
  end if;

  -- Keep the check and write together, including concurrent publications.
  perform pg_advisory_xact_lock(43, 1);

  if tg_op = 'UPDATE' and not new.is_public then
    return new;
  end if;

  -- A retry may use the same id. The primary key resolves the repeated insert.
  if tg_op = 'INSERT' and exists (
    select 1 from public.trails where id = new.id and created_by = new.created_by
  ) then
    return new;
  end if;

  -- Dissolve repeated sections, for example an out-and-back on the same path.
  uploaded_path := st_unaryunion(coalesce(
    st_force2d(st_geomfromgeojson(new.route_geojson)), new.route::geometry
  ))::geography;
  -- Older rows can have a start point only, so there is no route to compare.
  if uploaded_path is null or st_length(uploaded_path) = 0 then
    return new;
  end if;
  uploaded_buffer := st_buffer(uploaded_path, tolerance_m);

  -- Compare bounding boxes first. Measuring the minimum distance between two
  -- detailed routes can be much slower than intersecting the tolerance buffer.
  with candidates as materialized (
    select t.id, coalesce(st_force2d(st_geomfromgeojson(t.route_geojson))::geography, t.route) as path
    from public.trails t
    where t.is_public and t.id <> new.id
      and coalesce(st_force2d(st_geomfromgeojson(t.route_geojson))::geography, t.route) && uploaded_buffer
  )
  select id into matching_id
  from candidates
  cross join lateral (select st_unaryunion(path::geometry)::geography as unique_path) as candidate
  where st_length(unique_path) > 0
    and st_length(st_intersection(unique_path, uploaded_buffer)) >= minimum_overlap * st_length(unique_path)
    and st_length(st_intersection(uploaded_path, st_buffer(unique_path, tolerance_m)))
        >= minimum_overlap * st_length(uploaded_path)
  order by id
  limit 1;

  if matching_id is not null then
    raise unique_violation using message = 'A similar public trail already exists.', detail = matching_id::text;
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_duplicate_gpx on public.trails;
create trigger prevent_duplicate_gpx
  before insert or update of is_public, route, route_geojson on public.trails
  for each row execute function public.prevent_duplicate_gpx();

notify pgrst, 'reload schema';
commit;
