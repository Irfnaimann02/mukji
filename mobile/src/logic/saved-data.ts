import type { FavouriteRecord } from '@/data/favourites-store';
import { DEFAULT_PROFILE, type Allergen, type Diet, type FoodProfile, type FoodTag } from '@/data/types';

// #119 S17: rules for the food profile, favourites and recent searches that are saved on
// the phone and, for email accounts, in the account (SQL 045). No storage or network here.

export const MAX_RECENT_SEARCHES = 5;
const MAX_SEARCH_LENGTH = 100;
export const MAX_FAVOURITE_NOTE = 280; // same as the note box and SQL 045

// Typed so a value added to Diet, Allergen or FoodTag must be added here too.
// SQL 045 has the same lists.
const DIETS = { halal: true, vegan: true, no_pork: true } satisfies Record<Diet, true>;
const ALLERGENS = {
  peanut: true, seafood: true, egg: true, dairy: true, wheat: true, soy: true,
} satisfies Record<Allergen, true>;
const FOOD_TAGS = {
  korean: true, chinese: true, japanese: true, western: true, 'asian-foreign': true,
  noodles: true, bbq: true, buffet: true, 'snack-food': true, 'raw-fish': true,
  chicken: true, 'fast-food': true, cafe: true, pub: true, 'halal-food': true, cheap: true,
} satisfies Record<FoodTag, true>;

function onlyKnown<T extends string>(value: unknown, known: Record<T, true>): T[] {
  if (!Array.isArray(value)) return [];
  const kept = value.filter((v): v is T => typeof v === 'string' && Object.prototype.hasOwnProperty.call(known, v));
  return [...new Set(kept)];
}

function cleanDistance(value: unknown): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 100 && value <= 10000
    ? value
    : DEFAULT_PROFILE.maxDistanceM;
}

/** A profile read from the phone or the account, with anything unknown dropped. */
export function cleanProfile(raw: unknown): FoodProfile {
  const p = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    diets: onlyKnown(p.diets, DIETS),
    allergens: onlyKnown(p.allergens, ALLERGENS),
    likes: onlyKnown(p.likes, FOOD_TAGS),
    maxDistanceM: cleanDistance(p.maxDistanceM),
    language: p.language === 'ko' ? 'ko' : 'en',
  };
}

/** After sign-out the phone keeps only the language (a phone setting, not personal data). */
export function profileAfterSignOut(profile: FoodProfile): FoodProfile {
  return { ...DEFAULT_PROFILE, language: profile.language };
}

// ---------- account rows (SQL 045 user_profiles) ----------

export type ProfileRow = {
  diets: string[] | null;
  allergens: string[] | null;
  likes: string[] | null;
  max_distance_m: number | null;
  recent_searches: string[] | null;
};

/** The account's profile, keeping the phone's language (language is not stored in the account). */
export function profileFromRow(row: ProfileRow, language: FoodProfile['language']): FoodProfile {
  return cleanProfile({
    diets: row.diets,
    allergens: row.allergens,
    likes: row.likes,
    maxDistanceM: row.max_distance_m,
    language,
  });
}

export function rowFromProfile(profile: FoodProfile) {
  const clean = cleanProfile(profile);
  return {
    diets: clean.diets,
    allergens: clean.allergens,
    likes: clean.likes ?? [],
    max_distance_m: clean.maxDistanceM,
  };
}

/** True if two profiles hold the same saved choices (the language is a phone setting and is ignored). */
export function sameSavedProfile(a: FoodProfile, b: FoodProfile): boolean {
  const x = rowFromProfile(a);
  const y = rowFromProfile(b);
  const sameSet = (p: string[], q: string[]) =>
    p.length === q.length && [...p].sort().join('|') === [...q].sort().join('|');
  return (
    sameSet(x.diets, y.diets) &&
    sameSet(x.allergens, y.allergens) &&
    sameSet(x.likes, y.likes) &&
    x.max_distance_m === y.max_distance_m
  );
}

// ---------- recent searches ----------

export function cleanRecentSearches(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const kept: string[] = [];
  for (const item of raw) {
    if (typeof item !== 'string') continue;
    const q = item.trim().slice(0, MAX_SEARCH_LENGTH);
    if (!q || seen.has(q.toLowerCase())) continue;
    seen.add(q.toLowerCase());
    kept.push(q);
  }
  return kept.slice(0, MAX_RECENT_SEARCHES);
}

/** Newest first, no repeats (ignoring case), at most 5. */
export function addRecentSearch(recent: string[], query: string): string[] {
  const q = query.trim();
  if (!q) return cleanRecentSearches(recent);
  return cleanRecentSearches([q, ...recent]);
}

// ---------- favourites ----------

function cleanTime(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? fallback : new Date(ms).toISOString();
}

/** Favourites read from the phone, with broken entries and repeats dropped. */
export function cleanFavourites(raw: unknown, now = new Date().toISOString()): FavouriteRecord[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const kept: FavouriteRecord[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const f = item as Record<string, unknown>;
    if (typeof f.restaurantId !== 'string' || f.restaurantId.length === 0) continue;
    if (seen.has(f.restaurantId)) continue;
    seen.add(f.restaurantId);
    const createdAt = cleanTime(f.createdAt, now);
    kept.push({
      restaurantId: f.restaurantId,
      note: typeof f.note === 'string' ? f.note.slice(0, MAX_FAVOURITE_NOTE) : '',
      createdAt,
      updatedAt: cleanTime(f.updatedAt, createdAt),
    });
  }
  return kept;
}

export type FavouriteRow = {
  restaurant_id: string;
  note: string | null;
  created_at: string;
  updated_at: string;
};

/** The account's favourites, newest first (the order the Favourites tab shows). */
export function favouritesFromRows(rows: FavouriteRow[]): FavouriteRecord[] {
  const list = cleanFavourites(
    rows.map((r) => ({
      restaurantId: r.restaurant_id,
      note: r.note ?? '',
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    })),
  );
  return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** The phone's favourites in the shape merge_guest_saved_data (SQL 045) expects. */
export function favouritesForMerge(list: FavouriteRecord[]): FavouriteRow[] {
  return cleanFavourites(list).map((f) => ({
    restaurant_id: f.restaurantId,
    note: f.note,
    created_at: f.createdAt,
    updated_at: f.updatedAt,
  }));
}

// ---------- whose data is on the phone ----------

/** Who the phone's saved data belongs to. null = nobody recorded (fresh phone, or saved before #119). */
export type SavedDataOwner = { userId: string; guest: boolean } | null;
export type SignedInUser = { id: string; guest: boolean };

export type SyncPlan =
  | 'keep-on-phone' // guest: the data stays on the phone only
  | 'clear-then-keep-on-phone' // guest, but the phone still holds an account's data
  | 'refresh-from-account' // the same account as last time: send pending changes, then load
  | 'copy-guest-data-then-refresh' // first sign-in on this phone: copy the guest data once, then load
  | 'clear-then-refresh'; // the phone still holds another account's data: never copy it

export function planSync(owner: SavedDataOwner, user: SignedInUser): SyncPlan {
  if (user.guest) {
    return owner && !owner.guest ? 'clear-then-keep-on-phone' : 'keep-on-phone';
  }
  if (owner?.userId === user.id) return 'refresh-from-account';
  if (owner === null || owner.guest) return 'copy-guest-data-then-refresh';
  return 'clear-then-refresh';
}

export function cleanOwner(raw: unknown): SavedDataOwner {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  return typeof o.userId === 'string' && o.userId && typeof o.guest === 'boolean'
    ? { userId: o.userId, guest: o.guest }
    : null;
}
