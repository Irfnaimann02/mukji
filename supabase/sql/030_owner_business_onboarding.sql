-- 030_owner_business_onboarding.sql
-- PR3: secure, private business-onboarding drafts and supporting documents.
-- No restaurant ownership link is created. No application is submitted or approved.
-- Safe to re-run.

begin;

-- ---------- 1. Business onboarding draft ----------
create table if not exists public.owner_business_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  applicant_type text not null
    check (applicant_type in ('business_owner', 'authorized_representative')),
  applicant_full_name text not null check (char_length(trim(applicant_full_name)) between 2 and 120),
  applicant_phone text not null check (char_length(trim(applicant_phone)) between 7 and 30),
  applicant_email text not null check (char_length(trim(applicant_email)) between 3 and 254),
  business_type text not null check (business_type in ('individual', 'corporation')),
  business_registration_number text not null
    check (business_registration_number ~ '^[0-9]{10}$'),
  registered_business_name text not null
    check (char_length(trim(registered_business_name)) between 2 and 160),
  legal_representative_name text not null
    check (char_length(trim(legal_representative_name)) between 2 and 120),
  business_contact_phone text not null
    check (char_length(trim(business_contact_phone)) between 7 and 30),
  registered_address text not null
    check (char_length(trim(registered_address)) between 5 and 500),
  status text not null default 'draft'
    check (status in ('draft', 'submitted', 'under_review', 'needs_information', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists owner_business_applications_user_status_updated_idx
  on public.owner_business_applications (user_id, status, updated_at desc);

alter table public.owner_business_applications enable row level security;
revoke all on public.owner_business_applications from public, anon, authenticated;
grant select on public.owner_business_applications to authenticated;
grant insert (
  user_id, applicant_type, applicant_full_name, applicant_phone, applicant_email,
  business_type, business_registration_number, registered_business_name,
  legal_representative_name, business_contact_phone, registered_address
) on public.owner_business_applications to authenticated;
grant update (
  applicant_type, applicant_full_name, applicant_phone, applicant_email,
  business_type, business_registration_number, registered_business_name,
  legal_representative_name, business_contact_phone, registered_address, updated_at
) on public.owner_business_applications to authenticated;

drop policy if exists "owner business applications: read own" on public.owner_business_applications;
create policy "owner business applications: read own"
  on public.owner_business_applications for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "owner business applications: create own draft" on public.owner_business_applications;
create policy "owner business applications: create own draft"
  on public.owner_business_applications for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'draft');

drop policy if exists "owner business applications: update own draft" on public.owner_business_applications;
create policy "owner business applications: update own draft"
  on public.owner_business_applications for update to authenticated
  using (user_id = (select auth.uid()) and status = 'draft')
  with check (user_id = (select auth.uid()) and status = 'draft');

-- ---------- 2. Document metadata ----------
create table if not exists public.owner_application_documents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null
    references public.owner_business_applications (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  document_type text not null
    check (document_type in (
      'business_registration_certificate',
      'restaurant_business_notification',
      'authorization_letter',
      'other'
    )),
  original_filename text not null check (char_length(original_filename) between 1 and 180),
  mime_type text not null
    check (mime_type in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')),
  file_size_bytes bigint not null check (file_size_bytes between 1 and 10485760),
  storage_path text not null unique,
  created_at timestamptz not null default now(),
  check (
    split_part(storage_path, '/', 1) = user_id::text
    and split_part(storage_path, '/', 2) = application_id::text
  )
);

create index if not exists owner_application_documents_application_idx
  on public.owner_application_documents (application_id, created_at);

alter table public.owner_application_documents enable row level security;
revoke all on public.owner_application_documents from public, anon, authenticated;
grant select, insert, delete on public.owner_application_documents to authenticated;

drop policy if exists "owner application documents: read own" on public.owner_application_documents;
create policy "owner application documents: read own"
  on public.owner_application_documents for select to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.owner_business_applications a
      where a.id = application_id and a.user_id = (select auth.uid())
    )
  );

drop policy if exists "owner application documents: add to own draft" on public.owner_application_documents;
create policy "owner application documents: add to own draft"
  on public.owner_application_documents for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.owner_business_applications a
      where a.id = application_id
        and a.user_id = (select auth.uid())
        and a.status = 'draft'
    )
  );

drop policy if exists "owner application documents: remove own draft files" on public.owner_application_documents;
create policy "owner application documents: remove own draft files"
  on public.owner_application_documents for delete to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.owner_business_applications a
      where a.id = application_id
        and a.user_id = (select auth.uid())
        and a.status = 'draft'
    )
  );

-- ---------- 3. Private Storage bucket ----------
insert into storage.buckets (
  id, name, public, file_size_limit, allowed_mime_types
)
values (
  'owner-business-documents',
  'owner-business-documents',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Count existing private uploads before allowing another upload. This function
-- avoids a policy recursively reading storage.objects directly.
create or replace function public.my_owner_business_document_uploads_today()
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::int
  from storage.objects
  where bucket_id = 'owner-business-documents'
    and name like auth.uid()::text || '/%'
    and created_at > now() - interval '1 day';
$$;
revoke execute on function public.my_owner_business_document_uploads_today() from public, anon;
grant execute on function public.my_owner_business_document_uploads_today() to authenticated;

drop policy if exists "owner business documents: read own folder" on storage.objects;
create policy "owner business documents: read own folder"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'owner-business-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1 from public.owner_business_applications a
      where a.id::text = (storage.foldername(name))[2]
        and a.user_id = (select auth.uid())
    )
  );

drop policy if exists "owner business documents: upload to own draft" on storage.objects;
create policy "owner business documents: upload to own draft"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'owner-business-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1 from public.owner_business_applications a
      where a.id::text = (storage.foldername(name))[2]
        and a.user_id = (select auth.uid())
        and a.status = 'draft'
    )
    and public.my_owner_business_document_uploads_today() < 20
  );

drop policy if exists "owner business documents: delete own draft files" on storage.objects;
create policy "owner business documents: delete own draft files"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'owner-business-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1 from public.owner_business_applications a
      where a.id::text = (storage.foldername(name))[2]
        and a.user_id = (select auth.uid())
        and a.status = 'draft'
    )
  );

commit;

-- Verification:
-- 1. owner_business_applications and owner_application_documents should exist with RLS enabled.
-- 2. owner-business-documents should be a private bucket (public = false).
-- 3. Do not add any rows to public.owners from this migration.
-- 4. Document review access for MUKJI staff is intentionally not granted in PR3.
