import AsyncStorage from '@react-native-async-storage/async-storage';

import { syncedAccountId } from '@/data/saved-data-owner';
import { saveRecentSearchesRow } from '@/data/saved-data-remote';
import { addRecentSearch, cleanRecentSearches } from '@/logic/saved-data';

const KEY = 'recentSearches';
// #119: set when a change could not reach the account (offline). Sent at the next start.
const PENDING_KEY = '@mukji/recent-searches-pending/v1';

let pushQueue: Promise<unknown> = Promise.resolve();

export async function loadRecentSearches(): Promise<string[]> {
  try {
    const saved = await AsyncStorage.getItem(KEY);
    return saved ? cleanRecentSearches(JSON.parse(saved)) : [];
  } catch {
    return [];
  }
}

// Newest first, no duplicates (ignoring case), at most 5.
export async function saveRecentSearch(query: string): Promise<string[]> {
  const recent = await loadRecentSearches();
  if (!query.trim()) return recent;

  const next = addRecentSearch(recent, query);
  await AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  void sendToAccount();
  return next;
}

export async function clearRecentSearches(): Promise<void> {
  await AsyncStorage.removeItem(KEY).catch(() => {});
  void sendToAccount();
}

/** #119: replace the phone's list (loaded from the account, or emptied at sign-out). */
export async function replaceRecentSearchesOnPhone(recent: string[]): Promise<void> {
  if (recent.length === 0) await AsyncStorage.removeItem(KEY);
  else await AsyncStorage.setItem(KEY, JSON.stringify(cleanRecentSearches(recent)));
}

// For a signed-in email account, also save the list in the account (in the background,
// so searching never waits for the network).
async function sendToAccount(): Promise<void> {
  try {
    const accountId = await syncedAccountId();
    if (!accountId) return;
    await AsyncStorage.setItem(PENDING_KEY, accountId);
    await pushRecentSearches(accountId);
  } catch (error) {
    console.warn('Could not save recent searches to the account:', error);
  }
}

/** Send the phone's list to the account. Keeps the pending mark if it fails. */
export function pushRecentSearches(accountId: string): Promise<boolean> {
  const operation = pushQueue.then(async () => {
    try {
      await saveRecentSearchesRow(accountId, await loadRecentSearches());
      await AsyncStorage.removeItem(PENDING_KEY);
      return true;
    } catch (error) {
      console.warn('Could not save recent searches to the account:', error);
      await AsyncStorage.setItem(PENDING_KEY, accountId).catch(() => undefined);
      return false;
    }
  });
  pushQueue = operation.catch(() => undefined);
  return operation;
}

/** True if a change for this account could not be sent yet (a mark left by another account is ignored). */
export async function isRecentSearchesPending(accountId: string): Promise<boolean> {
  return (await AsyncStorage.getItem(PENDING_KEY)) === accountId;
}

export async function clearRecentSearchesPending(): Promise<void> {
  await AsyncStorage.removeItem(PENDING_KEY);
}
