-- 040_owner_restaurant_photo_storage_read.sql
-- Allow linked owners to read their own restaurant photo objects.
-- Supabase Storage remove() requires SELECT and DELETE permissions.

begin;

drop policy if exists "restaurant photos: linked owner reads"
  on storage.objects;

create policy "restaurant photos: linked owner reads"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'restaurant-photos'
    and exists (
      select 1
      from public.owners o
      where o.user_id = (select auth.uid())
        and o.restaurant_id = (storage.foldername(name))[1]
    )
  );

commit;