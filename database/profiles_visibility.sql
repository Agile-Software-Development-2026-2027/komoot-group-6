-- =====================================================================
-- Profiles: public / private (used by GET and PUT /api/profile/visibility)
-- Run ONCE in the Supabase SQL Editor, AFTER profiles_birth_date_level.sql.
-- Safe to run again.
--
-- 1. New column public.profiles.is_public:
--    - default false: every profile, including existing ones, starts PRIVATE
--    - the user changes it with the switch on the profile page
-- 2. Privileges: a logged-in user can read and change this column
--    (the policy profiles_update_own decides WHICH row: only their own).
--    Anonymous users cannot read it.
--
-- NOTE: the public profile page (/users/:username) reads the profile columns granted
-- in profiles_birth_date_level.sql and checks is_public in the backend; the trails
-- completed by others are read only through get_public_profile_completed
-- (public_profile_page.sql).
-- =====================================================================

begin;

-- 1. Column -------------------------------------------------------------
alter table public.profiles
  add column if not exists is_public boolean not null default false;

-- 2. Privileges ---------------------------------------------------------
grant select (is_public) on public.profiles to authenticated;
grant update (is_public) on public.profiles to authenticated;

commit;
