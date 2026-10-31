-- Meal Plan B, added 29 Oct 2026 by Claude after Adib approved it.
-- Menu from polle.com; ingredients guessed from dish names, not verified.
-- Location from Google Maps: replace with our own (location_source = 'own').
-- Record only: this already ran in Supabase, so don't run it again.
insert into restaurants (id, name_ko, name_en, food_type, lat, lng, address, phone,
  price_level, halal_certified, origin, recommend_count, rating, sources,
  status, location_source)
values ('r01', '밀플랜비 한양대에리카점', 'Meal Plan B', 'other', 37.3002211, 126.8392821,
  '경기 안산시 상록구 학사2길 11-1 1층', '', 1, false, '[]', 0, 0, '{menu}',
  'approved', 'google');

insert into dishes (id, restaurant_id, name_ko, name_en, price_won, contains, may_contain, verified_count, last_checked)
values
  ('r01-a', 'r01', '치킨 라이스 부리또', 'Chicken rice burrito', 6500, '{chicken,wheat}', '{dairy,egg}', 0, null),
  ('r01-b', 'r01', '소고기 라이스 부리또', 'Beef rice burrito', 6000, '{beef,wheat}', '{dairy,egg}', 0, null),
  ('r01-c', 'r01', '새우감자 부리또', 'Shrimp potato burrito', 6000, '{seafood,wheat}', '{dairy,egg}', 0, null),
  ('r01-d', 'r01', '콘 라이스 부리또', 'Corn rice burrito', 4900, '{wheat}', '{dairy,egg}', 0, null),
  ('r01-e', 'r01', '미트볼감자 부리또', 'Meatball potato burrito', 6000, '{wheat}', '{pork,beef,dairy,egg}', 0, null),
  ('r01-f', 'r01', '소시지감자 부리또', 'Sausage potato burrito', 6500, '{wheat}', '{pork,dairy,egg}', 0, null),
  ('r01-g', 'r01', '플레인 핫도그', 'Plain hot dog', 6000, '{wheat}', '{pork}', 0, null),
  ('r01-h', 'r01', '크림치즈프레츨', 'Cream cheese pretzel', 5000, '{wheat,dairy}', '{egg}', 0, null),
  ('r01-i', 'r01', '메이크업치킨 200g', 'Fried chicken 200g', 5500, '{chicken,wheat}', '{}', 0, null);