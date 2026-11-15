-- 019_reviews_after_visit.sql
-- Part of #52 S8 Reviews after eating.
-- A review is allowed only after a real visit:
--   * a reservation the owner marked 'completed' (no time limit), or
--   * a check-in within 100 m of the restaurant in the last 7 days.
-- Each review stores how the visit was proven (visit_kind), so the app can show
-- "Verified visit · Booked" or "Verified visit · Checked in".
-- Rules: logged-in (non-guest) accounts only, one review per person per restaurant.
-- Safe to re-run.

-- ---------- 1. check_ins ----------
-- We keep only the distance, never the user's GPS position.
create table if not exists public.check_ins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  restaurant_id text not null references public.restaurants (id) on delete cascade,
  distance_m int not null check (distance_m between 0 and 100),
  created_at timestamptz not null default now()
);
create index if not exists check_ins_user_restaurant_idx
  on public.check_ins (user_id, restaurant_id, created_at desc);
alter table public.check_ins enable row level security;

-- Nobody writes check_ins directly; only the check_in() function below does.
revoke all on public.check_ins from anon, authenticated;
grant select on public.check_ins to authenticated;

drop policy if exists "check_ins: read own" on public.check_ins;
create policy "check_ins: read own" on public.check_ins
  for select to authenticated
  using (user_id = (select auth.uid()));

-- ---------- 2. reviews: visit_kind, one per person ----------
alter table public.reviews add column if not exists visit_kind text;
alter table public.reviews drop constraint if exists reviews_visit_kind_check;
alter table public.reviews add constraint reviews_visit_kind_check
  check (visit_kind in ('reservation', 'check_in'));
alter table public.reviews alter column visit_kind set not null;

alter table public.reviews drop constraint if exists reviews_one_per_person;
alter table public.reviews add constraint reviews_one_per_person unique (restaurant_id, user_id);

-- Only allowed diet words in diet_tags.
alter table public.reviews drop constraint if exists reviews_diet_tags_check;
alter table public.reviews add constraint reviews_diet_tags_check
  check (diet_tags <@ array['halal', 'vegan', 'no_pork']::text[]);

-- Reviews are added only through add_review(). Edits may change only the text parts,
-- never restaurant_id, user_id, visit_kind or created_at.
drop policy if exists "reviews: write own" on public.reviews;
revoke insert, update, delete on public.reviews from anon;
revoke insert, update on public.reviews from authenticated;
grant update (stars, body, diet_tags, photo_paths) on public.reviews to authenticated;

-- ---------- 3. helper: is this a real (non-guest) login? ----------
create or replace function public.is_real_login()
returns boolean
language sql stable
set search_path = ''
as $$
  select auth.uid() is not null
     and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false;
$$;

-- ---------- 4. check_in(restaurant, lat, lng) ----------
-- The database works out the distance itself. Returns
--   {"checked_in": true,  "distance_m": 42}
--   {"checked_in": false, "distance_m": 340}   (too far, nothing saved)
-- A second check-in within an hour reuses the first one instead of adding a row.
create or replace function public.check_in(p_restaurant_id text, p_lat double precision, p_lng double precision)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_lat double precision;
  v_lng double precision;
  v_dist double precision;
begin
  if not public.is_real_login() then
    raise exception 'login_required' using errcode = '42501';
  end if;
  if p_lat is null or p_lng is null
     or p_lat not between -90 and 90 or p_lng not between -180 and 180 then
    raise exception 'bad_location' using errcode = '22023';
  end if;

  select r.lat, r.lng into v_lat, v_lng
  from public.restaurants r
  where r.id = p_restaurant_id and r.status = 'approved';
  if not found then
    raise exception 'restaurant_not_found' using errcode = 'P0002';
  end if;

  -- Haversine distance in metres.
  v_dist := 2 * 6371000 * asin(sqrt(
    power(sin(radians(p_lat - v_lat) / 2), 2)
    + cos(radians(v_lat)) * cos(radians(p_lat)) * power(sin(radians(p_lng - v_lng) / 2), 2)
  ));

  if v_dist > 100 then
    return jsonb_build_object('checked_in', false, 'distance_m', round(v_dist)::int);
  end if;

  if not exists (
    select 1 from public.check_ins c
    where c.user_id = v_uid and c.restaurant_id = p_restaurant_id
      and c.created_at > now() - interval '1 hour'
  ) then
    insert into public.check_ins (user_id, restaurant_id, distance_m)
    values (v_uid, p_restaurant_id, round(v_dist)::int);
  end if;

  return jsonb_build_object('checked_in', true, 'distance_m', round(v_dist)::int);
end;
$$;

-- ---------- 5. review_eligibility(restaurant) ----------
-- For the app: should it show the review form?
--   {"can_review": true, "visit_kind": "check_in", "already_reviewed": false}
-- reason is one of: login_required, already_reviewed, visit_required, null.
create or replace function public.review_eligibility(p_restaurant_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_kind text;
  v_done boolean;
begin
  if not public.is_real_login() then
    return jsonb_build_object('can_review', false, 'visit_kind', null,
                              'already_reviewed', false, 'reason', 'login_required');
  end if;

  v_done := exists (select 1 from public.reviews w
                    where w.user_id = v_uid and w.restaurant_id = p_restaurant_id);

  if exists (select 1 from public.reservations s
             where s.user_id = v_uid and s.restaurant_id = p_restaurant_id
               and s.status = 'completed') then
    v_kind := 'reservation';
  elsif exists (select 1 from public.check_ins c
                where c.user_id = v_uid and c.restaurant_id = p_restaurant_id
                  and c.created_at > now() - interval '7 days') then
    v_kind := 'check_in';
  end if;

  return jsonb_build_object(
    'can_review', v_kind is not null and not v_done,
    'visit_kind', v_kind,
    'already_reviewed', v_done,
    'reason', case when v_done then 'already_reviewed'
                   when v_kind is null then 'visit_required' end);
end;
$$;

-- ---------- 6. add_review(...) ----------
-- Returns the new review id. Errors: login_required, visit_required,
-- already_reviewed, bad_stars, body_too_long, bad_diet_tag.
create or replace function public.add_review(
  p_restaurant_id text,
  p_stars int,
  p_body text default '',
  p_diet_tags text[] default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_check jsonb;
  v_id uuid;
begin
  if p_stars is null or p_stars not between 1 and 5 then
    raise exception 'bad_stars' using errcode = '22023';
  end if;
  if char_length(coalesce(p_body, '')) > 1000 then
    raise exception 'body_too_long' using errcode = '22023';
  end if;
  if not (coalesce(p_diet_tags, '{}') <@ array['halal', 'vegan', 'no_pork']::text[]) then
    raise exception 'bad_diet_tag' using errcode = '22023';
  end if;

  v_check := public.review_eligibility(p_restaurant_id);
  if not (v_check ->> 'can_review')::boolean then
    raise exception '%', v_check ->> 'reason' using errcode = '42501';
  end if;

  insert into public.reviews (restaurant_id, user_id, stars, body, diet_tags, visit_kind)
  values (p_restaurant_id, v_uid, p_stars, coalesce(p_body, ''),
          coalesce(p_diet_tags, '{}'), v_check ->> 'visit_kind')
  returning id into v_id;
  return v_id;
end;
$$;

-- ---------- 7. who may call the functions ----------
revoke execute on function public.is_real_login() from public, anon;
revoke execute on function public.check_in(text, double precision, double precision) from public, anon;
revoke execute on function public.review_eligibility(text) from public, anon;
revoke execute on function public.add_review(text, int, text, text[]) from public, anon;
grant execute on function public.is_real_login() to authenticated;
grant execute on function public.check_in(text, double precision, double precision) to authenticated;
grant execute on function public.review_eligibility(text) to authenticated;
grant execute on function public.add_review(text, int, text, text[]) to authenticated;
