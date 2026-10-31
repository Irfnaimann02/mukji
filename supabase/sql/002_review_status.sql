-- Applied in Supabase on 29 Oct 2026 (migrations add_review_status_and_source_ids
-- and index_dishes_restaurant_id).
alter table restaurants
  add column status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  add column kakao_place_id text unique,      -- Kakao allows storing only its place ID
  add column public_data_id text unique,      -- licence number from public restaurant data
  add column location_source text not null default 'unknown'
    check (location_source in ('own', 'public_data', 'google', 'unknown')),
  add column created_at timestamptz not null default now();

drop policy "read restaurants" on restaurants;
create policy "read approved restaurants" on restaurants
  for select using (status = 'approved');

drop policy "read dishes" on dishes;
create policy "read dishes of approved restaurants" on dishes
  for select using (
    exists (select 1 from restaurants r where r.id = dishes.restaurant_id and r.status = 'approved')
  );

create index restaurants_status_idx on restaurants (status);
create index dishes_restaurant_id_idx on dishes (restaurant_id);