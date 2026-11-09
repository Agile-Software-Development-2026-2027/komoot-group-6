-- =====================================================================
-- Profiles: public or private profile
-- Run AFTER profiles_birth_date_level.sql (see README.md). Safe to run again.
--
-- is_public: false for everyone at the start; each user can change it
-- on their own profile. It is not used by the site yet.
--
-- NOTE: profiles_birth_date_level.sql revokes and grants again the columns
-- of profiles: if you run that file again, run this one after it too.
-- =====================================================================

begin;

alter table public.profiles
  add column if not exists is_public boolean not null default false;

-- Logged-in users can read is_public and change it on their own profile
-- (the RLS policy profiles_update_own decides WHICH row).
-- Anonymous users cannot read it.
grant select (is_public) on public.profiles to authenticated;
grant update (is_public) on public.profiles to authenticated;

commit;
