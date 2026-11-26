-- Test for 045. Run after 045 is applied. Everything is rolled back at the end.
-- Raises an error at the first check that fails; otherwise prints "045 checks passed".

begin;

do $t$
declare
  v_user uuid := gen_random_uuid();
  v_other uuid := gen_random_uuid();
  v_guest uuid := gen_random_uuid();
  v_r1 text;
  v_r2 text;
  v_count int;
  v_failed boolean;
  v_diets text[];
  v_searches text[];
  v_note text;
begin
  select id into v_r1 from public.restaurants order by id limit 1;
  select id into v_r2 from public.restaurants where id <> v_r1 order by id limit 1;

  -- unique emails, so the test never clashes with a real account
  insert into auth.users (id, email, is_anonymous) values
    (v_user, 'user-' || v_user || '@example.test', false),
    (v_other, 'other-' || v_other || '@example.test', false),
    (v_guest, null, true);

  -- ===== the account copies the phone's guest data =====
  perform set_config('request.jwt.claim.sub', v_user::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_user, 'role', 'authenticated', 'is_anonymous', false)::text, true);
  set local role authenticated;

  perform public.merge_guest_saved_data(
    array['halal'], array['egg'], array['korean'], 1000,
    array['Kebab', ' kimbap ', ''],
    jsonb_build_array(
      jsonb_build_object('restaurant_id', v_r1, 'note', 'phone note', 'created_at', '2026-11-01T10:00:00Z', 'updated_at', '2026-11-01T10:00:00Z'),
      jsonb_build_object('restaurant_id', 'no-such-restaurant', 'note', ''),
      jsonb_build_object('restaurant_id', v_r1, 'note', 'duplicate')
    ));

  select diets, recent_searches into v_diets, v_searches from public.user_profiles where user_id = v_user;
  if v_diets is distinct from array['halal'] then raise exception 'profile not copied (diets %)', v_diets; end if;
  if v_searches is distinct from array['Kebab', 'kimbap'] then raise exception 'searches not copied or not trimmed (%)', v_searches; end if;
  select count(*) into v_count from public.user_favourites where user_id = v_user;
  if v_count <> 1 then raise exception 'expected 1 favourite (unknown restaurant and duplicate skipped), got %', v_count; end if;
  select note into v_note from public.user_favourites where user_id = v_user and restaurant_id = v_r1;
  if v_note <> 'phone note' then raise exception 'favourite note not copied (%)', v_note; end if;

  -- a second copy (another phone): the account's profile and notes win, lists are merged
  perform public.merge_guest_saved_data(
    array['vegan'], '{}', '{}', 3000,
    array['KEBAB', 'Ramyeon'],
    jsonb_build_array(
      jsonb_build_object('restaurant_id', v_r1, 'note', 'other phone note'),
      jsonb_build_object('restaurant_id', v_r2, 'note', '')
    ));
  select diets, recent_searches into v_diets, v_searches from public.user_profiles where user_id = v_user;
  if v_diets is distinct from array['halal'] then raise exception 'account profile was overwritten (%)', v_diets; end if;
  if v_searches is distinct from array['KEBAB', 'Ramyeon', 'kimbap'] then raise exception 'searches merged wrongly (%)', v_searches; end if;
  select note into v_note from public.user_favourites where user_id = v_user and restaurant_id = v_r1;
  if v_note <> 'phone note' then raise exception 'account note was overwritten (%)', v_note; end if;
  select count(*) into v_count from public.user_favourites where user_id = v_user;
  if v_count <> 2 then raise exception 'expected 2 favourites after merge, got %', v_count; end if;

  -- at most 5 searches, newest (phone) first
  perform public.merge_guest_saved_data(null, null, null, null, array['a', 'b', 'c', 'd', 'e', 'f'], null);
  select recent_searches into v_searches from public.user_profiles where user_id = v_user;
  if v_searches is distinct from array['a', 'b', 'c', 'd', 'e'] then raise exception 'search list not capped at 5 (%)', v_searches; end if;

  -- normal app writes on its own rows
  update public.user_profiles set diets = array['halal', 'no_pork'], max_distance_m = 500 where user_id = v_user;
  get diagnostics v_count = row_count;
  if v_count <> 1 then raise exception 'account could not update its profile'; end if;
  update public.user_favourites set note = 'edited' where user_id = v_user and restaurant_id = v_r2;
  get diagnostics v_count = row_count;
  if v_count <> 1 then raise exception 'account could not edit its note'; end if;

  -- values the app does not know are refused
  begin update public.user_profiles set diets = array['keto'] where user_id = v_user; v_failed := false;
  exception when check_violation then v_failed := true; end;
  if not v_failed then raise exception 'unknown diet was accepted'; end if;
  begin update public.user_favourites set note = repeat('x', 281) where user_id = v_user and restaurant_id = v_r2; v_failed := false;
  exception when check_violation then v_failed := true; end;
  if not v_failed then raise exception 'note over 280 characters was accepted'; end if;

  -- cannot write rows for someone else
  begin insert into public.user_favourites (user_id, restaurant_id) values (v_other, v_r1); v_failed := false;
  exception when insufficient_privilege then v_failed := true; end;
  if not v_failed then raise exception 'account added a favourite for another account'; end if;
  reset role;

  -- ===== another account sees and changes nothing =====
  perform set_config('request.jwt.claim.sub', v_other::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_other, 'role', 'authenticated', 'is_anonymous', false)::text, true);
  set local role authenticated;
  select count(*) into v_count from public.user_profiles where user_id = v_user;
  if v_count <> 0 then raise exception 'another account could read the profile'; end if;
  select count(*) into v_count from public.user_favourites where user_id = v_user;
  if v_count <> 0 then raise exception 'another account could read the favourites'; end if;
  update public.user_profiles set diets = '{}' where user_id = v_user;
  get diagnostics v_count = row_count;
  if v_count <> 0 then raise exception 'another account changed the profile'; end if;
  delete from public.user_favourites where user_id = v_user;
  get diagnostics v_count = row_count;
  if v_count <> 0 then raise exception 'another account deleted favourites'; end if;
  reset role;

  -- ===== a guest keeps everything on the phone =====
  perform set_config('request.jwt.claim.sub', v_guest::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_guest, 'role', 'authenticated', 'is_anonymous', true)::text, true);
  set local role authenticated;
  begin insert into public.user_profiles (user_id) values (v_guest); v_failed := false;
  exception when insufficient_privilege then v_failed := true; end;
  if not v_failed then raise exception 'guest could save a profile'; end if;
  begin insert into public.user_favourites (user_id, restaurant_id) values (v_guest, v_r1); v_failed := false;
  exception when insufficient_privilege then v_failed := true; end;
  if not v_failed then raise exception 'guest could save a favourite'; end if;
  begin perform public.merge_guest_saved_data(array['halal'], '{}', '{}', 1500, '{}', '[]'); v_failed := false;
  exception when others then v_failed := sqlerrm = 'real_login_required'; end;
  if not v_failed then raise exception 'guest could copy data to an account'; end if;
  select count(*) into v_count from public.user_profiles;
  if v_count <> 0 then raise exception 'guest could read profiles'; end if;
  reset role;

  -- ===== not signed in =====
  set local role anon;
  begin select count(*) into v_count from public.user_favourites; v_failed := false;
  exception when insufficient_privilege then v_failed := true; end;
  if not v_failed then raise exception 'anon could read favourites'; end if;
  begin perform public.merge_guest_saved_data(null, null, null, null, null, null); v_failed := false;
  exception
    when insufficient_privilege then v_failed := true;
    when others then v_failed := false;
  end;
  if not v_failed then raise exception 'anon may call the merge function (execute not revoked)'; end if;
  reset role;

  -- ===== deleting the account deletes its saved data =====
  delete from auth.users where id = v_user;
  select count(*) into v_count from public.user_favourites where user_id = v_user;
  if v_count <> 0 then raise exception 'favourites left behind after account deletion'; end if;
  select count(*) into v_count from public.user_profiles where user_id = v_user;
  if v_count <> 0 then raise exception 'profile left behind after account deletion'; end if;

  raise notice '045 checks passed';
end;
$t$;

rollback;
