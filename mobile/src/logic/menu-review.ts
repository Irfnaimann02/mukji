import {
  approveMenuPhoto,
  fetchIsTeamMember,
  fetchMenuPhotoDataUrl,
  fetchMenuPhotoUrl,
  fetchPendingMenuPhotos,
  MenuReviewError,
  rejectMenuPhoto,
  saveMenuDraft,
  type PendingMenuPhoto,
} from '@/data/menu-review-repository';
import { scanMenuPhoto } from '@/data/menu-scan-repository';
import { ALL_INGREDIENTS, type Dish, type Ingredient } from '@/data/types';
import type { TranslationKey } from '@/i18n/translations';
import { scanImageFrom } from '@/logic/menu-scan';

// The team's menu review screen: the draft list of dishes for one menu photo,
// and turning it into what approve_menu_submission (016) expects.
// Tags are optional: dishes the dish library knows (e.g. 치즈라면) get their
// tags on approve; only unknown dishes need them typed in.

export interface DraftItem {
  key: string; // only for the list on screen
  nameKo: string;
  nameEn: string;
  price: string; // as typed, e.g. "5,500"
  contains: string; // as typed, e.g. "wheat, egg"
  mayContain: string;
}

// What is wrong with one row, if anything.
export type DraftProblem = 'no_name' | 'no_price' | 'unknown_tag';

let nextKey = 0;
const newKey = () => `row-${Date.now()}-${nextKey++}`;

export function emptyDraftItem(): DraftItem {
  return { key: newKey(), nameKo: '', nameEn: '', price: '', contains: '', mayContain: '' };
}

const text = (value: unknown): string => (typeof value === 'string' ? value : '');
const tagText = (value: unknown): string =>
  Array.isArray(value) ? value.filter((v) => typeof v === 'string').join(', ') : '';

// A saved draft (from the database) as rows. Anything badly formed is dropped.
export function draftFromSaved(raw: unknown): DraftItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map((item) => ({
      key: newKey(),
      nameKo: text(item.name_ko),
      nameEn: text(item.name_en),
      price: typeof item.price_won === 'number' ? String(item.price_won) : text(item.price_won),
      contains: tagText(item.contains),
      mayContain: tagText(item.may_contain),
    }));
}

// What the AI scanner read from the photo, as rows the team can fix.
export function draftFromScan(dishes: Dish[]): DraftItem[] {
  return dishes.map((dish) => ({
    key: newKey(),
    nameKo: dish.nameKo,
    nameEn: dish.nameEn === dish.nameKo ? '' : dish.nameEn,
    price: dish.priceWon > 0 ? String(dish.priceWon) : '',
    contains: dish.contains.join(', '),
    mayContain: dish.mayContain.join(', '),
  }));
}

// "wheat, Egg ,  soy" -> ['wheat', 'egg', 'soy'], plus any words that aren't ingredients.
export function parseTags(typed: string): { tags: Ingredient[]; unknown: string[] } {
  const words = typed.split(/[,\s]+/).map((w) => w.trim().toLowerCase()).filter(Boolean);
  const tags = [...new Set(words.filter((w): w is Ingredient => (ALL_INGREDIENTS as string[]).includes(w)))];
  const unknown = words.filter((w) => !(ALL_INGREDIENTS as string[]).includes(w));
  return { tags, unknown };
}

// "5,500원" -> 5500; anything else -> null.
export function parsePrice(typed: string): number | null {
  const digits = typed.replace(/[^\d]/g, '');
  if (!digits) return null;
  const value = Number.parseInt(digits, 10);
  return value > 0 && value < 10_000_000 ? value : null;
}

export function rowProblem(item: DraftItem): DraftProblem | null {
  if (!item.nameKo.trim()) return 'no_name';
  if (parsePrice(item.price) === null) return 'no_price';
  if (parseTags(item.contains).unknown.length > 0 || parseTags(item.mayContain).unknown.length > 0) return 'unknown_tag';
  return null;
}

// Rows that are completely empty are ignored, so a spare blank row doesn't block approval.
export function filledRows(items: DraftItem[]): DraftItem[] {
  return items.filter((i) => i.nameKo.trim() || i.nameEn.trim() || i.price.trim() || i.contains.trim() || i.mayContain.trim());
}

// The draft in the shape the database stores and approve_menu_submission reads.
export function toDraftJson(items: DraftItem[]): object[] {
  return filledRows(items).map((item) => {
    const contains = parseTags(item.contains).tags;
    const mayContain = parseTags(item.mayContain).tags.filter((t) => !contains.includes(t));
    return {
      name_ko: item.nameKo.trim(),
      ...(item.nameEn.trim() ? { name_en: item.nameEn.trim() } : {}),
      ...(parsePrice(item.price) !== null ? { price_won: parsePrice(item.price) } : {}),
      ...(contains.length ? { contains } : {}),
      ...(mayContain.length ? { may_contain: mayContain } : {}),
    };
  });
}

// The heading for one waiting photo: our restaurant's name, or "Kakao place 123".
export function photoTitle(photo: PendingMenuPhoto, language: 'en' | 'ko'): string {
  if (photo.restaurantId) {
    const name = language === 'ko' ? photo.restaurantNameKo : photo.restaurantNameEn;
    return name || photo.restaurantNameKo || photo.restaurantId;
  }
  return `Kakao ${photo.kakaoPlaceId ?? ''}`.trim();
}

export function reviewErrorKey(error: unknown): TranslationKey {
  const code = error instanceof MenuReviewError ? error.code : 'unknown';
  switch (code) {
    case 'team_only':
      return 'menuReviewTeamOnly';
    case 'not_pending':
      return 'menuReviewAlreadyDone';
    case 'restaurant_not_added':
      return 'menuReviewKakaoFirst';
    case 'draft_problems':
      return 'menuReviewFixDraft';
    default:
      return 'pleaseTryAgain';
  }
}

// ---------- What the screen calls (only src/data talks to Supabase) ----------

export const isTeamMember = fetchIsTeamMember;
export const loadPendingMenuPhotos = fetchPendingMenuPhotos;
export const menuPhotoUrl = fetchMenuPhotoUrl;

export function saveDraft(photo: PendingMenuPhoto, items: DraftItem[]): Promise<void> {
  return saveMenuDraft(photo.id, toDraftJson(items));
}

export function approveDraft(photo: PendingMenuPhoto, items: DraftItem[]) {
  return approveMenuPhoto(photo.id, toDraftJson(items));
}

export function rejectPhoto(photo: PendingMenuPhoto, reason: string): Promise<void> {
  return rejectMenuPhoto(photo.id, reason.trim().slice(0, 300));
}

// Reads the photo with Nik's Menu Scanner (#87) and turns the result into rows.
// Same daily AI limit as the scanner (027). Without the AI key, the team types
// the dishes in by hand.
export async function readMenuWithAi(
  photo: PendingMenuPhoto,
): Promise<{ ok: true; items: DraftItem[] } | { ok: false; reason: TranslationKey }> {
  const dataUrl = await fetchMenuPhotoDataUrl(photo.photoPath);
  if (!dataUrl) return { ok: false, reason: 'menuReviewPhotoFailed' };
  const image = scanImageFrom({ uri: dataUrl });
  if (typeof image === 'string') return { ok: false, reason: image === 'too_big' ? 'menuPhotoTooBig' : 'menuReviewPhotoFailed' };

  const result = await scanMenuPhoto(image, `review-${photo.id.slice(0, 8)}`);
  if (result.ok) return { ok: true, items: draftFromScan(result.dishes) };
  if (result.error === 'not_configured') return { ok: false, reason: 'menuReviewAiOff' };
  if (result.error === 'not_menu') return { ok: false, reason: 'menuReviewNotMenu' };
  return { ok: false, reason: 'pleaseTryAgain' };
}
