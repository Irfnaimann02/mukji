import { describe, expect, it } from '@jest/globals';

import { DEFAULT_PROFILE, type FoodProfile, type Restaurant } from '@/data/types';
import {
  MAX_SCAN_BASE64_LENGTH,
  SCAN_SOURCE,
  countByStatus,
  scanImageFrom,
  scanRestaurant,
  scanRows,
  toScannedDishes,
} from '@/logic/menu-scan';

// #10 part 2: Menu Scanner. The AI only lists dishes and ingredients; the app decides the status.
describe('menu-scan', () => {
  // What scan-menu could send back for a small Korean menu.
  const answer = [
    { nameKo: '돼지국밥', nameEn: 'Pork rice soup', priceWon: 9000, contains: ['pork'], mayContain: ['soy'] },
    { nameKo: '불고기', nameEn: 'Bulgogi', priceWon: 12000, contains: ['beef', 'soy'], mayContain: ['alcohol', 'wheat'] },
    { nameKo: '비빔밥', nameEn: 'Bibimbap', priceWon: null, contains: ['egg'], mayContain: ['beef', 'soy'] },
    { nameKo: '공기밥', nameEn: 'Rice', priceWon: 1000, contains: [], mayContain: [] },
  ];
  const halal: FoodProfile = { ...DEFAULT_PROFILE, diets: ['halal'] };

  describe('toScannedDishes', () => {
    it('turns the answer into dishes with unique ids, nobody verified', () => {
      const dishes = toScannedDishes(answer, 'scan-1');
      expect(dishes.map((d) => d.id)).toEqual(['scan-1-0', 'scan-1-1', 'scan-1-2', 'scan-1-3']);
      expect(dishes[0]).toEqual({
        id: 'scan-1-0',
        nameKo: '돼지국밥',
        nameEn: 'Pork rice soup',
        priceWon: 9000,
        contains: ['pork'],
        mayContain: ['soy'],
        verifiedCount: 0,
        lastChecked: null,
      });
      expect(dishes[2].priceWon).toBe(0); // no price on the photo
    });

    it('drops unknown ingredients, duplicates and items without a name', () => {
      const dishes = toScannedDishes(
        [
          { nameKo: '라면', contains: ['wheat', 'msg', 'wheat'], mayContain: ['wheat', 'seafood', 42] },
          { nameKo: '', nameEn: '' },
          'not a dish',
          null,
          { nameEn: 'Iced tea', contains: [] },
        ],
        's',
      );
      expect(dishes).toHaveLength(2);
      expect(dishes[0].contains).toEqual(['wheat']);
      expect(dishes[0].mayContain).toEqual(['seafood']); // wheat is already "contains"
      expect(dishes[1].nameKo).toBe('Iced tea'); // English-only menu item
      expect(dishes[1].id).toBe('s-1');
    });

    it('gives no dishes for an answer that is not a list', () => {
      expect(toScannedDishes(undefined, 's')).toEqual([]);
      expect(toScannedDishes({ dishes: [] }, 's')).toEqual([]);
    });
  });

  describe('scanRows', () => {
    it('uses the app rules: avoid, ask first with a Korean question, safe', () => {
      const restaurant = scanRestaurant('scan-1', toScannedDishes(answer, 'scan-1'));
      const rows = scanRows(restaurant, halal);
      expect(rows.map((r) => r.status)).toEqual(['avoid', 'ask_first', 'ask_first', 'safe']);
      expect(rows[0].question).toBeNull();
      expect(rows[1].question?.ko).toBe('술 들어갔어요?'); // 맛술 in the marinade
      expect(rows[2].question?.ko).toBe('할랄 고기인가요?'); // beef, place not halal-certified
      expect(rows[3].question).toBeNull();
      expect(countByStatus(rows)).toEqual({ safe: 1, ask_first: 2, avoid: 1 });
    });

    it('gives every Ask first dish a question', () => {
      const soyAllergy: FoodProfile = { ...DEFAULT_PROFILE, allergens: ['soy'] };
      const rows = scanRows(scanRestaurant('s', toScannedDishes(answer, 's')), soyAllergy);
      expect(rows.map((r) => r.status)).toEqual(['ask_first', 'avoid', 'ask_first', 'safe']);
      expect(rows[0].question?.ko).toBe('콩 들어갔어요?');
      rows.filter((r) => r.status === 'ask_first').forEach((r) => expect(r.question?.ko).toBeTruthy());
    });

    it('keeps the halal certificate of the restaurant it was scanned at', () => {
      const place: Restaurant = {
        ...scanRestaurant('x', []),
        id: 'r9',
        nameKo: '할랄식당',
        halalCertified: true,
        sources: ['menu'],
        origin: [{ itemKo: '소고기', country: '호주산' }],
      };
      const restaurant = scanRestaurant('scan-2', toScannedDishes(answer, 'scan-2'), place);
      expect(restaurant.id).toBe('r9');
      expect(restaurant.sources).toEqual([SCAN_SOURCE]);
      expect(restaurant.origin).toEqual([{ itemKo: '소고기', country: '호주산' }]);
      // Bibimbap's beef is fine at a halal-certified place.
      expect(scanRows(restaurant, halal)[2].status).toBe('safe');
    });
  });

  describe('scanImageFrom', () => {
    it('uses the base64 from the picker', () => {
      expect(scanImageFrom({ uri: 'file:///a.jpg', base64: 'AAAA', mimeType: 'image/jpeg' })).toEqual({
        data: 'AAAA',
        mimeType: 'image/jpeg',
      });
    });

    it('reads a web data URL and fixes image/jpg', () => {
      expect(scanImageFrom({ uri: 'data:image/jpg;base64,QUJD' })).toEqual({ data: 'QUJD', mimeType: 'image/jpeg' });
      expect(scanImageFrom({ uri: 'data:image/png;base64,QUJD' })).toEqual({ data: 'QUJD', mimeType: 'image/png' });
    });

    it('says what is wrong with a photo it cannot send', () => {
      expect(scanImageFrom({ uri: 'file:///a.jpg' })).toBe('no_data');
      expect(scanImageFrom({ uri: 'file:///a.heic', base64: 'AAAA', mimeType: 'image/heic' })).toBe('bad_type');
      const big = 'A'.repeat(MAX_SCAN_BASE64_LENGTH + 1);
      expect(scanImageFrom({ uri: 'file:///a.jpg', base64: big, mimeType: 'image/jpeg' })).toBe('too_big');
    });
  });
});
