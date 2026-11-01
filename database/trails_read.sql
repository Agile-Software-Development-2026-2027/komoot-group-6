create or replace function public.get_trail(trail_id uuid)
returns table (
  id uuid, name text, description text, trail_type text, difficulty text,
  length_m integer, ascent_m integer, descent_m integer, max_elevation_m integer,
  est_duration_min integer,
  lng double precision, lat double precision,
  route jsonb
)
language sql stable as $$
  select t.id, t.name, t.description, t.trail_type, t.difficulty,
         t.length_m, t.ascent_m, t.descent_m, t.max_elevation_m, t.est_duration_min,
         st_x(t.start_point::geometry), st_y(t.start_point::geometry),
         st_asgeojson(t.route)::jsonb      -- null when the trail has no route
  from public.trails t
  where t.id = get_trail.trail_id;
$$;

-- Logged-in and anonymous users can call it (the trails table is readable by everyone)
grant execute on function public.get_trail(uuid) to anon, authenticated;