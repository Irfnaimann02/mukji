-- 029_menu_review_team.sql
-- The team's menu review screen: see the menu photos people sent (#82), turn
-- each into a draft list of dishes, then approve (dishes go live, tagged by the
-- dish library) or reject.
--
-- Only team members can do any of this. team_members holds just the user id
-- (no names); rows are added by hand after each member has logged in with email:
--   insert into public.team_members (user_id)
--   select id from auth.users where email = 'someone@hanyang.ac.kr'
--   on conflict do nothing;
--
-- Everything goes through the functions below; the tables stay closed.
-- Safe to re-run.

-- ---------- 1. Team ----------
create table if not exists public.team_members (
  user_id uuid primary key references auth.users (id) on delete cascade,
  added_at timestamptz not null default now()
);
alter table public.team_members enable row level security;
revoke all on public.team_members from anon, authenticated;

create or replace function public.is_team_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.team_members where user_id = auth.uid());
$$;

-- Why a submission was rejected (shown to the team, not public).
alter table public.menu_submissions add column if not exists review_note text;
alter table public.menu_submissions drop constraint if exists menu_submissions_review_note_check;
alter table public.menu_submissions add constraint menu_submissions_review_note_check
  check (review_note is null or char_length(review_note) <= 300);

-- ---------- 2. The photos ----------
-- The bucket stays private; team members may read it, so the app can make a
-- short-lived link to show a photo.
drop policy if exists "menu-photos: team reads" on storage.objects;
create policy "menu-photos: team reads" on storage.objects
  for select to authenticated
  using (bucket_id = 'menu-photos' and public.is_team_member());

-- ---------- 3. Waiting photos ----------
create or replace function public.team_pending_menu_photos()
returns table (
  id uuid,
  restaurant_id text,
  restaurant_name_ko text,
  restaurant_name_en text,
  kakao_place_id text,
  photo_path text,
  note text,
  draft jsonb,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_team_member() then
    raise exception 'team_only' using errcode = '42501';
  end if;
  return query
    select s.id, s.restaurant_id, r.name_ko, r.name_en, s.kakao_place_id,
           s.photo_path, s.note, s.draft, s.created_at
    from public.menu_submissions s
    left join public.restaurants r on r.id = s.restaurant_id
    where s.status = 'pending'
    order by s.created_at;
end;
$$;

-- ---------- 4. Save the draft ----------
-- draft: [{"name_ko": "...", "name_en": "...", "price_won": 5000,
--          "contains": [...], "may_contain": [...]}, ...]
create or replace function public.team_save_menu_draft(p_id uuid, p_draft jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_team_member() then
    raise exception 'team_only' using errcode = '42501';
  end if;
  if jsonb_typeof(p_draft) <> 'array' or jsonb_array_length(p_draft) > 200 then
    raise exception 'bad_draft' using errcode = '22023';
  end if;
  update public.menu_submissions set draft = p_draft
  where id = p_id and status = 'pending';
  if not found then
    raise exception 'not_pending' using errcode = 'P0002';
  end if;
end;
$$;

-- ---------- 5. Approve ----------
-- Saves the draft, then runs 016's approve_menu_submission (which checks every
-- dish first and adds all or nothing). Also adds "menu photo" to the
-- restaurant's sources for the trust badge.
create or replace function public.team_approve_menu_photo(p_id uuid, p_draft jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_restaurant text;
  v_result jsonb;
begin
  if not public.is_team_member() then
    raise exception 'team_only' using errcode = '42501';
  end if;
  select restaurant_id into v_restaurant from public.menu_submissions
  where id = p_id and status = 'pending';
  if not found then
    raise exception 'not_pending' using errcode = 'P0002';
  end if;
  if v_restaurant is null then
    -- A Kakao place: add it to restaurants (from licence data) first.
    raise exception 'restaurant_not_added' using errcode = '22023';
  end if;

  perform public.team_save_menu_draft(p_id, p_draft);
  v_result := public.approve_menu_submission(p_id);

  update public.restaurants
  set sources = array_append(sources, 'menu photo')
  where id = v_restaurant and not ('menu photo' = any (sources));

  return v_result;
end;
$$;

-- ---------- 6. Reject ----------
create or replace function public.team_reject_menu_photo(p_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_team_member() then
    raise exception 'team_only' using errcode = '42501';
  end if;
  update public.menu_submissions
  set status = 'rejected', reviewed_at = now(), review_note = left(nullif(trim(p_reason), ''), 300)
  where id = p_id and status = 'pending';
  if not found then
    raise exception 'not_pending' using errcode = 'P0002';
  end if;
end;
$$;

-- ---------- 7. Who may call them ----------
revoke execute on function public.is_team_member() from public, anon;
revoke execute on function public.team_pending_menu_photos() from public, anon;
revoke execute on function public.team_save_menu_draft(uuid, jsonb) from public, anon;
revoke execute on function public.team_approve_menu_photo(uuid, jsonb) from public, anon;
revoke execute on function public.team_reject_menu_photo(uuid, text) from public, anon;
grant execute on function public.is_team_member() to authenticated;
grant execute on function public.team_pending_menu_photos() to authenticated;
grant execute on function public.team_save_menu_draft(uuid, jsonb) to authenticated;
grant execute on function public.team_approve_menu_photo(uuid, jsonb) to authenticated;
grant execute on function public.team_reject_menu_photo(uuid, text) to authenticated;

-- ---------- 8. Check ----------
select to_regclass('public.team_members') as team_table,
       to_regprocedure('public.team_approve_menu_photo(uuid, jsonb)') as approve_fn;
