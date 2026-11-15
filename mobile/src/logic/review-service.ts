import {
  addReview,
  checkInAt,
  fetchReviewEligibility,
  fetchReviews,
  ReviewError,
  type ReviewErrorCode,
} from '@/data/review-repository';
import type { CheckInResult, Diet, Review, ReviewEligibility } from '@/data/types';
import type { TranslationKey } from '@/i18n/translations';

// #52 Screens use this file; only src/data talks to Supabase.

export const REVIEW_BODY_MAX = 1000;
export const REVIEW_DIETS: Diet[] = ['halal', 'vegan', 'no_pork'];

export function loadReviews(restaurantId: string, myUserId: string | null): Promise<Review[]> {
  return fetchReviews(restaurantId, myUserId);
}

export function loadReviewEligibility(restaurantId: string): Promise<ReviewEligibility> {
  return fetchReviewEligibility(restaurantId);
}

export function checkIn(restaurantId: string, point: { lat: number; lng: number }): Promise<CheckInResult> {
  return checkInAt(restaurantId, point);
}

export function postReview(restaurantId: string, stars: number, body: string, dietTags: Diet[]): Promise<string> {
  return addReview(restaurantId, stars, body.trim().slice(0, REVIEW_BODY_MAX), dietTags);
}

// Average stars rounded to one decimal, e.g. 4.3. 0 when there are no reviews.
export function summarizeReviews(reviews: Review[]): { count: number; average: number } {
  if (reviews.length === 0) return { count: 0, average: 0 };
  const total = reviews.reduce((sum, review) => sum + review.stars, 0);
  return { count: reviews.length, average: Math.round((total / reviews.length) * 10) / 10 };
}

// '★★★★☆' for 4 stars.
export function starText(stars: number): string {
  const full = Math.max(0, Math.min(5, Math.round(stars)));
  return '★'.repeat(full) + '☆'.repeat(5 - full);
}

// Only the diets the review form offers, in a fixed order.
export function defaultReviewDiets(profileDiets: Diet[]): Diet[] {
  return REVIEW_DIETS.filter((diet) => profileDiets.includes(diet));
}

// Which message to show for an error from the database.
export function reviewErrorKey(error: unknown): TranslationKey {
  const code: ReviewErrorCode = error instanceof ReviewError ? error.code : 'unknown';
  switch (code) {
    case 'login_required':
      return 'reviewErrorLogin';
    case 'visit_required':
      return 'reviewErrorVisit';
    case 'already_reviewed':
      return 'reviewErrorAlready';
    case 'bad_stars':
      return 'pickStarsFirst';
    default:
      return 'somethingWentWrong';
  }
}
