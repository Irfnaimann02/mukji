-- docs/dish-library-check.sql (#56)
-- READ-ONLY. Compares the dish library draft with the tags stored in dishes.
-- Run it in the Supabase SQL editor. Status: 1 DANGER first (must be none), then 2 weaker, 3 stricter, 0 match, not linked.
-- The base and add-on lists below are the same as in docs/dish-library-draft.md.
with base(k, c, m, kind) as (values
  ('김밥',     '{egg,pork,seafood}'::text[], '{soy,wheat}'::text[], 'dish'),
  ('야채김밥', '{egg}', '{seafood,soy,wheat}', 'dish'),
  ('라면',     '{wheat}', '{beef,pork,soy,egg,seafood}', 'dish'),
  ('라면사리', '{wheat}', '{soy}', 'side'),
  ('떡볶이',   '{soy}', '{wheat,seafood,egg,pork,beef}', 'dish'),
  ('라볶이',   '{wheat,soy,seafood}', '{egg}', 'dish'),
  ('돈까스',   '{pork,wheat,egg}', '{dairy,soy,beef}', 'dish'),
  ('만두',     '{wheat,pork}', '{beef,soy,egg,seafood}', 'dish'),
  ('만두국',   '{wheat,egg,pork}', '{beef,soy,seafood}', 'dish'),
  ('우동',     '{wheat,seafood}', '{soy,egg}', 'dish'),
  ('우동사리', '{wheat}', '{}', 'side'),
  ('칼국수',   '{wheat}', '{seafood,egg,soy}', 'dish'),
  ('국수',     '{wheat}', '{seafood,egg,soy}', 'dish'),
  ('쌀국수',   '{}', '{seafood}', 'dish'),
  ('냉면',     '{wheat}', '{beef,egg,soy}', 'dish'),
  ('쫄면',     '{wheat,egg}', '{soy}', 'dish'),
  ('김치찌개', '{pork}', '{soy,seafood}', 'dish'),
  ('된장찌개', '{soy}', '{seafood,beef,pork}', 'dish'),
  ('순두부찌개','{soy}', '{seafood,pork,egg}', 'dish'),
  ('부대찌개', '{pork,wheat,soy}', '{beef,dairy}', 'dish'),
  ('찌개',     '{}', '{soy,pork,seafood,beef}', 'dish'),
  ('덮밥',     '{}', '{soy,wheat,egg,pork,seafood}', 'dish'),
  ('볶음밥',   '{egg}', '{soy,pork,seafood,wheat,chicken}', 'dish'),
  ('비빔밥',   '{soy,egg}', '{beef,wheat}', 'dish'),
  ('알밥',     '{seafood}', '{pork,soy,wheat,egg}', 'dish'),
  ('치킨',     '{chicken,wheat}', '{soy,egg,dairy,peanut}', 'dish'),
  ('순살',     '{chicken,wheat}', '{soy,egg,dairy,peanut}', 'dish'),
  ('(뼈)',     '{chicken,wheat}', '{soy,egg,dairy,peanut}', 'dish'),
  ('피자',     '{wheat,dairy}', '{soy,egg}', 'dish'),
  ('부리또',   '{wheat}', '{dairy,egg}', 'dish'),
  ('튀김',     '{wheat}', '{egg}', 'side'),
  ('치즈스틱', '{dairy,wheat}', '{egg}', 'side'),
  ('치즈볼',   '{dairy,wheat}', '{egg}', 'side'),
  ('카레',     '{wheat}', '{pork,beef,dairy}', 'dish'),
  ('떡국',     '{egg}', '{beef,soy,seafood}', 'dish'),
  ('막걸리',   '{alcohol}', '{wheat}', 'drink'),
  ('맥주',     '{alcohol}', '{wheat}', 'drink'),
  ('소주',     '{alcohol}', '{}', 'drink'),
  ('공기밥',   '{}', '{}', 'side'),
  ('콜라',     '{}', '{}', 'drink'),
  ('사이다',   '{}', '{}', 'drink'),
  ('음료수',   '{}', '{}', 'drink'),
  ('생수',     '{}', '{}', 'drink'),
  ('주스',     '{}', '{}', 'drink'),
  ('식혜',     '{}', '{}', 'drink'),
  ('함박',     '{beef,egg,wheat}', '{pork,dairy}', 'dish'),
  ('오뎅',     '{seafood,wheat}', '{soy}', 'side'),
  ('육개장',   '{beef}', '{soy,egg,wheat}', 'dish'),
  ('갈비탕',   '{beef}', '{soy,egg,wheat}', 'dish'),
  ('불고기',   '{beef,soy}', '{pork,wheat}', 'dish'),
  ('떡갈비',   '{soy}', '{pork,beef,wheat,egg}', 'dish'),
  ('계란후라이','{egg}', '{}', 'side'),
  ('오무라이스','{egg}', '{pork,wheat,dairy,soy}', 'dish'),
  ('반미',     '{wheat}', '{egg,soy,pork}', 'dish'),
  ('팟타이',   '{egg,seafood}', '{peanut,soy}', 'dish'),
  ('핫도그',   '{wheat}', '{pork}', 'dish'),
  ('감자',     '{}', '{wheat,dairy}', 'side'),
  ('떡사리',   '{}', '{wheat}', 'side'),
  ('사리',     '{}', '{}', 'side')
), addon(k, c, m) as (values
  ('치즈',     '{dairy}'::text[], '{}'::text[]),
  ('모짜',     '{dairy}', '{}'),
  ('로제',     '{dairy}', '{}'),
  ('눈꽃',     '{dairy}', '{}'),
  ('만두',     '{pork,wheat}', '{beef,soy,egg}'),
  ('참치',     '{seafood}', '{}'),
  ('어묵',     '{seafood,wheat}', '{}'),
  ('오뎅',     '{seafood,wheat}', '{}'),
  ('맛살',     '{seafood}', '{}'),
  ('날치알',   '{seafood}', '{}'),
  ('새우',     '{seafood}', '{}'),
  ('굴',       '{seafood}', '{}'),
  ('멸치',     '{seafood}', '{}'),
  ('오징어',   '{seafood}', '{}'),
  ('짬뽕',     '{seafood}', '{}'),
  ('김치',     '{}', '{seafood,pork}'),
  ('계란',     '{egg}', '{}'),
  ('마요',     '{egg}', '{}'),
  ('돈까스',   '{pork,wheat,egg}', '{dairy,soy,beef}'),
  ('제육',     '{pork,soy}', '{}'),
  ('돼지고기', '{pork}', '{}'),
  ('베이컨',   '{pork}', '{}'),
  ('페퍼로니', '{pork}', '{beef}'),
  ('스팸',     '{pork}', '{}'),
  ('햄',       '{pork}', '{}'),
  ('소시지',   '{pork}', '{}'),
  ('소고기',   '{beef}', '{}'),
  ('불고기',   '{beef,soy}', '{pork}'),
  ('닭고기',   '{chicken}', '{}'),
  ('치킨',     '{chicken}', '{}'),
  ('고기',     '{}', '{pork,beef}'),
  ('갈비',     '{}', '{pork,beef}'),
  ('양념',     '{soy}', '{peanut}'),
  ('간장',     '{soy}', '{}'),
  ('카레',     '{wheat}', '{pork,beef,dairy}'),
  ('회',       '{seafood}', '{}'),
  ('장어',     '{seafood}', '{alcohol}'),
  ('모둠',     '{}', '{chicken,seafood}'),
  ('모듬',     '{}', '{chicken,seafood}'),
  ('미트볼',   '{}', '{pork,beef}'),
  ('된장',     '{soy}', '{seafood}'),
  ('두부',     '{soy}', '{}'),
  ('갈릭',     '{}', '{dairy}'),
  ('함박',     '{beef,egg,wheat}', '{pork}'),
  ('콤비네이션','{pork}', '{beef}'),
  ('밀떡',     '{wheat}', '{}')
), d as (
  select id, restaurant_id, name_ko, contains, may_contain,
         replace(replace(replace(replace(name_ko, ' ', ''), '돈가스', '돈까스'), '만둣국', '만두국'), '쥬스', '주스') as n
  from dishes where restaurant_id <> 'mock-1'
), combo as (
  select d.id from d
  where d.n like '%세트%' or d.n like '%정식%' or d.n like '%소스%'
     or (d.n like '%+%'
         and exists (select 1 from base b where strpos(split_part(d.n, '+', 1), b.k) > 0)
         and exists (select 1 from base b where strpos(split_part(d.n, '+', 2), b.k) > 0))
), bm as (
  select distinct on (d.id) d.id, b.k as bk, strpos(d.n, b.k) as bs, length(b.k) as bl, b.c as bc, b.m as bmm, b.kind
  from d join base b on strpos(d.n, b.k) > 0
  where d.id not in (select id from combo)
  order by d.id, strpos(d.n, b.k) + length(b.k) desc, length(b.k) desc
), am as (
  select d.id, a.k, strpos(d.n, a.k) as s, length(a.k) as l, a.c, a.m
  from d join addon a on strpos(d.n, a.k) > 0
  left join bm on bm.id = d.id
  where bm.id is null or strpos(d.n, a.k) + length(a.k) <= bm.bs or strpos(d.n, a.k) >= bm.bs + bm.bl
), am2 as (
  select x.* from am x
  where not exists (select 1 from am y where y.id = x.id and y.l > x.l and x.s >= y.s and x.s + x.l <= y.s + y.l)
), lib as (
  select d.id, d.restaurant_id, d.name_ko, d.contains, d.may_contain, bm.bk, bm.kind,
    (select string_agg(k, '+' order by s) from am2 where am2.id = d.id) as addons,
    array(select distinct e from (select unnest(coalesce(bm.bc, '{}')) e
          union all select unnest(am2.c) from am2 where am2.id = d.id) t order by 1) as lc,
    array(select distinct e from (select unnest(coalesce(bm.bmm, '{}')) e
          union all select unnest(am2.m) from am2 where am2.id = d.id) t order by 1) as lm0
  from d left join bm on bm.id = d.id
), cmp as (
  select *,
    array(select unnest(lm0) except select unnest(lc) order by 1) as lm
  from lib
), res as (
  select *,
    array(select unnest(contains || may_contain) except select unnest(lc || lm) order by 1) as danger,
    array(select unnest(contains) intersect select unnest(lm) order by 1) as weaker,
    array(select unnest(lc || lm) except select unnest(contains || may_contain) order by 1)
      || array(select unnest(lc) intersect select unnest(may_contain) order by 1) as stricter
  from cmp
)
select
  case when bk is null then 'not linked'
       when cardinality(danger) > 0 then '1 DANGER'
       when cardinality(weaker) > 0 then '2 weaker'
       when cardinality(stricter) > 0 then '3 stricter'
       else '0 match' end as status,
  restaurant_id as r, name_ko, bk as base, addons, kind,
  array_to_string(contains, ',') || ' | ' || array_to_string(may_contain, ',') as stored,
  array_to_string(lc, ',') || ' | ' || array_to_string(lm, ',') as library,
  array_to_string(danger, ',') as danger, array_to_string(weaker, ',') as weaker, array_to_string(stricter, ',') as stricter
from res
order by status, base nulls last, name_ko;
