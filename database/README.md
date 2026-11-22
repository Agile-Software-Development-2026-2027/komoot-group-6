# Database

The structure of the Supabase database (PostgreSQL + PostGIS), as SQL files.
With these files anyone can create the same database on a new Supabase project.

## Order

Run the files in the **SQL Editor** of Supabase, one at a time, in this order:

| # | File | What it creates |
|---|------|-----------------|
| 1 | `schema.sql` | PostGIS, the `profiles` and `trails` tables, their security rules |
| 2 | `profiles_birth_date_level.sql` | birth date and level of the profiles, the sign-up trigger that creates the profile |
| 3 | `trails_read.sql` | `route_geojson` for GPX tracks, `get_trail` and `trails_in_bounds` |
| 4 | `trails_nearby.sql` | `nearby_trails` (trails near a position) and its indexes |
| 5 | `saved_trails.sql` | trails saved by the users |
| 6 | `completed_trails.sql` | trails completed by the users |
| 7 | `trail_likes.sql` | likes of the trails and `trail_likes_summary` |
| 8 | `checkpoints.sql` | checkpoints of a trail (not used by the site yet) |
| 9 | `hikes_social.sql` | hikes, photos, comments on hikes, friendships (not used by the site yet) |
| 10 | `profiles_visibility.sql` | the public/private setting on user profiles |
| 11 | `trail_comments.sql` | comments on the public trail page |
| 12 | `public_profile_points.sql` | *optional*: public profile score totals on databases with `completed_trails.points_earned` |
| 13 | `leaderboards.sql` | trail leaderboard (`get_trail_leaderboard`) and global leaderboard (`get_global_leaderboard`) |
| 14 | `levels.sql` | the levels (`levels` table) and the trigger that saves the level of each user in `profiles.level` |
| 15 | `trail_uploads.sql` | GPX duplicate check on import and publication |

## Good to know

- **Safe to run again.** Every file can be run again on the existing database:
  `if not exists` skips what is already there, functions use `create or replace`,
  policies are dropped and created again. Keep the order: `profiles_visibility.sql`
  must always run after `profiles_birth_date_level.sql`.
- **Only the structure.** Trail and user data live in Supabase.
  Never commit exports of the data: they contain emails and passwords.
- **Privileges.** A new Supabase project already gives `anon`, `authenticated`
  and `service_role` access to the new tables: the files only change what
  is different (for example the columns of `profiles` that users can read).
  Row Level Security decides which rows each user sees.
- Project settings such as the JWT expiry time remain managed in Supabase.
- **New changes to the database:** write them in a new `.sql` file (or in the
  file of that feature), add it to the table above, and open a PR.
  This way the files and the real database stay the same.

## GPX routes

On an existing database, run the updated files in this order before enabling
uploads in the app.

1. `schema.sql`
2. `trails_read.sql` and `trails_nearby.sql`
3. `saved_trails.sql`, `completed_trails.sql`, `checkpoints.sql`, `trail_likes.sql`,
   `trail_comments.sql` and `leaderboards.sql`
4. `trail_uploads.sql`

Existing trails start as public. New GPX uploads use the signed-in user's id
as their `created_by` and choose visibility in the form. GeoJSON preserves
separate track segments and optional point elevations.

An upload matches an existing public route when at least 90% of the length of
each route is within 25 metres of the other. The check uses the GPX geometry
or the older PostGIS route. A trail with only a start point has no route length
to compare. The same check runs when a private GPX trail is made public.

### Trail covers

All covers live in `backend/data/trail-covers/`. Catalogue filenames start
with `catalog-` and new GPX covers are JPEGs up to 512 KiB. Supabase
`trails.image_url` stores paths relative to `backend/data/`. The backend
checks the trail's visibility before serving its cover.

Commit the cover files to share them across checkouts. Repository readers can
see both public and private cover files. The trail's visibility controls who
can see the cover through the app. Visibility changes leave the file path in
place.
