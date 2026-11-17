import { describe, expect, jest, test } from '@jest/globals';

import { ReviewError } from '@/data/review-repository';
import type { Restaurant } from '@/data/types';
import { menuPhotoPlace } from '@/logic/menu-photo-service';
import { reviewErrorKey, starText, summarizeStars } from '@/logic/review-service';

// The logic files import the Supabase client, which needs phone storage.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Week 12: found by the code-quality review: the review and menu-photo logic
// had no tests. Each test fails if the rule it describes is broken.

function place(extra: Partial<Restaurant>): Restaurant {
  return {
    id: 'r12',
    nameKo: '사라이',
    nameEn: 'Sarai',
    foodType: 'halal',
    lat: 37.3,
    lng: 126.83,
    address: '',
    phone: '',
    priceLevel: 1,
    halalCertified: false,
    origin: [],
    recommendCount: 0,
    rating: 0,
    sources: [],
    dishes: [],
    ...extra,
  } as Restaurant;
}

describe('review summary', () => {
  test('average over every review, one decimal; nothing when there are none', () => {
    expect(summarizeStars([5, 4, 4])).toEqual({ count: 3, average: 4.3 });
    expect(summarizeStars([])).toEqual({ count: 0, average: 0 });
    expect(starText(4)).toBe('★★★★☆');
  });

  test('database errors become the right message, unknown ones a generic one', () => {
    expect(reviewErrorKey(new ReviewError('visit_required'))).toBe('reviewErrorVisit');
    expect(reviewErrorKey(new ReviewError('already_reviewed'))).toBe('reviewErrorAlready');
    expect(reviewErrorKey(new Error('network down'))).toBe('somethingWentWrong');
  });
});

describe('menu photo target', () => {
  test('our restaurants by ID, Kakao places by Kakao place ID only', () => {
    expect(menuPhotoPlace(place({}))).toEqual({ restaurantId: 'r12' });
    expect(menuPhotoPlace(place({ id: 'kakao-123', source: 'kakao', kakaoPlaceId: '123' } as Partial<Restaurant>))).toEqual({
      kakaoPlaceId: '123',
    });
    expect(menuPhotoPlace(place({ id: 'kakao-x', source: 'kakao' } as Partial<Restaurant>))).toBeNull();
  });
});
