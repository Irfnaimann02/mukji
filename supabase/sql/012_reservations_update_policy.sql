-- 012_reservations_update_policy.sql
-- Fixes the reservations update rule from 011 (review on PR #57). Part of #45.
-- Before: one update policy with no "with check", so a customer could set their own
-- booking to 'confirmed' or change any column (restaurant, time, people).
-- After:
--   - only the status column can be changed (column grant)
--   - a customer can only set their own booking to 'cancelled'
--   - an owner can only set 'confirmed', 'declined' or 'completed', and only for their own restaurant
-- Postgres joins the "with check" of all update policies with OR, so the owner rule must
-- check ownership again inside its own "with check". Without it, a customer passes the owner rule.
-- Safe to re-run: grants are repeated and every policy is dropped before it is made.

-- Only the status column can be updated by signed-in users (guests included).
-- anon has no update policy anyway; revoking it too keeps the rule in one place.
revoke update on public.reservations from anon, authenticated;
grant update (status) on public.reservations to authenticated;

-- Remove the old rule from 011.
drop policy if exists "reservations: update own or owned" on public.reservations;

-- Customer: their own booking, and only to cancel it.
drop policy if exists "reservations: customer cancels" on public.reservations;
create policy "reservations: customer cancels" on public.reservations
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and status = 'cancelled');

-- Owner: bookings for a restaurant they own, and only to answer them.
drop policy if exists "reservations: owner responds" on public.reservations;
create policy "reservations: owner responds" on public.reservations
  for update to authenticated
  using (exists (
    select 1 from public.owners o
    where o.user_id = (select auth.uid()) and o.restaurant_id = reservations.restaurant_id
  ))
  with check (
    status in ('confirmed', 'declined', 'completed')
    and exists (
      select 1 from public.owners o
      where o.user_id = (select auth.uid()) and o.restaurant_id = reservations.restaurant_id
    )
  );
