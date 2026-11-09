-- =====================================================================
-- Base of the database: PostGIS, the profiles table and the trails table.
-- Run it FIRST on a new Supabase project, then the other files in the
-- order written in README.md.
-- Safe to run again on the existing database: "if not exists" skips what
-- is already there, and every policy is dropped and created again.
-- =====================================================================

-- PostGIS: geography types (points, lines) and spatial functions (ST_DWithin, ST_X, ...).
-- On Supabase the extensions live in the "extensions" schema.
create extension if not exists postgis with schema extensions;


-- ---------- Profiles ---------------------------------------------------
-- One row per registered user, with the same id as in auth.users.
-- The row is created by the sign-up trigger (handle_new_user, see
-- profiles_birth_date_level.sql); birth_date, level and is_public are added
-- by profiles_birth_date_level.sql and profiles_is_public.sql.
create table if not exists public.profiles (
  id           uuid        not null primary key references auth.users (id) on delete cascade,
  username     text        not null unique,
  display_name text,
  avatar_url   text,
  bio          text,
  created_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Logged-in users can read the profiles (WHICH columns: see the grants
-- in profiles_birth_date_level.sql, birth_date stays private).
drop policy if exists profiles_select on public.profiles;
create policy profiles_select
  on public.profiles for select
  to authenticated
  using (true);

-- Each user can change only their own profile.
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());


-- ---------- Trails -----------------------------------------------------
-- The trails shown on the map. Lengths and heights are in meters, the
-- estimated duration in minutes. Points and routes are [longitude, latitude]
-- in WGS84 (SRID 4326), stored as geography: distances come out in meters.
create table if not exists public.trails (
  id               uuid        not null default gen_random_uuid() primary key,
  name             text        not null,
  description      text,
  trail_type       text        not null default 'hiking'
                               check (trail_type in ('hiking', 'alpine', 'via_ferrata', 'trail_running')),
  -- CAI scale: T (tourist), E (hiking), EE (expert hikers), EEA (with equipment)
  difficulty       text        check (difficulty in ('T', 'E', 'EE', 'EEA')),
  length_m         integer,
  ascent_m         integer,
  descent_m        integer,
  max_elevation_m  integer,
  est_duration_min integer,
  start_point      extensions.geography(Point, 4326) not null,
  route            extensions.geography(LineString, 4326),  -- null = only the start point is known
  source           text        not null default 'mock',     -- where the trail comes from (mock, gpx, ...)
  external_id      text,                                    -- id in the source (e.g. demo-rende-01)
  created_by       uuid        references public.profiles (id) on delete set null,
  created_at       timestamptz not null default now(),
  image_url        text,
  -- Only secure links for the cover image
  constraint trails_image_url_https check (image_url ~ '^https://')
);

-- Spatial indexes: they make the searches by area and by distance fast.
-- (trails_nearby.sql adds two more on route::geography and start_point::geography.)
create index if not exists trails_start_point_idx on public.trails using gist (start_point);
create index if not exists trails_route_idx on public.trails using gist (route);

alter table public.trails enable row level security;

-- Everyone, even without login, can read the trails.
drop policy if exists trails_select on public.trails;
create policy trails_select
  on public.trails for select
  using (true);

-- A logged-in user can add a trail only as its author,
-- and change or delete only the trails they created.
drop policy if exists trails_insert on public.trails;
create policy trails_insert
  on public.trails for insert
  to authenticated
  with check (created_by = auth.uid());

drop policy if exists trails_update on public.trails;
create policy trails_update
  on public.trails for update
  to authenticated
  using (created_by = auth.uid());

drop policy if exists trails_delete on public.trails;
create policy trails_delete
  on public.trails for delete
  to authenticated
  using (created_by = auth.uid());
