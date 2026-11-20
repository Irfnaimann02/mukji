-- 032_restaurants_by_area.sql
-- Part of #48. Prepares the database for every licensed restaurant in Ansan (about 7,500).
-- The app no longer downloads all restaurants: it asks for the ones near a point,
-- by id, or by a search word.
--
-- 1. restaurants.bulk_import: true for rows from the Ansan licence import (033).
--    The team's own restaurants stay false, so short lists (the owner portal) can skip the import.
-- 2. An index on (lat, lng) so "restaurants in this area" stays fast.
-- 3. restaurants_near(): restaurants within a radius, nearest first, at most 1000.
--    It runs as the caller (security invoker), so row level security still applies:
--    only approved restaurants are returned. The app adds its dishes with PostgREST.
-- Safe to re-run.

begin;

alter table public.restaurants
  add column if not exists bulk_import boolean not null default false;

create index if not exists restaurants_lat_lng_idx on public.restaurants (lat, lng);

create or replace function public.restaurants_near(
  p_lat double precision,
  p_lng double precision,
  p_radius_m integer default 1500,
  p_max integer default 600
)
returns setof public.restaurants
language sql
stable
security invoker
set search_path = ''
as $$
  with box as (
    select
      least(greatest(p_radius_m, 50), 20000) / 111320.0 as dlat,
      least(greatest(p_radius_m, 50), 20000) / (111320.0 * cos(radians(p_lat))) as dlng
  )
  select r.*
  from public.restaurants as r, box
  where r.lat between p_lat - box.dlat and p_lat + box.dlat
    and r.lng between p_lng - box.dlng and p_lng + box.dlng
  -- distance on a flat map is enough at this scale
  order by power(r.lat - p_lat, 2) + power((r.lng - p_lng) * cos(radians(p_lat)), 2)
  limit least(greatest(p_max, 1), 1000);
$$;

revoke execute on function public.restaurants_near(double precision, double precision, integer, integer) from public;
grant execute on function public.restaurants_near(double precision, double precision, integer, integer) to anon, authenticated;

commit;

-- Check:
-- select id, name_ko from public.restaurants_near(37.2967, 126.836, 1500, 5);
