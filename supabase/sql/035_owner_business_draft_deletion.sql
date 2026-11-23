-- 035_owner_business_draft_deletion.sql
-- PR #97 review fix: allow applicants to delete only their own unsubmitted drafts.
-- Migration 030 is already applied; 031 is reserved by the cleanup PR.

begin;

alter table public.owner_business_applications
  add column if not exists privacy_notice_acknowledged_at timestamptz;

grant insert (privacy_notice_acknowledged_at)
  on public.owner_business_applications to authenticated;
grant update (privacy_notice_acknowledged_at)
  on public.owner_business_applications to authenticated;

grant delete on public.owner_business_applications to authenticated;

-- Require a recorded acknowledgement before creating or editing a draft.
drop policy if exists "owner business applications: create own draft"
  on public.owner_business_applications;
create policy "owner business applications: create own draft"
  on public.owner_business_applications
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and status = 'draft'
    and privacy_notice_acknowledged_at is not null
  );

drop policy if exists "owner business applications: update own draft"
  on public.owner_business_applications;
create policy "owner business applications: update own draft"
  on public.owner_business_applications
  for update
  to authenticated
  using (
    user_id = (select auth.uid())
    and status = 'draft'
  )
  with check (
    user_id = (select auth.uid())
    and status = 'draft'
    and privacy_notice_acknowledged_at is not null
  );

-- Require the same acknowledgement for both document metadata and Storage uploads.
drop policy if exists "owner application documents: add to own draft"
  on public.owner_application_documents;
create policy "owner application documents: add to own draft"
  on public.owner_application_documents
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.owner_business_applications a
      where a.id = application_id
        and a.user_id = (select auth.uid())
        and a.status = 'draft'
        and a.privacy_notice_acknowledged_at is not null
    )
  );

drop policy if exists "owner business documents: upload to own draft"
  on storage.objects;
create policy "owner business documents: upload to own draft"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'owner-business-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1 from public.owner_business_applications a
      where a.id::text = (storage.foldername(name))[2]
        and a.user_id = (select auth.uid())
        and a.status = 'draft'
        and a.privacy_notice_acknowledged_at is not null
    )
    and public.my_owner_business_document_uploads_today() < 20
  );

drop policy if exists "owner business applications: delete own draft"
  on public.owner_business_applications;

create policy "owner business applications: delete own draft"
  on public.owner_business_applications
  for delete
  to authenticated
  using (
    user_id = (select auth.uid())
    and status = 'draft'
  );

commit;

-- The application_documents.application_id foreign key created in 030 uses
-- ON DELETE CASCADE, so deleting the draft also removes its metadata rows.
-- The client removes private Storage objects first; this policy only permits
-- deletion while the parent application still exists and remains a draft.
-- No submitted, under-review, approved or rejected application can be deleted.
