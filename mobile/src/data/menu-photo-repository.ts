import { File } from 'expo-file-system';
import { Platform } from 'react-native';

import { ensureSignedIn } from './auth';
import { supabase } from './supabase';

// "Send menu photo": the only file that talks to Supabase about menu photos.
// The photo goes into the private menu-photos bucket (016) in the sender's own
// folder, and a pending row goes into menu_submissions. Nothing is shown in the
// app until the team approves it. Rules (own folder, 20 a day) are in 021.

export type MenuPhotoPlace =
  | { restaurantId: string; kakaoPlaceId?: undefined }
  | { restaurantId?: undefined; kakaoPlaceId: string };

export interface MenuPhotoFile {
  uri: string;
  mimeType?: string;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
const EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
};

export class MenuPhotoError extends Error {
  code: 'not_signed_in' | 'too_big' | 'daily_limit' | 'unknown';

  constructor(code: MenuPhotoError['code'], message?: string) {
    super(message ?? code);
    this.code = code;
  }
}

// On the web the picker gives a blob/data URL; on phones a file:// path.
async function readBytes(uri: string): Promise<ArrayBuffer> {
  if (Platform.OS === 'web') return (await fetch(uri)).arrayBuffer();
  return new File(uri).arrayBuffer();
}

export async function sendMenuPhoto(place: MenuPhotoPlace, photo: MenuPhotoFile, note: string): Promise<void> {
  if (!supabase) throw new MenuPhotoError('unknown', 'Supabase is not set up (mobile/.env is missing).');

  // Uses the current login, or starts a guest session if there is none yet.
  let userId: string;
  try {
    userId = (await ensureSignedIn()).id;
  } catch {
    throw new MenuPhotoError('not_signed_in');
  }

  const mimeType = ALLOWED_TYPES.includes(photo.mimeType ?? '') ? photo.mimeType! : 'image/jpeg';
  const bytes = await readBytes(photo.uri);
  if (bytes.byteLength > 5 * 1024 * 1024) throw new MenuPhotoError('too_big');

  // <user id>/<restaurant id or kakao-<place id>>/<time>.<ext>
  const folder = place.restaurantId ?? `kakao-${place.kakaoPlaceId}`;
  const path = `${userId}/${folder}/${Date.now()}.${EXTENSION[mimeType]}`;

  const upload = await supabase.storage.from('menu-photos').upload(path, bytes, {
    contentType: mimeType,
    upsert: false,
  });
  if (upload.error) throw new MenuPhotoError('unknown', upload.error.message);

  const { error } = await supabase.from('menu_submissions').insert({
    restaurant_id: place.restaurantId ?? null,
    kakao_place_id: place.kakaoPlaceId ?? null,
    photo_path: path,
    note: note.trim().slice(0, 300),
  });
  if (error) {
    // The only rule a normal user can hit here is the 20-a-day limit.
    throw new MenuPhotoError(error.code === '42501' ? 'daily_limit' : 'unknown', error.message);
  }
}
