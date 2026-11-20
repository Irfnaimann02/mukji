import type { User } from '@supabase/supabase-js';
import { File, FileMode } from 'expo-file-system';

import { supabase } from '@/data/supabase';
import {
  normalizeBusinessRegistrationNumber,
  OWNER_DOCUMENT_MAX_BYTES,
  resolveOwnerDocumentMimeType,
  type OwnerBusinessDetails,
  type OwnerDocumentType,
} from '@/logic/owner-business-onboarding';

const DOCUMENT_BUCKET = 'owner-business-documents';

export type OwnerBusinessDraft = OwnerBusinessDetails & {
  id: string;
  status: 'draft' | 'submitted' | 'under_review' | 'needs_information' | 'approved' | 'rejected';
  updatedAt: string;
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

export function emptyOwnerBusinessDetails(
  user: Pick<User, 'email' | 'user_metadata'>,
): OwnerBusinessDetails {
  const metadata = user.user_metadata ?? {};
  const applicantType = metadata.owner_applicant_type;
  return {
    applicantType: applicantType === 'business_owner' || applicantType === 'authorized_representative'
      ? applicantType
      : null,
    applicantFullName: String(metadata.owner_applicant_full_name ?? ''),
    applicantPhone: String(metadata.owner_applicant_phone ?? ''),
    applicantEmail: String(user.email ?? metadata.owner_applicant_email ?? ''),
    businessType: 'individual',
    businessRegistrationNumber: '',
    registeredBusinessName: '',
    legalRepresentativeName: String(metadata.owner_applicant_full_name ?? ''),
    businessContactPhone: '',
    registeredAddress: '',
  };
}

export async function loadOwnerBusinessDraft(): Promise<{
  draft: OwnerBusinessDraft | null;
  initialDetails: OwnerBusinessDetails;
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
  return {
    draft,
    initialDetails: draft ?? emptyOwnerBusinessDetails(user),
  };
}

export async function saveOwnerBusinessDraft(
  details: OwnerBusinessDetails,
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
    business_registration_number: normalizeBusinessRegistrationNumber(details.businessRegistrationNumber),
    registered_business_name: details.registeredBusinessName.trim(),
    legal_representative_name: details.legalRepresentativeName.trim(),
    business_contact_phone: details.businessContactPhone.trim(),
    registered_address: details.registeredAddress.trim(),
  };

  if (existingId) {
    const { data, error } = await sb
      .from('owner_business_applications')
      .update({ ...detailsPayload, updated_at: new Date().toISOString() })
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
    .insert({ user_id: user.id, ...detailsPayload })
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
  uri: string;
  filename: string;
  mimeType: string | null | undefined;
  fileSize: number | null | undefined;
}): Promise<OwnerBusinessDocument> {
  const sb = client();
  const user = await requireOwnerUser();
  const mimeType = resolveOwnerDocumentMimeType(input.mimeType, input.filename);
  if (!mimeType) throw new Error('Unsupported document type.');
  if (typeof input.fileSize === 'number' &&
      (input.fileSize <= 0 || input.fileSize > OWNER_DOCUMENT_MAX_BYTES)) {
    throw new Error('Document must be smaller than 10 MB.');
  }

  const localFile = new File(input.uri);
  const fileHandle = localFile.open(FileMode.ReadOnly);
  let body: ArrayBuffer;
  try {
    const size = fileHandle.size;
    if (size === null || size <= 0 || size > OWNER_DOCUMENT_MAX_BYTES) {
      throw new Error('Document must be larger than 0 bytes and no bigger than 10 MB.');
    }
    const bytes = await fileHandle.readBytes(size);
    if (bytes.byteLength !== size) {
      throw new Error('Could not read the complete selected document.');
    }
    body = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  } finally {
    fileHandle.close();
  }
  if (body.byteLength <= 0 || body.byteLength > OWNER_DOCUMENT_MAX_BYTES) {
    throw new Error('Document must be larger than 0 bytes and no bigger than 10 MB.');
  }

  const objectName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${safeFilename(input.filename)}`;
  const storagePath = `${user.id}/${input.applicationId}/${objectName}`;

  const { error: uploadError } = await sb.storage
    .from(DOCUMENT_BUCKET)
    .upload(storagePath, body, { contentType: mimeType, upsert: false });

  if (uploadError) throw uploadError;

  const { data, error } = await sb
    .from('owner_application_documents')
    .insert({
      application_id: input.applicationId,
      user_id: user.id,
      document_type: input.documentType,
      original_filename: input.filename.slice(0, 180),
      mime_type: mimeType,
      file_size_bytes: body.byteLength,
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
  await requireOwnerUser();
  const { data, error } = await sb.storage
    .from(DOCUMENT_BUCKET)
    .createSignedUrl(storagePath, 60);
  if (error) throw error;
  return data.signedUrl;
}

export async function removeOwnerBusinessDocument(document: OwnerBusinessDocument): Promise<void> {
  const sb = client();
  const user = await requireOwnerUser();
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
