-- 031_cleanup_test_data.sql
-- Removes test data from the sprint so the app starts clean for the demo and real users.
-- Restaurants, dishes, menus and reviews are NOT touched.
--
-- 1. The test owner from 020 (owner-test@example.com). Deleting the login also removes its
--    link to r16 TriBoTea (owners, on delete cascade). The restaurant itself stays.
--    After this, the owner portal needs a real owner account (registration from #92).
-- 2. The 13 test bookings made while building #45 / #50 / #91 (by id, so a real booking
--    made later is never touched).
-- 3. Guest logins from testing that have not been used for 2 days. A guest whose session
--    was refreshed in the last 2 days is kept, so nobody is logged out mid-test.
--    Guests who left anything behind are kept too: a booking, a review, a check-in or a
--    menu photo. Deleting a login deletes its bookings, reviews and check-ins (on delete
--    cascade), so a real guest with an upcoming booking must never be removed here.
--    (Review of #98, Soy05 and Irfan.)
-- 4. Today's AI usage counters (027, Korean date), so everyone's limit for today starts
--    fresh. Earlier days are kept, so a re-run doesn't wipe the history.
-- Safe to re-run.

begin;

-- 1. test owner
delete from auth.users
where email = 'owner-test@example.com';

-- 2. test bookings
delete from public.reservations
where id in (
  'b689be88-a3d1-4dbe-8323-1cf61b879928', '5caa2b24-0896-43d2-9a49-eb9b67bb0d76',
  '33adef1e-878e-4927-aa0b-4c371d9c31ac', 'fa19d44a-7f57-4418-8dec-f550e95889f0',
  '3b8227e9-7b33-4b7b-a6f4-4688b1260000', 'a2a53d6e-46b8-45cf-b568-ed4854979915',
  '0ae92e31-0a44-4737-ab67-ad9f9fb10284', '63c1c4a6-3c2a-4a83-abb3-8db6060bbb8f',
  '61d3fa96-8617-41d4-9a43-6296b21c0c91', '51e84a2d-e22c-4003-8644-5c6268f3bd7f',
  '66c6aa82-252f-43d6-922f-53fa02ba6d84', 'de5ec0a9-766e-47c2-beeb-94a4b03bde08',
  '055b7949-d77e-4855-825f-5c7d8816cded'
);

-- 3. old guest logins
delete from auth.users as u
where u.is_anonymous
  and u.created_at < now() - interval '2 days'
  and not exists (
    select 1 from auth.sessions as s
    where s.user_id = u.id
      and coalesce(s.refreshed_at, s.updated_at, s.created_at) > now() - interval '2 days'
  )
  and not exists (select 1 from public.reservations as r where r.user_id = u.id)
  and not exists (select 1 from public.reviews as v where v.user_id = u.id)
  and not exists (select 1 from public.check_ins as c where c.user_id = u.id)
  and not exists (select 1 from public.menu_submissions as m where m.submitted_by = u.id);

-- 4. today's AI usage counters
delete from public.ai_usage
where day = (now() at time zone 'Asia/Seoul')::date;

commit;

-- Check afterwards:
-- select count(*) filter (where is_anonymous) as guests,
--        count(*) filter (where not is_anonymous) as email_accounts
-- from auth.users;
-- select count(*) from public.reservations;   -- only real bookings left (the 13 test ones are gone)
-- select count(*) from public.owners;         -- only real owners left (owner-test is gone)
