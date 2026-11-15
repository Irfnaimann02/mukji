import { supabase } from './supabase';
import type { CheckInResult, Diet, Review, ReviewEligibility, VisitKind } from './types';

// #52 The only file that talks to Supabase about reviews and check-ins.
// The rules (100 m, completed reservation, 7 days, one review each, no guests)
// live in the database (supabase/sql/019), so the app cannot skip them.

// The database answers with short codes, e.g. 'visit_required'.
export type ReviewErrorCode =
  | 'login_required'
  | 'visit_required'
  | 'already_reviewed'
  | 'bad_stars'
  | 'body_too_long'
  | 'bad_diet_tag'
  | 'bad_location'
  | 'restaurant_not_found'
  | 'unknown';

const KNOWN_CODES: ReviewErrorCode[] = [
  'login_required',
  'visit_required',
  'already_reviewed',
  'bad_stars',
  'body_too_long',
  'bad_diet_tag',
  'bad_location',
  'restaurant_not_found',
];

export class ReviewError extends Error {
  code: ReviewErrorCode;

  constructor(code: ReviewErrorCode, message?: string) {
    super(message ?? code);
    this.code = code;
  }
}

function client() {
  if (!supabase) throw new ReviewError('unknown', 'Supabase is not set up (mobile/.env is missing).');
  return supabase;
}

function toReviewError(error: { message?: string } | null): ReviewError {
  const message = error?.message ?? '';
  const code = KNOWN_CODES.find((known) => message.includes(known)) ?? 'unknown';
  return new ReviewError(code, message);
}

// Newest first. Everyone can read reviews, guests included.
export async function fetchReviews(restaurantId: string, myUserId: string | null): Promise<Review[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('reviews')
    .select('id, restaurant_id, user_id, stars, body, diet_tags, visit_kind, created_at')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw toReviewError(error);

  return (data ?? []).map((row: any) => ({
    id: row.id,
    restaurantId: row.restaurant_id,
    stars: row.stars,
    body: row.body ?? '',
    dietTags: (row.diet_tags ?? []) as Diet[],
    visitKind: row.visit_kind as VisitKind,
    createdAt: row.created_at,
    mine: myUserId !== null && row.user_id === myUserId,
  }));
}

// Stars of every review here (not just the 50 shown), for the average and count.
export async function fetchReviewStars(restaurantId: string): Promise<number[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('reviews').select('stars').eq('restaurant_id', restaurantId);
  if (error) throw toReviewError(error);
  return (data ?? []).map((row: any) => Number(row.stars));
}

export async function fetchReviewEligibility(restaurantId: string): Promise<ReviewEligibility> {
  const { data, error } = await client().rpc('review_eligibility', { p_restaurant_id: restaurantId });
  if (error) throw toReviewError(error);
  return {
    canReview: data?.can_review === true,
    visitKind: (data?.visit_kind ?? null) as VisitKind | null,
    alreadyReviewed: data?.already_reviewed === true,
    reason: data?.reason ?? null,
  };
}

// Sends the phone's position once. The database works out the distance and
// stores only the distance, never the position.
export async function checkInAt(
  restaurantId: string,
  point: { lat: number; lng: number },
): Promise<CheckInResult> {
  const { data, error } = await client().rpc('check_in', {
    p_restaurant_id: restaurantId,
    p_lat: point.lat,
    p_lng: point.lng,
  });
  if (error) throw toReviewError(error);
  return { checkedIn: data?.checked_in === true, distanceM: Number(data?.distance_m ?? 0) };
}

export async function addReview(
  restaurantId: string,
  stars: number,
  body: string,
  dietTags: Diet[],
): Promise<string> {
  const { data, error } = await client().rpc('add_review', {
    p_restaurant_id: restaurantId,
    p_stars: stars,
    p_body: body,
    p_diet_tags: dietTags,
  });
  if (error) throw toReviewError(error);
  return data as string;
}
