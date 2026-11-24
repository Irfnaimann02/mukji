-- Test for 032 restaurants_near(): a place inside the search box but outside the circle
-- (the box's corner) must not come back; a place just inside the radius must.
-- Run in the SQL editor or psql. Everything is rolled back; it raises an error if the check fails.

begin;

insert into public.restaurants (id, name_ko, name_en, food_type, lat, lng, status)
values
  -- 1,000 m north of the centre: inside the 1,000 m radius
  ('test-near-in', '반경 안', 'Inside', 'other', 37.2967 + 990 / 111320.0, 126.836, 'approved'),
  -- 800 m north and 800 m east: inside the 1,000 m box, but about 1,130 m away
  ('test-near-corner', '모서리', 'Corner', 'other',
   37.2967 + 800 / 111320.0, 126.836 + 800 / (111320.0 * cos(radians(37.2967))), 'approved');

do $$
declare
  ids text[];
begin
  select array_agg(id) into ids
  from public.restaurants_near(37.2967, 126.836, 1000, 1000)
  where id like 'test-near-%';

  if not ('test-near-in' = any(coalesce(ids, '{}'))) then
    raise exception 'restaurants_near: the place 990 m away is missing';
  end if;
  if 'test-near-corner' = any(coalesce(ids, '{}')) then
    raise exception 'restaurants_near: the box corner (about 1,130 m away) came back for a 1,000 m radius';
  end if;
  raise notice 'restaurants_near radius test passed';
end $$;

rollback;
