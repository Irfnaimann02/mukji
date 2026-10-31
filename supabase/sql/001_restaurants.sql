-- Applied in Supabase on 29 Oct 2026 (SQL Editor, saved as "01 create tables").
create table restaurants (
  id text primary key,
  name_ko text not null,
  name_en text not null,
  food_type text not null,
  lat double precision not null,
  lng double precision not null,
  address text not null default '',
  phone text not null default '',
  price_level int not null default 1,
  halal_certified boolean not null default false,
  origin jsonb not null default '[]',
  recommend_count int not null default 0,
  rating real not null default 0,
  sources text[] not null default '{}'
);

create table dishes (
  id text primary key,
  restaurant_id text not null references restaurants (id) on delete cascade,
  name_ko text not null,
  name_en text not null,
  price_won int not null default 0,
  contains text[] not null default '{}',
  may_contain text[] not null default '{}',
  leave_out_ko text,
  leave_out_en text,
  verified_count int not null default 0,
  last_checked date
);

-- Anyone with the app may READ; nobody may write from the app.
alter table restaurants enable row level security;
alter table dishes enable row level security;
create policy "read restaurants" on restaurants for select using (true);
create policy "read dishes" on dishes for select using (true);