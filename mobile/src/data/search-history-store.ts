import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'recentSearches';
const MAX_RECENT = 5;

export async function loadRecentSearches(): Promise<string[]> {
  try {
    const saved = await AsyncStorage.getItem(KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

// Newest first, no duplicates (ignoring case), at most 5.
export async function saveRecentSearch(query: string): Promise<string[]> {
  const trimmed = query.trim();
  const recent = await loadRecentSearches();
  if (!trimmed) return recent;

  const next = [
    trimmed,
    ...recent.filter((q) => q.toLowerCase() !== trimmed.toLowerCase()),
  ].slice(0, MAX_RECENT);

  await AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  return next;
}

export async function clearRecentSearches(): Promise<void> {
  await AsyncStorage.removeItem(KEY).catch(() => {});
}