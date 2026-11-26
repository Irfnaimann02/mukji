-- Test for 044. Run after 044 is applied. Everything is rolled back at the end.
-- Raises an error at the first check that fails; otherwise prints "044 checks passed".

begin;

do $t$
declare
  v_team uuid := gen_random_uuid();
  v_owner uuid := gen_random_uuid();
  v_draft uuid;
  v_sent uuid;
  v_draft_path text;
  v_sent_path text;
  v_count int;
begin
  insert into auth.users (id, email) values
    (v_team, 'team-' || v_team || '@example.test'), (v_owner, 'owner-' || v_owner || '@example.test');
  insert into public.team_members (user_id) values (v_team);

  -- one draft and one submitted business application, each with a document
  insert into public.owner_business_applications (
    user_id, applicant_type, applicant_full_name, applicant_phone, applicant_email, business_type,
    business_registration_number, registered_business_name, legal_representative_name,
    business_contact_phone, registered_address, status)
  values (v_owner, 'business_owner', 'Test Owner', '01012345678', 'owner@example.test', 'individual',
    '1234567890', '테스트 상호', 'Test Owner', '0311234567', '경기도 안산시 테스트로 1', 'draft')
  returning id into v_draft;
  insert into public.owner_business_applications (
    user_id, applicant_type, applicant_full_name, applicant_phone, applicant_email, business_type,
    business_registration_number, registered_business_name, legal_representative_name,
    business_contact_phone, registered_address, status)
  values (v_owner, 'business_owner', 'Test Owner', '01012345678', 'owner@example.test', 'individual',
    '1234567890', '테스트 상호', 'Test Owner', '0311234567', '경기도 안산시 테스트로 1', 'submitted')
  returning id into v_sent;
  v_draft_path := v_owner || '/' || v_draft || '/draft.pdf';
  v_sent_path := v_owner || '/' || v_sent || '/sent.pdf';
  insert into public.owner_application_documents (application_id, user_id, document_type, original_filename, mime_type, file_size_bytes, storage_path) values
    (v_draft, v_owner, 'business_registration_certificate', 'draft.pdf', 'application/pdf', 1000, v_draft_path),
    (v_sent, v_owner, 'business_registration_certificate', 'sent.pdf', 'application/pdf', 1000, v_sent_path);
  insert into storage.objects (bucket_id, name) values
    ('owner-business-documents', v_draft_path), ('owner-business-documents', v_sent_path);

  -- the team sees only the submitted one
  perform set_config('request.jwt.claim.sub', v_team::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_team, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into v_count from storage.objects where bucket_id = 'owner-business-documents' and name = v_draft_path;
  if v_count <> 0 then raise exception 'team could read a draft document'; end if;
  select count(*) into v_count from storage.objects where bucket_id = 'owner-business-documents' and name = v_sent_path;
  if v_count <> 1 then raise exception 'team could not read a submitted document'; end if;
  reset role;

  -- the owner still sees both of their own files (030/035 rules unchanged)
  perform set_config('request.jwt.claim.sub', v_owner::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_owner, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into v_count from storage.objects where bucket_id = 'owner-business-documents' and name in (v_draft_path, v_sent_path);
  if v_count <> 2 then raise exception 'owner lost access to their own files (saw %)', v_count; end if;
  reset role;

  raise notice '044 checks passed';
end;
$t$;

rollback;
