-- 039_owner_restaurant_management.sql
-- PR6: allow explicitly linked restaurant owners to manage ordinary restaurant information.
-- Sensitive verification fields and restaurant publication status remain Mukji-controlled.
-- Safe to re-run.

begin;

alter table public.restaurants
  add column if not exists description text not null default '',
  add column if not exists opening_hours jsonb not null default '{}'::jsonb,
  add column if not exists closed_days text[] not null default '{}',
  add column if not exists facilities text[] not null default '{}',
  add column if not exists updated_at timestamptz not null default now();

-- Keep the shape of owner-editable fields predictable for the mobile form.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'restaurants_description_length_check'
      and conrelid = 'public.restaurants'::regclass
  ) then
    alter table public.restaurants
      add constraint restaurants_description_length_check
      check (char_length(description) <= 2000);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'restaurants_opening_hours_object_check'
      and conrelid = 'public.restaurants'::regclass
  ) then
    alter table public.restaurants
      add constraint restaurants_opening_hours_object_check
      check (jsonb_typeof(opening_hours) = 'object');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'restaurants_closed_days_check'
      and conrelid = 'public.restaurants'::regclass
  ) then
    alter table public.restaurants
      add constraint restaurants_closed_days_check
      check (closed_days <@ array['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']::text[]);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'restaurants_facilities_count_check'
      and conrelid = 'public.restaurants'::regclass
  ) then
    alter table public.restaurants
      add constraint restaurants_facilities_count_check
      check (cardinality(facilities) <= 20);
  end if;
end;
$$;

-- Owners can update only ordinary profile fields on restaurants explicitly
-- assigned to their account. They cannot change status, halal_certified,
-- public_data_id, sources, ratings, recommendations or food-verification data.
revoke update on public.restaurants from anon, authenticated;
grant update (
  name_ko,
  name_en,
  category,
  address,
  phone,
  lat,
  lng,
  reservation_url,
  description,
  opening_hours,
  closed_days,
  facilities
) on public.restaurants to authenticated;

drop policy if exists "restaurants: linked owner updates approved profile" on public.restaurants;
create policy "restaurants: linked owner updates approved profile"
  on public.restaurants for update to authenticated
  using (
    status = 'approved'
    and exists (
      select 1 from public.owners o
      where o.user_id = (select auth.uid())
        and o.restaurant_id = restaurants.id
    )
  )
  with check (
    status = 'approved'
    and exists (
      select 1 from public.owners o
      where o.user_id = (select auth.uid())
        and o.restaurant_id = restaurants.id
    )
  );

create or replace function public.set_restaurant_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists restaurants_set_updated_at on public.restaurants;
create trigger restaurants_set_updated_at
  before update on public.restaurants
  for each row execute function public.set_restaurant_updated_at();

-- Restaurant photos are public listing media, not private business documents.
-- The bucket is public for customer-side display; only linked owners can upload/delete.
create table if not exists public.restaurant_photos (
  id uuid primary key default gen_random_uuid(),
  restaurant_id text not null references public.restaurants (id) on delete cascade,
  storage_path text not null unique,
  alt_text text not null default '' check (char_length(alt_text) <= 180),
  created_at timestamptz not null default now(),
  check (split_part(storage_path, '/', 1) = restaurant_id)
);

create index if not exists restaurant_photos_restaurant_created_idx
  on public.restaurant_photos (restaurant_id, created_at);

alter table public.restaurant_photos enable row level security;
revoke all on public.restaurant_photos from public, anon, authenticated;
grant select on public.restaurant_photos to anon, authenticated;
grant insert (restaurant_id, storage_path, alt_text) on public.restaurant_photos to authenticated;
grant delete on public.restaurant_photos to authenticated;

-- Enforce the five-photo metadata limit even if a client bypasses the form.
create or replace function public.enforce_restaurant_photo_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.restaurant_id, 0));
  if (
    select count(*)
    from public.restaurant_photos p
    where p.restaurant_id = new.restaurant_id
  ) >= 5 then
    raise exception 'A restaurant can have up to five photos.';
  end if;
  return new;
end;
$$;

drop trigger if exists restaurant_photos_limit_count on public.restaurant_photos;
create trigger restaurant_photos_limit_count
  before insert on public.restaurant_photos
  for each row execute function public.enforce_restaurant_photo_limit();

drop policy if exists "restaurant photos: public reads approved photos" on public.restaurant_photos;
create policy "restaurant photos: public reads approved photos"
  on public.restaurant_photos for select to anon, authenticated
  using (exists (
    select 1 from public.restaurants r
    where r.id = restaurant_photos.restaurant_id and r.status = 'approved'
  ));

drop policy if exists "restaurant photos: linked owner adds" on public.restaurant_photos;
create policy "restaurant photos: linked owner adds"
  on public.restaurant_photos for insert to authenticated
  with check (exists (
    select 1 from public.owners o
    join public.restaurants r on r.id = o.restaurant_id
    where o.user_id = (select auth.uid())
      and o.restaurant_id = restaurant_photos.restaurant_id
      and r.status = 'approved'
  ));

drop policy if exists "restaurant photos: linked owner deletes" on public.restaurant_photos;
create policy "restaurant photos: linked owner deletes"
  on public.restaurant_photos for delete to authenticated
  using (exists (
    select 1 from public.owners o
    join public.restaurants r on r.id = o.restaurant_id
    where o.user_id = (select auth.uid())
      and o.restaurant_id = restaurant_photos.restaurant_id
      and r.status = 'approved'
  ));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'restaurant-photos',
  'restaurant-photos',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do update
set public = true,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Count existing objects in the owner's own restaurant folder without a
-- recursive storage.objects policy query. The client also checks this limit;
-- this function makes the limit apply to direct authenticated uploads too.
create or replace function public.my_restaurant_photo_upload_count(p_restaurant_id text)
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::int
  from storage.objects so
  where so.bucket_id = 'restaurant-photos'
    and (storage.foldername(so.name))[1] = p_restaurant_id
    and exists (
      select 1 from public.owners o
      where o.user_id = auth.uid() and o.restaurant_id = p_restaurant_id
    );
$$;
revoke all on function public.my_restaurant_photo_upload_count(text) from public, anon;
grant execute on function public.my_restaurant_photo_upload_count(text) to authenticated;

drop policy if exists "restaurant photos: linked owner uploads" on storage.objects;
create policy "restaurant photos: linked owner uploads"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'restaurant-photos'
    and exists (
      select 1 from public.owners o
      join public.restaurants r on r.id = o.restaurant_id
      where o.user_id = (select auth.uid())
        and o.restaurant_id = (storage.foldername(name))[1]
        and r.status = 'approved'
    )
    and public.my_restaurant_photo_upload_count((storage.foldername(name))[1]) < 5
  );

drop policy if exists "restaurant photos: linked owner deletes" on storage.objects;
create policy "restaurant photos: linked owner deletes"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'restaurant-photos'
    and exists (
      select 1 from public.owners o
      join public.restaurants r on r.id = o.restaurant_id
      where o.user_id = (select auth.uid())
        and o.restaurant_id = (storage.foldername(name))[1]
        and r.status = 'approved'
    )
  );

commit;

-- Verification:
-- 1. A linked owner can update only the listed ordinary restaurant profile columns.
-- 2. A user without a matching public.owners row cannot update a restaurant or its photos.
-- 3. Owners cannot change restaurant status, halal_certified or other verification fields.
-- 4. Restaurant photos are public listing media; owner business documents remain in their separate private bucket.
-- 5. New restaurant applications still require the existing staff review/approval process.
