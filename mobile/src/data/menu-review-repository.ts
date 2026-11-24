import { supabase } from './supabase';

// The team's menu review screen (029). The only file that talks to Supabase
// about reviewing menu photos. Every function is team-only in the database;
// a non-team user gets 'team_only' back and the screen never shows.

export interface PendingMenuPhoto {
  id: string;
  restaurantId: string | null; // null for a Kakao place
  restaurantNameKo: string | null;
  restaurantNameEn: string | null;
  kakaoPlaceId: string | null;
  photoPath: string;
  note: string;
  draft: unknown; // checked by logic/menu-review.ts
  createdAt: string;
}


export interface PendingOwnerIngredientChange {
  id: string;
  restaurantId: string;
  restaurantNameKo: string;
  restaurantNameEn: string;
  dishId: string;
  dishNameKo: string;
  currentContains: string[];
  currentMayContain: string[];
  proposedContains: string[];
  proposedMayContain: string[];
  note: string;
  createdAt: string;
}

export type ReviewErrorCode =
  | 'team_only'
  | 'not_pending'
  | 'restaurant_not_added'
  | 'bad_draft'
  | 'draft_problems'
  | 'unknown';

export class MenuReviewError extends Error {
  code: ReviewErrorCode;
  problems: string[]; // for 'draft_problems': what approve_menu_submission found

  constructor(code: ReviewErrorCode, message?: string, problems: string[] = []) {
    super(message ?? code);
    this.code = code;
    this.problems = problems;
  }
}

function toError(error: { message?: string } | null): MenuReviewError {
  const message = error?.message ?? '';
  // 016 lists every problem in one message: "not approved, fix the draft first: a; b"
  const marker = 'fix the draft first:';
  if (message.includes(marker)) {
    const problems = message.slice(message.indexOf(marker) + marker.length).split(';').map((p) => p.trim()).filter(Boolean);
    return new MenuReviewError('draft_problems', message, problems);
  }
  const known: ReviewErrorCode[] = ['team_only', 'not_pending', 'restaurant_not_added', 'bad_draft'];
  return new MenuReviewError(known.find((code) => message.includes(code)) ?? 'unknown', message);
}

function client() {
  if (!supabase) throw new MenuReviewError('unknown', 'Supabase is not set up (mobile/.env is missing).');
  return supabase;
}

// False for everyone who isn't on the team, guests included, and when offline.
export async function fetchIsTeamMember(): Promise<boolean> {
  if (!supabase) return false;
  const { data, error } = await supabase.rpc('is_team_member');
  if (error) return false;
  return data === true;
}

export async function fetchPendingMenuPhotos(): Promise<PendingMenuPhoto[]> {
  const { data, error } = await client().rpc('team_pending_menu_photos');
  if (error) throw toError(error);
  return (data ?? []).map((row: any) => ({
    id: row.id,
    restaurantId: row.restaurant_id ?? null,
    restaurantNameKo: row.restaurant_name_ko ?? null,
    restaurantNameEn: row.restaurant_name_en ?? null,
    kakaoPlaceId: row.kakao_place_id ?? null,
    photoPath: row.photo_path,
    note: row.note ?? '',
    draft: row.draft,
    createdAt: row.created_at,
  }));
}

// A link that works for 10 minutes; the bucket itself stays private.
export async function fetchMenuPhotoUrl(photoPath: string): Promise<string | null> {
  const { data, error } = await client().storage.from('menu-photos').createSignedUrl(photoPath, 600);
  if (error) {
    console.warn('Could not open menu photo:', error);
    return null;
  }
  return data?.signedUrl ?? null;
}

// The photo as a data URL ("data:image/jpeg;base64,..."), for the AI scanner.
export async function fetchMenuPhotoDataUrl(photoPath: string): Promise<string | null> {
  const { data, error } = await client().storage.from('menu-photos').download(photoPath);
  if (error || !data) {
    console.warn('Could not download menu photo:', error);
    return null;
  }
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(data);
  });
}

export async function saveMenuDraft(id: string, draft: object[]): Promise<void> {
  const { error } = await client().rpc('team_save_menu_draft', { p_id: id, p_draft: draft });
  if (error) throw toError(error);
}

// Returns how many dishes were added and which names were already on the menu.
export async function approveMenuPhoto(id: string, draft: object[]): Promise<{ added: number; skipped: string[] }> {
  const { data, error } = await client().rpc('team_approve_menu_photo', { p_id: id, p_draft: draft });
  if (error) throw toError(error);
  return { added: Number(data?.added ?? 0), skipped: (data?.skipped_already_there ?? []) as string[] };
}

export async function rejectMenuPhoto(id: string, reason: string): Promise<void> {
  const { error } = await client().rpc('team_reject_menu_photo', { p_id: id, p_reason: reason });
  if (error) throw toError(error);
}


export async function fetchPendingOwnerIngredientChanges(): Promise<PendingOwnerIngredientChange[]> {
  const { data, error } = await client().rpc('team_pending_owner_ingredient_changes');
  if (error) throw toError(error);
  return (data ?? []).map((row: any) => ({
    id: String(row.id),
    restaurantId: String(row.restaurant_id),
    restaurantNameKo: String(row.restaurant_name_ko ?? ''),
    restaurantNameEn: String(row.restaurant_name_en ?? ''),
    dishId: String(row.dish_id),
    dishNameKo: String(row.dish_name_ko ?? ''),
    currentContains: row.current_contains ?? [],
    currentMayContain: row.current_may_contain ?? [],
    proposedContains: row.proposed_contains ?? [],
    proposedMayContain: row.proposed_may_contain ?? [],
    note: String(row.note ?? ''),
    createdAt: String(row.created_at),
  }));
}

export async function reviewOwnerIngredientChange(
  id: string,
  approve: boolean,
  reviewNote: string,
): Promise<void> {
  const { error } = await client().rpc('team_review_owner_ingredient_change', {
    p_id: id,
    p_approve: approve,
    p_review_note: reviewNote.trim().slice(0, 500),
  });
  if (error) throw toError(error);
}
