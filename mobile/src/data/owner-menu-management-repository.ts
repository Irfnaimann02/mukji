import { File, FileMode } from 'expo-file-system';
import { Platform } from 'react-native';

import { supabase } from '@/data/supabase';
import type { Dish, Ingredient } from '@/data/types';
import type { OwnerMenuCategory, OwnerMenuValidation } from '@/logic/owner-menu-management';

const PHOTO_BUCKET = 'menu-item-photos';
const PHOTO_MAX_BYTES = 8 * 1024 * 1024;

function client() {
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase;
}

async function requireLinkedOwner(restaurantId: string): Promise<void> {
  const sb = client();
  const { data, error } = await sb.auth.getUser();
  if (error) throw error;
  if (!data.user || data.user.is_anonymous || !data.user.email_confirmed_at) {
    throw new Error('A verified partner account is required.');
  }
  const { data: link, error: linkError } = await sb
    .from('owners')
    .select('restaurant_id')
    .eq('user_id', data.user.id)
    .eq('restaurant_id', restaurantId)
    .maybeSingle();
  if (linkError) throw linkError;
  if (!link) throw new Error('This restaurant is not linked to your partner account.');
  const { data: restaurant, error: restaurantError } = await sb
    .from('restaurants').select('status').eq('id', restaurantId).maybeSingle();
  if (restaurantError) throw restaurantError;
  if (restaurant?.status !== 'approved') throw new Error('Menu management is available after the restaurant is approved.');
}

function toDish(row: any): Dish {
  return {
    id: String(row.id),
    nameKo: String(row.name_ko ?? ''),
    nameEn: String(row.name_en ?? row.name_ko ?? ''),
    priceWon: Number(row.price_won ?? 0),
    contains: (row.contains ?? []) as Ingredient[],
    mayContain: (row.may_contain ?? []) as Ingredient[],
    leaveOutKo: row.leave_out_ko ?? undefined,
    leaveOutEn: row.leave_out_en ?? undefined,
    verifiedCount: Number(row.verified_count ?? 0),
    lastChecked: row.last_checked ?? null,
    typical: row.typical === true,
    ingredientsVerified: row.ingredients_verified !== false,
    menuCategory: row.menu_category ?? 'other',
    isAvailable: row.is_available !== false,
    photoUrl: row.photo_path ? client().storage.from(PHOTO_BUCKET).getPublicUrl(String(row.photo_path)).data.publicUrl : undefined,
  };
}

export async function loadOwnerMenuItems(restaurantId: string): Promise<Dish[]> {
  const sb = client();
  await requireLinkedOwner(restaurantId);
  const { data, error } = await sb
    .from('dishes')
    .select('id,restaurant_id,name_ko,name_en,price_won,contains,may_contain,leave_out_ko,leave_out_en,verified_count,last_checked,typical,ingredients_verified,menu_category,is_available,photo_path')
    .eq('restaurant_id', restaurantId)
    .order('menu_category', { ascending: true })
    .order('name_ko', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(toDish);
}

export async function updateOwnerMenuItem(input: {
  id: string;
  nameKo: string;
  nameEn: string;
  priceWon: number;
  category: OwnerMenuCategory;
  isAvailable: boolean;
  leaveOutKo: string;
  leaveOutEn: string;
}): Promise<void> {
  const { error } = await client().rpc('owner_update_menu_item', {
    p_dish_id: input.id,
    p_name_ko: input.nameKo,
    p_name_en: input.nameEn,
    p_price_won: input.priceWon,
    p_menu_category: input.category,
    p_is_available: input.isAvailable,
    p_leave_out_ko: input.leaveOutKo,
    p_leave_out_en: input.leaveOutEn,
  });
  if (error) throw error;
}

export async function createOwnerMenuItem(input: {
  restaurantId: string;
  value: OwnerMenuValidation;
}): Promise<void> {
  const { error } = await client().rpc('owner_create_menu_item', {
    p_restaurant_id: input.restaurantId,
    p_name_ko: input.value.nameKo,
    p_name_en: input.value.nameEn,
    p_price_won: input.value.priceWon,
    p_menu_category: input.value.category,
    p_contains: input.value.contains,
    p_may_contain: input.value.mayContain,
    p_leave_out_ko: input.value.leaveOutKo,
    p_leave_out_en: input.value.leaveOutEn,
  });
  if (error) throw error;
}

export async function submitOwnerIngredientChange(input: {
  dishId: string;
  contains: Ingredient[];
  mayContain: Ingredient[];
  note: string;
}): Promise<void> {
  const { error } = await client().rpc('owner_submit_menu_ingredient_change', {
    p_dish_id: input.dishId,
    p_contains: input.contains,
    p_may_contain: input.mayContain,
    p_note: input.note,
  });
  if (error) throw error;
}

export async function deleteOwnerMenuItem(dishId: string): Promise<void> {
  const sb = client();
  const { data: dish, error: readError } = await sb
    .from('dishes').select('restaurant_id,photo_path').eq('id', dishId).maybeSingle();
  if (readError) throw readError;
  if (!dish) throw new Error('This menu item could not be found.');

  if (dish.photo_path) {
    const { error: storageError } = await sb.storage
      .from(PHOTO_BUCKET).remove([String(dish.photo_path)]);
    if (storageError) throw storageError;
    const { error: clearError } = await sb.rpc('owner_set_menu_item_photo', { p_dish_id: dishId, p_photo_path: null });
    if (clearError) throw clearError;
  }

  const { error } = await sb.rpc('owner_delete_menu_item', { p_dish_id: dishId });
  if (error) throw error;
}


async function readMenuPhoto(uri: string): Promise<ArrayBuffer> {
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    if (!response.ok) throw new Error('Could not read the selected menu photo.');
    const body = await response.arrayBuffer();
    if (body.byteLength <= 0 || body.byteLength > PHOTO_MAX_BYTES) {
      throw new Error('Menu photos must be larger than 0 bytes and no bigger than 8 MB.');
    }
    return body;
  }
  const file = new File(uri);
  const handle = file.open(FileMode.ReadOnly);
  try {
    const size = handle.size;
    if (size === null || size <= 0 || size > PHOTO_MAX_BYTES) {
      throw new Error('Menu photos must be larger than 0 bytes and no bigger than 8 MB.');
    }
    const bytes = await handle.readBytes(size);
    if (bytes.byteLength !== size) throw new Error('Could not read the complete selected menu photo.');
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  } finally {
    handle.close();
  }
}

function menuPhotoDetails(mimeType: string | undefined, filename: string | null | undefined) {
  const supported = ['image/jpeg', 'image/png', 'image/webp'];
  const lowerName = filename?.toLowerCase() ?? '';
  const inferred = mimeType || (lowerName.endsWith('.png') ? 'image/png' : lowerName.endsWith('.webp') ? 'image/webp' : lowerName.endsWith('.heic') ? 'image/heic' : 'image/jpeg');
  if (!supported.includes(inferred)) {
    throw new Error('Choose a JPG, PNG or WebP image.');
  }
  return { mimeType: inferred, extension: inferred === 'image/jpeg' ? 'jpg' : inferred.split('/')[1] };
}

export async function uploadOwnerMenuItemPhoto(input: {
  restaurantId: string;
  dishId: string;
  uri: string;
  mimeType?: string;
  filename?: string | null;
}): Promise<string> {
  const sb = client();
  await requireLinkedOwner(input.restaurantId);
  const { data: current, error: currentError } = await sb
    .from('dishes').select('photo_path').eq('id', input.dishId).eq('restaurant_id', input.restaurantId).maybeSingle();
  if (currentError) throw currentError;
  if (!current) throw new Error('This menu item could not be found.');

  const { mimeType, extension } = menuPhotoDetails(input.mimeType, input.filename);
  const body = await readMenuPhoto(input.uri);
  const path = `${input.restaurantId}/${input.dishId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${extension}`;
  const { error: uploadError } = await sb.storage.from(PHOTO_BUCKET).upload(path, body, {
    contentType: mimeType,
    upsert: false,
  });
  if (uploadError) throw uploadError;

  const { error: setError } = await sb.rpc('owner_set_menu_item_photo', {
    p_dish_id: input.dishId,
    p_photo_path: path,
  });
  if (setError) {
    const { error: cleanupError } = await sb.storage.from(PHOTO_BUCKET).remove([path]);
    if (cleanupError) console.warn('[MUKJI] Could not clean up an unreferenced menu photo:', cleanupError.message);
    throw setError;
  }

  const oldPath = current.photo_path ? String(current.photo_path) : '';
  if (oldPath && oldPath !== path) {
    const { error: removeOldError } = await sb.storage.from(PHOTO_BUCKET).remove([oldPath]);
    if (removeOldError) console.warn('[MUKJI] Could not remove the replaced menu photo:', removeOldError.message);
  }
  return sb.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function deleteOwnerMenuItemPhoto(restaurantId: string, dishId: string): Promise<void> {
  const sb = client();
  await requireLinkedOwner(restaurantId);
  const { data, error } = await sb
    .from('dishes').select('photo_path').eq('id', dishId).eq('restaurant_id', restaurantId).maybeSingle();
  if (error) throw error;
  if (!data?.photo_path) return;

  const path = String(data.photo_path);
  const { error: removeError } = await sb.storage.from(PHOTO_BUCKET).remove([path]);
  if (removeError) throw removeError;

  const { error: clearError } = await sb.rpc('owner_set_menu_item_photo', {
    p_dish_id: dishId,
    p_photo_path: null,
  });
  if (clearError) throw clearError;
}
