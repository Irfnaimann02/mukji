import { describe, expect, jest, test } from '@jest/globals';

import type { Restaurant } from '@/data/types';
import { distanceInMeters } from '@/logic/geo';
import { listRestaurantsNear } from '@/logic/restaurant-service'; // the mocks below are hoisted above this

// #48 review: a square search area keeps its corners, which are further away than the
// radius. The map must only get places inside the circle, from our database and Kakao.

const CENTRE = { lat: 37.2967, lng: 126.836 };
const METRES_PER_DEG_LAT = 111320;
const metresPerDegLng = METRES_PER_DEG_LAT * Math.cos((CENTRE.lat * Math.PI) / 180);

function place(id: string, northM: number, eastM: number): Restaurant {
  return {
    id,
    nameKo: id,
    nameEn: id,
    lat: CENTRE.lat + northM / METRES_PER_DEG_LAT,
    lng: CENTRE.lng + eastM / metresPerDegLng,
    dishes: [],
  } as unknown as Restaurant;
}

const mockOwn = [place('inside', 990, 0), place('corner', 800, 800)];
const mockKakao = [place('kakao-inside', 0, -500), place('kakao-corner', -800, -800)];

jest.mock('@/data/restaurant-repository', () => ({
  fetchRestaurantsNear: async () => mockOwn,
  fetchRestaurantsByIds: async () => [],
  fetchListedRestaurants: async () => [],
  searchRestaurantRows: async () => [],
}));
jest.mock('@/data/kakao-repository', () => ({
  KAKAO_ID_PREFIX: 'kakao-',
  fetchKakaoRestaurants: async () => mockKakao,
  findKakaoRestaurant: () => undefined,
}));

describe('restaurants near a point', () => {
  test('a place in the corner of the search box (inside the box, outside the radius) is left out', async () => {
    // both corners really are outside 1,000 m, and the others inside
    expect(distanceInMeters(CENTRE, mockOwn[1])).toBeGreaterThan(1000);
    expect(distanceInMeters(CENTRE, mockKakao[1])).toBeGreaterThan(1000);

    const found = await listRestaurantsNear(CENTRE.lat, CENTRE.lng, 1000);

    expect(found.map((r) => r.id).sort()).toEqual(['inside', 'kakao-inside']);
  });
});
