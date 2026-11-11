-- 010_add_tribotea.sql
-- Adds TriBoTea (r16), a cafe at 학사4길 4, from public licence data (11 Nov 2026). Part of #3.
-- Coordinates converted from EPSG:5174 to WGS84. No phone yet ('').
-- Menu, prices and 원산지 still to be collected; dishes go in a later file.
-- Safe to re-run: if r16 already exists, nothing happens.

insert into restaurants (id, name_ko, name_en, food_type, lat, lng, address, phone, public_data_id, location_source, status)
values
  ('r16', '트라이뽀티(TriBoTea)', 'TriBoTea', 'cafe', 37.2992662988448, 126.838809296619, '안산시 상록구 학사4길 4, 1층 일부 (사동)', '', '5550000-101-2022-00117', 'public_data', 'approved')
on conflict (id) do nothing;
