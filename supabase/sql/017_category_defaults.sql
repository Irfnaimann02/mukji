-- 017_category_defaults.sql
-- Layer 2 of the data plan: food-type hints for restaurants with no menu yet. Part of #47.
-- restaurants.category holds the licence data's 업태구분명 (e.g. '중국식'); the import fills it.
-- category_defaults says what that type of place usually uses, so a restaurant with no dishes can show
--   "No menu yet: Chinese-Korean food usually has soy and wheat; pork and seafood are common. Ask first."
-- A hint is never "Safe": the app shows it as Ask first, whatever the user's profile.
-- Category names follow the licence data (행정안전부 일반음식점 업태구분명). Check them against the real
-- import: a name that doesn't match exactly just shows no hint.
-- Anyone can read the hints (the app needs them). Only the team can change them.
-- Safe to re-run: columns and tables are made only if missing, rows are upserted.

alter table public.restaurants add column if not exists category text;

create table if not exists public.category_defaults (
  category text primary key,                     -- licence data 업태구분명, e.g. '중국식'
  name_en text not null,
  contains text[] not null default '{}'
    check (contains <@ '{pork,beef,chicken,seafood,egg,dairy,alcohol,peanut,wheat,soy}'::text[]),
  may_contain text[] not null default '{}'
    check (may_contain <@ '{pork,beef,chicken,seafood,egg,dairy,alcohol,peanut,wheat,soy}'::text[]),
  note_ko text not null default '',
  note_en text not null default '',
  created_at timestamptz not null default now(),
  check (not (contains && may_contain))
);
alter table public.category_defaults enable row level security;

drop policy if exists "category_defaults: anyone reads" on public.category_defaults;
create policy "category_defaults: anyone reads" on public.category_defaults
  for select to anon, authenticated
  using (true);

insert into public.category_defaults (category, name_en, contains, may_contain, note_ko, note_en) values
  ('한식', 'Korean', '{}', '{pork,beef,chicken,seafood,soy,wheat,egg}',
   '한식은 돼지고기, 소고기 육수, 간장, 젓갈을 자주 씁니다.',
   'Korean food often uses pork, beef broth, soy sauce and fish sauce or jeotgal.'),
  ('중국식', 'Chinese-Korean', '{soy,wheat}', '{pork,seafood,egg,chicken,beef}',
   '중식은 보통 간장과 밀가루가 들어가고, 돼지고기와 해산물을 많이 씁니다.',
   'Chinese-Korean food usually has soy sauce and wheat; pork and seafood are common.'),
  ('일식', 'Japanese', '{soy,seafood}', '{wheat,egg,alcohol,pork}',
   '일식은 보통 간장과 가쓰오 육수를 쓰고, 미림에 술이 들어갈 수 있습니다.',
   'Japanese food usually has soy sauce and fish stock; mirin can contain alcohol.'),
  ('경양식', 'Western-style', '{wheat}', '{pork,beef,dairy,egg}',
   '경양식(돈가스, 함박)은 빵가루 튀김이 많고 돼지고기를 자주 씁니다.',
   'Western-style places (돈가스, 함박) often fry in breadcrumbs; pork is common.'),
  ('분식', 'Snack food', '{wheat}', '{pork,seafood,egg,soy,dairy}',
   '분식(김밥, 떡볶이, 라면)에는 햄, 어묵, 밀가루가 자주 들어갑니다.',
   'Snack food (김밥, 떡볶이, 라면) often has ham, fish cake and wheat.'),
  ('김밥(도시락)', 'Gimbap / lunch box', '{egg}', '{pork,seafood,wheat,soy}',
   '김밥에는 보통 계란, 햄, 어묵이 들어갑니다.',
   'Gimbap usually has egg, ham and fish cake.'),
  ('호프/통닭', 'Pub / fried chicken', '{wheat}', '{chicken,pork,soy,egg,dairy,peanut,alcohol}',
   '호프집은 주로 치킨과 술을 팔고, 소스에 땅콩이 들어갈 수 있습니다.',
   'Pubs mostly serve fried chicken and drinks; sauces may contain peanut.'),
  ('통닭(치킨)', 'Fried chicken', '{chicken,wheat}', '{soy,egg,dairy,peanut}',
   '치킨 튀김옷에는 밀가루가 들어가고, 소스에 땅콩이나 유제품이 들어갈 수 있습니다.',
   'Fried chicken batter has wheat; sauces may contain peanut or dairy.'),
  ('패스트푸드', 'Fast food', '{wheat}', '{beef,chicken,pork,dairy,egg,soy}',
   '패스트푸드는 빵, 튀김, 소고기나 돼지고기 패티가 많습니다.',
   'Fast food usually has bread or batter, and beef or pork patties.'),
  ('냉면집', 'Naengmyeon', '{wheat}', '{beef,egg,soy}',
   '냉면 육수는 보통 소고기로 만듭니다.',
   'Naengmyeon broth is usually beef-based.'),
  ('식육(숯불구이)', 'Grilled meat', '{}', '{pork,beef,chicken,soy}',
   '고깃집은 돼지고기나 소고기를 팔고, 양념에 간장이 들어갑니다.',
   'Grill houses serve pork or beef; marinades use soy sauce.'),
  ('횟집', 'Raw fish', '{seafood}', '{soy,wheat,alcohol}',
   '횟집은 해산물이 기본이고, 간장과 술을 함께 씁니다.',
   'Raw fish places are seafood-based and use soy sauce.'),
  ('탕류(보신용)', 'Soup / stew', '{}', '{beef,pork,chicken,soy}',
   '탕 전문점은 소고기, 돼지고기, 닭고기 육수를 씁니다.',
   'Soup houses use beef, pork or chicken broth.'),
  ('외국음식전문점(인도,태국등)', 'Foreign (Indian, Thai…)', '{}', '{dairy,peanut,seafood,chicken,soy,wheat,beef,pork}',
   '인도, 태국 음식은 유제품, 땅콩, 피시소스를 자주 씁니다.',
   'Indian and Thai food often uses dairy, peanut or fish sauce.'),
  ('까페', 'Café', '{}', '{dairy,wheat,egg}',
   '카페는 주로 우유가 들어간 음료와 빵, 디저트를 팝니다.',
   'Cafés mostly serve drinks with milk and baked goods.'),
  ('뷔페식', 'Buffet', '{}', '{pork,beef,chicken,seafood,egg,dairy,alcohol,peanut,wheat,soy}',
   '뷔페는 여러 음식이 섞여 있어 하나씩 확인해야 합니다.',
   'Buffets mix many dishes; check each one.'),
  ('정종/대포집/소주방', 'Bar', '{alcohol}', '{pork,seafood,soy,wheat}',
   '술집은 술이 기본이고, 안주에 돼지고기와 해산물이 많습니다.',
   'Bars are drink-first; side dishes often have pork or seafood.')
on conflict (category) do update
  set name_en = excluded.name_en, contains = excluded.contains, may_contain = excluded.may_contain,
      note_ko = excluded.note_ko, note_en = excluded.note_en;
