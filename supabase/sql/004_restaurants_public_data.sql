-- 14 restaurants near ERICA from public licence data (행정안전부 식품_일반음식점, downloaded 31 Oct 2026).
-- Added as 'pending' (hidden from the app) until dishes and 원산지 are collected and Adib approves.
-- Coordinates converted from EPSG:5174 to WGS84. Names are licence names; check against the shop sign.
insert into restaurants (id, name_ko, name_en, food_type, lat, lng, address, phone, public_data_id, location_source, status)
values
  ('r02', '알촌', 'Alchon', 'korean', 37.2995264, 126.8384309, '안산시 상록구 학사2길 2, 1층 (사동)', '031-415-3001', '5550000-101-2002-00213', 'public_data', 'pending'),
  ('r03', '일미닭갈비 파전', 'Ilmi Dakgalbi', 'korean', 37.2995264, 126.8384309, '안산시 상록구 학사2길 2, 2층 (사동)', '031-503-8800', '5550000-101-2015-00143', 'public_data', 'pending'),
  ('r04', '미쳐버린파닭', 'Crazy Pa-dak', 'chicken', 37.2998811, 126.8384378, '안산시 상록구 학사2길 3-3, 1층 (사동)', '031-407-9246', '5550000-101-2006-00171', 'public_data', 'pending'),
  ('r05', '더치킨', 'The Chicken', 'chicken', 37.2998526, 126.8392245, '안산시 상록구 학사2길 10, 1층 (사동)', '031-437-8777', '5550000-101-2016-00133', 'public_data', 'pending'),
  ('r06', '은화수식당안산한양대점', 'Eunhwasu Sikdang', 'other', 37.3002783, 126.8386808, '안산시 상록구 한양대학로 45-1, 1층 일부  (사동)', '070-8899-7628', '5550000-101-2018-00094', 'public_data', 'pending'),
  ('r07', '북촌손만두', 'Bukchon Handmade Dumplings', 'korean', 37.3003269, 126.8387985, '안산시 상록구 한양대학로 45, 2층 전체호 (사동)', '031-501-8018', '5550000-101-2019-00077', 'public_data', 'pending'),
  ('r08', '한솥(한대점)', 'Hansot Lunchbox', 'korean', 37.3007102, 126.8383813, '안산시 상록구 한양대학로 48, 한성빌딩 109호 (사동)', '031-501-5556', '5550000-101-1999-00243', 'public_data', 'pending'),
  ('r09', '라화쿵부안산한양대점', 'Lahwa Kungfu Malatang', 'other', 37.3013904, 126.8373079, '안산시 상록구 한양대학로 68, 한대빌딩 101~102호 (사동)', '031-406-8788', '5550000-101-2019-00086', 'public_data', 'pending'),
  ('r10', '남월 쌀국수 안산한양대 본점', 'Namwol Pho', 'noodles', 37.3013926, 126.8384188, '안산시 상록구 성안길 81, 1층 (사동)', '031-407-5021', '5550000-101-2012-00048', 'public_data', 'pending'),
  ('r11', '김밥천국', 'Gimbap Cheonguk', 'korean', 37.3010416, 126.8392467, '안산시 상록구 한양대학로 38-1, 1층 (사동)', '031-416-9545', '5550000-101-2001-00217', 'public_data', 'pending'),
  ('r12', '사라이도네르케밥', 'Sarai Doner Kebab', 'other', 37.3002783, 126.8386808, '안산시 상록구 한양대학로 45-1, 1층 (사동)', '', '5550000-101-1999-00294', 'public_data', 'pending'),
  ('r13', '투르키스탄(TULKISTAN)', 'Turkistan', 'other', 37.3000869, 126.8402481, '안산시 상록구 학사4길 17-1 (사동, 1층전부)', '', '5550000-101-2006-00255', 'public_data', 'pending'),
  ('r14', '브쿠스노스베트(vkusnosvet)', 'Vkusnosvet', 'other', 37.3001440, 126.8403869, '안산시 상록구 학사4길 19, 1층 (사동)', '031-415-5577', '5550000-101-2004-00026', 'public_data', 'pending'),
  ('r15', '에비수', 'Ebisu', 'other', 37.3014350, 126.8395416, '안산시 상록구 성안길 93, 1층 (사동)', '031-502-3012', '5550000-101-1999-00931', 'public_data', 'pending');

-- Meal Plan B: replace the Google Maps location with public data, add phone and licence number.
update restaurants
set lat = 37.3002258, lng = 126.8392716, phone = '031-408-2602',
    public_data_id = '5550000-101-2010-00352', location_source = 'public_data'
where id = 'r01';

-- Later the same evening: approved r02–r15 so the app shows them on the map
-- (menus still to be added; the detail page says "Menu not added yet").
update restaurants set status = 'approved' where id between 'r02' and 'r15' and status = 'pending';