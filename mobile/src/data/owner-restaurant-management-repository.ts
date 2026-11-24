import { File, FileMode } from 'expo-file-system';
import { Platform } from 'react-native';

import { supabase } from './supabase';
import {
  RESTAURANT_PHOTO_MAX_BYTES,
  RESTAURANT_PHOTO_MAX_COUNT,
  openingHoursFromUnknown,
  stringArrayFromUnknown,
  type OpeningDayKey,
  type RestaurantManagementProfile,
  type RestaurantPhoto,
  type WeeklyOpeningHours,
} from '@/logic/owner-restaurant-management';

const PHOTO_BUCKET = 'restaurant-photos';

type RestaurantRow = {
  id: string;
  name_ko: string | null;
  name_en: string | null;
  category: string | null;
  address: string | null;
  phone: string | null;
  lat: number;
  lng: number;
  description: string | null;
  reservation_url: string | null;
  opening_hours: unknown;
  closed_days: unknown;
  facilities: unknown;
};

function client() {
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase;
}

async function requireLinkedOwner(restaurantId: string) {
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
  return data.user;
}

function fromRow(row: RestaurantRow): RestaurantManagementProfile {
  return {
    id: String(row.id),
    nameKo: String(row.name_ko ?? ''),
    nameEn: String(row.name_en ?? ''),
    category: String(row.category ?? ''),
    address: String(row.address ?? ''),
    phone: String(row.phone ?? ''),
    latitude: String(row.lat),
    longitude: String(row.lng),
    description: String(row.description ?? ''),
    reservationUrl: String(row.reservation_url ?? ''),
    openingHours: openingHoursFromUnknown(row.opening_hours),
    closedDays: stringArrayFromUnknown(row.closed_days) as OpeningDayKey[],
    facilities: stringArrayFromUnknown(row.facilities),
  };
}

export async function loadOwnerRestaurantManagement(restaurantId: string): Promise<{
  profile: RestaurantManagementProfile;
  photos: RestaurantPhoto[];
}> {
  const sb = client();
  await requireLinkedOwner(restaurantId);

  const { data, error } = await sb
    .from('restaurants')
    .select('id,name_ko,name_en,category,address,phone,lat,lng,description,reservation_url,opening_hours,closed_days,facilities')
    .eq('id', restaurantId)
    .eq('status', 'approved')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('This restaurant is not available for management.');

  const { data: photoRows, error: photoError } = await sb
    .from('restaurant_photos')
    .select('id,storage_path,alt_text')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: true });
  if (photoError) throw photoError;

  const photos = (photoRows ?? []).map((row) => ({
    id: String(row.id),
    storagePath: String(row.storage_path),
    altText: String(row.alt_text ?? ''),
    url: sb.storage.from(PHOTO_BUCKET).getPublicUrl(String(row.storage_path)).data.publicUrl,
  }));

  return { profile: fromRow(data as RestaurantRow), photos };
}

export async function saveOwnerRestaurantManagement(profile: RestaurantManagementProfile): Promise<void> {
  const sb = client();
  await requireLinkedOwner(profile.id);
  const openingHours: WeeklyOpeningHours = {};
  for (const [day, hours] of Object.entries(profile.openingHours)) {
    if (hours?.open.trim() && hours.close.trim()) {
      openingHours[day as OpeningDayKey] = { open: hours.open.trim(), close: hours.close.trim() };
    }
  }

  const { data, error } = await sb
    .from('restaurants')
    .update({
      name_ko: profile.nameKo.trim(),
      name_en: profile.nameEn.trim(),
      category: profile.category.trim(),
      address: profile.address.trim(),
      phone: profile.phone.trim(),
      lat: Number(profile.latitude),
      lng: Number(profile.longitude),
      description: profile.description.trim(),
      reservation_url: profile.reservationUrl.trim() || null,
      opening_hours: openingHours,
      closed_days: [...new Set(profile.closedDays)],
      facilities: [...new Set(profile.facilities.map((item) => item.trim()).filter(Boolean))],
    })
    .eq('id', profile.id)
    .eq('status', 'approved')
    .select('id')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('The restaurant could not be updated. Check your access and try again.');
}

async function readLocalPhoto(uri: string): Promise<ArrayBuffer> {
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    if (!response.ok) throw new Error('Could not read the selected photo.');
    const body = await response.arrayBuffer();
    if (body.byteLength <= 0 || body.byteLength > RESTAURANT_PHOTO_MAX_BYTES) {
      throw new Error('Restaurant photos must be larger than 0 bytes and no bigger than 8 MB.');
    }
    return body;
  }
  const file = new File(uri);
  const handle = file.open(FileMode.ReadOnly);
  try {
    const size = handle.size;
    if (size === null || size <= 0 || size > RESTAURANT_PHOTO_MAX_BYTES) {
      throw new Error('Restaurant photos must be larger than 0 bytes and no bigger than 8 MB.');
    }
    const bytes = await handle.readBytes(size);
    if (bytes.byteLength !== size) throw new Error('Could not read the complete selected photo.');
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  } finally {
    handle.close();
  }
}

function photoFileDetails(mimeType: string | undefined, filename: string | null | undefined) {
  const supported = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
  const inferred = mimeType || (filename?.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg');
  if (!supported.includes(inferred)) throw new Error('Choose a JPG, PNG, WebP or HEIC image.');
  const extension = inferred === 'image/jpeg' ? 'jpg' : inferred.split('/')[1];
  return { mimeType: inferred, extension };
}

export async function uploadOwnerRestaurantPhoto(input: {
  restaurantId: string;
  uri: string;
  mimeType?: string;
  filename?: string | null;
  altText?: string;
}): Promise<RestaurantPhoto> {
  const sb = client();
  await requireLinkedOwner(input.restaurantId);

  const { count, error: countError } = await sb
    .from('restaurant_photos')
    .select('id', { count: 'exact', head: true })
    .eq('restaurant_id', input.restaurantId);
  if (countError) throw countError;
  if ((count ?? 0) >= RESTAURANT_PHOTO_MAX_COUNT) {
    throw new Error(`A restaurant can have up to ${RESTAURANT_PHOTO_MAX_COUNT} photos.`);
  }

  const { mimeType, extension } = photoFileDetails(input.mimeType, input.filename);
  const body = await readLocalPhoto(input.uri);
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${extension}`;
  const storagePath = `${input.restaurantId}/${safeName}`;
  const { error: uploadError } = await sb.storage
    .from(PHOTO_BUCKET)
    .upload(storagePath, body, { contentType: mimeType, upsert: false });
  if (uploadError) throw uploadError;

  const { data, error } = await sb
    .from('restaurant_photos')
    .insert({
      restaurant_id: input.restaurantId,
      storage_path: storagePath,
      alt_text: (input.altText ?? 'Restaurant photo').trim().slice(0, 180),
    })
    .select('id,storage_path,alt_text')
    .single();
  if (error) {
    const { error: cleanupError } = await sb.storage.from(PHOTO_BUCKET).remove([storagePath]);
    if (cleanupError) console.warn('[MUKJI] Could not clean up an unreferenced restaurant photo:', cleanupError.message);
    throw error;
  }

  return {
    id: String(data.id),
    storagePath: String(data.storage_path),
    altText: String(data.alt_text ?? ''),
    url: sb.storage.from(PHOTO_BUCKET).getPublicUrl(String(data.storage_path)).data.publicUrl,
  };
}

export async function deleteOwnerRestaurantPhoto(restaurantId: string, photoId: string): Promise<void> {
  const sb = client();
  await requireLinkedOwner(restaurantId);
  const { data: photo, error: readError } = await sb
    .from('restaurant_photos')
    .select('storage_path')
    .eq('id', photoId)
    .eq('restaurant_id', restaurantId)
    .maybeSingle();
  if (readError) throw readError;
  if (!photo) throw new Error('This restaurant photo could not be found.');

  const { error: deleteError } = await sb
    .from('restaurant_photos')
    .delete()
    .eq('id', photoId)
    .eq('restaurant_id', restaurantId);
  if (deleteError) throw deleteError;

  const { error: storageError } = await sb.storage.from(PHOTO_BUCKET).remove([String(photo.storage_path)]);
  if (storageError) {
    console.warn('[MUKJI] A removed restaurant photo may remain in public storage:', storageError.message);
  }
}
