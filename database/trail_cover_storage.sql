-- Private trail covers. Run after the trails visibility policy has been installed.
begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('trail-covers', 'trail-covers', false, 524288, array['image/jpeg', 'image/webp'])
on conflict (id) do nothing;

do $$
begin
  if exists (select 1 from storage.buckets where id = 'trail-covers' and public) then
    raise exception 'The existing trail-covers bucket is public. Review its settings before migration.';
  end if;
end;
$$;

-- User uploads go in <user id>/<trail id>/<file id>.jpg.
-- Catalogue covers go in catalog/<trail id>.<extension> and are uploaded by an administrator.
drop policy if exists trail_covers_insert on storage.objects;
create policy trail_covers_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'trail-covers'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Owners can access their own drafts. Other readers can access an attached cover
-- only through a trail that is visible to them.
drop policy if exists trail_covers_read on storage.objects;
create policy trail_covers_read on storage.objects for select to anon, authenticated
  using (
    bucket_id = 'trail-covers'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or exists (
        select 1 from public.trails as t
        where t.id::text = coalesce(
          (storage.foldername(storage.objects.name))[2],
          split_part(storage.filename(storage.objects.name), '.', 1)
        )
          and split_part(t.image_url, '/storage/v1/object/authenticated/trail-covers/', 2) = storage.objects.name
          and (t.is_public or t.created_by = (select auth.uid()))
      )
    )
  );

-- The uploader can clean up unused files after a duplicate or an idempotent retry.
drop policy if exists trail_covers_remove_unused on storage.objects;
create policy trail_covers_remove_unused on storage.objects for delete to authenticated
  using (
    bucket_id = 'trail-covers'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and not exists (
      select 1 from public.trails as t
      where t.id::text = (storage.foldername(storage.objects.name))[2]
        and split_part(t.image_url, '/storage/v1/object/authenticated/trail-covers/', 2) = storage.objects.name
    )
  );

commit;
