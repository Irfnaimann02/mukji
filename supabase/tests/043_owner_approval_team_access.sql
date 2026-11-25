-- Test for 043. Run after 043 is applied. Everything is rolled back at the end.
-- Raises an error at the first check that fails; otherwise prints "043 checks passed".

begin;

do $t$
declare
  v_team uuid := gen_random_uuid();
  v_owner uuid := gen_random_uuid();
  v_stranger uuid := gen_random_uuid();
  v_rest_claim text;
  v_rest_new text;
  v_biz uuid;
  v_claim uuid;
  v_new uuid;
  v_pending jsonb;
  v_count int;
  v_failed boolean;
  v_mine jsonb;
  v_path text;
begin
  select id into v_rest_claim from public.restaurants order by id limit 1;
  select id into v_rest_new from public.restaurants where id <> v_rest_claim order by id limit 1;

  -- unique emails, so the test never clashes with a real account
  insert into auth.users (id, email) values
    (v_team, 'team-' || v_team || '@example.test'), (v_owner, 'owner-' || v_owner || '@example.test'),
    (v_stranger, 'stranger-' || v_stranger || '@example.test');
  insert into public.team_members (user_id) values (v_team);

  -- an owner's submitted business + 2 restaurant applications (one claim, one new)
  insert into public.owner_business_applications (
    id, user_id, applicant_type, applicant_full_name, applicant_phone, applicant_email, business_type,
    business_registration_number, registered_business_name, legal_representative_name,
    business_contact_phone, registered_address, status)
  values (gen_random_uuid(), v_owner, 'business_owner', 'Test Owner', '01012345678', 'owner-test@example.com',
    'individual', '1234567890', '테스트 상호', 'Test Owner', '0311234567', '경기도 안산시 테스트로 1', 'submitted')
  returning id into v_biz;
  insert into public.owner_application_documents (application_id, user_id, document_type, original_filename, mime_type, file_size_bytes, storage_path)
  values (v_biz, v_owner, 'business_registration_certificate', 'cert.pdf', 'application/pdf', 1000, v_owner || '/' || v_biz || '/cert.pdf');
  v_path := v_owner || '/' || v_biz || '/cert.pdf';
  insert into storage.objects (bucket_id, name) values ('owner-business-documents', v_path);

  insert into public.owner_restaurant_applications (business_application_id, user_id, application_type, existing_restaurant_id, status, submitted_at)
  values (v_biz, v_owner, 'claim', v_rest_claim, 'submitted', now()) returning id into v_claim;
  insert into public.owner_restaurant_applications (business_application_id, user_id, application_type,
    restaurant_name_ko, restaurant_name_en, category, address, phone, status, submitted_at)
  values (v_biz, v_owner, 'new', '새 가게', 'New Place', '한식', '경기도 안산시 테스트로 2', '0311112222', 'submitted', now())
  returning id into v_new;

  -- ===== a stranger (signed in, not team) =====
  perform set_config('request.jwt.claim.sub', v_stranger::text, true);
  set local role authenticated;
  begin perform public.team_pending_owner_applications(); v_failed := false;
  exception when insufficient_privilege then v_failed := true; end;
  if not v_failed then raise exception 'stranger could list applications'; end if;
  begin perform public.team_open_as_owner(v_rest_claim); v_failed := false;
  exception when insufficient_privilege then v_failed := true; end;
  if not v_failed then raise exception 'stranger could open a restaurant as owner'; end if;
  select count(*) into v_count from storage.objects where bucket_id = 'owner-business-documents' and name = v_path;
  if v_count <> 0 then raise exception 'stranger could read an owner document'; end if;
  reset role;

  -- ===== the team =====
  perform set_config('request.jwt.claim.sub', v_team::text, true);
  set local role authenticated;

  -- only look at this test's rows (a real database may have other applications)
  v_pending := public.team_pending_owner_applications();
  select coalesce(jsonb_agg(e), '[]'::jsonb) into v_mine
  from jsonb_array_elements(v_pending) e where (e->>'id')::uuid in (v_claim, v_new);
  if jsonb_array_length(v_mine) <> 2 then raise exception 'expected 2 pending, got %', jsonb_array_length(v_mine); end if;
  if jsonb_array_length(v_mine->0->'documents') <> 1 then raise exception 'documents missing from the list'; end if;
  if (v_mine->0->'business'->>'businessRegistrationNumber') <> '1234567890' then raise exception 'business details missing'; end if;
  select count(*) into v_count from storage.objects where bucket_id = 'owner-business-documents' and name = v_path;
  if v_count <> 1 then raise exception 'team could not read the uploaded document'; end if;

  -- reject needs a reason
  begin perform public.team_review_owner_application(v_new, false, 'no'); v_failed := false;
  exception when others then v_failed := sqlerrm = 'reason_required'; end;
  if not v_failed then raise exception 'reject without a reason was allowed'; end if;

  -- a "new" application needs a listing to approve
  begin perform public.team_review_owner_application(v_new, true); v_failed := false;
  exception when others then v_failed := sqlerrm = 'restaurant_required'; end;
  if not v_failed then raise exception 'approved a new restaurant without a listing'; end if;

  -- a claim can't be approved onto a different restaurant
  begin perform public.team_review_owner_application(v_claim, true, null, v_rest_new); v_failed := false;
  exception when others then v_failed := sqlerrm = 'claim_restaurant_mismatch'; end;
  if not v_failed then raise exception 'claim approved onto another restaurant'; end if;

  -- approve the claim -> real owner
  perform public.team_review_owner_application(v_claim, true, 'Checked the 사업자등록증.');
  reset role;
  if not exists (select 1 from public.owners where user_id = v_owner and restaurant_id = v_rest_claim and not via_team) then
    raise exception 'approve did not add a real owner';
  end if;
  if (select status from public.owner_restaurant_applications where id = v_claim) <> 'approved'
     or (select reviewed_by from public.owner_restaurant_applications where id = v_claim) <> v_team then
    raise exception 'claim not marked approved by the team member';
  end if;
  if (select status from public.owner_business_applications where id = v_biz) <> 'approved' then
    raise exception 'business application not approved';
  end if;

  -- reject the new one: the business stays approved (the claim was approved)
  perform set_config('request.jwt.claim.sub', v_team::text, true);
  set local role authenticated;
  perform public.team_review_owner_application(v_new, false, 'We could not find this restaurant. Please pick it from the list.');
  begin perform public.team_review_owner_application(v_new, true, null, v_rest_new); v_failed := false;
  exception when others then v_failed := sqlerrm = 'application_not_pending'; end;
  if not v_failed then raise exception 'a rejected application could be approved again'; end if;
  reset role;
  if (select status from public.owner_business_applications where id = v_biz) <> 'approved' then
    raise exception 'rejecting one restaurant un-approved the business';
  end if;
  if (select review_message from public.owner_restaurant_applications where id = v_new) is null then
    raise exception 'reject reason not saved';
  end if;

  -- the applicant can read their own result
  perform set_config('request.jwt.claim.sub', v_owner::text, true);
  set local role authenticated;
  select count(*) into v_count from public.owner_restaurant_applications where id in (v_claim, v_new) and status in ('approved', 'rejected');
  if v_count <> 2 then raise exception 'applicant cannot see their review results'; end if;
  reset role;

  -- ===== team: open / close any restaurant =====
  perform set_config('request.jwt.claim.sub', v_team::text, true);
  set local role authenticated;
  perform public.team_open_as_owner(v_rest_new);
  perform public.team_open_as_owner(v_rest_new); -- twice is fine
  select count(*) into v_count from public.team_my_owner_access();
  if v_count <> 1 then raise exception 'open as owner did not show up'; end if;
  perform public.team_close_owner(v_rest_new);
  select count(*) into v_count from public.team_my_owner_access();
  if v_count <> 0 then raise exception 'close did not remove the team link'; end if;
  reset role;

  -- close never removes a real ownership, and open never turns one into a team link
  insert into public.owners (user_id, restaurant_id, email, via_team) values (v_team, v_rest_claim, 'team-test@example.com', false);
  perform set_config('request.jwt.claim.sub', v_team::text, true);
  set local role authenticated;
  perform public.team_open_as_owner(v_rest_claim);
  perform public.team_close_owner(v_rest_claim);
  reset role;
  if not exists (select 1 from public.owners where user_id = v_team and restaurant_id = v_rest_claim and not via_team) then
    raise exception 'a real ownership was changed or removed';
  end if;

  raise notice '043 checks passed';
end;
$t$;

rollback;
