import {
  closeRestaurantAsOwner,
  fetchMyTeamOwnerAccess,
  fetchOwnerDocumentUrl,
  fetchPendingOwnerApplications,
  openRestaurantAsOwner,
  reviewOwnerApplication,
  TeamOwnerError,
  type PendingOwnerApplication,
  type TeamOwnerAccess,
  type TeamOwnerErrorCode,
} from '@/data/team-owner-repository';
import type { TranslationKey } from '@/i18n/translations';

// #118: the team's owner tools screen. Checks what the team typed before it goes to
// the database (043 checks again), and turns error codes into messages.

export type ReviewProblem = 'reason_required' | 'restaurant_required' | 'message_too_long';

export const MIN_REASON_LENGTH = 5;
export const MAX_MESSAGE_LENGTH = 500;

// What is wrong with this decision, if anything.
// Reject: a reason the owner will read. Approve a new restaurant: a listing to link to.
export function reviewProblem(
  application: Pick<PendingOwnerApplication, 'applicationType'>,
  approve: boolean,
  message: string,
  restaurantId: string | null,
): ReviewProblem | null {
  const text = message.trim();
  if (text.length > MAX_MESSAGE_LENGTH) return 'message_too_long';
  if (!approve) return text.length < MIN_REASON_LENGTH ? 'reason_required' : null;
  if (application.applicationType === 'new' && !restaurantId) return 'restaurant_required';
  return null;
}

// The restaurant a decision would link the owner to (null = not chosen yet).
export function approvalTarget(
  application: Pick<PendingOwnerApplication, 'applicationType' | 'existingRestaurantId'>,
  pickedRestaurantId: string | null,
): string | null {
  return application.applicationType === 'claim' ? application.existingRestaurantId : pickedRestaurantId;
}

// The name to show for an application in the list.
export function applicationTitle(application: PendingOwnerApplication): string {
  if (application.applicationType === 'claim') {
    return application.existingRestaurantNameKo ?? application.existingRestaurantId ?? '';
  }
  return application.restaurantNameKo || application.restaurantNameEn || '';
}

const ERROR_TEXT: Record<TeamOwnerErrorCode | ReviewProblem, TranslationKey> = {
  team_only: 'teamOwnerErrorTeamOnly',
  application_not_pending: 'teamOwnerErrorNotPending',
  reason_required: 'teamOwnerErrorReason',
  restaurant_required: 'teamOwnerErrorRestaurant',
  restaurant_not_found: 'teamOwnerErrorRestaurantNotFound',
  claim_restaurant_mismatch: 'teamOwnerErrorUnknown',
  message_too_long: 'teamOwnerErrorTooLong',
  unknown: 'teamOwnerErrorUnknown',
};

export function teamOwnerErrorKey(error: unknown): TranslationKey {
  if (error instanceof TeamOwnerError) return ERROR_TEXT[error.code];
  if (typeof error === 'string' && error in ERROR_TEXT) return ERROR_TEXT[error as ReviewProblem];
  return 'teamOwnerErrorUnknown';
}

export function loadPendingOwnerApplications(): Promise<PendingOwnerApplication[]> {
  return fetchPendingOwnerApplications();
}

export async function decideOwnerApplication(
  application: PendingOwnerApplication,
  approve: boolean,
  message: string,
  pickedRestaurantId: string | null,
): Promise<void> {
  const target = approvalTarget(application, pickedRestaurantId);
  const problem = reviewProblem(application, approve, message, target);
  if (problem) throw new TeamOwnerError(problem);
  // a claim always goes to the restaurant they picked, so don't send another id
  await reviewOwnerApplication(
    application.id,
    approve,
    message,
    approve && application.applicationType === 'new' ? target : null,
  );
}

export function ownerDocumentUrl(storagePath: string): Promise<string> {
  return fetchOwnerDocumentUrl(storagePath);
}

export function loadMyTeamOwnerAccess(): Promise<TeamOwnerAccess[]> {
  return fetchMyTeamOwnerAccess();
}

export function openAsOwner(restaurantId: string): Promise<void> {
  return openRestaurantAsOwner(restaurantId);
}

export function closeAsOwner(restaurantId: string): Promise<void> {
  return closeRestaurantAsOwner(restaurantId);
}
