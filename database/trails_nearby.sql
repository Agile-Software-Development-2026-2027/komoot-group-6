-- A trail is "near" if ANY point of its route is within the radius, not only its start.
-- Trails without a route are searched by their start point.

-- Spatial indexes for the search. Thanks to ::geography they work
-- whether the columns are geography or geometry(..., 4326).
create index if not exists trails_route_geog_gix on public.trails using gist ((route::geography));
create index if not exists trails_start_point_geog_gix on public.trails using gist ((start_point::geography));

-- Returns the same columns as the other list functions (start point as lng, lat, plus image_url),
-- plus distance_m: meters from the search position to the closest point of the trail.
-- The parameters are called origin_* because lng and lat are already output columns.
create or replace function public.nearby_trails(
  origin_lat double precision,
  origin_lng double precision,
  radius_m double precision default 5000,
  max_results integer default 50
)
returns table (
  id uuid, name text, description text, trail_type text, difficulty text,
  length_m integer, ascent_m integer, descent_m integer, max_elevation_m integer,
  est_duration_min integer, image_url text,
  lng double precision, lat double precision,
  distance_m double precision
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  with params as (
    select
      ST_SetSRID(ST_MakePoint(origin_lng, origin_lat), 4326)::geography as origin,  -- longitude first!
      -- The backend already checks these; they are limited here too because the
      -- function can be called directly through the Supabase API.
      -- Same numbers as backend/src/config/trails.config.js: keep them equal.
      least(greatest(coalesce(radius_m, 5000), 1), 50000) as radius,
      least(greatest(coalesce(max_results, 50), 1), 100) as max_rows
  )
  select
    t.id, t.name, t.description, t.trail_type, t.difficulty,
    t.length_m, t.ascent_m, t.descent_m, t.max_elevation_m, t.est_duration_min, t.image_url,
    ST_X(t.start_point::geometry) as lng,
    ST_Y(t.start_point::geometry) as lat,
    ST_Distance(coalesce(t.route::geography, t.start_point::geography), p.origin) as distance_m
  from public.trails as t
  cross join params as p
  where origin_lat between -90 and 90
    and origin_lng between -180 and 180
    and (
      ST_DWithin(t.route::geography, p.origin, p.radius)
      or (t.route is null and ST_DWithin(t.start_point::geography, p.origin, p.radius))
    )
  order by distance_m, t.id
  limit (select max_rows from params);
$$;

-- Trails are public data, like get_trail: anyone can search them.
revoke execute on function public.nearby_trails(double precision, double precision, double precision, integer) from public;
grant execute on function public.nearby_trails(double precision, double precision, double precision, integer) to anon, authenticated;