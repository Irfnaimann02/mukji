import { describe, expect, jest, test } from '@jest/globals';

import type { Dish, Restaurant } from '@/data/types';
import { badgesFor } from '@/logic/map-pins';

// badgesFor is pure; keep the database code out of this test.
jest.mock('@/logic/restaurant-service', () => ({ listRestaurantsNear: jest.fn() }));

const dish = (nameKo: string, contains: Dish['contains'], typical: boolean): Dish => ({
  id: nameKo,
  nameKo,
  nameEn: nameKo,
  priceWon: 0,
  contains,
  mayContain: [],
  verifiedCount: 0,
  lastChecked: null,
  typical,
});

const place = (dishes: Dish[]): Restaurant => ({
  id: 'test',
  nameKo: '테스트',
  nameEn: 'Test',
  foodType: 'cafe',
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
  dishes,
});

describe('#103 badges and typical menus', () => {
  test('a typical-only menu earns no "who it fits" badges', () => {
    expect(badgesFor(place([dish('아메리카노', [], true)]))).toEqual([]);
  });

  test('the same dish on a real menu still earns them', () => {
    expect(badgesFor(place([dish('아메리카노', [], false)]))).toEqual(['no-pork', 'vegan-option']);
  });
});
