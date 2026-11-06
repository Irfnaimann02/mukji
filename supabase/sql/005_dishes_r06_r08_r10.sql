-- 005_dishes_r06_r08_r10.sql
-- Menus for Eunhwasu (r06), Hansot (r08), Namwol (r10). Part of #3.
-- verified_count = 0 and last_checked = null: nobody has checked these in person yet.
-- Sources:
--   r10 Namwol  : branch menu, https://polle.com/place/2uIh9G
--   r08 Hansot  : official chain prices 2026, https://www.hsd.co.kr + SBS Biz Jan 2026
--   r06 Eunhwasu: chain prices from other branches (diningcode); ERICA branch may differ slightly
-- Fish sauce counts as seafood.
-- Safe to re-run: existing ids are skipped.

insert into dishes (id, restaurant_id, name_ko, name_en, price_won, contains, may_contain, leave_out_ko, leave_out_en, verified_count, last_checked) values
-- r10 Namwol (남월 쌀국수)
('r10-a', 'r10', '소고기쌀국수(퍼보)',      'Beef pho',                10500, '{beef}',              '{seafood}',              null, null, 0, null),
('r10-b', 'r10', '미니퍼보',                'Mini beef pho',           6900,  '{beef}',              '{seafood}',              null, null, 0, null),
('r10-c', 'r10', '닭고기 쌀국수(퍼가)',     'Chicken pho',             11500, '{chicken}',           '{seafood}',              null, null, 0, null),
('r10-d', 'r10', '팟타이꿍(새우)',          'Shrimp pad thai',         12900, '{seafood,egg}',       '{peanut,soy}',           '땅콩 빼 주세요', 'Please leave out the peanuts', 0, null),
('r10-e', 'r10', '팟타이까이(닭고기)',      'Chicken pad thai',        12900, '{chicken,egg}',       '{peanut,seafood,soy}',   '땅콩 빼 주세요', 'Please leave out the peanuts', 0, null),
('r10-f', 'r10', '돼지고기바베큐덮밥(껌승)', 'Pork BBQ rice (com suon)', 11500, '{pork}',            '{seafood,soy,egg}',      null, null, 0, null),
('r10-g', 'r10', '분짜',                    'Bun cha',                 14900, '{pork,seafood}',      '{peanut}',               null, null, 0, null),
('r10-h', 'r10', '반미 소고기',             'Beef banh mi',            9500,  '{beef,wheat}',        '{egg,soy}',              null, null, 0, null),
('r10-i', 'r10', '반미 닭고기',             'Chicken banh mi',         8500,  '{chicken,wheat}',     '{egg,soy}',              null, null, 0, null),
('r10-j', 'r10', '카오팟싸파롯(파인애플 볶음밥)', 'Pineapple fried rice', 11500, '{egg}',            '{seafood,soy}',          null, null, 0, null),
('r10-k', 'r10', '짜조 6p',                 'Fried spring rolls (6)',  6900,  '{pork}',              '{seafood,egg,wheat}',    null, null, 0, null),
('r10-l', 'r10', '고이꾸온 4p',             'Fresh spring rolls (4)',  5900,  '{seafood,pork}',      '{peanut}',               null, null, 0, null),
('r10-m', 'r10', '사이공 맥주',             'Saigon beer',             6900,  '{alcohol}',           '{wheat}',                null, null, 0, null),
-- r08 Hansot (한솥)
('r08-a', 'r08', '치킨마요',                'Chicken mayo bowl',       3900,  '{chicken,egg,wheat,soy}', '{}',                 null, null, 0, null),
('r08-b', 'r08', '빅치킨마요',              'Big chicken mayo bowl',   4600,  '{chicken,egg,wheat,soy}', '{}',                 null, null, 0, null),
('r08-c', 'r08', '메가치킨마요',            'Mega chicken mayo bowl',  6600,  '{chicken,egg,wheat,soy}', '{}',                 null, null, 0, null),
('r08-d', 'r08', '모둠 돈까스도련님',       'Mixed cutlet lunchbox',   5200,  '{pork,chicken,wheat,egg}', '{beef,dairy,soy}',  null, null, 0, null),
('r08-e', 'r08', '김치 제육 덮밥',          'Kimchi spicy pork bowl',  5200,  '{pork,soy}',          '{seafood,wheat}',        null, null, 0, null),
('r08-f', 'r08', '돈까스 카레',             'Pork cutlet curry',       5100,  '{pork,wheat,egg}',    '{dairy,soy,beef}',       null, null, 0, null),
('r08-g', 'r08', '스팸 김치볶음밥',         'Spam kimchi fried rice',  5200,  '{pork}',              '{egg,seafood,soy}',      null, null, 0, null),
('r08-h', 'r08', '묵은지 김치찌개',         'Aged kimchi stew',        6000,  '{pork}',              '{seafood,soy}',          null, null, 0, null),
('r08-i', 'r08', '시골제육 두부강된장 비빔밥', 'Spicy pork & doenjang bibimbap', 6500, '{pork,soy}',    '{seafood,wheat,egg}',    null, null, 0, null),
-- r06 Eunhwasu (은화수식당) - chain prices
('r06-a', 'r06', '하와이돈가스',            'Hawaiian pork cutlet',    10500, '{pork,wheat,egg}',    '{dairy,soy,beef}',       null, null, 0, null),
('r06-b', 'r06', '치즈돈가스',              'Cheese pork cutlet',      12000, '{pork,wheat,egg,dairy}', '{soy,beef}',          null, null, 0, null),
('r06-c', 'r06', '통모짜치즈돈가스',        'Mozzarella pork cutlet',  12500, '{pork,wheat,egg,dairy}', '{soy,beef}',          null, null, 0, null),
('r06-d', 'r06', '은화수카레',              'House curry',             7500,  '{wheat}',             '{pork,beef,dairy}',      null, null, 0, null),
('r06-e', 'r06', '함박카레',                'Hamburg steak curry',     10000, '{beef,wheat,egg}',    '{pork,dairy}',           null, null, 0, null),
('r06-f', 'r06', '클래식함박',              'Classic hamburg steak',   11000, '{beef,egg,wheat}',    '{pork,dairy}',           null, null, 0, null),
('r06-g', 'r06', '생선가스',                'Fish cutlet',             12000, '{seafood,wheat,egg}', '{dairy}',                null, null, 0, null)
on conflict (id) do nothing;s