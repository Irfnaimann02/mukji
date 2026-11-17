export type OwnerApplicantType = 'business_owner' | 'authorized_representative';

export type OwnerRegistrationDetails = {
  applicantType: OwnerApplicantType | null;
  fullName: string;
  phone: string;
  email: string;
  acknowledgedNotice: boolean;
};

export type OwnerRegistrationValidationError =
  | 'applicantType'
  | 'fullName'
  | 'phone'
  | 'invalidPhone'
  | 'email'
  | 'notice';

export function normalizeOwnerPhone(phone: string): string {
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, '');
  return `${trimmed.startsWith('+') ? '+' : ''}${digits}`;
}

export function validateOwnerRegistration(
  details: OwnerRegistrationDetails,
): OwnerRegistrationValidationError | null {
  if (!details.applicantType) return 'applicantType';
  if (details.fullName.trim().length < 2) return 'fullName';
  if (!details.phone.trim()) return 'phone';

  const phoneDigits = details.phone.replace(/\D/g, '');
  if (phoneDigits.length < 7 || phoneDigits.length > 15) return 'invalidPhone';

  const email = details.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'email';
  if (!details.acknowledgedNotice) return 'notice';

  return null;
}
