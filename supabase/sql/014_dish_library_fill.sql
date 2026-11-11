-- 014_dish_library_fill.sql
-- Fills the dish library (#56) and links existing dishes to it. Part of #47.
-- Lists come from docs/dish-library-draft.md, checked against all 274 dishes with docs/dish-library-check.sql
-- (0 danger, 119 exact match). Decisions (2026-11-12): existing dishes KEEP their stored tags;
-- this file only fills base_dish and add_ons on dishes. contains / may_contain are not touched.
-- Matching: clean the name (no spaces; 돈가스→돈까스, 만둣국→만두국, 쥬스→주스), the base word that ends last
-- wins (tie: longer), add-ons are words outside the base (overlap: longer wins).
-- Not linked (stay hand-tagged): names with 세트 / 정식 / 소스, and "A+B" combos with a dish on both sides.
-- Safe to re-run: library rows are upserted, and links are worked out again from scratch.

-- ---------- 1. Library ----------
insert into public.base_dishes (name_ko, kind, contains, may_contain) values
  ('김밥', 'dish', '{egg,pork,seafood}', '{soy,wheat}'),
  ('야채김밥', 'dish', '{egg}', '{seafood,soy,wheat}'),
  ('라면', 'dish', '{wheat}', '{beef,pork,soy,egg,seafood}'),
  ('라면사리', 'side', '{wheat}', '{soy}'),
  ('떡볶이', 'dish', '{soy}', '{wheat,seafood,egg,pork,beef}'),
  ('라볶이', 'dish', '{wheat,soy,seafood}', '{egg}'),
  ('돈까스', 'dish', '{pork,wheat,egg}', '{dairy,soy,beef}'),
  ('만두', 'dish', '{wheat,pork}', '{beef,soy,egg,seafood}'),
  ('만두국', 'dish', '{wheat,egg,pork}', '{beef,soy,seafood}'),
  ('우동', 'dish', '{wheat,seafood}', '{soy,egg}'),
  ('우동사리', 'side', '{wheat}', '{}'),
  ('칼국수', 'dish', '{wheat}', '{seafood,egg,soy}'),
  ('국수', 'dish', '{wheat}', '{seafood,egg,soy}'),
  ('쌀국수', 'dish', '{}', '{seafood}'),
  ('냉면', 'dish', '{wheat}', '{beef,egg,soy}'),
  ('쫄면', 'dish', '{wheat,egg}', '{soy}'),
  ('김치찌개', 'dish', '{pork}', '{soy,seafood}'),
  ('된장찌개', 'dish', '{soy}', '{seafood,beef,pork}'),
  ('순두부찌개', 'dish', '{soy}', '{seafood,pork,egg}'),
  ('부대찌개', 'dish', '{pork,wheat,soy}', '{beef,dairy}'),
  ('찌개', 'dish', '{}', '{soy,pork,seafood,beef}'),
  ('덮밥', 'dish', '{}', '{soy,wheat,egg,pork,seafood}'),
  ('볶음밥', 'dish', '{egg}', '{soy,pork,seafood,wheat,chicken}'),
  ('비빔밥', 'dish', '{soy,egg}', '{beef,wheat}'),
  ('알밥', 'dish', '{seafood}', '{pork,soy,wheat,egg}'),
  ('치킨', 'dish', '{chicken,wheat}', '{soy,egg,dairy,peanut}'),
  ('순살', 'dish', '{chicken,wheat}', '{soy,egg,dairy,peanut}'),
  ('(뼈)', 'dish', '{chicken,wheat}', '{soy,egg,dairy,peanut}'),
  ('피자', 'dish', '{wheat,dairy}', '{soy,egg}'),
  ('부리또', 'dish', '{wheat}', '{dairy,egg}'),
  ('튀김', 'side', '{wheat}', '{egg}'),
  ('치즈스틱', 'side', '{dairy,wheat}', '{egg}'),
  ('치즈볼', 'side', '{dairy,wheat}', '{egg}'),
  ('카레', 'dish', '{wheat}', '{pork,beef,dairy}'),
  ('떡국', 'dish', '{egg}', '{beef,soy,seafood}'),
  ('막걸리', 'drink', '{alcohol}', '{wheat}'),
  ('맥주', 'drink', '{alcohol}', '{wheat}'),
  ('소주', 'drink', '{alcohol}', '{}'),
  ('공기밥', 'side', '{}', '{}'),
  ('콜라', 'drink', '{}', '{}'),
  ('사이다', 'drink', '{}', '{}'),
  ('음료수', 'drink', '{}', '{}'),
  ('생수', 'drink', '{}', '{}'),
  ('주스', 'drink', '{}', '{}'),
  ('식혜', 'drink', '{}', '{}'),
  ('함박', 'dish', '{beef,egg,wheat}', '{pork,dairy}'),
  ('오뎅', 'side', '{seafood,wheat}', '{soy}'),
  ('육개장', 'dish', '{beef}', '{soy,egg,wheat}'),
  ('갈비탕', 'dish', '{beef}', '{soy,egg,wheat}'),
  ('불고기', 'dish', '{beef,soy}', '{pork,wheat}'),
  ('떡갈비', 'dish', '{soy}', '{pork,beef,wheat,egg}'),
  ('계란후라이', 'side', '{egg}', '{}'),
  ('오무라이스', 'dish', '{egg}', '{pork,wheat,dairy,soy}'),
  ('반미', 'dish', '{wheat}', '{egg,soy,pork}'),
  ('팟타이', 'dish', '{egg,seafood}', '{peanut,soy}'),
  ('핫도그', 'dish', '{wheat}', '{pork}'),
  ('감자', 'side', '{}', '{wheat,dairy}'),
  ('떡사리', 'side', '{}', '{wheat}'),
  ('사리', 'side', '{}', '{}')
on conflict (name_ko) do update
  set kind = excluded.kind, contains = excluded.contains, may_contain = excluded.may_contain;

insert into public.add_ons (word, contains, may_contain) values
  ('치즈', '{dairy}', '{}'),
  ('모짜', '{dairy}', '{}'),
  ('로제', '{dairy}', '{}'),
  ('눈꽃', '{dairy}', '{}'),
  ('만두', '{pork,wheat}', '{beef,soy,egg}'),
  ('참치', '{seafood}', '{}'),
  ('어묵', '{seafood,wheat}', '{}'),
  ('오뎅', '{seafood,wheat}', '{}'),
  ('맛살', '{seafood}', '{}'),
  ('날치알', '{seafood}', '{}'),
  ('새우', '{seafood}', '{}'),
  ('굴', '{seafood}', '{}'),
  ('멸치', '{seafood}', '{}'),
  ('오징어', '{seafood}', '{}'),
  ('짬뽕', '{seafood}', '{}'),
  ('김치', '{}', '{seafood,pork}'),
  ('계란', '{egg}', '{}'),
  ('마요', '{egg}', '{}'),
  ('돈까스', '{pork,wheat,egg}', '{dairy,soy,beef}'),
  ('제육', '{pork,soy}', '{}'),
  ('돼지고기', '{pork}', '{}'),
  ('베이컨', '{pork}', '{}'),
  ('페퍼로니', '{pork}', '{beef}'),
  ('스팸', '{pork}', '{}'),
  ('햄', '{pork}', '{}'),
  ('소시지', '{pork}', '{}'),
  ('소고기', '{beef}', '{}'),
  ('불고기', '{beef,soy}', '{pork}'),
  ('닭고기', '{chicken}', '{}'),
  ('치킨', '{chicken}', '{}'),
  ('고기', '{}', '{pork,beef}'),
  ('갈비', '{}', '{pork,beef}'),
  ('양념', '{soy}', '{peanut}'),
  ('간장', '{soy}', '{}'),
  ('카레', '{wheat}', '{pork,beef,dairy}'),
  ('회', '{seafood}', '{}'),
  ('장어', '{seafood}', '{alcohol}'),
  ('모둠', '{}', '{chicken,seafood}'),
  ('모듬', '{}', '{chicken,seafood}'),
  ('미트볼', '{}', '{pork,beef}'),
  ('된장', '{soy}', '{seafood}'),
  ('두부', '{soy}', '{}'),
  ('갈릭', '{}', '{dairy}'),
  ('함박', '{beef,egg,wheat}', '{pork}'),
  ('콤비네이션', '{pork}', '{beef}'),
  ('밀떡', '{wheat}', '{}')
on conflict (word) do update
  set contains = excluded.contains, may_contain = excluded.may_contain;

-- ---------- 2. Link dishes (tags unchanged) ----------
with d as (
  select id, replace(replace(replace(replace(name_ko, ' ', ''), '돈가스', '돈까스'), '만둣국', '만두국'), '쥬스', '주스') as n
  from public.dishes
  where restaurant_id <> 'mock-1'
), combo as (
  select d.id from d
  where d.n like '%세트%' or d.n like '%정식%' or d.n like '%소스%'
     or (d.n like '%+%'
         and exists (select 1 from public.base_dishes b where strpos(split_part(d.n, '+', 1), b.name_ko) > 0)
         and exists (select 1 from public.base_dishes b where strpos(split_part(d.n, '+', 2), b.name_ko) > 0))
), bm as (
  select distinct on (d.id) d.id, b.name_ko as bk, strpos(d.n, b.name_ko) as bs, length(b.name_ko) as bl
  from d join public.base_dishes b on strpos(d.n, b.name_ko) > 0
  where d.id not in (select id from combo)
  order by d.id, strpos(d.n, b.name_ko) + length(b.name_ko) desc, length(b.name_ko) desc
), am as (
  select bm.id, a.word, strpos(d.n, a.word) as s, length(a.word) as l
  from bm join d on d.id = bm.id
  join public.add_ons a on strpos(d.n, a.word) > 0
  where strpos(d.n, a.word) + length(a.word) <= bm.bs or strpos(d.n, a.word) >= bm.bs + bm.bl
), am2 as (
  select x.* from am x
  where not exists (select 1 from am y where y.id = x.id and y.l > x.l and x.s >= y.s and x.s + x.l <= y.s + y.l)
), links as (
  select bm.id, bm.bk,
         coalesce((select array_agg(word order by s) from am2 where am2.id = bm.id), '{}') as words
  from bm
)
update public.dishes t
set base_dish = l.bk, add_ons = l.words
from (select d.id, links.bk, coalesce(links.words, '{}') as words
      from d left join links on links.id = d.id) l
where t.id = l.id
  and (t.base_dish is distinct from l.bk or t.add_ons is distinct from l.words);
