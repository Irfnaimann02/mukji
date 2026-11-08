-- 007_dishes_batch2.sql
-- Menus for 8 restaurants from menu photos and delivery-app screenshots (Nov 2026). Part of #3.
-- Also fills 원산지 (origin) for Crazy Pa-dak, Sarai and Ebisu.
-- verified_count = 0 and last_checked = null: nobody has checked these in person yet.
-- Tagging: contains = definitely in it (Avoid if blocked), may_contain = maybe (Ask first).
-- Fish sauce, 어묵 fish cake, 맛살 crab stick, 날치알 roe, jeotgal count as seafood.
-- Sarai: lamb is tagged as may_contain beef until the app has a lamb ingredient.
-- Safe to re-run: existing ids are skipped.

begin;

-- r02 Alchon: Menu app, last updated 2023-09-05 (prices may be higher now)
insert into dishes (id, restaurant_id, name_ko, name_en, price_won, contains, may_contain, leave_out_ko, leave_out_en, verified_count, last_checked) values
('r02-a', 'r02', '순한알밥', 'Mild roe rice', 4800, '{pork,seafood}', '{soy,wheat,egg}', null, null, 0, null),
('r02-b', 'r02', '약매알밥', 'Slightly spicy roe rice', 5000, '{pork,seafood}', '{soy,wheat,egg}', null, null, 0, null),
('r02-c', 'r02', '매콤알밥', 'Spicy roe rice', 5000, '{pork,seafood}', '{soy,wheat,egg}', null, null, 0, null),
('r02-d', 'r02', '진매알밥', 'Extra spicy roe rice', 5100, '{pork,seafood}', '{soy,wheat,egg}', null, null, 0, null),
('r02-e', 'r02', '갈릭알밥', 'Garlic roe rice', 5400, '{pork,seafood}', '{soy,wheat,egg,dairy}', null, null, 0, null),
('r02-f', 'r02', '갈릭치즈알밥', 'Garlic cheese roe rice', 6100, '{pork,seafood,dairy}', '{soy,wheat,egg}', null, null, 0, null),
('r02-g', 'r02', '카레알밥', 'Curry roe rice', 5400, '{pork,seafood,wheat}', '{soy,dairy,beef,egg}', null, null, 0, null),
('r02-h', 'r02', '짜장알밥', 'Jjajang roe rice', 5400, '{pork,seafood,wheat,soy}', '{egg}', null, null, 0, null),
('r02-i', 'r02', '매콤치즈알밥', 'Spicy cheese roe rice', 5700, '{pork,seafood,dairy}', '{soy,wheat,egg}', null, null, 0, null),
('r02-j', 'r02', '불고기알밥', 'Bulgogi roe rice', 6300, '{seafood,soy}', '{beef,pork,wheat,egg}', null, null, 0, null),
('r02-k', 'r02', '오밥', 'Squid rice', 5500, '{seafood}', '{pork,soy,wheat,egg}', null, null, 0, null),
('r02-l', 'r02', '갈릭오밥', 'Garlic squid rice', 6000, '{seafood}', '{pork,soy,wheat,egg,dairy}', null, null, 0, null),
('r02-m', 'r02', '치즈오밥', 'Cheese squid rice', 6200, '{seafood,dairy}', '{pork,soy,wheat,egg}', null, null, 0, null)
on conflict (id) do nothing;

-- r03 Ilmi Dakgalbi: Menu board photo (Nov 2026)
insert into dishes (id, restaurant_id, name_ko, name_en, price_won, contains, may_contain, leave_out_ko, leave_out_en, verified_count, last_checked) values
('r03-a', 'r03', '닭갈비 (2인분)', 'Spicy chicken stir-fry, for 2', 17000, '{chicken,soy}', '{wheat}', null, null, 0, null),
('r03-b', 'r03', '닭·삼 (2인분)', 'Chicken + pork belly, for 2', 19000, '{chicken,pork,soy}', '{wheat}', null, null, 0, null),
('r03-c', 'r03', '쭈·닭 (2인분)', 'Baby octopus + chicken, for 2', 19000, '{seafood,chicken,soy}', '{wheat}', null, null, 0, null),
('r03-d', 'r03', '쭈·삼 (2인분)', 'Baby octopus + pork belly, for 2', 19000, '{seafood,pork,soy}', '{wheat}', null, null, 0, null),
('r03-e', 'r03', '쭈·닭·삼 (4인분)', 'Octopus + chicken + pork belly, for 4', 36000, '{seafood,chicken,pork,soy}', '{wheat}', null, null, 0, null),
('r03-f', 'r03', '무뼈불닭발', 'Boneless spicy chicken feet', 15000, '{chicken,soy}', '{wheat}', null, null, 0, null),
('r03-g', 'r03', '치즈사리', 'Cheese topping', 2500, '{dairy}', '{}', null, null, 0, null),
('r03-h', 'r03', '라면사리', 'Ramen noodles add-on', 2000, '{wheat}', '{soy}', null, null, 0, null),
('r03-i', 'r03', '우동사리', 'Udon noodles add-on', 2000, '{wheat}', '{}', null, null, 0, null),
('r03-j', 'r03', '치즈떡사리', 'Cheese rice cakes add-on', 1500, '{dairy}', '{wheat}', null, null, 0, null),
('r03-k', 'r03', '고구마떡사리', 'Sweet potato rice cakes add-on', 1500, '{}', '{wheat}', null, null, 0, null),
('r03-l', 'r03', '밀떡사리', 'Wheat rice cakes add-on', 1500, '{wheat}', '{}', null, null, 0, null),
('r03-m', 'r03', '볶음밥', 'Fried rice in leftover sauce', 2000, '{soy}', '{chicken,pork,seafood,wheat,egg}', null, null, 0, null),
('r03-n', 'r03', '공기밥', 'Bowl of rice', 1000, '{}', '{}', null, null, 0, null),
('r03-o', 'r03', '식혜', 'Sweet rice drink', 3000, '{}', '{}', null, null, 0, null),
('r03-p', 'r03', '음료수', 'Soft drink', 2000, '{}', '{}', null, null, 0, null),
('r03-q', 'r03', '소주', 'Soju', 4000, '{alcohol}', '{}', null, null, 0, null),
('r03-r', 'r03', '맥주', 'Beer', 4000, '{alcohol}', '{wheat}', null, null, 0, null),
('r03-s', 'r03', '밤막걸리', 'Chestnut makgeolli', 4000, '{alcohol}', '{wheat}', null, null, 0, null),
('r03-t', 'r03', '느린마을막걸리', 'Neurinmaeul makgeolli', 4000, '{alcohol}', '{wheat}', null, null, 0, null),
('r03-u', 'r03', '참쌀막걸리', 'Rice makgeolli (house pick)', 5000, '{alcohol}', '{wheat}', null, null, 0, null),
('r03-v', 'r03', '한잔막걸리', 'Makgeolli, one glass', 1000, '{alcohol}', '{wheat}', null, null, 0, null)
on conflict (id) do nothing;

-- r04 Crazy Pa-dak: Menu board photos + delivery app (Nov 2026)
insert into dishes (id, restaurant_id, name_ko, name_en, price_won, contains, may_contain, leave_out_ko, leave_out_en, verified_count, last_checked) values
('r04-a', 'r04', '순살 한마리 (맛 1가지)', 'Boneless chicken, 1 flavour', 17000, '{chicken,wheat}', '{soy,egg,dairy,peanut}', null, null, 0, null),
('r04-b', 'r04', '순살 반반 (맛 2가지)', 'Boneless half & half, 2 flavours', 18000, '{chicken,wheat}', '{soy,egg,dairy,peanut}', null, null, 0, null),
('r04-c', 'r04', '순살 두마리 (맛 2가지)', 'Two boneless chickens, 2 flavours', 28000, '{chicken,wheat}', '{soy,egg,dairy,peanut}', null, null, 0, null),
('r04-d', 'r04', '순살 두마리 (맛 3가지)', 'Two boneless chickens, 3 flavours', 30000, '{chicken,wheat}', '{soy,egg,dairy,peanut}', null, null, 0, null),
('r04-e', 'r04', '순살 두마리 (맛 4가지)', 'Two boneless chickens, 4 flavours', 32000, '{chicken,wheat}', '{soy,egg,dairy,peanut}', null, null, 0, null),
('r04-f', 'r04', '순살 세마리 (맛 3가지)', 'Three boneless chickens, 3 flavours', 42000, '{chicken,wheat}', '{soy,egg,dairy,peanut}', null, null, 0, null),
('r04-g', 'r04', '치즈피자', 'Cheese pizza (black-rice dough; pastry +3,000)', 12000, '{wheat,dairy}', '{soy,egg}', null, null, 0, null),
('r04-h', 'r04', '페퍼로니피자', 'Pepperoni pizza (black-rice dough; pastry +3,000)', 12000, '{wheat,dairy,pork}', '{beef,soy,egg}', null, null, 0, null),
('r04-i', 'r04', '콤비네이션피자', 'Combination pizza (black-rice dough; pastry +3,000)', 13000, '{wheat,dairy,pork}', '{beef,soy,egg}', null, null, 0, null),
('r04-j', 'r04', '고르곤졸라피자', 'Gorgonzola pizza (black-rice dough; pastry +3,000)', 13000, '{wheat,dairy}', '{soy,egg}', null, null, 0, null),
('r04-k', 'r04', '베이컨포테이토피자', 'Bacon potato pizza (black-rice dough; pastry +3,000)', 14000, '{wheat,dairy,pork}', '{soy,egg}', null, null, 0, null),
('r04-l', 'r04', '고구마치즈크림피자', 'Sweet potato cheese cream pizza (black-rice dough; pastry +3,000)', 14000, '{wheat,dairy}', '{soy,egg}', null, null, 0, null),
('r04-m', 'r04', '치킨바베큐피자', 'Chicken BBQ pizza (black-rice dough; pastry +3,000)', 16000, '{wheat,dairy,chicken}', '{soy,egg}', null, null, 0, null),
('r04-n', 'r04', '핫치킨피자', 'Hot chicken pizza (black-rice dough; pastry +3,000)', 16000, '{wheat,dairy,chicken}', '{soy,egg}', null, null, 0, null),
('r04-o', 'r04', '불고기피자', 'Bulgogi pizza (black-rice dough; pastry +3,000)', 16000, '{wheat,dairy,soy}', '{beef,pork,egg}', null, null, 0, null),
('r04-p', 'r04', '치즈크러스트 추가', 'Cheese crust add-on (black-rice pizza only)', 3000, '{dairy,wheat}', '{}', null, null, 0, null),
('r04-q', 'r04', '핫치킨소스', 'Hot chicken sauce', 500, '{}', '{soy,wheat}', null, null, 0, null),
('r04-r', 'r04', '갈릭디핑소스', 'Garlic dipping sauce', 500, '{egg}', '{dairy}', null, null, 0, null),
('r04-s', 'r04', '치떡세트 A 국물떡볶이 (2~3인분)', 'Chicken + soup tteokbokki set A, for 2-3', 21000, '{chicken,wheat,soy}', '{seafood,egg,dairy,peanut}', null, null, 0, null),
('r04-t', 'r04', '치떡세트 B 국물떡볶이 (1~2인분)', 'Chicken + soup tteokbokki set B, for 1-2', 19000, '{chicken,wheat,soy}', '{seafood,egg,dairy,peanut}', null, null, 0, null),
('r04-u', 'r04', '치떡세트 C 로제떡볶이 (2~3인분)', 'Chicken + rose tteokbokki set C, for 2-3', 22000, '{chicken,wheat,soy,dairy}', '{seafood,egg,peanut}', null, null, 0, null),
('r04-v', 'r04', '치떡세트 D 로제떡볶이 (1~2인분)', 'Chicken + rose tteokbokki set D, for 1-2', 19500, '{chicken,wheat,soy,dairy}', '{seafood,egg,peanut}', null, null, 0, null),
('r04-w', 'r04', '국물떡볶이 (1~2인분)', 'Soup tteokbokki, for 1-2', 4500, '{wheat,soy}', '{seafood,egg}', null, null, 0, null),
('r04-x', 'r04', '국물떡볶이 (2~3인분)', 'Soup tteokbokki, for 2-3', 8000, '{wheat,soy}', '{seafood,egg}', null, null, 0, null),
('r04-y', 'r04', '로제떡볶이 (1~2인분)', 'Rose tteokbokki, for 1-2', 5000, '{wheat,soy,dairy}', '{seafood,egg}', null, null, 0, null),
('r04-z', 'r04', '로제떡볶이 (2~3인분)', 'Rose tteokbokki, for 2-3', 9000, '{wheat,soy,dairy}', '{seafood,egg}', null, null, 0, null),
('r04-aa', 'r04', '라면사리 추가', 'Ramen add-on', 1000, '{wheat}', '{soy}', null, null, 0, null),
('r04-ab', 'r04', '물만두 추가', 'Dumpling add-on', 1000, '{wheat,pork}', '{soy,beef}', null, null, 0, null),
('r04-ac', 'r04', '베이컨 추가', 'Bacon add-on (rose)', 1000, '{pork}', '{}', null, null, 0, null),
('r04-ad', 'r04', '비엔나소시지 추가', 'Sausage add-on (rose)', 1000, '{pork}', '{wheat,soy}', null, null, 0, null),
('r04-ae', 'r04', '김말이 (2개)', 'Fried seaweed rolls (2)', 1000, '{wheat}', '{soy,egg}', null, null, 0, null),
('r04-af', 'r04', '튀김만두 (2개)', 'Fried dumplings (2)', 1000, '{wheat,pork}', '{soy,beef,egg}', null, null, 0, null),
('r04-ag', 'r04', '새우튀김 (2개)', 'Fried shrimp (2)', 2000, '{seafood,wheat}', '{egg}', null, null, 0, null),
('r04-ah', 'r04', '치즈스틱 (3개)', 'Cheese sticks (3)', 2000, '{dairy,wheat}', '{egg}', null, null, 0, null),
('r04-ai', 'r04', '고구마고로케 (2개)', 'Sweet potato croquettes (2)', 1000, '{wheat}', '{egg,dairy}', null, null, 0, null)
on conflict (id) do nothing;

-- r05 The Chicken: Menu app screenshots (Nov 2026)
insert into dishes (id, restaurant_id, name_ko, name_en, price_won, contains, may_contain, leave_out_ko, leave_out_en, verified_count, last_checked) values
('r05-a', 'r05', '크리스피 치킨(뼈)', 'Crispy fried chicken, bone-in', 20000, '{chicken,wheat}', '{soy,egg,dairy}', null, null, 0, null),
('r05-b', 'r05', '크리스피 치킨(순살)', 'Crispy fried chicken, boneless', 22000, '{chicken,wheat}', '{soy,egg,dairy}', null, null, 0, null),
('r05-c', 'r05', '크리스피 양념(뼈)', 'Sweet-spicy chicken, bone-in', 22000, '{chicken,wheat,soy}', '{egg,dairy,peanut}', null, null, 0, null),
('r05-d', 'r05', '크리스피 양념(순살)', 'Sweet-spicy chicken, boneless', 24000, '{chicken,wheat,soy}', '{egg,dairy,peanut}', null, null, 0, null),
('r05-e', 'r05', '골라먹는 4가지맛(뼈)', 'Pick 4 flavours, bone-in', 36000, '{chicken,wheat}', '{soy,egg,dairy,peanut}', null, null, 0, null),
('r05-f', 'r05', '골라먹는 4가지맛(순살)', 'Pick 4 flavours, boneless', 40000, '{chicken,wheat}', '{soy,egg,dairy,peanut}', null, null, 0, null),
('r05-g', 'r05', '사계천왕(순살)', '4 boxes: fried, onion, sweet-spicy, snow cheese', 40900, '{chicken,wheat,soy,dairy}', '{egg,peanut}', null, null, 0, null),
('r05-h', 'r05', '마늘간장+눈꽃(뼈)', 'Garlic soy + snow cheese, bone-in', 22000, '{chicken,wheat,soy,dairy}', '{egg}', null, null, 0, null),
('r05-i', 'r05', '마늘간장+눈꽃(순살)', 'Garlic soy + snow cheese, boneless', 24000, '{chicken,wheat,soy,dairy}', '{egg}', null, null, 0, null),
('r05-j', 'r05', '양념+마늘간장(뼈)', 'Sweet-spicy + garlic soy, bone-in', 22000, '{chicken,wheat,soy}', '{egg,dairy,peanut}', null, null, 0, null),
('r05-k', 'r05', '양념+마늘간장(순살)', 'Sweet-spicy + garlic soy, boneless', 24000, '{chicken,wheat,soy}', '{egg,dairy,peanut}', null, null, 0, null),
('r05-l', 'r05', '양파+마늘간장(순살)', 'Onion + garlic soy, boneless', 25000, '{chicken,wheat,soy}', '{egg,dairy}', null, null, 0, null),
('r05-m', 'r05', '세트1 (크감콜큰)', 'Set 1: crispy bone-in + snow-cheese fries + cola 1.25L', 26000, '{chicken,wheat,dairy}', '{soy,egg}', null, null, 0, null),
('r05-n', 'r05', '세트2 (순감콜큰)', 'Set 2: half spicy, half garlic soy + snow-cheese fries + cola 1.25L', 28000, '{chicken,wheat,soy,dairy}', '{egg,peanut}', null, null, 0, null),
('r05-o', 'r05', '국물떡볶이', 'Soup tteokbokki with gimmari and dumplings', 7900, '{wheat,soy,pork}', '{beef,seafood,egg}', null, null, 0, null),
('r05-p', 'r05', '레알 치즈볼 (3개)', 'Cheese balls (3)', 3000, '{dairy,wheat}', '{egg}', null, null, 0, null),
('r05-q', 'r05', '레알 치즈볼 (6개)', 'Cheese balls (6)', 5500, '{dairy,wheat}', '{egg}', null, null, 0, null),
('r05-r', 'r05', '모듬감자', 'Mixed fries', 10900, '{}', '{wheat,dairy}', null, null, 0, null),
('r05-s', 'r05', '막대눈꽃 감자', 'Snow-cheese potato sticks', 9000, '{dairy}', '{wheat}', null, null, 0, null),
('r05-t', 'r05', '클링클컷 눈꽃감자', 'Snow-cheese crinkle fries', 9000, '{dairy}', '{wheat}', null, null, 0, null),
('r05-u', 'r05', '치즈스틱 (7개)', 'Cheese sticks (7)', 7000, '{dairy,wheat}', '{egg}', null, null, 0, null),
('r05-v', 'r05', '영자''s 소떡소떡 (1개)', 'Sausage & rice cake skewer (1)', 3000, '{pork,wheat}', '{soy,chicken}', null, null, 0, null),
('r05-w', 'r05', '영자''s 소떡소떡 (2개)', 'Sausage & rice cake skewers (2)', 5500, '{pork,wheat}', '{soy,chicken}', null, null, 0, null),
('r05-x', 'r05', '양념소스', 'Sweet-spicy sauce', 500, '{soy}', '{wheat,peanut}', null, null, 0, null),
('r05-y', 'r05', '무추가', 'Extra pickled radish', 500, '{}', '{}', null, null, 0, null),
('r05-z', 'r05', '콜라 (500ml)', 'Cola 500ml', 3000, '{}', '{}', null, null, 0, null),
('r05-aa', 'r05', '콜라 (1.25L)', 'Cola 1.25L', 4000, '{}', '{}', null, null, 0, null),
('r05-ab', 'r05', '사이다 (500ml)', 'Lemon-lime soda 500ml', 3000, '{}', '{}', null, null, 0, null),
('r05-ac', 'r05', '사이다 (1.25L)', 'Lemon-lime soda 1.25L', 4000, '{}', '{}', null, null, 0, null)
on conflict (id) do nothing;

-- r07 Bukchon Dumplings: Menu app, updated 2025-02-26; allergens from Bukchon product labels (Kurly)
insert into dishes (id, restaurant_id, name_ko, name_en, price_won, contains, may_contain, leave_out_ko, leave_out_en, verified_count, last_checked) values
('r07-a', 'r07', '북촌 피냉면', 'Bukchon cold buckwheat noodles', 7500, '{wheat,beef,soy,egg}', '{}', null, null, 0, null),
('r07-b', 'r07', '북촌 군만두', 'Bukchon fried dumplings', 5500, '{pork,beef,wheat,soy}', '{egg,seafood}', null, null, 0, null),
('r07-c', 'r07', '북촌 만둣국', 'Bukchon dumpling soup', 8000, '{pork,beef,wheat,soy,egg}', '{seafood}', null, null, 0, null),
('r07-d', 'r07', '멸치국수', 'Anchovy noodles', 7000, '{wheat,seafood}', '{egg,soy}', null, null, 0, null),
('r07-e', 'r07', '멸치 칼국수', 'Anchovy knife-cut noodles', 7000, '{wheat,seafood}', '{egg,soy}', null, null, 0, null),
('r07-f', 'r07', '비빔국수', 'Spicy mixed noodles', 7500, '{wheat,soy}', '{egg,seafood}', null, null, 0, null),
('r07-g', 'r07', '만두국수', 'Dumplings and thin noodles in beef bone broth', 8500, '{pork,beef,wheat,soy}', '{egg,seafood}', null, null, 0, null),
('r07-h', 'r07', '얼큰만둣국', 'Spicy dumpling soup', 8500, '{pork,beef,wheat,soy}', '{egg,seafood}', null, null, 0, null),
('r07-i', 'r07', '육개장 만둣국', 'Spicy beef soup with mandu (rice included)', 9500, '{pork,beef,wheat,soy}', '{egg,seafood}', null, null, 0, null),
('r07-j', 'r07', '떡갈비', 'Grilled galbi patty', 3500, '{soy}', '{pork,beef,wheat,egg}', null, null, 0, null),
('r07-k', 'r07', '찐만두 (고기·김치)', 'Steamed meat & kimchi mandu', 5500, '{pork,beef,wheat,soy}', '{egg,seafood}', null, null, 0, null),
('r07-l', 'r07', '갈비만두', 'Galbi mandu', 6000, '{pork,wheat,soy}', '{beef,egg}', null, null, 0, null),
('r07-m', 'r07', '굴만두', 'Oyster dumplings', 6000, '{seafood,wheat}', '{pork,soy,egg}', null, null, 0, null),
('r07-n', 'r07', '애기만두', 'Baby dumplings', 5500, '{pork,beef,wheat,soy}', '{egg,seafood}', null, null, 0, null),
('r07-o', 'r07', '모둠만두', 'Assorted mandu', 11500, '{pork,beef,wheat,soy}', '{egg,seafood}', null, null, 0, null)
on conflict (id) do nothing;

-- r11 Gimbap Cheonguk: Menu board photo (Nov 2026)
insert into dishes (id, restaurant_id, name_ko, name_en, price_won, contains, may_contain, leave_out_ko, leave_out_en, verified_count, last_checked) values
('r11-a', 'r11', '원조김밥', 'Classic gimbap', 3500, '{egg,pork,seafood}', '{soy,wheat}', '햄 빼 주세요', 'Please leave out the ham', 0, null),
('r11-b', 'r11', '참치김밥', 'Tuna gimbap', 4500, '{egg,pork,seafood}', '{soy,wheat}', '햄 빼 주세요', 'Please leave out the ham', 0, null),
('r11-c', 'r11', '치즈김밥', 'Cheese gimbap', 4500, '{egg,pork,seafood,dairy}', '{soy,wheat}', '햄 빼 주세요', 'Please leave out the ham', 0, null),
('r11-d', 'r11', '김치김밥', 'Kimchi gimbap', 4500, '{egg,pork,seafood}', '{soy,wheat}', '햄 빼 주세요', 'Please leave out the ham', 0, null),
('r11-e', 'r11', '야채김밥', 'Veggie gimbap', 4500, '{egg}', '{seafood,soy,wheat}', null, null, 0, null),
('r11-f', 'r11', '땡초김밥', 'Hot pepper gimbap', 4500, '{egg,pork,seafood}', '{soy,wheat}', '햄 빼 주세요', 'Please leave out the ham', 0, null),
('r11-g', 'r11', '샐러드김밥', 'Salad gimbap', 5500, '{egg,pork,seafood}', '{soy,wheat}', '햄 빼 주세요', 'Please leave out the ham', 0, null),
('r11-h', 'r11', '치즈땡초김밥', 'Cheese hot pepper gimbap', 5500, '{egg,pork,seafood,dairy}', '{soy,wheat}', '햄 빼 주세요', 'Please leave out the ham', 0, null),
('r11-i', 'r11', '참치땡초김밥', 'Tuna hot pepper gimbap', 5500, '{egg,pork,seafood}', '{soy,wheat}', '햄 빼 주세요', 'Please leave out the ham', 0, null),
('r11-j', 'r11', '멸치땡초김밥', 'Anchovy hot pepper gimbap', 5500, '{egg,pork,seafood}', '{soy,wheat}', '햄 빼 주세요', 'Please leave out the ham', 0, null),
('r11-k', 'r11', '계란말이김밥', 'Rolled omelette gimbap', 6000, '{egg,pork,seafood}', '{soy,wheat}', '햄 빼 주세요', 'Please leave out the ham', 0, null),
('r11-l', 'r11', '소고기김밥', 'Beef gimbap', 5500, '{egg,pork,seafood,beef}', '{soy,wheat}', '햄 빼 주세요', 'Please leave out the ham', 0, null),
('r11-m', 'r11', '누드김밥', 'Rice-outside gimbap', 6000, '{egg,pork,seafood}', '{soy,wheat}', '햄 빼 주세요', 'Please leave out the ham', 0, null),
('r11-n', 'r11', '돈까스김밥', 'Pork cutlet gimbap', 6000, '{egg,pork,seafood,wheat}', '{soy}', null, null, 0, null),
('r11-o', 'r11', '고기만두', 'Meat dumplings', 6000, '{pork,wheat}', '{beef,soy,egg}', null, null, 0, null),
('r11-p', 'r11', '김치만두', 'Kimchi dumplings', 6000, '{pork,wheat}', '{soy,seafood,egg}', null, null, 0, null),
('r11-q', 'r11', '오뎅', 'Fish cake', 6000, '{seafood,wheat}', '{soy}', null, null, 0, null),
('r11-r', 'r11', '우동', 'Udon', 6000, '{wheat,seafood}', '{soy,egg}', null, null, 0, null),
('r11-s', 'r11', '김치우동', 'Kimchi udon', 6500, '{wheat,seafood}', '{pork,soy}', null, null, 0, null),
('r11-t', 'r11', '계란후라이', 'Fried egg', 1000, '{egg}', '{}', null, null, 0, null),
('r11-u', 'r11', '라면', 'Ramyeon', 5000, '{wheat}', '{beef,pork,soy,egg,seafood}', null, null, 0, null),
('r11-v', 'r11', '떡라면', 'Ramyeon with rice cake', 5500, '{wheat}', '{beef,pork,soy,egg,seafood}', null, null, 0, null),
('r11-w', 'r11', '치즈라면', 'Cheese ramyeon', 5500, '{wheat,dairy}', '{beef,pork,soy,egg,seafood}', null, null, 0, null),
('r11-x', 'r11', '만두라면', 'Dumpling ramyeon', 5500, '{wheat,pork}', '{beef,soy,egg,seafood}', null, null, 0, null),
('r11-y', 'r11', '김치라면', 'Kimchi ramyeon', 5500, '{wheat}', '{beef,pork,soy,egg,seafood}', null, null, 0, null),
('r11-z', 'r11', '짬뽕라면', 'Spicy seafood ramyeon', 6500, '{wheat,seafood}', '{beef,pork,soy,egg}', null, null, 0, null),
('r11-aa', 'r11', '쫄면', 'Chewy cold noodles', 6500, '{wheat,egg}', '{soy}', null, null, 0, null),
('r11-ab', 'r11', '칼국수', 'Knife-cut noodles', 8500, '{wheat}', '{seafood,egg,soy}', null, null, 0, null),
('r11-ac', 'r11', '항아리김치칼국수', 'Kimchi knife-cut noodles', 9500, '{wheat}', '{seafood,pork,soy}', null, null, 0, null),
('r11-ad', 'r11', '떡국', 'Rice cake soup', 8500, '{egg}', '{beef,soy,seafood}', null, null, 0, null),
('r11-ae', 'r11', '만두국', 'Dumpling soup', 8500, '{pork,wheat,egg}', '{beef,soy}', null, null, 0, null),
('r11-af', 'r11', '떡만두국', 'Rice cake & dumpling soup', 8500, '{pork,wheat,egg}', '{beef,soy}', null, null, 0, null),
('r11-ag', 'r11', '라볶이', 'Ramen tteokbokki', 6500, '{wheat,soy,seafood}', '{egg}', null, null, 0, null),
('r11-ah', 'r11', '치즈라볶이', 'Cheese ramen tteokbokki', 7500, '{wheat,soy,seafood,dairy}', '{egg}', null, null, 0, null),
('r11-ai', 'r11', '떡볶이', 'Tteokbokki', 6000, '{soy,seafood}', '{wheat,egg}', null, null, 0, null),
('r11-aj', 'r11', '치즈떡볶이', 'Cheese tteokbokki', 7000, '{soy,seafood,dairy}', '{wheat,egg}', null, null, 0, null),
('r11-ak', 'r11', '물냉면', 'Cold noodle soup', 6500, '{wheat}', '{beef,egg,soy}', null, null, 0, null),
('r11-al', 'r11', '비빔냉면', 'Spicy cold noodles', 6500, '{wheat}', '{beef,egg,soy}', null, null, 0, null),
('r11-am', 'r11', '공기밥', 'Bowl of rice', 1000, '{}', '{}', null, null, 0, null),
('r11-an', 'r11', '콜라', 'Cola', 2000, '{}', '{}', null, null, 0, null),
('r11-ao', 'r11', '사이다', 'Lemon-lime soda', 2000, '{}', '{}', null, null, 0, null),
('r11-ap', 'r11', '김치찌개', 'Kimchi stew (rice included)', 9000, '{pork}', '{soy,seafood}', null, null, 0, null),
('r11-aq', 'r11', '참치찌개', 'Tuna stew (rice included)', 9000, '{seafood}', '{pork,soy}', null, null, 0, null),
('r11-ar', 'r11', '된장찌개', 'Soybean paste stew (rice included)', 9000, '{soy}', '{seafood,beef,pork}', null, null, 0, null),
('r11-as', 'r11', '순두부찌개', 'Soft tofu stew (rice included)', 9000, '{soy}', '{seafood,pork,egg}', null, null, 0, null),
('r11-at', 'r11', '김치볶음밥', 'Kimchi fried rice', 9000, '{egg}', '{pork,soy,seafood}', null, null, 0, null),
('r11-au', 'r11', '오무라이스', 'Omurice', 9000, '{egg}', '{pork,wheat,dairy,soy}', null, null, 0, null),
('r11-av', 'r11', '부대찌개', 'Army stew (rice included)', 9500, '{pork,wheat,soy}', '{beef,dairy}', null, null, 0, null),
('r11-aw', 'r11', '육개장', 'Spicy beef soup', 9500, '{beef}', '{soy,egg,wheat}', null, null, 0, null),
('r11-ax', 'r11', '해물알탕', 'Spicy fish roe soup', 9500, '{seafood}', '{soy}', null, null, 0, null),
('r11-ay', 'r11', '갈비탕', 'Short rib soup', 10000, '{beef}', '{soy,egg,wheat}', null, null, 0, null),
('r11-az', 'r11', '뚝배기불고기', 'Bulgogi hot pot', 10000, '{beef,soy}', '{pork,wheat}', null, null, 0, null),
('r11-ba', 'r11', '양푼비빔밥(2인)+된장찌개', 'Bibimbap for 2 + soybean paste stew', 20000, '{soy,egg}', '{beef,pork,seafood,wheat}', null, null, 0, null),
('r11-bb', 'r11', '비빔밥', 'Bibimbap', 9000, '{soy,egg}', '{beef,wheat}', null, null, 0, null),
('r11-bc', 'r11', '돌솥비빔밥', 'Stone pot bibimbap', 10000, '{soy,egg}', '{beef,wheat}', null, null, 0, null),
('r11-bd', 'r11', '불고기덮밥', 'Bulgogi rice bowl', 9500, '{beef,soy}', '{pork,wheat}', null, null, 0, null),
('r11-be', 'r11', '제육덮밥', 'Spicy pork rice bowl', 9500, '{pork,soy}', '{wheat}', null, null, 0, null),
('r11-bf', 'r11', '오징어덮밥', 'Spicy squid rice bowl', 10000, '{seafood,soy}', '{pork,wheat}', null, null, 0, null),
('r11-bg', 'r11', '참치덮밥', 'Tuna rice bowl', 9500, '{seafood}', '{egg,soy}', null, null, 0, null),
('r11-bh', 'r11', '치즈덮밥', 'Cheese rice bowl', 9500, '{dairy}', '{pork,egg,soy,wheat}', null, null, 0, null),
('r11-bi', 'r11', '스페셜정식', 'Special set meal (contents not listed)', 14000, '{}', '{pork,beef,chicken,seafood,egg,dairy,wheat,soy}', null, null, 0, null),
('r11-bj', 'r11', '돈까스', 'Pork cutlet', 9500, '{pork,wheat,egg}', '{dairy,soy,beef}', null, null, 0, null),
('r11-bk', 'r11', '치즈돈까스', 'Cheese pork cutlet', 9500, '{pork,wheat,egg,dairy}', '{soy,beef}', null, null, 0, null)
on conflict (id) do nothing;

-- r12 Sarai Doner Kebab: Delivery app menu (Nov 2026). Lamb is tagged "may contain beef" until the app has a lamb ingredient
insert into dishes (id, restaurant_id, name_ko, name_en, price_won, contains, may_contain, leave_out_ko, leave_out_en, verified_count, last_checked) values
('r12-a', 'r12', '닭고기 랩 케밥', 'Chicken wrap kebab', 7500, '{chicken,wheat}', '{dairy,egg,soy}', null, null, 0, null),
('r12-b', 'r12', '치즈 닭고기 랩', 'Cheese chicken wrap', 8900, '{chicken,wheat,dairy}', '{egg,soy}', null, null, 0, null),
('r12-c', 'r12', '양고기 랩 케밥', 'Lamb wrap kebab', 8500, '{wheat}', '{beef,dairy,egg,soy}', null, null, 0, null),
('r12-d', 'r12', '치즈 양고기 랩', 'Cheese lamb wrap', 9900, '{wheat,dairy}', '{beef,egg,soy}', null, null, 0, null),
('r12-e', 'r12', '믹스 랩 케밥', 'Mix wrap kebab (lamb + chicken)', 9500, '{chicken,wheat}', '{beef,dairy,egg,soy}', null, null, 0, null),
('r12-f', 'r12', '치즈 믹스 케밥', 'Cheese mix kebab', 10500, '{chicken,wheat,dairy}', '{beef,egg,soy}', null, null, 0, null),
('r12-g', 'r12', '점보 닭고기 케밥', 'Jumbo chicken kebab (baguette)', 8500, '{chicken,wheat}', '{dairy,egg,soy}', null, null, 0, null),
('r12-h', 'r12', '점보 양고기 케밥', 'Jumbo lamb kebab (baguette)', 9500, '{wheat}', '{beef,dairy,egg,soy}', null, null, 0, null),
('r12-i', 'r12', '점보 믹스 케밥', 'Jumbo mix kebab (baguette)', 9900, '{chicken,wheat}', '{beef,dairy,egg,soy}', null, null, 0, null),
('r12-j', 'r12', '라이스 랩 닭고기', 'Rice wrap, chicken', 8900, '{chicken,wheat}', '{dairy,egg,soy}', null, null, 0, null),
('r12-k', 'r12', '라이스 랩 양고기', 'Rice wrap, lamb', 9900, '{wheat}', '{beef,dairy,egg,soy}', null, null, 0, null),
('r12-l', 'r12', '라이스 랩 믹스', 'Rice wrap, mix', 10900, '{chicken,wheat}', '{beef,dairy,egg,soy}', null, null, 0, null),
('r12-m', 'r12', '라이스 닭고기 플레이트', 'Rice chicken plate', 12900, '{chicken}', '{wheat,dairy,egg,soy}', null, null, 0, null),
('r12-n', 'r12', '라이스 양고기 플레이트', 'Rice lamb plate', 13500, '{}', '{beef,wheat,dairy,egg,soy}', null, null, 0, null),
('r12-o', 'r12', '라이스 믹스 플레이트', 'Rice mix plate', 13900, '{chicken}', '{beef,wheat,dairy,egg,soy}', null, null, 0, null),
('r12-p', 'r12', '이스켄데르 양고기 케밥', 'Iskender lamb kebab (yogurt, bread)', 16900, '{dairy,wheat}', '{beef}', null, null, 0, null),
('r12-q', 'r12', '이스켄데리 케밥 닭고기', 'Iskender chicken kebab', 15900, '{chicken,dairy,wheat}', '{}', null, null, 0, null),
('r12-r', 'r12', '박스 닭고기 케밥', 'Box chicken kebab + soft drink', 11900, '{chicken}', '{wheat,dairy,egg,soy}', null, null, 0, null),
('r12-s', 'r12', '박스 양고기 케밥', 'Box lamb kebab + soft drink', 12900, '{}', '{beef,wheat,dairy,egg,soy}', null, null, 0, null),
('r12-t', 'r12', '박스 믹스 케밥', 'Box mix kebab + soft drink', 13500, '{chicken}', '{beef,wheat,dairy,egg,soy}', null, null, 0, null),
('r12-u', 'r12', '닭고기 케밥 세트', 'Chicken kebab set (fries + drink)', 12900, '{chicken,wheat}', '{dairy,egg,soy}', null, null, 0, null),
('r12-v', 'r12', '양고기 케밥 세트', 'Lamb kebab set (fries + drink)', 13900, '{wheat}', '{beef,dairy,egg,soy}', null, null, 0, null),
('r12-w', 'r12', '믹스 케밥 세트', 'Mix kebab set (fries + drink)', 14500, '{chicken,wheat}', '{beef,dairy,egg,soy}', null, null, 0, null),
('r12-x', 'r12', '점보 닭고기 세트', 'Jumbo chicken set (fries + drink)', 12900, '{chicken,wheat}', '{dairy,egg,soy}', null, null, 0, null),
('r12-y', 'r12', '점보 양고기 세트', 'Jumbo lamb set (fries + drink)', 13900, '{wheat}', '{beef,dairy,egg,soy}', null, null, 0, null),
('r12-z', 'r12', '점보 믹스 세트', 'Jumbo mix set (fries + drink)', 14500, '{chicken,wheat}', '{beef,dairy,egg,soy}', null, null, 0, null),
('r12-aa', 'r12', '커플 세트 (케밥 2인분)', 'Couple set: chicken wrap + jumbo lamb, fries, 2 drinks', 23900, '{chicken,wheat}', '{beef,dairy,egg,soy}', null, null, 0, null),
('r12-ab', 'r12', '팔라펠 랩', 'Falafel wrap (vegan)', 6900, '{wheat}', '{soy}', null, null, 0, null),
('r12-ac', 'r12', '팔라펠 플레이트', 'Falafel plate (vegan)', 11900, '{}', '{wheat,soy}', null, null, 0, null),
('r12-ad', 'r12', '팔라펠 샐러드', 'Falafel salad (vegan)', 9900, '{}', '{wheat,soy}', null, null, 0, null),
('r12-ae', 'r12', '터키 카이막 (1인분)', 'Turkish kaymak with bread and honey', 9900, '{dairy,wheat}', '{}', null, null, 0, null),
('r12-af', 'r12', '감자튀김', 'French fries', 4500, '{}', '{wheat}', null, null, 0, null),
('r12-ag', 'r12', '화이트 소스', 'White sauce', 700, '{dairy}', '{egg}', null, null, 0, null),
('r12-ah', 'r12', '칠리 소스', 'Chili sauce', 700, '{}', '{}', null, null, 0, null),
('r12-ai', 'r12', '아이란', 'Ayran (yogurt drink)', 3500, '{dairy}', '{}', null, null, 0, null),
('r12-aj', 'r12', '망고 라씨', 'Mango lassi', 3500, '{dairy}', '{}', null, null, 0, null),
('r12-ak', 'r12', '오렌지 쥬스', 'Orange juice', 3000, '{}', '{}', null, null, 0, null),
('r12-al', 'r12', '포도 쥬스', 'Grape juice', 3000, '{}', '{}', null, null, 0, null),
('r12-am', 'r12', '생수', 'Water', 1000, '{}', '{}', null, null, 0, null)
on conflict (id) do nothing;

-- r15 Ebisu: Menu board image + delivery app (Nov 2026)
insert into dishes (id, restaurant_id, name_ko, name_en, price_won, contains, may_contain, leave_out_ko, leave_out_en, verified_count, last_checked) values
('r15-a', 'r15', '특선 3인 정식', 'Special set for 3: abalone, eel, chirashi, roll, tempura', 75000, '{seafood,wheat,soy}', '{egg,dairy,alcohol}', null, null, 0, null),
('r15-b', 'r15', '특선 2인 정식', 'Special set for 2: chirashi, udon, roll, tempura', 55000, '{seafood,wheat,soy}', '{egg,dairy}', null, null, 0, null),
('r15-c', 'r15', '보양 2인 정식', 'Stamina set for 2: abalone, eel, roll', 55000, '{seafood,soy}', '{wheat,egg,dairy,alcohol}', null, null, 0, null),
('r15-d', 'r15', '지라시', 'Chirashi (sashimi over rice)', 20000, '{seafood}', '{soy,egg,wheat}', null, null, 0, null),
('r15-e', 'r15', '장어덮밥', 'Grilled eel rice bowl', 18000, '{seafood,soy}', '{wheat,egg,alcohol}', null, null, 0, null),
('r15-f', 'r15', '전복솥밥', 'Abalone pot rice', 25000, '{seafood}', '{soy,egg}', null, null, 0, null),
('r15-g', 'r15', '회덮밥', 'Raw fish rice bowl', 10000, '{seafood}', '{soy,egg,wheat}', null, null, 0, null),
('r15-h', 'r15', '가라아게돈 (1인)', 'Fried chicken rice bowl', 12000, '{chicken,wheat,soy}', '{egg}', null, null, 0, null),
('r15-i', 'r15', '에비수 우동', 'Ebisu udon', 17000, '{wheat,seafood}', '{soy,egg}', null, null, 0, null),
('r15-j', 'r15', '스페셜반반 롤', 'Special half & half roll', 16000, '{seafood}', '{egg,wheat,soy,dairy}', null, null, 0, null),
('r15-k', 'r15', '에비수 롤', 'Ebisu roll', 15000, '{seafood}', '{egg,wheat,soy,dairy}', null, null, 0, null),
('r15-l', 'r15', '레인보우 롤', 'Rainbow roll', 15000, '{seafood}', '{egg,soy}', null, null, 0, null),
('r15-m', 'r15', '필라델피아 롤', 'Philadelphia roll', 15000, '{seafood,dairy}', '{egg,soy}', null, null, 0, null),
('r15-n', 'r15', '생참치연어 롤', 'Fresh tuna & salmon roll', 16000, '{seafood}', '{soy}', null, null, 0, null),
('r15-o', 'r15', '다이너마이트 롤', 'Dynamite roll', 10000, '{seafood,egg}', '{wheat,soy}', null, null, 0, null),
('r15-p', 'r15', '모듬튀김', 'Mixed tempura', 10000, '{seafood,wheat}', '{egg}', null, null, 0, null),
('r15-q', 'r15', '굴튀김', 'Fried oysters', 7000, '{seafood,wheat}', '{egg}', null, null, 0, null),
('r15-r', 'r15', '치킨가라아게', 'Chicken karaage', 7000, '{chicken,wheat,soy}', '{egg}', null, null, 0, null),
('r15-s', 'r15', '멘보샤', 'Shrimp toast', 7000, '{seafood,wheat}', '{egg}', null, null, 0, null),
('r15-t', 'r15', '새우튀김', 'Fried shrimp', 10000, '{seafood,wheat}', '{egg}', null, null, 0, null)
on conflict (id) do nothing;

-- 원산지 for r04 Crazy Pa-dak
update restaurants set origin = '[{"itemKo": "순살치킨", "country": "브라질산, 태국산"}, {"itemKo": "밀떡", "country": "호주산, 미국산"}, {"itemKo": "새우", "country": "베트남산"}, {"itemKo": "베이컨", "country": "스페인, 미국, 브라질 등"}, {"itemKo": "대파", "country": "국내산"}, {"itemKo": "닭똥집", "country": "국내산"}]'::jsonb where id = 'r04';

-- 원산지 for r12 Sarai Doner Kebab
update restaurants set origin = '[{"itemKo": "소고기", "country": "호주산, 뉴질랜드산"}, {"itemKo": "양고기", "country": "호주산"}, {"itemKo": "닭고기", "country": "브라질산"}, {"itemKo": "쌀", "country": "국내산, 미국산"}, {"itemKo": "고등어", "country": "노르웨이산"}]'::jsonb where id = 'r12';

-- 원산지 for r15 Ebisu
update restaurants set origin = '[{"itemKo": "쌀", "country": "국내산"}, {"itemKo": "도미, 광어", "country": "국내산"}, {"itemKo": "연어", "country": "노르웨이산"}, {"itemKo": "장어", "country": "중국산"}, {"itemKo": "치킨", "country": "브라질"}, {"itemKo": "새우튀김용 새우", "country": "에콰도르"}, {"itemKo": "전복", "country": "완도산"}]'::jsonb where id = 'r15';

commit;
