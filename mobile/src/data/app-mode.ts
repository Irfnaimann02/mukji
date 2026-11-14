import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from '@/data/supabase';

export type AppMode = 'user' | 'business';

const APP_MODE_KEY = 'mukji_active_app_mode_v1';

function isAppMode(value: unknown): value is AppMode {
  return value === 'user' || value === 'business';
}

async function getStorageKey(): Promise<string> {
  if (!supabase) return APP_MODE_KEY;
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ? `${APP_MODE_KEY}_${data.session.user.id}` : APP_MODE_KEY;
}

export async function getAppMode(): Promise<AppMode | null> {
  const key = await getStorageKey();

  // Prefer the account's latest server value so a mode change on another
  // device is reflected here. If offline, fall back to the cached local value.
  if (supabase) {
    const { data } = await supabase.auth.getUser();
    const preferredMode = data.user?.user_metadata?.preferred_mode;
    if (isAppMode(preferredMode)) {
      await AsyncStorage.setItem(key, preferredMode);
      return preferredMode;
    }
  }

  const saved = await AsyncStorage.getItem(key);
  return isAppMode(saved) ? saved : null;
}

export async function setAppMode(mode: AppMode): Promise<void> {
  const key = await getStorageKey();
  await AsyncStorage.setItem(key, mode);

  if (!supabase) return;
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) return;

  const { error } = await supabase.auth.updateUser({
    data: { preferred_mode: mode },
  });
  // Local navigation still works if the metadata update is temporarily offline.
  if (error) console.warn('Could not sync preferred app mode:', error.message);
}

/** Clear the saved mode so the next app visit shows the welcome screen. */
export async function clearAppMode(): Promise<void> {
  const key = await getStorageKey();
  await AsyncStorage.removeItem(key);
  await AsyncStorage.removeItem(APP_MODE_KEY);

  if (!supabase) return;
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) return;

  const { error } = await supabase.auth.updateUser({
    data: { preferred_mode: null },
  });
  // Local mode is already cleared. A temporary metadata/network failure must
  // not prevent the user from signing out and returning to Welcome.
  if (error) console.warn('Could not clear preferred app mode on Supabase:', error.message);
}
