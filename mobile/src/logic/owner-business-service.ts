import type { User } from '@supabase/supabase-js';
import { File, FileMode } from 'expo-file-system';
import { Platform } from 'react-native';

import {
  deleteOwnerBusinessDraft as deleteDraftRecord,
  createOwnerBusinessDocumentUrl as createDocumentUrl,
  listOwnerBusinessDocuments as listDocuments,
  loadOwnerBusinessDraft as loadDraftRecord,
  loadLatestOwnerBusinessApplication as loadLatestApplicationRecord,
  removeOwnerBusinessDocument as removeDocumentRecord,
  saveOwnerBusinessDraft as saveDraftRecord,
  uploadOwnerBusinessDocument as uploadDocumentRecord,
  type OwnerBusinessDocument,
  type OwnerBusinessDraft,
  type OwnerBusinessDraftInput,
  type OwnerDocumentType,
  OWNER_BUSINESS_PRIVACY_NOTICE_VERSION,
} from '@/data/owner-business-repository';
import { readWebOwnerBusinessFile } from '@/logic/owner-business-file';
import {
  normalizeBusinessRegistrationNumber,
  OWNER_DOCUMENT_MAX_BYTES,
  resolveOwnerDocumentMimeType,
  type OwnerBusinessDetails,
} from '@/logic/owner-business-onboarding';

export type { OwnerBusinessDocument, OwnerBusinessDraft };
export { OWNER_BUSINESS_PRIVACY_NOTICE_VERSION };

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
  const result = await loadDraftRecord();
  return {
    draft: result.draft,
    initialDetails: result.draft ?? emptyOwnerBusinessDetails(result.user),
  };
}

export async function loadLatestOwnerBusinessApplication(): Promise<{
  application: OwnerBusinessDraft | null;
  initialDetails: OwnerBusinessDetails;
}> {
  const result = await loadLatestApplicationRecord();
  return {
    application: result.application,
    initialDetails: result.application ?? emptyOwnerBusinessDetails(result.user),
  };
}

export async function saveOwnerBusinessDraft(
  details: OwnerBusinessDetails,
  existingId: string | null,
): Promise<OwnerBusinessDraft> {
  const payload: OwnerBusinessDraftInput = {
    ...details,
    applicantFullName: details.applicantFullName.trim(),
    applicantPhone: details.applicantPhone.trim(),
    applicantEmail: details.applicantEmail.trim().toLowerCase(),
    businessRegistrationNumber: normalizeBusinessRegistrationNumber(details.businessRegistrationNumber),
    registeredBusinessName: details.registeredBusinessName.trim(),
    legalRepresentativeName: details.legalRepresentativeName.trim(),
    businessContactPhone: details.businessContactPhone.trim(),
    registeredAddress: details.registeredAddress.trim(),
  };
  return saveDraftRecord(payload, existingId);
}

export const listOwnerBusinessDocuments = listDocuments;
export const createOwnerBusinessDocumentUrl = createDocumentUrl;
export const removeOwnerBusinessDocument = removeDocumentRecord;
export const deleteOwnerBusinessDraft = deleteDraftRecord;

export async function uploadOwnerBusinessDocument(input: {
  applicationId: string;
  documentType: OwnerDocumentType;
  uri: string;
  filename: string;
  mimeType: string | null | undefined;
  fileSize: number | null | undefined;
}): Promise<OwnerBusinessDocument> {
  const mimeType = resolveOwnerDocumentMimeType(input.mimeType, input.filename);
  if (!mimeType) throw new Error('Unsupported document type.');
  if (typeof input.fileSize === 'number' &&
      (!Number.isFinite(input.fileSize) || input.fileSize <= 0 || input.fileSize > OWNER_DOCUMENT_MAX_BYTES)) {
    throw new Error('Document must be larger than 0 bytes and no bigger than 10 MB.');
  }

  const body = await readOwnerBusinessFile(input.uri);
  if (body.byteLength <= 0 || body.byteLength > OWNER_DOCUMENT_MAX_BYTES) {
    throw new Error('Document must be larger than 0 bytes and no bigger than 10 MB.');
  }

  return uploadDocumentRecord({
    applicationId: input.applicationId,
    documentType: input.documentType,
    body,
    filename: input.filename,
    mimeType,
  });
}

/** Web picker URIs are blob/http URLs; native picker URIs are local file URIs. */
export async function readOwnerBusinessFile(uri: string): Promise<ArrayBuffer> {
  if (Platform.OS === 'web') return readWebOwnerBusinessFile(uri);

  const localFile = new File(uri);
  const fileHandle = localFile.open(FileMode.ReadOnly);
  try {
    const size = fileHandle.size;
    if (size === null || size <= 0 || size > OWNER_DOCUMENT_MAX_BYTES) {
      throw new Error('Document must be larger than 0 bytes and no bigger than 10 MB.');
    }
    const bytes = await fileHandle.readBytes(size);
    if (bytes.byteLength !== size) throw new Error('Could not read the complete selected document.');
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  } finally {
    fileHandle.close();
  }
}
