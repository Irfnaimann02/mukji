-- 025_week12_security_fixes.sql
-- Week 12 security review fixes.
--
-- 1. Menu photos: the 20-a-day limit (022) was on menu_submissions rows only.
--    The photo is uploaded to storage BEFORE the row is added, so someone at
--    the limit could keep uploading files forever (the row fails, the file stays).
--    Now the upload itself is limited too: 20 files per person per day.
-- 2. Reviews: users could edit photo_paths, but there is no review-photo
--    feature, so any text could be stored there. Removed until the feature exists.
-- Safe to re-run.

-- ---------- 1. Limit uploads, not just rows ----------
create or replace function public.my_menu_photo_uploads_today()
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::int from storage.objects
  where bucket_id = 'menu-photos'
    and name like auth.uid()::text || '/%'
    and created_at > now() - interval '1 day';
$$;
revoke execute on function public.my_menu_photo_uploads_today() from public, anon;
grant execute on function public.my_menu_photo_uploads_today() to authenticated;

drop policy if exists "menu-photos: upload to own folder" on storage.objects;
create policy "menu-photos: upload to own folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'menu-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and public.my_menu_photo_uploads_today() < 20
  );

-- ---------- 2. Reviews: no editing photo_paths ----------
revoke update on public.reviews from authenticated;
grant update (stars, body, diet_tags) on public.reviews to authenticated;

-- ---------- 3. Check ----------
-- Should list: body, diet_tags, stars
select column_name from information_schema.column_privileges
where table_schema = 'public' and table_name = 'reviews'
  and grantee = 'authenticated' and privilege_type = 'UPDATE'
order by column_name;
