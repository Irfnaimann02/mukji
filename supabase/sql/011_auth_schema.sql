-- 011_auth_schema.sql
-- #45 S1 Login and database schema.
-- Users sign in anonymously (automatic), owners sign in by email.
-- New tables: owners, reviews, reservations, restaurant_tags. All have Row Level Security.
-- Before running: Supabase dashboard -> Authentication -> Sign In / Providers ->
--   turn ON "Allow anonymous sign-ins" (Email stays ON).
-- Safe to re-run: tables are created only if missing, policies are dropped and re-made.

-- ---------- owners: which signed-in email account owns which restaurant ----------
create table if not exists public.owners (
  user_id uuid not null references auth.users (id) on delete cascade,
  restaurant_id text not null references public.restaurants (id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, restaurant_id)
);
alter table public.owners enable row level security;

-- Owners can see their own rows. Nobody can add themselves:
-- the team adds owners in the SQL editor (see the bottom of this file).
drop policy if exists "owners: read own" on public.owners;
create policy "owners: read own" on public.owners
  for select to authenticated
  using (user_id = (select auth.uid()));

-- ---------- reviews (S8) ----------
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  restaurant_id text not null references public.restaurants (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  stars int not null check (stars between 1 and 5),
  body text not null default '' check (char_length(body) <= 1000),
  diet_tags text[] not null default '{}',
  photo_paths text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists reviews_restaurant_id_idx on public.reviews (restaurant_id);
alter table public.reviews enable row level security;

drop policy if exists "reviews: anyone reads" on public.reviews;
create policy "reviews: anyone reads" on public.reviews
  for select to anon, authenticated
  using (true);

drop policy if exists "reviews: write own" on public.reviews;
create policy "reviews: write own" on public.reviews
  for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "reviews: edit own" on public.reviews;
create policy "reviews: edit own" on public.reviews
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "reviews: delete own" on public.reviews;
create policy "reviews: delete own" on public.reviews
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------- reservations (S6) ----------
create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  restaurant_id text not null references public.restaurants (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  reserved_for timestamptz not null,
  people int not null check (people between 1 and 50),
  dish_ids text[] not null default '{}',
  note text not null default '' check (char_length(note) <= 500),
  status text not null default 'requested'
    check (status in ('requested', 'confirmed', 'declined', 'cancelled', 'completed')),
  created_at timestamptz not null default now()
);
create index if not exists reservations_user_id_idx on public.reservations (user_id);
create index if not exists reservations_restaurant_id_idx on public.reservations (restaurant_id);
alter table public.reservations enable row level security;

-- The customer sees their own; the restaurant's owner sees the ones for their restaurant.
drop policy if exists "reservations: read own or owned" on public.reservations;
create policy "reservations: read own or owned" on public.reservations
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.owners o
      where o.user_id = (select auth.uid()) and o.restaurant_id = reservations.restaurant_id
    )
  );

drop policy if exists "reservations: create own" on public.reservations;
create policy "reservations: create own" on public.reservations
  for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'requested');

-- The customer can change their own (e.g. cancel); the owner can confirm or decline.
drop policy if exists "reservations: update own or owned" on public.reservations;
create policy "reservations: update own or owned" on public.reservations
  for update to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.owners o
      where o.user_id = (select auth.uid()) and o.restaurant_id = reservations.restaurant_id
    )
  );

-- ---------- restaurant_tags: extra tags an owner sets (S10) ----------
create table if not exists public.restaurant_tags (
  restaurant_id text not null references public.restaurants (id) on delete cascade,
  tag text not null check (tag ~ '^[a-z0-9-]{1,30}$'),
  created_at timestamptz not null default now(),
  primary key (restaurant_id, tag)
);
alter table public.restaurant_tags enable row level security;

drop policy if exists "tags: anyone reads" on public.restaurant_tags;
create policy "tags: anyone reads" on public.restaurant_tags
  for select to anon, authenticated
  using (true);

drop policy if exists "tags: owner adds" on public.restaurant_tags;
create policy "tags: owner adds" on public.restaurant_tags
  for insert to authenticated
  with check (exists (
    select 1 from public.owners o
    where o.user_id = (select auth.uid()) and o.restaurant_id = restaurant_tags.restaurant_id
  ));

drop policy if exists "tags: owner removes" on public.restaurant_tags;
create policy "tags: owner removes" on public.restaurant_tags
  for delete to authenticated
  using (exists (
    select 1 from public.owners o
    where o.user_id = (select auth.uid()) and o.restaurant_id = restaurant_tags.restaurant_id
  ));

-- ---------- How to make someone an owner (run by hand, after they sign in once) ----------
-- insert into public.owners (user_id, restaurant_id, email)
-- select id, 'r10', email from auth.users where email = 'owner@example.com';
