-- 041_owner_menu_management.sql
-- Owner-managed menu details and reviewable ingredient claims (#54 / PR7).
-- Normal menu fields can be updated by linked owners. Ingredient changes are
-- stored separately and never become trusted merely because an owner submits them.
-- Safe to re-run.

begin;

alter table public.dishes
  add column if not exists menu_category text not null default 'other',
  add column if not exists is_available boolean not null default true,
  add column if not exists ingredients_verified boolean not null default true,
  add column if not exists photo_path text,
  add column if not exists owner_updated_at timestamptz;

alter table public.dishes drop constraint if exists dishes_menu_category_check;
alter table public.dishes add constraint dishes_menu_category_check
  check (menu_category in ('main', 'side', 'drink', 'other'));

create table if not exists public.owner_menu_ingredient_changes (
  id uuid primary key default gen_random_uuid(),
  restaurant_id text not null references public.restaurants(id) on delete cascade,
  dish_id text not null references public.dishes(id) on delete cascade,
  submitted_by uuid not null references auth.users(id) on delete cascade,
  proposed_contains text[] not null default '{}',
  proposed_may_contain text[] not null default '{}',
  note text not null default '' check (char_length(note) <= 500),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  was_verified boolean not null default false,
  review_note text,
  reviewed_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  check (not (proposed_contains && proposed_may_contain)),
  check (proposed_contains <@ '{pork,beef,chicken,lamb,seafood,egg,dairy,alcohol,peanut,wheat,soy}'::text[]),
  check (proposed_may_contain <@ '{pork,beef,chicken,lamb,seafood,egg,dairy,alcohol,peanut,wheat,soy}'::text[])
);

create index if not exists owner_menu_ingredient_changes_restaurant_idx
  on public.owner_menu_ingredient_changes (restaurant_id, created_at desc);
create unique index if not exists owner_menu_one_pending_ingredient_change_per_dish
  on public.owner_menu_ingredient_changes (dish_id) where status = 'pending';

alter table public.owner_menu_ingredient_changes enable row level security;
revoke all on public.owner_menu_ingredient_changes from public, anon, authenticated;
grant select on public.owner_menu_ingredient_changes to authenticated;

drop policy if exists "owners read their ingredient change requests" on public.owner_menu_ingredient_changes;
create policy "owners read their ingredient change requests"
  on public.owner_menu_ingredient_changes for select to authenticated
  using (exists (
    select 1 from public.owners o
    where o.user_id = (select auth.uid())
      and o.restaurant_id = owner_menu_ingredient_changes.restaurant_id
  ));

-- Owners may update ordinary menu details only. Ingredient arrays and review
-- state are deliberately excluded from direct table updates.
revoke insert, update, delete on public.dishes from anon, authenticated;
drop policy if exists "linked owners update ordinary menu fields" on public.dishes;

-- Menu-item photos are public listing media. Only the linked owner can upload
-- or remove objects inside that restaurant's dish folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'menu-item-photos', 'menu-item-photos', true, 8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do update set
  public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "menu item photos: linked owner reads" on storage.objects;
create policy "menu item photos: linked owner reads" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'menu-item-photos'
    and exists (
      select 1 from public.owners o
      join public.restaurants r on r.id = o.restaurant_id
      join public.dishes d on d.restaurant_id = o.restaurant_id
      where o.user_id = (select auth.uid())
        and r.status = 'approved'
        and d.id = (storage.foldername(name))[2]
        and d.restaurant_id = (storage.foldername(name))[1]
    )
  );

drop policy if exists "menu item photos: linked owner uploads" on storage.objects;
create policy "menu item photos: linked owner uploads" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'menu-item-photos'
    and exists (
      select 1 from public.owners o
      join public.restaurants r on r.id = o.restaurant_id
      join public.dishes d on d.restaurant_id = o.restaurant_id
      where o.user_id = (select auth.uid())
        and r.status = 'approved'
        and d.id = (storage.foldername(name))[2]
        and d.restaurant_id = (storage.foldername(name))[1]
        and coalesce(d.typical, false) = false
        and d.id not like '%-chain-%'
    )
  );

drop policy if exists "menu item photos: linked owner deletes" on storage.objects;
create policy "menu item photos: linked owner deletes" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'menu-item-photos'
    and exists (
      select 1 from public.owners o
      join public.restaurants r on r.id = o.restaurant_id
      join public.dishes d on d.restaurant_id = o.restaurant_id
      where o.user_id = (select auth.uid())
        and r.status = 'approved'
        and d.id = (storage.foldername(name))[2]
        and d.restaurant_id = (storage.foldername(name))[1]
        and coalesce(d.typical, false) = false
        and d.id not like '%-chain-%'
    )
  );

create or replace function public.owner_create_menu_item(
  p_restaurant_id text,
  p_name_ko text,
  p_name_en text,
  p_price_won integer,
  p_menu_category text,
  p_contains text[] default '{}',
  p_may_contain text[] default '{}',
  p_leave_out_ko text default '',
  p_leave_out_en text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_id text;
  v_base record;
  v_contains text[];
  v_may text[];
  v_verified boolean := false;
  v_request uuid;
  v_needs_review boolean := false;
  v_has_base boolean := false;
  v_proposed_contains text[];
  v_proposed_may text[];
begin
  if v_user is null or not exists (
    select 1 from public.owners o join public.restaurants r on r.id = o.restaurant_id
    where o.user_id = v_user and o.restaurant_id = p_restaurant_id and r.status = 'approved'
  ) then
    raise exception 'owner_access_denied' using errcode = '42501';
  end if;
  if nullif(trim(p_name_ko), '') is null or char_length(trim(p_name_ko)) > 120 then
    raise exception 'invalid_menu_name' using errcode = '22023';
  end if;
  if char_length(coalesce(trim(p_name_en), '')) > 120 then
    raise exception 'invalid_menu_name' using errcode = '22023';
  end if;
  if char_length(coalesce(p_leave_out_ko, '')) > 300 or char_length(coalesce(p_leave_out_en, '')) > 300 then
    raise exception 'invalid_ordering_condition' using errcode = '22023';
  end if;
  if p_price_won is null or p_price_won < 0 or p_price_won > 10000000 then
    raise exception 'invalid_menu_price' using errcode = '22023';
  end if;
  if p_menu_category not in ('main', 'side', 'drink', 'other') then
    raise exception 'invalid_menu_category' using errcode = '22023';
  end if;
  if coalesce(p_contains, '{}') && coalesce(p_may_contain, '{}') then
    raise exception 'ingredient_tags_overlap' using errcode = '22023';
  end if;
  if not (coalesce(p_contains, '{}') <@ '{pork,beef,chicken,lamb,seafood,egg,dairy,alcohol,peanut,wheat,soy}'::text[])
     or not (coalesce(p_may_contain, '{}') <@ '{pork,beef,chicken,lamb,seafood,egg,dairy,alcohol,peanut,wheat,soy}'::text[]) then
    raise exception 'invalid_ingredient_tag' using errcode = '22023';
  end if;

  select * into v_base from public.match_dish(trim(p_name_ko));
  v_has_base := found;
  if v_has_base then
    -- Start with the checked dish-library tags, then add owner-provided tags.
    -- Even an exact library match is not treated as verified for this branch
    -- until the team reviews the restaurant-specific preparation.
    select coalesce(array_agg(distinct tag order by tag), '{}') into v_contains
    from unnest(coalesce(v_base.contains, '{}') || coalesce(p_contains, '{}')) as x(tag);
    select coalesce(array_agg(distinct tag order by tag), '{}') into v_may
    from unnest(coalesce(v_base.may_contain, '{}') || coalesce(p_may_contain, '{}')) as x(tag)
    where not (tag = any(v_contains));
  else
    v_contains := coalesce(p_contains, '{}');
    v_may := coalesce(p_may_contain, '{}');
  end if;

  v_proposed_contains := v_contains;
  v_proposed_may := v_may;
  v_verified := false;
  v_needs_review := true;

  if not v_has_base and cardinality(v_contains) + cardinality(v_may) = 0 then
    raise exception 'ingredients_required_for_unknown_dish' using errcode = '22023';
  end if;

  v_id := p_restaurant_id || '-owner-' || replace(gen_random_uuid()::text, '-', '');
  insert into public.dishes (
    id, restaurant_id, name_ko, name_en, price_won, contains, may_contain, leave_out_ko, leave_out_en,
    menu_category, is_available, ingredients_verified, last_checked, owner_updated_at
  ) values (
    v_id, p_restaurant_id, trim(p_name_ko), coalesce(nullif(trim(p_name_en), ''), trim(p_name_ko)),
    p_price_won, v_contains, v_may, nullif(trim(coalesce(p_leave_out_ko, '')), ''), nullif(trim(coalesce(p_leave_out_en, '')), ''),
    p_menu_category, true, v_verified, case when v_verified then current_date else null end, now()
  );

  if v_needs_review then
    insert into public.owner_menu_ingredient_changes (
      restaurant_id, dish_id, submitted_by, proposed_contains, proposed_may_contain, note, was_verified
    ) values (
      p_restaurant_id, v_id, v_user, v_proposed_contains, v_proposed_may,
      'Initial ingredient information submitted with a new menu item; verify branch-specific preparation.', false
    ) returning id into v_request;
  end if;

  return jsonb_build_object('dish_id', v_id, 'ingredients_verified', v_verified, 'change_request_id', v_request);
end;
$$;

create or replace function public.owner_update_menu_item(
  p_dish_id text,
  p_name_ko text,
  p_name_en text,
  p_price_won integer,
  p_menu_category text,
  p_is_available boolean,
  p_leave_out_ko text,
  p_leave_out_en text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_dish public.dishes%rowtype;
begin
  select d.* into v_dish
  from public.dishes d
  join public.owners o on o.restaurant_id = d.restaurant_id and o.user_id = v_user
  join public.restaurants r on r.id = d.restaurant_id and r.status = 'approved'
  where d.id = p_dish_id and coalesce(d.typical, false) = false and d.id not like '%-chain-%'
  for update;
  if not found then raise exception 'menu_item_not_found_or_not_editable' using errcode = 'P0002'; end if;
  if nullif(trim(p_name_ko), '') is null or char_length(trim(p_name_ko)) > 120 then
    raise exception 'invalid_menu_name' using errcode = '22023';
  end if;
  if char_length(coalesce(trim(p_name_en), '')) > 120 then
    raise exception 'invalid_menu_name' using errcode = '22023';
  end if;
  if char_length(coalesce(p_leave_out_ko, '')) > 300 or char_length(coalesce(p_leave_out_en, '')) > 300 then
    raise exception 'invalid_ordering_condition' using errcode = '22023';
  end if;
  if p_price_won is null or p_price_won < 0 or p_price_won > 10000000 then
    raise exception 'invalid_menu_price' using errcode = '22023';
  end if;
  if p_menu_category not in ('main', 'side', 'drink', 'other') then
    raise exception 'invalid_menu_category' using errcode = '22023';
  end if;

  update public.dishes
  set name_ko = trim(p_name_ko),
      name_en = coalesce(nullif(trim(p_name_en), ''), trim(p_name_ko)),
      price_won = p_price_won,
      leave_out_ko = nullif(trim(coalesce(p_leave_out_ko, '')), ''),
      leave_out_en = nullif(trim(coalesce(p_leave_out_en, '')), ''),
      menu_category = p_menu_category,
      is_available = coalesce(p_is_available, true),
      owner_updated_at = now(),
      ingredients_verified = case when trim(p_name_ko) <> v_dish.name_ko then false else v_dish.ingredients_verified end
  where id = p_dish_id;

  if trim(p_name_ko) <> v_dish.name_ko then
    insert into public.owner_menu_ingredient_changes (
      restaurant_id, dish_id, submitted_by, proposed_contains, proposed_may_contain, note, was_verified
    ) values (
      v_dish.restaurant_id, v_dish.id, v_user, v_dish.contains, v_dish.may_contain,
      'The Korean menu name changed; please confirm that the ingredient information still applies.',
      v_dish.ingredients_verified
    )
    on conflict (dish_id) where status = 'pending'
    do update set note = excluded.note, submitted_by = excluded.submitted_by, created_at = now();
  end if;
end;
$$;

create or replace function public.owner_submit_menu_ingredient_change(
  p_dish_id text,
  p_contains text[],
  p_may_contain text[],
  p_note text default ''
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_restaurant_id text;
  v_request uuid;
begin
  select d.restaurant_id into v_restaurant_id
  from public.dishes d
  join public.owners o on o.restaurant_id = d.restaurant_id and o.user_id = v_user
  join public.restaurants r on r.id = d.restaurant_id and r.status = 'approved'
  where d.id = p_dish_id and coalesce(d.typical, false) = false and d.id not like '%-chain-%';
  if v_restaurant_id is null then
    raise exception 'owner_access_denied' using errcode = '42501';
  end if;
  if coalesce(p_contains, '{}') && coalesce(p_may_contain, '{}') then
    raise exception 'ingredient_tags_overlap' using errcode = '22023';
  end if;
  if not (coalesce(p_contains, '{}') <@ '{pork,beef,chicken,lamb,seafood,egg,dairy,alcohol,peanut,wheat,soy}'::text[])
     or not (coalesce(p_may_contain, '{}') <@ '{pork,beef,chicken,lamb,seafood,egg,dairy,alcohol,peanut,wheat,soy}'::text[]) then
    raise exception 'invalid_ingredient_tag' using errcode = '22023';
  end if;
  if cardinality(coalesce(p_contains, '{}')) + cardinality(coalesce(p_may_contain, '{}')) = 0 then
    raise exception 'ingredients_required' using errcode = '22023';
  end if;

  insert into public.owner_menu_ingredient_changes (
    restaurant_id, dish_id, submitted_by, proposed_contains, proposed_may_contain, note, was_verified
  ) values (
    v_restaurant_id, p_dish_id, v_user, coalesce(p_contains, '{}'), coalesce(p_may_contain, '{}'), left(trim(coalesce(p_note, '')), 500),
    (select d.ingredients_verified from public.dishes d where d.id = p_dish_id)
  )
  on conflict (dish_id) where status = 'pending'
  do update set proposed_contains = excluded.proposed_contains,
                proposed_may_contain = excluded.proposed_may_contain,
                note = excluded.note,
                submitted_by = excluded.submitted_by,
                created_at = now()
  returning id into v_request;

  update public.dishes set ingredients_verified = false where id = p_dish_id;
  return v_request;
end;
$$;

create or replace function public.owner_set_menu_item_photo(p_dish_id text, p_photo_path text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_restaurant_id text;
begin
  select d.restaurant_id into v_restaurant_id
  from public.dishes d
  join public.owners o on o.restaurant_id = d.restaurant_id and o.user_id = v_user
  join public.restaurants r on r.id = d.restaurant_id and r.status = 'approved'
  where d.id = p_dish_id and coalesce(d.typical, false) = false and d.id not like '%-chain-%';
  if v_restaurant_id is null then
    raise exception 'menu_item_not_found_or_not_editable' using errcode = 'P0002';
  end if;
  if p_photo_path is not null then
    if left(p_photo_path, char_length(v_restaurant_id || '/' || p_dish_id || '/')) <> (v_restaurant_id || '/' || p_dish_id || '/') then
      raise exception 'invalid_menu_photo_path' using errcode = '22023';
    end if;
    if not exists (select 1 from storage.objects where bucket_id = 'menu-item-photos' and name = p_photo_path) then
      raise exception 'menu_photo_not_found' using errcode = 'P0002';
    end if;
  end if;
  update public.dishes set photo_path = p_photo_path, owner_updated_at = now() where id = p_dish_id;
end;
$$;

create or replace function public.owner_delete_menu_item(p_dish_id text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
begin
  delete from public.dishes d
  using public.owners o, public.restaurants r
  where d.id = p_dish_id
    and o.user_id = v_user and o.restaurant_id = d.restaurant_id
    and r.id = d.restaurant_id and r.status = 'approved'
    and coalesce(d.typical, false) = false
    and d.id not like '%-chain-%';
  if not found then raise exception 'menu_item_not_found_or_not_editable' using errcode = 'P0002'; end if;
end;
$$;

create or replace function public.team_pending_owner_ingredient_changes()
returns table (
  id uuid, restaurant_id text, restaurant_name_ko text, restaurant_name_en text,
  dish_id text, dish_name_ko text, current_contains text[], current_may_contain text[],
  proposed_contains text[], proposed_may_contain text[], note text, created_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_team_member() then raise exception 'team_only' using errcode = '42501'; end if;
  return query
    select c.id, c.restaurant_id, r.name_ko, r.name_en, c.dish_id, d.name_ko,
           d.contains, d.may_contain, c.proposed_contains, c.proposed_may_contain,
           c.note, c.created_at
    from public.owner_menu_ingredient_changes c
    join public.restaurants r on r.id = c.restaurant_id
    join public.dishes d on d.id = c.dish_id
    where c.status = 'pending'
    order by c.created_at;
end;
$$;

create or replace function public.team_review_owner_ingredient_change(
  p_id uuid, p_approve boolean, p_review_note text default ''
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_change public.owner_menu_ingredient_changes%rowtype;
begin
  if not public.is_team_member() then raise exception 'team_only' using errcode = '42501'; end if;
  select * into v_change from public.owner_menu_ingredient_changes where id = p_id and status = 'pending' for update;
  if not found then raise exception 'not_pending' using errcode = 'P0002'; end if;

  if p_approve then
    update public.dishes
    set contains = v_change.proposed_contains,
        may_contain = v_change.proposed_may_contain,
        ingredients_verified = true,
        last_checked = current_date
    where id = v_change.dish_id;
  end if;

  update public.owner_menu_ingredient_changes
  set status = case when p_approve then 'approved' else 'rejected' end,
      review_note = left(nullif(trim(coalesce(p_review_note, '')), ''), 500),
      reviewed_by = auth.uid(), reviewed_at = now()
  where id = p_id;

  if not p_approve then
    update public.dishes set ingredients_verified = v_change.was_verified where id = v_change.dish_id
      and not exists (
        select 1 from public.owner_menu_ingredient_changes c
        where c.dish_id = v_change.dish_id and c.status = 'pending'
      );
  end if;
end;
$$;

revoke all on function public.owner_create_menu_item(text,text,text,integer,text,text[],text[],text,text) from public, anon;
revoke all on function public.owner_update_menu_item(text,text,text,integer,text,boolean,text,text) from public, anon;
revoke all on function public.owner_submit_menu_ingredient_change(text,text[],text[],text) from public, anon;
revoke all on function public.owner_set_menu_item_photo(text,text) from public, anon;
revoke all on function public.owner_delete_menu_item(text) from public, anon;
revoke all on function public.team_pending_owner_ingredient_changes() from public, anon;
revoke all on function public.team_review_owner_ingredient_change(uuid,boolean,text) from public, anon;
grant execute on function public.owner_create_menu_item(text,text,text,integer,text,text[],text[],text,text) to authenticated;
grant execute on function public.owner_update_menu_item(text,text,text,integer,text,boolean,text,text) to authenticated;
grant execute on function public.owner_submit_menu_ingredient_change(text,text[],text[],text) to authenticated;
grant execute on function public.owner_set_menu_item_photo(text,text) to authenticated;
grant execute on function public.owner_delete_menu_item(text) to authenticated;
grant execute on function public.team_pending_owner_ingredient_changes() to authenticated;
grant execute on function public.team_review_owner_ingredient_change(uuid,boolean,text) to authenticated;

commit;

-- Verification:
-- 1. Only linked owners of approved restaurants can edit ordinary menu fields.
-- 2. Owners cannot directly write contains/may_contain or ingredients_verified.
-- 3. New dishes matching the team dish library use its checked ingredient tags.
-- 4. New unmatched dishes stay Ask first until the team reviews their ingredient claim.
-- 5. Ingredient edits are pending and do not replace the public tags before approval.
-- 6. Chain and generated typical menu rows cannot be edited or deleted by owners.
-- 7. Menu-item photos are public media, but only linked owners can upload/remove their own files.
-- 8. Only team members can read/review the ingredient-change queue through RPCs.
