import {
  addRecentSearch,
  cleanFavourites,
  cleanOwner,
  cleanProfile,
  cleanRecentSearches,
  favouritesForMerge,
  favouritesFromRows,
  planSync,
  profileAfterSignOut,
  profileFromRow,
  rowFromProfile,
  sameSavedProfile,
} from '@/logic/saved-data';
import { DEFAULT_PROFILE } from '@/data/types';
import { describe, expect, it } from '@jest/globals';

const NOW = '2026-11-26T00:00:00.000Z';

describe('cleanProfile', () => {
  it('keeps a valid profile as it is', () => {
    const p = { diets: ['halal'], allergens: ['egg'], likes: ['korean'], maxDistanceM: 3000, language: 'ko' };
    expect(cleanProfile(p)).toEqual(p);
  });

  it('drops unknown values and repeats, fills what is missing', () => {
    expect(cleanProfile({ diets: ['halal', 'keto', 'halal', 3], allergens: 'egg', maxDistanceM: 50, language: 'fr' }))
      .toEqual({ ...DEFAULT_PROFILE, diets: ['halal'] });
  });

  it('gives the default profile for broken data', () => {
    expect(cleanProfile(null)).toEqual(DEFAULT_PROFILE);
    expect(cleanProfile('x')).toEqual(DEFAULT_PROFILE);
  });

  it('loads a profile saved before #48 (no likes)', () => {
    expect(cleanProfile({ diets: ['vegan'], allergens: [], maxDistanceM: 1500, language: 'en' }).likes).toEqual([]);
  });
});

describe('profile after sign-out', () => {
  it('keeps only the language', () => {
    const p = { diets: ['halal' as const], allergens: ['egg' as const], likes: ['cafe' as const], maxDistanceM: 500, language: 'ko' as const };
    expect(profileAfterSignOut(p)).toEqual({ ...DEFAULT_PROFILE, language: 'ko' });
  });
});

describe('account rows', () => {
  it('reads the account profile but keeps the phone language', () => {
    const row = { diets: ['no_pork'], allergens: ['soy'], likes: null, max_distance_m: 1000, recent_searches: ['x'] };
    expect(profileFromRow(row, 'ko')).toEqual({
      diets: ['no_pork'], allergens: ['soy'], likes: [], maxDistanceM: 1000, language: 'ko',
    });
  });

  it('writes no language and no unknown values to the account', () => {
    const p = { ...DEFAULT_PROFILE, diets: ['halal', 'keto'] as never, language: 'ko' as const };
    expect(rowFromProfile(p)).toEqual({ diets: ['halal'], allergens: [], likes: [], max_distance_m: 1500 });
  });
});

describe('sameSavedProfile', () => {
  const p = { diets: ['halal' as const, 'no_pork' as const], allergens: ['egg' as const], likes: [], maxDistanceM: 1500, language: 'en' as const };

  it('ignores order and the language', () => {
    expect(sameSavedProfile(p, { ...p, diets: ['no_pork', 'halal'], language: 'ko' })).toBe(true);
  });

  it('sees an added allergy or a new distance', () => {
    expect(sameSavedProfile(p, { ...p, allergens: ['egg', 'peanut'] })).toBe(false);
    expect(sameSavedProfile(p, { ...p, maxDistanceM: 500 })).toBe(false);
  });
});

describe('recent searches', () => {
  it('puts the newest first, no repeats ignoring case, at most 5', () => {
    expect(addRecentSearch(['kebab', 'a', 'b', 'c', 'd'], ' Kebab ')).toEqual(['Kebab', 'a', 'b', 'c', 'd']);
    expect(addRecentSearch(['a', 'b', 'c', 'd', 'e'], 'f')).toEqual(['f', 'a', 'b', 'c', 'd']);
  });

  it('ignores an empty search', () => {
    expect(addRecentSearch(['a'], '   ')).toEqual(['a']);
  });

  it('cleans a broken saved list', () => {
    expect(cleanRecentSearches(['a', 1, '', ' A ', 'b'])).toEqual(['a', 'b']);
    expect(cleanRecentSearches('a')).toEqual([]);
    expect(cleanRecentSearches(['x'.repeat(150)])[0]).toHaveLength(100);
  });
});

describe('favourites', () => {
  it('drops broken entries and repeats, fixes bad times', () => {
    const list = cleanFavourites([
      { restaurantId: 'r1', note: 'hi', createdAt: '2026-11-01T10:00:00Z', updatedAt: 'bad' },
      { restaurantId: 'r1', note: 'again', createdAt: NOW, updatedAt: NOW },
      { restaurantId: '', note: '' },
      null,
      { restaurantId: 'r2' },
    ], NOW);
    expect(list).toEqual([
      { restaurantId: 'r1', note: 'hi', createdAt: '2026-11-01T10:00:00.000Z', updatedAt: '2026-11-01T10:00:00.000Z' },
      { restaurantId: 'r2', note: '', createdAt: NOW, updatedAt: NOW },
    ]);
  });

  it('cuts a note to 280 characters', () => {
    expect(cleanFavourites([{ restaurantId: 'r1', note: 'x'.repeat(300) }], NOW)[0].note).toHaveLength(280);
  });

  it('shows account favourites newest first', () => {
    const rows = [
      { restaurant_id: 'old', note: null, created_at: '2026-11-01T00:00:00Z', updated_at: '2026-11-01T00:00:00Z' },
      { restaurant_id: 'new', note: 'n', created_at: '2026-11-20T00:00:00Z', updated_at: '2026-11-20T00:00:00Z' },
    ];
    expect(favouritesFromRows(rows).map((f) => f.restaurantId)).toEqual(['new', 'old']);
    expect(favouritesFromRows(rows)[1].note).toBe('');
  });

  it('sends the phone list in the shape SQL 045 expects', () => {
    expect(favouritesForMerge([{ restaurantId: 'r1', note: 'n', createdAt: NOW, updatedAt: NOW }]))
      .toEqual([{ restaurant_id: 'r1', note: 'n', created_at: NOW, updated_at: NOW }]);
  });
});

describe('planSync', () => {
  const guest = { id: 'g1', guest: true };
  const account = { id: 'u1', guest: false };

  it('guests keep everything on the phone', () => {
    expect(planSync(null, guest)).toBe('keep-on-phone');
    expect(planSync({ userId: 'g0', guest: true }, guest)).toBe('keep-on-phone');
  });

  it('a guest never sees an account\'s data left on the phone', () => {
    expect(planSync({ userId: 'u1', guest: false }, guest)).toBe('clear-then-keep-on-phone');
  });

  it('the same account refreshes from the account', () => {
    expect(planSync({ userId: 'u1', guest: false }, account)).toBe('refresh-from-account');
  });

  it('first sign-in copies the guest data (or data saved before #119) once', () => {
    expect(planSync({ userId: 'g1', guest: true }, account)).toBe('copy-guest-data-then-refresh');
    expect(planSync(null, account)).toBe('copy-guest-data-then-refresh');
  });

  it('another account\'s data is cleared, never copied', () => {
    expect(planSync({ userId: 'u2', guest: false }, account)).toBe('clear-then-refresh');
  });
});

describe('cleanOwner', () => {
  it('reads a saved owner or gives null', () => {
    expect(cleanOwner({ userId: 'u1', guest: false })).toEqual({ userId: 'u1', guest: false });
    expect(cleanOwner({ userId: 'u1' })).toBeNull();
    expect(cleanOwner('u1')).toBeNull();
    expect(cleanOwner(null)).toBeNull();
  });
});
