-- =====================================================================
-- Checkpoints of a trail: start, end, summit, hut, water, viewpoint...
-- Not used by the site yet. Run after schema.sql (see README.md).
-- Safe to run again.
-- =====================================================================

create table if not exists public.checkpoints (
  id          uuid    not null default gen_random_uuid() primary key,
  trail_id    uuid    not null references public.trails (id) on delete cascade,
  name        text    not null,
  description text,
  kind        text    default 'waypoint'
                      check (kind in ('start', 'end', 'summit', 'hut', 'water', 'viewpoint', 'waypoint')),
  "position"  integer not null default 0,   -- order of the checkpoint along the trail
  location    extensions.geography(Point, 4326) not null,
  elevation_m integer
);

create index if not exists checkpoints_trail_idx on public.checkpoints (trail_id);

alter table public.checkpoints enable row level security;

-- Everyone can read the checkpoints, like the trails.
drop policy if exists checkpoints_select on public.checkpoints;
create policy checkpoints_select
  on public.checkpoints for select
  using (true);

-- Only the author of the trail can add, change or delete its checkpoints.
drop policy if exists checkpoints_write on public.checkpoints;
create policy checkpoints_write
  on public.checkpoints for all
  to authenticated
  using (exists (
    select 1 from public.trails t
    where t.id = checkpoints.trail_id and t.created_by = auth.uid()
  ))
  with check (exists (
    select 1 from public.trails t
    where t.id = checkpoints.trail_id and t.created_by = auth.uid()
  ));
