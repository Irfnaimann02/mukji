-- 013_dish_library_tables.sql
-- Dish library tables (#56). Part of #47.
-- - base_dishes: 라면, 김밥, 돈까스… with default tags and a kind (dish / side / drink)
-- - add_ons: words in a dish name that add tags (치즈 → dairy, 만두 → pork + wheat…)
-- - dishes gets two link columns: which base dish and which add-ons it was matched to
-- - menu_submissions: menu photos waiting for the team to check (nothing reaches dishes until approved)
-- Decisions (2026-11-12): existing dishes keep their stored tags; no `lamb` yet; 김치찌개 contains pork.
-- The app doesn't read these tables: it still reads dishes.contains / may_contain, so no app change.
-- Row Level Security is on with no policies, so only the team (SQL editor) can read or write them.
-- Safe to re-run: everything is created only if missing.

-- ---------- base_dishes ----------
create table if not exists public.base_dishes (
  name_ko text primary key,                       -- the word matched in dish names, e.g. '라면'
  name_en text,
  kind text not null default 'dish' check (kind in ('dish', 'side', 'drink')),
  contains text[] not null default '{}'
    check (contains <@ '{pork,beef,chicken,seafood,egg,dairy,alcohol,peanut,wheat,soy}'::text[]),
  may_contain text[] not null default '{}'
    check (may_contain <@ '{pork,beef,chicken,seafood,egg,dairy,alcohol,peanut,wheat,soy}'::text[]),
  note text not null default '',
  created_at timestamptz not null default now(),
  check (not (contains && may_contain))           -- an ingredient is either contains or may_contain, not both
);
alter table public.base_dishes enable row level security;

-- ---------- add_ons ----------
create table if not exists public.add_ons (
  word text primary key,                          -- e.g. '치즈'
  contains text[] not null default '{}'
    check (contains <@ '{pork,beef,chicken,seafood,egg,dairy,alcohol,peanut,wheat,soy}'::text[]),
  may_contain text[] not null default '{}'
    check (may_contain <@ '{pork,beef,chicken,seafood,egg,dairy,alcohol,peanut,wheat,soy}'::text[]),
  note text not null default '',
  created_at timestamptz not null default now(),
  check (not (contains && may_contain))
);
alter table public.add_ons enable row level security;

-- ---------- link columns on dishes ----------
-- null base_dish = hand-tagged (no base dish, e.g. Sarai and Ebisu specials, sets, sauces).
alter table public.dishes
  add column if not exists base_dish text references public.base_dishes (name_ko)
    on update cascade on delete set null;
alter table public.dishes
  add column if not exists add_ons text[] not null default '{}';
create index if not exists dishes_base_dish_idx on public.dishes (base_dish);

-- ---------- menu_submissions ----------
-- A menu photo + the draft rows read from it. The team checks it, then copies approved rows into dishes.
create table if not exists public.menu_submissions (
  id uuid primary key default gen_random_uuid(),
  restaurant_id text not null references public.restaurants (id) on delete cascade,
  photo_path text,                                -- path in storage, if a photo was uploaded
  draft jsonb not null default '[]'::jsonb,       -- [{ "name_ko": "치즈라면", "price_won": 5000, "base": "라면", "add_ons": ["치즈"] }]
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  submitted_by uuid references auth.users (id) on delete set null,
  note text not null default '',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index if not exists menu_submissions_restaurant_id_idx on public.menu_submissions (restaurant_id);
alter table public.menu_submissions enable row level security;
