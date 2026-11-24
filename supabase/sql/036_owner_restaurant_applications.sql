-- 036_owner_restaurant_applications.sql
-- PR4: private new-restaurant and existing-restaurant claim applications.
-- Applicants can save drafts and submit them, but cannot approve or publish them.
-- Safe to re-run.

begin;

-- A new notice version requires a fresh acknowledgement. Existing timestamps
-- remain intact for saves against the same notice version.
alter table public.owner_business_applications
  add column if not exists privacy_notice_version text;
grant insert (privacy_notice_version)
  on public.owner_business_applications to authenticated;
grant update (privacy_notice_version)
  on public.owner_business_applications to authenticated;

create table if not exists public.owner_restaurant_applications (
  id uuid primary key default gen_random_uuid(),
  business_application_id uuid not null
    references public.owner_business_applications (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  application_type text not null check (application_type in ('new', 'claim')),
  existing_restaurant_id text references public.restaurants (id) on delete restrict,
  restaurant_name_ko text,
  restaurant_name_en text,
  category text,
  address text,
  phone text,
  description text,
  status text not null default 'draft'
    check (status in ('draft', 'submitted', 'under_review', 'needs_information', 'approved', 'rejected')),
  review_message text,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    status = 'draft'
    or (application_type = 'claim' and existing_restaurant_id is not null)
    or (application_type = 'new' and existing_restaurant_id is null)
  ),
  check (restaurant_name_ko is null or char_length(trim(restaurant_name_ko)) <= 160),
  check (restaurant_name_en is null or char_length(trim(restaurant_name_en)) <= 160),
  check (category is null or char_length(trim(category)) <= 80),
  check (address is null or char_length(trim(address)) <= 500),
  check (phone is null or char_length(trim(phone)) <= 30),
  check (description is null or char_length(trim(description)) <= 2000)
);

create index if not exists owner_restaurant_applications_user_status_updated_idx
  on public.owner_restaurant_applications (user_id, status, updated_at desc);
create index if not exists owner_restaurant_applications_business_idx
  on public.owner_restaurant_applications (business_application_id, updated_at desc);

alter table public.owner_restaurant_applications enable row level security;
revoke all on public.owner_restaurant_applications from public, anon, authenticated;
grant select, delete on public.owner_restaurant_applications to authenticated;
grant insert (
  business_application_id, user_id, application_type, existing_restaurant_id,
  restaurant_name_ko, restaurant_name_en, category, address, phone, description, updated_at
) on public.owner_restaurant_applications to authenticated;
grant update (
  application_type, existing_restaurant_id, restaurant_name_ko, restaurant_name_en,
  category, address, phone, description, updated_at
) on public.owner_restaurant_applications to authenticated;

drop policy if exists "owner restaurant applications: read own" on public.owner_restaurant_applications;
create policy "owner restaurant applications: read own"
  on public.owner_restaurant_applications for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "owner restaurant applications: create own draft" on public.owner_restaurant_applications;
create policy "owner restaurant applications: create own draft"
  on public.owner_restaurant_applications for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and status = 'draft'
    and submitted_at is null
    and exists (
      select 1 from public.owner_business_applications b
      where b.id = business_application_id
        and b.user_id = (select auth.uid())
        and b.status = 'draft'
        and b.privacy_notice_acknowledged_at is not null
    )
  );

drop policy if exists "owner restaurant applications: update own draft" on public.owner_restaurant_applications;
create policy "owner restaurant applications: update own draft"
  on public.owner_restaurant_applications for update to authenticated
  using (
    user_id = (select auth.uid())
    and status = 'draft'
    and exists (
      select 1 from public.owner_business_applications b
      where b.id = business_application_id
        and b.user_id = (select auth.uid())
        and b.status = 'draft'
    )
  )
  with check (
    user_id = (select auth.uid())
    and status = 'draft'
    and submitted_at is null
    and exists (
      select 1 from public.owner_business_applications b
      where b.id = business_application_id
        and b.user_id = (select auth.uid())
        and b.status = 'draft'
    )
  );

drop policy if exists "owner restaurant applications: delete own draft" on public.owner_restaurant_applications;
create policy "owner restaurant applications: delete own draft"
  on public.owner_restaurant_applications for delete to authenticated
  using (user_id = (select auth.uid()) and status = 'draft');

-- Submission is the only applicant-accessible status transition. The function
-- checks ownership and completeness, then freezes applicant edits.
create or replace function public.submit_owner_restaurant_application(p_application_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_application public.owner_restaurant_applications%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  select a.*
    into v_application
    from public.owner_restaurant_applications a
    join public.owner_business_applications b
      on b.id = a.business_application_id
   where a.id = p_application_id
     and a.user_id = auth.uid()
     and a.status = 'draft'
     and b.user_id = auth.uid()
     and b.status = 'draft'
     and b.privacy_notice_acknowledged_at is not null
   for update of a, b;

  if not found then
    raise exception 'The application was not found or is no longer editable.';
  end if;

  if v_application.application_type = 'claim' then
    if v_application.existing_restaurant_id is null
       or not exists (
         select 1 from public.restaurants r
         where r.id = v_application.existing_restaurant_id
       ) then
      raise exception 'Choose an existing MUKJI restaurant before submitting.';
    end if;
  elsif v_application.application_type = 'new' then
    if char_length(trim(coalesce(v_application.restaurant_name_ko, ''))) < 2
       or char_length(trim(coalesce(v_application.restaurant_name_en, ''))) < 2
       or char_length(trim(coalesce(v_application.category, ''))) < 2
       or char_length(trim(coalesce(v_application.address, ''))) < 5
       or length(regexp_replace(coalesce(v_application.phone, ''), '[^0-9]', '', 'g')) not between 7 and 15 then
      raise exception 'Complete the required restaurant name, category, address and phone fields.';
    end if;
  else
    raise exception 'Unsupported application type.';
  end if;

  update public.owner_restaurant_applications
     set status = 'submitted',
         submitted_at = now(),
         updated_at = now()
   where id = p_application_id;

  -- Lock the parent business draft too. This prevents the PR3 draft-delete
  -- operation from cascading away a restaurant application after submission.
  update public.owner_business_applications
     set status = 'submitted',
         updated_at = now()
   where id = v_application.business_application_id
     and user_id = auth.uid()
     and status = 'draft';

  return p_application_id;
end;
$$;

revoke all on function public.submit_owner_restaurant_application(uuid) from public, anon;
grant execute on function public.submit_owner_restaurant_application(uuid) to authenticated;

commit;

-- Verification:
-- 1. Applicants can read only their own application rows.
-- 2. Applicants can edit/delete only draft rows.
-- 3. Applicants cannot directly update status, submitted_at or review_message.
-- 4. The submit RPC changes a complete owned draft to submitted.
-- 5. This migration does not create a public restaurant row or grant restaurant ownership.
-- 6. Admin review/status changes and publication remain a separate workflow.
