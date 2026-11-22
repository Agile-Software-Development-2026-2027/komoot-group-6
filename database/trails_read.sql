-- =====================================================================
-- Functions that read the trails, used by the backend:
-- get_trail (one trail, GET /api/trails/:id) and trails_in_bounds
-- (the trails of the visible map area, GET /api/trails?bbox=...).
-- Run after schema.sql (see README.md). Safe to run again.
-- =====================================================================

-- The geometry returned by the GPX parser keeps each segment and the optional
-- elevation of each point. Older trails can still use the PostGIS route column.
alter table public.trails
  add column if not exists route_geojson jsonb
  check (route_geojson is null or (route_geojson->>'type' in ('LineString', 'MultiLineString')) is true);

-- One trail with its route as GeoJSON (no row if the id does not exist)
create or replace function public.get_trail(trail_id uuid)
returns table (
  id uuid, name text, description text, trail_type text, difficulty text,
  length_m integer, ascent_m integer, descent_m integer, max_elevation_m integer,
  est_duration_min integer, image_url text,
  lng double precision, lat double precision,
  route jsonb
)
language sql stable
set search_path = public, extensions
as $$
  select t.id, t.name, t.description, t.trail_type, t.difficulty,
         t.length_m, t.ascent_m, t.descent_m, t.max_elevation_m, t.est_duration_min, t.image_url,
         st_x(t.start_point::geometry), st_y(t.start_point::geometry),
         coalesce(t.route_geojson, st_asgeojson(t.route)::jsonb)
  from public.trails t
  where t.id = get_trail.trail_id;
$$;

-- Both roles can call it. The trails table policy decides which rows are visible.
grant execute on function public.get_trail(uuid) to anon, authenticated;

-- Trails whose start point is inside the rectangle of the map
-- (min_lng, min_lat) - (max_lng, max_lat)
create or replace function public.trails_in_bounds(
  min_lng double precision,
  min_lat double precision,
  max_lng double precision,
  max_lat double precision
)
returns table (
  id uuid, name text, description text, trail_type text, difficulty text,
  length_m integer, ascent_m integer, max_elevation_m integer, est_duration_min integer,
  lng double precision, lat double precision
)
language sql stable
set search_path = public, extensions
as $$
  select t.id, t.name, t.description, t.trail_type, t.difficulty,
         t.length_m, t.ascent_m, t.max_elevation_m, t.est_duration_min,
         st_x(t.start_point::geometry), st_y(t.start_point::geometry)
  from public.trails t
  where t.start_point && st_makeenvelope(min_lng, min_lat, max_lng, max_lat, 4326)::geography;
$$;
