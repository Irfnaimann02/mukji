-- Regression check for PR8 / migration 042.
-- Run in the SQL editor or psql after applying migrations 001-042.
-- This test is read-only and raises an error if a PR7 SECURITY DEFINER
-- function is missing or does not have an empty search_path.

begin;

do $$
declare
  v_expected constant text[] := array[
    'owner_create_menu_item',
    'owner_update_menu_item',
    'owner_submit_menu_ingredient_change',
    'owner_set_menu_item_photo',
    'owner_delete_menu_item',
    'team_pending_owner_ingredient_changes',
    'team_review_owner_ingredient_change'
  ];
  v_found integer;
  v_unsafe text[];
begin
  select count(*)
    into v_found
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname = any (v_expected)
     and p.prosecdef;

  if v_found <> cardinality(v_expected) then
    raise exception 'Expected % PR7 SECURITY DEFINER functions, found %.',
      cardinality(v_expected), v_found;
  end if;

  select array_agg(p.proname order by p.proname)
    into v_unsafe
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname = any (v_expected)
     and p.prosecdef
     and not coalesce(p.proconfig, '{}'::text[]) @> array['search_path=""']::text[];

  if v_unsafe is not null then
    raise exception 'PR7 SECURITY DEFINER functions do not have an empty search_path: %',
      array_to_string(v_unsafe, ', ');
  end if;

  raise notice 'Owner menu SECURITY DEFINER search_path check passed.';
end;
$$;

rollback;
