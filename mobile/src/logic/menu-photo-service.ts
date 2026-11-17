import { MenuPhotoError, sendMenuPhoto, type MenuPhotoFile, type MenuPhotoPlace } from '@/data/menu-photo-repository';
import type { Restaurant } from '@/data/types';
import type { TranslationKey } from '@/i18n/translations';

// "Send menu photo". Screens use this file; only src/data talks to Supabase.

export const MENU_PHOTO_NOTE_MAX = 300;

// Our restaurants are sent by ID; Kakao places by Kakao's place ID only.
// Returns null when there is nothing to attach the photo to.
export function menuPhotoPlace(restaurant: Restaurant): MenuPhotoPlace | null {
  if (restaurant.source === 'kakao') {
    return restaurant.kakaoPlaceId ? { kakaoPlaceId: restaurant.kakaoPlaceId } : null;
  }
  return { restaurantId: restaurant.id };
}

export function submitMenuPhoto(restaurant: Restaurant, photo: MenuPhotoFile, note: string): Promise<void> {
  const place = menuPhotoPlace(restaurant);
  if (!place) return Promise.reject(new MenuPhotoError('unknown', 'No place to attach the photo to.'));
  return sendMenuPhoto(place, photo, note);
}

export function menuPhotoErrorKey(error: unknown): TranslationKey {
  const code = error instanceof MenuPhotoError ? error.code : 'unknown';
  switch (code) {
    case 'not_signed_in':
      return 'menuPhotoNotSignedIn';
    case 'too_big':
      return 'menuPhotoTooBig';
    case 'daily_limit':
      return 'menuPhotoDailyLimit';
    default:
      return 'somethingWentWrong';
  }
}
