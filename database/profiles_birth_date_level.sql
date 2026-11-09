-- =====================================================================
-- Profiles: birth date and level (SCRUM-47)
-- Run ONCE in the Supabase SQL Editor. Safe to run again.
--
-- 1. Two new columns in public.profiles:
--    - birth_date: the date of birth given at sign-up (empty for older users)
--    - level: starts at 0 for everyone, users cannot change it themselves
-- 2. handle_new_user (the trigger function that creates the profile on
--    sign-up) also copies the birth date sent by the backend.
--    The trigger on auth.users that calls it is (re)created here too.
-- 3. Privileges: users cannot change their own level or birth date,
--    and other users cannot read someone's birth date.
-- =====================================================================

begin;

-- 1. New columns -------------------------------------------------------
-- birth_date can be null: users who signed up before today don't have one.
-- level: "default 0" also fills in 0 for the profiles that already exist.
alter table public.profiles
  add column if not exists birth_date date,
  add column if not exists level integer not null default 0;

-- Simple sanity rules in the database too (the backend checks the age)
alter table public.profiles drop constraint if exists profiles_level_check;
alter table public.profiles add constraint profiles_level_check check (level >= 0);

alter table public.profiles drop constraint if exists profiles_birth_date_check;
alter table public.profiles add constraint profiles_birth_date_check check (birth_date >= date '1900-01-01');

-- 2. Sign-up trigger ---------------------------------------------------
-- Same function as before, plus birth_date. The backend sends it in the
-- user metadata as 'YYYY-MM-DD' (key "birth_date"); level is not written:
-- the column default (0) is used.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  insert into public.profiles (id, username, display_name, birth_date)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1) || '_' || substr(new.id::text, 1, 4)),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    nullif(new.raw_user_meta_data->>'birth_date', '')::date
  );
  return new;
end $function$;

-- The trigger: after every new user in auth.users, create their profile
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3. Privileges --------------------------------------------------------
-- UPDATE: users may still edit these columns of their own profile
-- (the RLS policy profiles_update_own still decides WHICH row),
-- but not id, created_at, level or birth_date.
revoke update on public.profiles from anon, authenticated;
grant update (username, display_name, avatar_url, bio) on public.profiles to authenticated;

-- SELECT: every column except birth_date, which stays private.
-- NOTE: "select *" on profiles is now refused for users: list the columns.
-- NOTE: this also removes the grants on is_public: run profiles_is_public.sql after this file.
revoke select on public.profiles from anon, authenticated;
grant select (id, username, display_name, avatar_url, bio, created_at, level) on public.profiles to anon, authenticated;

commit;