-- 016_menu_pipeline.sql
-- Phase B of the menu pipeline (follow-up to #56). Part of #47.
-- 1. match_dish(name): any dish name -> base dish, add-ons and tags from the dish library (same rules as 014)
-- 2. approve_menu_submission(id): turns a checked draft in menu_submissions into dishes, all or nothing
-- 3. Signed-in users (guests included) can send a menu photo: a private storage bucket + a pending row
-- Only the team (SQL editor) can run the two functions. Approving is never done from the app.
-- Safe to re-run: functions are replaced, the bucket is made once, every policy is dropped before it is made.

-- ---------- 1. match_dish ----------
-- Returns one row, or no row when the name has no base dish (sets, 정식, sauces, combos, one-offs).
create or replace function public.match_dish(dish_name text)
returns table (base_dish text, add_ons text[], contains text[], may_contain text[], kind text)
language sql
stable
set search_path = public
as $$
  with d as (
    select replace(replace(replace(replace(coalesce(dish_name, ''), ' ', ''), '돈가스', '돈까스'), '만둣국', '만두국'), '쥬스', '주스') as n
  ), combo as (
    select 1 from d
    where d.n like '%세트%' or d.n like '%정식%' or d.n like '%소스%'
       or (d.n like '%+%'
           and exists (select 1 from public.base_dishes b where strpos(split_part(d.n, '+', 1), b.name_ko) > 0)
           and exists (select 1 from public.base_dishes b where strpos(split_part(d.n, '+', 2), b.name_ko) > 0))
  ), bm as (
    -- the base word that ends last wins; tie: the longer word
    select b.name_ko as bk, strpos(d.n, b.name_ko) as bs, length(b.name_ko) as bl,
           b.contains as bc, b.may_contain as bmm, b.kind
    from d join public.base_dishes b on strpos(d.n, b.name_ko) > 0
    where not exists (select 1 from combo)
    order by strpos(d.n, b.name_ko) + length(b.name_ko) desc, length(b.name_ko) desc
    limit 1
  ), am as (
    -- add-on words outside the base word
    select a.word, strpos(d.n, a.word) as s, length(a.word) as l, a.contains as c, a.may_contain as m
    from d cross join bm
    join public.add_ons a on strpos(d.n, a.word) > 0
    where strpos(d.n, a.word) + length(a.word) <= bm.bs or strpos(d.n, a.word) >= bm.bs + bm.bl
  ), am2 as (
    -- when two add-ons overlap, the longer one wins (닭고기, not 고기)
    select x.* from am x
    where not exists (select 1 from am y where y.l > x.l and x.s >= y.s and x.s + x.l <= y.s + y.l)
  ), lc as (
    select array(select distinct e from (select unnest(bm.bc) as e from bm
                                         union all select unnest(c) from am2) t order by 1) as v
  )
  select bm.bk,
         coalesce((select array_agg(word order by s) from am2), '{}'),
         (select v from lc),
         array(select distinct e from (select unnest(bm.bmm) as e from bm
                                       union all select unnest(m) from am2) t
               where e not in (select unnest(v) from lc) order by 1),
         bm.kind
  from bm;
$$;

-- ---------- 2. approve_menu_submission ----------
-- draft is a list like:
--   [{ "name_ko": "치즈라면", "price_won": 5000, "name_en": "Cheese ramyeon" },
--    { "name_ko": "사장님특선", "price_won": 9000, "contains": ["pork"], "may_contain": ["soy"] }]
-- Rules (all or nothing: if anything is wrong, nothing is added and the error lists every problem):
--   - every item needs name_ko and a price above 0 (we never invent prices)
--   - an item whose name has no base dish needs its own contains / may_contain, so it can never show as Safe by accident
--   - tags written in the draft are added on top of the library's (stricter wins)
--   - a dish with the same name already at that restaurant is skipped, not duplicated
create or replace function public.approve_menu_submission(submission_id uuid)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  sub public.menu_submissions%rowtype;
  item jsonb;
  m record;
  n integer := 0;
  added integer := 0;
  skipped text[] := '{}';
  problems text[] := '{}';
  item_name text;
  item_price integer;
  item_contains text[];
  item_may text[];
  all_contains text[];
  all_may text[];
begin
  select * into sub from public.menu_submissions where id = submission_id for update;
  if not found then
    raise exception 'menu submission % not found', submission_id;
  end if;
  if sub.status <> 'pending' then
    raise exception 'menu submission % is already %', submission_id, sub.status;
  end if;
  if jsonb_typeof(sub.draft) <> 'array' or jsonb_array_length(sub.draft) = 0 then
    raise exception 'menu submission % has an empty draft', submission_id;
  end if;

  -- pass 1: check every item before writing anything
  for item in select value from jsonb_array_elements(sub.draft) loop
    n := n + 1;
    item_name := nullif(trim(item->>'name_ko'), '');
    if item_name is null then
      problems := problems || format('item %s: no name_ko', n);
      continue;
    end if;
    if (item->>'price_won') is null or (item->>'price_won') !~ '^[0-9]+$' or (item->>'price_won')::integer <= 0 then
      problems := problems || format('%s: no price', item_name);
    end if;
    if not exists (select 1 from public.match_dish(item_name))
       and coalesce(jsonb_array_length(item->'contains'), 0) + coalesce(jsonb_array_length(item->'may_contain'), 0) = 0 then
      problems := problems || format('%s: no base dish, add contains / may_contain by hand', item_name);
    end if;
  end loop;
  if cardinality(problems) > 0 then
    raise exception 'not approved, fix the draft first: %', array_to_string(problems, '; ');
  end if;

  -- pass 2: add the dishes
  n := 0;
  for item in select value from jsonb_array_elements(sub.draft) loop
    n := n + 1;
    item_name := trim(item->>'name_ko');
    item_price := (item->>'price_won')::integer;

    if exists (select 1 from public.dishes where restaurant_id = sub.restaurant_id and name_ko = item_name) then
      skipped := skipped || item_name;
      continue;
    end if;

    item_contains := coalesce(array(select jsonb_array_elements_text(item->'contains')), '{}');
    item_may := coalesce(array(select jsonb_array_elements_text(item->'may_contain')), '{}');
    m := null;
    select * into m from public.match_dish(item_name);

    all_contains := array(select distinct e from unnest(coalesce(m.contains, '{}') || item_contains) e order by 1);
    all_may := array(select distinct e from unnest(coalesce(m.may_contain, '{}') || item_may) e
                     where e <> all (all_contains) order by 1);

    insert into public.dishes (id, restaurant_id, name_ko, name_en, price_won,
                               contains, may_contain, base_dish, add_ons, last_checked)
    values (sub.restaurant_id || '-s' || left(replace(sub.id::text, '-', ''), 6) || '-' || n,
            sub.restaurant_id, item_name,
            coalesce(nullif(trim(item->>'name_en'), ''), item_name),
            item_price, all_contains, all_may, m.base_dish, coalesce(m.add_ons, '{}'), current_date);
    added := added + 1;
  end loop;

  update public.menu_submissions set status = 'approved', reviewed_at = now() where id = submission_id;
  return jsonb_build_object('added', added, 'skipped_already_there', to_jsonb(skipped));
end;
$$;

-- Team only: the app can't call either function.
revoke execute on function public.match_dish(text) from public, anon, authenticated;
revoke execute on function public.approve_menu_submission(uuid) from public, anon, authenticated;

-- ---------- 3. Sending a menu photo from the app ----------
-- The submitter is whoever is signed in (guests included). They can add pending rows and see their own, nothing else.
alter table public.menu_submissions alter column submitted_by set default auth.uid();

drop policy if exists "menu_submissions: add own pending" on public.menu_submissions;
create policy "menu_submissions: add own pending" on public.menu_submissions
  for insert to authenticated
  with check (submitted_by = (select auth.uid()) and status = 'pending' and reviewed_at is null);

drop policy if exists "menu_submissions: read own" on public.menu_submissions;
create policy "menu_submissions: read own" on public.menu_submissions
  for select to authenticated
  using (submitted_by = (select auth.uid()));

-- Private bucket for menu photos: images only, up to 5 MB. Files go in a folder named after the user id.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('menu-photos', 'menu-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do nothing;

drop policy if exists "menu-photos: upload to own folder" on storage.objects;
create policy "menu-photos: upload to own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'menu-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
