import { describe, expect, test } from '@jest/globals';

import type { Dish, FoodProfile, Restaurant } from '@/data/types';
import {
  dishStatus,
  fadedForAllergies,
  restaurantFits,
  splitMenu,
} from '@/logic/profile-filter';

// Week 12: core-path tests. Each one fails if the rule it describes is broken.
// Run with: npm test (inside mobile/)

// ---------- small builders so each test only says what matters ----------

function dish(nameKo: string, contains: Dish['contains'], mayContain: Dish['mayContain'] = []): Dish {
  return {
    id: nameKo,
    nameKo,
    nameEn: nameKo,
    priceWon: 8000,
    contains,
    mayContain,
    verifiedCount: 0,
    lastChecked: null,
  };
}

function restaurant(dishes: Dish[], extra: Partial<Restaurant> = {}): Restaurant {
  return {
    id: 'test',
    nameKo: '테스트 식당',
    nameEn: 'Test place',
    foodType: 'korean',
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
    ...extra,
  };
}

function profile(diets: FoodProfile['diets'], allergens: FoodProfile['allergens'] = []): FoodProfile {
  return { diets, allergens, maxDistanceM: 1500, language: 'en' };
}

// ---------- 1. Safe / Ask first / Avoid ----------

describe('dish status', () => {
  test('halal: pork is Avoid, chicken at a place without certification is Ask first, plain rice is Safe', () => {
    const halal = profile(['halal']);
    const notCertified = restaurant([]);
    const certified = restaurant([], { halalCertified: true });

    expect(dishStatus(dish('제육덮밥', ['pork', 'soy']), notCertified, halal)).toBe('avoid');
    expect(dishStatus(dish('닭갈비', ['chicken', 'soy']), notCertified, halal)).toBe('ask_first');
    expect(dishStatus(dish('닭갈비', ['chicken', 'soy']), certified, halal)).toBe('safe');
    expect(dishStatus(dish('공기밥', []), notCertified, halal)).toBe('safe');
    // "may contain" pork is not proof, so it is Ask first, not Avoid
    expect(dishStatus(dish('김치찌개', ['soy'], ['pork']), notCertified, halal)).toBe('ask_first');
  });
});

// ---------- 2. Allergy filter (#14) ----------

describe('allergy filter', () => {
  test('a peanut allergy hides every dish tagged peanut, even "may contain", and fades a place with nothing left', () => {
    const peanut = profile([], ['peanut']);
    const padThai = dish('팟타이', ['seafood', 'egg'], ['peanut', 'soy']);
    const pho = dish('쌀국수', ['beef'], ['seafood']);

    const mixed = splitMenu(restaurant([padThai, pho]), peanut);
    expect(mixed.hidden.map((d) => d.nameKo)).toEqual(['팟타이']);
    expect(mixed.shown.map((d) => d.nameKo)).toEqual(['쌀국수']);
    expect(mixed.hiddenBecause).toEqual(['peanut']);

    // every dish has peanut -> the restaurant fades on the map
    expect(fadedForAllergies(restaurant([padThai]), peanut)).toBe(true);
    // something is left -> not faded
    expect(fadedForAllergies(restaurant([padThai, pho]), peanut)).toBe(false);
  });
});

// ---------- 3. No menu = never "fits" ----------

describe('restaurants without a menu', () => {
  test('a restaurant with no dishes never counts as fitting, for any profile, and is not faded as if checked', () => {
    const noMenu = restaurant([], { category: '까페' });
    const kakaoPlace = restaurant([], { source: 'kakao', kakaoPlaceId: '123' });

    for (const p of [profile(['halal']), profile(['vegan']), profile([], ['peanut']), profile([])]) {
      expect(restaurantFits(noMenu, p)).toBe(false);
      expect(restaurantFits(kakaoPlace, p)).toBe(false);
    }
    // we can't tell, so it stays visible (the page says "ask staff"), not faded as if we checked
    expect(fadedForAllergies(noMenu, profile([], ['peanut']))).toBe(false);
  });
});
