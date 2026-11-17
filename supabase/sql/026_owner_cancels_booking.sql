-- 026_owner_cancels_booking.sql
-- #50 fix: the restaurant can cancel a booking, e.g. when the customer phones to cancel
-- instead of cancelling in the app. Before this, 012 only let the owner set
-- confirmed, declined or completed.
-- The database also records who cancelled (cancelled_by), so the owner portal only
-- alerts about cancellations by the customer, and the customer sees
-- "Cancelled by the restaurant".
-- Safe to re-run.

-- ---------- 1. Who cancelled ----------
alter table public.reservations
  add column if not exists cancelled_by text
  check (cancelled_by in ('customer', 'restaurant'));

-- Before this file only customers could cancel.
update public.reservations
set cancelled_by = 'customer'
where status = 'cancelled' and cancelled_by is null;

-- Set by the database, never by the app: the app can only update "status" (012).
-- Only waiting or confirmed bookings can be cancelled.
create or replace function public.reservations_set_cancelled_by()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'cancelled' and old.status is distinct from 'cancelled' then
    if old.status not in ('requested', 'confirmed') then
      raise exception 'Only waiting or confirmed bookings can be cancelled';
    end if;
    new.cancelled_by := case when new.user_id = (select auth.uid()) then 'customer' else 'restaurant' end;
  elsif new.status <> 'cancelled' then
    new.cancelled_by := null;
  else
    new.cancelled_by := old.cancelled_by;
  end if;
  return new;
end;
$$;

drop trigger if exists reservations_cancelled_by on public.reservations;
create trigger reservations_cancelled_by
  before update of status on public.reservations
  for each row execute function public.reservations_set_cancelled_by();

-- ---------- 2. The owner may also cancel ----------
-- Same as 012, with 'cancelled' added.
drop policy if exists "reservations: owner responds" on public.reservations;
create policy "reservations: owner responds" on public.reservations
  for update to authenticated
  using (exists (
    select 1 from public.owners o
    where o.user_id = (select auth.uid()) and o.restaurant_id = reservations.restaurant_id
  ))
  with check (
    status in ('confirmed', 'declined', 'completed', 'cancelled')
    and exists (
      select 1 from public.owners o
      where o.user_id = (select auth.uid()) and o.restaurant_id = reservations.restaurant_id
    )
  );

-- ---------- 3. Check ----------
-- Should list cancelled_by, the trigger and the new policy.
select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'reservations' and column_name = 'cancelled_by';
select tgname from pg_trigger where tgname = 'reservations_cancelled_by';
select policyname, with_check from pg_policies
where tablename = 'reservations' and policyname = 'reservations: owner responds';
