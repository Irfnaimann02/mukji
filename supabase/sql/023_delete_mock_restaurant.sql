-- 023_delete_mock_restaurant.sql
-- Demo readiness: remove the test restaurant "모의 김밥 / Mock Kimbap" (mock-1).
-- It shows at the top of Home and is not a real place.
-- Its 3 dishes (and any tags, reviews, check-ins, reservations, owners or
-- menu photos pointing at it) go with it: every link to restaurants is
-- ON DELETE CASCADE.
-- Safe to re-run.

delete from public.restaurants where id = 'mock-1';

-- Check: should return 0
select count(*) as mock_left from public.restaurants where id = 'mock-1';
