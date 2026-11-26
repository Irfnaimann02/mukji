import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { addFavourite, getFavourites, removeFavourite } from '@/data/favourites-store';
import { loadLocalProfile, saveProfile } from '@/data/profile-store';
import { clearSavedDataOnPhone, sendPendingSavedData, startSavedDataSync } from '@/data/saved-data-sync';
import { loadRecentSearches, saveRecentSearch } from '@/data/search-history-store';
import { DEFAULT_PROFILE, type FoodProfile } from '@/data/types';

// #119 S17: how the phone's saved data follows the login. The database is faked here;
// SQL 045 has its own test (supabase/tests/045_user_saved_data.sql).

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

type Login = { id: string; is_anonymous: boolean };
const mockLogin: {
  user: Login | null;
  listener: ((event: string, session: { user: Login } | null) => void) | null;
} = { user: null, listener: null };

jest.mock('@/data/supabase', () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: mockLogin.user ? { user: mockLogin.user } : null }, error: null }),
      onAuthStateChange: (cb: (event: string, session: { user: Login } | null) => void) => {
        mockLogin.listener = cb;
        return { data: { subscription: { unsubscribe: () => { mockLogin.listener = null; } } } };
      },
    },
  },
}));

type Row = { diets: string[]; allergens: string[]; likes: string[]; max_distance_m: number; recent_searches: string[] };
type FavRow = { restaurant_id: string; note: string; created_at: string; updated_at: string };
const mockDb: { profile: Row | null; favourites: FavRow[]; offline: boolean; copies: unknown[] } = {
  profile: null,
  favourites: [],
  offline: false,
  copies: [],
};

// Behaves like SQL 045 for one account.
jest.mock('@/data/saved-data-remote', () => {
  const online = () => {
    if (mockDb.offline) throw new Error('offline');
  };
  const empty = { diets: [], allergens: [], likes: [], max_distance_m: 1500, recent_searches: [] };
  const at = '2026-11-26T00:00:00.000Z';
  return {
    currentAccountId: async () => (mockLogin.user && !mockLogin.user.is_anonymous ? mockLogin.user.id : null),
    fetchProfileRow: async () => { online(); return mockDb.profile; },
    saveProfileRow: async (_id: string, row: object) => { online(); mockDb.profile = { ...(mockDb.profile ?? empty), ...row }; },
    saveRecentSearchesRow: async (_id: string, recent: string[]) => {
      online();
      mockDb.profile = { ...(mockDb.profile ?? empty), recent_searches: recent };
    },
    fetchFavouriteRows: async () => { online(); return mockDb.favourites; },
    addFavouriteRow: async (_id: string, restaurantId: string) => {
      online();
      if (!mockDb.favourites.some((f) => f.restaurant_id === restaurantId)) {
        mockDb.favourites.push({ restaurant_id: restaurantId, note: '', created_at: at, updated_at: at });
      }
    },
    removeFavouriteRow: async (_id: string, restaurantId: string) => {
      online();
      mockDb.favourites = mockDb.favourites.filter((f) => f.restaurant_id !== restaurantId);
    },
    saveFavouriteNoteRow: async (_id: string, restaurantId: string, note: string) => {
      online();
      mockDb.favourites = mockDb.favourites.map((f) => (f.restaurant_id === restaurantId ? { ...f, note } : f));
    },
    copyGuestDataToAccount: async (data: {
      diets: string[]; allergens: string[]; likes: string[]; maxDistanceM: number;
      recentSearches: string[]; favourites: FavRow[];
    }) => {
      online();
      mockDb.copies.push(data);
      if (!mockDb.profile) {
        mockDb.profile = {
          diets: data.diets, allergens: data.allergens, likes: data.likes,
          max_distance_m: data.maxDistanceM, recent_searches: data.recentSearches,
        };
      }
      for (const f of data.favourites) {
        if (!mockDb.favourites.some((x) => x.restaurant_id === f.restaurant_id)) mockDb.favourites.push(f);
      }
    },
  };
});

const OWNER_KEY = '@mukji/saved-data-owner/v1';
const ACCOUNT: Login = { id: 'u1', is_anonymous: false };
const GUEST: Login = { id: 'g1', is_anonymous: true };
const halal: FoodProfile = { ...DEFAULT_PROFILE, diets: ['halal'], language: 'ko' };
const accountRow = (diets: string[]): Row => ({ diets, allergens: ['egg'], likes: [], max_distance_m: 3000, recent_searches: ['Kimbap'] });

async function settle() {
  for (let i = 0; i < 5; i++) await new Promise((resolve) => setTimeout(resolve, 0));
}

async function phoneHas(profile: FoodProfile, favourites: string[] = [], searches: string[] = []) {
  await AsyncStorage.setItem('foodProfile', JSON.stringify(profile));
  await AsyncStorage.setItem('@mukji/favourites/v1', JSON.stringify(
    favourites.map((restaurantId) => ({ restaurantId, note: '', createdAt: '2026-11-20T00:00:00.000Z', updatedAt: '2026-11-20T00:00:00.000Z' })),
  ));
  await AsyncStorage.setItem('recentSearches', JSON.stringify(searches));
}

async function owner() {
  const raw = await AsyncStorage.getItem(OWNER_KEY);
  return raw ? JSON.parse(raw) : null;
}

async function signIn(user: Login) {
  mockLogin.user = user;
  const stop = startSavedDataSync();
  await settle();
  return stop;
}

beforeEach(async () => {
  mockLogin.user = null;
  await clearSavedDataOnPhone(); // also forgets which login was handled last
  await AsyncStorage.clear();
  mockDb.profile = null;
  mockDb.favourites = [];
  mockDb.offline = false;
  mockDb.copies = [];
});

describe('first sign-in on a phone', () => {
  test('a new account gets the guest data, copied once', async () => {
    await phoneHas(halal, ['r1'], ['Kebab']);
    const stop = await signIn(ACCOUNT);

    expect(mockDb.copies).toHaveLength(1);
    expect(mockDb.profile?.diets).toEqual(['halal']);
    expect(mockDb.favourites.map((f) => f.restaurant_id)).toEqual(['r1']);
    expect(mockDb.profile?.recent_searches).toEqual(['Kebab']);
    expect(await owner()).toEqual({ userId: 'u1', guest: false });

    // a later event for the same login does not copy again
    mockLogin.listener?.('TOKEN_REFRESHED', { user: ACCOUNT });
    await settle();
    expect(mockDb.copies).toHaveLength(1);
    stop();
  });

  test('an account that already has a profile keeps it; favourites are added', async () => {
    mockDb.profile = accountRow(['vegan']);
    mockDb.favourites = [{ restaurant_id: 'r9', note: 'mine', created_at: '2026-11-25T00:00:00.000Z', updated_at: '2026-11-25T00:00:00.000Z' }];
    await phoneHas(halal, ['r1']);
    const stop = await signIn(ACCOUNT);

    const profile = await loadLocalProfile();
    expect(profile?.diets).toEqual(['vegan']);
    expect(profile?.allergens).toEqual(['egg']);
    expect(profile?.maxDistanceM).toBe(3000);
    expect(profile?.language).toBe('ko'); // the phone's language stays
    expect((await getFavourites()).map((f) => f.restaurantId)).toEqual(['r9', 'r1']);
    expect(await loadRecentSearches()).toEqual(['Kimbap']);
    stop();
  });

  test('offline: nothing is lost, the copy is tried again later', async () => {
    mockDb.offline = true;
    await phoneHas(halal, ['r1']);
    const stop = await signIn(ACCOUNT);

    expect(await owner()).toBeNull(); // not copied yet
    expect((await loadLocalProfile())?.diets).toEqual(['halal']);
    expect((await getFavourites()).map((f) => f.restaurantId)).toEqual(['r1']);

    // favourites added before the copy stay on the phone and go with the copy
    await addFavourite('r2');
    mockDb.offline = false;
    mockLogin.listener?.('SIGNED_IN', { user: ACCOUNT });
    await settle();
    expect(mockDb.copies).toHaveLength(1);
    expect(mockDb.favourites.map((f) => f.restaurant_id).sort()).toEqual(['r1', 'r2']);
    stop();
  });

  test('another account\'s data left on the phone is never copied', async () => {
    await phoneHas(halal, ['r1'], ['Kebab']);
    await AsyncStorage.setItem(OWNER_KEY, JSON.stringify({ userId: 'u2', guest: false }));
    mockDb.profile = accountRow(['no_pork']);
    const stop = await signIn(ACCOUNT);

    expect(mockDb.copies).toHaveLength(0);
    expect(mockDb.favourites).toHaveLength(0);
    expect((await loadLocalProfile())?.diets).toEqual(['no_pork']);
    expect(await getFavourites()).toEqual([]);
    expect(await loadRecentSearches()).toEqual(['Kimbap']);
    stop();
  });
});

describe('guests', () => {
  test('keep everything on the phone and send nothing', async () => {
    await phoneHas(halal, ['r1'], ['Kebab']);
    const stop = await signIn(GUEST);
    await addFavourite('r2');
    await saveProfile({ ...halal, allergens: ['soy'] });
    await saveRecentSearch('Ramyeon');
    await settle();

    expect(mockDb.profile).toBeNull();
    expect(mockDb.favourites).toHaveLength(0);
    expect(mockDb.copies).toHaveLength(0);
    expect((await getFavourites()).map((f) => f.restaurantId)).toEqual(['r2', 'r1']);
    expect(await owner()).toEqual({ userId: 'g1', guest: true });
    stop();
  });

  test('never see an account\'s data left on the phone', async () => {
    await phoneHas(halal, ['r1'], ['Kebab']);
    await AsyncStorage.setItem(OWNER_KEY, JSON.stringify({ userId: 'u1', guest: false }));
    const stop = await signIn(GUEST);

    expect(await loadLocalProfile()).toEqual({ ...DEFAULT_PROFILE, language: 'ko' });
    expect(await getFavourites()).toEqual([]);
    expect(await loadRecentSearches()).toEqual([]);
    stop();
  });
});

describe('signed in with an email account', () => {
  test('changes go to the account', async () => {
    mockDb.profile = accountRow(['halal']);
    const stop = await signIn(ACCOUNT);

    await saveProfile({ ...halal, diets: ['halal', 'no_pork'] });
    await addFavourite('r3');
    await saveRecentSearch('Kebab');
    await settle();

    expect(mockDb.profile?.diets).toEqual(['halal', 'no_pork']);
    expect(mockDb.favourites.map((f) => f.restaurant_id)).toEqual(['r3']);
    expect(mockDb.profile?.recent_searches).toEqual(['Kebab', 'Kimbap']);
    stop();
  });

  test('a favourite that cannot reach the account is not changed on the phone either', async () => {
    mockDb.favourites = [{ restaurant_id: 'r1', note: '', created_at: '2026-11-25T00:00:00.000Z', updated_at: '2026-11-25T00:00:00.000Z' }];
    const stop = await signIn(ACCOUNT);

    mockDb.offline = true;
    await expect(addFavourite('r2')).rejects.toThrow('offline');
    await expect(removeFavourite('r1')).rejects.toThrow('offline');
    expect((await getFavourites()).map((f) => f.restaurantId)).toEqual(['r1']);
    stop();
  });

  test('a profile change made offline is sent later and not overwritten by the older account copy', async () => {
    mockDb.profile = accountRow(['halal']);
    const stop = await signIn(ACCOUNT);

    mockDb.offline = true;
    await saveProfile({ ...halal, diets: ['vegan'] });
    expect(mockDb.profile?.diets).toEqual(['halal']);
    expect((await loadLocalProfile())?.diets).toEqual(['vegan']);

    mockDb.offline = false;
    await sendPendingSavedData();
    expect(mockDb.profile?.diets).toEqual(['vegan']);
    stop();
  });

  test('the next start sends a waiting change before loading the account', async () => {
    mockDb.profile = accountRow(['halal']);
    await phoneHas({ ...halal, diets: ['vegan'] });
    await AsyncStorage.setItem(OWNER_KEY, JSON.stringify({ userId: 'u1', guest: false }));
    await AsyncStorage.setItem('@mukji/food-profile-pending/v1', 'u1');
    const stop = await signIn(ACCOUNT);

    expect(mockDb.profile?.diets).toEqual(['vegan']);
    expect((await loadLocalProfile())?.diets).toEqual(['vegan']);
    stop();
  });

  test('a waiting mark left by another account is ignored', async () => {
    mockDb.profile = accountRow(['halal']);
    await phoneHas({ ...halal, diets: ['vegan'] });
    await AsyncStorage.setItem(OWNER_KEY, JSON.stringify({ userId: 'u1', guest: false }));
    await AsyncStorage.setItem('@mukji/food-profile-pending/v1', 'u2');
    const stop = await signIn(ACCOUNT);

    expect(mockDb.profile?.diets).toEqual(['halal']);
    expect((await loadLocalProfile())?.diets).toEqual(['halal']);
    stop();
  });
});

describe('sign-out', () => {
  test('leaves only the language on the phone', async () => {
    mockDb.profile = accountRow(['halal']);
    mockDb.favourites = [{ restaurant_id: 'r1', note: 'n', created_at: '2026-11-25T00:00:00.000Z', updated_at: '2026-11-25T00:00:00.000Z' }];
    await phoneHas(halal);
    const stop = await signIn(ACCOUNT);
    expect(await getFavourites()).toHaveLength(1);

    mockLogin.user = null;
    mockLogin.listener?.('SIGNED_OUT', null);
    await settle();

    expect(await loadLocalProfile()).toEqual({ ...DEFAULT_PROFILE, language: 'ko' });
    expect(await getFavourites()).toEqual([]);
    expect(await loadRecentSearches()).toEqual([]);
    expect(await owner()).toBeNull();
    // the account still has everything
    expect(mockDb.profile?.diets).toEqual(['halal']);
    expect(mockDb.favourites).toHaveLength(1);
    stop();
  });

  test('signing in again on the same phone brings everything back without copying the empty phone over it', async () => {
    mockDb.profile = accountRow(['halal']);
    mockDb.favourites = [{ restaurant_id: 'r1', note: 'n', created_at: '2026-11-25T00:00:00.000Z', updated_at: '2026-11-25T00:00:00.000Z' }];
    await phoneHas(halal);
    const stop = await signIn(ACCOUNT);
    mockLogin.user = null;
    mockLogin.listener?.('SIGNED_OUT', null);
    await settle();

    mockLogin.user = ACCOUNT;
    mockLogin.listener?.('SIGNED_IN', { user: ACCOUNT });
    await settle();

    expect((await loadLocalProfile())?.diets).toEqual(['halal']);
    expect((await getFavourites()).map((f) => f.note)).toEqual(['n']);
    expect(mockDb.profile?.diets).toEqual(['halal']);
    stop();
  });
});
