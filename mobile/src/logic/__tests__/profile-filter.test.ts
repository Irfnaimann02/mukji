import { describe, expect, test } from '@jest/globals';

import type { Dish, FoodProfile, Restaurant } from '@/data/types';
import {
  dishStatus,
  fadeReason,
  fadedForAllergies,
  isTypicalMenu,
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
  test('owner-submitted ingredient claims stay Ask first until the team reviews them', () => {
    const unreviewed = { ...dish('사장님 추천 메뉴', []), ingredientsVerified: false };
    expect(dishStatus(unreviewed, restaurant([]), profile([]))).toBe('ask_first');
    expect(dishStatus(unreviewed, restaurant([]), profile(['halal']))).toBe('ask_first');
  });

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

describe('menu availability', () => {
  test('a temporarily unavailable dish does not make a restaurant fit the profile', () => {
    const unavailable = { ...dish('오늘 품절', []), isAvailable: false };
    expect(restaurantFits(restaurant([unavailable]), profile([]))).toBe(false);
    expect(fadeReason(restaurant([unavailable]), profile(['halal']))).toBe(null);
    expect(restaurantFits(restaurant([unavailable, dish('판매 중', [])]), profile([]))).toBe(true);
  });
});

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

// ---------- 4. Lamb (Sarai's 양고기 kebabs) ----------
// Before lamb existed, a lamb kebab tagged only "wheat" showed Safe for vegans.
describe('lamb', () => {
  const lambKebab = dish('양고기 랩 케밥', ['lamb', 'wheat']);
  const falafel = dish('팔라펠 플레이트', [], ['wheat', 'soy']);

  test('vegan avoids lamb, and the falafel stays safe', () => {
    const place = restaurant([lambKebab, falafel]);
    expect(dishStatus(lambKebab, place, profile(['vegan']))).toBe('avoid');
    expect(dishStatus(falafel, place, profile(['vegan']))).toBe('safe');
  });

  test('halal: lamb is ask first unless the place is certified', () => {
    const halal = profile(['halal']);
    expect(dishStatus(lambKebab, restaurant([lambKebab]), halal)).toBe('ask_first');
    expect(dishStatus(lambKebab, restaurant([lambKebab], { halalCertified: true }), halal)).toBe('safe');
  });
});

// ---------- 5. Map fade for diets (#4) ----------
// Before #4 the map only faded for allergies, so with halal on a place where every dish
// has pork still had a normal pin, while Home and Search said it didn't fit.
describe('map fade', () => {
  const porkRice = dish('제육덮밥', ['pork', 'soy']);
  const chicken = dish('닭갈비', ['chicken', 'soy']);
  const rice = dish('공기밥', []);
  const halal = profile(['halal']);

  test('halal: no Safe dish -> faded for diet; one Safe dish -> not faded', () => {
    expect(fadeReason(restaurant([porkRice, chicken]), halal)).toBe('diet');
    expect(fadeReason(restaurant([porkRice, chicken, rice]), halal)).toBeNull();
  });

  test('halal-certified place: its chicken is Safe, so it is not faded', () => {
    expect(fadeReason(restaurant([porkRice, chicken], { halalCertified: true }), halal)).toBeNull();
  });

  test('vegan: a place with only meat and egg dishes is faded for diet', () => {
    expect(fadeReason(restaurant([chicken, dish('계란말이', ['egg'])]), profile(['vegan']))).toBe('diet');
  });

  test('allergy comes first: every dish has the allergen -> faded for allergy', () => {
    const padThai = dish('팟타이', ['seafood', 'egg'], ['peanut']);
    expect(fadeReason(restaurant([padThai]), profile(['halal'], ['peanut']))).toBe('allergy');
  });

  test('diet and allergy together: the only diet-safe dish has the allergen -> faded for diet', () => {
    const eggRice = dish('계란밥', ['egg']);
    // not every dish has egg (no allergy fade), but nothing is Safe for halal + egg allergy
    expect(fadeReason(restaurant([eggRice, porkRice]), profile(['halal'], ['egg']))).toBe('diet');
  });

  test('no profile, or no menu yet -> never faded', () => {
    expect(fadeReason(restaurant([porkRice]), profile([]))).toBeNull();
    expect(fadeReason(restaurant([]), halal)).toBeNull();
    expect(fadeReason(restaurant([], { source: 'kakao', kakaoPlaceId: '1' }), halal)).toBeNull();
  });
});

// ---------- #103 typical (generated) menus ----------

describe('typical menu dishes', () => {
  const typical = (nameKo: string, contains: Dish['contains']): Dish => ({
    ...dish(nameKo, contains),
    typical: true,
  });

  test('a typical dish with no matching tag is never Safe for someone with a diet or allergy', () => {
    const place = restaurant([]);
    expect(dishStatus(typical('공기밥', []), place, profile(['halal']))).toBe('ask_first');
    expect(dishStatus(typical('공기밥', []), place, profile([], ['peanut']))).toBe('ask_first');
    // the same dish from a real menu is still Safe
    expect(dishStatus(dish('공기밥', []), place, profile(['halal']))).toBe('safe');
  });

  test('Avoid still wins on a typical dish', () => {
    expect(dishStatus(typical('삼겹살', ['pork']), restaurant([]), profile(['halal']))).toBe('avoid');
  });

  test('with no diet and no allergy a typical dish is not forced to Ask first', () => {
    expect(dishStatus(typical('공기밥', []), restaurant([]), profile([]))).toBe('safe');
  });

  test('isTypicalMenu is true only when every dish is typical', () => {
    expect(isTypicalMenu(restaurant([typical('a', []), typical('b', [])]))).toBe(true);
    expect(isTypicalMenu(restaurant([typical('a', []), dish('b', [])]))).toBe(false);
    expect(isTypicalMenu(restaurant([]))).toBe(false);
  });

  // #103 + #4: a place with only a typical menu is faded for anyone with a diet OR an allergy.
  test('typical-only menu: faded for an allergy-only profile too, never for no profile', () => {
    const typicalOnly = restaurant([{ ...dish('공기밥', []), typical: true }]);
    expect(fadeReason(typicalOnly, profile([], ['egg']))).toBe('typical');
    expect(fadeReason(typicalOnly, profile(['halal']))).toBe('typical');
    expect(fadeReason(typicalOnly, profile([]))).toBeNull();
  });

  test('typical-only menu where every dish has the allergen: the allergy reason wins', () => {
    const typicalEgg = restaurant([{ ...dish('계란말이', ['egg']), typical: true }]);
    expect(fadeReason(typicalEgg, profile([], ['egg']))).toBe('allergy');
  });
});
