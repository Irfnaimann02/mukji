-- 009_sarai_food_type_halal.sql
-- Sarai Doner Kebab (r12): change food_type from 'other' to 'halal' (Nov 2026). Part of #3.
-- food_type only changes the icon and the food-type filter.
-- halal_certified stays false: Sarai is not certified, so chicken/beef dishes stay "Ask first" for halal users.
-- Safe to re-run: setting the same value again does nothing.

update restaurants
set food_type = 'halal'
where id = 'r12';  -- 사라이도네르케밥
