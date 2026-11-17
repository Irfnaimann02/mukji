-- 024_lamb.sql
-- Adds "lamb" as an ingredient. Before this, Sarai's lamb kebabs (r12) had no
-- meat tag, so a vegan saw a lamb wrap as "Ask first" (only because it may
-- contain beef) instead of "Avoid".
-- App side: Ingredient 'lamb'; vegan blocks it; halal treats it like beef and
-- chicken (Ask first unless the place is halal certified).
-- Safe to re-run.

-- ---------- 1. Allow 'lamb' in the tag checks ----------
alter table public.base_dishes drop constraint if exists base_dishes_contains_check;
alter table public.base_dishes add constraint base_dishes_contains_check
  check (contains <@ '{pork,beef,chicken,lamb,seafood,egg,dairy,alcohol,peanut,wheat,soy}'::text[]);
alter table public.base_dishes drop constraint if exists base_dishes_may_contain_check;
alter table public.base_dishes add constraint base_dishes_may_contain_check
  check (may_contain <@ '{pork,beef,chicken,lamb,seafood,egg,dairy,alcohol,peanut,wheat,soy}'::text[]);

alter table public.add_ons drop constraint if exists add_ons_contains_check;
alter table public.add_ons add constraint add_ons_contains_check
  check (contains <@ '{pork,beef,chicken,lamb,seafood,egg,dairy,alcohol,peanut,wheat,soy}'::text[]);
alter table public.add_ons drop constraint if exists add_ons_may_contain_check;
alter table public.add_ons add constraint add_ons_may_contain_check
  check (may_contain <@ '{pork,beef,chicken,lamb,seafood,egg,dairy,alcohol,peanut,wheat,soy}'::text[]);

alter table public.category_defaults drop constraint if exists category_defaults_contains_check;
alter table public.category_defaults add constraint category_defaults_contains_check
  check (contains <@ '{pork,beef,chicken,lamb,seafood,egg,dairy,alcohol,peanut,wheat,soy}'::text[]);
alter table public.category_defaults drop constraint if exists category_defaults_may_contain_check;
alter table public.category_defaults add constraint category_defaults_may_contain_check
  check (may_contain <@ '{pork,beef,chicken,lamb,seafood,egg,dairy,alcohol,peanut,wheat,soy}'::text[]);

-- ---------- 2. Dish library: 양고기 = lamb ----------
-- So new menus (photo approvals) tag lamb by themselves, e.g. "양고기 덮밥".
insert into public.add_ons (word, contains, may_contain, note)
values ('양고기', '{lamb}', '{}', 'lamb')
on conflict (word) do update
  set contains = excluded.contains, may_contain = excluded.may_contain, note = excluded.note;

-- ---------- 3. Sarai (r12) ----------
-- Contains lamb: the name says so (양고기 in Korean, or "lamb" in the English
-- name for 믹스 랩 케밥 "lamb + chicken" and the couple set "jumbo lamb").
update public.dishes
set contains = array_append(contains, 'lamb')
where restaurant_id = 'r12'
  and not ('lamb' = any (contains))
  and (name_ko like '%양고기%' or name_en ilike '%lamb%');

-- May contain lamb: the other "믹스" (mix) dishes. Sarai's menu only says
-- "lamb + chicken" for the mix wrap, so for the rest we say "ask first".
update public.dishes
set may_contain = array_append(may_contain, 'lamb')
where restaurant_id = 'r12'
  and name_ko like '%믹스%'
  and not ('lamb' = any (contains))
  and not ('lamb' = any (may_contain));

-- ---------- 4. Check ----------
-- Should show 11 "contains" and 7 "may contain".
select
  count(*) filter (where 'lamb' = any (contains)) as contains_lamb,
  count(*) filter (where 'lamb' = any (may_contain)) as may_contain_lamb
from public.dishes
where restaurant_id = 'r12';
