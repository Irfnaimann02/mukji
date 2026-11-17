import { describe, expect, it } from '@jest/globals';

import { DEFAULT_PROFILE, type Dish, type FoodProfile, type Restaurant } from '@/data/types';
import { explainDish, relevantOrigin, rulesBlocking } from '@/logic/dish-explanation';

// #10 the facts behind "Why?"
describe('dish-explanation', () => {
  const dish = (contains: Dish['contains'], mayContain: Dish['mayContain'] = [], extra: Partial<Dish> = {}): Dish => ({
    id: 'd1',
    nameKo: '라면',
    nameEn: 'Ramyeon',
    priceWon: 5000,
    contains,
    mayContain,
    verifiedCount: 2,
    lastChecked: '2026-11-01',
    ...extra,
  });
  const restaurant = (halalCertified: boolean): Restaurant => ({
    id: 'r1',
    nameKo: '식당',
    nameEn: 'Diner',
    foodType: 'korean',
    lat: 0,
    lng: 0,
    address: '',
    phone: '',
    priceLevel: 1,
    halalCertified,
    origin: [{ itemKo: '돼지고기', country: '국내산' }],
    recommendCount: 0,
    rating: 0,
    sources: ['menu', '원산지 label'],
    dishes: [],
  });
  const halal: FoodProfile = { ...DEFAULT_PROFILE, diets: ['halal'] };

  it('names the rule that blocks an ingredient', () => {
    expect(rulesBlocking('pork', { ...DEFAULT_PROFILE, diets: ['halal', 'vegan'] })).toEqual(['halal', 'vegan']);
    expect(rulesBlocking('egg', { ...DEFAULT_PROFILE, allergens: ['egg'] })).toEqual(['allergy']);
  });

  it('explains an Avoid dish and asks to leave the ingredient out', () => {
    const result = explainDish(dish(['pork', 'egg']), restaurant(false), halal);
    expect(result.status).toBe('avoid');
    expect(result.reasons).toEqual([{ kind: 'contains', ingredient: 'pork', rules: ['halal'] }]);
    expect(result.questions[0].ko).toBe('돼지고기 빼 주세요.');
    expect(result.sources.restaurant).toEqual(['menu', '원산지 label']);
  });

  it('uses the dish own leave-out phrase when there is one', () => {
    const result = explainDish(dish(['pork'], [], { leaveOutKo: '햄 빼 주세요', leaveOutEn: 'No ham, please' }), restaurant(false), halal);
    expect(result.questions[0]).toEqual({ ko: '햄 빼 주세요', en: 'No ham, please' });
  });

  it('explains Ask first: something might be in it', () => {
    const result = explainDish(dish(['wheat'], ['pork']), restaurant(false), halal);
    expect(result.status).toBe('ask_first');
    expect(result.reasons).toEqual([{ kind: 'may_contain', ingredient: 'pork', rules: ['halal'] }]);
    expect(result.questions.map((q) => q.ko)).toEqual(['돼지고기 들어갔어요?']);
  });

  it('explains halal meat at a place that is not certified', () => {
    const result = explainDish(dish(['chicken', 'wheat']), restaurant(false), halal);
    expect(result.status).toBe('ask_first');
    expect(result.reasons).toEqual([{ kind: 'halal_meat', ingredient: 'chicken' }]);
    expect(result.questions.map((q) => q.ko)).toEqual(['할랄 고기인가요?']);
    expect(explainDish(dish(['chicken']), restaurant(true), halal).reasons).toEqual([]);
  });

  it('shows only the 원산지 lines about this dish', () => {
    const origin = [
      { itemKo: '순살치킨', country: '브라질산' },
      { itemKo: '밀떡', country: '미국산' },
      { itemKo: '새우', country: '베트남산' },
      { itemKo: '햄(돼지고기)', country: '국내산' },
      { itemKo: '쌀', country: '국내산' },
    ];
    const items = (d: Dish) => relevantOrigin(d, origin).map((o) => o.itemKo);
    expect(items(dish(['chicken', 'wheat'], [], { nameKo: '후라이드치킨' }))).toEqual(['순살치킨']);
    expect(items(dish(['wheat'], ['seafood'], { nameKo: '국물떡볶이' }))).toEqual(['밀떡', '새우']);
    expect(items(dish(['pork', 'egg'], [], { nameKo: '김밥' }))).toEqual(['햄(돼지고기)', '쌀']);
  });
});
