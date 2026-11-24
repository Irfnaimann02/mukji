-- 042_owner_menu_function_search_path.sql
-- PR8: harden the SECURITY DEFINER functions added by PR7.
-- An empty search_path prevents an object in a writable schema from shadowing
-- an unqualified object while these functions execute with elevated privileges.
-- The function bodies already schema-qualify application tables and helpers.
-- Safe to re-run; this changes function configuration only.

begin;

alter function public.owner_create_menu_item(
  text, text, text, integer, text, text[], text[], text, text
) set search_path = '';

alter function public.owner_update_menu_item(
  text, text, text, integer, text, boolean, text, text
) set search_path = '';

alter function public.owner_submit_menu_ingredient_change(
  text, text[], text[], text
) set search_path = '';

alter function public.owner_set_menu_item_photo(text, text)
  set search_path = '';

alter function public.owner_delete_menu_item(text)
  set search_path = '';

alter function public.team_pending_owner_ingredient_changes()
  set search_path = '';

alter function public.team_review_owner_ingredient_change(uuid, boolean, text)
  set search_path = '';

commit;

-- Verification: every PR7 SECURITY DEFINER function should report
-- search_path="" in pg_proc.proconfig. See supabase/tests/042_owner_menu_function_search_path.sql.
select p.proname, p.proconfig
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'owner_create_menu_item',
    'owner_update_menu_item',
    'owner_submit_menu_ingredient_change',
    'owner_set_menu_item_photo',
    'owner_delete_menu_item',
    'team_pending_owner_ingredient_changes',
    'team_review_owner_ingredient_change'
  )
order by p.proname;
