import { describe, expect, jest, test } from '@jest/globals';

import type { Dish } from '@/data/types';
import {
  draftFromSaved,
  draftFromScan,
  emptyDraftItem,
  parsePrice,
  parseTags,
  rowProblem,
  toDraftJson,
} from '@/logic/menu-review';

// The logic files import the Supabase client, which needs phone storage.
jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Team menu review (029): what the team types becomes exactly what
// approve_menu_submission (016) accepts, and bad rows are caught before approve.

const row = (fields: Partial<ReturnType<typeof emptyDraftItem>>) => ({ ...emptyDraftItem(), ...fields });

describe('menu review draft', () => {
  test('typed rows become the database draft; blank rows are ignored; tags only when given', () => {
    const json = toDraftJson([
      row({ nameKo: ' 치즈라면 ', nameEn: 'Cheese ramen', price: '5,500원' }),
      row({ nameKo: '특제 비빔국수', price: '7000', contains: 'Wheat, egg', mayContain: 'egg soy' }),
      row({}),
    ]);
    expect(json).toEqual([
      { name_ko: '치즈라면', name_en: 'Cheese ramen', price_won: 5500 },
      // "egg" is in contains, so it is dropped from may_contain
      { name_ko: '특제 비빔국수', price_won: 7000, contains: ['wheat', 'egg'], may_contain: ['soy'] },
    ]);
  });

  test('a row needs a Korean name, a price, and only real ingredient words', () => {
    expect(rowProblem(row({ price: '5000' }))).toBe('no_name');
    expect(rowProblem(row({ nameKo: '라면', price: '공짜' }))).toBe('no_price');
    expect(rowProblem(row({ nameKo: '라면', price: '5000', contains: 'wheat, msg' }))).toBe('unknown_tag');
    expect(rowProblem(row({ nameKo: '라면', price: '5000', contains: 'wheat' }))).toBeNull();
    expect(parseTags('Lamb, lamb, cheese')).toEqual({ tags: ['lamb'], unknown: ['cheese'] });
    expect(parsePrice('0')).toBeNull();
  });

  test('an AI scan and a saved draft both turn into editable rows', () => {
    const scanned: Dish[] = [
      { id: 's1', nameKo: '돈까스', nameEn: 'Pork cutlet', priceWon: 9000, contains: ['pork', 'wheat'], mayContain: ['egg'], verifiedCount: 0, lastChecked: null },
      { id: 's2', nameKo: '공기밥', nameEn: '공기밥', priceWon: 0, contains: [], mayContain: [], verifiedCount: 0, lastChecked: null },
    ];
    const fromScan = draftFromScan(scanned).map(({ key, ...rest }) => rest);
    expect(fromScan).toEqual([
      { nameKo: '돈까스', nameEn: 'Pork cutlet', price: '9000', contains: 'pork, wheat', mayContain: 'egg' },
      // no price read -> empty, so the team must type it
      { nameKo: '공기밥', nameEn: '', price: '', contains: '', mayContain: '' },
    ]);

    const saved = draftFromSaved([{ name_ko: '라면', price_won: 5000, contains: ['wheat'] }, 'junk', null]);
    expect(saved.map(({ key, ...rest }) => rest)).toEqual([
      { nameKo: '라면', nameEn: '', price: '5000', contains: 'wheat', mayContain: '' },
    ]);
  });
});
