-- =====================================================================
-- Hikes done by the users, with their photos and comments, and the
-- friendships that decide who can see them.
-- Not used by the site yet. Run after schema.sql (see README.md).
-- Safe to run again.
--
-- NOTE: comments here belong to a HIKE (hike_id = an outing of one user),
-- not to a trail of the map.
-- =====================================================================

-- ---------- Friendships ------------------------------------------------
-- A request from requester to addressee: pending, then accepted or declined.
create table if not exists public.friendships (
  id           uuid        not null default gen_random_uuid() primary key,
  requester_id uuid        not null references public.profiles (id) on delete cascade,
  addressee_id uuid        not null references public.profiles (id) on delete cascade,
  status       text        not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at   timestamptz not null default now(),
  unique (requester_id, addressee_id),
  check (requester_id <> addressee_id)     -- nobody can be friends with themselves
);


-- ---------- Hikes ------------------------------------------------------
-- An outing of a user, on a trail of the map or not (trail_id can be null).
create table if not exists public.hikes (
  id                    uuid        not null default gen_random_uuid() primary key,
  user_id               uuid        not null references public.profiles (id) on delete cascade,
  trail_id              uuid        references public.trails (id) on delete set null,
  title                 text        not null,
  notes                 text,
  status                text        not null default 'planned' check (status in ('planned', 'completed')),
  started_at            timestamptz,
  ended_at              timestamptz,
  duration_s            integer,
  duration_is_estimated boolean     not null default false,
  distance_m            integer,
  ascent_m              integer,
  descent_m             integer,
  gpx_path              text,       -- path of the GPX file in Supabase Storage
  route                 extensions.geography(LineString, 4326),
  -- Who can see the hike: only the user, their friends, or everyone
  visibility            text        not null default 'friends' check (visibility in ('private', 'friends', 'public')),
  created_at            timestamptz not null default now()
);

create index if not exists hikes_user_idx on public.hikes (user_id);
create index if not exists hikes_route_idx on public.hikes using gist (route);


-- ---------- Photos -----------------------------------------------------
create table if not exists public.photos (
  id           uuid        not null default gen_random_uuid() primary key,
  hike_id      uuid        not null references public.hikes (id) on delete cascade,
  user_id      uuid        not null references public.profiles (id) on delete cascade,
  storage_path text        not null,   -- path of the image in Supabase Storage
  caption      text,
  location     extensions.geography(Point, 4326),
  taken_at     timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists photos_hike_idx on public.photos (hike_id);


-- ---------- Comments ---------------------------------------------------
create table if not exists public.comments (
  id         uuid        not null default gen_random_uuid() primary key,
  hike_id    uuid        not null references public.hikes (id) on delete cascade,
  author_id  uuid        not null references public.profiles (id) on delete cascade,
  body       text        not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists comments_hike_idx on public.comments (hike_id);


-- ---------- Who can see a hike -----------------------------------------
-- "security definer": the functions read friendships even where RLS
-- would hide the rows; they only answer true or false.

-- true if a and b are friends (an accepted request, in either direction)
create or replace function public.are_friends(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select exists (
    select 1 from public.friendships
    where status = 'accepted'
      and ((requester_id = a and addressee_id = b) or (requester_id = b and addressee_id = a))
  );
$function$;

-- true if the logged-in user can see the hike h:
-- it is theirs, it is public, or it is for friends and they are friends
create or replace function public.can_view_hike(h public.hikes)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select h.user_id = auth.uid()
      or h.visibility = 'public'
      or (h.visibility = 'friends' and public.are_friends(auth.uid(), h.user_id));
$function$;


-- ---------- Row Level Security -----------------------------------------
alter table public.friendships enable row level security;
alter table public.hikes enable row level security;
alter table public.photos enable row level security;
alter table public.comments enable row level security;

-- Friendships: the two users see the request, only the requester creates it
-- (as pending), only the addressee answers it, both can delete it.
drop policy if exists friend_select on public.friendships;
create policy friend_select on public.friendships for select to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());

drop policy if exists friend_insert on public.friendships;
create policy friend_insert on public.friendships for insert to authenticated
  with check (requester_id = auth.uid() and status = 'pending');

drop policy if exists friend_update on public.friendships;
create policy friend_update on public.friendships for update to authenticated
  using (addressee_id = auth.uid());

drop policy if exists friend_delete on public.friendships;
create policy friend_delete on public.friendships for delete to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());

-- Hikes: visible according to can_view_hike, written only by their owner.
drop policy if exists hikes_select on public.hikes;
create policy hikes_select on public.hikes for select to authenticated
  using (public.can_view_hike(hikes.*));

drop policy if exists hikes_insert on public.hikes;
create policy hikes_insert on public.hikes for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists hikes_update on public.hikes;
create policy hikes_update on public.hikes for update to authenticated
  using (user_id = auth.uid());

drop policy if exists hikes_delete on public.hikes;
create policy hikes_delete on public.hikes for delete to authenticated
  using (user_id = auth.uid());

-- Photos: visible with the hike, added only by the owner of the hike.
drop policy if exists photos_select on public.photos;
create policy photos_select on public.photos for select to authenticated
  using (exists (select 1 from public.hikes h where h.id = photos.hike_id and public.can_view_hike(h.*)));

drop policy if exists photos_insert on public.photos;
create policy photos_insert on public.photos for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.hikes h where h.id = photos.hike_id and h.user_id = auth.uid())
  );

drop policy if exists photos_delete on public.photos;
create policy photos_delete on public.photos for delete to authenticated
  using (user_id = auth.uid());

-- Comments: visible and writable by whoever can see the hike, deleted by their author.
drop policy if exists comments_select on public.comments;
create policy comments_select on public.comments for select to authenticated
  using (exists (select 1 from public.hikes h where h.id = comments.hike_id and public.can_view_hike(h.*)));

drop policy if exists comments_insert on public.comments;
create policy comments_insert on public.comments for insert to authenticated
  with check (
    author_id = auth.uid()
    and exists (select 1 from public.hikes h where h.id = comments.hike_id and public.can_view_hike(h.*))
  );

drop policy if exists comments_delete on public.comments;
create policy comments_delete on public.comments for delete to authenticated
  using (author_id = auth.uid());
