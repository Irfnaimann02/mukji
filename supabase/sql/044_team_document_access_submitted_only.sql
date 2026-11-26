-- 044_team_document_access_submitted_only.sql
-- #123: the team may read an owner's uploaded document only once it belongs to a
-- submitted (non-draft) business application.
--
-- 043 let team members read the whole private 'owner-business-documents' bucket,
-- including files from drafts an owner never submitted. The app only ever showed
-- submitted documents, but the database rule was wider than that (and wider than
-- ETHICS.md section 8). This replaces that one storage policy. Safe to re-run.

begin;

-- Yes/no for one file: is it a recorded document of a business application that is
-- no longer a draft? Runs with the owner's rights because the team member cannot
-- read other people's application rows themselves; it reveals nothing but yes/no.
create or replace function public.owner_document_is_submitted(p_storage_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.owner_application_documents d
    join public.owner_business_applications b on b.id = d.application_id
    where d.storage_path = p_storage_path
      and b.status <> 'draft'
  );
$$;

revoke all on function public.owner_document_is_submitted(text) from public, anon;
grant execute on function public.owner_document_is_submitted(text) to authenticated;

drop policy if exists "owner business documents: team can read" on storage.objects;
create policy "owner business documents: team can read"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'owner-business-documents'
    and public.is_team_member()
    and public.owner_document_is_submitted(name)
  );

commit;

-- Check: as a team member, a file from a draft business application is not readable;
-- after the owner submits, it is. Applicants keep their own rules from 030/035.
