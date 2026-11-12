-- 015_restaurant_sources.sql
-- Fills restaurants.sources so the trust badge (#8) shows where our data comes from. Part of #3.
-- 'menu' = we have menu photos/screenshots; '원산지 label' = we have the 원산지 board.
-- TriBoTea (r16) stays empty until its menu is added.
-- Safe to re-run: it sets the same values again.

update restaurants set sources = '{menu,원산지 label}'
where id in ('r04', 'r12', 'r15');

update restaurants set sources = '{menu}'
where id in ('r01', 'r02', 'r03', 'r05', 'r06', 'r07', 'r08', 'r10', 'r11');