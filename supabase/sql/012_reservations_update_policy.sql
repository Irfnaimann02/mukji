revoke update on public.reservations from anon, authenticated;
grant update (status) on public.reservations to authenticated;

drop policy if exists "reservations: update own or owned" on public.reservations;

drop policy if exists "reservations: customer cancels" on public.reservations;
create policy "reservations: customer cancels" on public.reservations
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and status = 'cancelled');

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

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a677ebee-6dd3-4588-a3e2-a0b63ec307c0","role":"authenticated"}', true);
insert into reservations (restaurant_id, reserved_for, people) values ('r10', now() + interval '1 day', 2);
update reservations set status = 'confirmed' where restaurant_id = 'r10';
