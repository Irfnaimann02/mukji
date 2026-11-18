-- 028_restaurant_categories.sql
-- Fills restaurants.category (the licence 업태구분명) for our 12 restaurants that
-- didn't have one, so food personality (#48) can tag them: e.g. 에비수 -> 일식 -> Japanese,
-- 김밥천국 -> 분식 -> Snack food. Dishes, tags and Safe / Ask first / Avoid don't change.
--
-- Source: 행정안전부 식품_일반음식점 licence data (the same file as 004), matched by
-- licence number (public_data_id). All 13 are still 영업/정상 (open) in that file.
-- r16 TriBoTea is left as '까페' (set in 018); its licence says 기타 (other), which
-- has no food-type hint.
-- Safe to re-run.

update public.restaurants as r
set category = v.category
from (values
  ('r01', '5550000-101-2010-00352', '패스트푸드'),
  ('r02', '5550000-101-2002-00213', '한식'),
  ('r03', '5550000-101-2015-00143', '한식'),
  ('r04', '5550000-101-2006-00171', '호프/통닭'),
  ('r05', '5550000-101-2016-00133', '호프/통닭'),
  ('r06', '5550000-101-2018-00094', '경양식'),
  ('r07', '5550000-101-2019-00077', '한식'),
  ('r08', '5550000-101-1999-00243', '한식'),
  ('r10', '5550000-101-2012-00048', '외국음식전문점(인도,태국등)'),
  ('r11', '5550000-101-2001-00217', '분식'),
  ('r12', '5550000-101-1999-00294', '외국음식전문점(인도,태국등)'),
  ('r15', '5550000-101-1999-00931', '일식')
) as v(id, public_data_id, category)
-- the licence number must match too, so a wrong id can't get the wrong category
where r.id = v.id and r.public_data_id = v.public_data_id;

-- Check: 13 rows, every one with a category
select id, name_en, category from public.restaurants order by id;
