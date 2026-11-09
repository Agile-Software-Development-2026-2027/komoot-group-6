# Database

The structure of the Supabase database (PostgreSQL + PostGIS), as SQL files.
With these files anyone can create the same database on a new Supabase project.

## Order

Run the files in the **SQL Editor** of Supabase, one at a time, in this order:

| # | File | What it creates |
|---|------|-----------------|
| 1 | `schema.sql` | PostGIS, the `profiles` and `trails` tables, their security rules |
| 2 | `profiles_birth_date_level.sql` | birth date and level of the profiles, the sign-up trigger that creates the profile |
| 3 | `trails_read.sql` | `get_trail` (one trail) and `trails_in_bounds` (trails of the map area) |
| 4 | `trails_nearby.sql` | `nearby_trails` (trails near a position) and its indexes |
| 5 | `saved_trails.sql` | trails saved by the users |
| 6 | `completed_trails.sql` | trails completed by the users |
| 7 | `trail_likes.sql` | likes of the trails and `trail_likes_summary` |
| 8 | `checkpoints.sql` | checkpoints of a trail (not used by the site yet) |
| 9 | `hikes_social.sql` | hikes, photos, comments on hikes, friendships (not used by the site yet) |
| 10 | `seed_trails_rende.sql` | *optional*: 8 demo trails around Rende |

## Good to know

- **Safe to run again.** Every file can be run again on the existing database:
  `if not exists` skips what is already there, functions use `create or replace`,
  policies are dropped and created again. Keep the order: `profiles_visibility.sql`
  must always run after `profiles_birth_date_level.sql`.
- **Only the structure.** There are no users and no real data here
  (only the demo trails of `seed_trails_rende.sql`).
  Never commit exports of the data: they contain emails and passwords.
- **Privileges.** A new Supabase project already gives `anon`, `authenticated`
  and `service_role` access to the new tables: the files only change what
  is different (for example the columns of `profiles` that users can read).
  Row Level Security decides which rows each user sees.
- **Not included:** Supabase Storage (buckets and files) and the settings of
  the project (e.g. the JWT expiry time in Authentication).
- **New changes to the database:** write them in a new `.sql` file (or in the
  file of that feature), add it to the table above, and open a PR.
  This way the files and the real database stay the same.
