-- 018_tribotea_category.sql
-- TriBoTea (r16) has no menu yet, so it gets the 까페 food-type hint from 017. Part of #47.
-- The "No menu yet · Typical for Café" card then shows on its detail page.
-- Safe to re-run: it sets the same value again.

update restaurants set category = '까페' where id = 'r16';
