import AsyncStorage from '@react-native-async-storage/async-storage';

import { syncedAccountId } from '@/data/saved-data-owner';
import {
  addFavouriteRow,
  fetchFavouriteRows,
  removeFavouriteRow,
  saveFavouriteNoteRow,
} from '@/data/saved-data-remote';
import { cleanFavourites, favouritesFromRows } from '@/logic/saved-data';

export interface FavouriteRecord {
  restaurantId: string;
  note: string;
  createdAt: string;
  updatedAt: string;
}

// #119: on the phone for everyone; for a signed-in email account the account (SQL 045)
// is saved first and the phone keeps a copy. If the account cannot be reached, the
// change fails (the screens show their usual error message) so the phone and the account never differ.
const STORAGE_KEY = '@mukji/favourites/v1';

// Keep read-modify-write operations in order so quick taps do not overwrite
// one another with stale data.
let writeQueue: Promise<void> = Promise.resolve();

async function readFavourites(): Promise<FavouriteRecord[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);

  if (!raw) return [];

  try {
    return cleanFavourites(JSON.parse(raw));
  } catch {
    console.warn('Saved favourites data is invalid.');
    return [];
  }
}

async function updateFavourites(
  updater: (current: FavouriteRecord[]) => FavouriteRecord[] | Promise<FavouriteRecord[]>
): Promise<FavouriteRecord[]> {
  const operation = writeQueue.then(async () => {
    const current = await readFavourites();
    const next = await updater(current);

    if (next !== current) {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }

    return next;
  });

  // Allow later operations to continue even if this operation fails.
  writeQueue = operation.then(
    () => undefined,
    () => undefined
  );

  return operation;
}

export async function getFavourites(): Promise<FavouriteRecord[]> {
  await writeQueue;
  return readFavourites();
}

export function addFavourite(
  restaurantId: string
): Promise<FavouriteRecord[]> {
  return updateFavourites(async (current) => {
    if (current.some((item) => item.restaurantId === restaurantId)) {
      return current;
    }

    const accountId = await syncedAccountId();
    if (accountId) await addFavouriteRow(accountId, restaurantId);

    const now = new Date().toISOString();

    return [
      {
        restaurantId,
        note: '',
        createdAt: now,
        updatedAt: now,
      },
      ...current,
    ];
  });
}

export function saveFavouriteNote(
  restaurantId: string,
  note: string
): Promise<FavouriteRecord[]> {
  return updateFavourites(async (current) => {
    const accountId = await syncedAccountId();
    if (accountId) await saveFavouriteNoteRow(accountId, restaurantId, note);

    return current.map((item) =>
      item.restaurantId === restaurantId
        ? {
            ...item,
            note,
            updatedAt: new Date().toISOString(),
          }
        : item
    );
  });
}

export function removeFavourite(
  restaurantId: string
): Promise<FavouriteRecord[]> {
  return updateFavourites(async (current) => {
    const accountId = await syncedAccountId();
    if (accountId) await removeFavouriteRow(accountId, restaurantId);

    return current.filter((item) => item.restaurantId !== restaurantId);
  });
}

/**
 * #119: replace the phone's copy with the account's list. Runs in the same queue as the
 * taps above, so a favourite added meanwhile is never lost. `stillWanted` lets the caller
 * drop the result if the user signed out while it was loading.
 */
export function replaceFavouritesFromAccount(
  accountId: string,
  stillWanted: () => boolean
): Promise<FavouriteRecord[]> {
  return updateFavourites(async (current) => {
    const fromAccount = favouritesFromRows(await fetchFavouriteRows(accountId));
    return stillWanted() ? fromAccount : current;
  });
}

/** #119: remove every favourite from the phone (sign-out). */
export function clearFavouritesOnPhone(): Promise<void> {
  const operation = writeQueue.then(() => AsyncStorage.removeItem(STORAGE_KEY));
  writeQueue = operation.then(
    () => undefined,
    () => undefined
  );
  return operation;
}
