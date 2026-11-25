import { supabase } from './supabase';

// #118: the team's owner tools (SQL 043). The only file that talks to Supabase about
// reviewing owner applications and opening restaurants as owner. Every function is
// team-only in the database; anyone else gets 'team_only' back.

export interface OwnerApplicationDocument {
  id: string;
  documentType: string; // 'business_registration_certificate', ...
  originalFilename: string;
  mimeType: string;
  storagePath: string;
}

export interface PendingOwnerApplication {
  id: string;
  status: string;
  applicationType: 'claim' | 'new';
  submittedAt: string | null;
  // claim: the restaurant they picked
  existingRestaurantId: string | null;
  existingRestaurantNameKo: string | null;
  existingRestaurantAddress: string | null;
  // new: what they typed
  restaurantNameKo: string | null;
  restaurantNameEn: string | null;
  category: string | null;
  address: string | null;
  phone: string | null;
  description: string | null;
  business: {
    applicantType: string;
    applicantFullName: string;
    applicantPhone: string;
    applicantEmail: string;
    businessType: string;
    businessRegistrationNumber: string;
    registeredBusinessName: string;
    legalRepresentativeName: string;
    businessContactPhone: string;
    registeredAddress: string;
  };
  documents: OwnerApplicationDocument[];
}

export interface TeamOwnerAccess {
  restaurantId: string;
  nameKo: string;
  nameEn: string;
  address: string;
  openedAt: string;
}

export type TeamOwnerErrorCode =
  | 'team_only'
  | 'application_not_pending'
  | 'reason_required'
  | 'restaurant_required'
  | 'restaurant_not_found'
  | 'claim_restaurant_mismatch'
  | 'message_too_long'
  | 'unknown';

const KNOWN: TeamOwnerErrorCode[] = [
  'team_only',
  'application_not_pending',
  'reason_required',
  'restaurant_required',
  'restaurant_not_found',
  'claim_restaurant_mismatch',
  'message_too_long',
];

export class TeamOwnerError extends Error {
  code: TeamOwnerErrorCode;

  constructor(code: TeamOwnerErrorCode, message?: string) {
    super(message ?? code);
    this.code = code;
  }
}

export function toTeamOwnerError(error: { message?: string } | null): TeamOwnerError {
  const message = error?.message ?? '';
  return new TeamOwnerError(KNOWN.find((code) => message.includes(code)) ?? 'unknown', message);
}

function client() {
  if (!supabase) throw new TeamOwnerError('unknown', 'Supabase is not set up (mobile/.env is missing).');
  return supabase;
}

const DOCUMENT_BUCKET = 'owner-business-documents';

export async function fetchPendingOwnerApplications(): Promise<PendingOwnerApplication[]> {
  const { data, error } = await client().rpc('team_pending_owner_applications');
  if (error) throw toTeamOwnerError(error);
  return Array.isArray(data) ? (data as PendingOwnerApplication[]) : [];
}

export async function reviewOwnerApplication(
  applicationId: string,
  approve: boolean,
  message: string,
  restaurantId: string | null,
): Promise<void> {
  const { error } = await client().rpc('team_review_owner_application', {
    p_application_id: applicationId,
    p_approve: approve,
    p_message: message.trim() || null,
    p_restaurant_id: restaurantId,
  });
  if (error) throw toTeamOwnerError(error);
}

// A link to an uploaded document that works for 10 minutes; the bucket stays private.
export async function fetchOwnerDocumentUrl(storagePath: string): Promise<string> {
  const { data, error } = await client().storage.from(DOCUMENT_BUCKET).createSignedUrl(storagePath, 600);
  if (error) throw toTeamOwnerError(error);
  return data.signedUrl;
}

export async function openRestaurantAsOwner(restaurantId: string): Promise<void> {
  const { error } = await client().rpc('team_open_as_owner', { p_restaurant_id: restaurantId });
  if (error) throw toTeamOwnerError(error);
}

export async function closeRestaurantAsOwner(restaurantId: string): Promise<void> {
  const { error } = await client().rpc('team_close_owner', { p_restaurant_id: restaurantId });
  if (error) throw toTeamOwnerError(error);
}

export async function fetchMyTeamOwnerAccess(): Promise<TeamOwnerAccess[]> {
  const { data, error } = await client().rpc('team_my_owner_access');
  if (error) throw toTeamOwnerError(error);
  return (data ?? []).map((row: any) => ({
    restaurantId: row.restaurant_id,
    nameKo: row.name_ko ?? '',
    nameEn: row.name_en ?? '',
    address: row.address ?? '',
    openedAt: row.opened_at,
  }));
}
