-- 022_menu_photo_button.sql
-- For the "Send menu photo" button on the restaurant page.
-- 016 made the private menu-photos bucket and menu_submissions (pending rows).
-- This adds:
--   * Kakao places can get photos too: they are not in our restaurants table,
--     so a submission keeps only Kakao's place ID (allowed by our data rule).
--     The team adds the restaurant (from licence data) before approving,
--     then sets restaurant_id on the submission.
--   * Tighter insert rule: the photo must be in the sender's own folder,
--     the restaurant must be approved, and at most 20 photos per person per day.
--   * Users may only fill restaurant_id, kakao_place_id, photo_path and note.
-- Guests (anonymous logins) may send photos too: it is the easiest way for
-- anyone to help, and nothing is shown until the team approves it.
-- Safe to re-run.

-- ---------- 1. Kakao place submissions ----------
alter table public.menu_submissions add column if not exists kakao_place_id text;
alter table public.menu_submissions alter column restaurant_id drop not null;

alter table public.menu_submissions drop constraint if exists menu_submissions_place_check;
alter table public.menu_submissions add constraint menu_submissions_place_check
  check (restaurant_id is not null or kakao_place_id is not null);

alter table public.menu_submissions drop constraint if exists menu_submissions_kakao_id_check;
alter table public.menu_submissions add constraint menu_submissions_kakao_id_check
  check (kakao_place_id is null or kakao_place_id ~ '^[0-9]{1,20}$');

alter table public.menu_submissions drop constraint if exists menu_submissions_note_check;
alter table public.menu_submissions add constraint menu_submissions_note_check
  check (char_length(note) <= 300);

-- ---------- 2. Who may write which columns ----------
revoke insert, update, delete on public.menu_submissions from anon;
revoke insert, update, delete on public.menu_submissions from authenticated;
grant insert (restaurant_id, kakao_place_id, photo_path, note) on public.menu_submissions to authenticated;

-- ---------- 3. Insert rule ----------
-- How many photos this user sent in the last day. A function, because a policy
-- that reads its own table directly would loop forever.
create or replace function public.my_menu_photos_today()
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::int from public.menu_submissions
  where submitted_by = auth.uid() and created_at > now() - interval '1 day';
$$;
revoke execute on function public.my_menu_photos_today() from public, anon;
grant execute on function public.my_menu_photos_today() to authenticated;

drop policy if exists "menu_submissions: add own pending" on public.menu_submissions;
create policy "menu_submissions: add own pending" on public.menu_submissions
  for insert to authenticated
  with check (
    submitted_by = (select auth.uid())
    and status = 'pending'
    and reviewed_at is null
    and draft = '[]'::jsonb
    -- the photo must be in the sender's own folder: <user id>/...
    and split_part(photo_path, '/', 1) = (select auth.uid())::text
    -- our restaurant must be approved; a Kakao place needs only its ID
    and (
      restaurant_id is null
      or exists (select 1 from public.restaurants r
                 where r.id = restaurant_id and r.status = 'approved')
    )
    -- at most 20 photos per person per day
    and public.my_menu_photos_today() < 20
  );

-- ---------- 4. Check ----------
-- Should list: restaurant_id, kakao_place_id, photo_path, note
select column_name from information_schema.column_privileges
where table_schema = 'public' and table_name = 'menu_submissions'
  and grantee = 'authenticated' and privilege_type = 'INSERT'
order by column_name;
