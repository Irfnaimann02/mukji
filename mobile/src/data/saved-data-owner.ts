import AsyncStorage from '@react-native-async-storage/async-storage';

import { currentAccountId } from '@/data/saved-data-remote';
import { cleanOwner, type SavedDataOwner } from '@/logic/saved-data';

// #119 S17: who the profile, favourites and recent searches on this phone belong to.
// Lets the app tell a guest's data (copied into the account once at first sign-in) from
// an account's data (never shown to the next person, never copied into another account).
const OWNER_KEY = '@mukji/saved-data-owner/v1';

export async function readSavedDataOwner(): Promise<SavedDataOwner> {
  try {
    const raw = await AsyncStorage.getItem(OWNER_KEY);
    return raw ? cleanOwner(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export async function writeSavedDataOwner(owner: SavedDataOwner): Promise<void> {
  if (owner) await AsyncStorage.setItem(OWNER_KEY, JSON.stringify(owner));
  else await AsyncStorage.removeItem(OWNER_KEY);
}

/**
 * The email account that the phone's saved data is kept in step with, or null: a guest,
 * nobody signed in, or the first sign-in copy has not finished yet. While null, changes
 * stay on the phone; the first sign-in copy takes them to the account later.
 */
export async function syncedAccountId(): Promise<string | null> {
  const accountId = await currentAccountId();
  if (!accountId) return null;
  const owner = await readSavedDataOwner();
  return owner && !owner.guest && owner.userId === accountId ? accountId : null;
}
