-- 043_owner_approval_team_access.sql
-- #118: finish the owner sign-up and let the Mukji team open any restaurant as owner.
--
-- Before this, an owner could submit a business + restaurant application (030, 036),
-- but nothing ever approved it or linked them in public.owners, so they waited forever.
--
-- 1. The team (029 team_members) can list submitted restaurant applications, see the
--    business details and documents behind them, and approve or reject with a message.
--    Approve adds the applicant to public.owners for that restaurant.
-- 2. A team member can open any restaurant as its owner (and close it again). These
--    links are marked owners.via_team, so they stay separate from real owners.
--
-- Everything else (menu, restaurant info, reservations) keeps using public.owners,
-- so no existing owner rule changes. Safe to re-run.

begin;

-- ---------- 1. Columns ----------

-- true = a team member opened this restaurant as owner; false = a real, approved owner
alter table public.owners add column if not exists via_team boolean not null default false;

-- who reviewed a restaurant application, and when (the applicant can't set these:
-- 036 only grants them insert/update on the draft fields)
alter table public.owner_restaurant_applications add column if not exists reviewed_by uuid references auth.users (id) on delete set null;
alter table public.owner_restaurant_applications add column if not exists reviewed_at timestamptz;
-- for a "new restaurant" application, the listing the team linked it to
alter table public.owner_restaurant_applications add column if not exists approved_restaurant_id text references public.restaurants (id) on delete set null;

alter table public.owner_restaurant_applications drop constraint if exists owner_restaurant_applications_review_message_check;
alter table public.owner_restaurant_applications add constraint owner_restaurant_applications_review_message_check
  check (review_message is null or char_length(review_message) <= 500);

-- ---------- 2. Team can read uploaded documents (to check the 사업자등록증) ----------
-- Read only. Applicants keep their own read/upload/delete rules from 030/035.
drop policy if exists "owner business documents: team can read" on storage.objects;
create policy "owner business documents: team can read"
  on storage.objects for select to authenticated
  using (bucket_id = 'owner-business-documents' and public.is_team_member());

-- ---------- 3. Applications waiting for the team ----------
-- One row per submitted restaurant application, with its business application and
-- documents. Team only; everyone else gets an error.
create or replace function public.team_pending_owner_applications()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_team_member() then
    raise exception 'team_only' using errcode = '42501';
  end if;

  return coalesce((
    select jsonb_agg(row_data order by submitted_at)
    from (
      select a.submitted_at,
        jsonb_build_object(
          'id', a.id,
          'status', a.status,
          'applicationType', a.application_type,
          'submittedAt', a.submitted_at,
          'existingRestaurantId', a.existing_restaurant_id,
          'existingRestaurantNameKo', r.name_ko,
          'existingRestaurantAddress', r.address,
          'restaurantNameKo', a.restaurant_name_ko,
          'restaurantNameEn', a.restaurant_name_en,
          'category', a.category,
          'address', a.address,
          'phone', a.phone,
          'description', a.description,
          'business', jsonb_build_object(
            'applicantType', b.applicant_type,
            'applicantFullName', b.applicant_full_name,
            'applicantPhone', b.applicant_phone,
            'applicantEmail', b.applicant_email,
            'businessType', b.business_type,
            'businessRegistrationNumber', b.business_registration_number,
            'registeredBusinessName', b.registered_business_name,
            'legalRepresentativeName', b.legal_representative_name,
            'businessContactPhone', b.business_contact_phone,
            'registeredAddress', b.registered_address
          ),
          'documents', coalesce((
            select jsonb_agg(jsonb_build_object(
              'id', d.id,
              'documentType', d.document_type,
              'originalFilename', d.original_filename,
              'mimeType', d.mime_type,
              'storagePath', d.storage_path
            ) order by d.created_at)
            from public.owner_application_documents d
            where d.application_id = b.id
          ), '[]'::jsonb)
        ) as row_data
      from public.owner_restaurant_applications a
      join public.owner_business_applications b on b.id = a.business_application_id
      left join public.restaurants r on r.id = a.existing_restaurant_id
      where a.status in ('submitted', 'under_review')
    ) pending
  ), '[]'::jsonb);
end;
$$;

-- ---------- 4. Approve or reject ----------
-- Approve: the applicant becomes owner of the restaurant.
--   claim = the restaurant they picked; new = a listing the team picks (p_restaurant_id),
--   since a new restaurant has no map position yet. Not found? Reject with a message.
-- Reject: needs a short reason, which the applicant sees.
create or replace function public.team_review_owner_application(
  p_application_id uuid,
  p_approve boolean,
  p_message text default null,
  p_restaurant_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_app public.owner_restaurant_applications%rowtype;
  v_email text;
  v_restaurant text;
  v_message text := nullif(trim(coalesce(p_message, '')), '');
begin
  if not public.is_team_member() then
    raise exception 'team_only' using errcode = '42501';
  end if;
  if p_approve is null then
    raise exception 'decision_required';
  end if;
  if v_message is not null and char_length(v_message) > 500 then
    raise exception 'message_too_long';
  end if;

  select * into v_app
  from public.owner_restaurant_applications
  where id = p_application_id and status in ('submitted', 'under_review')
  for update;
  if not found then
    raise exception 'application_not_pending';
  end if;

  if not p_approve then
    if v_message is null or char_length(v_message) < 5 then
      raise exception 'reason_required';
    end if;

    update public.owner_restaurant_applications
       set status = 'rejected', review_message = v_message,
           reviewed_by = auth.uid(), reviewed_at = now(), updated_at = now()
     where id = v_app.id;

    -- the business application is rejected too, unless another restaurant under it
    -- is still waiting or was approved
    update public.owner_business_applications b
       set status = 'rejected', updated_at = now()
     where b.id = v_app.business_application_id
       and not exists (
         select 1 from public.owner_restaurant_applications o
         where o.business_application_id = b.id and o.id <> v_app.id
           and o.status in ('submitted', 'under_review', 'approved'));

    return jsonb_build_object('status', 'rejected');
  end if;

  if v_app.application_type = 'claim' then
    if p_restaurant_id is not null and p_restaurant_id <> v_app.existing_restaurant_id then
      raise exception 'claim_restaurant_mismatch';
    end if;
    v_restaurant := v_app.existing_restaurant_id;
  else
    v_restaurant := nullif(trim(coalesce(p_restaurant_id, '')), '');
    if v_restaurant is null then
      raise exception 'restaurant_required';
    end if;
  end if;

  if not exists (select 1 from public.restaurants where id = v_restaurant) then
    raise exception 'restaurant_not_found';
  end if;

  select b.applicant_email into v_email
  from public.owner_business_applications b
  where b.id = v_app.business_application_id;
  if v_email is null then
    select u.email into v_email from auth.users u where u.id = v_app.user_id;
  end if;

  -- a real owner now (if a team member had opened it before, that link stays separate)
  insert into public.owners (user_id, restaurant_id, email, via_team)
  values (v_app.user_id, v_restaurant, v_email, false)
  on conflict (user_id, restaurant_id) do update set via_team = false;

  update public.owner_restaurant_applications
     set status = 'approved', review_message = v_message,
         approved_restaurant_id = v_restaurant,
         reviewed_by = auth.uid(), reviewed_at = now(), updated_at = now()
   where id = v_app.id;

  update public.owner_business_applications
     set status = 'approved', updated_at = now()
   where id = v_app.business_application_id;

  return jsonb_build_object('status', 'approved', 'restaurantId', v_restaurant);
end;
$$;

-- ---------- 5. Team: open any restaurant as owner ----------
create or replace function public.team_open_as_owner(p_restaurant_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text;
begin
  if not public.is_team_member() then
    raise exception 'team_only' using errcode = '42501';
  end if;
  if not exists (select 1 from public.restaurants where id = p_restaurant_id) then
    raise exception 'restaurant_not_found';
  end if;

  select email into v_email from auth.users where id = auth.uid();

  -- never turns an existing real ownership into a team link
  insert into public.owners (user_id, restaurant_id, email, via_team)
  values (auth.uid(), p_restaurant_id, coalesce(v_email, ''), true)
  on conflict (user_id, restaurant_id) do nothing;
end;
$$;

-- Close only removes team links, never a real ownership.
create or replace function public.team_close_owner(p_restaurant_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_team_member() then
    raise exception 'team_only' using errcode = '42501';
  end if;
  delete from public.owners
   where user_id = auth.uid() and restaurant_id = p_restaurant_id and via_team;
end;
$$;

-- The restaurants this team member has open, with names, newest first.
create or replace function public.team_my_owner_access()
returns table (restaurant_id text, name_ko text, name_en text, address text, opened_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_team_member() then
    raise exception 'team_only' using errcode = '42501';
  end if;
  return query
    select o.restaurant_id, r.name_ko, r.name_en, r.address, o.created_at
    from public.owners o
    join public.restaurants r on r.id = o.restaurant_id
    where o.user_id = auth.uid() and o.via_team
    order by o.created_at desc;
end;
$$;

revoke all on function public.team_pending_owner_applications() from public, anon;
revoke all on function public.team_review_owner_application(uuid, boolean, text, text) from public, anon;
revoke all on function public.team_open_as_owner(text) from public, anon;
revoke all on function public.team_close_owner(text) from public, anon;
revoke all on function public.team_my_owner_access() from public, anon;
grant execute on function public.team_pending_owner_applications() to authenticated;
grant execute on function public.team_review_owner_application(uuid, boolean, text, text) to authenticated;
grant execute on function public.team_open_as_owner(text) to authenticated;
grant execute on function public.team_close_owner(text) to authenticated;
grant execute on function public.team_my_owner_access() to authenticated;

commit;

-- Undo the team links (keeps real owners):
--   delete from public.owners where via_team;
