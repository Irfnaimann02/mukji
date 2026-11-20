import type { Dish, DishStatus, FoodProfile, Ingredient, Restaurant } from '@/data/types';

import { explainDish } from './dish-explanation';
import type { OrderPhrase } from './order-phrases';
import { dishStatus } from './profile-filter';

// #10 part 2: Menu Scanner.
// The Edge Function scan-menu reads the photo into dish names and likely ingredients.
// Everything here decides what the app shows, so the AI never sets safe / ask first / avoid:
// the same dishStatus as the rest of the app does.

// Shown in "Based on" in the Why? sheet.
export const SCAN_SOURCE = 'menu scan';

// Claude rejects an image whose base64 text is over 5 MB.
export const MAX_SCAN_BASE64_LENGTH = 5 * 1024 * 1024;

// Image types every AI provider in scan-menu accepts.
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const INGREDIENTS: Ingredient[] = [
  'pork', 'beef', 'chicken', 'lamb', 'seafood', 'egg', 'dairy', 'alcohol', 'peanut', 'wheat', 'soy',
];

export interface ScanImage {
  data: string; // base64, without the "data:...;base64," part
  mimeType: string;
}

export type ScanImageProblem = 'too_big' | 'bad_type' | 'no_data';

// What expo-image-picker gives back (only the parts used here).
export interface PickedImage {
  uri: string;
  base64?: string | null;
  mimeType?: string | null;
}

// Turns a picked photo into what scan-menu needs, or says what is wrong with it.
// On the web the picker can give a data URL instead of base64.
export function scanImageFrom(picked: PickedImage): ScanImage | ScanImageProblem {
  const dataUrl = /^data:([^;,]+)?(?:;[^,]*)?,(.*)$/s.exec(picked.uri);
  const data = picked.base64 || dataUrl?.[2] || '';
  if (!data) return 'no_data';

  let mimeType = (picked.mimeType || dataUrl?.[1] || 'image/jpeg').toLowerCase();
  if (mimeType === 'image/jpg') mimeType = 'image/jpeg';
  if (!IMAGE_TYPES.includes(mimeType)) return 'bad_type';
  if (data.length > MAX_SCAN_BASE64_LENGTH) return 'too_big';
  return { data, mimeType };
}

const text = (value: unknown, max = 80): string => (typeof value === 'string' ? value.trim().slice(0, max) : '');

const ingredients = (value: unknown): Ingredient[] =>
  Array.isArray(value) ? [...new Set(value.filter((v): v is Ingredient => INGREDIENTS.includes(v)))] : [];

// The scan-menu answer as app dishes. Badly formed items are dropped.
// Ids start with the scan id so two scans never share a dish id (the AI "Why?" cache uses it).
export function toScannedDishes(raw: unknown, scanId: string): Dish[] {
  const list = Array.isArray(raw) ? raw : [];
  const dishes: Dish[] = [];
  for (const item of list) {
    if (typeof item !== 'object' || item === null) continue;
    const d = item as Record<string, unknown>;
    const nameKo = text(d.nameKo) || text(d.nameEn);
    if (!nameKo) continue;
    const contains = ingredients(d.contains);
    const price = typeof d.priceWon === 'number' && Number.isFinite(d.priceWon) && d.priceWon > 0 ? d.priceWon : 0;
    dishes.push({
      id: `${scanId}-${dishes.length}`,
      nameKo,
      nameEn: text(d.nameEn),
      priceWon: Math.round(price), // 0 = no price on the photo
      contains,
      mayContain: ingredients(d.mayContain).filter((i) => !contains.includes(i)),
      verifiedCount: 0, // read by AI, nobody has checked it
      lastChecked: null,
    });
  }
  return dishes;
}

// A restaurant to run dishStatus and the Why? sheet on.
// Scanned at a restaurant in the app: keeps its halal certificate and 원산지 lines.
// Scanned from Home: an unknown place, so not halal-certified.
export function scanRestaurant(scanId: string, dishes: Dish[], place?: Restaurant | null): Restaurant {
  if (place) return { ...place, sources: [SCAN_SOURCE], dishes };
  return {
    id: scanId,
    nameKo: '',
    nameEn: '',
    foodType: 'other',
    lat: 0,
    lng: 0,
    address: '',
    phone: '',
    priceLevel: 1,
    halalCertified: false,
    origin: [],
    recommendCount: 0,
    rating: 0,
    sources: [SCAN_SOURCE],
    dishes,
  };
}

export interface ScanRow {
  dish: Dish;
  status: DishStatus;
  question: OrderPhrase | null; // set for Ask first dishes: a Korean question for the staff
}

// One row per scanned dish, in menu order.
export function scanRows(restaurant: Restaurant, profile: FoodProfile): ScanRow[] {
  return restaurant.dishes.map((dish) => {
    const status = dishStatus(dish, restaurant, profile);
    const question = status === 'ask_first' ? (explainDish(dish, restaurant, profile).questions[0] ?? null) : null;
    return { dish, status, question };
  });
}

export function countByStatus(rows: ScanRow[]): Record<DishStatus, number> {
  const counts: Record<DishStatus, number> = { safe: 0, ask_first: 0, avoid: 0 };
  rows.forEach((row) => (counts[row.status] += 1));
  return counts;
}
