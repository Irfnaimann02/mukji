-- 045_user_saved_data.sql
-- #119 S17: save the food profile, favourites and recent searches to the account.
--
-- Until now these lived only on the phone (AsyncStorage). They were lost on a new phone
-- or after a reinstall, and the next person to sign in on the same phone could see them.
--
-- Only real (email) logins use these tables. Guests keep everything on the phone, so every
-- rule below also checks public.is_real_login() (from 019).
-- The app language is NOT stored here: it is a phone setting and stays on the phone.
-- Safe to re-run.

begin;

-- ---------- 1. user_profiles: one row per account ----------
create table if not exists public.user_profiles (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  diets text[] not null default '{}',
  allergens text[] not null default '{}',
  likes text[] not null default '{}',
  max_distance_m int not null default 1500,
  recent_searches text[] not null default '{}',
  updated_at timestamptz not null default now()
);

-- Same values as Diet, Allergen and FoodTag in mobile/src/data/types.ts.
alter table public.user_profiles drop constraint if exists user_profiles_diets_check;
alter table public.user_profiles add constraint user_profiles_diets_check
  check (diets <@ array['halal', 'vegan', 'no_pork']::text[]);
alter table public.user_profiles drop constraint if exists user_profiles_allergens_check;
alter table public.user_profiles add constraint user_profiles_allergens_check
  check (allergens <@ array['peanut', 'seafood', 'egg', 'dairy', 'wheat', 'soy']::text[]);
alter table public.user_profiles drop constraint if exists user_profiles_likes_check;
alter table public.user_profiles add constraint user_profiles_likes_check
  check (likes <@ array[
    'korean', 'chinese', 'japanese', 'western', 'asian-foreign', 'noodles', 'bbq', 'buffet',
    'snack-food', 'raw-fish', 'chicken', 'fast-food', 'cafe', 'pub', 'halal-food', 'cheap'
  ]::text[]);
alter table public.user_profiles drop constraint if exists user_profiles_max_distance_check;
alter table public.user_profiles add constraint user_profiles_max_distance_check
  check (max_distance_m between 100 and 10000);
-- The app keeps the last 5 searches.
alter table public.user_profiles drop constraint if exists user_profiles_recent_searches_check;
alter table public.user_profiles add constraint user_profiles_recent_searches_check
  check (
    cardinality(recent_searches) <= 5
    and array_position(recent_searches, null) is null
    and char_length(array_to_string(recent_searches, '')) <= 500
  );

-- ---------- 2. user_favourites: one row per saved restaurant ----------
create table if not exists public.user_favourites (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  restaurant_id text not null references public.restaurants (id) on delete cascade,
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, restaurant_id)
);

-- The note box in the Favourites tab allows 280 characters.
alter table public.user_favourites drop constraint if exists user_favourites_note_check;
alter table public.user_favourites add constraint user_favourites_note_check
  check (char_length(note) <= 280);

-- ---------- 3. updated_at ----------
create or replace function public.touch_user_saved_data()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_profiles_touch on public.user_profiles;
create trigger user_profiles_touch
  before update on public.user_profiles
  for each row execute function public.touch_user_saved_data();

drop trigger if exists user_favourites_touch on public.user_favourites;
create trigger user_favourites_touch
  before update on public.user_favourites
  for each row execute function public.touch_user_saved_data();

-- ---------- 4. Who can see and change them: only the account itself ----------
alter table public.user_profiles enable row level security;
alter table public.user_favourites enable row level security;
revoke all on public.user_profiles from anon;
revoke all on public.user_favourites from anon;

drop policy if exists "user_profiles: own, real login" on public.user_profiles;
create policy "user_profiles: own, real login" on public.user_profiles
  for all to authenticated
  using (user_id = (select auth.uid()) and (select public.is_real_login()))
  with check (user_id = (select auth.uid()) and (select public.is_real_login()));

drop policy if exists "user_favourites: own, real login" on public.user_favourites;
create policy "user_favourites: own, real login" on public.user_favourites
  for all to authenticated
  using (user_id = (select auth.uid()) and (select public.is_real_login()))
  with check (user_id = (select auth.uid()) and (select public.is_real_login()));

-- ---------- 5. First sign-in on a phone: copy the phone's guest data into the account ----------
-- Called once per account per phone. Runs with the caller's rights, so the rules above apply.
--   Profile:   the account's own profile wins; the phone's is used only if the account has none.
--   Searches:  the phone's first (newer), then the account's; no repeats (ignoring case); at most 5.
--   Favourites: added to the account's list. A restaurant already there keeps the account's note.
--              Restaurants that no longer exist are skipped instead of failing the whole copy.
create or replace function public.merge_guest_saved_data(
  p_diets text[],
  p_allergens text[],
  p_likes text[],
  p_max_distance_m int,
  p_recent_searches text[],
  p_favourites jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null or not public.is_real_login() then
    raise exception 'real_login_required';
  end if;

  insert into public.user_profiles (user_id, diets, allergens, likes, max_distance_m)
  values (
    v_uid,
    coalesce(p_diets, '{}'),
    coalesce(p_allergens, '{}'),
    coalesce(p_likes, '{}'),
    coalesce(p_max_distance_m, 1500)
  )
  on conflict (user_id) do nothing;

  update public.user_profiles as p
     set recent_searches = coalesce((
           select array_agg(top5.q order by top5.ord)
           from (
             select unique_q.q, unique_q.ord
             from (
               select distinct on (lower(both_lists.q)) both_lists.q, both_lists.ord
               from (
                 select left(btrim(s), 100) as q, o as ord
                 from unnest(coalesce(p_recent_searches, '{}')) with ordinality as phone(s, o)
                 union all
                 select left(btrim(s), 100), 1000000 + o
                 from unnest(p.recent_searches) with ordinality as account(s, o)
               ) as both_lists
               where both_lists.q is not null and both_lists.q <> ''
               order by lower(both_lists.q), both_lists.ord
             ) as unique_q
             order by unique_q.ord
             limit 5
           ) as top5
         ), '{}')
   where p.user_id = v_uid;

  -- If the phone list names a restaurant twice, its first entry is used.
  insert into public.user_favourites (user_id, restaurant_id, note, created_at, updated_at)
  select distinct on (f.restaurant_id)
         v_uid,
         f.restaurant_id,
         left(coalesce(f.note, ''), 280),
         coalesce(f.created_at, now()),
         coalesce(f.updated_at, f.created_at, now())
  from jsonb_array_elements(
         case when jsonb_typeof(p_favourites) = 'array' then p_favourites else '[]'::jsonb end
       ) with ordinality as item(value, ord)
  cross join lateral jsonb_to_record(item.value)
       as f(restaurant_id text, note text, created_at timestamptz, updated_at timestamptz)
  where exists (select 1 from public.restaurants as r where r.id = f.restaurant_id)
  order by f.restaurant_id, item.ord
  on conflict (user_id, restaurant_id) do nothing;
end;
$$;

revoke all on function public.merge_guest_saved_data(text[], text[], text[], int, text[], jsonb) from public, anon;
grant execute on function public.merge_guest_saved_data(text[], text[], text[], int, text[], jsonb) to authenticated;

commit;

-- Check: signed in by email, the app reads and writes only its own rows; a guest and
-- another account see nothing. Test: supabase/tests/045_user_saved_data.sql
