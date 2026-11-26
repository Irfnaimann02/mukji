import AsyncStorage from '@react-native-async-storage/async-storage';

import { syncedAccountId } from '@/data/saved-data-owner';
import { saveProfileRow } from '@/data/saved-data-remote';
import { DEFAULT_PROFILE, type FoodProfile } from '@/data/types';
import { cleanProfile, rowFromProfile } from '@/logic/saved-data';

// #4 food profile on the phone; #119 also kept in the email account (SQL 045).
const KEY = 'foodProfile';
// Set when a change could not reach the account (offline). Sent at the next start.
const PENDING_KEY = '@mukji/food-profile-pending/v1';

let pushQueue: Promise<unknown> = Promise.resolve();

export async function loadLocalProfile(): Promise<FoodProfile | null> {
  const saved = await AsyncStorage.getItem(KEY);
  if (!saved) return null;
  try {
    return cleanProfile(JSON.parse(saved));
  } catch {
    console.warn('Saved food profile data is invalid.');
    return null;
  }
}

export async function saveLocalProfile(profile: FoodProfile): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(profile));
}

/** Save on the phone and, for a signed-in email account, in the account too. */
export async function saveProfile(profile: FoodProfile): Promise<void> {
  await saveLocalProfile(profile);
  const accountId = await syncedAccountId();
  if (!accountId) return;
  await AsyncStorage.setItem(PENDING_KEY, accountId);
  await pushProfile(accountId);
}

/**
 * Send the phone's current profile to the account. One at a time, so the last change wins.
 * Keeps the pending mark if it fails. Resolves to true when it was saved.
 */
export function pushProfile(accountId: string): Promise<boolean> {
  const operation = pushQueue.then(async () => {
    const profile = (await loadLocalProfile()) ?? DEFAULT_PROFILE;
    try {
      await saveProfileRow(accountId, rowFromProfile(profile));
      await AsyncStorage.removeItem(PENDING_KEY);
      return true;
    } catch (error) {
      console.warn('Could not save the food profile to the account:', error);
      await AsyncStorage.setItem(PENDING_KEY, accountId).catch(() => undefined);
      return false;
    }
  });
  pushQueue = operation.catch(() => undefined);
  return operation;
}

/** True if a change for this account could not be sent yet (a mark left by another account is ignored). */
export async function isProfilePending(accountId: string): Promise<boolean> {
  return (await AsyncStorage.getItem(PENDING_KEY)) === accountId;
}

export async function clearProfilePending(): Promise<void> {
  await AsyncStorage.removeItem(PENDING_KEY);
}
