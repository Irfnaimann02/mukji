
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface FavouriteRecord {
  restaurantId: string;
  note: string;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = '@mukji/favourites/v1';

// Keep read-modify-write operations in order so quick taps do not overwrite
// one another with stale data.
let writeQueue: Promise<void> = Promise.resolve();

async function readFavourites(): Promise<FavouriteRecord[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);

  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);

    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (item): item is FavouriteRecord =>
        !!item &&
        typeof item === 'object' &&
        typeof item.restaurantId === 'string' &&
        item.restaurantId.length > 0 &&
        typeof item.note === 'string' &&
        typeof item.createdAt === 'string' &&
        typeof item.updatedAt === 'string'
    );
  } catch {
    console.warn('Saved favourites data is invalid.');
    return [];
  }
}

async function updateFavourites(
  updater: (current: FavouriteRecord[]) => FavouriteRecord[]
): Promise<FavouriteRecord[]> {
  const operation = writeQueue.then(async () => {
    const current = await readFavourites();
    const next = updater(current);

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));

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
  return updateFavourites((current) => {
    if (current.some((item) => item.restaurantId === restaurantId)) {
      return current;
    }

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
  return updateFavourites((current) =>
    current.map((item) =>
      item.restaurantId === restaurantId
        ? {
            ...item,
            note,
            updatedAt: new Date().toISOString(),
          }
        : item
    )
  );
}

export function removeFavourite(
  restaurantId: string
): Promise<FavouriteRecord[]> {
  return updateFavourites((current) =>
    current.filter((item) => item.restaurantId !== restaurantId)
  );
}
