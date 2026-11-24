import { describe, expect, it } from '@jest/globals';

import type { Dish } from '@/data/types';
import {
  ownerMenuItemFromDish,
  parseOwnerIngredients,
  validateOwnerMenuItem,
} from '@/logic/owner-menu-management';

const valid = {
  nameKo: '치킨라이스',
  nameEn: 'Chicken rice',
  priceWon: '8,500',
  category: 'main',
  contains: 'chicken, wheat',
  mayContain: 'soy',
};

describe('owner menu management', () => {
  it('normalizes supported ingredient names and removes duplicates', () => {
    expect(parseOwnerIngredients(' Chicken, wheat chicken, SOY ')).toEqual({
      ingredients: ['chicken', 'wheat', 'soy'],
      unknown: [],
    });
  });

  it('accepts a valid menu item and parses its price', () => {
    expect(validateOwnerMenuItem(valid)).toEqual({
      ok: true,
      value: {
        nameKo: '치킨라이스',
        nameEn: 'Chicken rice',
        priceWon: 8500,
        category: 'main',
        contains: ['chicken', 'wheat'],
        mayContain: ['soy'],
        leaveOutKo: '',
        leaveOutEn: '',
      },
    });
  });

  it('rejects unknown ingredients and overlap between contains and may contain', () => {
    expect(validateOwnerMenuItem({ ...valid, contains: 'chicken, magic' })).toEqual({
      ok: false,
      error: 'ingredient_unknown',
    });
    expect(validateOwnerMenuItem({ ...valid, mayContain: 'chicken, soy' })).toEqual({
      ok: false,
      error: 'ingredient_overlap',
    });
  });

  it('rejects an invalid price, category or missing Korean name', () => {
    expect(validateOwnerMenuItem({ ...valid, priceWon: '-100' })).toEqual({ ok: false, error: 'price_invalid' });
    expect(validateOwnerMenuItem({ ...valid, category: 'dessert' })).toEqual({ ok: false, error: 'category_invalid' });
    expect(validateOwnerMenuItem({ ...valid, nameKo: ' ' })).toEqual({ ok: false, error: 'name_ko_required' });
    expect(validateOwnerMenuItem({ ...valid, nameEn: 'x'.repeat(121) })).toEqual({ ok: false, error: 'name_en_invalid' });
    expect(validateOwnerMenuItem({ ...valid, leaveOutEn: 'x'.repeat(301) })).toEqual({ ok: false, error: 'ordering_condition_invalid' });
  });

  it('requires at least one ingredient when creating an unmatched menu item', () => {
    expect(validateOwnerMenuItem({ ...valid, contains: '', mayContain: '', requireIngredients: true })).toEqual({
      ok: false,
      error: 'ingredient_required',
    });
  });

  it('marks shared chain and typical dishes as not editable', () => {
    const dish: Dish = {
      id: 'restaurant-chain-1', nameKo: '김치찌개', nameEn: 'Kimchi stew', priceWon: 0,
      contains: ['pork'], mayContain: [], verifiedCount: 0, lastChecked: null,
    };
    expect(ownerMenuItemFromDish(dish).editable).toBe(false);
    expect(ownerMenuItemFromDish({ ...dish, id: 'r1-d1', typical: true }).editable).toBe(false);
  });
});
