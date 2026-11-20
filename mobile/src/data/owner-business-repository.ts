import { isOwnerBusinessStoragePath } from './owner-business-path';
import { supabase } from './supabase';
export type OwnerDocumentType =
  | 'business_registration_certificate'
  | 'restaurant_business_notification'
  | 'authorization_letter'
  | 'other';

const DOCUMENT_BUCKET = 'owner-business-documents';

export type OwnerBusinessDraft = OwnerBusinessDraftInput & {
  id: string;
  status: 'draft' | 'submitted' | 'under_review' | 'needs_information' | 'approved' | 'rejected';
  updatedAt: string;
  privacyNoticeAcknowledgedAt: string | null;
};

export type OwnerBusinessDocument = {
  id: string;
  applicationId: string;
  documentType: OwnerDocumentType;
  originalFilename: string;
  mimeType: string;
  fileSizeBytes: number;
  storagePath: string;
  createdAt: string;
};

export type OwnerBusinessDraftInput = {
  applicantType: 'business_owner' | 'authorized_representative' | null;
  applicantFullName: string;
  applicantPhone: string;
  applicantEmail: string;
  businessType: 'individual' | 'corporation';
  businessRegistrationNumber: string;
  registeredBusinessName: string;
  legalRepresentativeName: string;
  businessContactPhone: string;
  registeredAddress: string;
};

function client() {
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase;
}

async function requireOwnerUser() {
  const sb = client();
  const { data, error } = await sb.auth.getUser();
  if (error) throw error;
  if (!data.user || data.user.is_anonymous || !data.user.email_confirmed_at) {
    throw new Error('A verified partner account is required.');
  }
  return data.user;
}

function fromRow(row: Record<string, unknown>): OwnerBusinessDraft {
  return {
    id: String(row.id),
    applicantType: row.applicant_type === 'business_owner' || row.applicant_type === 'authorized_representative'
      ? row.applicant_type
      : null,
    applicantFullName: String(row.applicant_full_name ?? ''),
    applicantPhone: String(row.applicant_phone ?? ''),
    applicantEmail: String(row.applicant_email ?? ''),
    businessType: row.business_type === 'corporation' ? 'corporation' : 'individual',
    businessRegistrationNumber: String(row.business_registration_number ?? ''),
    registeredBusinessName: String(row.registered_business_name ?? ''),
    legalRepresentativeName: String(row.legal_representative_name ?? ''),
    businessContactPhone: String(row.business_contact_phone ?? ''),
    registeredAddress: String(row.registered_address ?? ''),
    status: row.status as OwnerBusinessDraft['status'],
    updatedAt: String(row.updated_at ?? ''),
    privacyNoticeAcknowledgedAt: typeof row.privacy_notice_acknowledged_at === 'string'
      ? row.privacy_notice_acknowledged_at
      : null,
  };
}

function toDocument(row: Record<string, unknown>): OwnerBusinessDocument {
  return {
    id: String(row.id),
    applicationId: String(row.application_id),
    documentType: row.document_type as OwnerDocumentType,
    originalFilename: String(row.original_filename ?? ''),
    mimeType: String(row.mime_type ?? ''),
    fileSizeBytes: Number(row.file_size_bytes ?? 0),
    storagePath: String(row.storage_path ?? ''),
    createdAt: String(row.created_at ?? ''),
  };
}

export async function loadOwnerBusinessDraft(): Promise<{
  draft: OwnerBusinessDraft | null;
  user: Awaited<ReturnType<typeof requireOwnerUser>>;
}> {
  const sb = client();
  const user = await requireOwnerUser();
  const { data, error } = await sb
    .from('owner_business_applications')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'draft')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  const draft = data ? fromRow(data as unknown as Record<string, unknown>) : null;
  return { draft, user };
}

export async function saveOwnerBusinessDraft(
  details: OwnerBusinessDraftInput,
  existingId: string | null,
): Promise<OwnerBusinessDraft> {
  const sb = client();
  const user = await requireOwnerUser();
  const detailsPayload = {
    applicant_type: details.applicantType,
    applicant_full_name: details.applicantFullName.trim(),
    applicant_phone: details.applicantPhone.trim(),
    applicant_email: details.applicantEmail.trim().toLowerCase(),
    business_type: details.businessType,
    business_registration_number: details.businessRegistrationNumber,
    registered_business_name: details.registeredBusinessName.trim(),
    legal_representative_name: details.legalRepresentativeName.trim(),
    business_contact_phone: details.businessContactPhone.trim(),
    registered_address: details.registeredAddress.trim(),
  };

  if (existingId) {
    const { data, error } = await sb
      .from('owner_business_applications')
      .update({
        ...detailsPayload,
        privacy_notice_acknowledged_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingId)
      .eq('user_id', user.id)
      .eq('status', 'draft')
      .select('*')
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('The draft was not found or is no longer editable.');
    return fromRow(data as unknown as Record<string, unknown>);
  }

  const { data, error } = await sb
    .from('owner_business_applications')
    .insert({
      user_id: user.id,
      ...detailsPayload,
      privacy_notice_acknowledged_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (error) throw error;
  return fromRow(data as unknown as Record<string, unknown>);
}

export async function listOwnerBusinessDocuments(
  applicationId: string,
): Promise<OwnerBusinessDocument[]> {
  const sb = client();
  const user = await requireOwnerUser();
  const { data, error } = await sb
    .from('owner_application_documents')
    .select('*')
    .eq('application_id', applicationId)
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row) => toDocument(row as unknown as Record<string, unknown>));
}

function safeFilename(value: string): string {
  const cleaned = value
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^\.+/, '')
    .slice(-80);
  return cleaned || 'business-document';
}

export async function uploadOwnerBusinessDocument(input: {
  applicationId: string;
  documentType: OwnerDocumentType;
  body: ArrayBuffer;
  filename: string;
  mimeType: string;
}): Promise<OwnerBusinessDocument> {
  const sb = client();
  const user = await requireOwnerUser();
  const mimeType = input.mimeType;
  if (!['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
    throw new Error('Unsupported document type.');
  }
  if (input.body.byteLength <= 0 || input.body.byteLength > 10 * 1024 * 1024) {
    throw new Error('Document must be larger than 0 bytes and no bigger than 10 MB.');
  }

  const objectName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${safeFilename(input.filename)}`;
  const storagePath = `${user.id}/${input.applicationId}/${objectName}`;

  const { error: uploadError } = await sb.storage
    .from(DOCUMENT_BUCKET)
    .upload(storagePath, input.body, { contentType: mimeType, upsert: false });

  if (uploadError) throw uploadError;

  const { data, error } = await sb
    .from('owner_application_documents')
    .insert({
      application_id: input.applicationId,
      user_id: user.id,
      document_type: input.documentType,
      original_filename: input.filename.slice(0, 180),
      mime_type: mimeType,
      file_size_bytes: input.body.byteLength,
      storage_path: storagePath,
    })
    .select('*')
    .single();

  if (error) {
    const { error: cleanupError } = await sb.storage.from(DOCUMENT_BUCKET).remove([storagePath]);
    if (cleanupError) {
      console.warn('[Mukji] Could not clean up an unreferenced owner document:', cleanupError.message);
    }
    throw error;
  }

  return toDocument(data as unknown as Record<string, unknown>);
}

export async function createOwnerBusinessDocumentUrl(storagePath: string): Promise<string> {
  const sb = client();
  const user = await requireOwnerUser();
  const applicationId = storagePath.split('/')[1] ?? '';
  if (!isOwnerBusinessStoragePath(storagePath, user.id, applicationId)) {
    throw new Error('The document path is not valid for this account.');
  }
  const { data, error } = await sb.storage
    .from(DOCUMENT_BUCKET)
    .createSignedUrl(storagePath, 60);
  if (error) throw error;
  return data.signedUrl;
}

export async function removeOwnerBusinessDocument(document: OwnerBusinessDocument): Promise<void> {
  const sb = client();
  const user = await requireOwnerUser();
  if (document.applicationId.length === 0 ||
      !isOwnerBusinessStoragePath(document.storagePath, user.id, document.applicationId)) {
    throw new Error('The document path is not valid for this account.');
  }
  const { error: storageError } = await sb.storage
    .from(DOCUMENT_BUCKET)
    .remove([document.storagePath]);
  if (storageError) throw storageError;

  const { error } = await sb
    .from('owner_application_documents')
    .delete()
    .eq('id', document.id)
    .eq('user_id', user.id)
    .eq('application_id', document.applicationId);

  if (error) throw error;
}


/**
 * Delete a user's own draft and every object in its private storage folder.
 * Storage is removed first; if the database delete then fails, a retry can
 * safely finish deleting the still-existing draft row.
 */
export async function deleteOwnerBusinessDraft(applicationId: string): Promise<void> {
  const sb = client();
  const user = await requireOwnerUser();
  const folder = `${user.id}/${applicationId}`;
  const prefix = `${folder}/`;

  const { data: application, error: applicationError } = await sb
    .from('owner_business_applications')
    .select('id')
    .eq('id', applicationId)
    .eq('user_id', user.id)
    .eq('status', 'draft')
    .maybeSingle();

  if (applicationError) throw applicationError;
  if (!application) throw new Error('The draft was not found or is no longer deletable.');

  const { data: documents, error: documentsError } = await sb
    .from('owner_application_documents')
    .select('storage_path')
    .eq('application_id', applicationId)
    .eq('user_id', user.id);

  if (documentsError) throw documentsError;

  const paths = new Set<string>();
  for (const row of documents ?? []) {
    const path = String(row.storage_path ?? '');
    if (!isOwnerBusinessStoragePath(path, user.id, applicationId)) {
      throw new Error('A document path did not match this draft. No files were deleted.');
    }
    paths.add(path);
  }

  // Include orphaned objects that may remain if a previous metadata insert failed.
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const { data: objects, error: listError } = await sb.storage
      .from(DOCUMENT_BUCKET)
      .list(folder, { limit: pageSize, offset });
    if (listError) throw listError;
    for (const object of objects ?? []) {
      if (!object.id || !object.name) continue; // Skip folder placeholders.
      const path = `${prefix}${object.name}`;
      if (!isOwnerBusinessStoragePath(path, user.id, applicationId)) {
        throw new Error('A storage object path did not match this draft. No files were deleted.');
      }
      paths.add(path);
    }
    if (!objects || objects.length < pageSize) break;
  }

  const objectPaths = [...paths];
  if (objectPaths.length > 0) {
    const { error: removeError } = await sb.storage.from(DOCUMENT_BUCKET).remove(objectPaths);
    if (removeError) throw removeError;
  }

  const { data: deleted, error: deleteError } = await sb
    .from('owner_business_applications')
    .delete()
    .eq('id', applicationId)
    .eq('user_id', user.id)
    .eq('status', 'draft')
    .select('id')
    .maybeSingle();

  if (deleteError) throw deleteError;
  if (!deleted) throw new Error('The draft could not be deleted. Please try again.');
}
