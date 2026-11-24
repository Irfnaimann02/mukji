export type OwnerApplicantType = 'business_owner' | 'authorized_representative';
export type OwnerBusinessType = 'individual' | 'corporation';

export type OwnerBusinessDetails = {
  applicantType: OwnerApplicantType | null;
  applicantFullName: string;
  applicantPhone: string;
  applicantEmail: string;
  businessType: OwnerBusinessType;
  businessRegistrationNumber: string;
  registeredBusinessName: string;
  legalRepresentativeName: string;
  businessContactPhone: string;
  registeredAddress: string;
};

export type OwnerBusinessValidationError =
  | 'applicantType'
  | 'applicantFullName'
  | 'applicantPhone'
  | 'applicantEmail'
  | 'businessRegistrationNumber'
  | 'registeredBusinessName'
  | 'legalRepresentativeName'
  | 'businessContactPhone'
  | 'registeredAddress';

export const OWNER_DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const OWNER_DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;

export type OwnerDocumentType =
  | 'business_registration_certificate'
  | 'restaurant_business_notification'
  | 'authorization_letter'
  | 'other';

export function normalizeBusinessRegistrationNumber(value: string): string {
  return value.replace(/\D/g, '');
}

export function validateOwnerBusinessDetails(
  details: OwnerBusinessDetails,
): OwnerBusinessValidationError | null {
  if (!details.applicantType) return 'applicantType';
  if (details.applicantFullName.trim().length < 2 || details.applicantFullName.trim().length > 120) return 'applicantFullName';

  const applicantPhoneDigits = details.applicantPhone.replace(/\D/g, '');
  if (applicantPhoneDigits.length < 7 || applicantPhoneDigits.length > 15 || details.applicantPhone.trim().length > 30) {
    return 'applicantPhone';
  }

  const email = details.applicantEmail.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'applicantEmail';
  }

  if (normalizeBusinessRegistrationNumber(details.businessRegistrationNumber).length !== 10) {
    return 'businessRegistrationNumber';
  }

  if (details.registeredBusinessName.trim().length < 2 || details.registeredBusinessName.trim().length > 160) return 'registeredBusinessName';
  if (details.legalRepresentativeName.trim().length < 2 || details.legalRepresentativeName.trim().length > 120) return 'legalRepresentativeName';

  const businessPhoneDigits = details.businessContactPhone.replace(/\D/g, '');
  if (businessPhoneDigits.length < 7 || businessPhoneDigits.length > 15 || details.businessContactPhone.trim().length > 30) {
    return 'businessContactPhone';
  }

  if (details.registeredAddress.trim().length < 5 || details.registeredAddress.trim().length > 500) return 'registeredAddress';
  return null;
}

export function resolveOwnerDocumentMimeType(
  mimeType: string | null | undefined,
  fileName: string,
): string | null {
  const normalizedMime = (mimeType ?? '').trim().toLowerCase();
  if ((OWNER_DOCUMENT_MIME_TYPES as readonly string[]).includes(normalizedMime)) {
    return normalizedMime;
  }
  if (normalizedMime && normalizedMime !== 'application/octet-stream') return null;

  const extension = fileName.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'pdf': return 'application/pdf';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'png': return 'image/png';
    case 'webp': return 'image/webp';
    default: return null;
  }
}

export function validateOwnerDocument(
  mimeType: string | null | undefined,
  fileName: string,
  fileSize: number | null | undefined,
): 'unsupportedType' | 'tooLarge' | null {
  if (!resolveOwnerDocumentMimeType(mimeType, fileName)) return 'unsupportedType';
  if (typeof fileSize === 'number' &&
      (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize > OWNER_DOCUMENT_MAX_BYTES)) {
    return 'tooLarge';
  }
  return null;
}
