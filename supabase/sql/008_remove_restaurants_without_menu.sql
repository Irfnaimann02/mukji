-- 008_remove_restaurants_without_menu.sql
-- Removes the 3 restaurants that still had no menu (Nov 2026). Part of #3.
-- They came from 004_restaurants_public_data.sql. Their dishes table had 0 rows,
-- so nothing else is affected. Re-add them with a new file once menus are collected.
-- Safe to re-run: deleting rows that are already gone does nothing.

delete from restaurants
where id in ('r09', 'r13', 'r14')  -- 라화쿵부, 투르키스탄, 브쿠스노스베트
  and not exists (select 1 from dishes d where d.restaurant_id = restaurants.id);
