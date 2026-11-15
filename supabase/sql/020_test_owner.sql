-- 020_test_owner.sql
-- Shared team test owner, so anyone can try the real owner portal.
-- Before running: Supabase dashboard -> Authentication -> Users -> Add user ->
--   Create new user: owner-test@example.com, a password, tick "Auto Confirm User".
--   Share the password with the team only (never put it in the repo).
-- The app signs in to it with "Test account (dev only)" on the owner login screen.
-- It owns r16 TriBoTea (no menu yet, so tests don't touch a showcase restaurant).
-- Safe to re-run.

do $$
begin
  if not exists (select 1 from auth.users where email = 'owner-test@example.com') then
    raise exception 'Create owner-test@example.com in Authentication -> Users first.';
  end if;
end $$;

insert into public.owners (user_id, restaurant_id, email)
select id, 'r16', email
from auth.users
where email = 'owner-test@example.com'
on conflict (user_id, restaurant_id) do nothing;

-- Check: should show r16 | owner-test@example.com
select restaurant_id, email from public.owners where email = 'owner-test@example.com';

-- To remove the test owner later:
-- delete from public.owners where email = 'owner-test@example.com';
